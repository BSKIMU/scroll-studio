import * as T from 'three';
import {solveLimb} from './pose-math.js?v=20261025-release1';

export function automaticHands(person){
 if(person.handMode)return person.handMode==='auto';
 return !person.fingers&&(!person.hands||Object.values(person.hands).every(v=>v===100));
}
export const relaxedGrip=24;

// Derive the flexion plane from each bind-pose palm, not world-down: the two
// Body figures have different wrist rolls. Store axes locally for walking too.
const curl={Thumb:[35,45,35],finger:[80,100,65]},down=new T.Vector3(0,-1,0);
export function createHandRig(bones){
 const fingers=[];
 const world=bone=>bone.getWorldPosition(new T.Vector3());
 for(const [prefix,side]of [['Left','left'],['Right','right']]){
  const hand=bones[prefix+'Hand'],index=bones[prefix+'HandIndex1'],pinky=bones[prefix+'HandPinky1'];if(!hand||!index||!pinky)continue;
  const palm=world(index).sub(world(hand)).cross(world(pinky).sub(world(hand))).normalize();if(palm.dot(down)<0)palm.negate();
  for(const finger of ['Thumb','Index','Middle','Ring','Pinky'])for(let segment=1;segment<=3;segment++){
  const bone=bones[`${prefix}Hand${finger}${segment}`],next=bones[`${prefix}Hand${finger}${segment+1}`];if(!bone||!next)continue;
  const direction=next.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3())).normalize();
  const palmar=palm.clone().addScaledVector(direction,-palm.dot(direction)).normalize(),local=bone.getWorldQuaternion(new T.Quaternion()).invert();
  const basis=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(direction.clone().applyQuaternion(local),palmar.clone().applyQuaternion(local),direction.clone().cross(palmar).applyQuaternion(local)));
  const toward=finger==='Thumb'?world(bones[prefix+'HandPinky1']).sub(world(bone)).normalize().addScaledVector(palm,.45).normalize():palm;
  const axis=direction.clone().cross(toward).normalize().applyQuaternion(local).normalize();
  if(axis.lengthSq()<.5)continue;
  fingers.push({bone,side,finger,segment,basis,axis,rest:bone.quaternion.clone().normalize(),degrees:curl[finger==='Thumb'?'Thumb':'finger'][segment-1]});
 }
 }
 return fingers;
}
export function applyHandPose(figure,person,automaticGrip){
 const preserve=person.motionPose?.preserveHands&&automaticGrip===undefined&&automaticHands(person);
 const rotation=new T.Quaternion();
 for(const {bone,side,finger,segment,basis,axis,rest,degrees}of figure.userData.motionRig?.fingers||[]){
  const saved=person.handPose?.[side]?.joints?.[finger+segment];
  if(Array.isArray(saved)&&saved.length===4&&saved.every(Number.isFinite)&&Math.hypot(...saved)>.1){bone.quaternion.copy(rest).multiply(basis).multiply(rotation.fromArray(saved).normalize()).multiply(basis.clone().invert()).normalize();continue;}
  if(preserve)continue;
  const auto=automaticHands(person),grip=auto?(automaticGrip??person.motionPose?.handGrip??(person.pose==='walk'?100:relaxedGrip)):person.fingers?.[side]?.[finger]??person.hands?.[side];if(!Number.isFinite(grip))continue;
  bone.quaternion.copy(rest).multiply(rotation.setFromAxisAngle(axis,T.MathUtils.degToRad(degrees*T.MathUtils.clamp(grip,0,100)/100)));
 }
}
// Keep relaxed wrists beside the thighs. Female idle has a narrower, slightly
// asymmetric arm line; the male clearance remains unchanged. Manual arms win.
export function clearIdleHands(figure,person,weight=1){
 if(person.motionPose?.preserveHands)return;
 if(!['bodychan','bodykun'].includes(person.model)||weight<=0)return;
 const bones=figure.userData.motionRig?.bones;if(!bones)return;
 figure.updateMatrixWorld(true);
 const local=b=>figure.worldToLocal(b.getWorldPosition(new T.Vector3()));
 const aim=(bone,end,target)=>{const origin=bone.getWorldPosition(new T.Vector3()),from=end.getWorldPosition(new T.Vector3()).sub(origin).normalize(),to=figure.localToWorld(new T.Vector3(...target)).sub(origin).normalize(),q=bone.getWorldQuaternion(new T.Quaternion()),parent=bone.parent.getWorldQuaternion(new T.Quaternion());bone.quaternion.copy(parent.invert().multiply(new T.Quaternion().setFromUnitVectors(from,to).multiply(q)));figure.updateMatrixWorld(true);};
 for(const [side,sign]of [['Left',1],['Right',-1]]){
  const prefix=side.toLowerCase();
  if(person.targets?.[prefix+'Hand']||['Shoulder','Elbow'].some(part=>person.joints?.[prefix+part]||person.jointLocks?.[prefix+part]))continue;
  const arm=bones[side+'Arm'],fore=bones[side+'ForeArm'],hand=bones[side+'Hand'],leg=bones[side+'UpLeg'];if(!arm||!fore||!hand||!leg)continue;
  const a=local(arm),b=local(fore),c=local(hand),hip=local(leg);
  if(c.y>hip.y+.1||c.y<hip.y-.55||Math.abs(c.z-hip.z)>.2)continue;
  const female=person.model==='bodychan',minimum=Math.abs(hip.x)+(female?(sign===1?.135:.14):.18),delta=(female?minimum-sign*c.x:Math.max(0,minimum-sign*c.x))*weight;
  if(Math.abs(delta)<.00001)continue;
  const target=c.clone();target.x+=sign*delta;
  const [mid,end]=solveLimb(a.toArray(),b.toArray(),c.toArray(),target.toArray());aim(arm,fore,mid);aim(fore,hand,end);
 }
}
export function applyFigureTransform(figure,person){
 figure.position.set(person.x,person.y||0,person.z);
 figure.rotation.set(...(person.euler||[0,person.rotation*Math.PI/180,0]));
 figure.scale.fromArray(person.scale||[1,1,1]).multiplyScalar(person.height/175);
 figure.updateMatrixWorld(true);
}
