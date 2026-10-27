import * as T from 'three';
import {transformSnapshot} from './manipulation.js?v=20261026-walk2';

// Blender-facing axes over the existing Y-up project format. No saved data migration.
export const blenderAxes={X:new T.Vector3(1,0,0),Y:new T.Vector3(0,0,-1),Z:new T.Vector3(0,1,0)};
export const storageAxis={X:'X',Y:'Z',Z:'Y'};
export function axisVector(axis,base,local=false){const v=blenderAxes[axis].clone();return local?v.applyQuaternion(base.quaternion):v;}
export function constrainedTransform(base,{mode,axis=null,local=false,plane=false,delta=new T.Vector3(),value=null,angle=0,factor=1,viewAxis=new T.Vector3(0,0,1),snap=false,precise=false}){
 const result=transformSnapshot(base),numeric=Number.isFinite(value);
 const selected=axis?(plane&&mode!=='rotate'?Object.keys(blenderAxes).filter(a=>a!==axis):[axis]):Object.keys(blenderAxes);
 const quantize=(v,step)=>snap&&!numeric?Math.round(v/step)*step:v;
 if(mode==='translate'){
  let offset=delta.clone();
  if(numeric){offset.set(0,0,0);for(const a of axis?selected:['X'])offset.addScaledVector(axisVector(a,base,local),value);}
  else if(axis){offset.set(0,0,0);for(const a of selected){const direction=axisVector(a,base,local);offset.addScaledVector(direction,delta.dot(direction));}}
  if(snap&&!numeric){const q=new T.Vector3();for(const a of selected){const direction=axisVector(a,base,local);q.addScaledVector(direction,quantize(offset.dot(direction),precise?.01:.1));}offset=q;}
  result.position.add(offset);
 }else if(mode==='rotate'){
  const radians=numeric?T.MathUtils.degToRad(value):quantize(angle,T.MathUtils.degToRad(precise?1:5));
  result.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis?axisVector(axis,base,local):viewAxis.clone().normalize(),radians)).normalize();
 }else if(mode==='scale'){
  const amount=Math.max(.01,numeric?value:quantize(factor,precise?.01:.1));
  // Local proportions preserve the existing rig representation (no shear/mirroring).
  for(const a of selected)result.scale[storageAxis[a].toLowerCase()]*=amount;
 }
 return result;
}
