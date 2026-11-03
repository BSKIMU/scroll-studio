import * as T from 'three';

export const jointDragThreshold=pointerType=>pointerType==='pen'?7:4;

// Small screen-space tolerance keeps dots selectable at any zoom without
// raycasting the character mesh or allowing a rotation ring to steal the click.
export function pickJointMarker(editor,event){
 const rect=editor.renderer.domElement.getBoundingClientRect();
 let nearest=null,best=Infinity;
 editor.figures.children.forEach(figure=>{
  if(!figure.visible)return;
  figure.traverse(marker=>{
   if(!marker.visible||!marker.userData.poseMarker)return;
   const world=marker.getWorldPosition(new T.Vector3()),point=world.clone().project(editor.camera);
   if(point.z < -1||point.z>1)return;
   const edge=world.clone().add(new T.Vector3(marker.geometry.parameters.radius*marker.getWorldScale(new T.Vector3()).x,0,0).applyQuaternion(editor.camera.quaternion)).project(editor.camera);
   const radius=Math.min(14,Math.max(event.pointerType==='pen'?11:8,Math.abs(edge.x-point.x)*rect.width/2+2));
   const distance=Math.hypot(event.clientX-rect.left-(point.x+1)*rect.width/2,event.clientY-rect.top-(1-point.y)*rect.height/2);
   if(distance<=radius&&distance<best){best=distance;nearest={object:marker};}
  });
 });
 return nearest;
}
