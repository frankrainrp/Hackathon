"""Confirmed, non-secret school metadata and isolated browser-session scopes."""
import hashlib
import ipaddress
import json
from pathlib import Path
import re
import socket
import os
from urllib.parse import urlsplit, urlunsplit
from datetime import datetime, timedelta, timezone
from xml.sax.saxutils import escape

SCHOOL_HOSTS = frozenset({"tplms.polite.edu.sg", "rplms.polite.edu.sg", "splms.polite.edu.sg"})
SSO_SUFFIXES = ("microsoftonline.com", "msauth.net", "msftauth.net", "msauthimages.net")


def require_supported_school(config):
    _, origin = school_entry(config["entry_url"])
    if config["platform"] != "brightspace" or urlsplit(origin).hostname not in SCHOOL_HOSTS or origin != config["base_url"]:
        raise ValueError("This school profile is metadata only. Its platform/domain has no reviewed connection policy; login and sync are blocked.")


def allowed_login_host(host, school_origin):
    school_host = urlsplit(school_origin).hostname
    return school_host in SCHOOL_HOSTS and (host == school_host or any(host == suffix or host.endswith("." + suffix) for suffix in SSO_SUFFIXES))


def school_entry(value):
    value = value.strip()
    if re.search(r"[\\\s\x00-\x1f]", value):
        raise ValueError("Use a public HTTPS school URL without whitespace or backslashes.")
    url = urlsplit(value)
    host = (url.hostname or "").lower()
    if url.scheme != "https" or url.username is not None or url.password is not None or url.query or url.fragment or url.port not in (None, 443):
        raise ValueError("Use HTTPS port 443 without credentials, query or fragment.")
    if not re.fullmatch(r"(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}", host) or host.rsplit(".", 1)[-1] in {"local", "localhost", "internal", "test", "invalid", "home", "lan"}:
        raise ValueError("The school must have a public DNS hostname, not an IP or local host.")
    origin = "https://" + host
    return urlunsplit(("https", host, url.path or "/", "", "")), origin


def require_public_url(value, resolver=socket.getaddrinfo):
    parsed = urlsplit(value)
    _, origin = school_entry(urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", "")))
    addresses = resolver(urlsplit(origin).hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ValueError("School/SSO URLs must resolve only to public network addresses.")
    return value


def resolve_profile(config, allow_pending=False):
    settings = config.get("profileSettings", {})
    profile = next((p for p in settings.get("profiles", []) if p["id"] == settings.get("activeProfileId")), None)
    if not profile or not profile.get("confirmedAt"):
        raise ValueError("Confirm your school and semester in Courses > School settings first. Example schools are not your account.")
    entry, origin = school_entry(profile["entryUrl"])
    if profile.get("origin") != origin:
        raise ValueError("School origin changed; create and confirm a new school profile.")
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", profile["id"]):
        raise ValueError("Invalid school profile ID.")
    semester = next((s for s in profile["semesters"] if s["id"] == profile["activeSemesterId"]), None)
    if not semester or (semester.get("confirmed") is not True and not allow_pending):
        raise ValueError("Confirm the current semester before syncing.")
    for course in semester["courses"]:
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", course["id"]) or not isinstance(course.get("selected"), bool) or course.get("status") not in {"active", "completed", "paused"}:
            raise ValueError("Invalid course selection or course status.")
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", semester["id"]):
        raise ValueError("Invalid semester ID.")
    daily_plan(profile["daily"])
    config.update(school=profile["school"], base_url=origin, entry_url=entry, profile_id=profile["id"], timezone=profile["daily"]["timezone"],
                  semester_id=semester["id"], semester_label=semester["label"], platform=profile.get("platform") or ("brightspace" if urlsplit(origin).hostname in SCHOOL_HOSTS else "unsupported"), daily=profile["daily"],
                  courses=[{"id": c["id"], "name": c["name"]} for c in semester["courses"] if c["selected"] and c["status"] == "active"],
                  course_status={c["id"]: c["status"] for c in semester["courses"]})
    return config


def session_scope(config):
    _, origin = school_entry(config["entry_url"])
    return hashlib.sha256(f"{config['profile_id']}|{config['school']}|{origin}".encode()).hexdigest()[:24]


def session_path(config):
    return Path(config["private_dir"]) / "sessions" / session_scope(config) / "session.enc"


def session_envelope(config, storage):
    return {"scope": session_scope(config), "origin": config["base_url"],
            "savedAt": datetime.now(timezone.utc).isoformat(), "storage": storage}


def session_storage(config, saved):
    if saved.get("scope") != session_scope(config) or saved.get("origin") != config["base_url"]:
        raise ValueError("This session belongs to a different school profile. Sign in separately.")
    return saved["storage"]


def access_token(config):
    token = os.environ.get("LMS_ACCESS_TOKEN")
    if token and (os.environ.get("LMS_ACCESS_TOKEN_ORIGIN") != config["base_url"] or os.environ.get("LMS_ACCESS_TOKEN_PROFILE") != config.get("profile_id")):
        raise ValueError("An institution-issued token must be bound to LMS_ACCESS_TOKEN_ORIGIN and LMS_ACCESS_TOKEN_PROFILE.")
    return token


async def guard_browser_route(route, school_origin):
    # Unknown domains (including a different school) fail closed before DNS or navigation.
    try:
        if not allowed_login_host(urlsplit(route.request.url).hostname or "", school_origin):
            raise ValueError("Unreviewed login/redirect domain.")
        require_public_url(route.request.url)
        await route.continue_()
    except (ValueError, OSError):
        await route.abort("blockedbyclient")


def browser_route_policy(school_origin):
    async def handle(route):
        await guard_browser_route(route, school_origin)
    return handle


def daily_plan(daily, now=None):
    if daily.get("timezone") not in ("Asia/Singapore", "UTC") or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", daily.get("time", "")):
        raise ValueError("Daily time must be HH:MM; supported schedule zones are Asia/Singapore and UTC.")
    zone = timezone(timedelta(hours=8)) if daily["timezone"] == "Asia/Singapore" else timezone.utc
    now = (now or datetime.now(timezone.utc)).astimezone(zone)
    hour, minute = map(int, daily["time"].split(":"))
    start = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if start <= now:
        start += timedelta(days=1)
    return {"cadence": "daily", "time": daily["time"], "timezone": daily["timezone"], "startBoundary": start.isoformat(), "enabled": False}


def schedule_xml(config, executable, arguments, working_directory, user, now=None):
    plan = daily_plan(config["daily"], now)
    text = lambda value: escape(str(value), {'"': "&quot;"})
    xml = f'''<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<Triggers><CalendarTrigger><StartBoundary>{plan['startBoundary']}</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers>
<Principals><Principal id="Author"><UserId>{text(user)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
<Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT55M</ExecutionTimeLimit></Settings>
<Actions Context="Author"><Exec><Command>{text(executable)}</Command><Arguments>{text(arguments)}</Arguments><WorkingDirectory>{text(working_directory)}</WorkingDirectory></Exec></Actions></Task>'''
    supported = config.get("platform") == "brightspace" and urlsplit(config.get("base_url", "")).hostname in SCHOOL_HOSTS
    return {**plan, "connectionSupported": supported, "taskName": "Butler-LMS-Daily-" + config["profile_id"], "xml": xml}
