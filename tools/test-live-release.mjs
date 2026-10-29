import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Fetch the real Pages responses, compare every byte to the published commit,
// then run the real GLB/FBX loaders and motion engine on that verified snapshot.
const root=resolve(import.meta.dirname,'..'),site=new URL(process.argv[2]||'https://bskimu.github.io/scroll-studio/');
assert(site.protocol==='https:'&&site.pathname.endsWith('/'));
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const output=resolve(root,process.argv[3]||'local/live-release-'+commit.slice(0,12));
assert(!existsSync(output),'Use a fresh output directory for live verification');
async function download(path){
 const url=new URL(path,site);assert.equal(url.origin,site.origin);assert(url.pathname.startsWith(site.pathname));url.searchParams.set('verify',commit);
 for(let i=0;i<3;i++)try{const r=await fetch(url,{signal:AbortSignal.timeout(90000)});assert(r.ok,`${path}: HTTP ${r.status}`);return Buffer.from(await r.arrayBuffer());}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,1000));}
}
const manifest=JSON.parse(await download('release.json'));assert.equal(manifest.commit,commit,'Pages must serve the requested commit');
// Pages consumes .nojekyll as deployment metadata and does not serve it.
const entries=Object.entries(manifest.files||{}).filter(([name])=>name!=='.nojekyll');assert(entries.length>200,'Release must include its full integrity inventory');
mkdirSync(output,{recursive:true});let count=0,total=0,index=0;
const hash=b=>createHash('sha256').update(b).digest('hex');
async function worker(){while(index<entries.length){
 const [name,info]=entries[index++];assert(!name.includes('\\')&&!name.split('/').includes('..'));const path=resolve(output,name);assert(path.startsWith(output+sep));
 const bytes=await download(name);assert.equal(bytes.length,info.bytes,name+' length');assert.equal(hash(bytes),info.sha256,name+' remote digest');
 if(name!=='.nojekyll'){
  let original=execFileSync('git',['show',`HEAD:dist/${name}`],{cwd:root,maxBuffer:64*1024*1024,windowsHide:true});
  if(['.js','.css','.html'].includes(extname(name)))original=Buffer.from(original.toString('utf8').replace(/\?v=[\w.-]+/g,`?v=gh-${commit}`));
  assert.equal(hash(original),info.sha256,name+' differs from the committed local version');
 }
 mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes);total+=bytes.length;count++;
 if(count%40===0)console.log(`Verified HTTPS responses: ${count}/${entries.length}`);
}}
await Promise.all(Array.from({length:4},worker));
writeFileSync(resolve(output,'release.json'),JSON.stringify(manifest,null,2));
console.log(`PASS: ${count} live HTTPS files (${(total/1048576).toFixed(1)} MiB) match commit ${commit}`);
for(const test of ['test-hosted-motion','test-runtime-libraries']){
 const result=spawnSync(process.execPath,[`tools/${test}.mjs`],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,SCROLL_VERIFIED_SITE:site.href,SCROLL_VERIFIED_DIST:output}});
 assert.equal(result.status,0,`${test} on downloaded release bytes`);
}
writeFileSync(resolve(output,'verification.json'),JSON.stringify({site:site.href,commit,verifiedAt:new Date().toISOString(),files:count,bytes:total,motion:'passed',source:'HTTPS downloads; no local asset fallback'},null,2));
console.log('PASS: live release integrity, three rigs, locomotion, 362 library motions, 27 props and 500 hand poses');
