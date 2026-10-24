export const movementDefaults={walk:1.3,run:3.6,follow:false};
export const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space']);
export const editableTarget=target=>!!target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
export function movementDirection(keys,look,previous={x:0,z:-1},cameraRight){
 const length=Math.hypot(look.x,look.z),rightLength=cameraRight?Math.hypot(cameraRight.x,cameraRight.z):0;
 // At a top/bottom view the look vector has no reliable horizontal bearing; screen-right still does.
 const forward=length>.05?{x:look.x/length,z:look.z/length}:rightLength>.1?{x:cameraRight.z/rightLength,z:-cameraRight.x/rightLength}:previous;
 const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),r=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
 const x=forward.x*f-forward.z*r,z=forward.z*f+forward.x*r,n=Math.hypot(x,z);
 return {x:n?x/n:0,z:n?z/n:0,forward};
}
