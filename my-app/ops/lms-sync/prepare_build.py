"""Detach Windows junctions before Next 14 replaces its standalone output.

Next's recursive cleanup can otherwise walk into pnpm's dependency junctions.
Only the generated .next/standalone directory is removed, never its targets.
"""
import os
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2] / "apps" / "web" / ".next" / "standalone"
if root.exists():
    if root.is_symlink() or root.is_junction():
        raise RuntimeError("Unexpected link at the standalone build root.")
    for base, dirs, files in os.walk(root, followlinks=False):
        for name in list(dirs):
            path = Path(base) / name
            if path.is_junction():
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
