import {updatePhone} from './scene-phone.js?v=20261025-release1';
import {jointBones,limitJoint} from './joint-pose.js?v=20261025-release1';
import {createHandRig,applyHandPose,applyFigureTransform,automaticHands,clearIdleHands} from './hand-pose.js?v=20261029-hands2';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {solveLimb} from './pose-math.js?v=20261025-release1';
export const figureModels={bodychan:'여성',bodykun:'남성',mixamo:'Mixamo'};
export const figureHeights={bodychan:165,bodykun:180,mixamo:175};
export const customFigures=new Map();
let catalogPending;
export function registerCharacter(entry){
 if(!/^custom-[a-f0-9]{32}$/.test(entry?.id)||entry.url!==`/api/character-library/${entry.id.slice(7)}/model.glb`)throw Error('캐릭터 경로가 올바르지 않습니다.');
 customFigures.set(entry.id,entry);figureModels[entry.id]=String(entry.name).slice(0,100);figureHeights[entry.id]=175;
}
export async function refreshCharacterCatalog(){
 if(!catalogPending)catalogPending=fetch('/api/character-library/catalog').then(r=>{if(!r.ok)throw Error('local only');return r.json();}).then(data=>{for(const entry of data.entries||[])registerCharacter(entry);return data;}).catch(()=>({available:false,entries:[]})).finally(()=>{catalogPending=null;});
 return catalogPending;
}
const templates=new Map(),pending=new Map();
export const hasFigureModel=p=>Object.hasOwn(figureModels,p?.model);
export const defaultPerson=(model='bodychan')=>({model,x:0,z:0,rotation:0,height:figureHeights[model],pose:'stand'});
export function seedFigure(c){if(!c.scene.people.length){c.scene.people=[defaultPerson()];if(c.scene.asset==='empty'){c.scene.camera=[.3,1.2,2.8];c.scene.target=[0,.9,0];}}return c;}
export function setFigureModel(person,model){
 if(!Object.hasOwn(figureModels,model)||person.model===model)return false;
 person.model=model;person.height=figureHeights[model];person.pose='stand';
 // Frozen local transforms belong to their original skeleton and proportions.
 for(const key of ['motionPose','joints','targets','jointLocks','hands','fingers','handMode'])delete person[key];
 return true;
}
export async function loadFigureModel(key){
  if(templates.has(key))return;
  const custom=customFigures.get(key),url=custom?custom.url:new URL(`./assets/${key}.glb${key==='bodykun'?'?v=20261027-body-restore1':''}`,import.meta.url).href;
  if(!Object.hasOwn(figureModels,key))throw Error('로컬 캐릭터 파일을 찾지 못했습니다.');
  if(!pending.has(key))pending.set(key,new GLTFLoader().loadAsync(url).then(g=>{
   const names=new Set();g.scene.traverse(o=>{if(o.isBone)names.add(o.name.replace('mixamorig',''));});
   if(custom&&!['Hips','Spine','Spine1','Spine2','Neck','Head',...['Left','Right'].flatMap(s=>['Arm','ForeArm','Hand','UpLeg','Leg','Foot'].map(n=>s+n))].every(n=>names.has(n)))throw Error('캐릭터의 필수 관절이 없습니다.');
   templates.set(key,g.scene);
  }).finally(()=>pending.delete(key)));
  await pending.get(key);
}
export async function loadMannequin(people=[]){
 await refreshCharacterCatalog();
 await Promise.all([...new Set(['bodychan','bodykun','mixamo',...people.map(p=>p.model).filter(key=>key?.startsWith('custom-'))])].map(loadFigureModel));
}
// Pose Lab retargets from the bind pose in world metres, independently of the displayed pose.
export function movementModel(p){
 const model=clone(templates.get(p.model));model.updateMatrixWorld(true);
 let box=new T.Box3().setFromObject(model);model.scale.multiplyScalar(1.75/(box.max.y-box.min.y));model.updateMatrixWorld(true);
 box=new T.Box3().setFromObject(model);model.position.y-=box.min.y;
 const scale=new T.Vector3().fromArray(p.scale||[1,1,1]).multiplyScalar(p.height/175);
 model.position.multiply(scale);model.scale.multiply(scale);model.updateMatrixWorld(true);return model;
}
export function mannequin(p,i){
 const template=templates.get(p.model);
 if(!template)return null;
 const g=new T.Group(),model=clone(template);g.add(model);g.userData.person=i;g.userData.landmarks={};
 model.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.frustumCulled=false;}});
 g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g);model.scale.multiplyScalar(1.75/(bounds.max.y-bounds.min.y));g.updateMatrixWorld(true);const box=new T.Box3().setFromObject(g);model.position.y-=box.min.y;if(p.pose==='sit')model.position.y-=.4;
 const bones={};model.traverse(o=>{if(o.isBone)bones[o.name.replace('mixamorig','')]=o;});
 const fingers=createHandRig(bones);
 for(const [key,name]of Object.entries({leftShoulder:'LeftArm',rightShoulder:'RightArm',leftHip:'LeftUpLeg',rightHip:'RightUpLeg',leftElbow:'LeftForeArm',rightElbow:'RightForeArm',leftKnee:'LeftLeg',rightKnee:'RightLeg',head:'Head',chest:'Spine2',pelvis:'Hips'})){const hit=new T.Mesh(new T.SphereGeometry(.07,10,8),new T.MeshBasicMaterial({color:0x9e8bdf,transparent:true,opacity:.65,depthWrite:false,depthTest:false}));hit.userData.part=key;hit.userData.poseMarker=true;g.add(hit);g.userData.landmarks[key]=[0,0,0];}
 const pos=b=>{g.updateMatrixWorld(true);return b.getWorldPosition(new T.Vector3());};
 function aim(b,end,target){const start=pos(b),dir=pos(end).sub(start).normalize(),to=new T.Vector3(...target).sub(start).normalize(),world=b.getWorldQuaternion(new T.Quaternion()),parent=b.parent.getWorldQuaternion(new T.Quaternion());b.quaternion.copy(parent.invert().multiply(new T.Quaternion().setFromUnitVectors(dir,to).multiply(world)));g.updateMatrixWorld(true);}
 for(const [side,sign] of [['Left',1],['Right',-1]]){
  const arm=bones[side+'Arm'],fore=bones[side+'ForeArm'],hand=bones[side+'Hand'],leg=bones[side+'UpLeg'],knee=bones[side+'Leg'],foot=bones[side+'Foot'];
  const relaxed=p.model==='bodychan';
  let a=pos(arm);aim(arm,fore,[a.x+sign*(relaxed?(sign===1?.05:.06):.07),a.y-.3,a.z+.015]);a=pos(fore);aim(fore,hand,[a.x+sign*(relaxed?.025:p.model==='bodykun'?.01:-.01),a.y-.28,a.z+(relaxed?(sign===1?.035:.045):.055)]);
  if(p.pose==='reach'&&sign===1){a=pos(arm);aim(arm,fore,[a.x+.4,a.y,a.z+.1]);a=pos(fore);aim(fore,hand,[a.x+.3,a.y,a.z]);}
  if(p.pose==='walk'){a=pos(leg);aim(leg,knee,[a.x,a.y-.45,a.z+sign*.22]);a=pos(arm);aim(arm,fore,[a.x+sign*.08,a.y-.3,a.z-sign*.15]);}
  if(p.pose==='sit'){a=pos(leg);aim(leg,knee,[a.x,a.y-.04,a.z+.45]);a=pos(knee);aim(knee,foot,[a.x,a.y-.45,a.z]);}
  for(const [key,b0,b1,b2] of [[side.toLowerCase()+'Hand',arm,fore,hand],[side.toLowerCase()+'Foot',leg,knee,foot]]){
   g.userData.landmarks[key]=pos(b2).toArray();
   const hit=new T.Mesh(new T.SphereGeometry(.065,8,6),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.fromArray(g.userData.landmarks[key]);hit.userData.part=key;hit.userData.poseMarker=true;hit.material.color.set(0x9e8bdf);hit.material.opacity=.65;hit.material.depthTest=false;g.add(hit);
  }
 }
 g.userData.baseModel=p.model;g.userData.basePose=p.pose;g.userData.motionRig={bones,model,fingers,jointFrames:Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,b.parent.getWorldQuaternion(new T.Quaternion())])),transforms:Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,{p:b.position.clone(),s:b.scale.clone()}])),modelBase:{p:model.position.clone(),q:model.quaternion.clone(),s:model.scale.clone()},base:Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,b.quaternion.clone()]))};
 applyMovementPose(g,p);
 applyFigureTransform(g,p);return g;
}

