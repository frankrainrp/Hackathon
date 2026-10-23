"""Read the school's Media Library download/track links, without writing LMS state.

Only the authenticated school's viewer may introduce a short-lived Brightspace
token. It is sent to that tenant's two service hosts and never persisted. Signed
media URLs are fetched without school cookies or Authorization headers.
"""
import asyncio
import json
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import Request, build_opener
from school_download import DownloadError, NoRedirect, stream_to_file
from school_profile import require_public_url


class Viewer(HTMLParser):
    attrs = None
    def handle_starttag(self, tag, attrs):
        if tag == 'd2l-sequence-viewer': self.attrs = dict(attrs)


def scoped_url(url, host):
    u = urlparse(url)
    if u.scheme != 'https' or u.hostname != host or u.username or u.password or u.port not in (None, 443):
        raise DownloadError('School media returned an untrusted service address.')
    require_public_url(url)
    return url


def small_response(url, headers=None):
    require_public_url(url)
    try:
        with build_opener(NoRedirect()).open(Request(url, headers=headers or {}), timeout=60) as response:
            body = response.read(2 * 1024 * 1024 + 1)
            if len(body) > 2 * 1024 * 1024: raise DownloadError('School media metadata exceeds its size limit.')
            return body
    except DownloadError: raise
    except Exception: raise DownloadError('School media metadata unavailable; sign in again if the session expired.') from None


def action(data, name, host):
    row = next((a for a in data.get('actions', []) if a.get('name') == name and a.get('method') == 'GET'), None)
    return scoped_url(row['href'], host) if row else None


async def download_media(adapter, course_id, material, path):
    tenant = material['mediaTenant']
    if not re.fullmatch(r'[a-f0-9-]{36}', tenant): raise DownloadError('Invalid school media tenant.')
    school = urlparse(adapter.base).hostname
    url = scoped_url(material['url'], school)
    viewer = Viewer()
    for _ in range(4):
        response = await adapter.context.request.get(url, timeout=60000, max_redirects=0)
        try:
            if response.status in (301, 302, 303, 307, 308):
                url = scoped_url(urljoin(url, response.headers.get('location', '')), school)
                continue
            if not response.ok: raise DownloadError('School media viewer is unavailable.', response.status == 401)
            if int(response.headers.get('content-length', '0')) > 2 * 1024 * 1024:
                raise DownloadError('School media viewer exceeds its size limit.')
            html = await response.text()
            if len(html) > 2 * 1024 * 1024: raise DownloadError('School media viewer exceeds its size limit.')
            viewer.feed(html)
            break
        finally: await response.dispose()
    if not viewer.attrs or not viewer.attrs.get('token'):
        raise DownloadError('School media requires a renewed school login.', True)
    attrs = viewer.attrs
    if attrs.get('allow-media-downloads') != 'true': raise DownloadError('The school disabled downloads for this media.')
    sequences = tenant + '.sequences.api.brightspace.com'
    service = tenant + '.content-service.api.brightspace.com'
    headers = {'Authorization': 'Bearer ' + attrs['token']}
    async def get(url, host):
        body = await asyncio.to_thread(small_response, scoped_url(url, host), headers)
        try: return json.loads(body)
        except (ValueError, TypeError): raise DownloadError('School media returned invalid metadata.') from None
    sequence = await get(attrs['href'], sequences)
    if sequence.get('properties', {}).get('canDownload') is not True:
        raise DownloadError('The school disabled downloads for this media.')
    link = next((link for entity in sequence.get('entities', []) for link in entity.get('links', [])
                 if 'content-service-resource' in link.get('class', [])), None)
    if not link: raise DownloadError('No supported school media download is available.')
    content = await get(link['href'], service)
    props = content.get('properties', {})
    if str(props.get('topicId')) != material['id'] or str(props.get('orgUnitId')) != str(course_id):
        raise DownloadError('School media does not match the selected course/topic.')
    endpoint = urlparse(props.get('contentServiceEndpoint', ''))
    if not re.fullmatch(r'api\.[a-z0-9-]+\.content-service\.brightspace\.com', endpoint.hostname or ''):
        raise DownloadError('School media returned an unsupported delivery service.')
    delivery_host = endpoint.hostname.replace('api.', 'content.', 1)
    media_action = action(content, 'get-media', service)
    if not media_action: raise DownloadError('No supported school media download is available.')
    media = await get(media_action, service)
    source = scoped_url(media.get('properties', {}).get('src', ''), delivery_host)
    if urlparse(source).path.split('.')[-1].lower() != 'mp4':
        raise DownloadError('The school provides a streaming-only format; no MP4 download is available.')
    await asyncio.to_thread(stream_to_file, source, path, adapter.config.get('max_media_file_mb', 1024) * 1024 * 1024)
    # A video without a school-provided transcript stays explicitly non-readable.
    tracks_action = action(content, 'get-tracks', service)
    if tracks_action:
        tracks = (await get(tracks_action, service)).get('properties', {}).get('tracks', [])
        if tracks:
            # Accept only player-provided caption URLs. No speech model is installed.
            track = next((t for t in tracks if isinstance(t, dict) and str(t.get('locale', '')).startswith('en')), tracks[0])
            if isinstance(track, dict) and track.get('src'):
                body = await asyncio.to_thread(small_response, scoped_url(track['src'], delivery_host))
                caption = path.with_suffix(path.suffix + '.vtt')
                temp = caption.with_suffix(caption.suffix + '.part')
                temp.write_bytes(body)
                temp.replace(caption)
    return {}
