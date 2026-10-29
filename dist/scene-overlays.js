import {NoToneMapping} from 'three';

// Editor handles share the rig's transforms, but never enter the image effects.
// Layers are temporary so picking and manuscript capture keep their usual masks.
export function paintWithOverlays(editor,paintWorld){
 const {renderer:r,scene,camera}=editor,objects=new Map(),layer=31;
 const collect=root=>root?.traverse(o=>{if(!objects.has(o))objects.set(o,o.layers.mask);});
 collect(editor.gizmo?.helper);collect(editor.shot?.helper);
 editor.figures.traverse(o=>{if(o.userData.poseMarker)collect(o);});
 const state={mask:camera.layers.mask,background:scene.background,environment:scene.environment,fog:scene.fog,autoClear:r.autoClear,toneMapping:r.toneMapping,shadows:r.shadowMap.autoUpdate};
 try{
  for(const o of objects.keys())o.layers.set(layer);
  camera.layers.disable(layer);paintWorld();
  if(!objects.size)return;
  camera.layers.set(layer);scene.background=null;scene.environment=null;scene.fog=null;
  r.autoClear=false;r.toneMapping=NoToneMapping;r.shadowMap.autoUpdate=false;
  r.render(scene,camera);
 }finally{
  for(const [o,mask]of objects)o.layers.mask=mask;
  camera.layers.mask=state.mask;scene.background=state.background;scene.environment=state.environment;scene.fog=state.fog;
  r.autoClear=state.autoClear;r.toneMapping=state.toneMapping;r.shadowMap.autoUpdate=state.shadows;
 }
}
