import {FlyNavigation,flyKeys} from './camera-navigation.js?v=20261026-navigation2';
import {editableTarget} from './movement-controller.js?v=20261026-navigation2';
import {WalkNavigation} from './walk-navigation.js?v=20261027-pose-camera1';
const cameraKeys=new Set([...flyKeys,'Space']);

export class SceneFly{
 constructor(editor){
  this.e=editor;this.active=false;this.keys=new Set();
  const view=document.getElementById('sceneView'),surface=editor.renderer.domElement;
  this.surface=surface;this.view=view;
  const lookSurface=document.createElement('div');lookSurface.className='fly-look-surface';lookSurface.hidden=true;lookSurface.setAttribute('aria-label','좌클릭 시점 조작 화면');view.append(lookSurface);this.lookSurface=lookSurface;
  const rail=document.createElement('div');rail.className='camera-nav-rail';rail.setAttribute('role','group');rail.setAttribute('aria-label','카메라 이동');view.append(rail);
  const button=document.createElement('button');button.id='cameraFly';button.title='자유 이동 · Fly (Shift + `)';button.setAttribute('aria-label','자유 이동 · Fly');button.setAttribute('aria-pressed','false');
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19c4-1 4-7 7-10 3-3 7-5 11-6-1 5-3 9-6 12-3 3-7 3-12 4Z"/><path d="m7 16 11-9M10 13h7m-4-3h6m-7 6h3"/></svg>';rail.append(button);this.button=button;
  const walk=document.createElement('button');walk.id='cameraWalk';walk.title='사람 시점 · 지면 보행 (WASD / Space 점프 / Shift 숙이기)';walk.setAttribute('aria-label','사람 시점 · 지면 보행');walk.setAttribute('aria-pressed','false');
  walk.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>눈높이 · 보행</span>';
  button.after(walk);this.walkButton=walk;
  const height=document.createElement('label');height.className='walk-eye-height';height.hidden=true;height.title='바닥에서 카메라 눈높이까지의 Z 높이';height.innerHTML='눈높이 Z <input id="walkEyeHeight" type="number" min="0.3" max="3" step="0.05" value="1.3" aria-label="보행 카메라 눈높이 Z"> m';rail.append(height);this.heightInput=height.querySelector('input');this.heightPanel=height;
  const updateHeight=()=>{if(!this.heightInput.validity.valid||!this.heightInput.value)return;const eyeHeight=+this.heightInput.value;editor.state.cameraWalk={eyeHeight};if(this.active&&this.mode==='walk'&&this.navigation){this.navigation.setEyeHeight(eyeHeight);this.status();editor.storeCamera();}else editor.queueLive();};
  this.heightInput.oninput=updateHeight;this.heightInput.onchange=()=>{updateHeight();this.sync();};
  this.heightInput.onkeydown=event=>{if(event.code==='Enter'){event.preventDefault();updateHeight();this.sync();this.heightEditing=false;surface.focus({preventScroll:true});this.status();}};
  const hud=document.createElement('div');hud.className='fly-hud';hud.hidden=true;
  hud.innerHTML='<b>카메라 자유 이동</b><span></span><output id="flyStatus" aria-live="off"></output><div><button data-fly="apply">현재 구도 적용 · Enter</button><button data-fly="cancel">취소 · Esc</button></div>';
  view.append(hud);this.hud=hud;this.output=hud.querySelector('output');
  button.onclick=()=>this.active&&this.mode==='fly'?this.finish(true):this.start('fly');
  walk.onclick=()=>this.active&&this.mode==='walk'?this.finish(true):this.start('walk');
  hud.querySelector('[data-fly=apply]').onclick=()=>this.finish(true);
  hud.querySelector('[data-fly=cancel]').onclick=()=>this.finish(false);
  document.addEventListener('keydown',event=>{
   if(event.isComposing||editableTarget(event.target))return;
   if(!this.active){
    if(event.code==='Backquote'&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&document.getElementById('sceneDialog').contains(event.target)){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)this.start();}
    return;
   }
   if(event.code==='Tab'&&this.mode==='walk'){event.preventDefault();event.stopImmediatePropagation();this.endLookDrag();this.keys.clear();this.heightEditing=true;this.heightInput.focus({preventScroll:true});this.heightInput.select();this.status();return;}
   if(['Escape','Enter'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();this.finish(event.code==='Enter');return;}
   // Own navigation input while flying, including S (normally Scale) and E (interact).
   if(cameraKeys.has(event.code)){event.preventDefault();event.stopImmediatePropagation();if(!this.heightEditing&&!event.ctrlKey&&!event.metaKey){this.keys.add(event.code);if(event.code==='Space'&&!event.repeat&&this.mode==='walk')this.navigation?.jump();}}
  },true);
  document.addEventListener('keyup',event=>{this.keys.delete(event.code);if(this.active&&cameraKeys.has(event.code)){event.preventDefault();event.stopImmediatePropagation();}},true);
  view.addEventListener('pointerdown',event=>{
   if(!this.active||![surface,view,lookSurface].includes(event.target))return;
   // Keep the compatibility mouse stream: cancelling pointerdown suppresses
   // mousedown in embedded browsers. The look layer owns object/orbit input.
   event.stopImmediatePropagation();
   if(event.button===0){try{lookSurface.setPointerCapture(event.pointerId);}catch{}this.lookPointer=event.pointerId;}
  },true);
  view.addEventListener('mousedown',event=>{
   this.suppressClick=false;
   if(!this.active||![surface,view,lookSurface].includes(event.target))return;
   event.preventDefault();event.stopImmediatePropagation();
   if(event.button===0||event.button===2){
    this.suppressClick=true;
    this.heightEditing=false;surface.focus({preventScroll:true});
    if(event.button===0){this.lookDrag={x:event.clientX,y:event.clientY,edgeX:0,edgeY:0};view.classList.add('fly-looking');}
    this.status();
   }
  },true);
  document.addEventListener('mousemove',event=>{
   const drag=this.lookDrag;if(!this.active||this.heightEditing||!drag)return;
   if(!(event.buttons&1)){this.endLookDrag();return;}
   event.preventDefault();event.stopImmediatePropagation();
   this.navigation?.look(event.clientX-drag.x,event.clientY-drag.y);drag.x=event.clientX;drag.y=event.clientY;
   const r=view.getBoundingClientRect(),edge=(p,lo,hi)=>p<lo+20?-1:p>hi-20?1:0;
   drag.edgeX=edge(drag.x,r.left,r.left+r.width);drag.edgeY=edge(drag.y,r.top,r.top+r.height);editor.storeCamera();
  },true);
  document.addEventListener('mouseup',event=>{if(this.lookDrag&&event.button===0){event.preventDefault();event.stopImmediatePropagation();this.endLookDrag();}},true);
  view.addEventListener('pointercancel',()=>this.endLookDrag(),true);
  view.addEventListener('click',event=>{if(this.suppressClick){this.suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  view.addEventListener('contextmenu',event=>{if(this.active||this.suppressClick)event.preventDefault();});
  view.addEventListener('wheel',event=>{if(!this.active||editableTarget(event.target))return;event.preventDefault();event.stopImmediatePropagation();this.navigation?.wheel(event.deltaY);this.status();},{capture:true,passive:false});
  document.addEventListener('pointerdown',event=>{if(this.active&&!view.contains(event.target))this.finish(true);},true);
  document.addEventListener('focusin',event=>{if(this.active&&!view.contains(event.target))this.finish(true);});
  window.addEventListener('blur',()=>this.finish(true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.finish(true);});
 }
 endLookDrag(){this.lookDrag=null;this.view.classList.remove('fly-looking');const id=this.lookPointer;this.lookPointer=null;if(id!=null&&this.lookSurface.hasPointerCapture(id))this.lookSurface.releasePointerCapture(id);if(this.active)this.status();}
 sync(){this.heightInput.value=String(this.e.state?.cameraWalk?.eyeHeight??1.3);}
 async start(mode='fly'){
  const e=this.e;if(this.active&&this.mode===mode||!e.isOpen||e.loading||!e.state||e.gizmo.transform.dragging||e.gizmo.keyboard?.active)return;
  if(this.active)this.finish(true);
  e.flush();const damping=e.controls.enableDamping;e.controls.enableDamping=false;e.controls.update();e.controls.enableDamping=damping;
  this.before={position:e.camera.position.clone(),target:e.controls.target.clone(),enabled:e.controls.enabled,damping};
  e.figurePicker?.close();e.advanced?.skyPicker?.close();e.shot?.closePanel();this.mode=mode;this.navigation=mode==='fly'?new FlyNavigation(e.camera,e.controls.target):new WalkNavigation(e.camera,e.controls.target,e.state.cameraWalk?.eyeHeight??1.3);this.active=true;this.heightEditing=false;this.keys.clear();this.lastTime=null;this.sync();this.heightPanel.hidden=mode!=='walk';
  const selected=mode==='walk'?this.walkButton:this.button;
  this.hud.querySelector('b').textContent=mode==='walk'?'눈높이 카메라 · 지면 보행':'카메라 자유 이동';
  this.hud.querySelector('span').innerHTML=mode==='walk'?'WASD 지면 이동 · Space 점프 · 좌클릭 드래그 · 가장자리에서 계속 회전<br>휠 속도 · Shift 누르기: 숙이기 · Space 점프 · Tab 눈높이 Z':'WASD 이동 · Q 아래 / E 위 · 좌클릭 드래그 · 가장자리에서 계속 회전<br>휠 속도 · Shift 빠르게 · Alt 천천히';
  e.controls.enabled=false;e.gizmo.transform.enabled=false;e.gizmo.sync();this.hud.hidden=false;selected.classList.add('active');selected.setAttribute('aria-pressed','true');this.view.classList.add('fly-active');document.getElementById('sceneDialog').classList.add('fly-mode');
  this.lookSurface.hidden=false;this.surface.focus({preventScroll:true});this.status();e.invalidate();
  if(mode==='walk')e.storeCamera();
 }
 tick(time){
  if(!this.active||!this.navigation||this.heightEditing){this.lastTime=null;return;}
  const dt=this.lastTime===null?0:(time-this.lastTime)/1000;this.lastTime=time;
  let changed=this.navigation.step(this.keys,dt);
  const drag=this.lookDrag;
  if(drag&&(drag.edgeX||drag.edgeY)){this.navigation.look(drag.edgeX*480*Math.min(dt,.05),drag.edgeY*480*Math.min(dt,.05));changed=true;}
  if(changed){this.e.storeCamera();this.status();}
 }
 status(){
  if(this.heightEditing){this.output.textContent='눈높이 조절 중 · Enter로 이동에 돌아갑니다.';return;}
  const p=this.e.camera.position;
  this.output.textContent=this.navigation?`${this.lookDrag?'중앙 포인트 · 둘러보는 중':'좌클릭을 누르는 동안 시점 회전'} · ${this.navigation.speed.toFixed(1)} m/s · ${this.mode==='walk'?(this.navigation.crouching?'숙인 자세 · ':this.navigation.grounded?'지면 · ':'공중 · '):''}X ${p.x.toFixed(2)} / Y ${(-p.z).toFixed(2)} / Z ${p.y.toFixed(2)} m`:'카메라 준비 중…';
 }
 finish(commit,{flush=true}={}){
  if(!this.active)return;
  const e=this.e;this.endLookDrag();this.active=false;this.heightEditing=false;this.keys.clear();
  this.heightPanel.hidden=true;this.lookSurface.hidden=true;
  this.navigation?.dispose?.();this.navigation=null;
  if(!commit){e.camera.position.copy(this.before.position);e.controls.target.copy(this.before.target);}
  e.controls.enabled=this.before.enabled;e.controls.enableDamping=false;e.controls.update();e.controls.enableDamping=this.before.damping;
  e.gizmo.transform.enabled=true;e.gizmo.sync();this.hud.hidden=true;for(const b of [this.button,this.walkButton]){b.classList.remove('active');b.setAttribute('aria-pressed','false');}this.view.classList.remove('fly-active');document.getElementById('sceneDialog').classList.remove('fly-mode');
  e.storeCamera();if(flush)e.flush();
 }
}
