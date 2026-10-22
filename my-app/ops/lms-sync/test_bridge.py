"""Exercise the real push transport against a local HTTP bridge, including frozen SSL failure."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

from lms_sync import push


class BridgeTests(unittest.TestCase):
    def request_bridge(self, status=200, break_unused_tls=False):
        received = []

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
                received.append((self.path, self.headers.get('Authorization'), json.loads(body)))
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                if status == 302:
                    self.send_header('Location', '/unexpected-redirect')
                self.end_headers()
                self.wfile.write(b'{"ok":true,"notifications":0,"aiStatus":"unchanged"}')

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as folder, patch.dict('os.environ', {
                    'LMS_SYNC_TOKEN': 'synthetic-bridge-test-credential-only',
                    'HTTP_PROXY': 'http://127.0.0.1:1', 'http_proxy': 'http://127.0.0.1:1',
                    'NO_PROXY': '127.0.0.1', 'no_proxy': '127.0.0.1'}):
                config = {'butler_url': f'http://127.0.0.1:{server.server_port}', 'private_dir': folder}
                snapshot = {'status': 'ok', 'courses': []}
                if break_unused_tls:
                    with patch('ssl._create_default_https_context', side_effect=FileNotFoundError('synthetic frozen TLS failure')):
                        result = push(config, snapshot)
                elif status == 200:
                    result = push(config, snapshot)
                else:
                    with self.assertRaisesRegex(Exception, str(status)):
                        push(config, snapshot)
                    result = None
                self.assertFalse((Path(folder) / 'bridge.enc').exists())
            self.assertEqual(received, [('/api/lms/ingest', 'Bearer synthetic-bridge-test-credential-only', snapshot)])
            return result
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_local_http_push_works_without_constructing_an_unused_tls_context(self):
        self.assertTrue(self.request_bridge(break_unused_tls=True)['ok'])

    def test_bridge_redirect_is_not_followed_or_given_credentials(self):
        self.request_bridge(status=302)

    def test_bridge_rejection_is_an_error_without_a_credential_file(self):
        self.request_bridge(status=401)


if __name__ == '__main__':
    unittest.main()
