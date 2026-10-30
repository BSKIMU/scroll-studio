import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {checkFigureRig} from './check-figure-rig.mjs';

// Run the real loaders with browser module URLs. Only bundled files under the
// current hosting prefix are served: a request to /assets on a project site fails.
const dist=process.env.SCROLL_VERIFIED_DIST?pathToFileURL(resolve(process.env.SCROLL_VERIFIED_DIST)+'/'):new URL('../dist/',import.meta.url);
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

for(site of process.env.SCROLL_VERIFIED_SITE?[process.env.SCROLL_VERIFIED_SITE]:['http://localhost/','https://bskimu.github.io/scroll-studio/']){
 requests=[];
 const motionSource=readFileSync(new URL('pose-lab-motion.js',dist),'utf8');
 const figureRef=motionSource.match(/from ['"](\.\/mannequin\.js[^'"]*)['"]/)[1];
 const figureAPI=await import(new URL(figureRef,site));
 const {loadMannequin,mannequin,defaultPerson,figureModels}=figureAPI;
 const {loadPoseLab,PoseLabMotion}=await import(new URL('pose-lab-motion.js',site));
 const {loadInteractionClips,sampleInteraction}=await import(new URL('furniture-motion.js',site));
 const {movementDirection,movementDefaults}=await import(new URL('movement-controller.js',site));
 await loadMannequin();
 const controller=await loadPoseLab(),bank=await loadInteractionClips();
 for(const name of ['sit','sit-f1','sit-f2','sit-m1','sit-m2','lie','stairs-up','stairs-ascend','stairs-run','door-in','door-out','kimodo-seat','kimodo-door']){
  const clip=bank?.clips[name];assert.ok(clip?.frames.length,`Missing ${name} interaction`);
  for(const t of [0,.25,.5,1]){const pose=sampleInteraction(clip,t*clip.duration);assert(pose.hip.toArray().every(Number.isFinite));assert.equal(pose.q.length,clip.bones.length);assert(pose.q.every(q=>q.toArray().every(Number.isFinite)&&Math.abs(q.length()-1)<.01),`${name}: valid sampled rotations`);}
 }
 console.log('PASS: all 13 bundled interaction clips and sampled joint rotations');
 const T=await import('three'),{SceneCollision,initCollision}=await import(new URL('scene-collision.js',site));
 const joints=await import(new URL('joint-pose.js',site));
 await initCollision();
 assert.equal(defaultPerson().model,'bodychan');assert.equal(defaultPerson().height,165);
 const skinBounds=figure=>{
  figure.updateMatrixWorld(true);const box=new T.Box3();
  figure.userData.motionRig.model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
  return box;
 };
 for(const model of Object.keys(figureModels)){
 checkFigureRig(T,figureAPI,joints,model);
 // Check rendered feet, not just the physics/root coordinate. Retargeting used
 // to leave BodyChan 14 cm and BodyKun 10 cm above an unchanged Z=0 root.
 for(const scale of [[1,1,1],[1.1,.9,1.05]]){
  const person={...defaultPerson(model),x:1.3,z:-.7,rotation:35,scale},figure=mannequin(person,0);
  const before=skinBounds(figure),position=figure.position.clone(),outerScale=figure.scale.clone();
  const motion=new PoseLabMotion(controller,figure,person);
  assert(figure.position.distanceTo(position)<1e-6,'Starting motion retains scene placement');
  assert(figure.scale.equals(outerScale),'Starting motion retains authored body scale');
  const after=skinBounds(figure);assert(Math.abs(after.min.y)<.005,`${model} soles are grounded on entry: ${after.min.y}`);
  assert(Math.abs(after.max.y-before.max.y)<.04,'Entry does not lift or resize the character');
  motion.freeze();const restored=mannequin(JSON.parse(JSON.stringify(person)),0);
  assert(Math.abs(skinBounds(restored).min.y)<.005,'Frozen pose preserves corrected skin contact');
 }
 for(const key of ['KeyW','KeyA','KeyS','KeyD']){
  const person=defaultPerson(model),figure=mannequin(person,0),motion=new PoseLabMotion(controller,figure,person);
  const direction=movementDirection(new Set([key]),{x:0,z:-1});
  for(let i=0;i<120;i++)motion.update(1/60,direction,movementDefaults,false);
  assert.ok(person.x*direction.x+person.z*direction.z>1,`${key} must move the figure`);
  motion.freeze();
 }
 const distances=[];
 for(const fps of [30,60,144]){
  const person=defaultPerson(model),figure=mannequin(person,0),physics=new SceneCollision(new T.Group(),person);
  const motion=new PoseLabMotion(controller,figure,person,physics);
  for(let i=0;i<fps*2;i++)motion.update(1/fps,{x:0,z:1},movementDefaults,true);
  distances.push(person.z);motion.freeze();physics.dispose();
 }
 assert(Math.max(...distances)-Math.min(...distances)<.005,`${model}: frame rate must not change travel distance`);
 // Irregular display frames must retain one fixed 60 Hz physics cadence.
 // Near-zero remainder casts previously lifted a resting figure 44 cm.
 const frames=[.0334,.0333,.05,.0418,.0416,1/144],still={x:0,z:0};
 const person=defaultPerson(model);let figure=mannequin(person,0);
 for(let session=0;session<3;session++){
  const resume=person.motionPose?.feet,feet=resume?figure.localToWorld(new T.Vector3(...resume)):new T.Vector3(person.x,person.y||0,person.z);
  const physics=new SceneCollision(new T.Group(),{...person,x:feet.x,y:feet.y,z:feet.z});
  const motion=new PoseLabMotion(controller,figure,person,physics);
  let casts=0,elapsed=0;const move=physics.move.bind(physics);
  physics.move=(delta,dt)=>{casts++;assert.equal(dt,1/60,'One fixed collision interval');return move(delta,dt);};
  for(let i=0;i<180;i++){
   elapsed+=frames[i%frames.length];
   motion.update(frames[i%frames.length],still,movementDefaults,false);
   assert.ok(Math.abs(person.y)<.001,`Idle must stay grounded after resume ${session}: ${person.y}`);
  }
  assert.equal(casts,Math.floor(elapsed*60+1e-8),'No duplicate or remainder collision casts');
  physics.move=move;
  for(const key of ['KeyW','KeyA','KeyS','KeyD']){
   const before=figure.position.clone(),direction=movementDirection(new Set([key]),{x:0,z:-1});
   for(let i=0;i<60;i++){
    motion.update(frames[i%frames.length],direction,movementDefaults,session===1);
    assert.ok(Math.abs(person.y)<.001,`${key} must not change ground height: ${person.y}`);
   }
   assert.ok(figure.position.clone().sub(before).dot(new T.Vector3(direction.x,0,direction.z))>1);
  }
  motion.requestJump();let peak=0;
  for(let i=0;i<180;i++){motion.update(frames[i%frames.length],still,movementDefaults,false);peak=Math.max(peak,physics.feet.y);}
  assert.ok(peak>.5,'An intentional jump still leaves the ground');
  assert.ok(physics.grounded&&Math.abs(person.y)<.001,'Jump lands and returns to a stable idle');
  motion.freeze();physics.dispose();
  const pose=Object.fromEntries(Object.entries(figure.userData.motionRig.bones).map(([name,b])=>[name,b.getWorldPosition(new T.Vector3())]));
  figure=mannequin(JSON.parse(JSON.stringify(person)),0);
  for(const [name,b]of Object.entries(figure.userData.motionRig.bones))assert.ok(b.getWorldPosition(new T.Vector3()).distanceTo(pose[name])<1e-5,'Saved motion restores every joint');
 }
 console.log(`PASS: ${model} WASD, running, stable height, jump/landing and 3 saved-pose resumes`);
 }
 const wall=new T.Mesh(new T.BoxGeometry(4,3,.05));wall.position.set(0,1.5,-1);
 const obstacle=new T.Group();obstacle.add(wall);
 const collision=new SceneCollision(obstacle,{height:180,x:0,y:0,z:0});
 for(let i=0;i<180;i++)collision.move(new T.Vector3(0,0,-3.6/60),1/60);
 assert(collision.feet.z>-.9,'60 Hz running cannot cross a thin wall');
 assert(collision.grounded&&Math.abs(collision.feet.y)<.001,'Wall contact remains grounded');
 collision.dispose();
 const steps=new T.Group();
 for(let i=0;i<4;i++){
  const step=new T.Mesh(new T.BoxGeometry(2,(i+1)*.15,.5));
  step.position.set(0,(i+1)*.075,1+i*.5);steps.add(step);
 }
 const stairCollision=new SceneCollision(steps,{height:180,x:0,y:0,z:0});let peak=0;
 for(let i=0;i<120;i++){stairCollision.move(new T.Vector3(0,0,1.3/60),1/60);peak=Math.max(peak,stairCollision.feet.y);}
 assert(peak>.58&&peak<.64,`60 Hz walking climbs ordinary 15 cm steps: ${peak} at ${stairCollision.feet.toArray()}`);
 for(let i=0;i<120;i++)stairCollision.move(new T.Vector3(0,0,-1.3/60),1/60);
 assert(stairCollision.grounded&&Math.abs(stairCollision.feet.y)<.001,'Step descent returns to the floor');
 stairCollision.dispose();
 for(const filename of ['walk-reference.fbx','jump-reference.glb','idle.json','stop.json','run.json','leap.json','leapMirror.json','interaction-clips.json'])assert.ok(requests.some(url=>url.endsWith(filename)),`Loader did not request ${filename}`);
 console.log(`PASS: ${site} bundled loaders, WASD, irregular frame times, jump/landing and repeated pose restore`);
}
