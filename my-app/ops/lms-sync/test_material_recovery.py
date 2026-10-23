import tempfile
import unittest
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
from io import BytesIO
import json
from brightspace import Brightspace, AccessUnavailable
from course_content import extract_material


class RecoveryTests(unittest.IsolatedAsyncioTestCase):
    async def test_media_uses_only_get_links_and_does_not_forward_login_to_delivery(self):
        from school_media import download_media
        tenant = '00000000-1111-2222-3333-444444444444'
        seq = tenant + '.sequences.api.brightspace.com'
        svc = tenant + '.content-service.api.brightspace.com'
        async def page_get(url, **kwargs):
            self.assertTrue(url.startswith('https://rplms.polite.edu.sg/'))
            class Response:
                status, ok, headers = 200, True, {}
                async def text(self): return f'<d2l-sequence-viewer href="https://{seq}/sequence" token="synthetic-test-token" allow-media-downloads="true"></d2l-sequence-viewer>'
                async def dispose(self): pass
            return Response()
        data = {
            'sequence': {'properties': {'canDownload': True}, 'entities': [{'links': [{'class': ['content-service-resource'], 'href': f'https://{svc}/resource'}]}]},
            'resource': {'properties': {'topicId': 7, 'orgUnitId': 9, 'contentServiceEndpoint': 'https://api.example-region.content-service.brightspace.com'}, 'actions': [
                {'name': 'get-media', 'method': 'GET', 'href': f'https://{svc}/media'}, {'name': 'get-tracks', 'method': 'GET', 'href': f'https://{svc}/tracks'}]},
            'media': {'properties': {'src': 'https://content.example-region.content-service.brightspace.com/source.mp4?Signature=synthetic'}},
            'tracks': {'properties': {'tracks': []}},
        }
        def metadata(url, headers=None):
            self.assertIn(url.split('/')[2], (seq, svc))
            self.assertEqual(headers, {'Authorization': 'Bearer synthetic-test-token'})
            return json.dumps(data[url.rsplit('/', 1)[-1]]).encode()
        def stream(url, path, limit, *args):
            self.assertEqual(args, (), 'Media CDN must receive neither cookies nor bearer headers')
            path.write_bytes(b'\0\0\0\x18ftypisom')
        adapter = SimpleNamespace(base='https://rplms.polite.edu.sg', config={}, context=SimpleNamespace(request=SimpleNamespace(get=page_get)))
        with tempfile.TemporaryDirectory() as root, patch('school_media.require_public_url'), patch('school_media.small_response', metadata), patch('school_media.stream_to_file', stream):
            material = {'id': '7', 'url': 'https://rplms.polite.edu.sg/view', 'mediaTenant': tenant}
            path = Path(root) / 'video.mp4'
            await download_media(adapter, '9', material, path)
            self.assertEqual(extract_material(path)['textStatus'], 'unsupported')
            data['sequence']['entities'][0]['links'][0]['href'] = 'https://unrelated.example/resource'
            from school_download import DownloadError
            with self.assertRaisesRegex(DownloadError, 'untrusted'): await download_media(adapter, '9', material, path)

    def test_stream_limit_or_incomplete_response_never_replaces_saved_file(self):
        from school_download import stream_to_file, DownloadError
        for declared, payload, limit in [(99, b'small', 20), (15, b'short', 20), (0, b'x'*30, 20)]:
            response = BytesIO(payload)
            response.headers = {'Content-Length': str(declared)}
            with tempfile.TemporaryDirectory() as root, patch('school_download.require_public_url'), patch('school_download.build_opener', return_value=SimpleNamespace(open=lambda *a, **k: response)):
                path = Path(root) / 'saved.pptx'; path.write_bytes(b'previous copy')
                with self.assertRaises(DownloadError): stream_to_file('https://school.example/file', path, limit)
                self.assertEqual(path.read_bytes(), b'previous copy')
                self.assertFalse(path.with_suffix('.pptx.part').exists())

    def test_submission_restricted_start_does_not_hide_readable_status(self):
        from core import assignment_availability
        future = {'Availability': {'StartDate': '2099-01-01T00:00:00Z', 'StartDateAvailabilityType': 1}}
        self.assertEqual(assignment_availability(future), {})

    async def test_future_access_restriction_is_not_a_submission_failure(self):
        adapter = Brightspace(None, {"base_url": "https://rplms.polite.edu.sg"})
        adapter.versions = {"le": "1.0"}
        paths = []
        async def get(path, **kwargs):
            paths.append(path)
            if path.endswith('/content/toc'): return {"Modules": []}
            if path.endswith('/dropbox/folders/'):
                return [{"Id": 2, "Name": "Future work", "Availability": {
                    "StartDate": "2099-01-01T00:00:00Z", "StartDateAvailabilityType": 0}}]
            if path.endswith('/news/'): return []
            raise AccessUnavailable("HTTP 403")
        adapter.get = get
        course, warnings = await adapter.course({"id": "7", "name": "Synthetic course"})
        self.assertEqual(warnings, [])
        self.assertFalse(any('mysubmissions' in path for path in paths))
        self.assertEqual(course['assignments'][0]['submissionState'], 'unknown')
        self.assertEqual(course['assignments'][0]['availability'], 'upcoming')

    def test_media_heavy_office_reads_only_slide_xml_from_disk(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'media-heavy.pptx'
            with zipfile.ZipFile(path, 'w') as archive:
                for index in range(210): archive.writestr(f'ppt/media/image{index}.png', b'not text')
                with archive.open('ppt/media/video.mp4', 'w') as video:
                    for _ in range(151): video.write(b'0' * 1024 * 1024)
                archive.writestr('ppt/slides/slide1.xml', '<s><t>Actual course instructions</t></s>')
            with patch.object(Path, 'read_bytes', side_effect=AssertionError('Do not buffer a large deck')):
                extracted = extract_material(path)
            self.assertEqual(extracted['textStatus'], 'ready')
            self.assertIn('Actual course instructions', extracted['text'])


if __name__ == '__main__': unittest.main()
