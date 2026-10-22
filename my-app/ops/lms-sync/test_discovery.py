import unittest
from brightspace import Brightspace
from school_profile import resolve_profile
from test_school_profile import fixture


class DiscoveryTests(unittest.IsolatedAsyncioTestCase):
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
