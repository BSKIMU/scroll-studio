import './test-module-loader.mjs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
const dist=new URL('../dist/',import.meta.url);
registerHooks({resolve(s,c,next){if(s==='three')return{url:new URL('vendor/three.module.js',dist).href,shortCircuit:true};if(s.startsWith('three/addons/'))return{url:new URL('vendor/addons/'+s.slice(13),dist).href,shortCircuit:true};return next(s,c);}});
globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;
const RequestBase=globalThis.Request;globalThis.Request=class extends RequestBase{constructor(input,init){super(typeof input==='string'?new URL(input,'http://localhost/'):input,init);}};
globalThis.fetch=async input=>{const u=new URL(typeof input==='string'?input:input.url);return new Response(await readFile(u.protocol==='file:'?u:new URL(u.pathname.slice(1),dist)));};
const T=await import('three'),api=await import('../dist/mannequin.js'),{loadPoseLab,PoseLabMotion}=await import('../dist/pose-lab-motion.js'),{movementDefaults}=await import('../dist/movement-controller.js');
await api.loadMannequin();const controller=await loadPoseLab(),world=b=>b.getWorldPosition(new T.Vector3());
function closure(figure){
 const bones=figure.userData.motionRig.bones;figure.updateMatrixWorld(true);
 for(const side of ['Left','Right']){
  const wrist=world(bones[side+'Hand']),middle=world(bones[side+'HandMiddle1']),long=middle.clone().sub(wrist).normalize();
  for(const digit of ['Index','Middle','Ring','Pinky']){
   const base=world(bones[side+'Hand'+digit+'1']),tip=world(bones[side+'Hand'+digit+'4']);
   assert(tip.clone().sub(wrist).dot(long)<base.clone().sub(wrist).dot(long)*.83,side+digit+' tip returns toward the palm');
   assert(tip.distanceTo(base)<.065,'Closed tip remains near the palm, not projecting out');
  }
 }
}
function clearance(figure){
 const points={hand:[],leg:[]},v=new T.Vector3();figure.updateMatrixWorld(true);
 figure.userData.motionRig.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const a=mesh.geometry.attributes;
  for(let i=0;i<a.position.count;i++){let hand=0,leg=0;for(let j=0;j<4;j++){const b=mesh.skeleton.bones[a.skinIndex.getComponent(i,j)]?.name||'',w=a.skinWeight.getComponent(i,j);if(b.includes('LeftHand'))hand+=w;if(b.includes('LeftUpLeg'))leg+=w;}
   if(hand<.8&&leg<.8)continue;mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);points[hand>.8?'hand':'leg'].push(v.clone());
  }
 });
 const box=new T.Box3().setFromPoints(points.hand),leg=points.leg.filter(p=>p.y>box.min.y-.01&&p.y<box.max.y+.01&&p.z>box.min.z-.01&&p.z<box.max.z+.01);
 const gap=box.min.x-Math.max(...leg.map(p=>p.x));assert(gap>.004,`Standing fist/thigh clearance ${gap}m`);return gap;
}
for(const model of ['bodykun','bodychan','mixamo']){
 const person={...api.defaultPerson(model),handMode:'manual',hands:{left:100,right:100}},figure=api.mannequin(person,0);closure(figure);
 if(model!=='mixamo')console.log(model,'standing clearance mm',Math.round(clearance(figure)*1000));
 const quats=figure.userData.motionRig.fingers.map(f=>f.bone.quaternion.clone());
 for(let i=0;i<20;i++)api.applyMovementPose(figure,person);
 figure.userData.motionRig.fingers.forEach((f,i)=>assert(f.bone.quaternion.angleTo(quats[i])<1e-6));
 const motion=new PoseLabMotion(controller,figure,person);
 for(let i=0;i<100;i++){motion.update(1/60,{x:0,z:1},movementDefaults,false);closure(figure);}
 motion.freeze();const restored=api.mannequin(JSON.parse(JSON.stringify(person)),0);closure(restored);
 for(const f of figure.userData.motionRig.fingers)assert(f.bone.quaternion.angleTo(restored.userData.motionRig.bones[f.bone.name.replace('mixamorig','')].quaternion)<1e-6);
 // Removing an explicit fist restores the authored motion; a finger override
 // can open only the index without changing the other curled fingers.
 person.fingers={left:{Index:0}};api.applyMovementPose(figure,person);const b=figure.userData.motionRig.bones;
 const wrist=world(b.LeftHand),base=world(b.LeftHandIndex1),tip=world(b.LeftHandIndex4);assert(tip.distanceTo(wrist)>base.distanceTo(wrist));
}
console.log('PASS: closed fingertips, thigh clearance, both hands, walking, overrides, repeat application and saved motion.');

for(const model of ['bodykun','bodychan']){
 const person={...api.defaultPerson(model),hands:{left:100,right:100}},figure=api.mannequin(person,0),motion=new PoseLabMotion(controller,figure,person);
 for(let i=0;i<60;i++)motion.update(1/60,{x:0,z:0},movementDefaults,false);
 console.log(model,'idle relaxed clearance mm',Math.round(clearance(figure)*1000));
 assert(motion.handGrip<26);
 for(let i=0;i<60;i++)motion.update(1/60,{x:0,z:1},movementDefaults,true);
 assert(motion.handGrip>99);closure(figure);
 for(let i=0;i<60;i++)motion.update(1/60,{x:0,z:0},movementDefaults,false);
 assert(motion.handGrip<26);clearance(figure);motion.freeze();
 const restored=api.mannequin(JSON.parse(JSON.stringify(person)),0);clearance(restored);
 for(const f of figure.userData.motionRig.fingers)assert(f.bone.quaternion.angleTo(restored.userData.motionRig.bones[f.bone.name.replace('mixamorig','')].quaternion)<1e-6);
}
console.log('PASS: automatic idle relaxation, thigh clearance, running fist, smooth stop, freeze/reload.');
if(process.argv[2]){
 const project=JSON.parse(await readFile(process.argv[2],'utf8'));
 for(const c of project.cuts)for(const p of c.scene?.people||[]){
  if(!['bodykun','bodychan'].includes(p.model))continue;
  const person={...p,x:0,y:0,z:0,rotation:0,euler:[0,0,0]},figure=api.mannequin(person,0);
  console.log(person.model,'saved legacy idle clearance mm',Math.round(clearance(figure)*1000));
 }
}
