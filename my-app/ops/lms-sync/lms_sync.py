"""Confirmed school/semester -> daily incremental download -> Butler inbox."""
import argparse
import asyncio
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import secrets
import sys
import time
from urllib.parse import urlparse

from core import Ledger, atomic_json, component, export_course
from secrets_store import load_secret, save_secret
from school_profile import (resolve_profile, require_public_url, session_path, session_storage,
                            session_envelope, browser_route_policy, require_supported_school, daily_plan, schedule_xml)

HERE = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
LOG = logging.getLogger("lms-sync")


def load_config(path: Path, allow_pending=False):
    config = resolve_profile(json.loads(path.read_text(encoding="utf-8-sig")), allow_pending=allow_pending)
    config["config_path"] = str(path)
    target = urlparse(config.get("butler_url", "http://127.0.0.1:3000"))
    if target.hostname not in ("localhost", "127.0.0.1", "::1") or target.scheme not in ("http", "https"):
        raise ValueError("Butler bridge must run on this computer.")
    for field in ("output_dir", "private_dir"):
        config[field] = str((path.parent / config[field]).resolve())
    if not 1 <= int(config.get("max_file_mb", 150)) <= 500:
        raise ValueError("max_file_mb must be between 1 and 500.")
    for field in ("max_office_file_mb", "max_media_file_mb"):
        if not 1 <= int(config.get(field, 1024)) <= 4096:
            raise ValueError(f"{field} must be between 1 and 4096.")
    return config


@contextmanager
def single_run(private: Path):
    private.mkdir(parents=True, exist_ok=True)
    handle = (private / "sync.lock").open("a+b")
    handle.seek(0)
    if not handle.read(1):
        handle.write(b"0")
        handle.flush()
    handle.seek(0)
    acquired = False
    try:
        if os.name == "nt":
            import msvcrt
            try:
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                raise RuntimeError("Another sync is already running.") from None
        else:
            import fcntl
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        acquired = True
        yield
    finally:
        if acquired:
            handle.seek(0)
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_UN)
        handle.close()


def configure_bridge(config):
    private = Path(config["private_dir"])
    secret_path = private / "bridge.enc"
    env_path = HERE.parents[1] / "apps" / "web" / ".env.local"
    env = env_path.read_text(encoding="utf-8") if env_path.exists() else ""
    token_line = next((l for l in env.splitlines() if l.startswith("LMS_SYNC_TOKEN=")), None)
    token = token_line.split("=", 1)[1].strip().strip('"') if token_line else secrets.token_urlsafe(48)
    if len(token) < 32:
        raise ValueError("Existing LMS_SYNC_TOKEN must have at least 32 characters.")
    additions = []
    if not token_line:
        additions.append("LMS_SYNC_TOKEN=" + token)
    if "BUTLER_DB_PATH=" not in env:
        additions.append('BUTLER_DB_PATH="' + (private / "butler.sqlite").as_posix() + '"')
    if "LMS_ALLOWED_ORIGIN=" not in env:
        # Butler also accepts any https://*.polite.edu.sg school, so this only matters for non-POLITEMall schools.
        additions.append("LMS_ALLOWED_ORIGIN=" + (config["base_url"] or POLITEMALL_PORTAL))
    if "LMS_CONTENT_AI_ENABLED=" not in env:
        additions.append("LMS_CONTENT_AI_ENABLED=true")
    if "LMS_CONFIG_PATH=" not in env:
        additions.append('LMS_CONFIG_PATH="' + Path(config["config_path"]).as_posix() + '"')
    env_path.parent.mkdir(parents=True, exist_ok=True)
    if additions:
        env_path.write_text(env.rstrip() + "\n" + "\n".join(additions) + "\n", encoding="utf-8")
    save_secret(secret_path, {"token": token})
    LOG.info("Bridge configured. Restart Butler after changing its environment.")


