// Production HTTP contract test: synthetic records and isolated temporary storage only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
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
  const foreignState = await fetch(origin + '/api/state', { headers: { host: 'untrusted.example', origin: 'http://untrusted.example' } });
  assert.equal(foreignState.status, 403, 'Private state must reject a non-loopback Host');
  const crossSiteWrite = await fetch(origin + '/api/state', { method: 'PUT', headers: { origin: 'https://foreign.example', 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }, body: JSON.stringify({ key: 'notes', value: [] }) });
  assert.equal(crossSiteWrite.status, 403, 'Private state must reject cross-site writes');
  assert.equal((await request('/api/lms/settings')).settings.profiles.length, 0);
  assert.equal((await request('/api/lms/settings')).learningSync.enabled, false);
  await request('/api/lms/settings',{action:'agent-connect',entryUrl:'https://rplms.polite.edu.sg/d2l/home',confirm:false,downloadSelected:true,autoSync:true},400);
  await request('/api/lms/settings',{action:'agent-connect',entryUrl:'https://127.0.0.1/',confirm:true,downloadSelected:true,autoSync:true},400);
  await request('/api/lms/settings',{action:'learning-sync',enabled:true},403,{origin:'https://foreign.example'});
  assert.equal((await request('/api/lms/settings')).settings.profiles.length,0,'Rejected requests must not save a school or authorize a worker');
  const urlOnly = { entryUrl:'https://tplms.polite.edu.sg/d2l/home', confirm:false };
  const identified = (await request('/api/lms/settings',urlOnly)).preview;
  assert.equal(identified.school,'Temasek Polytechnic');assert.equal(identified.semester.confirmed,false);
  await request('/api/lms/settings',{...urlOnly,confirm:true});
  assert.equal('platform' in JSON.parse(readFileSync(join(folder,'config.local.json'),'utf8')).profileSettings.profiles[0],false);
  mkdirSync(join(folder,'.private','catalogs'),{recursive:true});
  writeFileSync(join(folder,'.private','catalogs',identified.id+'.json'),JSON.stringify([
    {id:'old',name:'Past module',semester:{id:'previous',name:'Previous school term'},startAt:'2025-01-01T00:00:00Z'},
    {id:'new',name:'Current module',semester:{id:'latest',name:'Latest school term'},startAt:'2026-01-01T00:00:00Z'}
  ]));
  const discovered=(await request('/api/lms/settings',{...urlOnly,confirm:true})).settings.profiles.find(p=>p.id===identified.id);
  assert.equal(discovered.semesters.find(s=>s.id===discovered.activeSemesterId).label,'Latest school term');
  assert.deepEqual(discovered.semesters.find(s=>s.id===discovered.activeSemesterId).courses.map(c=>c.id),['new']);
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
  mkdirSync(join(folder, 'courses'), { recursive: true });
  const pdfBytes = '%PDF-1.7\nSynthetic course document';
  writeFileSync(join(folder, 'courses', 'slides.pdf'), pdfBytes);
  writeFileSync(join(folder, 'private-fixture.txt'), 'Synthetic private data');
  snapshot.courses[0].lessons[0].materials = [
    { id: 'slides', title: 'Synthetic slides', url: 'https://tplms.polite.edu.sg/d2l/content/101/slides', filePath: join(folder, 'courses', 'slides.pdf') },
    { id: 'outside', title: 'Untrusted outside path', url: 'https://tplms.polite.edu.sg/d2l/content/101/outside', filePath: join(folder, 'private-fixture.txt') },
  ];
  await ingest(snapshot);
  const fileUrl = '/api/lms/material?profile=fixture-tp&semester=fixture-term1&course=101&material=slides';
  const pdf = await fetch(origin + fileUrl);
  assert.equal(pdf.status, 200); assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.match(pdf.headers.get('content-disposition'), /^inline/); assert.equal(await pdf.text(), pdfBytes);
  const seek = await fetch(origin + fileUrl, { headers: { range: 'bytes=0-4' } });
  assert.equal(seek.status, 206); assert.equal(await seek.text(), '%PDF-');
  const head = await fetch(origin + fileUrl, { method: 'HEAD' });
  assert.equal(head.headers.get('content-length'), String(Buffer.byteLength(pdfBytes))); assert.equal(await head.text(), '');
  const download = await fetch(origin + fileUrl + '&download=1');
  assert.match(download.headers.get('content-disposition'), /^attachment/); await download.arrayBuffer();
  assert.equal((await fetch(origin + fileUrl.replace('fixture-term1', 'other-term'))).status, 404);
  assert.equal((await fetch(origin + fileUrl.replace('material=slides', 'material=outside'))).status, 404);
  assert.equal((await fetch(origin + fileUrl, { headers: { origin: 'https://foreign.example', 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await request('/api/lms/feed')).ddls.length, 0, 'Already submitted work must not create a new task');
  const missingSnapshot = structuredClone(snapshot);
  missingSnapshot.courses[0].assignments[0].submissionState = 'missing';
  await ingest(missingSnapshot);
  await ingest(missingSnapshot);
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
  await ingest(snapshot); // A real later submission closes the retained missing-work task.
  await ingest({ ...snapshot, status: 'login_required', courses: [], syncedAt: '2026-10-21T00:00:00Z' });
  feed = await request('/api/lms/feed');
  assert.equal(feed.courses[0].assignments[0].submissionState, 'submitted');
  const completed = structuredClone(profile);
  completed.semester.courses[0].status = 'completed';
  await request('/api/lms/settings', { profile: completed, confirm: true });
  assert.equal((await request('/api/lms/feed')).courses[0].courseStatus, 'completed');
  const second = { ...profile, semester: { ...profile.semester, id: 'fixture-term2', label: 'Synthetic semester 2' } };
  await request('/api/lms/settings', { profile: second, confirm: true });
  await ingest({ ...missingSnapshot, semesterId: second.semester.id, semesterLabel: second.semester.label, syncedAt: '2026-10-22T00:00:00Z' });
  // Explicitly opt in with no active selection: persist the plan without touching
  // a real school, opening Edge or launching a connector in this fixture.
  const paused=structuredClone(second);paused.semester.courses[0].status='paused';
  await request('/api/lms/settings',{profile:paused,confirm:true});
  const learning=await request('/api/lms/settings',{action:'learning-sync',enabled:true});
  assert.equal(learning.learningSync.enabled,true);assert.equal(learning.job,null);
  const card={id:'synthetic-connection-card',sessionId:'synthetic-session',role:'assistant',content:'Connect school',schoolConnection:{entryUrl:profile.entryUrl},timestamp:new Date().toISOString()};
  await state('messages',[card]);
  await stop();
  await start();
  assert.equal((await request('/api/lms/settings')).learningSync.enabled,true,'Daily material refresh consent survives a server restart');
  assert.deepEqual((await request('/api/state')).messages[0].schoolConnection,card.schoolConnection);
  const disabled=await request('/api/lms/settings',{action:'learning-sync',enabled:false});
  assert.equal(disabled.learningSync.enabled,false);
  const backup = await request('/api/lms/settings?export=1');
  assert.equal(backup.settings.profiles.find(p => p.id === profile.id).semesters.length, 2);
  assert.equal(backup.feed.courses.length, 2);
  assert.equal(backup.feed.courses.find(c => c.semesterId === profile.semester.id).archived, true);
  assert.equal(backup.feed.ddls.length, 2);
  assert.equal(backup.state.ddls[0].notes, 'Synthetic personal work');
  assert.deepEqual(backup.state.notes[0].lmsCompletedLessons, ['lesson1']);
  assert.equal(JSON.stringify(backup).includes(token), false);
  assert.equal(existsSync(join(folder, '.private', 'sessions')), false);
  assert.deepEqual(readdirSync(join(folder, 'courses')), ['slides.pdf'], 'Metadata ingest must not create files beyond the explicit document fixture');
  assert.equal((await fetch(origin + '/?view=courses')).status, 200);
  console.log('HTTP integration passed: preview/confirm, local auth, URL policy, scoped PDF/HEAD/range delivery, idempotency, expiry, semester history, restart and credential-free export. No school login or scheduler activation.');
} finally {
  await stop();
  const target = resolve(folder);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.match(basename(target), /^butler-http-/);
  rmSync(target, { recursive: true, force: true });
}
