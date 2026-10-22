import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalLmsRequest, hasLmsToken, workerLmsToken } from '../src/lib/lms-auth.ts';

test('server-owned worker credential authenticates imports without entering exports or files', () => {
  const token = workerLmsToken();
  assert.equal(token, workerLmsToken()); assert.ok(token.length >= 32);
  const req = value => new Request('http://127.0.0.1/api/lms/ingest', { headers: { authorization: 'Bearer ' + value } });
  assert.equal(hasLmsToken(req(token)), true);
  assert.equal(hasLmsToken(req('invalid')), false);
  assert.equal(hasLmsToken(req('é'.repeat(token.length))), false);
});

const request = (url, origin, site = 'same-site') => new Request(url, {
  headers: { ...(origin ? { origin } : {}), 'sec-fetch-site': site },
});

test('loopback aliases work only with the same protocol and port', () => {
  const url = 'https://localhost:3000/api/lms/feed';
  assert.equal(isLocalLmsRequest(request(url, 'https://127.0.0.1:3000')), true);
  assert.equal(isLocalLmsRequest(request(url, 'https://[::1]:3000')), true);
  assert.equal(isLocalLmsRequest(request(url, 'http://127.0.0.1:3000')), false);
  assert.equal(isLocalLmsRequest(request(url, 'https://localhost:4000')), false);
});

test('LMS routes reject remote, malformed and cross-site origins', () => {
  const url = 'http://127.0.0.1:3000/api/lms/feed';
  for (const origin of ['https://school.example', 'null', 'not a URL']) {
    assert.equal(isLocalLmsRequest(request(url, origin)), false);
  }
  assert.equal(isLocalLmsRequest(request(url, 'http://localhost:3000', 'cross-site')), false);
  assert.equal(isLocalLmsRequest(request('http://remote.example/api/lms/feed')), false);
  assert.equal(isLocalLmsRequest(request(url)), true);
});
