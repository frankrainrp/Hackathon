"""Exercise encrypted session restoration/rotation through the actual worker entry points."""
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from lms_sync import login, sync
from school_profile import resolve_profile, session_envelope, session_path, session_storage
from secrets_store import load_secret, save_secret
from test_school_profile import fixture


def config_at(folder):
    raw = fixture()
    raw["private_dir"] = str(Path(folder) / "private")
    raw["output_dir"] = str(Path(folder) / "courses")
    raw["profileSettings"]["profiles"][0].update(
        entryUrl="https://rplms.polite.edu.sg/d2l/home", origin="https://rplms.polite.edu.sg")
    return resolve_profile(raw)


def browser_harness(storage):
    page = SimpleNamespace(url="https://rplms.polite.edu.sg/d2l/home", goto=AsyncMock())
    context = SimpleNamespace(route=AsyncMock(), route_web_socket=AsyncMock(),
                              new_page=AsyncMock(return_value=page), storage_state=AsyncMock(return_value=storage))
    browser = SimpleNamespace(new_context=AsyncMock(return_value=context), close=AsyncMock())
    engine = SimpleNamespace(chromium=SimpleNamespace(launch=AsyncMock(return_value=browser)))
    manager = MagicMock()
    manager.__aenter__ = AsyncMock(return_value=engine)
    manager.__aexit__ = AsyncMock(return_value=False)
    return manager, browser, context


class SessionReuseTests(unittest.IsolatedAsyncioTestCase):
    async def test_login_restores_previous_encrypted_session_and_saves_indexed_db(self):
        with tempfile.TemporaryDirectory() as folder:
            config = config_at(folder)
            old = {"cookies": [{"name": "synthetic", "value": "old"}], "origins": []}
            new = {"cookies": [{"name": "synthetic", "value": "renewed"}], "origins": [
                {"origin": config["base_url"], "localStorage": [], "indexedDB": []}]}
            save_secret(session_path(config), session_envelope(config, old))
            manager, browser, context = browser_harness(new)
            with patch("playwright.async_api.async_playwright", return_value=manager), \
                 patch("lms_sync.require_public_url"), patch("lms_sync.signed_in", AsyncMock(return_value=True)):
                self.assertEqual(await login(config), 0)
            self.assertEqual(browser.new_context.call_args.kwargs.get("storage_state"), old)
            context.storage_state.assert_awaited_once_with(indexed_db=True)
            self.assertEqual(session_storage(config, load_secret(session_path(config))), new)
            self.assertNotIn(b"renewed", session_path(config).read_bytes())

    async def test_catalog_persists_rotated_cookies_before_early_return_and_next_process_uses_them(self):
        with tempfile.TemporaryDirectory() as folder:
            config = config_at(folder)
            old = {"cookies": [{"name": "synthetic", "value": "old"}], "origins": []}
            new = {"cookies": [{"name": "synthetic", "value": "rotated"}], "origins": []}
            save_secret(session_path(config), session_envelope(config, old))
            adapter = SimpleNamespace(initialize=AsyncMock(), courses=AsyncMock(return_value=[]))
            for expected in (old, new):
                manager, browser, context = browser_harness(new)
                with patch("playwright.async_api.async_playwright", return_value=manager), \
                     patch("lms_sync.require_public_url"), patch("brightspace.Brightspace", return_value=adapter):
                    self.assertEqual(await sync(config, catalog_only=True), 0)
                self.assertEqual(browser.new_context.call_args.kwargs["storage_state"], expected)
                context.storage_state.assert_awaited_once_with(indexed_db=True)
                self.assertEqual(session_storage(config, load_secret(session_path(config))), new)
                browser.close.assert_awaited_once()
            self.assertFalse((Path(config["private_dir"]) / "last-snapshot.json").exists())

    def test_new_login_is_not_marked_expired_by_an_older_failure_snapshot(self):
        import lms_sync
        import sys
        with tempfile.TemporaryDirectory() as folder:
            config = config_at(folder)
            save_secret(session_path(config), session_envelope(config, {"cookies": [], "origins": []}))
            (Path(config["private_dir"]) / "last-snapshot.json").write_text(json.dumps({
                "profileId": config["profile_id"], "status": "login_required", "syncedAt": "2020-01-01T00:00:00Z"}), encoding="utf8")
            with patch.object(sys, "argv", ["worker", "session-check"]), \
                 patch.object(lms_sync, "load_config", return_value=config):
                self.assertEqual(lms_sync.main(), 0)
            (Path(config["private_dir"]) / "last-snapshot.json").write_text(json.dumps({
                "profileId": config["profile_id"], "status": "login_required", "syncedAt": "2099-01-01T00:00:00Z"}), encoding="utf8")
            with patch.object(sys, "argv", ["worker", "session-check"]), \
                 patch.object(lms_sync, "load_config", return_value=config):
                self.assertEqual(lms_sync.main(), 3)


if __name__ == "__main__":
    unittest.main()
