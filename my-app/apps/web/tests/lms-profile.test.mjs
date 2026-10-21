import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { schoolEntry, previewProfile, emptyProfiles, confirmProfile, supportsSchoolConnection } from '../src/lib/lms-profile.ts';
import { saveProfile, readProfiles, requirePublicHost } from '../src/lib/lms-profile-store.ts';
import { buildLmsFeed, archiveLmsHistory, applyProfileMetadata } from '../src/lib/lms-sync.ts';

const profile = (semester = 'term1') => ({ id: 'school1', school: 'A school described by the user', entryUrl: 'https://SCHOOL.example.edu:443/d2l/home', platform: 'brightspace', semester: { id: semester, label: semester, confirmed: true, courses: [{ id: '101', name: 'Module A', selected: true, status: 'active' }] }, daily: { time: '09:00', timezone: 'Asia/Singapore' } });
const cleanup = folder => { const target = resolve(folder); assert.equal(dirname(target), resolve(tmpdir())); assert.match(basename(target), /^butler-(profile|db)-/); rmSync(target, { recursive: true, force: true }); };
test('school descriptions are preserved; URLs normalize without inferring a school', async () => {
  assert.equal(previewProfile(profile()).school, profile().school);
  assert.equal(supportsSchoolConnection('school.example.edu', 'brightspace'), false);
  assert.equal(supportsSchoolConnection('tplms.polite.edu.sg', 'brightspace'), true);
  assert.equal(supportsSchoolConnection('tplms.polite.edu.sg.evil.example', 'brightspace'), false);
  assert.equal(supportsSchoolConnection('tplms.polite.edu.sg', 'unsupported'), false);
  assert.equal(schoolEntry(profile().entryUrl).origin, 'https://school.example.edu');
  for (const url of ['http://school.edu', 'https://user:secret@school.edu', 'https://@school.edu', 'https://127.0.0.1', 'https://[::1]', 'https://school.local', 'https://school.edu:8443', 'https://school.edu/?token=x', 'https://school.edu/#secret', 'https://school.edu\\@127.0.0.1']) assert.throws(() => schoolEntry(url), url);
  await assert.rejects(requirePublicHost('school.edu', async () => [{ address: '10.0.0.1', family: 4 }]));
  await assert.rejects(requirePublicHost('school.edu', async () => [{ address: '::1', family: 6 }]));
  await assert.rejects(requirePublicHost('school.edu', async () => [{ address: '::ffff:127.0.0.1', family: 6 }]));
  await requirePublicHost('school.edu', async () => [{ address: '8.8.8.8', family: 4 }]);
});
test('confirmed profiles and course statuses survive store restart and semester transitions', () => {
  const folder = mkdtempSync(join(tmpdir(), 'butler-profile-'));
  try {
    const file = join(folder, 'config.local.json');
    const first = profile(); first.semester.courses[0].status = 'completed';
    saveProfile(first, file);
    saveProfile(profile('term2'), file);
    const restored = readProfiles(file);
    assert.equal(restored.profiles[0].semesters.length, 2);
    assert.equal(restored.profiles[0].semesters[0].courses[0].status, 'completed');
    assert.equal(restored.profiles[0].activeSemesterId, 'term2');
    assert.ok(readFileSync(file + '.bak', 'utf8').includes('completed'));
    assert.throws(() => confirmProfile(restored, { ...profile(), entryUrl: 'https://different.example.edu' }));
    assert.equal(confirmProfile(emptyProfiles(), { ...profile(), platform: 'unsupported' }).profiles[0].platform, 'unsupported');
  } finally { cleanup(folder); }
});
const source = (semesterId = 'term1', state = 'submitted') => ({ school: 'School', baseUrl: 'https://school.example.edu', timezone: 'Asia/Singapore', profileId: 'school1', semesterId, semesterLabel: semesterId, syncedAt: '2026-10-20T00:00:00Z', status: 'ok', warnings: [], enableAiBrief: false, courses: [{ id: '101', moduleName: 'Module A', courseStatus: 'active', lessons: [], announcements: [], assignments: [{ id: '1', title: 'Assignment', dueAt: null, submissionState: state, url: 'https://school.example.edu/assignment/1' }] }] });
test('login expiry, repeated delivery and new semesters retain facts and task state', () => {
  const empty = { revision: 0, ddls: [], notes: [], messages: [], sessions: [] };
  const first = buildLmsFeed(source(), empty);
  first.ddls[0].notes = 'my work';
  first.ddls[0].status = 'in_progress';
  const retry = buildLmsFeed(source(), JSON.parse(JSON.stringify(first)));
  assert.equal(retry.ddls.length, 1); assert.equal(retry.syncHistory.length, 1);
  assert.equal(retry.ddls[0].status, 'in_progress');
  const expired = buildLmsFeed({ ...source(), courses: [], status: 'login_required' }, retry);
  assert.equal(expired.courses[0].assignments[0].submissionState, 'submitted');
  assert.equal(expired.ddls[0].notes, 'my work');
  const second = buildLmsFeed(source('term2', 'missing'), expired);
  assert.equal(second.courses.length, 2); assert.equal(second.ddls.length, 2);
  assert.equal(second.courses.find(c => c.semesterId === 'term1').archived, true);
  assert.equal(second.ddls.find(d => d.lmsSemesterId === 'term1').notes, 'my work');
  assert.equal(archiveLmsHistory(second, 'school1', 'term1').courses.find(c => c.semesterId === 'term1').archived, false);
  const paused = profile('term2'); paused.semester.courses[0].status = 'paused';
  const metadata = applyProfileMetadata(second, confirmProfile(emptyProfiles(), paused));
  assert.equal(metadata.courses.find(c => c.semesterId === 'term2').courseStatus, 'paused');
});
test('SQLite feed and manual task state survive separate application processes', () => {
  const folder = mkdtempSync(join(tmpdir(), 'butler-db-'));
  try {
    const env = { ...process.env, BUTLER_DB_PATH: join(folder, 'state.sqlite') };
    const moduleUrl = new URL('../src/lib/server-db.ts', import.meta.url).href;
    const run = code => execFileSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `import {readLmsFeed,updateLmsFeed,readState,writeState} from ${JSON.stringify(moduleUrl)}; ${code}`], { env, encoding: 'utf8' });
    run(`updateLmsFeed(() => (${JSON.stringify(buildLmsFeed(source(), { revision: 0, ddls: [], notes: [], messages: [], sessions: [] }))})); writeState('ddls', [{id:'manual',status:'in_progress',notes:'retained'}]);`);
    const restored = JSON.parse(run("console.log(JSON.stringify({feed:readLmsFeed(),tasks:readState('ddls')}));"));
    assert.equal(restored.feed.courses[0].semesterId, 'term1');
    assert.equal(restored.tasks[0].notes, 'retained');
  } finally { cleanup(folder); }
});

test('profile and semester IDs cannot alias another retained record scope', () => {
  const empty = { revision: 0, ddls: [], notes: [], messages: [], sessions: [] };
  const first = buildLmsFeed({ ...source('x'), profileId: 'school1-term' }, empty);
  const second = buildLmsFeed(source('term-x'), first);
  assert.equal(second.ddls.length, 2);
  assert.equal(second.courses.length, 2);
  assert.notEqual(second.courses[0].noteId, second.courses[1].noteId);
});
