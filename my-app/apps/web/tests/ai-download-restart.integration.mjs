import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, statSync, existsSync, rmSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { MODEL_CATALOG } from '../src/lib/ai-catalog.ts';
const folder=mkdtempSync(join(tmpdir(),'butler-download-restart-')),directory=join(folder,'models'),data=join(folder,'ai');
const bytes=Buffer.alloc(256*1024,37),sha=createHash('sha256').update(bytes).digest('hex');let ranges=[];
const server=createServer((req,res)=>{const start=Number(req.headers.range?.match(/bytes=(\d+)-/)?.[1]||0);ranges.push(start);res.writeHead(start?206:200,{'content-length':bytes.length-start,...(start?{'content-range':`bytes ${start}-${bytes.length-1}/${bytes.length}`}:{})});let offset=start;const timer=setInterval(()=>{if(offset>=bytes.length){clearInterval(timer);res.end();return;}const chunk=bytes.subarray(offset,offset+4096);res.write(chunk);offset+=chunk.length;},8);res.on('close',()=>clearInterval(timer));});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const url=`http://127.0.0.1:${server.address().port}/synthetic`;
function worker(interrupt){
 const code=`import{writeFileSync,mkdirSync}from'node:fs';import{join}from'node:path';import{MODEL_CATALOG}from ${JSON.stringify(new URL('../src/lib/ai-catalog.ts',import.meta.url).href)};import{transferModel,modelDirectory,downloadStatuses}from ${JSON.stringify(new URL('../src/lib/ai-download.ts',import.meta.url).href)};import{atomicJson}from ${JSON.stringify(new URL('../src/lib/ai-config.ts',import.meta.url).href)};const m={...MODEL_CATALOG[0],bytes:${bytes.length},sha256:${JSON.stringify(sha)}};const directory=modelDirectory(${JSON.stringify(directory)});const old=downloadStatuses();if(${!interrupt}){if(old[0]?.state!=='paused')throw new Error('Interrupted journal did not recover as paused');}const status={id:m.id,directory,state:'downloading',received:0,total:m.bytes,updated:Date.now()};let announced=false;await transferModel(m,directory,new AbortController(),status,${JSON.stringify(url)},s=>{atomicJson(join(${JSON.stringify(data)},'downloads',m.id+'.json'),s);if(${interrupt}&&s.received>0&&!announced){announced=true;process.send?.({partial:true});}});process.send?.({done:true});`;
 const child=spawn(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env:{...process.env,BUTLER_AI_DATA_DIR:data},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});let errors='';child.stderr.on('data',d=>errors+=d);
 return {child,errors:()=>errors,exit:new Promise(ok=>child.once('exit',code=>ok(code)))};
}
try{
 const first=worker(true);await new Promise((ok,fail)=>{const timer=setTimeout(()=>fail(new Error('No persisted partial bytes')),10000);first.child.on('message',m=>{if(m.partial){clearTimeout(timer);ok();}});first.child.once('exit',()=>{clearTimeout(timer);fail(new Error(first.errors()));});});first.child.kill('SIGKILL');await first.exit;
 const partial=join(directory,MODEL_CATALOG[0].file+'.part'),count=statSync(partial).size;assert.ok(count>0&&count<bytes.length);
 const second=worker(false);assert.equal(await second.exit,0,second.errors());assert.equal(ranges.at(-1),count);assert.equal(existsSync(partial),false);assert.equal(createHash('sha256').update(readFileSync(join(directory,MODEL_CATALOG[0].file))).digest('hex'),sha);
 assert.equal(JSON.parse(readFileSync(join(data,'downloads',MODEL_CATALOG[0].id+'.json'))).state,'ready');
 console.log('Download restart integration passed: killed transfer worker, recovered paused journal in a new process, Range resumed persisted bytes and full SHA-256 verified. Synthetic 256 KiB fixture only.');
}finally{server.closeAllConnections();await new Promise(ok=>server.close(ok));const target=resolve(folder);assert.equal(dirname(target),resolve(tmpdir()));assert.match(basename(target),/^butler-download-restart-/);rmSync(target,{recursive:true,force:true});}
