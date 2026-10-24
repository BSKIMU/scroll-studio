import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';

// Run the real loaders with browser module URLs. Only bundled files under the
// current hosting prefix are served: a request to /assets on a project site fails.
const dist=new URL('../dist/',import.meta.url);
let site,requests;
function localFile(url){
 const parsed=new URL(url),base=new URL(site);
 assert.equal(parsed.origin,base.origin,'Assets remain on the hosting origin');
 assert.ok(parsed.pathname.startsWith(base.pathname),`Asset escaped the project path: ${url}`);
 return new URL(parsed.pathname.slice(base.pathname.length),dist);
}
registerHooks({
 resolve(specifier,context,next){
  if(specifier==='three')return {url:new URL('vendor/three.module.js',site).href,shortCircuit:true};
  if(specifier.startsWith('three/addons/'))return {url:new URL('vendor/addons/'+specifier.slice(13),site).href,shortCircuit:true};
  if(/^https?:/.test(specifier))return {url:specifier,shortCircuit:true};
  if(/^https?:/.test(context.parentURL||'')&&specifier.startsWith('.'))return {url:new URL(specifier,context.parentURL).href,shortCircuit:true};
  return next(specifier,context);
 },
 load(url,context,next){
  if(/^https?:/.test(url))return {format:'module',source:readFileSync(localFile(url),'utf8'),shortCircuit:true};
  return next(url,context);
 }
});
const NativeRequest=globalThis.Request;
globalThis.Request=class extends NativeRequest{constructor(input,init){super(typeof input==='string'?new URL(input,site):input,init);}};
globalThis.fetch=async input=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,site);
 requests.push(url.href);
 const bytes=readFileSync(localFile(url));
 return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});
};
globalThis.ProgressEvent=class{constructor(type,values){this.type=type;Object.assign(this,values);}};
globalThis.self=globalThis;

for(site of ['http://localhost/','https://bskimu.github.io/scroll-studio/']){
 requests=[];
 const {loadMannequin,mannequin,defaultPerson}=await import(new URL('mannequin.js?v=20261025-release1',site));
 const {loadPoseLab,PoseLabMotion}=await import(new URL('pose-lab-motion.js',site));
 const {loadInteractionClips}=await import(new URL('furniture-motion.js',site));
 const {movementDirection,movementDefaults}=await import(new URL('movement-controller.js',site));
 await loadMannequin();
 const controller=await loadPoseLab(),bank=await loadInteractionClips();
 for(const name of ['sit','lie','stairs-up','door-in','door-out'])assert.ok(bank?.clips[name]?.frames.length,`Missing ${name} interaction`);
 for(const key of ['KeyW','KeyA','KeyS','KeyD']){
  const person=defaultPerson(),figure=mannequin(person,0),motion=new PoseLabMotion(controller,figure,person);
  const direction=movementDirection(new Set([key]),{x:0,z:-1});
  for(let i=0;i<120;i++)motion.update(1/60,direction,movementDefaults,false);
  assert.ok(person.x*direction.x+person.z*direction.z>1,`${key} must move the figure`);
  motion.freeze();
 }
 for(const filename of ['walk-reference.fbx','jump-reference.glb','idle.json','stop.json','run.json','leap.json','leapMirror.json','interaction-clips.json'])assert.ok(requests.some(url=>url.endsWith(filename)),`Loader did not request ${filename}`);
 console.log(`PASS: ${site} bundled loaders, four movement directions and interaction clips`);
}
