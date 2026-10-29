import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url);
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
const RequestBase=globalThis.Request;globalThis.Request=class extends RequestBase{constructor(url,init){super(new URL(typeof url==='string'?url:url.url,'http://localhost'),init);}};
const nativeFetch=globalThis.fetch;globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url;if(url.startsWith('data:'))return nativeFetch(input);const p=new URL(typeof input==='string'?input:input.url,'http://localhost').pathname,b=await readFile(new URL('dist/'+(p.includes('/dist/')?p.split('/dist/').at(-1):p.slice(1)),root));return new Response(b,{headers:{'Content-Length':b.length}});};globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;

const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');

const {readdir}=await import('node:fs/promises');
const {instantiateBackground}=await import('../dist/scene-resources.js');
const {normalizeMeleeProp,alignShieldForearm}=await import('../dist/melee-props.js');
const {loadMannequin,mannequin,defaultPerson}=await import('../dist/mannequin.js');
const {gripFrame,placeHeldProp,applyEquipmentGrip}=await import('../dist/prop-grip.js');
const {loadPoseLab,PoseLabMotion}=await import('../dist/pose-lab-motion.js');
const {LibraryMotion}=await import('../dist/pose-library-motion.js');
const sources={};
for(const id of ['shield','long-sword']){
 const bytes=await readFile(new URL('dist/assets/libraries/prop/'+id+'/model.glb',root)),len=bytes.readUInt32LE(12),doc=JSON.parse(bytes.toString('utf8',20,20+len));
 delete doc.images;delete doc.textures;doc.materials=[{}];for(const m of doc.meshes)for(const p of m.primitives)p.material=0;
 doc.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+len).toString('base64');sources[id]=(await new GLTFLoader().parseAsync(JSON.stringify(doc),'')).scene;
}
const clips=[];
const catalog=JSON.parse(await readFile(new URL('dist/assets/libraries/pose/catalog.json',root),'utf8')).entries;
for(const entry of catalog)if(/sword and shield/i.test(entry.name))clips.push({entry,clip:JSON.parse(await readFile(new URL('dist/assets/libraries/pose/clips/'+entry.id+'.json',root),'utf8'))});
assert(clips.length>10);
await loadMannequin();const controller=await loadPoseLab();let samples=0,minClearance=Infinity,maxRotation=0;
for(const model of ['bodychan','bodykun','mixamo'])for(const side of ['left','right']){
 const p=defaultPerson(model);p.equipment={[side]:{id:'shield'}};const f=mannequin(p,0),prop=normalizeMeleeProp(instantiateBackground(sources.shield),'shield',side);f.add(prop);
 const bones=f.userData.motionRig.bones,prefix=side==='left'?'Left':'Right',motion=new PoseLabMotion(controller,f,p);
 const check=label=>{
  applyEquipmentGrip(f,p);const before=new Map(Object.values(bones).map(b=>[b,b.quaternion.clone()]));placeHeldProp(prop,f,side,gripFrame(p,side,'Shield'));
  const anchor=prop.getWorldPosition(new T.Vector3()),original=prop.quaternion.clone();alignShieldForearm(prop,f,side);
  assert(prop.getWorldPosition(new T.Vector3()).distanceTo(anchor)<1e-8,'Handle remains at palm');
  for(const [b,q]of before)assert(q.equals(b.quaternion),'Shield fitting must not change pose bones');
  const elbow=prop.worldToLocal(bones[prefix+'ForeArm'].getWorldPosition(new T.Vector3())),wrist=prop.worldToLocal(bones[prefix+'Hand'].getWorldPosition(new T.Vector3()));
  const clearance=prop.userData.shieldPlateZ-.014*.9-Math.max(elbow.z+.043,wrist.z+.024);
  minClearance=Math.min(minClearance,clearance);maxRotation=Math.max(maxRotation,original.angleTo(prop.quaternion));
  assert(clearance>.002,`${model} ${side} ${label} board clear of forearm centre: ${clearance}`);
  assert(prop.getWorldPosition(new T.Vector3()).distanceTo(bones[prefix+'Hand'].getWorldPosition(new T.Vector3()))<.13,'Attached at hand');
  const settled=prop.quaternion.clone();placeHeldProp(prop,f,side,gripFrame(p,side,'Shield'));alignShieldForearm(prop,f,side);assert(settled.clone().normalize().angleTo(prop.quaternion.clone().normalize())<1e-6,'No cumulative rotation '+settled.angleTo(prop.quaternion));samples++;
 };
 check('stand');for(const {entry,clip}of clips){motion.seated=new LibraryMotion(motion,[{clip}]);for(const time of [0,.2,.4,.6,.8,1]){motion.seated.seek(time);check(entry.name+' '+time);}}
 const rotations=Object.values(bones).map(b=>b.quaternion.toArray());motion.freeze();assert(rotations.length>10);
}
const sourceSize=new T.Box3().setFromObject(sources.shield).getSize(new T.Vector3());assert(Math.abs(sourceSize.x-.62)<.02,'Original shield remains unchanged');
const sword=normalizeMeleeProp(instantiateBackground(sources['long-sword']),'long-sword');const swordSize=new T.Box3().setFromObject(sword).getSize(new T.Vector3());assert(swordSize.z<.05&&swordSize.y>1,'Grip thickness corrected without shortening the blade');
console.log(JSON.stringify({pass:true,clips:clips.length,samples,minPaddedForearmClearance:minClearance,maxFitDegrees:T.MathUtils.radToDeg(maxRotation)}));
