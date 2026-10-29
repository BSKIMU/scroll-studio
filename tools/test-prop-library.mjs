import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url);
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
const RequestBase=globalThis.Request;globalThis.Request=class extends RequestBase{constructor(url,init){super(new URL(typeof url==='string'?url:url.url,'http://localhost'),init);}};
const nativeFetch=globalThis.fetch;globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url;if(url.startsWith('data:'))return nativeFetch(input);const p=new URL(typeof input==='string'?input:input.url,'http://localhost').pathname,b=await readFile(new URL('dist/'+(p.includes('/dist/')?p.split('/dist/').at(-1):p.slice(1)),root));return new Response(b,{headers:{'Content-Length':b.length}});};globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;

const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
const {loadMannequin,mannequin,defaultPerson}=await import('../dist/mannequin.js');
const {gripFrame,placeHeldProp,motionEquipment,equipmentForMotion,applyEquipmentGrip}=await import('../dist/prop-grip.js');
const {gunProfiles}=await import('../dist/prop-grip-profiles.js');
const {applyGunCarry,normalizeGun,supportGun}=await import('../dist/gun-carry.js');
const {gunBody,gunClearance}=await import('../dist/gun-contact.js');
const normalizedGuns=new Map();
const {equippedWeapon,weaponCombo}=await import('../dist/equipment-motion.js');
const {motionLabel}=await import('../dist/motion-labels.js');
const {backgroundLocked}=await import('../dist/scene-background-lock.js');
const {objectTarget,applyObjectGroups}=await import('../dist/scene-object-transform.js');
const entries=JSON.parse(await readFile(new URL('dist/assets/libraries/prop/catalog.json',root),'utf8')).entries;
assert.equal(entries.length,27);assert.equal(new Set(entries.map(e=>e.id)).size,27);
for(const entry of entries){
 const bytes=await readFile(new URL('dist/assets/libraries/prop/'+entry.id+'/model.glb',root));assert.equal(bytes.toString('ascii',0,4),'glTF');
 const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.toString('utf8',20,20+length));
 assert.ok(doc.meshes.length);assert.ok(doc.accessors.filter(a=>a.type==='VEC3'&&a.min).every(a=>[...a.min,...a.max].every(Number.isFinite)));
 // Geometry-only validation avoids a browser image decoder; embedded textures stay unchanged.
 delete doc.images;delete doc.textures;doc.materials=[{}];for(const mesh of doc.meshes)for(const p of mesh.primitives)p.material=0;
 doc.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
 const model=(await new GLTFLoader().parseAsync(JSON.stringify(doc),'' )).scene;
 const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());assert.ok(Math.abs(Math.max(...size.toArray())-entry.length)<.02,entry.id+' metre scale');
 assert.ok((await readFile(new URL('dist/assets/libraries/prop/'+entry.id+'/thumb.png',root))).length>500);
 if(gunProfiles[entry.id]){const grip=new T.Vector3(...gunProfiles[entry.id].grip),wrapper=normalizeGun(model,entry.id);normalizedGuns.set(entry.id,wrapper);assert.ok(model.localToWorld(grip).length()<1e-5,entry.id+' calibrated grip at origin');assert.ok(new T.Box3().setFromObject(wrapper).getSize(new T.Vector3()).distanceTo(size)<1e-5);}
}
await loadMannequin();
const {loadPoseLab,PoseLabMotion}=await import('../dist/pose-lab-motion.js'),{LibraryMotion}=await import('../dist/pose-library-motion.js');
const attack=JSON.parse(await readFile(new URL('dist/assets/libraries/pose/clips/mixamo-18141ad39f19f6062ade072250b71f88.json',root),'utf8'));
const controller=await loadPoseLab();
for(const model of ['bodychan','bodykun','mixamo']){
 const person=defaultPerson(model);person.x=-1.2;person.rotation=180;person.equipment={right:{id:'viking-axe'}};const figure=mannequin(person,0),prop=new T.Group();figure.add(prop);
 const frame=gripFrame(person,'right','Axe'),motion=new PoseLabMotion(controller,figure,person);motion.seated=new LibraryMotion(motion,[{clip:attack}]);
 for(const t of [0,.25,.5,.75,1]){
  motion.seated.seek(t);const left=figure.userData.motionRig.bones.LeftHandIndex1.quaternion.clone();applyEquipmentGrip(figure,person);placeHeldProp(prop,figure,'right',frame);
  assert.deepEqual(figure.userData.motionRig.bones.LeftHandIndex1.quaternion.toArray(),left.toArray(),'empty hand keeps source motion');
  const hand=figure.userData.motionRig.bones.RightHand,point=prop.getWorldPosition(new T.Vector3()),wrist=hand.getWorldPosition(new T.Vector3());
  assert.ok(point.distanceTo(wrist)<.13,model+' live grip '+t+' '+point.distanceTo(wrist));
 }
 const finger=figure.userData.motionRig.bones.RightHandIndex1;finger.quaternion.identity();person.handMode='manual';applyEquipmentGrip(figure,person);assert.ok(finger.quaternion.angleTo(new T.Quaternion())<1e-7,'manual finger pose wins');motion.freeze();
}
for(const model of ['bodychan','bodykun','mixamo'])for(const side of ['left','right']){
 const person=defaultPerson(model),figure=mannequin(person,0),prop=new T.Group();figure.add(prop);
 for(const category of ['Axe','Sword','Shield','Rifle','Pistol']){
  const frame=gripFrame(person,side,category);assert.ok(frame,model+' hand');
  placeHeldProp(prop,figure,side,frame);const hand=figure.userData.motionRig.bones[(side==='left'?'Left':'Right')+'Hand'];
  assert.ok(prop.getWorldPosition(new T.Vector3()).distanceTo(hand.getWorldPosition(new T.Vector3()))<.13,'grip near hand');
  const local=hand.worldToLocal(prop.getWorldPosition(new T.Vector3()));hand.rotateY(.8);figure.position.add(new T.Vector3(2,0,-3));figure.rotateY(.7);figure.updateMatrixWorld(true);placeHeldProp(prop,figure,side,frame);
  assert.ok(hand.worldToLocal(prop.getWorldPosition(new T.Vector3())).distanceTo(local)<1e-5,'grip follows animated hand');
  assert.ok(Math.abs(prop.getWorldScale(new T.Vector3()).x-person.height/175)<.001,'metre scale independent of rig units');
 }
 const axe=gripFrame(person,side,'Axe'),sword=gripFrame(person,side,'Sword');
 assert.ok(axe.p.distanceTo(sword.p)<1e-8,'axe flip preserves grip');
 assert.ok(new T.Vector3(0,1,0).applyQuaternion(axe.q).distanceTo(new T.Vector3(0,1,0).applyQuaternion(sword.q))<1e-6,'axe flip preserves shaft');
 assert.ok(new T.Vector3(0,0,1).applyQuaternion(axe.q).dot(new T.Vector3(0,0,1).applyQuaternion(sword.q))<-.9999,'axe blade reversed');
}
// Every firearm's fixed ready pose on all three supported bodies.
// Contact anchors must actually lie on the original supplied geometry.
for(const [id,prop]of normalizedGuns){
 const profile=gunProfiles[id];prop.traverse(m=>{if(m.isMesh)m.material.side=T.DoubleSide;});prop.updateMatrixWorld(true);
 const palm=new T.Vector3(...profile.palm),ray=new T.Raycaster(new T.Vector3(-1,palm.y,palm.z),new T.Vector3(1,0,0)),hit=ray.intersectObject(prop,true)[0];
 assert(hit&&hit.point.distanceTo(palm)<.001,id+' palm anchor on handle surface');
 if(!['colt-1911','glock-27','p226','usp'].includes(id)){
  const surface=new T.Vector3(...profile.support);ray.set(new T.Vector3(surface.x,-1,surface.z),new T.Vector3(0,1,0));const h=ray.intersectObject(prop,true)[0];
  assert(h&&h.point.distanceTo(surface)<.001,id+' support anchor on fore-end surface');
 }
}
let readySamples=0;
for(const model of ['bodychan','bodykun','mixamo'])for(const entry of entries.filter(e=>gunProfiles[e.id])){
 const p=defaultPerson(model);p.equipment={right:{id:entry.id}};const f=mannequin(p,0),prop=normalizedGuns.get(entry.id).clone(true);f.add(prop);
 const bones=f.userData.motionRig.bones,pos=b=>b.getWorldPosition(new T.Vector3()),before={};
 for(const side of ['Left','Right'])before[side]=[pos(bones[side+'Arm']).distanceTo(pos(bones[side+'ForeArm'])),pos(bones[side+'ForeArm']).distanceTo(pos(bones[side+'Hand']))];
 applyEquipmentGrip(f,p);placeHeldProp(prop,f,'right',gripFrame(p,'right',entry.category));supportGun(f,p,prop,'right',entry.category,{ready:true});
 assert(gunClearance(prop,gunBody(f,p))>-.004,model+' '+entry.id+' ready torso clearance');
 for(const side of ['Left','Right']){
  const a=pos(bones[side+'Arm']),b=pos(bones[side+'ForeArm']),c=pos(bones[side+'Hand']);
  assert(Math.abs(a.distanceTo(b)-before[side][0])<1e-5&&Math.abs(b.distanceTo(c)-before[side][1])<1e-5,'Ready arm lengths preserved');
  assert(b.y<a.y+.01,model+' '+entry.id+' '+side+' elbow '+b.y+' shoulder '+a.y);
 }
 const palm=pos(bones.LeftHand).lerp(pos(bones.LeftHandMiddle1),.58),target=prop.localToWorld(new T.Vector3(...(gunProfiles[entry.id].support)));
 assert(palm.distanceTo(target)<.02,model+' '+entry.id+' support contact '+palm.distanceTo(target));readySamples++;
}
console.log('Fixed firearm ready poses:',readySamples);
const catalog=JSON.parse(await readFile(new URL('dist/assets/libraries/pose/catalog.json',root),'utf8')).entries;
for(const entry of catalog.filter(e=>e.id.startsWith('mixamo-')))assert.ok(!/[a-z]/i.test(motionLabel(entry)),'Korean label '+entry.name);
for(const side of ['left','right']){const person={equipment:{[side]:{id:'le6920'}}},weapon=equippedWeapon(person,entries),rows=weaponCombo(catalog,[{id:'mixamo-18f60092e065b49a313e739a3aa041bd'}],weapon);assert.ok(rows.length);assert.ok(rows.every(r=>/rifle/i.test(r.name)));assert.equal(person.equipment[side].id,'le6920','Q does not replace firearm');}
const bank={};for(const [kind,id]of Object.entries({idle:'mixamo-bb2f95497a86f89d94078496889ecf82',walk:'mixamo-7a35d5a7501035eff35fa0d825d245b3',run:'mixamo-d1df3a9773f8acc4d38142dc3dacfade'}))bank[kind]=JSON.parse(await readFile(new URL('dist/assets/libraries/pose/clips/'+id+'.json',root),'utf8'));
for(const model of ['bodychan','bodykun','mixamo'])for(const side of ['left','right']){
 const p=defaultPerson(model);p.equipment={[side]:{id:'le6920'}};const f=mannequin(p,0),prop=new T.Group();f.add(prop);const bones=f.userData.motionRig.bones,leg=bones.LeftLeg.quaternion.clone();
 for(const kind of ['idle','walk','run']){
  const m={controller:{layer:{name:kind==='idle'?'idle':'cycle',time:.3},runBlend:kind==='run'?1:0}};applyGunCarry(f,p,m,bank);applyEquipmentGrip(f,p);placeHeldProp(prop,f,side,gripFrame(p,side,'Rifle'));supportGun(f,p,prop,side,'Rifle');
  assert.ok(bones.LeftLeg.quaternion.angleTo(leg)<1e-6,'carry leaves locomotion legs unchanged');
  assert.ok(prop.getWorldPosition(new T.Vector3()).distanceTo(bones[(side==='left'?'Left':'Right')+'Hand'].getWorldPosition(new T.Vector3()))<.13,'gun at palm '+model+' '+side);
  assert.ok([...Object.values(bones)].every(b=>Number.isFinite(b.quaternion.length())),'valid carry pose');
 }
}
assert.equal(motionEquipment({name:'Melee Axe Attack'}).right,'viking-axe');assert.equal(motionEquipment({name:'Sword And Shield'}).left,'shield');
const choices={equipment:{left:{id:'le6920'},right:{id:'colt-1911'}}};
assert.deepEqual(Object.fromEntries(Object.entries(equipmentForMotion(choices,{name:'Sword And Shield Spin'},entries)).map(([s,e])=>[s,e.id])),{right:'long-sword',left:'shield'});
assert.equal(equipmentForMotion(choices,{name:'Axe Attack'},entries).right.id,'viking-axe');
assert.deepEqual(Object.keys(equipmentForMotion(choices,{name:'Shield Block'},entries)),['left']);
const calibrated={id:'le6920',offset:[.01,0,0],rotation:[0,5,0]};assert.deepEqual(equipmentForMotion({equipment:{right:calibrated}},{name:'Firing Rifle'},entries).right,calibrated,'compatible grip settings preserved');
const death=JSON.parse(await readFile(new URL('dist/assets/libraries/pose/clips/mixamo-8b5e7393b606a3d8783d66c409eefdc4.json',root),'utf8'));
for(const model of ['bodychan','bodykun','mixamo'])for(const side of ['right','left']){
 const other=side==='right'?'left':'right',prefix=other==='left'?'Left':'Right',p={...defaultPerson(model),equipment:{[side]:{id:'le6920'}}},f=mannequin(p,0),prop=normalizedGuns.get('le6920').clone(true);f.add(prop);
 const motion=new PoseLabMotion(controller,f,p);motion.seated=new LibraryMotion(motion,[{clip:death}]);
 const bones=f.userData.motionRig.bones,pos=b=>b.getWorldPosition(new T.Vector3());
 for(const t of [0,.25,.5,.75,1]){
  motion.seated.seek(t);p.targets={[other+'Hand']:[2,2,2]};p.joints={[other+'Elbow']:[0,0,0,1]};
  placeHeldProp(prop,f,side,gripFrame(p,side,'Rifle'));const lengths=[pos(bones[prefix+'Arm']).distanceTo(pos(bones[prefix+'ForeArm'])),pos(bones[prefix+'ForeArm']).distanceTo(pos(bones[prefix+'Hand']))];
  supportGun(f,p,prop,side,'Rifle');
  assert.ok(gunClearance(prop,gunBody(f,p))>-.004,`${model} ${side} ${t} stock/receiver clear of padded torso`);
  const thumb=pos(bones[prefix+'HandIndex1']).sub(pos(bones[prefix+'HandPinky1'])).normalize(),barrel=new T.Vector3(0,0,1).applyQuaternion(prop.getWorldQuaternion(new T.Quaternion()));
  assert.ok(thumb.dot(barrel)>.9,'supporting thumb points along barrel, not backwards');
  const palm=pos(bones[prefix+'Hand']).lerp(pos(bones[prefix+'HandMiddle1']),.58),grip=prop.localToWorld(new T.Vector3(...gunProfiles.le6920.support));
  assert.ok(palm.distanceTo(grip)<.018,`${model} ${side} ${t} support palm gap ${palm.distanceTo(grip)}`);
  assert.ok(Math.abs(pos(bones[prefix+'Arm']).distanceTo(pos(bones[prefix+'ForeArm']))-lengths[0])<1e-5,'upper arm not stretched');
  assert.ok(Math.abs(pos(bones[prefix+'ForeArm']).distanceTo(pos(bones[prefix+'Hand']))-lengths[1])<1e-5,`forearm not stretched ${model} ${side} ${t}: ${pos(bones[prefix+'ForeArm']).distanceTo(pos(bones[prefix+'Hand']))-lengths[1]}`);
  const settled=pos(bones[prefix+'Hand']),gunPosition=prop.getWorldPosition(new T.Vector3());
  for(let repeat=0;repeat<12;repeat++){placeHeldProp(prop,f,side,gripFrame(p,side,'Rifle'));supportGun(f,p,prop,side,'Rifle');}
  assert.ok(pos(bones[prefix+'Hand']).distanceTo(settled)<.002,'repainting does not drift hand');
  assert.ok(prop.getWorldPosition(new T.Vector3()).distanceTo(gunPosition)<.002,'repainting does not drift gun');
  p.propHandsLinked=false;const q=bones[prefix+'Arm'].quaternion.clone();prop.position.x+=1;supportGun(f,p,prop,side,'Rifle');assert.deepEqual(q.toArray(),bones[prefix+'Arm'].quaternion.toArray(),'unlink releases support hand');delete p.propHandsLinked;
 }
}
console.log('PASS motion-specific equipment replacement / calibrated grip preservation / linked palms through falling action + edits / unlink / bone lengths');
const env=new T.Group(),prop=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry());prop.add(mesh);env.add(prop);const editor={environment:env,figures:new T.Group(),state:{backgroundLocked:true,look:{objectGroups:{test:{position:[1,2,3],rotation:[0,0,0],scale:[1,1,1]}}}},props:{items:[{root:prop,data:{id:'test'}}]},advanced:{meshes:[mesh]}};
assert.equal(backgroundLocked(editor,env),true);assert.equal(backgroundLocked(editor,mesh),false);assert.equal(objectTarget(editor,mesh).kind,'prop');applyObjectGroups(editor);assert.deepEqual(prop.position.toArray(),[1,2,3]);
console.log('PASS: 27 prop assets/scale/thumbnails, both hands on 3 rigs, live attack attachment/hand grip, animated transforms, motion mapping, independent selection and persisted placement');

const {normalizeFirearmHands}=await import('../dist/prop-equipment.js');
const legacy={equipment:{left:{id:'le6920',offset:[.1,0,0],rotation:[0,90,0]},right:{id:'long-sword'}}};
assert(normalizeFirearmHands(legacy));assert.deepEqual(Object.keys(legacy.equipment),['right']);assert.equal(legacy.equipment.right.id,'le6920');assert.deepEqual(legacy.equipment.right.offset,[0,0,0]);assert(!normalizeFirearmHands(legacy));
const shieldOnly={equipment:{left:{id:'shield'}}};assert(!normalizeFirearmHands(shieldOnly));assert.equal(shieldOnly.equipment.left.id,'shield');
console.log('PASS fixed firearm handedness / legacy migration / melee side preserved');
