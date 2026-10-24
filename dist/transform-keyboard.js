import * as T from 'three';
import {transformSnapshot,copyTransform} from './manipulation.js?v=20261025-release1';
import {constrainedTransform} from './blender-transform.js?v=20261025-release1';

export class TransformKeyboard{
 constructor(gizmo){
  this.gizmo=gizmo;this.editor=gizmo.editor;this.active=false;
  const dialog=document.getElementById('sceneDialog'),surface=this.editor.renderer.domElement,view=document.getElementById('sceneView');
  this.readout=document.createElement('output');this.readout.id='transformReadout';this.readout.hidden=true;this.readout.setAttribute('role','status');gizmo.toolbar.append(this.readout);
  dialog.addEventListener('pointermove',e=>{if(e.target!==surface&&e.target!==view)return;this.pointer={x:e.clientX,y:e.clientY};if(!this.active)return;e.stopImmediatePropagation();e.preventDefault();this.move(e);},true);
  dialog.addEventListener('pointerdown',e=>{if(!this.active)return;if(e.target!==surface&&e.target!==view){this.finish(false);return;}e.preventDefault();e.stopImmediatePropagation();if(e.button===0||e.button===2)this.finish(e.button===0);},true);
  surface.addEventListener('contextmenu',e=>e.preventDefault());
  surface.addEventListener('blur',()=>{if(this.active)this.finish(false);});
  window.addEventListener('blur',()=>{if(this.active)this.finish(false);});
 }
 start(mode){
  const e=this.editor,g=this.gizmo;
  if(!e.isOpen||e.loading||!e.state?.people[e.index]||e.movement?.engaged||g.transform.dragging)return;
  if(g.part!=='whole'&&mode!==(g.isJointPart?'rotate':'translate')){g.setMode(mode);return;}
  if(!this.active){e.flush();this.before=structuredClone(e.state.people[e.index]);g.sync();this.base=transformSnapshot(g.proxy);this.controlsEnabled=e.controls.enabled;this.active=true;e.controls.enabled=false;}
  e.state.people[e.index]=structuredClone(this.before);e.updatePerson({pose:true});
  this.mode=mode;this.axis=null;this.local=false;this.plane=false;this.numeric='';this.delta=new T.Vector2();
  g.setMode(mode);g.setAxis(null);g.transform.setSpace('world');copyTransform(g.proxy,this.base);
  const surface=e.renderer.domElement,r=surface.getBoundingClientRect();this.last=this.pointer||{x:r.left+r.width*.7,y:r.top+r.height*.5};
  const pivot=this.base.position.clone().project(e.camera);this.pivot={x:r.left+(pivot.x+1)*r.width/2,y:r.top+(1-pivot.y)*r.height/2};
  this.startPointer={...this.last};this.unit=2*e.camera.position.distanceTo(this.base.position)*Math.tan(T.MathUtils.degToRad(e.camera.fov/2))/Math.max(1,r.height);
  this.right=new T.Vector3(1,0,0).applyQuaternion(e.camera.quaternion);this.up=new T.Vector3(0,1,0).applyQuaternion(e.camera.quaternion);this.viewAxis=e.camera.getWorldDirection(new T.Vector3()).negate();
  surface.focus({preventScroll:true});this.readout.hidden=false;this.update({});
 }
 key(e){
  const k=e.code?.startsWith('Key')?e.code.slice(3).toLowerCase():e.key.toLowerCase();
  if(!this.active){if(!e.ctrlKey&&!e.metaKey&&['g','r','s'].includes(k)){this.start({g:'translate',r:'rotate',s:'scale'}[k]);return true;}return false;}
  if(k==='escape'){this.finish(false);return true;}
  if(k==='enter'){this.finish(true);return true;}
  if(!e.ctrlKey&&!e.metaKey&&['g','r','s'].includes(k)){this.start({g:'translate',r:'rotate',s:'scale'}[k]);return true;}
  if(['x','y','z'].includes(k)){
   const axis=k.toUpperCase(),plane=e.shiftKey&&this.mode!=='rotate';
   if(this.axis===axis&&this.plane===plane){if(!this.local&&this.mode!=='scale')this.local=true;else{this.axis=null;this.local=false;}}
   else{this.axis=axis;this.local=false;this.plane=plane;}
   this.gizmo.setAxis(this.plane?null:this.axis);this.gizmo.transform.setSpace(this.local?'local':'world');this.update(e);return true;
  }
  if(/^\d$/.test(k)){if(this.numeric.length<12)this.numeric+=k;}
  else if(k==='.'&&!this.numeric.includes('.'))this.numeric+='.';
  else if(k==='-')this.numeric=this.numeric.startsWith('-')?this.numeric.slice(1):'-'+this.numeric;
  else if(k==='backspace')this.numeric=this.numeric.slice(0,-1);
  this.update(e);return true;
 }
 move(e){
  this.delta.x+=(e.clientX-this.last.x)*(e.shiftKey?.1:1);this.delta.y+=(e.clientY-this.last.y)*(e.shiftKey?.1:1);this.last={x:e.clientX,y:e.clientY};this.update(e);
 }
 update(e){
  const start=new T.Vector2(this.startPointer.x-this.pivot.x,this.pivot.y-this.startPointer.y),end=start.clone().add(new T.Vector2(this.delta.x,-this.delta.y));
  const angle=start.length()>20?Math.atan2(start.cross(end),start.dot(end)):(this.delta.x-this.delta.y)*.01;
  const factor=start.length()>20?end.length()/start.length():1+(this.delta.x-this.delta.y)*.01;
  const value=this.numeric!==''?Number(this.numeric):null,delta=this.right.clone().multiplyScalar(this.delta.x*this.unit).addScaledVector(this.up,-this.delta.y*this.unit);
  const result=constrainedTransform(this.base,{mode:this.mode,axis:this.axis,local:this.local,plane:this.plane,delta,value,angle,factor,viewAxis:this.viewAxis,snap:!!e.ctrlKey||document.getElementById('transformSnap').checked,precise:e.shiftKey});
  copyTransform(this.gizmo.proxy,result);this.gizmo.toPerson();
  const mode={translate:'이동',rotate:'회전',scale:'크기'}[this.mode],unit={translate:'m',rotate:'°',scale:'배'}[this.mode];
  this.readout.textContent=`${mode} · ${this.axis?(this.plane?this.axis+' 제외':this.axis):'자유'} · ${this.local||this.mode==='scale'?'인물 축':'전체 축'}${this.numeric?' · '+this.numeric+unit:''} | Enter / 클릭 확정 · Esc / 우클릭 취소`;
 }
 finish(commit){
  if(!this.active)return;
  const e=this.editor,g=this.gizmo;
  if(!commit){e.state.people[e.index]=structuredClone(this.before);e.updatePerson({pose:true});}
  this.active=false;this.readout.hidden=true;e.controls.enabled=this.controlsEnabled;g.dragFinished=performance.now();g.transform.setSpace(g.space||'world');g.setAxis(null);g.sync();e.controlsUI();
  if(commit){e.transformCommit=true;e.queueLive();e.flush();}else{clearTimeout(e.liveTimer);e.liveTimer=null;e.pending=false;e.previewDirty=true;e.invalidate();document.getElementById('liveStatus').textContent='변형 취소 · 원래 자세로 복원';}
 }
}
