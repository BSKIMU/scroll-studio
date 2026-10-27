import * as T from 'three';
import {findGroundSurface} from './environment-ground.js?v=20261027-selection4';
const vector=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);

// Preset coordinates are in source world metres, independent of GLB quantization.
export function prepareImportedBackground(object,asset){
 let preset=null;object.traverse(o=>{if(o.userData.scrollPreset)preset=o.userData.scrollPreset;});
 const bounds=new T.Box3().setFromObject(object),size=bounds.getSize(new T.Vector3()),center=vector(preset?.normalizationCenter)?new T.Vector3(...preset.normalizationCenter):bounds.getCenter(new T.Vector3());
 const scale=asset.scale||Math.min(1,18/Math.max(size.x,size.z,size.y));
 const explicitFloor=Number.isFinite(preset?.floorY),surface=!explicitFloor&&asset.groundMode==='auto'?findGroundSurface(object):null;
 const floor=explicitFloor?preset.floorY:surface??bounds.min.y;
 const wrapper=new T.Group();wrapper.name=asset.name;wrapper.userData.scrollImportRoot=true;object.userData.scrollSourceRoot=true;wrapper.add(object);wrapper.scale.setScalar(scale);wrapper.position.set(-center.x*scale,-floor*scale,-center.z*scale);
 for(const seat of preset?.seats||[]){
  if(!vector(seat.anchor)||!vector(seat.forward))continue;
  const proxy=new T.Group();proxy.name=seat.label||'의자';proxy.userData.scrollSeat={...seat,virtual:true};wrapper.add(proxy);
 }
 if(preset?.seats?.length)object.userData.scrollNoSeat=true;
 wrapper.userData.scrollPresetFloor=Number.isFinite(preset?.floorY);wrapper.updateMatrixWorld(true);
 if(asset.groundMode==='auto')wrapper.userData.scrollGround={mode:explicitFloor?'preset':surface===null?'bounds':'surface',sourceY:floor};
 const camera=preset&&vector(preset.camera)&&vector(preset.target)?{position:wrapper.localToWorld(new T.Vector3(...preset.camera)),target:wrapper.localToWorld(new T.Vector3(...preset.target)),fov:T.MathUtils.clamp(preset.fov||60,20,100)}:null;
 return {wrapper,camera};
}

export function assignedSeat(mesh){
 const s=mesh.userData.scrollSeat;if(!s||!vector(s.anchor)||!vector(s.forward))return null;
 const anchor=mesh.localToWorld(new T.Vector3(...s.anchor)),forward=new T.Vector3(...s.forward).transformDirection(mesh.matrixWorld),box=new T.Box3().setFromObject(mesh);
 if(s.bounds&&vector(s.bounds.min)&&vector(s.bounds.max))box.set(new T.Vector3(...s.bounds.min),new T.Vector3(...s.bounds.max)).applyMatrix4(mesh.matrixWorld);
 if(box.isEmpty())box.setFromCenterAndSize(anchor,new T.Vector3(s.width||.6,1,s.depth||.6));
 const floor=Number.isFinite(s.floorY)?mesh.localToWorld(new T.Vector3(s.anchor[0],s.floorY,s.anchor[2])).y:anchor.y-.48;
 return {name:mesh.name,mesh,box,anchor,y:anchor.y,angle:Math.atan2(forward.x,forward.z),forward,floor,assigned:true,virtual:!!s.virtual};
}
