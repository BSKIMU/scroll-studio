import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url);
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
const RequestBase=globalThis.Request;globalThis.Request=class extends RequestBase{constructor(url,init){super(new URL(typeof url==='string'?url:url.url,'http://localhost'),init);}};
globalThis.fetch=async input=>{const p=new URL(typeof input==='string'?input:input.url,'http://localhost').pathname,b=await readFile(new URL('dist/'+(p.includes('/dist/')?p.split('/dist/').at(-1):p.slice(1)),root));return new Response(b,{headers:{'Content-Length':b.length}});};globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;
const T=await import('three'),{compileCombo,sampleCombo,validateMotion,LibraryMotion}=await import('../dist/pose-library-motion.js'),{loadMannequin,mannequin,defaultPerson}=await import('../dist/mannequin.js'),{loadPoseLab,PoseLabMotion}=await import('../dist/pose-lab-motion.js');
const bank=JSON.parse(await readFile(new URL('dist/assets/interaction-clips.json',root),'utf8'));
await loadMannequin();const controller=await loadPoseLab(),point=new T.Vector3();
for(const model of ['bodychan','bodykun','mixamo']){
 const person={...defaultPerson(model),x:2,y:.35,z:-1,rotation:28},figure=mannequin(person,0),motion=new PoseLabMotion(controller,figure,person);
 const meshes=[];motion.rig.object.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
 const exactBottom=()=>{let y=Infinity;for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++)y=Math.min(y,mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).y);return y;};
 for(const id of ['lie','stairs-up','stairs-run']){
  const clip=bank.clips[id],floor=motion.rig.root.position.y,play=motion.seated=new LibraryMotion(motion,[{clip}]);
  for(let i=0;i<=16;i++){play.seek(i/16);const gap=exactBottom()-floor;assert.ok(gap>-.012&&gap<.003,`${model} ${id} frame ${i}: floor gap ${gap}`);assert.ok(Math.abs(figure.position.y-floor)<1e-6,'placement remains unchanged');}
  const hip=motion.rig.pelvis.getWorldPosition(new T.Vector3()),raised={...clip,frames:clip.frames.map(f=>({...f,hip:[f.hip[0],f.hip[1]+2,f.hip[2]]}))};
  motion.rig.root.position.copy(play.position); // Compare both sources at the same placement, independent of the travelling editor pivot.
  motion.seated=new LibraryMotion(motion,[{clip:raised}]);motion.seated.seek(1);assert.ok(motion.rig.pelvis.getWorldPosition(new T.Vector3()).distanceTo(hip)<1e-5,'source origin height does not float the model');
  motion.freeze();const copy=mannequin(JSON.parse(JSON.stringify(person)),0);copy.updateMatrixWorld(true);for(const name of ['Hips','Head','LeftFoot'])assert.ok(copy.userData.motionRig.bones[name].getWorldPosition(new T.Vector3()).distanceTo(figure.userData.motionRig.bones[name].getWorldPosition(new T.Vector3()))<1e-4,'grounded pose persists');
 }
 const jump={...bank.clips['stairs-up'],label:'Jump',frames:bank.clips['stairs-up'].frames.map(f=>({...f,hip:[f.hip[0],f.hip[1]+1,f.hip[2]]}))};
 motion.seated=new LibraryMotion(motion,[{clip:jump}]);motion.seated.seek(.5);assert.ok(exactBottom()>1,'airborne clips are not flattened');
 console.log('PASS',model,'lying / stairs at 17 times, source elevation, explicit placement, freeze, jump preserved');
}
