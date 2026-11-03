// Pointer events work with pen taps even when the driver omits dblclick.
export function setupRigDoubleTap(surface, hitTest, activate){
 let down=null,last=null;
 surface.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.isPrimary===false){down=null;last=null;return;}
  const target=hitTest(e);
  down=target?{id:e.pointerId,type:e.pointerType,x:e.clientX,y:e.clientY,time:e.timeStamp,target}:null;
  if(!target)last=null;
 },true);
 surface.addEventListener('pointermove',e=>{
  if(down?.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>9){down=null;last=null;}
 },true);
 surface.addEventListener('pointerup',e=>{
  if(!down||down.id!==e.pointerId)return;
  const tap=down;down=null;
  if(e.timeStamp-tap.time>450||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>9){last=null;return;}
  if(last&&tap.type===last.type&&tap.target.index===last.target.index&&e.timeStamp-last.time<500&&Math.hypot(tap.x-last.x,tap.y-last.y)<24){
   last=null;queueMicrotask(()=>activate(tap.target));
  }else last={...tap,time:e.timeStamp};
 },true);
 surface.addEventListener('pointercancel',()=>{down=null;last=null;},true);
}
