from contextlib import redirect_stdout
from io import StringIO
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
import zipfile

import collect_slides


class CollectSlidesTests(unittest.TestCase):
    def collect(self, root):
        output = StringIO()
        with patch.object(collect_slides, "load_output_dir", return_value=(root, "Test School")), redirect_stdout(output):
            collect_slides.main()
        return output.getvalue()

    def test_same_named_slides_from_archives_are_preserved(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            lesson = root / "Test School" / "Module" / "Week 01"
            lesson.mkdir(parents=True)
            (lesson / "slides.pptx").write_bytes(b"direct")
            for archive, entries in [
                ("lecture.zip", {"part-a/slides.pptx": b"first", "part-b/slides.pptx": b"second"}),
                ("tutorial.zip", {"slides.pptx": b"third"}),
            ]:
                with zipfile.ZipFile(lesson / archive, "w") as bundle:
                    for name, data in entries.items():
                        bundle.writestr(name, data)
            self.collect(root)
            slides = root / "Test School" / "Slides"
            self.assertCountEqual([p.read_bytes() for p in slides.rglob("*.pptx")], [b"direct", b"first", b"second", b"third"])

    def test_archive_refreshes_same_size_slide_and_then_skips_it(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            lesson = root / "Test School" / "Module" / "Lesson 01"
            lesson.mkdir(parents=True)
            archive = lesson / "lecture.zip"
            for stamp, body in [(1_600_000_000, b"before"), (1_600_000_100, b"after!")]:
                with zipfile.ZipFile(archive, "w") as bundle:
                    bundle.writestr("slides.pptx", body)
                os.utime(archive, (stamp, stamp))
                self.collect(root)
                slides = list((root / "Test School" / "Slides").rglob("*.pptx"))
                self.assertEqual(len(slides), 1)
                self.assertEqual(slides[0].read_bytes(), body)
            self.assertIn("0 slide file(s) copied, 1 already up to date", self.collect(root))

    def test_archive_paths_stay_inside_slides_and_ignore_temporary_files(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            lesson = root / "Test School" / "Module" / "Week 01"
            lesson.mkdir(parents=True)
            with zipfile.ZipFile(lesson / "lecture.zip", "w") as bundle:
                for name in ["../escape.pptx", "..\\escape-backslash.pptx", "/absolute.pptx", "__MACOSX/slides.pptx", "~$slides.pptx"]:
                    bundle.writestr(name, b"skip")
                bundle.writestr("notes/CON.pptx", b"keep")
            self.collect(root)
            slides = root / "Test School" / "Slides"
            self.assertEqual([p.read_bytes() for p in slides.rglob("*.pptx")], [b"keep"])
            self.assertFalse(list(root.rglob("escape.pptx")))


if __name__ == "__main__":
    unittest.main()
