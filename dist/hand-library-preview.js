import * as T from 'three';
import {loadMannequin,movementModel,defaultPerson} from './mannequin.js?v=20261029-hands2';
import {createHandRig,applyHandPose} from './hand-pose.js?v=20261029-hands2';

// A single hand-only render target produces cached still images on demand.
export class HandThumbnails{
 async init(){
  if(this.renderer)return;
  await loadMannequin();this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(1);this.renderer.setSize(224,192);
  this.scene=new T.Scene();this.scene.background=new T.Color('#303d4a');this.scene.add(new T.HemisphereLight(0xe2f0ff,0x727083,2.4));const light=new T.DirectionalLight(0xffe6ca,3);light.position.set(2,4,3);this.scene.add(light);
  this.model=movementModel(defaultPerson('bodykun'));this.scene.add(this.model);const bones={};this.model.traverse(b=>{if(b.isBone)bones[b.name.replace(/^mixamorig[:_]?/i,'')]=b;});
  this.fingers=createHandRig(bones);this.figure={userData:{motionRig:{fingers:this.fingers}}};this.bones=bones;this.material=new T.MeshStandardMaterial({color:0xc7d5df,roughness:.74});
  this.model.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const geo=mesh.geometry.clone(),a=geo.attributes,indices=[];
   if(mesh.isSkinnedMesh&&a.skinIndex){
    const keep=i=>{let weight=0;for(let k=0;k<4;k++)if(/(?:Left|Right)Hand/.test(mesh.skeleton.bones[a.skinIndex.getComponent(i,k)]?.name||''))weight+=a.skinWeight.getComponent(i,k);return weight>.65;};
    const index=geo.index,count=index?.count??a.position.count;
    for(let i=0;i<count;i+=3){const v=[0,1,2].map(k=>index?index.getX(i+k):i+k);if(v.every(keep))indices.push(...v);}
   }
   geo.clearGroups();geo.setIndex(indices);mesh.geometry=geo;mesh.material=this.material;mesh.frustumCulled=false;mesh.visible=indices.length>0;
  });
  this.camera=new T.PerspectiveCamera(30,224/192,.001,10);
  this.views={};const p=b=>b.getWorldPosition(new T.Vector3());
  for(const [side,prefix]of [['left','Left'],['right','Right']]){const w=p(bones[prefix+'Hand']),d=p(bones[prefix+'HandMiddle1']).sub(w).normalize(),n=p(bones[prefix+'HandIndex1']).sub(w).cross(p(bones[prefix+'HandPinky1']).sub(w)).normalize();if(n.y>0)n.negate();this.views[side]={up:d,direction:n.addScaledVector(d,.15).normalize(),center:w.clone().addScaledVector(d,.07)};}
 }
 async render(entry,target='both'){
  await this.init();applyHandPose(this.figure,{handPose:{left:{joints:entry.hands.left},right:{joints:entry.hands.right}},motionPose:{preserveHands:true},handMode:'auto'});this.model.updateMatrixWorld(true);
  const sides=target==='both'?['left','right']:[target],width=224/sides.length;this.renderer.setScissorTest(true);
  sides.forEach((side,i)=>{const view=this.views[side];this.camera.aspect=width/192;this.camera.updateProjectionMatrix();this.camera.position.copy(view.center).addScaledVector(view.direction,sides.length===2?.6:.48);this.camera.up.copy(view.up);this.camera.lookAt(view.center);this.renderer.setViewport(i*width,0,width,192);this.renderer.setScissor(i*width,0,width,192);this.renderer.render(this.scene,this.camera);});this.renderer.setScissorTest(false);return this.renderer.domElement.toDataURL('image/webp',.82);
 }
 dispose(){this.renderer?.dispose();this.model?.traverse(o=>{if(o.isMesh)o.geometry.dispose();});this.material?.dispose();this.renderer=null;}
}
