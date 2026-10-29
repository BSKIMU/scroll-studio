import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url);
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
const RequestBase=globalThis.Request;globalThis.Request=class extends RequestBase{constructor(url,init){super(new URL(typeof url==='string'?url:url.url,'http://localhost'),init);}};
globalThis.fetch=async input=>{const p=new URL(typeof input==='string'?input:input.url,'http://localhost').pathname,b=await readFile(new URL('dist/'+(p.includes('/dist/')?p.split('/dist/').at(-1):p.slice(1)),root));return new Response(b,{headers:{'Content-Length':b.length}});};globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;
const T=await import('three'),{compileCombo,sampleCombo,validateMotion,LibraryMotion}=await import('../dist/pose-library-motion.js'),{loadMannequin,mannequin,defaultPerson}=await import('../dist/mannequin.js'),{loadPoseLab,PoseLabMotion}=await import('../dist/pose-lab-motion.js');
const bank=JSON.parse(await readFile(new URL('dist/assets/interaction-clips.json',root),'utf8'));
const clips=['stairs-up','stairs-run','door-in','sit'].map(id=>bank.clips[id]);
for(const clip of clips)validateMotion(clip);
assert.throws(()=>validateMotion({...clips[0],duration:NaN}));assert.throws(()=>compileCombo([]));
const items=clips.map((clip,i)=>({clip,name:clip.label,speed:i===1?1.5:1,blend:.22,start:0,end:Math.min(clip.duration,2)}));
const combo=compileCombo(items);assert.equal(combo.segments.length,4);
for(const s of combo.segments.slice(1)){
 for(const at of [s.at,s.at+s.overlap]){const a=sampleCombo(combo,at-1e-5),b=sampleCombo(combo,at+1e-5);assert.ok(a.hip.distanceTo(b.hip)<.001,'root continuous at both blend boundaries');for(const [name,q]of a.q)assert.ok(q.angleTo(b.q.get(name))<.01,'rotation continuous at blend boundary');}
}
await loadMannequin();const controller=await loadPoseLab();
for(const model of ['bodychan','bodykun','mixamo']){
 const person=defaultPerson(model),figure=mannequin(person,0),motion=new PoseLabMotion(controller,figure,person),before=motion.pairs.map(([,b])=>({name:b.name,parent:b.parent.name}));
 motion.seated=new LibraryMotion(motion,items);
 for(const t of [0,.15,.4,.65,.95,1]){motion.seated.seek(t);assert.ok(motion.pairs.every(([,b])=>b.position.toArray().every(Number.isFinite)&&Math.abs(b.quaternion.length()-1)<.001),'finite rig throughout combo');}
 const point=name=>figure.userData.motionRig.bones[name].getWorldPosition(new T.Vector3());const head=point('Head');motion.seated.paused=false;motion.seated.update(.1);assert.equal(motion.seated.paused,true,'finished combo holds last pose');assert.ok(point('Head').distanceTo(head)<1e-6,'no rest-pose snap at end');
 motion.freeze();assert.equal(person.motionPose.preserveHands,true);const restored=mannequin(JSON.parse(JSON.stringify(person)),0);restored.updateMatrixWorld(true);
 for(const name of ['Hips','Head','LeftHand','LeftFoot','LeftHandIndex1']){if(!figure.userData.motionRig.bones[name])continue;assert.ok(restored.userData.motionRig.bones[name].getWorldPosition(new T.Vector3()).distanceTo(point(name))<1e-4,model+' frozen '+name);}
 assert.deepEqual(motion.pairs.map(([,b])=>({name:b.name,parent:b.parent.name})),before,'skeleton hierarchy unchanged');
}
const {LiveComboMotion}=await import('../dist/live-combo-motion.js');
const swordIds=['mixamo-18f60092e065b49a313e739a3aa041bd','mixamo-a8b946aa89d249353d52b21d32e4e26c','mixamo-224f5bc6acaa8426d571c59608e9ae56'];
const attacks=await Promise.all(swordIds.map(async(id,i)=>({name:'검격 '+(i+1),clip:JSON.parse(await readFile(new URL('dist/assets/libraries/pose/clips/'+id+'.json',root))),blend:.18})));
for(const model of ['bodychan','bodykun','mixamo']){
 const person={...defaultPerson(model),x:2,z:-3,rotation:57},figure=mannequin(person,0),motion=new PoseLabMotion(controller,figure,person);
 const displayed=Object.values(figure.userData.motionRig.bones);
 const points=()=>displayed.map(b=>({p:b.getWorldPosition(new T.Vector3()),q:b.getWorldQuaternion(new T.Quaternion()).normalize()}));
 const previous=points(),live=motion.seated=new LiveComboMotion(motion,attacks);
 live.enqueue();live.update(0);
 points().forEach((b,i)=>{assert.ok(b.p.distanceTo(previous[i].p)<1e-5,model+' no starting translation snap');assert.ok(b.q.angleTo(previous[i].q)<1e-5,model+' no starting rotation snap '+displayed[i].name+' '+b.q.angleTo(previous[i].q));});
 assert.equal(live.hits,1);for(let i=0;i<3;i++)assert.equal(live.enqueue(),true);assert.equal(live.enqueue(),false,'buffer capped at 3 future attacks');
 live.update(live.exitAt-.00001);const before=points();live.update(.00002);assert.equal(live.hits,2);
 points().forEach((b,i)=>{assert.ok(b.p.distanceTo(before[i].p)<.002,model+' root/joints continuous on buffered transition');assert.ok(b.q.angleTo(before[i].q)<.005,model+' no rotation pop on transition');});
 live.update(30);assert.equal(live.hits,4);assert.equal(live.finished,true);assert.equal(live.current.index,0,'attack sequence wraps');
 const held=points();live.update(10);points().forEach((b,i)=>assert.ok(b.p.distanceTo(held[i].p)<1e-6,'last pose held without input'));
 live.enqueue();live.update(.00001);points().forEach((b,i)=>assert.ok(b.p.distanceTo(held[i].p)<.002,model+' restart blends from held pose'));
 live.queue=[];live.update(live.duration*.9);const late=points(),oldTime=live.time;assert.ok(oldTime>live.exitAt);live.enqueue();live.update(.00001);
 assert.equal(live.hits,6);points().forEach((b,i)=>assert.ok(b.p.distanceTo(late[i].p)<.002,model+' late input never rewinds the outgoing attack'));
 for(let i=0;i<180;i++){live.update(1/60);assert.ok(motion.pairs.every(([,b])=>b.position.toArray().every(Number.isFinite)&&Math.abs(b.quaternion.length()-1)<.001),'finite live rig');}
 motion.freeze();const restored=mannequin(JSON.parse(JSON.stringify(person)),0);figure.updateMatrixWorld(true);restored.updateMatrixWorld(true);
 for(const name of ['Hips','Head','LeftHand','RightFoot'])assert.ok(restored.userData.motionRig.bones[name].getWorldPosition(new T.Vector3()).distanceTo(figure.userData.motionRig.bones[name].getWorldPosition(new T.Vector3()))<1e-4,model+' Q frozen pose survives reload');
}
console.log('PASS: Q buffer cap, initial/blended/late-input continuity, three sword clips × three rigs, sequence wrap, final hold, frozen-pose restore');
const {importFBX}=await import('../dist/pose-library-import.js');
const bytes=await readFile(new URL('dist/assets/pose-lab/walk-reference.fbx',root));const imported=await importFBX(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{name:'계단 가져오기 검증',yieldFrame:async()=>{}});assert.ok(imported.frames.length>20);assert.ok(imported.bones.includes('LeftHand'));assert.ok(imported.legLength>.3&&imported.legLength<1.3);
console.log('PASS: FBX import, bounded validation, four-clip root/rotation continuity, trim/speed, three body rigs, final hold, frozen-pose round trip, unchanged skeleton');
if(process.argv[2]){
 const {resolve}=await import('node:path'),generated=validateMotion(JSON.parse(await readFile(resolve(process.argv[2],'clip.json'),'utf8')));
 for(const model of ['bodychan','bodykun','mixamo']){
  const person=defaultPerson(model),figure=mannequin(person,0),motion=new PoseLabMotion(controller,figure,person);
  motion.seated=new LibraryMotion(motion,[{name:generated.label,clip:generated}]);
  for(let i=0;i<generated.frames.length;i++){
   motion.seated.seek(i/(generated.frames.length-1));
   for(const [,b]of motion.pairs){assert.ok(b.getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite),model+' generated position');assert.ok(Math.abs(b.quaternion.length()-1)<.001,model+' generated rotation');}
  }
  motion.freeze();const restored=mannequin(JSON.parse(JSON.stringify(person)),0);restored.updateMatrixWorld(true);
  for(const name of ['Hips','Head','LeftHand','RightHand','LeftFoot','RightFoot'])assert.ok(restored.userData.motionRig.bones[name].getWorldPosition(new T.Vector3()).distanceTo(figure.userData.motionRig.bones[name].getWorldPosition(new T.Vector3()))<1e-4,model+' generated pose restored');
 }
 console.log('PASS: actual MotionBricks result, every frame retargeted to male/female/Mixamo, frozen pose restored');
}
