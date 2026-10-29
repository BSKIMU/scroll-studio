import * as T from 'three';
import {PoseRig} from './pose-lab/rig.js';
import {loadMannequin,movementModel,defaultPerson} from './mannequin.js?v=20261029-hands2';
import {MotionRetargeter,compileCombo,sampleCombo} from './pose-library-motion.js?v=20261029-anchor1';

// One small render target for all cards. No per-card RAF, canvases or live rigs.
export class PoseThumbnails{
 async init(){if(this.renderer)return;await loadMannequin();this.renderer=new T.WebGLRenderer({antialias:true,alpha:false});this.renderer.setSize(192,224);this.renderer.setPixelRatio(1);this.scene=new T.Scene();this.scene.background=new T.Color('#3c4652');this.scene.add(new T.HemisphereLight(0xdceeff,0x727582,2.4));const sun=new T.DirectionalLight(0xffecdb,3);sun.position.set(2,4,4);this.scene.add(sun);this.rig=new PoseRig(movementModel(defaultPerson('bodykun')),{fit:false});this.retarget=new MotionRetargeter(this.rig);this.scene.add(this.rig.root);this.material=new T.MeshStandardMaterial({color:0xbccedf,roughness:.8});this.rig.object.traverse(o=>{if(o.isMesh)o.material=this.material;});this.camera=new T.PerspectiveCamera(32,192/224,.01,100);}
 async render(clip,time){await this.init();const combo=compileCombo([{clip}]),sample=sampleCombo(combo,time??clip.duration*.5);this.retarget.apply(sample);const points=this.rig.bones.map(b=>b.getWorldPosition(new T.Vector3())),box=new T.Box3().setFromPoints(points).expandByScalar(.14),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),distance=Math.max(size.y,size.x*224/192)*2.05;this.camera.position.copy(center).add(new T.Vector3(distance*.32,distance*.15,distance));this.camera.lookAt(center);this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/webp',.8);}
 dispose(){this.renderer?.dispose();this.material?.dispose();if(this.rig){this.rig.helper.geometry.dispose();this.rig.helper.material.dispose();this.rig.handles.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}this.renderer=null;this.rig=null;}
}
