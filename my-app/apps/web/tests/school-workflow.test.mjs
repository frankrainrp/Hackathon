import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSchoolWorkflow, schoolWorkerFailure } from '../src/lib/school-workflow.ts';

test('first-school setup imports learning metadata after real term discovery', async () => {
  const calls = []; let confirmed = false, imported = false;
  const result = await runSchoolWorkflow({ login: true, canContinue: () => true,
    run: async action => { calls.push(action); if (action === 'inspect') { assert.ok(confirmed); imported = true; } },
    discover: async () => { calls.push('confirm'); confirmed = true; return true; },
    hasSelectedCourses: () => confirmed,
  });
  assert.deepEqual(calls, ['login', 'catalog', 'confirm', 'inspect']); assert.ok(imported); assert.equal(result, 'complete');
});

test('missing term, empty selection and cancellation cannot trigger import', async () => {
  for (const scenario of ['no-term', 'no-selection', 'cancelled']) {
    const calls = []; let active = true;
    const result = runSchoolWorkflow({ login: false, canContinue: () => active,
      run: async action => { calls.push(action); if (scenario === 'cancelled') active = false; },
      discover: async () => scenario !== 'no-term', hasSelectedCourses: () => scenario !== 'no-selection',
    });
    if (scenario === 'cancelled') await assert.rejects(result);
    else assert.equal(await result, scenario === 'no-term' ? 'termUnavailable' : 'noSelectedCourses');
    assert.deepEqual(calls, ['catalog']);
  }
});

test('failed import is an error, never a completed school setup', async () => {
  await assert.rejects(runSchoolWorkflow({ login: false, canContinue: () => true,
    run: async action => { if (action === 'inspect') throw Error('synthetic delivery failure'); },
    discover: async () => true, hasSelectedCourses: () => true,
  }), /delivery failure/);
});

test('explicit file sync downloads and parses only after discovery and selection checks', async () => {
  const calls = [];
  const result = await runSchoolWorkflow({ login: false, download: true, canContinue: () => true,
    run: async action => { calls.push(action); },
    discover: async () => { calls.push('confirm'); return true; }, hasSelectedCourses: () => true,
  });
  assert.deepEqual(calls, ['catalog', 'confirm', 'sync']);
  assert.equal(result, 'downloaded');
  await assert.rejects(runSchoolWorkflow({ login: false, download: true, canContinue: () => true,
    run: async action => { if (action === 'sync') throw Error('file retrieval failed'); },
    discover: async () => true, hasSelectedCourses: () => true,
  }), /file retrieval failed/);
});

test('delivery errors do not tell the user to sign in again; expired sessions do', () => {
  assert.match(schoolWorkerFailure('sync',2), /importing.*failed/i);
  assert.match(schoolWorkerFailure('catalog',3), /session expired/i);
  assert.match(schoolWorkerFailure('sync',4), /some course items/i);
  assert.match(schoolWorkerFailure('sync',1), /operation failed/i);
});
