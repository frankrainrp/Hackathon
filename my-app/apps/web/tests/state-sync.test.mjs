import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStateSync } from '../src/lib/state-sync.ts';

const empty = () => ({ ddls: [], notes: [], sessions: [], messages: [] });
function fixture() {
  const local = empty(), pending = new Map(), sent = [], statuses = [];
  let online = true, server = empty();
  const store = {
    async read() { return structuredClone(local); },
    async pending() { return structuredClone([...pending.values()]); },
    async stage(row) { local[row.key] = structuredClone(row.value); pending.set(row.key, structuredClone(row)); },
    async acknowledge(row) { if (pending.get(row.key)?.revision === row.revision) pending.delete(row.key); },
  };
  const remote = {
    async read() { if (!online) throw Error('synthetic offline'); return structuredClone(server); },
    async save(key, value) { if (!online) throw Error('synthetic offline'); sent.push({ key, value: structuredClone(value) }); server[key] = structuredClone(value); },
  };
  const create = () => { const sync = createStateSync(store, remote, { onStatus: s => statuses.push(s) }); sync.stop(); return sync; };
  return { local, pending, sent, statuses, store, remote, create, offline() { online = false; }, online() { online = true; }, server: () => server };
}

test('offline edits enter the cache and durable outbox before HTTP is retried', async () => {
  const f = fixture(), sync = f.create(); f.offline();
  await sync.save('notes', [{ id: 'n', content: 'last edit' }]);
  await sync.flush();
  assert.equal(f.local.notes[0].content, 'last edit'); assert.equal(f.pending.size, 1); assert.equal(f.statuses.at(-1), 'offline');
  const reopened = f.create(); f.online();
  assert.equal((await reopened.load()).notes[0].content, 'last edit', 'older remote data must not replace a pending local draft');
  await reopened.flush(); assert.deepEqual(f.server().notes, f.local.notes); assert.equal(f.pending.size, 0);
});

test('rapid edits coalesce to the latest snapshot instead of one request per keystroke', async () => {
  const f = fixture(), sync = f.create();
  await Promise.all(Array.from({ length: 40 }, (_, n) => sync.save('notes', [{ id: 'n', content: String(n) }])));
  await sync.flush(); assert.equal(f.sent.length, 1); assert.equal(f.server().notes[0].content, '39');
});

test('a slow old request cannot acknowledge or overwrite a newer local edit', async () => {
  const f = fixture(); let release, entered;
  const started = new Promise(r => entered = r), gate = new Promise(r => release = r);
  const original = f.remote.save; let first = true;
  f.remote.save = async (key, rows) => { if (first) { first = false; entered(); await gate; } await original(key, rows); };
  const sync = f.create(); await sync.save('notes', [{ id: 'n', content: 'old' }]);
  const flushing = sync.flush(); await started;
  await sync.save('notes', [{ id: 'n', content: 'new' }]); release(); await flushing;
  assert.equal(f.pending.get('notes').value[0].content, 'new');
  await sync.flush(); assert.equal(f.server().notes[0].content, 'new'); assert.equal(f.pending.size, 0);
});

test('server records remain available when IndexedDB is unavailable', async () => {
  const f = fixture(); f.store.stage = async () => { throw Error('synthetic storage blocked'); };
  const sync = f.create(); await sync.save('ddls', [{ id: 'task' }]);
  assert.equal(f.server().ddls[0].id, 'task');
});

test('a complete load failure propagates instead of returning empty records', async () => {
  const f = fixture(); f.offline(); f.store.read = async () => { throw Error('synthetic cache unavailable'); };
  await assert.rejects(f.create().load(), /cache unavailable/);
});

test('reconnect cannot clear the outbox before a slow hydration overlays local edits', async () => {
  const f = fixture(), sync = f.create();
  await sync.save('notes', [{ id: 'n', content: 'offline edit' }]);
  let release; const gate = new Promise(r => release = r);
  f.remote.read = async () => { const stale = empty(); await gate; return stale; };
  const loading = sync.load(), flushing = sync.flush();
  await Promise.resolve(); assert.equal(f.pending.size, 1);
  release(); assert.equal((await loading).notes[0].content, 'offline edit');
  await flushing; assert.equal(f.pending.size, 0); assert.equal(f.server().notes[0].content, 'offline edit');
});
