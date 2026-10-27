import * as T from 'three';

export function targetMeshes(target){
 if(!target)return [];
 if(target.members)return target.members;
 const meshes=[];target.object?.traverse(o=>{if(o.isMesh&&!o.userData.poseMarker&&!o.userData.contiEdge)meshes.push(o);});return meshes;
}
export function selectionBounds(target){
 const box=new T.Box3();for(const mesh of targetMeshes(target)){mesh.updateWorldMatrix(true,false);mesh.geometry.computeBoundingBox();box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}return box;
}
export function collectionTarget(editor,members,label='선택 물체',groupId=null){
 members=[...new Set(members)].filter(o=>editor.advanced.meshes.includes(o));
 if(!members.length)return null;
 const target={kind:'collection',object:members[0],members,label,groupId,frame:new T.Object3D()};
 target.frame.position.copy(selectionBounds(target).getCenter(new T.Vector3()));target.frame.updateMatrixWorld(true);return target;
}
// glTF can split one Blender object into several material primitives. Keep the
// original node/parent together, without merging geometry or renaming chairs.
export function relatedMeshes(editor,mesh){
 const all=editor.advanced.meshes,index=all.indexOf(mesh);
 const saved=editor.state.look?.selectionGroups?.find(g=>g.asset===editor.state.asset&&g.meshes.includes(index));
 if(saved)return {members:saved.meshes.map(i=>all[i]).filter(Boolean),label:saved.name,groupId:saved.id};
 let root=mesh;
 for(let p=mesh.parent;p&&p!==editor.environment;p=p.parent){
  if(p.userData.scrollImportRoot||p.userData.scrollSourceRoot||p.isScene||/^(scene|collection|root|model)$/i.test(p.name))break;
  // An unnamed import wrapper is not an authored object.
  if(!p.name)break;
  root=p;
 }
 const members=[];root.traverse(o=>{if(all.includes(o))members.push(o);});
 return {members:members.length?members:[mesh],label:root.name||mesh.name||'물체'};
}
export function combineSelection(editor,current,next){
 const before=targetMeshes(current),after=targetMeshes(next),remove=after.every(o=>before.includes(o));
 const members=remove?before.filter(o=>!after.includes(o)):[...before,...after];
 return collectionTarget(editor,members,'여러 물체 선택');
}
export function saveSelectionGroup(editor,target){
 const meshes=targetMeshes(target).map(o=>editor.advanced.meshes.indexOf(o)).filter(i=>i>=0);
 if(meshes.length<2)return null;
 const s=editor.advanced.settings();s.selectionGroups=(s.selectionGroups||[]).filter(g=>g.asset!==editor.state.asset||!g.meshes.some(i=>meshes.includes(i)));
 const group={id:crypto.randomUUID(),name:target.label?.replace(/ · .*$/,'')||'물체 그룹',asset:editor.state.asset,meshes};
 if(/물체 선택$/.test(group.name))group.name='물체 그룹';s.selectionGroups.push(group);target.groupId=group.id;target.label=group.name;return group;
}
export function removeSelectionGroup(editor,target){
 const s=editor.advanced.settings();s.selectionGroups=(s.selectionGroups||[]).filter(g=>g.id!==target?.groupId);if(target)target.groupId=null;
}