// Frozen local bone transforms reproduce the authored motion in previews, saved cuts and exports.
export function applyMovementPose(g,p){
 const rig=g.userData.motionRig;if(!rig)return;
 const placement={p:g.position.clone(),q:g.quaternion.clone(),s:g.scale.clone()};
 g.position.set(0,0,0);g.quaternion.identity();g.scale.set(1,1,1);
 const pose=p.motionPose,{bones,base}=rig;
 for(const [name,q]of Object.entries(base)){bones[name].quaternion.copy(q);bones[name].position.copy(rig.transforms[name].p);bones[name].scale.copy(rig.transforms[name].s);}
 rig.model.position.copy(rig.modelBase.p);rig.model.quaternion.copy(rig.modelBase.q);rig.model.scale.copy(rig.modelBase.s);
 if(pose?.kind==='pose-lab'&&Array.isArray(pose.bones)){
  const restore=(object,value)=>{if(!object||!value)return;for(const [key,property,length]of [['p','position',3],['q','quaternion',4],['s','scale',3]])if(Array.isArray(value[key])&&value[key].length===length&&value[key].every(Number.isFinite))object[property].fromArray(value[key]);};
  restore(rig.model,pose.model);
  for(const value of pose.bones)restore(bones[value.name?.replace('mixamorig','')],value);
 }else if(pose&&Number.isFinite(pose.phase)){
  // Read-only compatibility for frozen poses in projects saved by the previous version.
  // New movement never generates this format.
  const strength=Math.max(0,Math.min(1,pose.strength||0));
  const rotate=(name,angle)=>bones[name]?.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),angle));
  for(const [side,sign]of [['Left',1],['Right',-1]]){
   const swing=Math.sin(pose.phase)*sign;
   rotate(side+'UpLeg',pose.airborne?-.35:swing*.6*strength);
   rotate(side+'Leg',pose.airborne?.7:Math.max(0,-swing)*.85*strength);
   rotate(side+'Arm',pose.airborne?-.3:-swing*.5*strength);
   rotate(side+'ForeArm',pose.airborne?-.5:-.25*strength);
  }
 }
 for(const [key,q]of Object.entries(p.joints||{})){const name=jointBones[key];if(bones[name]&&Array.isArray(q)&&q.length===4&&q.every(Number.isFinite))bones[name].quaternion.fromArray(q).normalize();}
 g.updateMatrixWorld(true);
 // Manual hand/foot targets stay authoritative after freezing a movement pose.
 const world=b=>b.getWorldPosition(new T.Vector3());
 const aim=(bone,end,target)=>{const origin=world(bone),from=world(end).sub(origin).normalize(),to=new T.Vector3(...target).sub(origin).normalize();const q=bone.getWorldQuaternion(new T.Quaternion()),parent=bone.parent.getWorldQuaternion(new T.Quaternion());bone.quaternion.copy(parent.invert().multiply(new T.Quaternion().setFromUnitVectors(from,to).multiply(q)));g.updateMatrixWorld(true);};
 for(const side of ['Left','Right'])for(const [part,names]of [['Hand',['Arm','ForeArm','Hand']],['Foot',['UpLeg','Leg','Foot']]]){
  const key=side.toLowerCase()+part,target=p.targets?.[key];if(!target)continue;const upper=side.toLowerCase()+(part==='Hand'?'Shoulder':'Hip'),lower=side.toLowerCase()+(part==='Hand'?'Elbow':'Knee');if(p.jointLocks?.[upper]||p.jointLocks?.[lower])continue;
  const [a,b,c]=names.map(name=>bones[side+name]);if(!a||!b||!c)continue;
  const point=g.localToWorld(new T.Vector3(...target)),[mid,end]=solveLimb(world(a).toArray(),world(b).toArray(),world(c).toArray(),point.toArray());aim(a,b,mid);aim(b,c,end);if(p.jointLimits!==false){a.quaternion.copy(limitJoint(rig,upper,a.quaternion));b.quaternion.copy(limitJoint(rig,lower,b.quaternion));g.updateMatrixWorld(true);}
 }

 if(!pose&&p.pose==='stand'&&p.model==='bodychan'||pose?.kind==='pose-lab'&&pose.handGrip===undefined&&p.pose==='stand'&&automaticHands(p))clearIdleHands(g,p);
 applyHandPose(g,p);g.position.copy(placement.p);g.quaternion.copy(placement.q);g.scale.copy(placement.s);updateFigureLandmarks(g);updatePhone(g,p);
}
export function updateFigureLandmarks(g){
 const bones=g.userData.motionRig?.bones;if(!bones)return;g.updateMatrixWorld(true);
 for(const [key,name]of [['leftHand','LeftHand'],['rightHand','RightHand'],['leftFoot','LeftFoot'],['rightFoot','RightFoot'],['leftShoulder','LeftArm'],['rightShoulder','RightArm'],['leftHip','LeftUpLeg'],['rightHip','RightUpLeg'],['leftElbow','LeftForeArm'],['rightElbow','RightForeArm'],['leftKnee','LeftLeg'],['rightKnee','RightLeg'],['head','Head'],['chest','Spine2'],['pelvis','Hips']]){
  if(!bones[name])continue;
  const local=g.worldToLocal(bones[name].getWorldPosition(new T.Vector3()));g.userData.landmarks[key]=local.toArray();
  const hit=g.children.find(o=>o.userData.part===key);if(hit)hit.position.copy(local);
 }
}

