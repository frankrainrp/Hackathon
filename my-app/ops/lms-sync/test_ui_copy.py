import copy
from pathlib import Path
import tempfile
import unittest
from core import export_course


class ExportLanguageTests(unittest.TestCase):
    def test_default_english_optional_chinese_preserve_school_content(self):
        course = {"moduleName": "我的原课程 $&", "lessons": [], "assignments": [
            {"title": "原作业", "url": "https://example.com/task", "submissionState": "unknown", "dueAt": None}]}
        original = copy.deepcopy(course)
        with tempfile.TemporaryDirectory() as folder:
            target = export_course(Path(folder), "学校原名", course)
            english = (target / "index.md").read_text(encoding="utf-8")
            self.assertIn("## Course materials", english)
            self.assertIn("Unverified", english)
            self.assertIn("我的原课程 $&", english)
            self.assertIn("原作业", english)
            export_course(Path(folder), "学校原名", course, "zh")
            self.assertIn("## 课程资料", (target / "index.md").read_text(encoding="utf-8"))
            self.assertEqual(course, original)


if __name__ == "__main__":
    unittest.main()
