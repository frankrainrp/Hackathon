// Exact source ZIP -> first dependency install -> real source launcher -> HTTP.
// Installs locked app dependencies. No weights, browser automation, school access or paid requests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const {spawn,execFileSync}=require('node:child_process');
const zip=path.resolve(process.argv[2]||''),scratch=path.resolve(process.argv[3]||'');
if(process.platform!=='win32'||!process.argv[3]||!fs.existsSync(zip+'.sha256')||fs.existsSync(scratch))throw Error('Provide a completed source ZIP and a new extraction directory on Windows.');
const expected=fs.readFileSync(zip+'.sha256','utf8').split(' ')[0];
if(crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex')!==expected)throw Error('Source ZIP checksum mismatch');
fs.mkdirSync(scratch,{recursive:true});execFileSync('tar.exe',['-xf',zip,'-C',scratch],{windowsHide:true});
const source=path.join(scratch,'Hackathon-local-ai-source'),entry=path.join(source,'tools/start-source.ps1');
for(const name of ['Start-Source.cmd','README.md','my-app/package.json','tools/start-source.ps1'])if(!fs.existsSync(path.join(source,name)))throw Error('Source entry missing: '+name);
if(fs.existsSync(path.join(source,'my-app/node_modules'))||fs.existsSync(path.join(source,'my-app/ops/lms-sync/.venv')))throw Error('Source ZIP is not fresh');
let child,logs='';const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
(async()=>{try{
 const socket=net.createServer();await new Promise(ok=>socket.listen(0,'127.0.0.1',ok));const port=socket.address().port;await new Promise(ok=>socket.close(ok));
 const origin=`http://127.0.0.1:${port}`;
 child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',entry,'-Install','-NoBrowser','-Port',String(port)],{cwd:scratch,windowsHide:true,stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{logs+=d;for(const line of String(d).split(/\r?\n/))if(/^(Source root:|Installing locked|Starting Butler|Ready:|Butler source startup:)/.test(line))console.log(line);});
 let ready=false;
 for(let i=0;i<1200;i++){
  if(child.exitCode!==null)throw Error('Source launch failed: '+logs.slice(-5000));
  if(logs.includes('Ready: '+origin)){ready=true;break;}
  await delay(500);
 }
 if(!ready)throw Error('Source first installation/startup timed out: '+logs.slice(-5000));
 execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',entry,'-Check'],{cwd:scratch,windowsHide:true,stdio:'pipe'});
 const get=async p=>{const r=await fetch(origin+p);if(!r.ok)throw Error(p+' returned '+r.status);return r;};
 const ai=await(await get('/api/ai/setup')).json();if(ai.settings.onboarding!=='new'||ai.settings.mode!=='none'||ai.modelNames.primary!==null)throw Error('Source AI defaults are not empty');
 const state=await(await get('/api/state')).json();if(Object.values(state).some(v=>!Array.isArray(v)||v.length))throw Error('Source contains seeded workspace records');
 const school=await(await get('/api/lms/settings')).json();if(school.settings.profiles.length||school.weekly.enabled)throw Error('Source includes private school/schedule state');
 const html=await(await get('/')).text();if(!html.includes('<html lang="en" data-theme="retro"'))throw Error('Source defaults are not English/Retro');
 if(fs.existsSync(path.join(scratch,'ops')))throw Error('Launcher created school dependencies outside its source root');
 const report={passed:true,zip,sha256:expected,source,origin,checks:['fresh source archive','launcher from extraction parent','workspace pnpm version selection','first locked Node/Python dependency installation','native SQLite probe','actual server readiness','post-install prerequisite check','empty AI/workspace/school state','English/Retro HTML','no dependency directory outside source root'],browserTested:false};
 fs.writeFileSync(path.join(scratch,'SOURCE-SMOKE-RESULT.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
 if(child&&child.exitCode===null)execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
 fs.writeFileSync(path.join(scratch,'source-startup.log'),logs);
}})().catch(error=>{console.error(error.message);process.exitCode=1;});
