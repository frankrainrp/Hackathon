import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET
from school_profile import school_entry, require_public_url, resolve_profile, session_envelope, session_storage, session_path, daily_plan, schedule_xml, access_token, guard_browser_route
from unittest.mock import patch, AsyncMock
from brightspace import Brightspace, LoginRequired
from types import SimpleNamespace
from lms_sync import login, sync
from lms_sync import load_config
from secrets_store import save_secret, load_secret


def fixture():
    return {"private_dir": ".private", "output_dir": "courses", "profileSettings": {"activeProfileId": "school1", "profiles": [{"id": "school1", "school": "User described school", "entryUrl": "https://school.example.edu/d2l/home", "origin": "https://school.example.edu", "platform": "brightspace", "confirmedAt": "2026-10-20T00:00:00Z", "daily": {"time": "09:00", "timezone": "Asia/Singapore"}, "activeSemesterId": "term1", "semesters": [{"id": "term1", "label": "2026 Term 1", "confirmed": True, "courses": [{"id": "101", "name": "Module A", "selected": True, "status": "active"}, {"id": "102", "name": "Module B", "selected": True, "status": "completed"}]}]}]}}


class ProfileTests(unittest.TestCase):
    def test_cli_schedule_plan_has_no_persistent_side_effects(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / "config.local.json"
            file.write_text(json.dumps(fixture()), encoding="utf8")
            script = f'import sys; sys.path.insert(0,{str(Path(__file__).resolve().parent)!r}); import lms_sync; sys.argv=["lms_sync.py","--config",{str(file)!r},"schedule-plan"]; sys.exit(lms_sync.main())'
            result = subprocess.run([sys.executable, "-c", script], check=True, capture_output=True, text=True)
            plan = json.loads(result.stdout)
            self.assertEqual(plan["cadence"], "daily")
            self.assertIn("--expected-profile school1", plan["xml"])
            self.assertFalse((Path(folder) / ".private").exists())

    def test_a_scheduled_profile_cannot_switch_schools_with_the_active_selection(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / "config.local.json"
            file.write_text(json.dumps(fixture()), encoding="utf8")
            script = f'import sys; sys.path.insert(0,{str(Path(__file__).resolve().parent)!r}); import lms_sync; sys.argv=["lms_sync.py","--config",{str(file)!r},"--expected-profile","different-school","sync"]; sys.exit(lms_sync.main())'
            result = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("scheduled school profile changed", result.stderr)
            self.assertFalse((Path(folder) / ".private").exists())

    def test_institution_token_cannot_follow_a_school_profile_change(self):
        config = resolve_profile(fixture())
        with patch.dict("os.environ", {"LMS_ACCESS_TOKEN": "synthetic-token", "LMS_ACCESS_TOKEN_PROFILE": "school2", "LMS_ACCESS_TOKEN_ORIGIN": config["base_url"]}):
            with self.assertRaises(ValueError): access_token(config)

    def test_url_and_private_dns_validation(self):
        self.assertEqual(school_entry("https://SCHOOL.example.edu:443/d2l/home")[1], "https://school.example.edu")
        for url in ["http://school.edu", "https://user:secret@school.edu", "https://@school.edu", "https://127.0.0.1", "https://[::1]", "https://school.local", "https://school.edu:8443", "https://school.edu/?token=x", "https://school.edu/#x", "https://school.edu\\@127.0.0.1"]:
            with self.subTest(url=url), self.assertRaises(ValueError): school_entry(url)
        for address in ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fd00::1"]:
            with self.subTest(ip=address), self.assertRaises(ValueError):
                require_public_url("https://school.edu/path?SSO=1", lambda *a, **kw: [(None, None, None, None, (address, 443))])
        self.assertEqual(require_public_url("https://school.edu/path?SSO=1", lambda *a, **kw: [(None, None, None, None, ("8.8.8.8", 443))]), "https://school.edu/path?SSO=1")

    def test_profile_selection_and_session_isolation_after_restart(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / "config.local.json"
            file.write_text(json.dumps(fixture()), encoding="utf8")
            config = load_config(file)
            self.assertEqual(config["school"], "User described school")
            self.assertEqual([c["id"] for c in config["courses"]], ["101"])
            path = session_path(config)
            save_secret(path, session_envelope(config, {"cookies": [{"value": "synthetic-only"}]}))
            restored = load_config(file)
            self.assertEqual(session_storage(restored, load_secret(path))["cookies"][0]["value"], "synthetic-only")
            other = {**restored, "profile_id": "school2", "entry_url": "https://different.example.edu/", "base_url": "https://different.example.edu"}
            self.assertNotEqual(session_path(other), path)
            with self.assertRaises(ValueError): session_storage(other, load_secret(path))
            with self.assertRaises(ValueError): resolve_profile({})

    def test_daily_schedule_timezone_and_dry_run_xml(self):
        now = datetime(2026, 10, 20, 0, 0, tzinfo=timezone.utc)
        settings = {"time": "09:00", "timezone": "Asia/Singapore"}
        self.assertEqual(daily_plan(settings, now)["startBoundary"], "2026-10-20T09:00:00+08:00")
        self.assertFalse(daily_plan(settings, now)["enabled"])
        self.assertEqual(daily_plan({"time": "00:00", "timezone": "UTC"}, now)["startBoundary"], "2026-10-21T00:00:00+00:00")
        for invalid in [{"time": "24:00", "timezone": "UTC"}, {"time": "09:00", "timezone": "Europe/London"}]:
            with self.assertRaises(ValueError): daily_plan(invalid, now)
        plan = schedule_xml({"profile_id": "school1", "daily": settings}, 'C:/folder & test/pythonw.exe', '--config "settings.json" sync', 'C:/test', 'TEST\\User', now)
        root = ET.fromstring(plan["xml"])
        ns = {"t": "http://schemas.microsoft.com/windows/2004/02/mit/task"}
        self.assertEqual(root.find('.//t:DaysInterval', ns).text, "1")
        self.assertEqual(root.find('.//t:LogonType', ns).text, "InteractiveToken")
        self.assertEqual(root.find('.//t:Command', ns).text, 'C:/folder & test/pythonw.exe')


class AdapterSafetyTests(unittest.IsolatedAsyncioTestCase):
    async def test_custom_domains_fail_closed_before_dns_or_browser_start(self):
        config = resolve_profile(fixture())
        with patch("lms_sync.require_public_url") as resolve:
            with self.assertRaisesRegex(ValueError, "metadata only"): await login(config)
            with self.assertRaisesRegex(ValueError, "metadata only"): await sync(config)
            resolve.assert_not_called()

    async def test_browser_redirect_scope_excludes_other_schools_and_unreviewed_hosts(self):
        route = SimpleNamespace(request=SimpleNamespace(url=""), continue_=AsyncMock(), abort=AsyncMock())
        for url in ["https://rplms.polite.edu.sg/d2l/home", "https://custom.example.com/", "https://login.microsoftonline.com.evil.example/"]:
            route.request.url = url
            with patch("school_profile.require_public_url") as resolve:
                await guard_browser_route(route, "https://tplms.polite.edu.sg")
                resolve.assert_not_called()
            route.abort.assert_awaited()
        for url in ["https://tplms.polite.edu.sg/d2l/home", "https://login.microsoftonline.com/tenant?state=synthetic"]:
            route.request.url = url
            route.continue_.reset_mock()
            with patch("school_profile.require_public_url"):
                await guard_browser_route(route, "https://tplms.polite.edu.sg")
            route.continue_.assert_awaited_once()

    async def test_redirects_and_private_dns_are_rejected_before_following(self):
        data = fixture()
        data["profileSettings"]["profiles"][0].update(entryUrl="https://tplms.polite.edu.sg/d2l/home", origin="https://tplms.polite.edu.sg")
        config = resolve_profile(data)
        response = AsyncMock()
        response.status = 302
        context = AsyncMock()
        context.request.get.return_value = response
        adapter = Brightspace(context, config)
        with patch("brightspace.require_public_url", return_value="https://school.example.edu"), patch.dict("os.environ", {"LMS_ACCESS_TOKEN": ""}):
            with self.assertRaises(LoginRequired): await adapter.get("/d2l/api/versions/")
        self.assertEqual(context.request.get.call_args.kwargs["max_redirects"], 0)
        context.request.get.reset_mock()
        with patch("brightspace.require_public_url", side_effect=ValueError("Private DNS")), patch.dict("os.environ", {"LMS_ACCESS_TOKEN": ""}):
            with self.assertRaises(ValueError): await adapter.get("/d2l/api/versions/")
        context.request.get.assert_not_called()


if __name__ == "__main__": unittest.main()
