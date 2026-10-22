import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { browserLink, openInEdge } from '../src/lib/browser-links.ts';

test('source links cannot launch a command, local file, private host or credentials', () => {
  for (const value of ['file:///private.txt', 'javascript:alert(1)', 'http://school.edu/', 'https://user:pass@school.edu/',
    'https://127.0.0.1/', 'https://school.local/', 'https://school.edu:8443/', '--profile=secret', 'https://school.edu/\n--flag']) {
    assert.throws(() => browserLink(value));
  }
  assert.equal(browserLink('https://rplms.polite.edu.sg/d2l/home/123').hostname, 'rplms.polite.edu.sg');
});
test('Edge is resolved on the current machine and receives the URL as a single shell-free argument', async () => {
  const calls = [];
  await openInEdge('https://rplms.polite.edu.sg/d2l/home/123?x=1&y=2', {
    platform: 'win32', roots: [process.cwd()], exists: () => true, publicHost: async () => {},
    launch: (exe, args, options) => { calls.push({ exe, args, options }); const child = new EventEmitter(); child.unref = () => {}; queueMicrotask(() => child.emit('spawn')); return child; },
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].exe, /Microsoft[\\/]Edge[\\/]Application[\\/]msedge.exe$/);
  assert.deepEqual(calls[0].args, ['https://rplms.polite.edu.sg/d2l/home/123?x=1&y=2']);
  assert.equal(calls[0].options.shell, false);
  await assert.rejects(openInEdge('https://school.edu/', { publicHost: async () => { throw Error('Private DNS'); } }), /Private DNS/);
});
