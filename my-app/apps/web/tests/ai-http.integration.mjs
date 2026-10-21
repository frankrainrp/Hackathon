import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as netServer } from 'node:net';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const web=fileURLToPath(new URL('../',import.meta.url)), folder=mkdtempSync(join(tmpdir(),'butler-ai-http-'));
const next=createRequire(import.meta.url).resolve('next/dist/bin/next');
const socket=netServer();await new Promise(ok=>socket.listen(0,'127.0.0.1',ok));const port=socket.address().port;await new Promise(ok=>socket.close(ok));
const origin=`http://127.0.0.1:${port}`; let child,exited,logs='',requests=[],failure=0;
const payload={version:1,title:'Synthetic panel',emoji:'S',description:'Synthetic fixture',sources:[{id:'s',kind:'static',data:[{label:'A',value:1}]}],source:{id:'s',kind:'static',data:[{label:'A',value:1}]},blocks:[{id:'b',type:'markdown',title:'Synthetic',markdown:'Synthetic text'}],squads:[{title:'Synthetic squad',question:'Synthetic question'}],summary:'Synthetic finding',rows:[{label:'A',value:1}],columns:[{key:'label',label:'Label'},{key:'value',label:'Value'}]};
const mock=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  requests.push({path:req.url,authorization:req.headers.authorization,body:raw?JSON.parse(raw):null});
  if(failure){res.writeHead(failure,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'sk-synthetic-provider-error-must-be-redacted',type:'fixture'}}));return;}
  if(req.url.endsWith('/models')){res.setHeader('content-type','application/json');res.end(JSON.stringify({object:'list',data:['synthetic-local','deepseek-flash','deepseek-v4-pro'].map(id=>({id,object:'model',created:0,owned_by:'fixture'}))}));return;}
  const body=JSON.parse(raw);
  if(body.stream){res.setHeader('content-type','text/event-stream');res.end(`data: ${JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:0,model:body.model,choices:[{index:0,delta:{role:'assistant',content:'Synthetic answer.'},finish_reason:null}]})}\n\ndata: [DONE]\n\n`);return;}
  const message=body.tools?.[0]?.function?.name==='extract_ddls'?{role:'assistant',content:null,tool_calls:[{id:'synthetic-tool',type:'function',function:{name:'extract_ddls',arguments:JSON.stringify({items:[{taskName:'Synthetic assignment',dueDate:'',dueTime:'23:59',weight:null,description:'Synthetic',isGroupWork:false}]})}}]}:{role:'assistant',content:body.response_format?JSON.stringify(payload):'A study plan divides learning into small sessions.'};
  res.setHeader('content-type','application/json');res.end(JSON.stringify({id:'fixture',object:'chat.completion',created:0,model:body.model,choices:[{index:0,message,finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}}));
});
await new Promise(ok=>mock.listen(0,'127.0.0.1',ok)); const mockPort=mock.address().port;
async function start(){
  logs='';child=spawn(process.execPath,['--require',fileURLToPath(new URL('./cloud-mock-preload.cjs',import.meta.url)),next,'start','--hostname','127.0.0.1','--port',String(port)],{cwd:web,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',BUTLER_AI_DATA_DIR:join(folder,'ai'),BUTLER_DB_PATH:join(folder,'app.sqlite'),LMS_CONFIG_PATH:join(folder,'config.local.json'),LMS_SYNC_TOKEN:'f'.repeat(64),BUTLER_TEST_CLOUD_PORT:String(mockPort),DEEPSEEK_API_KEY:'synthetic-env-must-not-forward',DEEPSEEK_BASE_URL:'https://must-not-use.invalid'}});
  exited=new Promise(ok=>child.once('exit',ok));child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
  for(let i=0;i<120;i++){if(child.exitCode!==null)throw new Error(logs);try{if((await fetch(origin+'/api/ai/setup')).ok)return;}catch{}await delay(100);}throw new Error('Fixture startup failed');
}
async function stop(){if(child&&child.exitCode===null){child.kill();await Promise.race([exited,delay(5000)]);if(child.exitCode===null){child.kill('SIGKILL');await exited;}}}
async function api(action,body={},expected=200,headers={}){const res=await fetch(origin+'/api/ai/setup',action?{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify({action,...body})}:{headers});const value=await res.json();assert.equal(res.status,expected,JSON.stringify(value));return value;}
async function route(path,body){const res=await fetch(origin+path,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});const text=await res.text();assert.equal(res.status,200,text);assert.equal(text.includes('synthetic-env-must-not-forward'),false);return text;}
const profile=term=>({id:'ai-fixture',school:'Synthetic AI test school',entryUrl:'https://tplms.polite.edu.sg/d2l/home',platform:'brightspace',semester:{id:term,label:term,confirmed:true,courses:[{id:'101',name:'Synthetic module',selected:true,status:'active'}]},daily:{time:'09:00',timezone:'Asia/Singapore'}});
async function brief(term,title,sequence){
 await route('/api/lms/settings',{profile:profile(term),confirm:true});
 const snapshot={school:'Synthetic AI test school',baseUrl:'https://tplms.polite.edu.sg',timezone:'Asia/Singapore',profileId:'ai-fixture',semesterId:term,semesterLabel:term,syncedAt:`2026-10-${String(20+sequence).padStart(2,'0')}T00:00:00Z`,status:'ok',warnings:[],enableAiBrief:true,courses:[{id:'101',moduleName:'Synthetic module',lessons:[],announcements:[],assignments:[{id:String(sequence),title,dueAt:null,submissionState:'submitted',url:'https://tplms.polite.edu.sg/d2l/assignment/'+sequence}]}]};
 const response=await fetch(origin+'/api/lms/ingest',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer '+'f'.repeat(64)},body:JSON.stringify(snapshot)});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.aiStatus,'generated');
}
try{
 await start();let initial=await api();assert.equal(initial.settings.onboarding,'new');
 await api('save',{settings:{...initial.settings,mode:'local',localKind:'external',externalURL:`http://127.0.0.1:${mockPort}/v1`,externalModel:'synthetic-local',onboarding:'paused',step:2}});
 await api('save',{settings:initial.settings},403,{origin:'https://foreign.example'});
 await api('save',{settings:{...initial.settings,modelsDir:'relative'}},400);
 await api('download',{id:'qwen3-8-q4',confirm:false},400);assert.equal(requests.length,0);
 const hardware=await api('hardware');assert.ok(hardware.hardware.ramGiB>0);assert.equal(requests.length,0);
 await api('test');await api('sample',{confirm:false},400);await api('sample',{confirm:true});
 const paths=[['/api/chat',{messages:[{role:'user',content:'Synthetic question'}],includeTools:false,language:'en'}],['/api/extract-ddls',{markdown:'Synthetic assignment with no explicit due date. Please preserve unknown date.',filename:'synthetic.txt',currentDate:'2026-10-21'}],['/api/generate-panel',{prompt:'Synthetic panel'}],['/api/generate-source',{prompt:'Synthetic source'}],['/api/research/plan',{goal:'Synthetic goal'}],['/api/research/squad',{goal:'Synthetic goal',squadTitle:'Synthetic squad',question:'Synthetic question'}]];
 const count=requests.length;for(const [path,body]of paths)await route(path,body);assert.equal(requests.length-count,paths.length);
 for(const req of requests){if(req.body)assert.equal(req.body.model,'synthetic-local');assert.equal(req.authorization,'Bearer local-no-key');}
 await brief('term1','HISTORICAL_SHOULD_NOT_LEAK',1);assert.equal(requests.at(-1).body.model,'synthetic-local');
 await brief('term2','CURRENT_SEMESTER_ONLY',2);assert.equal(requests.at(-1).body.model,'synthetic-local');assert.equal(JSON.stringify(requests.at(-1).body).includes('HISTORICAL_SHOULD_NOT_LEAK'),false);
 const ocr=await fetch(origin+'/api/ocr',{method:'POST',headers:{origin}});assert.equal(ocr.status,403);assert.match(await ocr.text(),/Cloud OCR is off/);
 await stop();await start();initial=await api();assert.equal(initial.settings.onboarding,'paused');assert.equal(initial.settings.externalModel,'synthetic-local');await api('test');
 if(process.platform==='win32'){
   const synthetic='sk-synthetic-http-fixture-not-a-real-key';const saved=await api('save-key',{key:synthetic});assert.equal(JSON.stringify(saved).includes(synthetic),false);assert.equal(readFileSync(join(folder,'ai','deepseek.dpapi'),'utf8').includes(synthetic),false);
   await api('save',{settings:{...initial.settings,mode:'deepseek',deepseekModel:'deepseek-flash'}});
   await api('test');let count=requests.length;await api('sample',{confirm:true});assert.equal(requests.length,count+1);assert.equal(requests.at(-1).body.model,'deepseek-flash');assert.equal(requests.at(-1).authorization,'Bearer '+synthetic);
   await brief('term2','CLOUD_SYNTHETIC_CURRENT_ONLY',3);assert.equal(requests.at(-1).body.model,'deepseek-flash');assert.equal(JSON.stringify(requests.at(-1).body).includes('HISTORICAL_SHOULD_NOT_LEAK'),false);
   for(const status of [401,402,429,503]){failure=status;const result=await api('sample',{confirm:true},400);assert.equal(JSON.stringify(result).includes('sk-synthetic-provider-error'),false);assert.match(result.error,status===401?/Authentication/:status===402?/balance/:status===429?/rate limited/:/unavailable/);}failure=0;
   await stop();await start();assert.equal((await api()).keyPresent,true);await api('test');await api('delete-key');assert.equal((await api()).keyPresent,false);
 }
 initial=await api();await api('save',{settings:{...initial.settings,mode:'none',onboarding:'complete',step:3}});const count2=requests.length;await api('sample',{confirm:true},400);assert.equal(requests.length,count2);
 const backup=await fetch(origin+'/api/lms/settings?export=1');assert.equal((await backup.text()).includes('synthetic-http-fixture'),false);
 assert.equal(logs.includes('sk-synthetic'),false);
 console.log('AI HTTP integration passed: all six interactive AI routes and LMS brief use the selected provider; profile/semester brief isolation, OCR consent, bridge guards, persistence, DPAPI, DeepSeek mock, key/balance/rate/overload recovery and credential-free exports. No real cloud quota or school access.');
}finally{await stop();mock.closeAllConnections();await new Promise(ok=>mock.close(ok));const target=resolve(folder);assert.equal(dirname(target),resolve(tmpdir()));assert.match(basename(target),/^butler-ai-http-/);rmSync(target,{recursive:true,force:true});}
