import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLmsFeed, mergeLmsTasks, mergeLmsNotes } from '../src/lib/lms-sync.ts';
import { lmsSnapshotSchema } from '../src/lib/lms-schema.ts';

const now = Date.parse('2026-10-01T12:00:00Z');
const empty = () => ({ revision: 0, ddls: [], notes: [], sessions: [], messages: [] });
function snapshot(state = 'missing') {
  return {
    school: 'Republic Polytechnic', baseUrl: 'https://rplms.polite.edu.sg', timezone: 'Asia/Singapore',
    syncedAt: '2026-10-01T12:00:00Z', status: 'ok', warnings: [], enableAiBrief: false,
    courses: [{ id: '1001', moduleName: 'C245 Data Analytics with GenAI', lessons: [], announcements: [],
      assignments: [{ id: '1', title: 'Week 1 Submission', dueAt: '2026-10-01T15:59:00Z', submissionState: state,
        url: 'https://rplms.polite.edu.sg/d2l/lms/dropbox/user/folder_submit_files.d2l?db=1&ou=1001' }] }],
  };
}

test('hourly retries deduplicate, preserve manual work, then reflect a real submission', () => {
  const first = buildLmsFeed(lmsSnapshotSchema.parse(snapshot()), empty(), now);
  assert.equal(first.ddls[0].dueDate, '2026-10-01');
  assert.equal(first.ddls[0].dueTime, '23:59');
  assert.equal(first.messages.length, 2);
  const next = buildLmsFeed(snapshot(), first, now + 3600000);
  assert.equal(next.messages.length, first.messages.length);
  assert.equal(next.ddls.length, 1);
  const edited = { ...first.ddls[0], status: 'in_progress', notes: 'My draft' };
  assert.equal(mergeLmsTasks([edited], next.ddls)[0].status, 'in_progress');
  const submitted = buildLmsFeed(snapshot('submitted'), next, now + 7200000);
  const merged = mergeLmsTasks([edited], submitted.ddls);
  assert.equal(merged[0].completed, true);
  assert.equal(merged[0].notes, 'My draft');
});

test('unknown status never becomes a missing-work reminder; outages preserve facts', () => {
  const unknown = buildLmsFeed(snapshot('unknown'), empty(), now);
  assert.equal(unknown.messages.some(m => m.id.includes('-reminder-')), false);
  const confirmed = buildLmsFeed(snapshot('submitted'), unknown, now + 1000);
  const next = buildLmsFeed(snapshot('unknown'), confirmed, now + 2000);
  assert.equal(next.ddls[0].completed, true);
  const expired = { ...snapshot(), status: 'login_required', courses: [], warnings: ['Login expired'] };
  const outage = buildLmsFeed(expired, next, now + 3000);
  assert.equal(outage.ddls.length, 1);
  assert.equal(outage.messages.filter(m => m.id.includes('-login-')).length, 1);
  assert.equal(buildLmsFeed(expired, outage, now + 4000).messages.length, outage.messages.length);
});

test('foreign school links and invalid timezones are rejected', () => {
  const bad = snapshot();
  bad.courses[0].assignments[0].url = 'https://attacker.example/collect';
  assert.equal(lmsSnapshotSchema.safeParse(bad).success, false);
  assert.equal(lmsSnapshotSchema.safeParse({ ...snapshot(), timezone: 'invalid-zone' }).success, false);
});

test('new sync messages use the selected language while school names and source text remain intact', () => {
  const data=snapshot('unknown');data.school='学校原名';data.courses[0].moduleName='课程原名';data.courses[0].assignments[0].title='作业原文 $&';
  const en=buildLmsFeed(data,empty(),now,'en'),zh=buildLmsFeed(data,empty(),now,'zh');
  assert.equal(en.ddls[0].taskName,'作业原文 $&');assert.equal(zh.ddls[0].taskName,en.ddls[0].taskName);
  assert.match(en.messages[0].content,/needs verification|unverified/i);assert.match(zh.messages[0].content,/待核实/);
});

test('course detail survives an outage and school refresh preserves learner progress', () => {
  const source = snapshot('submitted');
  source.courses[0].lessons = [{ id: 'lesson-1', number: 1, title: 'Week 1', materials: [] }];
  const first = buildLmsFeed(source, empty(), now);
  assert.equal(first.courses[0].lessons[0].id, 'lesson-1');
  const edited = [{ ...first.notes[0], lmsCompletedLessons: ['lesson-1'] }];
  const refresh = buildLmsFeed(source, first, now + 1000);
  assert.deepEqual(mergeLmsNotes(edited, refresh.notes)[0].lmsCompletedLessons, ['lesson-1']);
  assert.deepEqual(mergeLmsNotes([{ ...edited[0], lmsCompletedLessons: [] }], refresh.notes)[0].lmsCompletedLessons, []);
  const outage = buildLmsFeed({ ...source, status: 'login_required', courses: [] }, refresh, now + 2000);
  assert.equal(outage.courses.length, 1);
  assert.equal(outage.courses[0].assignments[0].submissionState, 'submitted');
});
