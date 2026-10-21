import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { messageCatalogs, DEFAULT_LANGUAGE, LANG_KEY, LANG_EVENT, getStoredLang, setStoredLang, getUiLanguage, applyStoredLang, translate, uiText, localizeExternal, formatDate, appFetch, requestLanguage } from '../src/lib/messages.ts';
import { withUiLanguage, generationLanguage } from '../src/lib/api-language.ts';
import { emptyPanelSpec } from '../src/lib/panel-schema.ts';
import { demoCourses } from '../src/lib/course-demo.ts';

const original = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
afterEach(() => { for (const [key,value] of Object.entries(original)) { if(value===undefined) delete globalThis[key]; else globalThis[key]=value; } setStoredLang('en'); });
function environment(saved) {
  const values=new Map(saved===undefined?[]:[[LANG_KEY,saved]]),events=[];
  globalThis.window={localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},location:{origin:'http://127.0.0.1:18640'},dispatchEvent:e=>events.push(e.type)};
  const description={};globalThis.document={documentElement:{lang:''},title:'',querySelector:()=>({setAttribute:(k,v)=>description[k]=v})};
  return {values,events,description};
}
test('fresh, corrupt and inaccessible preferences default to English; an explicit Chinese choice persists', () => {
  assert.equal(DEFAULT_LANGUAGE,'en');assert.equal(getStoredLang(),'en');
  const e=environment('invalid');assert.equal(getStoredLang(),'en');
  e.values.set('user-notes','我的原笔记 / $&');setStoredLang('zh');
  assert.equal(getStoredLang(),'zh');assert.equal(getUiLanguage(),'zh');assert.equal(document.documentElement.lang,'zh-CN');
  assert.equal(document.title,translate('app.title','zh'));assert.equal(e.description.content,translate('app.description','zh'));assert.deepEqual(e.events,[LANG_EVENT]);
  assert.equal(e.values.get('user-notes'),'我的原笔记 / $&');
  e.values.set(LANG_KEY,'en');applyStoredLang();assert.equal(getUiLanguage(),'en');
  window.localStorage={getItem:()=>{throw Error('unavailable')},setItem:()=>{throw Error('unavailable')}};
  assert.equal(getStoredLang(),'en');setStoredLang('zh');assert.equal(getUiLanguage(),'zh');
});
test('every catalog key has both languages and the same dynamic parameter contract', () => {
  assert.deepEqual(Object.keys(messageCatalogs.en).sort(),Object.keys(messageCatalogs.zh).sort());
  for(const [key,en] of Object.entries(messageCatalogs.en)) {
    const params=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
    assert.deepEqual(params(en),params(messageCatalogs.zh[key]),key);
    assert.ok(en.trim()&&messageCatalogs.zh[key].trim(),key);
    assert.ok(!/\p{Script=Han}/u.test(en)||key==='prefs.language.zh',key+' has Chinese in the English catalog');
  }
});
test('interpolation preserves real names, special characters, counts and unknown provider messages', () => {
  const model='用户模型 $& ${name} / Qwen3';
  assert.equal(translate('ai.primaryWithModel','en',{model}),'Primary · '+model);
  assert.equal(translate('ai.modelsFound','en',{count:37}),'Installed models found: 37. Choose one below.');
  const english=translate('ai.modelsFound','en',{count:37});
  assert.equal(localizeExternal(english,'zh'),translate('ai.modelsFound','zh',{count:37}));
  assert.equal(localizeExternal('Vendor-defined raw detail 具体内容 $&','zh'),'Vendor-defined raw detail 具体内容 $&');
});
test('language switches update runtime labels and optional demos without rewriting stored records', () => {
  environment();setStoredLang('en');const english=demoCourses()[0].moduleName;
  setStoredLang('zh');assert.notEqual(uiText('app.title'),translate('app.title','en'));assert.notEqual(demoCourses()[0].moduleName,english);
  setStoredLang('en');assert.equal(demoCourses()[0].moduleName,english);
  const first=emptyPanelSpec();assert.deepEqual(first,{version:1,title:'',sources:[],blocks:[]});first.sources.push({id:'user',kind:'static',data:[]});assert.deepEqual(emptyPanelSpec().sources,[]);
});
test('date formatting follows the selected locale and handles unavailable dates', () => {
  const instant='2026-10-21T10:00:00Z',opts={timeZone:'UTC',year:'numeric',month:'long',day:'numeric'};
  assert.equal(formatDate(instant,opts,'en'),new Intl.DateTimeFormat('en-GB',opts).format(new Date(instant)));
  assert.equal(formatDate(instant,opts,'zh'),new Intl.DateTimeFormat('zh-CN',opts).format(new Date(instant)));
  assert.equal(formatDate('invalid',opts),'—');
});
test('API requests carry UI language only to this app and preserve method, body and existing headers', async () => {
  environment('zh');applyStoredLang();const calls=[];globalThis.fetch=async(input,init)=>{calls.push({input,init});return new Response('{}');};
  const body=JSON.stringify({title:'原始内容 $&'});await appFetch('/api/chat',{method:'POST',headers:{'x-existing':'keep'},body});
  assert.equal(calls[0].init.headers.get('x-butler-language'),'zh');assert.equal(calls[0].init.headers.get('x-existing'),'keep');assert.equal(calls[0].init.method,'POST');assert.equal(calls[0].init.body,body);
  window.localStorage.getItem=()=>{throw Error('unavailable')};await appFetch('/api/chat');assert.equal(calls.pop().init.headers.get('x-butler-language'),'zh');
  await appFetch('https://provider.example/api/chat',{headers:{'x-existing':'keep'}});assert.deepEqual(calls[1].init.headers,{'x-existing':'keep'});
  await appFetch('http://127.0.0.1:18640.evil.invalid/api/chat');assert.equal(calls[2].init,undefined);
  assert.equal(requestLanguage(new Request('http://localhost/')),'en');
});
test('API localization translates only application errors and keeps payloads, status and streams intact', async () => {
  const en=translate('ai.keyReplacement','en');
  const payload={error:en,message:en,course:{title:en,content:'学校原文'},model:'真实模型 $&',status:'paused'};
  const handler=withUiLanguage(()=>Response.json(payload,{status:422,headers:{'x-preserve':'yes'}}));
  const response=await handler(new Request('http://localhost/api/test',{headers:{'x-butler-language':'zh'}}));const result=await response.json();
  assert.equal(response.status,422);assert.equal(response.headers.get('x-preserve'),'yes');assert.equal(result.error,translate('ai.keyReplacement','zh'));assert.deepEqual(result.course,payload.course);assert.equal(result.model,payload.model);assert.equal(result.status,'paused');
  const stream=new Response('data: raw\n\n',{headers:{'content-type':'text/event-stream'}});assert.equal(await withUiLanguage(()=>stream)(new Request('http://localhost/')),stream);
});
test('generated UI follows the requested language and prohibits fabricated data', () => {
  for(const lang of ['en','zh']) {
    const instruction=generationLanguage(new Request('http://localhost/',{headers:{'x-butler-language':lang}}));
    assert.match(instruction,lang==='en'?/Interface language: English/:/Interface language: Simplified Chinese/);
    assert.match(instruction,/Preserve names/);assert.match(instruction,/Never invent/);assert.match(instruction,/empty data set/);
  }
});
