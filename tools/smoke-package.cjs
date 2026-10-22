// Verifies the exact ZIP after extraction in a disposable local folder. No browser automation.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),net=require('node:net'),crypto=require('node:crypto'),{spawn,execFileSync}=require('node:child_process');
const zip=path.resolve(process.argv[2]||''),scratch=path.resolve(process.argv[3]||'');
if(!fs.existsSync(zip)||!fs.existsSync(zip+'.sha256')||!zip.endsWith('.zip')||!process.argv[3]||fs.existsSync(scratch))throw new Error('Provide a completed ZIP with SHA-256 and a new disposable extraction directory.');
const checked=fs.readFileSync(zip+'.sha256','utf8').split(' ')[0];if(crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex')!==checked)throw new Error('ZIP checksum mismatch');
fs.mkdirSync(scratch,{recursive:true});execFileSync('tar.exe',['-xf',zip,'-C',scratch],{windowsHide:true});
const packageRoot=path.join(scratch,fs.readdirSync(scratch)[0]);
const manifest=JSON.parse(fs.readFileSync(path.join(packageRoot,'PACKAGE-MANIFEST.json')));if(manifest.weightsIncluded||manifest.microsoftRuntimeIncluded)throw new Error('Unexpected artifact content');
const runtime=path.join(packageRoot,'runtime/node.exe');
execFileSync(path.join(packageRoot,'runtime/llama/llama-server.exe'),['--version'],{windowsHide:true,stdio:'pipe'});
execFileSync(path.join(packageRoot,'ops/lms-sync/ButlerSync.exe'),['--help'],{windowsHide:true,stdio:'pipe'});
execFileSync(path.join(packageRoot,'Butler.exe'),['--check'],{windowsHide:true,stdio:'pipe'});
execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(packageRoot,'ops/lms-sync/portable-launch.ps1'),'-Check'],{cwd:scratch,windowsHide:true,stdio:'pipe'});
if(fs.existsSync(path.join(packageRoot,'data')))throw new Error('Fresh ZIP must contain no runtime/private state');
let requestCount=0,workerPushes=0;
const workerToken='synthetic-packaged-worker-credential-only';
const mock=http.createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;res.setHeader('content-type','application/json');if(req.url==='/api/lms/ingest'){if(req.headers.authorization!==`Bearer ${workerToken}`||JSON.parse(raw).status!=='ok'){res.statusCode=401;res.end('{"ok":false}');return;}workerPushes++;res.end('{"ok":true,"notifications":0,"aiStatus":"unchanged"}');return;}requestCount++;if(req.url.endsWith('/models')){res.end(JSON.stringify({object:'list',data:[{id:'synthetic-packaged-model',object:'model',created:0,owned_by:'fixture'}]}));return;}const body=JSON.parse(raw);if(body.model!=='synthetic-packaged-model')throw new Error('Wrong packaged provider model');res.end(JSON.stringify({id:'fixture',object:'chat.completion',created:0,model:body.model,choices:[{index:0,message:{role:'assistant',content:'Synthetic packaged response.'},finish_reason:'stop'}]}));});

