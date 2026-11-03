import * as T from 'three';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {thickenGizmo} from './manipulation.js?v=20261026-walk2';
import {pickJointMarker} from './joint-picking.js?v=20261031-stable';

// Only the main control receives drag events. The companion supplies the other
// handle and its hit test, so two controls cannot start competing drags.
export function setupJointHandles(g){
 const main=g.transform,other=new TransformControls(g.editor.camera),root=new T.Group();
 root.add(g.helper,other.getHelper());g.editor.scene.add(root);g.helper=root;
 other.setColors(0xff5555,0x599dff,0x70ce75,0xffdd66);thickenGizmo(other.getHelper());
 const active=()=>g.personSelected&&!g.objectTarget&&g.part!=='whole'&&!g.directDragging&&!(g.editor.movement?.engaged||g.editor.fly?.active);
 // Keep the three explicit axes; free trackball/outer rings obscure joint dots.
 for(const control of [main,other]){
  const gizmo=control.getHelper().children.find(o=>o.gizmo),update=gizmo.updateMatrixWorld;
  gizmo.updateMatrixWorld=function(force){update.call(this,force);if(active())for(const group of [this.gizmo[control.mode],this.picker[control.mode]])for(const handle of group.children)if(!['X','Y','Z'].includes(handle.name))handle.visible=false;};
 }
 function sync(){
  if(!active()||!main.object){other.detach();return;}
  other.attach(g.proxy);other.setMode(main.mode==='translate'?'rotate':'translate');
  other.setSpace(main.space);other.setSize(other.mode==='rotate'?.85:.55);
  main.setSize(main.mode==='rotate'?.85:.55);other.enabled=main.enabled;
  for(const a of ['X','Y','Z'])other['show'+a]=main['show'+a];
  root.updateMatrixWorld(true);
 }
 function pick(event){
  if(!active()||!main.enabled||main.dragging||g.keyboard?.active)return;
  if(pickJointMarker(g.editor,event)){main.axis=null;other.axis=null;return;}
  sync();const r=g.editor.renderer.domElement.getBoundingClientRect();
  const pointer={x:(event.clientX-r.left)/r.width*2-1,y:-(event.clientY-r.top)/r.height*2+1,button:event.button};
  main.pointerHover(pointer);other.pointerHover(pointer);
  const arrows=main.mode==='translate'?main:other;
  const chosen=arrows.axis?arrows:main.axis?main:other.axis?other:null;
  if(chosen&&chosen!==main){const mode=chosen.mode;g.setMode(mode);sync();main.pointerHover(pointer);}
  other.axis=null;
 }
 const surface=g.editor.renderer.domElement;
 surface.addEventListener('pointermove',pick,true);surface.addEventListener('pointerdown',pick,true);
 return {sync};
}
