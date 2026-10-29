import './test-module-loader.mjs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
const dist=new URL('../dist/',import.meta.url);
registerHooks({resolve(s,c,next){if(s==='three')return{url:new URL('vendor/three.module.js',dist).href,shortCircuit:true};if(s.startsWith('three/addons/'))return{url:new URL('vendor/addons/'+s.slice(13),dist).href,shortCircuit:true};return next(s,c);}});
globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;
const RequestBase=globalThis.Request;globalThis.Request=class extends RequestBase{constructor(input,init){super(typeof input==='string'?new URL(input,'http://localhost/'):input,init);}};
globalThis.fetch=async input=>{const u=new URL(typeof input==='string'?input:input.url);return new Response(await readFile(u.protocol==='file:'?u:new URL(u.pathname.slice(1),dist)));};
const T=await import('three'),api=await import('../dist/mannequin.js'),{applyHandPose}=await import('../dist/hand-pose.js'),{applyLibraryHand,resetLibraryHand,validHand}=await import('../dist/hand-library-data.js'),{applyEquipmentGrip}=await import('../dist/prop-grip.js'),{loadPoseLab,PoseLabMotion}=await import('../dist/pose-lab-motion.js'),{movementDefaults}=await import('../dist/movement-controller.js');
const catalog=JSON.parse(await readFile(new URL('../dist/assets/libraries/hand/catalog.json',import.meta.url),'utf8'));
assert.equal(catalog.entries.length,500);assert.equal(new Set(catalog.entries.map(e=>e.id)).size,500);assert.equal(new Set(catalog.entries.map(e=>JSON.stringify(e.hands))).size,500);
assert.equal(new Set(catalog.entries.map(e=>e.category)).size,8);
for(const e of catalog.entries){assert(validHand(e.hands.left)&&validHand(e.hands.right));assert(/[가-힣]/.test(e.name));}
await api.loadMannequin();const controller=await loadPoseLab();
for(const model of ['bodykun','bodychan','mixamo']){
 const p=api.defaultPerson(model),figure=api.mannequin(p,0),rig=figure.userData.motionRig;
 const original=new Map(Object.values(rig.bones).map(b=>[b,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}]));
 const immutable=new Map();rig.model.traverse(m=>{if(m.isSkinnedMesh)immutable.set(m,[m.geometry,m.geometry.attributes.skinWeight.array.slice(),m.skeleton.boneInverses.map(x=>x.toArray())]);});
 for(const entry of catalog.entries){
  applyLibraryHand(p,entry);applyHandPose(figure,p);figure.updateMatrixWorld(true);
  for(const [bone,before]of original){assert(bone.position.equals(before.p));assert(bone.scale.equals(before.s));if(!/Hand(Thumb|Index|Middle|Ring|Pinky)[123]$/.test(bone.name))assert(bone.quaternion.equals(before.q),'body and wrist unchanged: '+bone.name);}
  for(const f of rig.fingers){assert(Math.abs(f.bone.quaternion.length()-1)<1e-5);assert(f.bone.getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite));}
 }
 for(const [mesh,[geometry,weights,inverses]]of immutable){assert.equal(mesh.geometry,geometry);assert.deepEqual(mesh.geometry.attributes.skinWeight.array,weights);assert.deepEqual(mesh.skeleton.boneInverses.map(m=>m.toArray()),inverses);}
 // A right-only application leaves the authored left hand intact.
 resetLibraryHand(p);p.motionPose={preserveHands:true};const left=rig.fingers.filter(f=>f.side==='left').map(f=>f.bone.quaternion.clone());
 applyLibraryHand(p,catalog.entries[12],'right');applyHandPose(figure,p);
 rig.fingers.filter(f=>f.side==='left').forEach((f,i)=>assert(f.bone.quaternion.angleTo(left[i])<1e-6));
 const copy=JSON.parse(JSON.stringify(p)),restored=api.mannequin(copy,0);applyHandPose(restored,copy);
 for(const f of rig.fingers.filter(f=>f.side==='right'))assert(f.bone.quaternion.angleTo(restored.userData.motionRig.bones[f.bone.name.replace(/^mixamorig[:_]?/i,'')].quaternion)<1e-6,'saved hand restores');
 delete p.motionPose;const motion=new PoseLabMotion(controller,figure,p);
 for(const entry of catalog.entries.filter((_,i)=>i%64===0)){
  applyLibraryHand(p,entry);applyHandPose(figure,p);const expected=rig.fingers.map(f=>f.bone.quaternion.clone());p.equipment={right:{id:'le6920'},left:{id:'shield'}};
  for(let i=0;i<15;i++){motion.update(1/60,{x:0,z:1},movementDefaults,i>7);applyEquipmentGrip(figure,p);rig.fingers.forEach((f,j)=>assert(f.bone.quaternion.angleTo(expected[j])<1e-6,'walk/run/equipment retains chosen fingers'));}
 }
 motion.freeze();resetLibraryHand(p,'right');assert(!p.handPose.right&&p.handPose.left);resetLibraryHand(p,'left');assert(!p.handPose);
 console.log('PASS:',model,'500 poses, both hands, unchanged body/skin/rig, save, locomotion and equipment');
}
const invalid={};assert.throws(()=>applyLibraryHand(invalid,{hands:{left:{},right:{}}}));assert.deepEqual(invalid,{});
console.log('PASS: 500 unique static CLUTCH poses across 8 categories; invalid data rejected atomically.');
