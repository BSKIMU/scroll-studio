// Usage: node tools/test-character-library.mjs <prepared character folder> [...]
// Reads generated fixture outputs; tests the real mannequin and movement runtime.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url),folders=process.argv.slice(2);
assert.ok(folders.length,'Pass an isolated generated character fixture folder.');
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
const entries=[],files=new Map();
for(const [i,folder]of folders.entries()){
 const entry=JSON.parse(await readFile(resolve(folder,'entry.json'),'utf8')),key=String(i+1).padStart(32,'0');
 entry.id='custom-'+key;entry.url='/api/character-library/'+key+'/model.glb';entries.push(entry);files.set(entry.url,resolve(folder,'model.glb'));
}
const BaseRequest=globalThis.Request,nativeFetch=globalThis.fetch;
globalThis.Request=class extends BaseRequest{constructor(url,init){super(new URL(typeof url==='string'?url:url.url,'http://localhost'),init);}};
globalThis.fetch=async input=>{const raw=typeof input==='string'?input:input.url;if(raw.startsWith('data:'))return nativeFetch(input);const p=new URL(raw,'http://localhost').pathname;if(p==='/api/character-library/catalog')return Response.json({available:true,entries});const bytes=await readFile(files.get(p)||new URL('dist/'+(p.includes('/dist/')?p.split('/dist/').at(-1):p.slice(1)),root));return new Response(bytes,{headers:{'Content-Length':bytes.length}});};
globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;
const T=await import('three');
const {loadMannequin,mannequin,defaultPerson,registerCharacter}=await import('../dist/mannequin.js');
const {loadPoseLab,PoseLabMotion}=await import('../dist/pose-lab-motion.js');
assert.throws(()=>registerCharacter({id:'custom-../private',url:'/private.glb'}));
await loadMannequin(entries.map(entry=>({model:entry.id})));
const controller=await loadPoseLab();
for(const entry of entries){
 const person=defaultPerson(entry.id),figure=mannequin(person,0),rig=figure.userData.motionRig;
 assert.ok(rig.bones.Hips&&rig.bones.LeftHand&&rig.bones.RightFoot);
 let weighted=0;
 figure.traverse(o=>{if(!o.isSkinnedMesh)return;const weights=o.geometry.attributes.skinWeight;assert.ok(weights?.count);for(let i=0;i<weights.count;i++){const sum=weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i);assert.ok(Math.abs(sum-1)<.015,'normalized skin weights');}weighted+=weights.count;});
 assert.ok(weighted>0);
 const original=rig.bones.LeftLeg.quaternion.clone(),motion=new PoseLabMotion(controller,figure,person);
 let rotation=0;
 for(let frame=0;frame<90;frame++){
  motion.update(1/60,new T.Vector3(0,0,-1),{walk:1.3,run:3.6},false);
  rotation=Math.max(rotation,original.angleTo(rig.bones.LeftLeg.quaternion));
  for(const bone of Object.values(rig.bones))assert.ok([...bone.position.toArray(),...bone.quaternion.toArray()].every(Number.isFinite));
 }
 assert.ok(rotation>.05,'walk changes actual leg rotations');assert.ok(Math.hypot(person.x,person.z)>.2,'WASD movement changes world location');
 figure.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i+=97){const v=o.localToWorld(o.getVertexPosition(i,new T.Vector3()));assert.ok(v.toArray().every(Number.isFinite)&&v.length()<10,'finite deformed world vertices: '+v.toArray());}});
 motion.freeze();const saved=JSON.parse(JSON.stringify(person)),restored=mannequin(saved,0);
 for(const [name,bone]of Object.entries(rig.bones)){const other=restored.userData.motionRig.bones[name];assert.ok(bone.quaternion.toArray().every((v,i)=>Math.abs(v-other.quaternion.toArray()[i])<1e-5),'saved joint restored: '+name);}
 console.log('PASS',entry.kind,entry.bones+' bones',weighted+' weighted vertices','walk + saved pose');
}
