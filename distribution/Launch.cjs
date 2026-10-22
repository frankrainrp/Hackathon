const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn}=require('node:child_process');
const root=__dirname,port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be between 1024 and 65535.');
const data=path.join(root,'data');fs.mkdirSync(data,{recursive:true});
const env={...process.env,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port),NEXT_TELEMETRY_DISABLED:'1',BUTLER_APP_URL:`http://127.0.0.1:${port}`,BUTLER_DB_PATH:path.join(data,'butler.sqlite'),BUTLER_AI_DATA_DIR:path.join(data,'ai'),LMS_CONFIG_PATH:path.join(data,'lms/config.local.json'),BUTLER_LMS_WORKER_DIR:path.join(root,'ops/lms-sync'),BUTLER_ENGINE_DIR:path.join(root,'runtime/llama')};
// Cloud text credentials are entered through DPAPI setup, never imported from a shell by this launcher.
for(const key of Object.keys(env))if(key.startsWith('DEEPSEEK_'))delete env[key];
const check=net.createServer();check.once('error',()=>{console.error(`Port ${port} is in use. Close the other Butler window/server or select another PORT. No process was stopped.`);process.exitCode=1;});
check.listen(port,'127.0.0.1',()=>check.close(()=>{
 const child=spawn(process.execPath,[path.join(root,'app/apps/web/server.js')],{cwd:path.join(root,'app/apps/web'),env,windowsHide:true,stdio:'inherit'});
 let stopping=false;const stop=()=>{if(!stopping){stopping=true;child.kill();}};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 child.on('exit',code=>{process.exitCode=code||0;});child.on('error',()=>{console.error('Could not start Butler. Extract the complete package into a writable local folder.');process.exitCode=1;});
 console.log(`Open http://127.0.0.1:${port} in your browser. Keep this window open; Ctrl+C stops Butler and its managed engine.\nNo models, drivers or school schedules are installed automatically.`);
}));
