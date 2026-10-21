// Production HTTP contract test: synthetic records and isolated temporary storage only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const folder = mkdtempSync(join(tmpdir(), 'butler-http-'));
const web = fileURLToPath(new URL('../', import.meta.url));
const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
const token = randomBytes(32).toString('hex');
const socket = createServer();
await new Promise((ok, fail) => { socket.once('error', fail); socket.listen(0, '127.0.0.1', ok); });
const port = socket.address().port;
await new Promise(ok => socket.close(ok));
const origin = `http://127.0.0.1:${port}`;
let child, exited;
let logs = '';
async function stop() {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([exited, delay(5000)]);
  if (child.exitCode === null) { child.kill('SIGKILL'); await exited; }
}
async function start() {
  logs = '';
  child = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: web, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BUTLER_DB_PATH: join(folder, 'butler.sqlite'), LMS_CONFIG_PATH: join(folder, 'config.local.json'), LMS_SYNC_TOKEN: token, NEXT_TELEMETRY_DISABLED: '1' },
  });
  exited = new Promise(ok => child.once('exit', ok));
  child.stdout.on('data', data => { logs = (logs + data).slice(-5000); });
  child.stderr.on('data', data => { logs = (logs + data).slice(-5000); });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`Fixture server exited: ${logs}`);
    try { if ((await fetch(origin + '/api/lms/settings', { signal: AbortSignal.timeout(500) })).ok) return; } catch {}
    await delay(250);
  }
  throw new Error(`Fixture server did not become ready: ${logs}`);
}
async function request(path, body, expected = 200, extra = {}) {
  const response = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { origin, 'content-type': 'application/json', ...extra },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const value = await response.json();
  assert.equal(response.status, expected, JSON.stringify(value));
  return value;
}
const profile = { id: 'fixture-tp', school: 'Synthetic school - no real account', entryUrl: 'https://tplms.polite.edu.sg/d2l/home', platform: 'brightspace', semester: { id: 'fixture-term1', label: 'Synthetic semester 1', confirmed: true, courses: [{ id: '101', name: 'Synthetic module', selected: true, status: 'active' }] }, daily: { time: '09:00', timezone: 'Asia/Singapore' } };
const snapshot = { school: profile.school, baseUrl: 'https://tplms.polite.edu.sg', timezone: 'Asia/Singapore', profileId: profile.id, semesterId: profile.semester.id, semesterLabel: profile.semester.label, syncedAt: '2026-10-20T00:00:00Z', status: 'ok', warnings: [], enableAiBrief: false, courses: [{ id: '101', moduleName: 'Synthetic module', lessons: [{ id: 'lesson1', number: 1, title: 'Synthetic lesson', materials: [] }], announcements: [], assignments: [{ id: '1', title: 'Synthetic assignment', dueAt: null, submissionState: 'submitted', url: 'https://tplms.polite.edu.sg/d2l/assignment/1' }] }] };
const ingest = value => request('/api/lms/ingest', value, 200, { authorization: `Bearer ${token}` });
try {
  await start();
  assert.equal((await request('/api/lms/settings')).settings.profiles.length, 0);
  await request('/api/lms/settings', { profile, confirm: true }, 403, { origin: 'https://foreign.example' });
  for (const entryUrl of ['http://example.com', 'https://127.0.0.1/', 'https://secret@example.com/', 'https://example.com/?token=synthetic']) {
    await request('/api/lms/settings', { profile: { ...profile, entryUrl }, confirm: false }, 400);
  }
  const custom = { ...profile, id: 'fixture-custom', school: 'Custom description is not inferred', entryUrl: 'https://EXAMPLE.com/', platform: 'unsupported' };
  assert.equal((await request('/api/lms/settings', { profile: custom, confirm: false })).preview.domain, 'example.com');
  assert.equal((await request('/api/lms/settings', { profile: custom, confirm: true })).activation, 'not-managed');
  await request('/api/lms/settings', { profile, confirm: false });
  await request('/api/lms/settings', { profile, confirm: true });
  await request('/api/lms/ingest', snapshot, 401);
  // A mismatched link is rejected by snapshot schema before profile authorization.
  await request('/api/lms/ingest', { ...snapshot, baseUrl: 'https://rplms.polite.edu.sg' }, 400, { authorization: `Bearer ${token}` });
  const foreignSnapshot = structuredClone(snapshot);
  foreignSnapshot.baseUrl = 'https://rplms.polite.edu.sg';
  foreignSnapshot.courses[0].assignments[0].url = 'https://rplms.polite.edu.sg/d2l/assignment/1';
  await request('/api/lms/ingest', foreignSnapshot, 403, { authorization: `Bearer ${token}` });
  await ingest(snapshot);
  await ingest(snapshot);
  let feed = await request('/api/lms/feed');
  assert.equal(feed.ddls.length, 1); assert.equal(feed.syncHistory.length, 1);
  assert.equal(feed.ddls[0].dueDate, '');
  const note = { ...feed.notes[0], lmsCompletedLessons: ['lesson1'] };
  const state = async (key, value) => {
    const response = await fetch(origin + '/api/state', { method: 'PUT', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ key, value }), signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
  };
  await state('notes', [note]);
  await state('ddls', [{ ...feed.ddls[0], notes: 'Synthetic personal work', status: 'in_progress' }]);
  await ingest({ ...snapshot, status: 'login_required', courses: [], syncedAt: '2026-10-21T00:00:00Z' });
  feed = await request('/api/lms/feed');
  assert.equal(feed.courses[0].assignments[0].submissionState, 'submitted');
  const completed = structuredClone(profile);
  completed.semester.courses[0].status = 'completed';
  await request('/api/lms/settings', { profile: completed, confirm: true });
  assert.equal((await request('/api/lms/feed')).courses[0].courseStatus, 'completed');
  const second = { ...profile, semester: { ...profile.semester, id: 'fixture-term2', label: 'Synthetic semester 2' } };
  await request('/api/lms/settings', { profile: second, confirm: true });
  await ingest({ ...snapshot, semesterId: second.semester.id, semesterLabel: second.semester.label, syncedAt: '2026-10-22T00:00:00Z' });
  await stop();
  await start();
  const backup = await request('/api/lms/settings?export=1');
  assert.equal(backup.settings.profiles.find(p => p.id === profile.id).semesters.length, 2);
  assert.equal(backup.feed.courses.length, 2);
  assert.equal(backup.feed.courses.find(c => c.semesterId === profile.semester.id).archived, true);
  assert.equal(backup.feed.ddls.length, 2);
  assert.equal(backup.state.ddls[0].notes, 'Synthetic personal work');
  assert.deepEqual(backup.state.notes[0].lmsCompletedLessons, ['lesson1']);
  assert.equal(JSON.stringify(backup).includes(token), false);
  assert.equal(existsSync(join(folder, '.private', 'sessions')), false);
  assert.equal(existsSync(join(folder, 'courses')), false);
  assert.equal((await fetch(origin + '/?view=courses')).status, 200);
  console.log('HTTP integration passed: preview/confirm, local auth, URL policy, idempotency, expiry, semester history, restart and credential-free export. No school login or scheduler activation.');
} finally {
  await stop();
  const target = resolve(folder);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.match(basename(target), /^butler-http-/);
  rmSync(target, { recursive: true, force: true });
}
