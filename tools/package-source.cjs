const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),stage=path.resolve(process.argv[2]||''),zip=path.resolve(process.argv[3]||'');
if(!process.argv[2]||!process.argv[3]||fs.existsSync(stage)||fs.existsSync(zip))throw new Error('Provide a new staging folder and new ZIP path.');
const excluded=new Set(['.git','node_modules','.next','.private','.private-ai','.turbo','__pycache__','.venv','data','courses','release','school-worker']);
const allowedExample=name=>name==='.env.local.example';
function copy(source,target){fs.mkdirSync(target,{recursive:true});for(const entry of fs.readdirSync(source,{withFileTypes:true})){if(excluded.has(entry.name)||fs.lstatSync(path.join(source,entry.name)).isSymbolicLink())continue;if(entry.isDirectory())copy(path.join(source,entry.name),path.join(target,entry.name));else if(allowedExample(entry.name)||!/^\.env|^config\.local|\.(sqlite.*|db|log|tsbuildinfo|pyc|gguf|part)$/i.test(entry.name))fs.copyFileSync(path.join(source,entry.name),path.join(target,entry.name));}}
copy(root,path.join(stage,'Hackathon-local-ai-source'));
execFileSync('tar.exe',['-a','-cf',zip,'-C',stage,'Hackathon-local-ai-source'],{stdio:'inherit',windowsHide:true});
fs.writeFileSync(zip+'.sha256',crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex')+'  '+path.basename(zip)+'\n');
console.log('Complete source ZIP created without private state, dependency/build caches or model weights: '+zip);
