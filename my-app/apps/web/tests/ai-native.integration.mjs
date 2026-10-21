import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { defaults,saveAiSettings } from '../src/lib/ai-config.ts';
import { MODEL_CATALOG } from '../src/lib/ai-catalog.ts';
import { modelDirectory } from '../src/lib/ai-download.ts';
import { startEngine,stopEngine,engineStatus,ENGINE_PORT } from '../src/lib/ai-engine.ts';
import { completeWithProvider } from '../src/lib/ai-provider.ts';
const {createTinyGguf}=createRequire(import.meta.url)('./tiny-gguf.cjs');
const folder=mkdtempSync(join(tmpdir(),'butler-native-'));
process.env.BUTLER_AI_DATA_DIR=join(folder,'ai');
const model=MODEL_CATALOG[0],original={...model};
async function waitForReady(){for(let i=0;i<80;i++){const s=await engineStatus();if(s.state==='ready')return;if(s.state==='error')throw new Error(s.error);await delay(250);}throw new Error('Native engine did not become ready');}
try{
 const directory=modelDirectory(join(folder,'models')),file=join(directory,model.file);createTinyGguf(file);
 // Only this test process replaces checksum metadata, leaving the product source/catalog unchanged.
 model.bytes=readFileSync(file).length;model.sha256=createHash('sha256').update(readFileSync(file)).digest('hex');
 saveAiSettings({...defaults(),mode:'local',modelId:model.id,modelsDir:directory,context:2048});
 await startEngine();await waitForReady();assert.equal((await engineStatus()).state,'ready');
 assert.equal((await fetch(`http://127.0.0.1:${ENGINE_PORT}/v1/models`)).status,401);
 const response=await completeWithProvider({messages:[{role:'user',content:'Synthetic lifecycle check /no_think'}],max_tokens:8,temperature:0});
 assert.equal(typeof response.choices[0].message.content,'string');assert.ok(response.choices[0].message.content.length>0);
 await stopEngine();assert.equal((await engineStatus()).state,'stopped');
 await assert.rejects(fetch(`http://127.0.0.1:${ENGINE_PORT}/health`,{signal:AbortSignal.timeout(1000)}));
 // An abruptly terminated web process must disconnect the supervisor and close the engine port.
 const script=`import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {MODEL_CATALOG} from ${JSON.stringify(new URL('../src/lib/ai-catalog.ts',import.meta.url).href)};import {startEngine,engineStatus} from ${JSON.stringify(new URL('../src/lib/ai-engine.ts',import.meta.url).href)};const m=MODEL_CATALOG[0];m.bytes=${model.bytes};m.sha256=${JSON.stringify(model.sha256)};await startEngine();for(let i=0;i<80;i++){if((await engineStatus()).state==='ready'){console.log('NATIVE_READY');break;}await new Promise(ok=>setTimeout(ok,250));}setInterval(()=>{},1000);`;
 const child=spawn(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe'],env:process.env});
 let text='';child.stdout.on('data',d=>text+=d);let error='';child.stderr.on('data',d=>error+=d);
 for(let i=0;i<100&&!text.includes('NATIVE_READY');i++){if(child.exitCode!==null)throw new Error(error);await delay(100);}assert.match(text,/NATIVE_READY/);
 const exit=new Promise(ok=>child.once('exit',ok));child.kill('SIGKILL');await exit;
 let closed=false;for(let i=0;i<60;i++){try{await fetch(`http://127.0.0.1:${ENGINE_PORT}/health`,{signal:AbortSignal.timeout(300)});}catch{closed=true;break;}await delay(100);}assert.equal(closed,true,'engine must stop after parent crash');
 console.log(`Native integration passed: llama.cpp b11669 real start, authenticated health/model API, ${response.choices[0].message.content.length} generated fixture characters, stop, restart and parent-crash cleanup. Synthetic untrained GGUF (${model.bytes} bytes); no model download or study-quality claim.`);
}finally{await stopEngine();Object.assign(model,original);const target=resolve(folder);assert.equal(dirname(target),resolve(tmpdir()));assert.match(basename(target),/^butler-native-/);rmSync(target,{recursive:true,force:true});}
