import unittest
import tempfile
import sys
import logging
from pathlib import Path
from unittest.mock import patch, AsyncMock
from brightspace import Brightspace
from school_profile import resolve_profile
from test_school_profile import fixture


class DiscoveryTests(unittest.IsolatedAsyncioTestCase):
    def test_weekly_inspect_reads_unselected_active_courses_without_enabling_downloads(self):
        import lms_sync
        with tempfile.TemporaryDirectory() as folder:
            config = {"private_dir": folder, "profile_id": "p", "semester_id": "s", "enable_ai_brief": True,
                      "courses": [{"id": "a", "name": "A"}], "profileSettings": {"profiles": [{"id": "p", "semesters": [{"id": "s", "courses": [
                          {"id": "a", "name": "A", "selected": True, "status": "active"},
                          {"id": "b", "name": "B", "selected": False, "status": "active"},
                          {"id": "c", "name": "C", "selected": False, "status": "paused"}]}]}]}}
            worker = AsyncMock(return_value=0)
            with patch.object(sys, "argv", ["lms_sync", "--config", str(Path(folder) / "config.json"), "--no-ai-brief", "--all-active-courses", "inspect"]), \
                 patch.object(lms_sync, "load_config", return_value=config), patch.object(lms_sync, "sync", worker), \
                 patch("logging.handlers.RotatingFileHandler", return_value=logging.NullHandler()), patch("logging.basicConfig"):
                self.assertEqual(lms_sync.main(), 0)
            self.assertEqual([c["id"] for c in worker.call_args.args[0]["courses"]], ["a", "b"])
            self.assertFalse(config["profileSettings"]["profiles"][0]["semesters"][0]["courses"][1]["selected"])
            self.assertFalse(worker.call_args.args[0]["enable_ai_brief"])
            self.assertTrue(worker.call_args.kwargs["metadata_only"])

    def test_inspect_cli_disables_cloud_brief_for_owned_worker(self):
        import lms_sync
        with tempfile.TemporaryDirectory() as folder:
            config = {"private_dir": folder, "profile_id": "p", "enable_ai_brief": True}
            worker = AsyncMock(return_value=0)
            with patch.object(sys, "argv", ["lms_sync", "--config", str(Path(folder) / "config.json"), "--expected-profile", "p", "--no-ai-brief", "inspect"]), \
                 patch.object(lms_sync, "load_config", return_value=config), \
                 patch.object(lms_sync, "sync", worker), \
                 patch("logging.handlers.RotatingFileHandler", return_value=logging.NullHandler()), \
                 patch("logging.basicConfig"):
                self.assertEqual(lms_sync.main(), 0)
            self.assertFalse(worker.call_args.args[0]["enable_ai_brief"])
            self.assertEqual(worker.call_args.kwargs, {"metadata_only": True, "catalog_only": False})

    async def test_catalog_keeps_official_term_and_access_evidence(self):
        adapter = Brightspace(None, {"base_url": "https://tplms.polite.edu.sg", "discover_semesters": True})
        adapter.versions = {"lp": "1.0"}
        paths = []

        async def get(path):
            paths.append(path)
            if "myenrollments" in path:
                return {"Items": [{"OrgUnit": {"Id": 101, "Name": "Actual module", "Code": "M101"},
                                   "Access": {"IsActive": True, "CanAccess": True, "StartDate": "2026-10-19T00:00:00Z"}}],
                        "PagingInfo": {"HasMoreItems": False}}
            return {"Semester": {"Identifier": "term-2026-2", "Name": "AY2026/27 Semester 2"},
                    "StartDate": "2026-10-19T00:00:00Z", "EndDate": "2027-03-01T00:00:00Z"}

        adapter.get = get
        rows = await adapter.courses()
        self.assertEqual(rows[0]["id"], "101")
        self.assertEqual(rows[0]["name"], "Actual module")
        self.assertEqual(rows[0]["semester"]["name"], "AY2026/27 Semester 2")
        self.assertTrue(rows[0]["canAccess"])
        self.assertTrue(all("content" not in path for path in paths))

    def test_pending_url_profile_can_login_and_catalog_but_cannot_sync(self):
        config = fixture()
        profile = config["profileSettings"]["profiles"][0]
        profile["semesters"][0]["confirmed"] = False
        profile["semesters"][0]["courses"] = []
        profile["entryUrl"] = "https://tplms.polite.edu.sg/d2l/home"
        profile["origin"] = "https://tplms.polite.edu.sg"
        profile.pop("platform")
        with self.assertRaises(ValueError):
            resolve_profile(config)
        result = resolve_profile(config, allow_pending=True)
        self.assertEqual(result["platform"], "brightspace")
        self.assertEqual(result["courses"], [])
