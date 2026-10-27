import {rotateShot} from './shot-camera-math.js?v=20261027-pose-camera1';

export class ShotCameraTransform{
 constructor(shot,view){
  this.shot=shot;this.e=shot.e;this.selected=false;this.active=false;
  for(const edge of ['top','right','bottom','left']){
   const button=document.createElement('button');button.className='shot-frame-edge '+edge;button.setAttribute('aria-label','촬영 카메라 테두리 선택 · '+edge);button.title='카메라 선택 · R 회전';
   button.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();this.select();};button.onclick=()=>this.select();shot.frame.append(button);
  }
  this.pivot=document.createElement('div');this.pivot.className='shot-rotation-pivot';this.pivot.hidden=true;shot.frame.append(this.pivot);
  this.readout=document.createElement('output');this.readout.className='shot-rotation-readout';this.readout.hidden=true;view.append(this.readout);
  document.addEventListener('keydown',event=>{
   if(!shot.active||!this.selected||this.e.fly?.active||event.isComposing||event.metaKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable)return;
   if(!this.active&&event.ctrlKey)return;
   if(!this.active&&event.code!=='KeyR'&&event.code!=='Escape')return;
   event.preventDefault();event.stopImmediatePropagation();
   if(event.code==='Escape'){if(this.active)this.finish(false);else this.deselect();return;}
   if(!this.active){this.start();return;}
   if(event.code==='Enter'){this.finish(true);return;}
   if(/^Key[XYZ]$/.test(event.code)){this.axis=event.code.slice(3);this.numeric='';this.delta=0;this.startPointer={...this.pointer};}
   else if(/^\d$/.test(event.key))this.numeric+=event.key;
   else if(event.key==='.'&&!this.numeric.includes('.'))this.numeric+='.';
   else if(event.key==='-')this.numeric=this.numeric.startsWith('-')?this.numeric.slice(1):'-'+this.numeric;
   else if(event.code==='Backspace')this.numeric=this.numeric.slice(0,-1);
   this.update(event);
  },true);
  document.addEventListener('pointermove',event=>{
   this.pointer={x:event.clientX,y:event.clientY};if(!this.active)return;
   event.preventDefault();event.stopImmediatePropagation();
   const r=shot.frame.getBoundingClientRect(),center={x:r.left+r.width/2,y:r.top+r.height/2};
   const a=Math.atan2(this.last.y-center.y,this.last.x-center.x),b=Math.atan2(event.clientY-center.y,event.clientX-center.x);
   const diff=this.axis==='Z'?-Math.atan2(Math.sin(b-a),Math.cos(b-a))*180/Math.PI:(this.axis==='X'?event.clientY-this.last.y:event.clientX-this.last.x)*.35;
   this.delta+=diff*(event.shiftKey?.1:1);this.last={...this.pointer};this.update(event);
  },true);
  document.addEventListener('pointerdown',event=>{
   if(this.active){event.preventDefault();event.stopImmediatePropagation();this.ignoreClickUntil=performance.now()+300;this.finish(event.button===0);return;}
   if(this.selected&&!shot.frame.contains(event.target)&&!shot.panel.contains(event.target))this.deselect();
  },true);
  document.addEventListener('click',event=>{if(performance.now()<(this.ignoreClickUntil||0)){event.preventDefault();event.stopImmediatePropagation();}},true);
  view.addEventListener('contextmenu',event=>{if(this.selected)event.preventDefault();});
  window.addEventListener('blur',()=>{if(this.active)this.finish(false);});
 }
 select(){
  if(!this.shot.active)return;this.e.gizmo.keyboard?.finish(false);this.selected=true;this.shot.frame.classList.add('selected');
  this.e.renderer.domElement.focus({preventScroll:true});this.readout.hidden=false;this.readout.textContent='촬영 카메라 선택 · R 회전 · X/Y/Z 카메라 축 · Esc 선택 해제';
 }
 deselect(){if(this.active)this.finish(false);this.selected=false;this.shot.frame.classList.remove('selected');this.readout.hidden=true;}
 start(){
  this.e.flush();this.before=structuredClone(this.shot.data);this.axis='Z';this.numeric='';this.delta=0;this.active=true;
  this.controlsEnabled=this.e.controls.enabled;this.e.controls.enabled=false;this.gizmoEnabled=this.e.gizmo.transform.enabled;this.e.gizmo.transform.enabled=false;
  const r=this.shot.frame.getBoundingClientRect();this.last=this.pointer||{x:r.right,y:r.top+r.height/2};this.pointer={...this.last};
  this.pivot.hidden=false;this.update({});
 }
 update(event){
  let degrees=this.numeric&&Number.isFinite(Number(this.numeric))?Number(this.numeric):this.delta;if(event.ctrlKey)degrees=Math.round(degrees/5)*5;
  const value=rotateShot(this.before,this.axis,degrees);this.shot.change({target:value.target,roll:value.roll});
  this.readout.textContent=`카메라 ${this.axis} 회전 · ${degrees.toFixed(1)}° · X/Y 기울이기 · Z 화면 회전 · 숫자 입력 · 클릭/Enter 확정 · Esc/우클릭 취소`;
 }
 finish(commit){
  if(!this.active)return;this.active=false;this.pivot.hidden=true;
  if(!commit)this.shot.change({target:this.before.target,roll:this.before.roll});
  this.e.controls.enabled=this.controlsEnabled;this.e.gizmo.transform.enabled=this.gizmoEnabled;this.e.flush();
  this.readout.textContent='촬영 카메라 선택 · R 회전 · Esc 선택 해제';
 }
}
