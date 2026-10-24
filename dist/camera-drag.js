import * as T from 'three';

// Capture empty-space drags before the canvas orbit/transform handlers see them.
export function installCameraDrag(editor){
 const view=document.getElementById('sceneView'),surface=editor.renderer.domElement;
 const controls=editor.controls,ray=new T.Raycaster(),pointer=new T.Vector2();
 let drag=null,suppressClick=false,speed=.65;try{speed=Math.min(1.5,Math.max(.05,Number(localStorage.getItem('scroll-camera-speed'))||.65));}catch{}
 const settings=document.createElement('label');settings.className='camera-drag-setting';
 settings.innerHTML='카메라 회전 감도 <output>65%</output><input type="range" min="5" max="150" value="65" step="5" aria-label="카메라 회전 감도"><small>빈 공간 왼쪽 드래그 · Shift: 10% 속도로 미세 조정</small>';
 document.getElementById('fov').parentElement.before(settings);
 settings.querySelector('input').value=Math.round(speed*100);settings.querySelector('output').textContent=Math.round(speed*100)+'%';settings.querySelector('input').oninput=e=>{speed=+e.target.value/100;settings.querySelector('output').textContent=e.target.value+'%';controls.rotateSpeed=speed;try{localStorage.setItem('scroll-camera-speed',speed);}catch{}};controls.rotateSpeed=speed;
 const start=e=>{
  if(!editor.isOpen||editor.loading||editor.gizmo.keyboard?.active||e.button!==0||e.altKey||e.pointerType==='touch'||(e.target!==view&&e.target!==surface))return;
  const r=surface.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
  const inCanvas=Math.abs(pointer.x)<=1&&Math.abs(pointer.y)<=1;
  if(inCanvas&&!editor.movement?.engaged){
   editor.gizmo.transform.pointerHover({x:pointer.x,y:pointer.y,button:0});
   if(editor.gizmo.transform.axis)return;
   ray.setFromCamera(pointer,editor.camera);
   if(ray.intersectObjects(editor.figures.children,true).length)return;
  }
  e.preventDefault();e.stopImmediatePropagation();surface.focus({preventScroll:true});
  // Consume any prior orbit inertia once, then use exact per-pixel movement.
  const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,total:0,damping,enabled:controls.enabled};
  suppressClick=false;controls.enabled=false;view.setPointerCapture(e.pointerId);view.classList.add('camera-dragging');
 };
 view.addEventListener('pointerdown',start,true);
 view.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.total+=Math.hypot(dx,dy);
  const orbit=new T.Spherical().setFromVector3(editor.camera.position.clone().sub(controls.target));
  const rate=2*Math.PI/Math.max(1,view.clientHeight)*speed*(e.shiftKey?.1:1);
  orbit.theta-=dx*rate;orbit.phi=Math.max(.001,Math.min(Math.PI-.001,orbit.phi-dy*rate));
  editor.camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(orbit));
  controls.update();editor.storeCamera();
 },true);
 const end=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const previous=drag;drag=null;suppressClick=previous.total>3;
  controls.enabled=previous.enabled;controls.enableDamping=previous.damping;view.classList.remove('camera-dragging');
  if(view.hasPointerCapture(e.pointerId))view.releasePointerCapture(e.pointerId);
  if(!editor.movement?.engaged)editor.flush();
 };
 for(const event of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(event,end,true);
 view.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 controls.addEventListener('end',()=>{if(!editor.movement?.engaged)editor.flush();});
}
