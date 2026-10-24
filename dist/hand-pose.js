import * as T from 'three';

// Pose Lab: infer each curl axis in the Mixamo bind pose, then use local rotations.
const curl={Thumb:[20,30,25],finger:[45,60,40]},down=new T.Vector3(0,-1,0);
export function createHandRig(bones){
 const fingers=[];
 for(const [prefix,side]of [['Left','left'],['Right','right']])for(const finger of ['Thumb','Index','Middle','Ring','Pinky'])for(let segment=1;segment<=3;segment++){
  const bone=bones[`${prefix}Hand${finger}${segment}`],next=bones[`${prefix}Hand${finger}${segment+1}`];if(!bone||!next)continue;
  const direction=next.getWorldPosition(new T.Vector3()).sub(bone.getWorldPosition(new T.Vector3()));
  const axis=direction.cross(down).normalize().applyQuaternion(bone.getWorldQuaternion(new T.Quaternion()).invert());
  if(axis.lengthSq()<.5)continue;
  fingers.push({bone,side,finger,axis,rest:bone.quaternion.clone(),degrees:curl[finger==='Thumb'?'Thumb':'finger'][segment-1]});
 }
 return fingers;
}
export function applyHandPose(figure,person){
 const rotation=new T.Quaternion();
 for(const {bone,side,finger,axis,rest,degrees}of figure.userData.motionRig?.fingers||[]){
  const grip=person.fingers?.[side]?.[finger]??person.hands?.[side];if(!Number.isFinite(grip))continue;
  bone.quaternion.copy(rest).multiply(rotation.setFromAxisAngle(axis,T.MathUtils.degToRad(degrees*T.MathUtils.clamp(grip,0,100)/100)));
 }
}
export function applyFigureTransform(figure,person){
 figure.position.set(person.x,person.y||0,person.z);
 figure.rotation.set(...(person.euler||[0,person.rotation*Math.PI/180,0]));
 figure.scale.fromArray(person.scale||[1,1,1]).multiplyScalar(person.height/175);
 figure.updateMatrixWorld(true);
}
