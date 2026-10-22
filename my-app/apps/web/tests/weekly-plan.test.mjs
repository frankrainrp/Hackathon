import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEK_MS, weeklyDue, claimWeekly } from '../src/lib/weekly-plan.ts';
import { isActionableTask } from '../src/lib/task-visibility.ts';

test('weekly checks require opt-in, skip a busy connector, catch up and survive restarts without duplicate runs', () => {
  const now = 1000000;
  assert.equal(weeklyDue({ enabled: false }, now), false);
  const enabled = { profileId: 'school', enabled: true };
  assert.equal(weeklyDue(enabled, now, true), false);
  assert.equal(weeklyDue(enabled, now), true);
  const stored = JSON.parse(JSON.stringify(claimWeekly(enabled, now)));
  assert.equal(weeklyDue(stored, now + 1), false);
  assert.equal(weeklyDue(stored, now + WEEK_MS - 1), false);
  assert.equal(weeklyDue(stored, now + WEEK_MS), true);
  assert.equal(weeklyDue(stored, now + 2 * WEEK_MS), true);
});

test('unknown school submissions and archived terms remain outside the active task queue', () => {
  assert.equal(isActionableTask({ lmsSubmissionState: 'unknown' }), false);
  assert.equal(isActionableTask({ lmsSubmissionState: 'missing', lmsArchived: true }), false);
  assert.equal(isActionableTask({ lmsSubmissionState: 'missing' }), true);
  assert.equal(isActionableTask({ taskName: 'My ordinary task' }), true);
});
