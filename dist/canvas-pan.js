// A held Space temporarily pans the 2D viewport without changing the drawing tool.
export function setupCanvasPan(getTool){
 const viewport=document.getElementById('viewport');let held=false,drag=null,zone='canvas',pressed=false;
 const editable=el=>el?.closest('input,textarea,select,[contenteditable="true"]');
 const cursor=()=>{viewport.classList.toggle('space-pan',held);viewport.classList.toggle('canvas-panning',!!drag);};
 function finish(){const d=drag;drag=null;if(d&&viewport.hasPointerCapture(d.id))viewport.releasePointerCapture(d.id);cursor();}
 function reset(){held=false;pressed=false;finish();cursor();}
 document.addEventListener('pointerover',e=>{if(viewport.contains(e.target))zone='canvas';else if(e.target.closest('#sceneDialog'))zone='scene';});
 document.addEventListener('pointerdown',e=>{
  if(!viewport.contains(e.target))return;zone='canvas';
  if(e.button!==1&&!(e.button===0&&(held||getTool()==='pan')))return;
  if(e.target.closest('input,textarea,select,a,button:not(.frame-resize-handle)'))return;
  e.preventDefault();e.stopImmediatePropagation();viewport.focus({preventScroll:true});
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
  viewport.setPointerCapture(e.pointerId);cursor();
 },true);
 document.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();viewport.scrollTo({left:drag.left+drag.x-e.clientX,top:drag.top+drag.y-e.clientY,behavior:'instant'});},true);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,e=>{pressed=false;if(drag?.id===e.pointerId){e.stopImmediatePropagation();finish();}},true);
 document.addEventListener('keydown',e=>{
  if(e.code!=='Space'||e.ctrlKey||e.metaKey||e.altKey||editable(e.target)||document.querySelector('dialog[open]')||zone==='scene'||e.target.closest('#sceneDialog'))return;
  if(!held&&pressed)return;
  held=true;e.preventDefault();e.stopImmediatePropagation();cursor();
 },true);
 document.addEventListener('keyup',e=>{if(e.code!=='Space')return;if(held){e.preventDefault();e.stopImmediatePropagation();}held=false;finish();cursor();},true);
 document.addEventListener('pointerdown',()=>{pressed=true;},true);
 document.addEventListener('pointerup',()=>{pressed=false;},true);
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
}
