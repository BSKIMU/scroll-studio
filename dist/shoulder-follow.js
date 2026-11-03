import * as T from 'three';
import {limitJoint} from './joint-pose.js?v=20261031-stable';

// Derived from the current authored pose on every evaluation, never accumulated.
// Only manual arm edits recruit the shoulder girdle; animation retains its authored shoulders.
export function followRaisedArms(figure,person){
 const rig=figure.userData.motionRig,{bones}=rig,locks=person.jointLocks||{};
 const point=b=>b.getWorldPosition(new T.Vector3());
 if(!bones.Spine2||!bones.LeftArm||!bones.RightArm)return;
 const up=new T.Vector3(0,1,0).applyQuaternion(rig.model.getWorldQuaternion(new T.Quaternion()));
 const right=point(bones.LeftArm).sub(point(bones.RightArm)).normalize();
 const forward=right.clone().cross(up).normalize();
 const lifts=[];
 for(const side of ['Left','Right']){
  const key=side.toLowerCase(),arm=bones[side+'Arm'],fore=bones[side+'ForeArm'],clavicle=bones[side+'Shoulder'];
  if(!arm||!fore||!clavicle||locks[key+'Shoulder']||locks[key+'Elbow'])continue;
  const target=person.targets?.[key+'Hand'];
  if(!target&&!person.joints?.[key+'Shoulder'])continue;
  const direction=(target?figure.localToWorld(new T.Vector3(...target)):point(fore)).sub(point(arm));
  if(direction.lengthSq()<1e-10)continue;
  direction.normalize();
  const elevation=Math.acos(T.MathUtils.clamp(direction.dot(up.clone().negate()),-1,1));
  const amount=T.MathUtils.smoothstep(elevation,T.MathUtils.degToRad(35),T.MathUtils.degToRad(155));
  lifts.push({side,clavicle,amount,front:direction.dot(forward)});
 }
 if(!lifts.some(v=>v.amount>0))return;
 const left=lifts.find(v=>v.side==='Left')?.amount||0,rightLift=lifts.find(v=>v.side==='Right')?.amount||0;
 const strength=Math.max(left,rightLift),front=lifts.reduce((sum,v)=>sum+v.amount*v.front,0)/lifts.length;
 const rotateWorld=(bone,axis,angle)=>{
  figure.updateMatrixWorld(true);
  const delta=new T.Quaternion().setFromAxisAngle(axis,angle);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(delta.multiply(bone.getWorldQuaternion(new T.Quaternion()))));
  figure.updateMatrixWorld(true);
 };
 // The chain stops above Hips: pelvis and both legs retain their exact world transforms.
 for(const [part,name,degrees]of [['abdomen','Spine',.8],['chest','Spine2',4]]){
  if(!bones[name]||locks[part]||person.joints?.[part])continue;
  rotateWorld(bones[name],forward,T.MathUtils.degToRad(degrees*(left-rightLift)));
  rotateWorld(bones[name],right,T.MathUtils.degToRad(-degrees*.65*strength*Math.max(.25,front)));
  bones[name].quaternion.copy(limitJoint(rig,part,bones[name].quaternion));
 }
 figure.updateMatrixWorld(true);
 for(const {side,clavicle,amount}of lifts){
  const outward=point(bones[side+'Arm']).sub(point(clavicle)).normalize();
  const axis=outward.clone().cross(up).normalize();
  if(axis.lengthSq()>1e-10)rotateWorld(clavicle,axis,T.MathUtils.degToRad(26)*amount);
 }
}
