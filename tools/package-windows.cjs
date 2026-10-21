// Offline packaging of the already-built app and pinned, locally present engine.
// No download, install, upload, publish or school-session action occurs here.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),workspace=path.join(root,'my-app'),web=path.join(workspace,'apps/web'),standalone=path.join(web,'.next/standalone');
const output=path.resolve(process.argv[2]||path.join(root,'..','Hackathon-Windows-x64-CPU'));
if(process.platform!=='win32'||process.arch!=='x64')throw new Error('This package target requires Windows x64 and its native better-sqlite3 build.');
if(fs.existsSync(output))throw new Error('Choose a new output directory; existing packages/data are never overwritten.');
if(!fs.existsSync(path.join(standalone,'apps/web/server.js')))throw new Error('Run pnpm --filter @smart-hub/web build first.');
const excluded=/^(\.env(?:\..*)?|config\.local.*|\.private|data|courses|.*\.(sqlite.*|db|log|gguf|part))$/i;
function materialize(source,target,ancestors=new Set()){
 let origin=source;
 if(fs.lstatSync(source).isSymbolicLink()){
   const real=fs.realpathSync(source),relative=path.relative(workspace,real),traced=path.join(standalone,relative);
   if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Dependency link leaves source workspace');
   origin=fs.existsSync(traced)?traced:real;
 }
 const real=fs.realpathSync(origin),stat=fs.statSync(origin);
 if(stat.isDirectory()){
   if(ancestors.has(real))throw new Error('Dependency cycle cannot be materialized: '+source);
   const next=new Set(ancestors);next.add(real);fs.mkdirSync(target,{recursive:true});
   for(const name of fs.readdirSync(origin)){if(!excluded.test(name))materialize(path.join(origin,name),path.join(target,name),next);}
 }else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(origin,target);}
}
materialize(standalone,path.join(output,'app'));
materialize(path.join(web,'.next/static'),path.join(output,'app/apps/web/.next/static'));
materialize(path.join(web,'public'),path.join(output,'app/apps/web/public'));
// pnpm's traced links point at the install store. Materialized aliases alone lose
// their sibling dependency lookup paths. Install the exact existing runtime closure
// into ordinary node_modules directories; perform no registry install or scripts.
const moduleRoot=path.join(output,'app/node_modules'),installed=new Map();
function resolvePackage(from,name){
 const req=createRequire(path.join(from,'package.json'));
 try{return path.dirname(req.resolve(name+'/package.json'));}catch{
   let p=path.dirname(req.resolve(name));
   while(p!==path.dirname(p)){if(fs.existsSync(path.join(p,'package.json'))&&JSON.parse(fs.readFileSync(path.join(p,'package.json'))).name===name)return p;p=path.dirname(p);}
   throw new Error('Cannot resolve runtime dependency '+name);
 }
}
function packageFiles(source,target){fs.mkdirSync(target,{recursive:true});for(const name of fs.readdirSync(source)){if(['node_modules','.git'].includes(name))continue;const src=path.join(source,name),dst=path.join(target,name),stat=fs.statSync(src);if(stat.isDirectory())packageFiles(src,dst);else fs.copyFileSync(src,dst);}}
function installPackage(source,callerTarget=path.join(output,'app'),chain=new Map()){
 source=fs.realpathSync(source);const meta=JSON.parse(fs.readFileSync(path.join(source,'package.json'))),id=meta.name+'@'+meta.version;
 if(chain.get(meta.name)===id)return;
 let base=moduleRoot;
 if(installed.has(meta.name)&&installed.get(meta.name)!==id)base=path.join(callerTarget,'node_modules');
 const target=path.join(base,meta.name);
 if(fs.existsSync(path.join(target,'package.json'))&&JSON.parse(fs.readFileSync(path.join(target,'package.json'))).version===meta.version)return;
 packageFiles(source,target);if(base===moduleRoot)installed.set(meta.name,id);
 const next=new Map(chain);next.set(meta.name,id);
 for(const name of Object.keys(meta.dependencies||{}))installPackage(resolvePackage(source,name),target,next);
 for(const name of Object.keys(meta.optionalDependencies||{})){let dependency;try{dependency=resolvePackage(source,name);}catch{continue;}installPackage(dependency,target,next);}
}
for(const name of ['next','react','react-dom','openai','better-sqlite3'])installPackage(resolvePackage(web,name));
const runtime=path.join(output,'runtime');fs.mkdirSync(path.join(runtime,'llama'),{recursive:true});
fs.copyFileSync(process.execPath,path.join(runtime,'node.exe'));
for(const name of fs.readdirSync(path.join(root,'runtime/llama'))){if(/\.dll$|^llama-server\.exe$|^engine-host\.cjs$|^LICENSE/i.test(name))fs.copyFileSync(path.join(root,'runtime/llama',name),path.join(runtime,'llama',name));}
materialize(path.join(root,'runtime/licenses'),path.join(output,'licenses'));
materialize(path.join(root,'my-app/ops/lms-sync'),path.join(output,'ops/lms-sync'));
for(const name of ['Launch.cjs','Start-Hackathon.cmd','GETTING-STARTED.md','THIRD-PARTY-NOTICES.md'])fs.copyFileSync(path.join(root,'distribution',name),path.join(output,name));
// Preserve license texts even if Next's file tracer omitted non-runtime notice files.
const licenses=[],store=path.join(workspace,'node_modules/.pnpm');
for(const entry of fs.readdirSync(store)){const modules=path.join(store,entry,'node_modules');if(!fs.existsSync(modules))continue;let packages=[];
 for(const name of fs.readdirSync(modules)){const p=path.join(modules,name);if(name.startsWith('@')){for(const child of fs.readdirSync(p))packages.push(path.join(p,child));}else packages.push(p);}
 for(const pkg of packages){if(fs.lstatSync(pkg).isSymbolicLink()||!fs.existsSync(path.join(pkg,'package.json')))continue;const meta=JSON.parse(fs.readFileSync(path.join(pkg,'package.json'),'utf8'));const key=`${meta.name}@${meta.version}`;if(licenses.some(l=>l.package===key))continue;const texts=fs.readdirSync(pkg).filter(n=>/^(license|notice|copying)(\.|$)/i.test(n)&&fs.statSync(path.join(pkg,n)).isFile());const dest=path.join(output,'licenses/npm',key.replace(/[^a-zA-Z0-9.@_-]/g,'_'));fs.mkdirSync(dest,{recursive:true});for(const name of texts)fs.copyFileSync(path.join(pkg,name),path.join(dest,name));licenses.push({package:key,license:meta.license||'See package license',files:texts});}
}
fs.writeFileSync(path.join(output,'licenses/npm-manifest.json'),JSON.stringify(licenses,null,2));
const files=[];function inventory(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(fs.lstatSync(file).isSymbolicLink())throw new Error('Output contains a machine-bound link');if(entry.isDirectory())inventory(file);else files.push({path:path.relative(output,file).replaceAll('\\','/'),bytes:fs.statSync(file).size});}}inventory(output);
fs.writeFileSync(path.join(output,'PACKAGE-MANIFEST.json'),JSON.stringify({createdAt:new Date().toISOString(),platform:'win32-x64',node:process.version,next:require(path.join(web,'node_modules/next/package.json')).version,engine:{release:'b11669',version:'0.7.0-dev',commit:'620d2225cc436ab0b001e3200e590e3b286ef9ab',source:'https://github.com/ggml-org/llama.cpp/releases/tag/b11669',upstreamArchiveSha256:'37b3efcf962847ca869745fd4ccf7f5e7e8dacfeff9fa3523b4ca8cdc66d632b'},weightsIncluded:false,microsoftRuntimeIncluded:false,files},null,2));
const zip=output+'.zip';if(fs.existsSync(zip))throw new Error('ZIP already exists; choose a new package target.');
const buildingZip=output+'.building.zip';
execFileSync('tar.exe',['-a','-cf',buildingZip,'-C',path.dirname(output),path.basename(output)],{stdio:'inherit',windowsHide:true});
fs.renameSync(buildingZip,zip);
fs.writeFileSync(zip+'.sha256',crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex')+'  '+path.basename(zip)+'\n');
console.log(`Portable package: ${output}\nZIP: ${zip}\nFiles: ${files.length}; ${Math.round(files.reduce((n,f)=>n+f.bytes,0)/1048576)} MiB uncompressed. No private state or model weights.`);