async function frozenBridge(){
 const fixture=path.join(scratch,'bridge-fixture');fs.mkdirSync(path.join(fixture,'.private'),{recursive:true});
 const config=path.join(fixture,'config.local.json');
 fs.writeFileSync(config,JSON.stringify({private_dir:'.private',output_dir:'courses',butler_url:`http://127.0.0.1:${mock.address().port}`,profileSettings:{activeProfileId:'package-worker',profiles:[{id:'package-worker',school:'Synthetic package school',entryUrl:'https://tplms.polite.edu.sg/d2l/home',origin:'https://tplms.polite.edu.sg',platform:'brightspace',confirmedAt:'2026-10-22T00:00:00Z',daily:{time:'09:00',timezone:'Asia/Singapore'},activeSemesterId:'term',semesters:[{id:'term',label:'Synthetic term',confirmed:true,courses:[]}]}]}}));
 fs.writeFileSync(path.join(fixture,'.private/last-snapshot.json'),JSON.stringify({status:'ok',courses:[]}));
 const worker=spawn(path.join(packageRoot,'ops/lms-sync/ButlerSync.exe'),['--config',config,'retry'],{windowsHide:true,stdio:'ignore',env:{...process.env,LMS_SYNC_TOKEN:workerToken}});
 await new Promise((ok,fail)=>{const timer=setTimeout(()=>{worker.kill();fail(Error('Frozen school bridge timed out'));},15000);worker.once('error',error=>{clearTimeout(timer);fail(error);});worker.once('exit',code=>{clearTimeout(timer);if(code===0)ok();else fail(Error('Frozen school bridge failed: '+code));});});
 if(workerPushes!==1)throw Error('Frozen school bridge did not deliver the snapshot');
}
let child,exited,port,origin,logs='';
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
const staleData=path.join(scratch,'unrelated-old-install');
async function start(){child=spawn(path.join(packageRoot,'Butler.exe'),['--no-browser'],{cwd:scratch,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(port),BUTLER_DB_PATH:path.join(staleData,'butler.sqlite'),BUTLER_AI_DATA_DIR:path.join(staleData,'ai'),LMS_CONFIG_PATH:path.join(staleData,'config.local.json')}});exited=new Promise(ok=>child.once('exit',ok));child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error('Package exited: '+logs);try{const res=await fetch(origin+'/api/ai/setup');if(res.ok)return;}catch{}await delay(150);}throw new Error('Packaged server did not become ready: '+logs);}
async function busyPort(){
 const probe=spawn(path.join(packageRoot,'Butler.exe'),['--no-browser'],{cwd:scratch,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(port)}});
 let output='';probe.stdout.on('data',d=>output+=d);probe.stderr.on('data',d=>output+=d);
 const code=await new Promise((ok,fail)=>{const timer=setTimeout(()=>{probe.kill();fail(Error('Busy-port launcher did not exit'));},5000);probe.once('error',fail);probe.once('exit',c=>{clearTimeout(timer);ok(c);});});
 if(code!==1||!output.includes('already in use')||!(await fetch(origin+'/api/ai/setup')).ok)throw Error('Busy-port isolation failed');
}
// Direct launcher termination on Windows does not signal children; stop only the exact owned process tree.
async function stop(){if(child&&child.exitCode===null){execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await exited;}}
async function api(action,data={}){const response=await fetch(origin+'/api/ai/setup',action?{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action,...data})}:{});const result=await response.json();if(!response.ok)throw new Error(JSON.stringify(result));return result;}
(async()=>{try{
 await new Promise(ok=>mock.listen(0,'127.0.0.1',ok));const listener=net.createServer();await new Promise(ok=>listener.listen(0,'127.0.0.1',ok));port=listener.address().port;await new Promise(ok=>listener.close(ok));origin=`http://127.0.0.1:${port}`;
 await frozenBridge();
 await start();let initial=await api();if(initial.settings.onboarding!=='new')throw new Error('Fresh onboarding state missing');
 if(initial.modelNames.primary!==null||initial.settings.externalModel)throw Error('Fresh package invented a running model name');
 const empty=await(await fetch(origin+'/api/state')).json();if(Object.values(empty).some(value=>!Array.isArray(value)||value.length))throw Error('Fresh package contains seeded user records');
 await busyPort();
 const school=await(await fetch(origin+'/api/lms/settings')).json();if(school.settings.profiles.length||school.weekly.enabled)throw Error('Private school or schedule leaked into the fresh package');
 const invalidLink=await fetch(origin+'/api/open-link',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({url:'file:///private'})});if(invalidLink.status!==400)throw Error('Unsafe browser link accepted');
 const home=await(await fetch(origin+'/')).text();if(!home.includes('<html lang="en"')||!home.includes('data-theme="retro"')||!home.includes('Butler — Your study workspace'))throw new Error('Packaged defaults are not English and Retro');
 const localized=await fetch(origin+'/api/ai/setup',{method:'POST',headers:{origin,'content-type':'application/json','x-butler-language':'zh'},body:JSON.stringify({action:'download',id:'qwen3-8-q4',confirm:false})});if(localized.status!==400||!/\p{Script=Han}/u.test((await localized.json()).error)||requestCount)throw new Error('Packaged localized consent guard failed');
 const html=await(await fetch(origin+'/ai-setup')).text();if(!html.includes('/_next/static/'))throw new Error('Packaged assets missing');const asset=html.match(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/)[1].replaceAll('&amp;','&');if(!(await fetch(origin+asset)).ok)throw new Error('Packaged static asset failed');
 if(initial.catalog.some(m=>!(m.parametersB>8)))throw new Error('Retired small model leaked into the packaged recommendation catalog');
 const hardware=await api('hardware');if(!hardware.probe.available||hardware.hardware.arch!=='x64'||!['api','local'].includes(hardware.recommendations.recommendedMode))throw new Error('Packaged device recommendation failed');
 await api('save',{settings:{...initial.settings,mode:'local',localKind:'external',externalURL:`http://127.0.0.1:${mock.address().port}/v1`,externalModel:'',onboarding:'paused',step:2}});const discovered=await api('models');if(discovered.settings.externalModel!=='synthetic-packaged-model')throw Error('Actual sole service model was not selected');await api('test');const sample=await api('sample',{confirm:true});if(sample.sample!=='Synthetic packaged response.')throw new Error('Packaged generation failed');
 if((await api()).modelNames.primary!=='synthetic-packaged-model')throw new Error('Packaged model label differs from configuration');
 const state=await fetch(origin+'/api/state',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify({key:'notes',value:[{id:'synthetic-package-note',title:'Synthetic package record',content:'No private data',tags:[],createdAt:1,updatedAt:1}]})});if(!state.ok)throw new Error('Packaged SQLite write failed');
 await stop();await start();initial=await api();if(initial.settings.onboarding!=='paused'||initial.settings.externalModel!=='synthetic-packaged-model')throw new Error('Packaged settings restart failed');const persisted=await(await fetch(origin+'/api/state')).json();if(!JSON.stringify(persisted).includes('synthetic-package-note'))throw new Error('Packaged SQLite restart failed');
 if(fs.existsSync(staleData))throw Error('Portable launcher reused inherited machine paths');
 console.log(JSON.stringify({passed:true,zip,zipSha256:checked,node:manifest.node,next:manifest.next,engine:manifest.engine.release,isolatedExtraction:scratch,checks:['exact ZIP integrity','no private data or weights in ZIP','fresh empty records and no chosen model','fully materialized dependencies','launch from another working directory with stale environment paths','busy port exits without stopping the existing application','bundled Node launch on loopback','real bundled engine probe','real frozen school-worker HTTP bridge','static route/assets','English and Retro default HTML/title','Chinese consent guard without download/provider call','sole actual service model auto-selection and label','hardware bridge','selected local mock test/sample','settings and SQLite restart'],mockRequests:requestCount,workerPushes,browserTested:false},null,2));
}finally{await stop();mock.closeAllConnections();await new Promise(ok=>mock.close(ok));}})().catch(e=>{console.error(e.message);process.exitCode=1;});
