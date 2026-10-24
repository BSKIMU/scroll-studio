import * as T from 'three';

// Keep deltas incremental so pressing or releasing Shift never jumps the object.
export function precisionStep(previous, applied, raw, slow){
 const amount=slow?.1:1;
 const position=applied.position.clone().add(raw.position.clone().sub(previous.position).multiplyScalar(amount));
 const scale=applied.scale.clone().add(raw.scale.clone().sub(previous.scale).multiplyScalar(amount));
 const delta=raw.quaternion.clone().multiply(previous.quaternion.clone().invert());
 const quaternion=new T.Quaternion().slerp(delta,amount).multiply(applied.quaternion);
 return {position,scale,quaternion};
}
export const transformSnapshot=o=>({position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});
export function copyTransform(o,s){o.position.copy(s.position);o.quaternion.copy(s.quaternion);o.scale.copy(s.scale);}

export function thickenGizmo(helper){
 const gizmo=helper.children.find(o=>o.gizmo);
 for(const mode of ['translate','scale'])for(const mesh of gizmo.gizmo[mode].children){
  if(!mesh.isMesh||!['X','Y','Z'].includes(mesh.name))continue;
  mesh.geometry=mesh.geometry.clone();const s=[2.4,2.4,2.4];s['XYZ'.indexOf(mesh.name)]=1;mesh.geometry.scale(...s);
 }
}

// Only nearby, upward-facing surfaces attract the feet. Never snap to a distant roof.
export function nearbyGround(environment,point,tolerance=.18){
 environment.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(point.x,point.y+tolerance,point.z),new T.Vector3(0,-1,0),0,tolerance*2);
 const candidates=[];
 for(const hit of ray.intersectObjects(environment.children,true)){
  if(!hit.object.isMesh||!hit.face)continue;
  let visible=true;for(let o=hit.object;o&&o!==environment;o=o.parent)if(!o.visible)visible=false;
  if(!visible)continue;
  const matrix=hit.object.matrixWorld.clone();
  if(hit.object.isInstancedMesh){const instance=new T.Matrix4();hit.object.getMatrixAt(hit.instanceId,instance);matrix.multiply(instance);}
  const normal=hit.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(matrix)).normalize();
  if(normal.y>.5)candidates.push(hit.point.y);
 }
 if(Math.abs(point.y)<=tolerance)candidates.push(0);
 return candidates.sort((a,b)=>Math.abs(a-point.y)-Math.abs(b-point.y))[0];
}
