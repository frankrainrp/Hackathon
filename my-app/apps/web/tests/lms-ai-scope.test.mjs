import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lmsScopePrefix, selectLmsBriefFacts } from '../src/lib/lms-sync.ts';
test('optional AI brief receives only the incoming profile and semester, with its own brief watermark',()=>{
 const snapshot={baseUrl:'https://school.example',profileId:'p1',semesterId:'s1'};
 const sessionId=lmsScopePrefix(snapshot)+'session',other=lmsScopePrefix({...snapshot,semesterId:'s2'})+'session';
 const feed={messages:[{id:'current',sessionId,timestamp:'2026-10-21T01:00:00Z',content:'Current fact'},{id:'other-brief',sessionId:other,timestamp:'2026-10-22T01:00:00Z',content:'Other semester fact'}],ddls:[{id:'a',lmsProfileId:'p1',lmsSemesterId:'s1',taskName:'Current task'},{id:'b',lmsProfileId:'p1',lmsSemesterId:'s2',taskName:'Historical task'},{id:'c',lmsProfileId:'p2',lmsSemesterId:'s1',taskName:'Other profile task'}]};
 const scoped=selectLmsBriefFacts(feed,snapshot);
 assert.deepEqual(scoped.pendingFacts.map(m=>m.id),['current']);assert.deepEqual(scoped.tasks.map(d=>d.id),['a']);
 feed.messages.push({id:'current-brief',sessionId,timestamp:'2026-10-21T02:00:00Z',content:'Current brief'});assert.equal(selectLmsBriefFacts(feed,snapshot).pendingFacts.length,0);
});
