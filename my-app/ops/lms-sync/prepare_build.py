"""Detach Windows junctions before Next 14 replaces its standalone output.

Next's recursive cleanup can otherwise walk into pnpm's dependency junctions.
Only the generated .next/standalone directory is removed, never its targets.
"""
import os
from pathlib import Path
import shutil
import stat


def is_junction(path):
    return os.name == "nt" and path.lstat().st_reparse_tag == stat.IO_REPARSE_TAG_MOUNT_POINT

root = Path(__file__).resolve().parents[2] / "apps" / "web" / ".next" / "standalone"
if root.exists():
    if root.is_symlink() or is_junction(root):
        raise RuntimeError("Unexpected link at the standalone build root.")
    for base, dirs, files in os.walk(root, followlinks=False):
        for name in list(dirs):
            path = Path(base) / name
            if is_junction(path):
                os.rmdir(path)
                dirs.remove(name)
            elif path.is_symlink():
                path.unlink()
                dirs.remove(name)
        for name in files:
            path = Path(base) / name
            if path.is_symlink():
                path.unlink()
    shutil.rmtree(root)
print("Generated standalone output cleared without following dependency links.")
