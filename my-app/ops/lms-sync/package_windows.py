"""Assemble the native Next standalone app and frozen crawler; exclude user data."""
import json
import argparse
from pathlib import Path
import shutil
import zipfile
from urllib.request import urlopen

HERE = Path(__file__).resolve().parent
WEB = HERE.parents[1] / "apps" / "web"
ROOT = HERE.parents[2]
DEST = ROOT / "release" / "Butler-LMS-Windows"


def materialize_traced_modules(app):
    # Next 14 traces pnpm's store, but Windows junctions point outside the bundle.
    # Give their traced runtime dependencies normal, portable Node lookup paths.
    store = app / "node_modules" / ".pnpm"
    for modules in store.glob("*/node_modules"):
        for child in modules.iterdir():
            packages = list(child.iterdir()) if child.name.startswith("@") else [child]
            for package_dir in packages:
                if (package_dir / "package.json").is_file():
                    name = json.loads((package_dir / "package.json").read_text(encoding="utf-8"))["name"]
                    shutil.copytree(package_dir, app / "node_modules" / name, dirs_exist_ok=True)


def package(replace=False):
    if DEST.exists():
        if not replace or not DEST.resolve().is_relative_to((ROOT / "release").resolve()) or DEST.is_symlink() or DEST.is_junction():
            raise RuntimeError("Release directory already exists; use --replace for this generated release directory.")
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)
    app = DEST / "my-app"
    def excluded(directory, names):
        return [n for n in names if n.startswith(".env") or n == ".private" or n == "courses" or n.endswith((".sqlite", ".sqlite-wal", ".sqlite-shm"))]
    shutil.copytree(WEB / ".next" / "standalone", app, ignore=excluded)
    materialize_traced_modules(app)
    shutil.copytree(WEB / ".next" / "static", app / "apps" / "web" / ".next" / "static", dirs_exist_ok=True)
    shutil.copytree(WEB / "public", app / "apps" / "web" / "public", dirs_exist_ok=True)
    worker = app / "ops" / "lms-sync"
    shutil.copytree(HERE / ".private" / "freeze" / "ButlerSync", worker)
    # Fresh users discover their own enrollments rather than inherit the test account's roster.
    config = json.loads((HERE / "config.example.json").read_text(encoding="utf-8"))
    config["courses"] = []
    (worker / "config.example.json").write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    for name in ("start-butler.ps1", "install-schedule.ps1", "README.md"):
        shutil.copy2(HERE / name, worker / name)
    for name in ("portable-launch.ps1", "Start-Butler.cmd", "Start-Butler-Demo.cmd"):
        shutil.copy2(HERE / name, DEST / name)
    runtime = DEST / "runtime"
    runtime.mkdir()
    shutil.copy2(shutil.which("node"), runtime / "node.exe")
    with urlopen("https://raw.githubusercontent.com/nodejs/node/v24.18.0/LICENSE", timeout=30) as response:
        (runtime / "LICENSE-node.txt").write_bytes(response.read())
    python_license = Path(__import__("sys").base_prefix) / "LICENSE.txt"
    if python_license.exists():
        shutil.copy2(python_license, worker / "LICENSE-python.txt")
    from importlib.metadata import distribution
    for dependency in ("pypdf", "cryptography", "playwright"):
        dist = distribution(dependency)
        for file in dist.files or []:
            if 'license' in file.name.lower() and file.suffix.lower() in (".txt", ".md", ""):
                notices = worker / 'third-party-notices' / dependency
                notices.mkdir(parents=True, exist_ok=True)
                shutil.copy2(dist.locate_file(file), notices / file.name)
    (DEST / "README-English.txt").write_text(
        "Butler Learning Workflow - Windows x64 portable\n\n"
        "Extract the entire ZIP to a fixed directory. Edge must be installed.\n"
        "Demo: run Start-Butler-Demo.cmd. Open Courses and select View demo courses.\n"
        "School sync: run Start-Butler.cmd, sign in to Brightspace, then hourly sync starts.\n"
        "Courses have separate school-submission and lesson-learning progress bars.\n"
        "Expand a module and select Ask course AI. Switch Chinese / English on Courses.\n"
        "AI uses your installed Ollama model. Run Ollama first. Scanned PDFs need OCR.\n"
        "This archive contains no personal courses, login sessions, database or credentials.\n"
        "Detailed setup and repackaging: my-app/ops/lms-sync/README.md\n"
        "Built on https://github.com/frankrainrp/Bulter\n", encoding="utf-8")
    (DEST / "使用说明.txt").write_text(
        "Butler 学习工作流 · Windows x64 便携版\n\n"
        "1. 把整个 ZIP 解压到固定目录，双击 Start-Butler.cmd。\n"
        "2. 在新 Edge 窗口登录 Republic Polytechnic。\n"
        "3. 程序自动配置每小时同步；打开 http://127.0.0.1:3000 查看课程、任务、日历和学习提醒。\n\n"
        "保留 Bulter 原生 Next.js / React 界面、SQLite 和 Ollama AI。自带 Node 和 Python 同步器，需系统已安装 Edge。\n"
        "AI 使用本机 Ollama 已安装的模型；未运行 Ollama 时课程和事实提醒仍可用。\n"
        "编辑 my-app/ops/lms-sync/config.local.json 可选择课程、修改频率和保存位置。\n"
        "首次启动后不要移动目录，计划任务记录安装位置；要迁移请先停用旧目录的 Butler-LMS-* 计划任务再启用新目录。\n"
        "本包不含测试课程、登录会话、数据库或密钥。\n"
        "提交状态待核实不会被当成未提交；Quiz/LTI 作业暂不在同步范围。\n"
        "详细说明见 my-app/ops/lms-sync/README.md。\n",
        encoding="utf-8-sig")
    artifact = DEST.with_suffix(".zip")
    with zipfile.ZipFile(artifact, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in DEST.rglob("*"):
            if path.is_file():
                archive.write(path, path.relative_to(DEST.parent))
    with zipfile.ZipFile(artifact) as archive:
        forbidden = [n for n in archive.namelist() if any(p in n for p in (".env.local", "session.enc", "bridge.enc", "last-snapshot.json", "config.local.json", "/courses/", ".sqlite"))]
        if forbidden:
            raise RuntimeError("User data unexpectedly found in the release.")
    print(json.dumps({"artifact": str(artifact), "bytes": artifact.stat().st_size, "user_data_files": 0}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--replace", action="store_true")
    package(parser.parse_args().replace)
