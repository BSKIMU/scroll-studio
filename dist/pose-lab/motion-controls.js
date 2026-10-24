import * as T from 'three';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
// One continuous control: open bind fingers -> authored relaxed fingers -> full curl.

// These controls are evaluated once after the motion has posed the rig.
export function setMotionOffset(controller,id,bend=0,turn=0){
  const bone=controller.rig?.joints[id];if(!bone||!Number.isFinite(bend)||!Number.isFinite(turn))return;
  if(bend===0&&turn===0){controller.offsets.delete(bone);return;}
  controller.offsets.set(bone,{bend,turn,q:controller.rig.jointRotation(id,bend,turn)});
}

export function applyMotionOffsets(controller){
  const {rig,offsets,handShape}=controller;
  for(const [bone,{q}]of offsets)bone.quaternion.premultiply(q);
  if(handShape!==.5)for(const {bone,axis,amount} of rig.fingers){
    if(handShape<.5)bone.quaternion.copy(rig.rest.get(bone).q).slerp(bone.quaternion.clone(),handShape*2);
    else bone.quaternion.multiply(Q().setFromAxisAngle(axis,T.MathUtils.degToRad(amount*(handShape-.5)*2)));
  }
  controller.offsetPenetration=0;
  if(offsets.size){
    rig.root.updateMatrixWorld(true);rig.object.traverse(o=>o.skeleton?.update());
    for(const f of Object.values(controller.feet))for(const v of f.skinVertices)controller.offsetPenetration=Math.max(controller.offsetPenetration,-v.mesh.getVertexPosition(v.index,V()).applyMatrix4(v.mesh.matrixWorld).y);
  }
}
