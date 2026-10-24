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
 const T=await import('three'),{SceneCollision,initCollision}=await import(new URL('scene-collision.js',site));
 await initCollision();
 // Real browser frame times straddle the 120 Hz physics interval. Fixed 60 Hz
 // tests missed a near-zero remainder cast that lifted a resting figure 44 cm.
 const frames=[.0334,.0333,.05,.0418,.0416,1/144],still={x:0,z:0};
 const person=defaultPerson();let figure=mannequin(person,0);
 for(let session=0;session<3;session++){
  const resume=person.motionPose?.feet,feet=resume?figure.localToWorld(new T.Vector3(...resume)):new T.Vector3(person.x,person.y||0,person.z);
  const physics=new SceneCollision(new T.Group(),{...person,x:feet.x,y:feet.y,z:feet.z});
  const motion=new PoseLabMotion(controller,figure,person,physics);
  for(let i=0;i<180;i++){
   motion.update(frames[i%frames.length],still,movementDefaults,false);
   assert.ok(Math.abs(person.y)<.001,`Idle must stay grounded after resume ${session}: ${person.y}`);
  }
  for(const key of ['KeyW','KeyA','KeyS','KeyD']){
   const before=figure.position.clone(),direction=movementDirection(new Set([key]),{x:0,z:-1});
   for(let i=0;i<60;i++){
    motion.update(frames[i%frames.length],direction,movementDefaults,false);
    assert.ok(Math.abs(person.y)<.001,`${key} must not change ground height: ${person.y}`);
   }
   assert.ok(figure.position.clone().sub(before).dot(new T.Vector3(direction.x,0,direction.z))>1);
  }
  motion.requestJump();let peak=0;
  for(let i=0;i<180;i++){motion.update(frames[i%frames.length],still,movementDefaults,false);peak=Math.max(peak,physics.feet.y);}
  assert.ok(peak>.5,'An intentional jump still leaves the ground');
  assert.ok(physics.grounded&&Math.abs(person.y)<.001,'Jump lands and returns to a stable idle');
  motion.freeze();physics.dispose();figure=mannequin(person,0);
 }
 for(const filename of ['walk-reference.fbx','jump-reference.glb','idle.json','stop.json','run.json','leap.json','leapMirror.json','interaction-clips.json'])assert.ok(requests.some(url=>url.endsWith(filename)),`Loader did not request ${filename}`);
 console.log(`PASS: ${site} bundled loaders, WASD, irregular frame times, jump/landing and repeated pose restore`);
}
