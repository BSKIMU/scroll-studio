// Keep pen and embedded-browser drags usable when mouse lock is unavailable.
export function cameraPointer(surface,onRelease){
 let dragging=false,locked=false,epoch=0;
 document.addEventListener('pointerlockchange',()=>{
  const owns=document.pointerLockElement===surface;
  if(owns&&!dragging){document.exitPointerLock();return;}
  if(locked&&!owns&&dragging)onRelease();
  locked=owns;
 });
 return {
  start(event){
   dragging=true;const token=++epoch;
   if(event.pointerType!=='mouse'||!surface.requestPointerLock)return;
   const request=async()=>{
    try{await surface.requestPointerLock({unadjustedMovement:true});}
    catch(error){if(error.name!=='NotSupportedError'||token!==epoch)return;await surface.requestPointerLock();}
    if(!dragging&&document.pointerLockElement===surface)document.exitPointerLock();
   };
   request().catch(()=>{});
  },
  delta(event,last){
   return document.pointerLockElement===surface?[event.movementX,event.movementY]:[event.clientX-last.x,event.clientY-last.y];
  },
  end(){dragging=false;locked=false;epoch++;if(document.pointerLockElement===surface)document.exitPointerLock();}
 };
}
