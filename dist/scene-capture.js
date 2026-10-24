import {Color} from 'three';

// Keep the complete environment depth from the background pass. Clear only its
// color before drawing figures, so foreground occlusion is independent of order.
export function captureSceneLayers(editor, consume){
 const {renderer,scene,camera,environment,figures,grid,gizmo}=editor;
 const saved={background:scene.background,clear:renderer.getClearColor(new Color()).clone(),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,env:environment.visible,fig:figures.visible,grid:grid.visible,gizmo:gizmo.helper.visible};
 const writes=new Map(),markers=[];figures.traverse(o=>{if(o.userData.poseMarker){markers.push([o,o.visible]);o.visible=false;}});
 try{
  grid.visible=false;gizmo.helper.visible=false;environment.visible=true;figures.visible=false;renderer.autoClear=true;
  renderer.render(scene,camera);consume('background',renderer.domElement);
  scene.background=null;renderer.setClearColor(0,0);
  environment.traverse(object=>{for(const material of object.material?[].concat(object.material):[]){if(!writes.has(material))writes.set(material,material.colorWrite);material.colorWrite=false;}});
  renderer.state?.buffers.color.setMask(true);
  renderer.clear(true,false,false);
  figures.visible=true;renderer.autoClear=false;
  renderer.render(scene,camera);consume('guide',renderer.domElement);
 }finally{
  for(const [o,v]of markers)o.visible=v;
  for(const [material,colorWrite] of writes)material.colorWrite=colorWrite;
  scene.background=saved.background;renderer.setClearColor(saved.clear,saved.alpha);renderer.autoClear=saved.autoClear;
  environment.visible=saved.env;figures.visible=saved.fig;grid.visible=saved.grid;gizmo.helper.visible=saved.gizmo;
 }
}
