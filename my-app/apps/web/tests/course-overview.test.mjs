import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overviewCourses } from '../src/lib/course-overview.ts';

const settings = { version: 1, activeProfileId: 'rp', profiles: [{ id: 'rp', school: 'School from saved URL', activeSemesterId: '26S2',
  semesters: [{ id: '26S2', label: '26S2', confirmed: true, courses: [
    { id: '304', name: 'Real course A', selected: true, status: 'active' },
    { id: '305', name: 'Real course B', selected: false, status: 'paused' },
  ] }] }] };
const imported = { id: '304', profileId: 'rp', semesterId: '26S2', noteId: 'actual-note', moduleName: 'Old title',
  school: 'School', lessons: [{ id: 'lesson', materials: [{ id: 'file', text: 'Archived source text' }] }],
  assignments: [{ id: 'assignment', submissionState: 'submitted' }], announcements: [] };

test('overview lists all discovered courses without downloading or inventing progress', () => {
  const result = overviewCourses([imported], settings);
  assert.equal(result.length, 2);
  assert.equal(result[0].noteId, 'actual-note');
  assert.equal(result[0].moduleName, 'Real course A');
  assert.equal(result[0].lessons[0].materials[0].text, 'Archived source text');
  assert.equal(result[0].assignments[0].submissionState, 'submitted');
  assert.equal(result[1].catalogOnly, true);
  assert.equal(result[1].courseStatus, 'paused');
  assert.deepEqual(result[1].lessons, []);
  assert.deepEqual(result[1].assignments, []);
  assert.equal(settings.profiles[0].semesters[0].courses[1].selected, false);
  assert.equal(imported.moduleName, 'Old title');
});

test('matching course IDs from another school or term cannot supply current materials', () => {
  const history = [{ ...imported, semesterId: '25S2', archived: true }, { ...imported, profileId: 'tp', archived: true }];
  const result = overviewCourses(history, settings);
  assert.equal(result.length, 4);
  const current = result.filter(c => !c.archived);
  assert.equal(current.length, 2);
  assert.ok(current.every(c => c.catalogOnly && c.lessons.length === 0));
  assert.equal(result[0].archived, true);
});

test('unconfirmed or absent school data cannot create course rows', () => {
  const pending = structuredClone(settings);
  pending.profiles[0].semesters[0].confirmed = false;
  assert.deepEqual(overviewCourses([], pending), []);
  assert.deepEqual(overviewCourses([imported], { version: 1, activeProfileId: null, profiles: [] }), [imported]);
});
