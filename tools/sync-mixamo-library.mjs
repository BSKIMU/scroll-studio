// Convert the personal FBX collection to bounded, lazy-loaded animation samples.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url);
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};
globalThis.self=globalThis;
const {importFBX}=await import('../dist/pose-library-import.js');
const {classifyMotion}=await import('../dist/pose-library-taxonomy.js');
const source=resolve(process.argv[2]||'D:/_codex/mixamo pose');
const library=new URL('local/pose-library/',root);
let imported=0,skipped=0;const failed=[],metadata=new Map();
async function collect(folder){const result=[];for(const item of await readdir(folder,{withFileTypes:true})){if(item.name==='_archives')continue;const path=join(folder,item.name);if(item.isDirectory())result.push(...await collect(path));else if(item.name==='mixamo-pack.json'){const data=JSON.parse(await readFile(path,'utf8'));for(const entry of data.entries)metadata.set(resolve(source,entry.file),entry);}else if(/\.fbx$/i.test(item.name))result.push(path);}return result;}
const files=await collect(source);
for(const file of files){
 try{
  const bytes=await readFile(file);if(bytes.length>40*1024*1024)throw Error('FBX exceeds 40 MB');
  const hash=createHash('sha256').update(bytes).digest('hex'),id='mixamo-'+hash.slice(0,32),folder=new URL(id+'/',library);
  try{await readFile(new URL('clip.json',folder));skipped++;continue;}catch{}
  const info=metadata.get(file)||{name:file.split(/[\\/]/).at(-1).replace(/\.fbx$/i,'')};
  const clip=await importFBX(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{name:info.name,yieldFrame:async()=>{}});
  const entry=classifyMotion({id,name:info.name,genre:info.genre,subcategory:info.subcategory,pack:info.pack,duration:clip.duration,kind:'motion',source:'Mixamo · 개인 보관',local:true,sourceFile:file,sha256:hash});
  await mkdir(folder,{recursive:true});await writeFile(new URL('clip.json',folder),JSON.stringify(clip));await writeFile(new URL('entry.json',folder),JSON.stringify(entry,null,2));imported++;
 }catch(e){failed.push({file,error:e.message});}
}
const report={files:files.length,imported,skipped,failed};
await mkdir(new URL('local/pose-library-validation/',root),{recursive:true});
await writeFile(new URL('local/pose-library-validation/mixamo-sync.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));if(failed.length)process.exitCode=1;
