"""Collect every PowerPoint the sync downloaded into one tidy Slides folder.

Reads:  <output_dir>/<School>/<Module>/<Lesson NN>/*.pptx   (made by `lms_sync.py sync`)
Writes: <output_dir>/<School>/Slides/<Module>/Lesson NN - <file>.pptx

Also pulls .ppt/.pptx out of ZIP bundles (some lecturers upload slides zipped).
ZIP slides keep their archive name and internal folders to avoid name collisions.
Safe to re-run: only copies files that are new or changed. Never deletes anything.

Usage:  .\\.venv\\Scripts\\python.exe collect_slides.py
"""
import json
import os
import shutil
import zipfile
from pathlib import Path, PurePosixPath
from core import component as safe

HERE = Path(__file__).resolve().parent
SLIDE_EXT = {".ppt", ".pptx"}


def load_output_dir() -> tuple[Path, str]:
    cfg_path = HERE / "config.local.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    return (HERE / cfg.get("output_dir", "courses")).resolve(), cfg.get("school", "")


def is_newer(src_mtime: float, src_size: int, dest: Path) -> bool:
    if not dest.exists():
        return True
    st = dest.stat()
    return st.st_size != src_size or st.st_mtime < src_mtime


def main():
    root, school = load_output_dir()
    schools = [root / safe(school)] if school and (root / safe(school)).is_dir() else [p for p in root.iterdir() if p.is_dir()]
    copied = skipped = 0
    for school_dir in schools:
        slides_root = school_dir / "Slides"
        for module_dir in sorted(p for p in school_dir.iterdir() if p.is_dir() and p.name != "Slides"):
            for lesson_dir in sorted(p for p in module_dir.iterdir() if p.is_dir()):
                for f in sorted(lesson_dir.iterdir()):
                    if not f.is_file():
                        continue
                    ext = f.suffix.lower()
                    if ext in SLIDE_EXT:
                        dest = slides_root / module_dir.name / f"{lesson_dir.name} - {f.name}"
                        if is_newer(f.stat().st_mtime, f.stat().st_size, dest):
                            dest.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(f, dest)
                            copied += 1
                        else:
                            skipped += 1
                    elif ext == ".zip":
                        try:
                            with zipfile.ZipFile(f) as z:
                                for info in z.infolist():
                                    inner = PurePosixPath(info.filename.replace("\\", "/"))
                                    if info.is_dir() or inner.is_absolute() or ".." in inner.parts or inner.suffix.lower() not in SLIDE_EXT or inner.name.startswith("~$") or "__MACOSX" in inner.parts:
                                        continue
                                    # Validate the relative path and sanitize every segment before joining.
                                    dest = slides_root / module_dir.name / f"{lesson_dir.name} - {f.name}" / Path(*(safe(part) for part in inner.parts))
                                    stamp = f.stat().st_mtime
                                    if is_newer(stamp, info.file_size, dest):
                                        dest.parent.mkdir(parents=True, exist_ok=True)
                                        with z.open(info) as src, open(dest, "wb") as out:
                                            shutil.copyfileobj(src, out)
                                        os.utime(dest, (stamp, stamp))
                                        copied += 1
                                    else:
                                        skipped += 1
                        except zipfile.BadZipFile:
                            print(f"Skipped unreadable zip: {f}")
        print(f"Slides folder: {slides_root}")
    print(f"Done. {copied} slide file(s) copied, {skipped} already up to date.")


if __name__ == "__main__":
    main()
