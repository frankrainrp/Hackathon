"""Exercise linked assignment pages at the real adapter/download/extraction seam."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import json
from unittest.mock import patch
from brightspace import Brightspace
from course_content import extract_material


class AssignmentPageTests(unittest.IsolatedAsyncioTestCase):
    async def test_worker_refreshes_page_text_even_when_the_topic_date_is_unchanged(self):
        from lms_sync import sync
        from test_session_reuse import config_at, browser_harness
        from school_profile import session_path, session_envelope
        from secrets_store import save_secret
        body = "First published instructions"

        async def get(adapter, path, binary=False):
            if path == "/d2l/api/versions/":
                return [{"ProductCode": product, "LatestVersion": "1.0"} for product in ("le", "lp")]
            if path.endswith("/content/toc"):
                return {"Modules": [{"Title": "Lesson 1", "Topics": [{"TopicId": 9, "Title": "Assignment",
                        "ActivityType": 3, "ToolItemId": 8, "Url": "/d2l/quicklink", "LastModifiedDate": "2026-10-01T00:00:00Z"}]}]}
            if path.endswith("/dropbox/folders/"):
                return [{"Id": 8, "Name": "Assignment", "CustomInstructions": {"Text": body}}]
            if path.endswith("/news/") or path.endswith("/submissions/mysubmissions/"):
                return []
            self.fail("Unexpected network route: " + path)

        with TemporaryDirectory() as folder:
            config = config_at(folder)
            config["courses"] = [{"id": "7", "name": "Synthetic mobile course"}]
            config["enable_ai_brief"] = False
            storage = {"cookies": [], "origins": []}
            save_secret(session_path(config), session_envelope(config, storage))
            for expected in (body, "Updated published instructions"):
                body = expected
                manager, _, _ = browser_harness(storage)
                with patch("playwright.async_api.async_playwright", return_value=manager), patch("lms_sync.require_public_url"), \
                     patch.object(Brightspace, "get", get), patch("lms_sync.push"):
                    self.assertEqual(await sync(config), 0)
                snapshot = json.loads((Path(config["private_dir"]) / "last-snapshot.json").read_text(encoding="utf-8"))
                material = snapshot["courses"][0]["lessons"][0]["materials"][0]
                self.assertEqual(material["text"], expected)
                self.assertEqual(Path(material["filePath"]).read_text(encoding="utf-8"), expected)

    async def test_assignment_links_save_actual_instructions_without_visiting_submission_form(self):
        adapter = Brightspace(None, {"base_url": "https://rplms.polite.edu.sg"})
        adapter.versions = {"le": "1.0"}
        paths = []
        folders = [
            {"Id": 81, "Name": "Week 1 submission", "CustomInstructions": {"Text": "Build a small mobile app.", "Html": "<p>Build a small mobile app.</p>"}},
            {"Id": 82, "Name": "Week 2 submission", "CustomInstructions": {"Text": "", "Html": ""}},
            {"Id": 83, "Name": "Hidden", "IsHidden": True, "CustomInstructions": {"Text": "Hidden answer"}},
        ]
        topics = [{"TopicId": i, "Title": name, "ActivityType": 3, "ToolItemId": folder,
                   "Url": "/d2l/common/dialogs/quickLink/quickLink.d2l?ou=7&type=dropbox"}
                  for i, name, folder in [(11, "Week 1 submission", 81), (12, "Week 2 submission", 82), (13, "Hidden", 83)]]
        topics.append({"TopicId": 14, "Title": "External reference", "ActivityType": 2, "Url": "https://example.com/video"})

        async def get(path, **kwargs):
            paths.append(path)
            if path.endswith("/content/toc"):
                return {"Modules": [{"Title": "Lesson 1", "Topics": topics}]}
            if path.endswith("/dropbox/folders/"):
                return folders
            if "/submissions/mysubmissions/" in path or path.endswith("/news/"):
                return []
            self.fail("Unexpected page navigation/download: " + path)

        adapter.get = get
        course, warnings = await adapter.course({"id": "7", "name": "Synthetic mobile course"})
        materials = {m["id"]: m for lesson in course["lessons"] for m in lesson["materials"]}
        self.assertTrue(materials["11"]["downloadable"], "An accessible linked assignment page must not be silently skipped")
        self.assertTrue(materials["12"]["downloadable"], "An empty page can be archived without inventing its body")
        self.assertFalse(materials["13"]["downloadable"], "Hidden assignment instructions must not be copied")
        self.assertFalse(materials["14"]["downloadable"], "External references must not receive school authentication")
        before_download = list(paths)
        with TemporaryDirectory() as folder:
            for identifier, status in [("11", "ready"), ("12", "empty")]:
                material = materials[identifier]
                path = Path(folder) / material["filename"]
                path.write_bytes(await adapter.download("7", material))
                extracted = extract_material(path)
                self.assertEqual(extracted["textStatus"], status)
                if identifier == "11":
                    self.assertEqual(extracted["text"], "Build a small mobile app.")
        self.assertEqual(paths, before_download, "Saving the page must not navigate to or submit its form")
        self.assertEqual(warnings, [])

    async def test_html_instructions_are_text_only_and_refreshed_from_current_metadata(self):
        from core import content_lessons
        toc = {"Modules": [{"Title": "Lesson 1", "Topics": [{"TopicId": 9, "Title": "Work", "ActivityType": 3,
                "ToolItemId": 8, "Url": "/d2l/quicklink", "LastModifiedDate": "2026-10-01T00:00:00Z"}]}]}
        instructions = {"8": {"CustomInstructions": {"Html": "<p>Current exercise</p><script>do not retain</script>"}}}
        first = content_lessons(toc, "https://rplms.polite.edu.sg", "7", instructions)[0]["materials"][0]
        self.assertEqual(first["pageText"], "Current exercise")
        instructions["8"]["CustomInstructions"]["Html"] = "<p>Updated exercise</p>"
        second = content_lessons(toc, "https://rplms.polite.edu.sg", "7", instructions)[0]["materials"][0]
        self.assertEqual(second["pageText"], "Updated exercise")
        self.assertEqual(first["modifiedAt"], second["modifiedAt"], "An instruction edit need not change the topic date")


if __name__ == "__main__":
    unittest.main()
