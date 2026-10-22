"""Entry-point regressions against real Windows PowerShell, without installers or servers."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]


@unittest.skipUnless(os.name == "nt", "Windows entry points")
class SourceLauncherTests(unittest.TestCase):
    def test_incomplete_source_stops_before_creating_outside_project_files(self):
        with tempfile.TemporaryDirectory(prefix="butler-entry-") as folder:
            parent = Path(folder)
            source = parent / "source with spaces"
            (source / "tools").mkdir(parents=True)
            shutil.copyfile(ROOT / "tools/start-source.ps1", source / "tools/start-source.ps1")
            result = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(source / "tools/start-source.ps1"), "-Install"], cwd=parent, capture_output=True, timeout=20)
            self.assertEqual(result.returncode, 1)
            self.assertIn(b"Incomplete source folder", result.stderr)
            self.assertFalse((parent / "ops").exists())
            self.assertFalse((source / "my-app").exists())

    def test_valid_structure_is_resolved_from_script_before_missing_prerequisite(self):
        with tempfile.TemporaryDirectory(prefix="butler-entry-") as folder:
            parent = Path(folder)
            source = parent / "source with spaces"
            for relative in ["tools/start-source.ps1", "my-app/package.json", "my-app/pnpm-lock.yaml", "my-app/apps/web/package.json", "my-app/ops/lms-sync/lms_sync.py"]:
                target = source / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                if relative.startswith("tools/"):
                    shutil.copyfile(ROOT / relative, target)
                else:
                    target.write_text("{}" if relative.endswith(".json") else "", encoding="utf-8")
            powershell = shutil.which("powershell.exe")
            env = dict(os.environ, PATH=str(Path(os.environ["SystemRoot"]) / "System32"))
            result = subprocess.run([powershell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(source / "tools/start-source.ps1"), "-Install"], cwd=parent, env=env, capture_output=True, timeout=20)
            self.assertEqual(result.returncode, 1)
            reported = result.stdout.decode().split('Source root: ', 1)[1].splitlines()[0]
            self.assertEqual(Path(reported).resolve(), source.resolve())
            self.assertIn(b"Node.js 24 is required", result.stderr)
            self.assertFalse((parent / "ops").exists())
            self.assertFalse((source / "my-app/ops/lms-sync/.venv").exists())

    def test_old_source_shortcut_resolves_the_same_root(self):
        with tempfile.TemporaryDirectory(prefix="butler-entry-") as folder:
            parent = Path(folder)
            source = parent / "source with spaces"
            worker = source / "my-app/ops/lms-sync"
            worker.mkdir(parents=True)
            (source / "tools").mkdir()
            (source / "tools/start-source.ps1").write_text("param([switch]$Install,[switch]$Check)\nWrite-Output 'CORRECT_SOURCE_ENTRY'\nexit 0\n", encoding="utf-8")
            shutil.copyfile(ROOT / "my-app/ops/lms-sync/portable-launch.ps1", worker / "portable-launch.ps1")
            result = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(worker / "portable-launch.ps1"), "-Check"], cwd=parent, capture_output=True, timeout=20)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors="replace"))
            self.assertIn(b"CORRECT_SOURCE_ENTRY", result.stdout)


if __name__ == "__main__":
    unittest.main()
