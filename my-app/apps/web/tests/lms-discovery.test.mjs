import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { identifySchool, discoverProfile, latestSemester } from '../src/lib/lms-discovery.ts';
import { emptyProfiles, confirmProfile } from '../src/lib/lms-profile.ts';
import { readProfiles, saveProfile } from '../src/lib/lms-profile-store.ts';
import { defaults, saveAiSettings } from '../src/lib/ai-config.ts';
import { enrichTermLabels } from '../src/lib/lms-discovery-ai.ts';

const now = Date.parse('2026-10-22T00:00:00Z');
const course = (id, term, start, extra={}) => ({ id, name:'Real module '+id, semester:{id:term,name:'Academic term '+term}, startAt:start, isActive:true, canAccess:true, ...extra });
const catalog = [course('9999','old','2026-04-01'), course('1','current','2026-10-19'), course('2','current','2026-10-19'), course('999999','future','2027-04-01')];
test('URL alone identifies a Singapore polytechnic; lookalikes and ambiguous shared portals fail closed', () => {
  assert.equal(identifySchool('https://tplms.polite.edu.sg/d2l/home').school,'Temasek Polytechnic');
  assert.equal(identifySchool('https://rplms.polite.edu.sg/d2l/home').school,'Republic Polytechnic');
  assert.equal(identifySchool('https://splms.polite.edu.sg/d2l/home').school,'Singapore Polytechnic');
  assert.equal(identifySchool('https://www.np.edu.sg/').school,'Ngee Ann Polytechnic');
  assert.equal(identifySchool('https://mynypportal.nyp.edu.sg/').school,'Nanyang Polytechnic');
  for(const url of ['https://tplms.polite.edu.sg.evil.example/','https://politemall.polite.edu.sg/','https://other-university.edu/','https://127.0.0.1/']) assert.throws(()=>identifySchool(url));
});
test('latest semester uses school dates and membership, never highest IDs, API order or future offerings', () => {
  const latest = latestSemester(catalog, now);
  assert.equal(latest.label,'Academic term current');
  assert.deepEqual(latest.courses.map(c=>c.id),['1','2']);
  assert.equal(latestSemester([course('1','a',null),course('2','b',null)],now),null);
  assert.equal(latestSemester([{id:'1',name:'No semester in school metadata'}],now),null);
  assert.equal(latestSemester(catalog.map(c=>({...c,canAccess:false})),now),null);
});
test('URL-only bootstrap stays pending until evidence arrives, then retains previous terms and statuses', () => {
  const pending = discoverProfile('https://tplms.polite.edu.sg/d2l/home',emptyProfiles(),[],now);
  assert.equal(pending.semester.confirmed,false);assert.deepEqual(pending.semester.courses,[]);
  let settings = confirmProfile(emptyProfiles(),pending);
  const first = discoverProfile(pending.entryUrl,settings,[catalog[0]],now);
  first.semester.courses[0].status='completed';settings=confirmProfile(settings,first);
  const current = discoverProfile(pending.entryUrl,settings,catalog,now);
  settings=confirmProfile(settings,current);
  assert.equal(settings.profiles[0].semesters.find(s=>s.id===first.semester.id).courses[0].status,'completed');
  assert.equal(settings.profiles[0].activeSemesterId,current.semester.id);
  current.semester.courses[0].status='paused';settings=confirmProfile(settings,current);
  assert.equal(discoverProfile(pending.entryUrl,settings,catalog,now).semester.courses[0].status,'paused');
  assert.equal(discoverProfile(pending.entryUrl,settings,[],now).semester.id,current.semester.id);
});
test('new automatic profiles store the URL without a redundant platform; restart derives it correctly', () => {
  const scratch=mkdtempSync(join(tmpdir(),'butler-discovery-'));
  try {
    const file=join(scratch,'config.local.json');
    const input=discoverProfile('https://tplms.polite.edu.sg/d2l/home',emptyProfiles(),catalog,now);
    saveProfile(input,file);
    assert.equal('platform' in JSON.parse(readFileSync(file,'utf8')).profileSettings.profiles[0],false);
    assert.equal(readProfiles(file).profiles[0].platform,'brightspace');
  } finally {
    const target=resolve(scratch);assert.equal(dirname(target),resolve(tmpdir()));assert.match(basename(target),/^butler-discovery-/);rmSync(target,{recursive:true,force:true});
  }
});

test('AI term assistance is local-only and rejects invented course IDs or labels', async () => {
  const scratch=mkdtempSync(join(tmpdir(),'butler-discovery-'));
  const original=process.env.BUTLER_AI_DATA_DIR;process.env.BUTLER_AI_DATA_DIR=join(scratch,'ai');
  try {
    const rows=[{id:'1',name:'M101 AY26S2 lesson',startAt:'2026-10-01'}];let calls=0;
    const complete=async()=>{calls++;return {choices:[{message:{content:JSON.stringify({terms:[{label:'AY26S2',courseIds:['1']}]})}}]};};
    saveAiSettings({...defaults(),mode:'deepseek'});assert.deepEqual(await enrichTermLabels(rows,complete),rows);assert.equal(calls,0);
    saveAiSettings({...defaults(),mode:'local'});assert.equal((await enrichTermLabels(rows,complete))[0].semester.name,'AY26S2');assert.equal(calls,1);
    const invented=async()=>({choices:[{message:{content:JSON.stringify({terms:[{label:'Invented semester',courseIds:['1']}]})}}]});
    assert.deepEqual(await enrichTermLabels(rows,invented),rows);
    const unknown=async()=>({choices:[{message:{content:JSON.stringify({terms:[{label:'AY26S2',courseIds:['not-enrolled']}]})}}]});
    assert.deepEqual(await enrichTermLabels(rows,unknown),rows);
  } finally {
    if(original===undefined)delete process.env.BUTLER_AI_DATA_DIR;else process.env.BUTLER_AI_DATA_DIR=original;
    const target=resolve(scratch);assert.equal(dirname(target),resolve(tmpdir()));assert.match(basename(target),/^butler-discovery-/);rmSync(target,{recursive:true,force:true});
  }
});
