import * as T from 'three';
import {jointBones,limitJoint} from './joint-pose.js?v=20261031-stable';

// Move a joint by rotating its ancestors, never by stretching a bone.
export function jointTranslationStart(figure){
 return Object.fromEntries(Object.entries(figure?.userData.motionRig?.bones||{}).map(([name,bone])=>[name,bone.quaternion.clone()]));
}
export function translateJoint(figure,person,part,target,start=jointTranslationStart(figure)){
 const rig=figure.userData.motionRig,end=rig?.bones[jointBones[part]];
 if(!end||person.jointLocks?.[part])return;
 person.jointLimits=true;
 const endpoint=part.replace('Palm','Hand').replace('Ankle','Foot');
 if(/Hand|Foot/.test(endpoint)){
  person.targets||={};person.targets[endpoint]=figure.worldToLocal(target.clone()).toArray();return;
 }
 const keys=new Map(Object.entries(jointBones).map(([key,name])=>[rig.bones[name],key]));
 const chain=[];
 for(let bone=end.parent;bone&&bone!==figure;bone=bone.parent){
  // A local joint edit never recruits the pelvis or the opposite leg.
  if(bone===rig.bones.Hips)break;
  const name=bone.name.replace('mixamorig','');
  if(start[name])bone.quaternion.copy(start[name]);
  const key=keys.get(bone);
  if(key){if(person.jointLocks?.[key])break;chain.push([bone,key]);bone.quaternion.copy(start[jointBones[key]]);}
 }
 person.joints||={};
 for(let pass=0;pass<5;pass++)for(const [bone,key]of chain){
  figure.updateMatrixWorld(true);
  const origin=bone.getWorldPosition(new T.Vector3()),from=end.getWorldPosition(new T.Vector3()).sub(origin),to=target.clone().sub(origin);
  if(from.lengthSq()<1e-10||to.lengthSq()<1e-10)continue;
  const delta=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());
  const weight=key==='chest'?.18:key==='abdomen'?.05:1;
  delta.slerp(new T.Quaternion(),1-weight);
  const local=bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(delta.multiply(bone.getWorldQuaternion(new T.Quaternion())));
  // Small torso follow-through, bounded relative to the pose at drag start.
  if(weight<1){const base=start[jointBones[key]],angle=base.angleTo(local),max=T.MathUtils.degToRad(key==='chest'?8:3);if(angle>max)local.copy(base.clone().slerp(local,max/angle));}
  bone.quaternion.copy(limitJoint(rig,key,local));person.joints[key]=bone.quaternion.toArray();
  const side=key.startsWith('left')?'left':key.startsWith('right')?'right':null;
  if(side)delete person.targets?.[side+(/Hip|Knee/.test(key)?'Foot':'Hand')];
 }
 figure.updateMatrixWorld(true);
}
