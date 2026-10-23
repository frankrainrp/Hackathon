"""Bounded streaming downloads; credentials never follow a redirect."""
from http.cookiejar import Cookie, CookieJar
from http.client import HTTPException
from pathlib import Path
import shutil
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPRedirectHandler, HTTPCookieProcessor
from school_profile import require_public_url


class DownloadError(RuntimeError):
    def __init__(self, message, login_required=False):
        super().__init__(message)
        self.login_required = login_required


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def stream_to_file(url, path: Path, limit, headers=None, cookies=()):
    require_public_url(url)
    jar = CookieJar()
    for c in cookies:
        domain = c['domain']
        expires = c.get('expires', -1)
        jar.set_cookie(Cookie(0, c['name'], c['value'], None, False, domain, domain.startswith('.'),
                              domain.startswith('.'), c.get('path', '/'), True, c.get('secure', True),
                              int(expires) if expires > 0 else None, expires <= 0, None, None, {}, False))
    opener = build_opener(NoRedirect(), HTTPCookieProcessor(jar))
    temp = path.with_suffix(path.suffix + '.part')
    try:
        with opener.open(Request(url, headers=headers or {}), timeout=60) as response:
            length = int(response.headers.get('Content-Length', '0'))
            if length > limit:
                raise DownloadError('File exceeds its configured download size limit.')
            if shutil.disk_usage(path.parent).free < length + 16 * 1024 * 1024:
                raise DownloadError('Not enough free disk space to save the school file.')
            total, first = 0, True
            with temp.open('wb') as output:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk: break
                    total += len(chunk)
                    if total > limit:
                        raise DownloadError('File exceeds its configured download size limit.')
                    if first and 'text/html' in response.headers.get('Content-Type', ''):
                        head = chunk[:20000].lower()
                        if b'type="password"' in head or b"type='password'" in head:
                            raise DownloadError('School session expired. Sign in again.', True)
                    first = False
                    output.write(chunk)
            if not total or (length and total != length):
                raise DownloadError('Incomplete school file; the next sync will retry.')
        temp.replace(path)
    except HTTPError as error:
        raise DownloadError(f'School download HTTP {error.code}.', error.code in (401, 302, 303)) from None
    except (URLError, TimeoutError, OSError, ValueError, HTTPException):
        raise DownloadError('School file download interrupted; the next sync will retry.') from None
    finally:
        temp.unlink(missing_ok=True)