def push(config, snapshot):
    token = os.environ.get("LMS_SYNC_TOKEN")
    if not token:
        token = load_secret(Path(config["private_dir"]) / "bridge.enc")["token"]
    body = json.dumps(snapshot, ensure_ascii=False).encode()
    # A direct loopback connection never uses environment proxies or follows redirects.
    # Do not construct urllib's unrelated HTTPS handler for a plain HTTP bridge: frozen
    # Python can lack its TLS provider configuration even while the school browser works.
    from http.client import HTTPConnection, HTTPSConnection
    target = urlparse(config["butler_url"])
    if target.hostname not in ("localhost", "127.0.0.1", "::1") or target.scheme not in ("http", "https"):
        raise ValueError("Butler bridge must run on this computer.")
    connection_type = HTTPSConnection if target.scheme == "https" else HTTPConnection
    connection = connection_type(target.hostname, target.port, timeout=90)
    try:
        connection.request("POST", target.path.rstrip("/") + "/api/lms/ingest", body=body,
                           headers={"Content-Type": "application/json", "Authorization": "Bearer " + token,
                                    "X-Butler-Language": "zh" if config.get("language") == "zh" else "en"})
        response = connection.getresponse()
        if not 200 <= response.status < 300:
            raise RuntimeError(f"Butler bridge returned HTTP {response.status}; local data was preserved.")
        result = json.loads(response.read(100_000))
    finally:
        connection.close()
    if not result.get("ok"):
        raise RuntimeError("Butler rejected the snapshot.")
    LOG.info("Butler imported snapshot; notifications=%s, AI=%s", result["notifications"], result["aiStatus"])
    return result


async def signed_in(page):
    """True once Brightspace accepts this session (works whatever the homepage looks like)."""
    if await page.get_by_role("heading", name="My Courses", exact=True).count():
        return True
    try:
        return await page.evaluate("""async () => {
            const v = await fetch('/d2l/api/versions/', { credentials: 'include' });
            if (!v.ok) return false;
            const lp = (await v.json()).find(x => x.ProductCode === 'lp');
            if (!lp) return false;
            const r = await fetch(`/d2l/api/lp/${lp.LatestVersion}/users/whoami`, { credentials: 'include' });
            return r.ok;
        }""")
    except Exception:
        return False


async def login(config):
    require_supported_school(config)
    from playwright.async_api import async_playwright
    if config["platform"] != "brightspace":
        raise ValueError("This profile is saved, but its LMS needs a separate adapter. Only Brightspace is supported.")
    require_public_url(config["entry_url"])
    expected = urlparse(config["base_url"]).netloc
    saved_path = session_path(config)
    state = session_storage(config, load_secret(saved_path)) if saved_path.exists() else {"cookies": [], "origins": []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel=config.get("browser_channel", "msedge"), headless=False)
        context = await browser.new_context(storage_state=state, service_workers="block")
        await context.route("**/*", browser_route_policy(config["base_url"]))
        await context.route_web_socket("**/*", lambda socket: socket.close())
        page = await context.new_page()
        await page.goto(config["entry_url"])
        LOG.info("Complete the %s login in the new Edge window. The session will be saved encrypted automatically.", config["school"])
        deadline = time.monotonic() + 600
        try:
            while time.monotonic() < deadline:
                parsed = urlparse(page.url)
                host = parsed.hostname or ""
                on_school = parsed.netloc == expected
                if parsed.scheme == "https" and on_school and parsed.path.startswith("/d2l/home") and await signed_in(page):
                    state = await context.storage_state(indexed_db=True)
                    save_secret(saved_path, session_envelope(config, state))
                    LOG.info("School session saved encrypted; no password was stored.")
                    return 0
                await asyncio.sleep(2)
            raise RuntimeError("Login was not completed within 10 minutes.")
        finally:
            await browser.close()


