"""Read-only Brightspace adapter using a dedicated, encrypted browser session.

The school must allow its logged-in user to read Valence routes; HTTP 403 is
reported as unavailable, never interpreted as an empty course or missing work.
Optional LMS_ACCESS_TOKEN supports institution-issued read-only OAuth access.
"""
import asyncio
import os
from urllib.parse import urlparse
from core import assignment, assignment_availability, content_lessons
from school_profile import require_public_url, require_supported_school, access_token


class LoginRequired(RuntimeError):
    pass


class AccessUnavailable(RuntimeError):
    pass


class Brightspace:
    def __init__(self, context, config):
        self.context, self.config = context, config
        self.base = config["base_url"].rstrip("/")
        self.versions = {}

    async def get(self, path, binary=False):
        require_supported_school(self.config)
        if not path.startswith("/d2l/api/"):
            raise ValueError("Only Brightspace API paths may receive authentication")
        token = access_token(self.config)
        headers = {"Authorization": "Bearer " + token} if token else {}
        for attempt in range(3):
            require_public_url(self.base + path)
            response = await self.context.request.get(self.base + path, headers=headers, timeout=60000, max_redirects=0)
            if response.status in (401, 302, 303):
                await response.dispose()
                raise LoginRequired("School session expired. Run the login command again.")
            if response.status == 429 or response.status >= 500:
                delay = min(30, int(response.headers.get("retry-after", "5")) if response.headers.get("retry-after", "5").isdigit() else 5)
                await response.dispose()
                if attempt < 2:
                    await asyncio.sleep(delay)
                    continue
            if not response.ok:
                status = response.status
                await response.dispose()
                raise AccessUnavailable(f"Brightspace HTTP {status}; access was not treated as missing data.")
            try:
                if binary:
                    limit = self.config.get("max_file_mb", 150) * 1024 * 1024
                    if int(response.headers.get("content-length", "0")) > limit:
                        raise AccessUnavailable("File exceeds the configured download size limit.")
                    body = await response.body()
                    if len(body) > limit:
                        raise AccessUnavailable("File exceeds the configured download size limit.")
                    # A real sign-in page has a password box. Course pages that merely mention "login"
                    # (e.g. TP's "Login" help page) must not be mistaken for an expired session.
                    head = body[:20000].lower()
                    if "text/html" in response.headers.get("content-type", "") and (b'type="password"' in head or b"type='password'" in head):
                        raise LoginRequired("File request returned a login page.")
                    return body
                if "json" not in response.headers.get("content-type", ""):
                    raise LoginRequired("School API returned a sign-in page instead of data.")
                return await response.json()
            finally:
                await response.dispose()
        raise AccessUnavailable("Brightspace temporarily unavailable; try the next sync.")

    async def initialize(self):
        products = await self.get("/d2l/api/versions/")
        for p in products:
            self.versions[p["ProductCode"]] = p["LatestVersion"]
        if not all(k in self.versions for k in ("le", "lp")):
            raise AccessUnavailable("Brightspace did not advertise LE/LP versions.")

    async def courses(self):
        if self.config.get("courses"):
            return self.config["courses"]
        result, bookmark = [], ""
        for _ in range(100):
            page = await self.get(f"/d2l/api/lp/{self.versions['lp']}/enrollments/myenrollments/?orgUnitTypeId=3&bookmark={bookmark}")
            for enrollment in page["Items"]:
                unit, access = enrollment["OrgUnit"], enrollment.get("Access", {})
                row = {"id": str(unit["Id"]), "name": unit["Name"], "code": unit.get("Code"),
                       "isActive": access.get("IsActive"), "canAccess": access.get("CanAccess"),
                       "startAt": access.get("StartDate"), "endAt": access.get("EndDate")}
                if self.config.get("discover_semesters"):
                    if len(result) >= 100:
                        raise AccessUnavailable("Course discovery exceeded the 100-course limit; previous selections were preserved.")
                    try:
                        info = await self.get(f"/d2l/api/lp/{self.versions['lp']}/courses/{row['id']}")
                        term = info.get("Semester")
                        if term and term.get("Name"):
                            row["semester"] = {"id": str(term["Identifier"]), "name": term["Name"]}
                        row["startAt"] = info.get("StartDate") or row["startAt"]
                        row["endAt"] = info.get("EndDate") or row["endAt"]
                    except AccessUnavailable:
                        # Some student roles cannot read offering metadata. Preserve enrollment evidence.
                        pass
                result.append(row)
            if not page["PagingInfo"]["HasMoreItems"]:
                return result
            new = str(page["PagingInfo"]["Bookmark"])
            if new == bookmark:
                raise AccessUnavailable("Enrollment paging did not advance.")
            bookmark = new
        raise AccessUnavailable("Enrollment paging exceeded the safety limit.")

    async def course(self, source):
        course_id = str(source["id"])
        prefix = f"/d2l/api/le/{self.versions['le']}/{course_id}"
        warnings = []
        toc = await self.get(prefix + "/content/toc")
        tasks, assignment_pages = [], {}
        try:
            folders = await self.get(prefix + "/dropbox/folders/")
            for folder in folders:
                if folder.get("IsHidden"):
                    continue
                assignment_pages[str(folder["Id"])] = folder
                try:
                    if assignment_availability(folder):
                        tasks.append(assignment(folder, None, self.base, course_id))
                        continue
                    entities = await self.get(prefix + f"/dropbox/folders/{folder['Id']}/submissions/mysubmissions/")
                except AccessUnavailable:
                    entities = None
                    warnings.append(f"{source['name']}: {folder['Name']} submission state unavailable.")
                tasks.append(assignment(folder, entities, self.base, course_id))
        except AccessUnavailable:
            warnings.append(f"{source['name']}: assignment list unavailable (permission/API restriction).")
        announcements = []
        try:
            news = await self.get(prefix + "/news/")
            for n in news:
                if n.get("IsHidden") or n.get("IsDeleted"):
                    continue
                announcements.append({"id": str(n["Id"]), "title": n["Title"],
                                      "text": n.get("Body", {}).get("Text", "")[:8000],
                                      "modifiedAt": n.get("LastModifiedDate") or n.get("StartDate"),
                                      "url": f"{self.base}/d2l/le/news/{course_id}/{n['Id']}/view"})
        except AccessUnavailable:
            warnings.append(f"{source['name']}: announcements unavailable.")
        return {"id": course_id, "moduleName": source["name"],
                "lessons": content_lessons(toc, self.base, course_id, assignment_pages),
                "assignments": tasks, "announcements": announcements}, warnings

    async def download(self, course_id, material):
        if material.get("pageSnapshot"):
            # Already obtained by the authenticated read-only folder API. Do not
            # navigate to a submission form, follow links or send any submission.
            return material["pageText"].encode("utf-8")
        return await self.get(f"/d2l/api/le/{self.versions['le']}/{course_id}/content/topics/{material['id']}/file", binary=True)

    async def download_to(self, course_id, material, path):
        from school_download import stream_to_file, DownloadError
        require_supported_school(self.config)
        if material.get("pageSnapshot"):
            path.with_suffix(path.suffix + ".part").write_bytes(await self.download(course_id, material))
            path.with_suffix(path.suffix + ".part").replace(path)
            return {}
        try:
            if material.get("mediaLibrary"):
                from school_media import download_media
                return await download_media(self, course_id, material, path)
            state = await self.context.request.storage_state()
            token = access_token(self.config)
            headers = {"Authorization": "Bearer " + token} if token else {}
            limit = self.config.get("max_office_file_mb", 1024) if path.suffix.lower() in (".pptx", ".docx", ".xlsx") else self.config.get("max_file_mb", 150)
            await asyncio.to_thread(stream_to_file, self.base + f"/d2l/api/le/{self.versions['le']}/{course_id}/content/topics/{material['id']}/file", path, limit * 1024 * 1024, headers, state.get("cookies", []))
            return {}
        except DownloadError as error:
            if error.login_required:
                raise LoginRequired(str(error)) from None
            raise AccessUnavailable(str(error)) from None
