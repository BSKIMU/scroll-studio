import * as T from 'three';
import {environmentHeight} from './environment-ground.js?v=20261028-guide3';
import {backgroundLocked} from './scene-background-lock.js?v=20261028-guide3';

export function applyEnvironmentPlacement(editor){
 const value=editor.state.environmentPlacement?.[editor.state.asset]||{},o=editor.environment;
 o.position.set(value.position?.[0]||0,environmentHeight(editor.state),value.position?.[2]||0);
 o.rotation.fromArray(value.rotation||[0,0,0]);o.scale.fromArray(value.scale||[1,1,1]);o.updateMatrixWorld(true);
}
export function applyObjectGroups(editor){
 for(const item of [...(editor.doors?.items||[]),...(editor.stairs?.items||[])]){
  const v=editor.state.look?.objectGroups?.[item.data.id];if(!v)continue;
  item.root.position.fromArray(v.position);item.root.rotation.fromArray(v.rotation);item.root.scale.fromArray(v.scale);item.root.updateMatrixWorld(true);
 }
}
export function objectTarget(editor,object,point){
 let group;for(const item of [...(editor.doors?.items||[]),...(editor.stairs?.items||[])]){
  for(let o=object;o&&o!==editor.environment;o=o.parent)if(o===item.root){group=item;break;}
  if(group)break;
 }
 const index=editor.advanced.meshes.indexOf(object),kind=group?'prop':object===editor.environment?'environment':'mesh';
 const target=group?.root||object;target.updateWorldMatrix(true,true);
 const pivot=new T.Box3().setFromObject(target).getCenter(new T.Vector3());
 return {kind,object:target,index,id:group?.data.id,pivot:target.worldToLocal(pivot),label:kind==='environment'?'배경 전체':target.name||'배경 물체'};
}
export function objectProxy(target,proxy){
 if(target.members){proxy.position.copy(target.frame.position);proxy.quaternion.copy(target.frame.quaternion);proxy.scale.copy(target.frame.scale);proxy.updateMatrixWorld(true);return;}
 const o=target.object;o.updateWorldMatrix(true,true);
 proxy.position.copy(o.localToWorld(target.pivot.clone()));o.getWorldQuaternion(proxy.quaternion);o.getWorldScale(proxy.scale);proxy.updateMatrixWorld(true);
}
export function applyObjectProxy(editor,target,proxy){
 if((target.members||[target.object]).some(o=>backgroundLocked(editor,o)))return;
 if(target.members){
  proxy.updateMatrixWorld(true);target.frame.updateMatrixWorld(true);
  const delta=proxy.matrixWorld.clone().multiply(target.frame.matrixWorld.clone().invert());
  const values=target.members.map(o=>{o.updateWorldMatrix(true,false);return {o,matrix:delta.clone().multiply(o.matrixWorld)};});
  const depth=o=>{let n=0;while(o.parent){n++;o=o.parent;}return n;};values.sort((a,b)=>depth(a.o)-depth(b.o));
  for(const {o,matrix}of values){o.parent.updateWorldMatrix(true,false);matrix.premultiply(o.parent.matrixWorld.clone().invert()).decompose(o.position,o.quaternion,o.scale);o.updateMatrixWorld(true);saveMeshTransform(editor,o);}
  target.frame.position.copy(proxy.position);target.frame.quaternion.copy(proxy.quaternion);target.frame.scale.copy(proxy.scale);target.frame.updateMatrixWorld(true);return;
 }
 const o=target.object;o.parent.updateWorldMatrix(true,false);
 // Rotate/scale about the visible selection point, preserving the source origin.
 const matrix=new T.Matrix4().compose(proxy.position,proxy.quaternion,proxy.scale)
  .multiply(new T.Matrix4().makeTranslation(...target.pivot.clone().negate().toArray()));
 matrix.premultiply(o.parent.matrixWorld.clone().invert()).decompose(o.position,o.quaternion,o.scale);o.updateMatrixWorld(true);
 const value={position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray()};
 if(target.kind==='environment'){
  editor.state.environmentPlacement||={};editor.state.environmentPlacement[editor.state.asset]={...value,z:o.position.y};
 }else if(target.kind==='prop'){
  const look=editor.advanced.settings();look.objectGroups||={};look.objectGroups[target.id]=value;
 }else{
  saveMeshTransform(editor,o);
 }
}
function saveMeshTransform(editor,o){const b=editor.advanced.bases.get(o),index=editor.advanced.meshes.indexOf(o);if(!b||index<0)return;editor.advanced.settings().objects[index]={position:o.position.clone().sub(b.position).toArray(),rotation:['x','y','z'].map(k=>T.MathUtils.radToDeg(o.rotation[k]-b.rotation[k])),scale:o.scale.clone().divide(b.scale).toArray()};}
export function snapshotObject(editor,target){
 return {local:{p:target.object.position.toArray(),q:target.object.quaternion.toArray(),s:target.object.scale.toArray()},
  members:target.members?.map(o=>({p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray()})),frame:target.frame&&{p:target.frame.position.toArray(),q:target.frame.quaternion.toArray(),s:target.frame.scale.toArray()},
  placement:structuredClone(editor.state.environmentPlacement),objects:structuredClone(editor.state.look?.objects),groups:structuredClone(editor.state.look?.objectGroups)};
}
export function restoreObject(editor,target,snapshot){
 editor.state.environmentPlacement=structuredClone(snapshot.placement);const look=editor.advanced.settings();look.objects=structuredClone(snapshot.objects)||{};look.objectGroups=structuredClone(snapshot.groups)||{};
 const o=target.object;o.position.fromArray(snapshot.local.p);o.quaternion.fromArray(snapshot.local.q);o.scale.fromArray(snapshot.local.s);o.updateMatrixWorld(true);
 if(snapshot.members){target.members.forEach((m,i)=>{const v=snapshot.members[i];m.position.fromArray(v.p);m.quaternion.fromArray(v.q);m.scale.fromArray(v.s);m.updateMatrixWorld(true);});const v=snapshot.frame;target.frame.position.fromArray(v.p);target.frame.quaternion.fromArray(v.q);target.frame.scale.fromArray(v.s);target.frame.updateMatrixWorld(true);}
}
export function pickSceneTarget(editor,ray){
 // Respect occlusion and hidden ancestors; helpers are handled by pose dragging.
 return ray.intersectObjects([editor.figures,editor.environment],true).find(hit=>{
  if(!hit.object.isMesh||hit.object.userData.poseMarker||backgroundLocked(editor,hit.object))return false;
  for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;
  return true;
 });
}