async def sync(config, metadata_only=False, catalog_only=False):
    if not catalog_only:
        from course_content import extract_material
    require_supported_school(config)
    if config["platform"] != "brightspace":
        raise ValueError("Only confirmed Brightspace profiles can sync. Other LMS adapters are not implemented.")
    if not catalog_only and not config["courses"]:
        raise ValueError("Select active courses for the confirmed semester first. Run catalog after login to list courses without downloading files.")
    require_public_url(config["base_url"])
    from brightspace import Brightspace, LoginRequired, AccessUnavailable
    from playwright.async_api import async_playwright
    private = Path(config["private_dir"])
    snapshot = {"school": config["school"], "baseUrl": config["base_url"], "timezone": config["timezone"],
                "profileId": config["profile_id"], "semesterId": config["semester_id"], "semesterLabel": config["semester_label"],
                "syncedAt": datetime.now(timezone.utc).isoformat(), "status": "ok", "warnings": [],
                "courses": [], "metadataOnly": metadata_only, "enableAiBrief": config.get("enable_ai_brief", True)}
    ledger = Ledger(private / "sync.sqlite")
    try:
        saved_path = session_path(config)
        if not saved_path.exists() and not os.environ.get("LMS_ACCESS_TOKEN"):
            raise LoginRequired("Please run login before the first sync.")
        state = session_storage(config, load_secret(saved_path)) if saved_path.exists() else {"cookies": [], "origins": []}
        async with async_playwright() as p:
            browser = await p.chromium.launch(channel=config.get("browser_channel", "msedge"), headless=True)
            context = await browser.new_context(storage_state=state, service_workers="block")
            await context.route("**/*", browser_route_policy(config["base_url"]))
            adapter = Brightspace(context, {**config, "courses": [], "discover_semesters": True} if catalog_only else config)
            try:
                await adapter.initialize()
                courses = await adapter.courses()
                if catalog_only:
                    atomic_json(private / "catalogs" / (config["profile_id"] + ".json"), courses)
                    save_secret(saved_path, session_envelope(config, await context.storage_state(indexed_db=True)))
                    LOG.info("Course catalog saved locally. Assign courses to the current semester in Courses > School settings.")
                    return 0
                seen_folders = {}
                for source in courses:
                    try:
                        course, warnings = await adapter.course(source)
                        course["courseStatus"] = config["course_status"].get(course["id"], "active")
                        snapshot["warnings"].extend(warnings)
                        # Distinct enrollment IDs must never share an export directory.
                        name = component(course["moduleName"])
                        if name in seen_folders:
                            course["moduleName"] += f" [{course['id']}]"
                        seen_folders[name] = course["id"]
                        export_course(Path(config["output_dir"]) / config["profile_id"] / config["semester_id"], config["school"], course, config.get("language", "en"))
                        snapshot["courses"].append(course)
                    except AccessUnavailable as error:
                        snapshot["warnings"].append(f"{source['name']}: {error}")
                    await asyncio.sleep(0.5)
                if not metadata_only:
                    # Deliver the small facts first; large course ZIPs can finish in the background.
                    snapshot["status"] = "partial" if snapshot["warnings"] else "ok"
                    atomic_json(private / "last-snapshot.json", snapshot)
                    try:
                        push(config, {**snapshot, "metadataOnly": True})
                    except Exception:
                        LOG.info("Initial metadata delivery pending; downloads continue and final delivery retries.")
                    for course in snapshot["courses"]:
                        folder = export_course(Path(config["output_dir"]) / config["profile_id"] / config["semester_id"], config["school"], course, config.get("language", "en"))
                        for lesson in course["lessons"]:
                            for material in lesson["materials"]:
                                if not material["downloadable"]:
                                    continue
                                path = folder / lesson["directory"] / material["filename"]
                                key = f"{config['profile_id']}:{config['semester_id']}:{config['base_url']}:{course['id']}:{material['id']}"
                                try:
                                    ledger.relocate(key, material["modifiedAt"], path, Path(config["output_dir"]))
                                    # Instruction edits need not change the linked topic's
                                    # timestamp. Refresh these small API page snapshots from
                                    # the current response without another network request.
                                    if material.get("pageSnapshot") or ledger.needs_download(key, material["modifiedAt"], path):
                                        media_text = await adapter.download_to(course["id"], material, path)
                                        material.update(media_text)
                                        ledger.downloaded(key, material["modifiedAt"], path)
                                        LOG.info("Downloaded %s / %s", course["moduleName"], material["title"])
                                    material["filePath"] = str(path.resolve())
                                    if not material.get("text"):
                                        material.update(extract_material(path))
                                except AccessUnavailable as error:
                                    snapshot["warnings"].append(f"{course['moduleName']}: {material['title']} - {error}")
                        export_course(Path(config["output_dir"]) / config["profile_id"] / config["semester_id"], config["school"], course, config.get("language", "en"))
                    # Bound school-text payloads; retrieval reports truncation rather than inventing content.
                    remaining = 1_200_000
                    for course in snapshot["courses"]:
                        for lesson in course["lessons"]:
                            for material in lesson["materials"]:
                                text = material.get("text", "")
                                if len(text) > remaining:
                                    material["text"] = text[:remaining]
                                    material["textStatus"] = "truncated"
                                remaining -= len(material.get("text", ""))
                save_secret(saved_path, session_envelope(config, await context.storage_state(indexed_db=True)))
            finally:
                await browser.close()
    except LoginRequired as error:
        snapshot["status"] = "login_required"
        snapshot["warnings"].append(str(error))
    except AccessUnavailable as error:
        snapshot["status"] = "error"
        snapshot["warnings"].append(str(error))
    except Exception as error:
        snapshot["status"] = "error"
        # Browser errors sometimes include cookies/URLs: log only the type, not raw diagnostics.
        snapshot["warnings"].append(f"Sync failed ({type(error).__name__}); previous files were preserved.")
        import traceback
        LOG.error("Sync failure locations: %s", " > ".join(f"{Path(frame.filename).name}:{frame.lineno}:{frame.name}" for frame in traceback.extract_tb(error.__traceback__)))
    finally:
        ledger.close()
    if snapshot["warnings"] and snapshot["status"] == "ok":
        snapshot["status"] = "partial"
    atomic_json(private / "last-snapshot.json", snapshot)
    history_path = private / "sync-history.json"
    history = json.loads(history_path.read_text(encoding="utf-8")) if history_path.exists() else []
    history.append({"profileId": config["profile_id"], "semesterId": config["semester_id"], "syncedAt": snapshot["syncedAt"], "status": snapshot["status"], "courses": len(snapshot["courses"])})
    atomic_json(history_path, history)
    LOG.info("Sync %s: %d courses, %d warnings", snapshot["status"], len(snapshot["courses"]), len(snapshot["warnings"]))
    if catalog_only:
        return 3 if snapshot["status"] == "login_required" else 1
    try:
        push(config, snapshot)
        atomic_json(private / "status.json", {"syncedAt": snapshot["syncedAt"], "status": snapshot["status"], "bridge": "ok", "warnings": snapshot["warnings"]})
    except Exception as error:
        atomic_json(private / "status.json", {"syncedAt": snapshot["syncedAt"], "status": snapshot["status"], "bridge": "pending", "warnings": snapshot["warnings"]})
        LOG.error("Butler delivery pending (%s); snapshot retained for retry.", type(error).__name__)
        return 2
    return {"ok": 0, "login_required": 3, "partial": 4}.get(snapshot["status"], 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=HERE / "config.local.json")
    parser.add_argument("command", choices=["setup", "login", "catalog", "sync", "inspect", "watch", "status", "retry", "session-check", "schedule-plan"])
    parser.add_argument("--task-user", default="CURRENT_USER")
    parser.add_argument("--task-executable")
    parser.add_argument("--expected-profile")
    parser.add_argument("--no-ai-brief", action="store_true", help="Import school facts without requesting an AI summary")
    parser.add_argument("--all-active-courses", action="store_true", help="Read metadata for all active courses without changing download selections")
    args = parser.parse_args()
    config = load_config(args.config.resolve(), allow_pending=args.command in ("setup", "login", "catalog", "session-check", "status"))
    if args.no_ai_brief:
        config["enable_ai_brief"] = False
    if args.all_active_courses:
        if args.command != "inspect":
            raise ValueError("All-course checks are metadata only.")
        profile = next(p for p in config["profileSettings"]["profiles"] if p["id"] == config["profile_id"])
        semester = next(s for s in profile["semesters"] if s["id"] == config["semester_id"])
        config["courses"] = [{"id": c["id"], "name": c["name"]} for c in semester["courses"] if c["status"] == "active"]
    if args.expected_profile and args.expected_profile != config["profile_id"]:
        raise ValueError("The scheduled school profile changed. Review and approve a separate schedule for that school.")
    if args.command == "schedule-plan":
        frozen = getattr(sys, "frozen", False)
        arguments = f'--config "{args.config.resolve()}" --expected-profile {config["profile_id"]} sync'
        if not frozen:
            arguments = f'"{Path(__file__).resolve()}" ' + arguments
        print(json.dumps(schedule_xml(config, args.task_executable or sys.executable, arguments, HERE, args.task_user)))
        return 0
    private = Path(config["private_dir"])
    if args.command == "session-check":
        saved = session_path(config)
        if not saved.exists():
            return 3
        envelope = load_secret(saved)
        session_storage(config, envelope)
        status_file = private / "last-snapshot.json"
        status = json.loads(status_file.read_text(encoding="utf-8")) if status_file.exists() else {}
        if status.get("profileId") == config["profile_id"] and status.get("status") == "login_required":
            try:
                failed_at = datetime.fromisoformat(status["syncedAt"].replace("Z", "+00:00"))
                renewed_at = datetime.fromisoformat(envelope["savedAt"].replace("Z", "+00:00"))
                return 3 if failed_at >= renewed_at else 0
            except (KeyError, ValueError, TypeError):
                return 3
        return 0
    private.mkdir(parents=True, exist_ok=True)
    from logging.handlers import RotatingFileHandler
    handlers = [RotatingFileHandler(private / "sync.log", maxBytes=1024 * 1024, backupCount=3, encoding="utf-8")]
    if sys.stderr is not None:
        handlers.append(logging.StreamHandler())
    logging.basicConfig(level=logging.INFO, handlers=handlers, format="%(asctime)s %(levelname)s %(message)s")
    if args.command == "setup":
        configure_bridge(config)
        return 0
    if args.command == "status":
        if not (private / "status.json").exists():
            print("No sync has run yet.")
        else:
            print((private / "status.json").read_text(encoding="utf-8"))
        return 0
    if args.command == "retry":
        push(config, json.loads((private / "last-snapshot.json").read_text(encoding="utf-8")))
        return 0
    if args.command == "login":
        with single_run(private):
            return asyncio.run(login(config))
    if args.command in ("sync", "inspect", "catalog"):
        with single_run(private):
            return asyncio.run(sync(config, metadata_only=args.command == "inspect", catalog_only=args.command == "catalog"))
    while True:
        config = load_config(args.config.resolve())
        try:
            with single_run(private):
                asyncio.run(sync(config))
        except RuntimeError:
            LOG.info("Sync skipped because another process is running.")
        next_run = datetime.fromisoformat(daily_plan(config["daily"])["startBoundary"])
        time.sleep(max(1, (next_run - datetime.now(timezone.utc)).total_seconds()))


if __name__ == "__main__":
    sys.exit(main())
