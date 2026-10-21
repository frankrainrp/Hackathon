import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { defaults, readAiSettings, saveAiSettings, hasDeepseekKey, saveDeepseekKey, readDeepseekKey, loopbackURL, isLocalAiRequest } from '../src/lib/ai-config.ts';
import { MODEL_CATALOG, recommendations } from '../src/lib/ai-catalog.ts';
import { resolveProviderCandidates, completeWithProvider, providerError } from '../src/lib/ai-provider.ts';
import { transferModel, sha256File, modelDirectory, modelFile, downloadStatuses } from '../src/lib/ai-download.ts';
import { engineProbe, engineStatus, startEngine, stopEngine } from '../src/lib/ai-engine.ts';

const folder = mkdtempSync(join(tmpdir(), 'butler-ai-'));
process.env.BUTLER_AI_DATA_DIR = join(folder, 'ai');
after(() => { const target=resolve(folder); assert.equal(dirname(target),resolve(tmpdir())); assert.match(basename(target),/^butler-ai-/); rmSync(target,{recursive:true,force:true}); });
test('settings survive a new process; unrelated state and secrets cannot enter JSON', () => {
  const initial = defaults();
  saveAiSettings({ ...initial, mode:'local', localKind:'external', externalModel:'synthetic-study', onboarding:'paused', step:2, key:'synthetic-secret-should-not-export', profileSettings:{fake:true} });
  const settings = readAiSettings();
  assert.equal(settings.mode, 'local'); assert.equal(settings.step, 2);
  const disk = readFileSync(join(folder,'ai','settings.json'),'utf8');
  assert.equal(disk.includes('synthetic-secret'),false); assert.equal(disk.includes('profileSettings'),false);
  const output = execFileSync(process.execPath,['--input-type=module','-e',`import {readAiSettings} from ${JSON.stringify(new URL('../src/lib/ai-config.ts',import.meta.url).href)}; console.log(JSON.stringify(readAiSettings()))`],{encoding:'utf8',env:process.env});
  assert.deepEqual(JSON.parse(output),settings);
  assert.throws(()=>saveAiSettings({...settings,externalURL:'https://api.deepseek.com/v1'}));
});
test('loopback bridge rejects rebinding, foreign origin, non-local targets and missing mutation origin',()=>{
  const r=(host,origin,site)=>new Request('http://localhost:3000/api/ai/setup',{headers:{host,...(origin?{origin}:{}),...(site?{'sec-fetch-site':site}:{})}});
  assert.equal(isLocalAiRequest(r('127.0.0.1:3000','http://127.0.0.1:3000'),true),true);
  for(const req of [r('attacker.example:3000','http://attacker.example:3000'),r('127.0.0.1:3000','https://foreign.example'),r('127.0.0.1:3000','http://127.0.0.1:9999'),r('127.0.0.1:3000',null),r('127.0.0.1:3000','http://127.0.0.1:3000','cross-site')]) assert.equal(isLocalAiRequest(req,true),false);
  for(const url of ['http://127.0.0.1.evil/v1','https://api.deepseek.com/v1','http://192.168.1.1/v1','http://user:pw@localhost/v1','http://localhost/v1?key=x']) assert.throws(()=>loopbackURL(url));
  assert.equal(loopbackURL('http://[::1]:11434/v1/'),'http://[::1]:11434/v1');
});
test('local resolution ignores cloud environment and preserves explicitly selected legacy ordering',()=>{
  process.env.DEEPSEEK_BASE_URL='https://should-never-be-used.invalid/v1';
  process.env.DEEPSEEK_API_KEY='synthetic-cloud-key-never-forward';
  saveAiSettings({...defaults(),mode:'local',localKind:'external',externalModel:'synthetic-local'});
  let endpoints=resolveProviderCandidates(); assert.equal(endpoints.length,1); assert.equal(endpoints[0].name,'local'); assert.equal(endpoints[0].apiKey,'local-no-key'); assert.equal(endpoints[0].baseURL,'http://127.0.0.1:11434/v1');
  process.env.OLLAMA_SERVER_BASE_URL='http://127.0.0.1:11434/v1'; process.env.OLLAMA_SERVER_MODEL='primary-fixture'; process.env.OLLAMA_WINDOWS_BASE_URL='http://127.0.0.1:11435/v1'; process.env.OLLAMA_WINDOWS_MODEL='alternate-fixture';
  saveAiSettings({...defaults(),mode:'legacy'});
  assert.deepEqual(resolveProviderCandidates().map(e=>e.model),['primary-fixture','alternate-fixture']);
  assert.deepEqual(resolveProviderCandidates('deepseek-v4-thinking').map(e=>e.model),['alternate-fixture','primary-fixture']);
  saveAiSettings({...defaults(),mode:'none'}); assert.throws(()=>resolveProviderCandidates(),/optional/);
  delete process.env.OLLAMA_SERVER_BASE_URL; delete process.env.OLLAMA_SERVER_MODEL; delete process.env.OLLAMA_WINDOWS_BASE_URL; delete process.env.OLLAMA_WINDOWS_MODEL;
});
test('Windows DPAPI roundtrip persists only ciphertext, supports replacement and rejects invalid keys',{skip:process.platform!=='win32'},()=>{
  const key='sk-synthetic-fixture-not-a-real-key-12345';
  saveDeepseekKey(key); assert.equal(hasDeepseekKey(),true); assert.equal(readDeepseekKey(),key);
  const ciphertext=readFileSync(join(folder,'ai','deepseek.dpapi'),'utf8'); assert.equal(ciphertext.includes(key),false); assert.equal(ciphertext.includes(Buffer.from(key).toString('base64')),false);
  const replacement='sk-synthetic-replacement-not-real-98765'; saveDeepseekKey(replacement); assert.equal(readDeepseekKey(),replacement);
  assert.throws(()=>saveDeepseekKey('too short')); assert.throws(()=>saveDeepseekKey('sk-invalid white space'));
  saveAiSettings({...defaults(),mode:'deepseek',deepseekModel:'deepseek-v4-pro'});
  const e=resolveProviderCandidates()[0]; assert.equal(e.baseURL,'https://api.deepseek.com'); assert.equal(e.model,'deepseek-v4-pro');
});
test('recommendations account for free RAM, disk, context and CPU-only backend',()=>{
  const hardware={os:'win32',arch:'x64',ramGiB:16,freeRamGiB:10,diskGiB:20,gpus:[{name:'Synthetic GPU',vramGiB:24}],bundledCpu:true,notes:[]};
  assert.equal(recommendations(hardware).quality,'qwen3-8-q4'); assert.equal(recommendations(hardware).balanced,'qwen3-4-q4');
  assert.equal(recommendations({...hardware,freeRamGiB:1}).quality,null);
  assert.equal(recommendations({...hardware,diskGiB:0.1}).balanced,null);
  assert.notEqual(recommendations(hardware,8192).quality,'qwen3-8-q4');
  assert.match(recommendations(hardware).backend,/CPU/);
  assert.equal(recommendations({...hardware,diskGiB:null}).unknown,true);
  assert.equal(recommendations({...hardware,bundledCpu:false}).quality,null);
  for(const m of MODEL_CATALOG) { assert.match(m.sha256,/^[0-9a-f]{64}$/); assert.match(m.revision,/^[0-9a-f]{40}$/); assert.equal(m.license,'Apache-2.0'); }
});
test('controlled transfer cancels, resumes with Range, survives journal reload and rejects corrupted bytes',async()=>{
  const bytes=Buffer.alloc(1024*128,42), hash=createHash('sha256').update(bytes).digest('hex');
  const model={...MODEL_CATALOG[0],id:'qwen3-06-q8',file:'fixture.gguf',bytes:bytes.length,sha256:hash};
  const directory=modelDirectory(join(folder,'models')); let ranges=[]; let corrupt=false;
  const server=createServer((req,res)=>{
    const start=Number(req.headers.range?.match(/bytes=(\d+)-/)?.[1]||0); ranges.push(start);
    res.writeHead(start?206:200,{'content-length':bytes.length-start,...(start?{'content-range':`bytes ${start}-${bytes.length-1}/${bytes.length}`}:{})});
    let n=start; const timer=setInterval(()=>{if(n>=bytes.length){clearInterval(timer);res.end();return;} const data=Buffer.from(bytes.subarray(n,n+4096));if(corrupt)data.fill(12);res.write(data);n+=data.length;},4);
    res.on('close',()=>clearInterval(timer));
  });
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok)); const url=`http://127.0.0.1:${server.address().port}/synthetic`;
  const status={id:model.id,directory,state:'downloading',received:0,total:bytes.length,updated:Date.now()};
  try {
    const controller=new AbortController(); let stopped=false;
    await assert.rejects(transferModel(model,directory,controller,status,url,s=>{if(s.received>0&&!stopped){stopped=true;controller.abort();}}));
    const partial=join(directory,'fixture.gguf.part'); assert.ok(statSync(partial).size>0); assert.ok(statSync(partial).size<bytes.length);
    const prior=statSync(partial).size;
    await assert.rejects(transferModel({...model,file:'no-space.gguf',bytes:2**50},directory,new AbortController(),{...status},url,()=>{}),/Not enough disk/);
    await transferModel(model,directory,new AbortController(),status,url,()=>{});
    assert.equal(status.state,'ready'); assert.equal(await sha256File(join(directory,'fixture.gguf')),hash); assert.equal(ranges.at(-1),prior); assert.equal(existsSync(partial),false);
    corrupt=true; const bad={...model,file:'corrupt.gguf'};
    await assert.rejects(transferModel(bad,directory,new AbortController(),{...status},url,()=>{}),/Checksum/); assert.equal(existsSync(join(directory,'corrupt.gguf')),false); assert.equal(existsSync(join(directory,'corrupt.gguf.part')),false);
    const journal=join(folder,'ai','downloads'); modelDirectory(journal);
    writeFileSync(join(journal,MODEL_CATALOG[0].id+'.json'),JSON.stringify({...status,directory,state:'downloading'}));
    assert.equal(downloadStatuses()[0].state,'paused');
    assert.throws(()=>modelFile(directory,'../private.gguf')); assert.throws(()=>modelDirectory('relative'));
  } finally { server.closeAllConnections(); await new Promise(ok=>server.close(ok)); }
});
test('native engine probe is real; missing model fails without spawning or contacting cloud',async()=>{
  const probe=engineProbe(); if(process.platform==='win32'&&process.arch==='x64') { assert.equal(probe.available,true,probe.error); assert.match(probe.version,/11669/); }
  saveAiSettings({...defaults(),mode:'local',modelId:MODEL_CATALOG[0].id,modelsDir:join(folder,'models')});
  await assert.rejects(startEngine(),/incomplete/); assert.equal((await engineStatus()).state,'error');
  await stopEngine(); assert.equal((await engineStatus()).state,'stopped');
});
test('completion uses selected local mock without a cloud key; provider failures are redacted',async()=>{
  const server=createServer(async(req,res)=>{
    assert.notEqual(req.headers.authorization,'Bearer synthetic-cloud-key-never-forward');
    let raw='';for await(const data of req)raw+=data;
    const body=JSON.parse(raw); assert.equal(body.model,'synthetic-local');
    res.setHeader('content-type','application/json');res.end(JSON.stringify({id:'fixture',object:'chat.completion',created:0,model:body.model,choices:[{index:0,message:{role:'assistant',content:'Synthetic study plan.'},finish_reason:'stop'}]}));
  });
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  try {
    saveAiSettings({...defaults(),mode:'local',localKind:'external',externalURL:`http://127.0.0.1:${server.address().port}/v1`,externalModel:'synthetic-local'});
    const result=await completeWithProvider({messages:[{role:'user',content:'Synthetic question'}],max_tokens:20}); assert.equal(result.choices[0].message.content,'Synthetic study plan.');
    for(const status of [401,402,429,503]) assert.equal(providerError({status,message:'sk-SECRET-fixture'}).includes('SECRET'),false);
  } finally {server.closeAllConnections();await new Promise(ok=>server.close(ok));}
});
