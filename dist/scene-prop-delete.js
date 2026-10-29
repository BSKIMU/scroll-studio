import {targetMeshes} from './scene-selection.js?v=20261029-library1';

// A clicked material submesh still belongs to one complete prop instance.
export function selectedProps(items,target){
 if(!target||target.kind==='environment')return [];
 const selected=new Set();
 for(const mesh of targetMeshes(target)){
  let item;
  for(let node=mesh;node&&!item;node=node.parent)item=items.find(p=>p.root===node);
  if(!item)return []; // Mixed background selections are not prop deletion.
  selected.add(item);
 }
 return [...selected];
}

// Layer overrides use mesh indices; retain their original owners after deletion.
export function remapRemovedMeshes(look,meshes,removed,asset){
 const indices=new Map();let next=0;
 meshes.forEach((mesh,i)=>{if(!removed.has(mesh))indices.set(i,next++);});
 look.hidden=(look.hidden||[]).filter(i=>indices.has(i)).map(i=>indices.get(i));
 look.objects=Object.fromEntries(Object.entries(look.objects||{}).filter(([i])=>indices.has(+i)).map(([i,value])=>[indices.get(+i),value]));
 if(look.selectionGroups)look.selectionGroups=look.selectionGroups.map(group=>group.asset===asset?{...group,meshes:group.meshes.filter(i=>indices.has(i)).map(i=>indices.get(i))}:group).filter(group=>group.meshes.length);
}
