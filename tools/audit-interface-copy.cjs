// Source-level copy audit. Does not open a browser or contact a provider.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const web=path.resolve(__dirname,'../my-app/apps/web'),root=path.join(web,'src'),ts=createRequire(path.join(web,'package.json'))('typescript');
const catalogs=Object.fromEntries(['en','zh'].map(l=>[l,JSON.parse(fs.readFileSync(path.join(root,'lib/locales',l+'.ts'),'utf8').split('export default ')[1].replace(/ as const;\s*$/,''))]));
const failures=[],raw=[],references=new Set();let files=0;
const parameters=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
for(const k of new Set([...Object.keys(catalogs.en),...Object.keys(catalogs.zh)])){
 if(!catalogs.en[k]||!catalogs.zh[k])failures.push({key:k,reason:'Missing language entry'});
 else if(JSON.stringify(parameters(catalogs.en[k]))!==JSON.stringify(parameters(catalogs.zh[k])))failures.push({key:k,reason:'Parameter mismatch'});
}
const technical=new Set(['Butler','B','English','中文','GPU','CPU','RAM','GET','POST','PUT','DELETE','env:KEY','data.items','Brightspace / PoliteMall','Brightspace','DeepSeek','Mistral','Temasek Polytechnic','Republic Polytechnic','Asia/Singapore','UTC','PDF','JSON','URL','API','GGUF','N/A']);
function scan(file){files++;const rel=path.relative(root,file).replaceAll('\\','/'),text=fs.readFileSync(file,'utf8');if(rel.startsWith('lib/locales/'))return;
 const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 function report(node,value){value=value.trim();if(!/[A-Za-z\p{Script=Han}]/u.test(value)||technical.has(value)||/^(https?:\/\/|[A-Z0-9_-]+\.[a-z]+$)/.test(value))return;raw.push({file:rel,line:sf.getLineAndCharacterOfPosition(node.getStart()).line+1,text:value});}
 function visit(n){
  if(ts.isCallExpression(n)&&['uiText','translate','t'].includes(n.expression.getText())&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){
    const k=n.arguments[0].text;references.add(k);
    if(n.expression.getText()==='uiText') { let parent=n.parent,deferred=false;while(parent){if(ts.isFunctionLike(parent)){deferred=true;break;}parent=parent.parent;}if(!deferred)failures.push({file:rel,key:k,reason:'Runtime copy frozen during module initialization'}); }
    if(!catalogs.en[k])failures.push({file:rel,key:k,reason:'Unknown message key'});
    else { const expected=parameters(catalogs.en[k]),argument=n.arguments[n.expression.getText()==='translate'?2:1];
      if(expected.length&&(!argument||ts.isObjectLiteralExpression(argument)&&!argument.properties.some(ts.isSpreadAssignment))){
        const supplied=new Set(argument?argument.properties.map(p=>p.name?.getText().replace(/^["']|["']$/g,'')):[]);
        const missing=expected.filter(p=>!supplied.has(p));if(missing.length)failures.push({file:rel,key:k,reason:'Missing live parameters: '+missing.join(', ')});
      }
    }
  }
  if(ts.isJsxText(n))report(n,n.text.replace(/\s+/g,' '));
  if(ts.isJsxAttribute(n)&&/^(title|placeholder|alt|aria-label|aria-description|tooltip|buttonText|hint|label|desc)$/.test(n.name.getText())&&n.initializer&&ts.isStringLiteral(n.initializer))report(n,n.initializer.text);
  ts.forEachChild(n,visit);
 }visit(sf);
 if(text.includes('"use client"')&&!ts.isExpressionStatement(sf.statements[0]))failures.push({file:rel,reason:'Client directive must precede imports'});
}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.tsx?$/.test(f))scan(f);}}
walk(root);
const result={files,catalogEntries:Object.keys(catalogs.en).length,literalMessageReferences:references.size,failures,rawVisibleCopy:raw,scope:'Application interface, errors, system exports and generated labels. User records, source documents, parser vocabulary, developer comments, AI tool schemas, protocol IDs, brands and explicit optional sample data retain their meaning.'};
console.log(JSON.stringify(result,null,2));if(failures.length||raw.length)process.exitCode=1;
