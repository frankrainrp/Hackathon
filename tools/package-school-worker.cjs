// Freeze already-installed, pinned connector dependencies. Never installs browsers or accesses a school.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=path.join(root,'my-app/ops/lms-sync');
const output=path.join(root,'runtime/school-worker'),python=process.env.LMS_BUILD_PYTHON;
if(process.platform!=='win32'||!python||!path.isAbsolute(python)||!fs.existsSync(python))throw Error('Set LMS_BUILD_PYTHON to an existing Windows Python with the pinned connector and PyInstaller dependencies.');
if(fs.existsSync(output))throw Error('Generated runtime/school-worker already exists. Preserve it before rebuilding.');
fs.mkdirSync(output,{recursive:true});
// Some supplied Python runtimes augment ssl.py with a companion certificate file.
// Preserve that runtime's verification policy instead of disabling TLS checks.
const sslCompanion=execFileSync(python,['-c','import ssl,pathlib; p=pathlib.Path(ssl.__file__).with_name("codex-rejected-cas.pem"); print(str(p) if p.is_file() else "")'],{windowsHide:true,encoding:'utf8'}).trim();
const sslData=sslCompanion?['--add-data',sslCompanion+path.delimiter+'.']:[];
execFileSync(python,['-m','PyInstaller','--noconfirm','--onedir','--name','ButlerSync','--distpath',output,'--workpath',path.join(output,'build'),'--specpath',output,'--collect-all','playwright','--collect-all','pypdf',...sslData,path.join(source,'lms_sync.py')],{cwd:source,windowsHide:true,stdio:'inherit'});
const worker=path.join(output,'ButlerSync'),notices=path.join(worker,'third-party-notices');fs.mkdirSync(notices,{recursive:true});
const licenses=`import importlib.metadata as m,json,pathlib,shutil,sys
out=pathlib.Path(sys.argv[1]); manifest=[]
for d in m.distributions():
    names=[]
    for f in d.files or []:
        if 'license' in f.name.lower() or f.name.lower().startswith(('copying','notice')):
            src=d.locate_file(f)
            if src.is_file():
                dest=out/d.metadata['Name']/str(f).replace('..','_');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);names.append(str(dest.relative_to(out)))
    manifest.append({'name':d.metadata['Name'],'version':d.version,'notices':names})
license=pathlib.Path(sys.base_prefix)/'LICENSE.txt'
if license.exists():shutil.copyfile(license,out/'LICENSE-Python.txt')
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')`;
execFileSync(python,['-c',licenses,notices],{windowsHide:true,stdio:'inherit'});
// The package uses the host Microsoft prerequisite already required by llama.cpp.
// Do not redistribute Microsoft runtime DLLs pulled into the freeze implicitly.
function omitMicrosoft(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())omitMicrosoft(file);else if(/^(?:vcruntime\d.*|msvcp\d.*|concrt\d.*|api-ms-win-crt-.*)\.dll$/i.test(entry.name))fs.unlinkSync(file);}}
omitMicrosoft(worker);
execFileSync(path.join(worker,'ButlerSync.exe'),['--help'],{windowsHide:true,stdio:'pipe'});
console.log('Frozen connector ready: '+worker+'; no browser, school session or model weights included.');
