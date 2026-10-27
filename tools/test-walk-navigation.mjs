import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const T=await import('../dist/vendor/three.module.js');
const {WalkNavigation}=await import('../dist/walk-navigation.js');
const {initCollision,SceneCollision}=await import('../dist/scene-collision.js');
await initCollision();
function setup(env=new T.Group(),position=new T.Vector3(0,1.6,3)){
 const camera=new T.PerspectiveCamera(45,1,.01,1000),target=new T.Vector3(0,1.6,0);camera.position.copy(position);camera.lookAt(target);
 return {camera,target,nav:new WalkNavigation(camera,target)};
}
const box=(w,h,d,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial());mesh.position.set(x,y,z);return mesh;};
for(const fps of [30,60,144]){
 const {camera,nav}=setup();
 nav.look(0,-450);const initial=camera.position.clone();
 for(let i=0;i<fps;i++)nav.step(new Set(['KeyW']),1/fps);
 assert(Math.abs(camera.position.z-(initial.z-1.4))<.015,'Walking is horizontal even when looking up');
 assert(Math.abs(camera.position.y-1.3)<.025,'Feet stay on ground, camera stays at eye level');
 assert(nav.grounded);assert(nav.jump());assert(!nav.jump(),'No repeated midair jump');
 let peak=camera.position.y;
 for(let i=0;i<fps*2;i++){nav.step(new Set(),1/fps);peak=Math.max(peak,camera.position.y);}
 assert(peak>1.6&&peak<1.7,'Short camera hop peaks about 0.37m above the eye');assert(Math.abs(camera.position.y-1.3)<.025,'Gravity lands at original eye level');
 const feet=nav.feet.clone();nav.setEyeHeight(1.9);assert(Math.abs(camera.position.y-feet.y-1.9)<1e-8);assert(nav.feet.distanceTo(feet)<1e-9,'Height changes the eye, not the ground position');
 nav.setEyeHeight(NaN);assert.equal(nav.eyeHeight,1.3);
 const crouchStart=camera.position.y,footHeight=nav.feet.y;
 nav.step(new Set(['ShiftLeft']),1/fps);assert(camera.position.y<crouchStart&&camera.position.y>1,'Crouch eases down instead of teleporting');
 for(let i=0;i<fps;i++)nav.step(new Set(['ShiftLeft']),1/fps);
 assert(Math.abs(camera.position.y-.754)<.002,'Hold Shift lowers the eye to a kneeling height');assert.equal(nav.feet.y,footHeight);assert(!nav.jump(),'Cannot initiate a jump while crouched');
 const z=camera.position.z;for(let i=0;i<fps;i++)nav.step(new Set(['KeyW','ShiftLeft']),1/fps);assert(Math.abs(camera.position.z-z+.63)<.01,'Crouch movement slows instead of sprinting');
 for(let i=0;i<fps;i++)nav.step(new Set(),1/fps);assert(Math.abs(camera.position.y-1.3)<.002,'Releasing Shift restores standing height');assert(nav.jump());
}
{
 const env=new T.Group();env.add(box(8,.2,8,0,.9,0),box(8,3,.2,0,2.5,-1));
 const {camera,nav}=setup(env,new T.Vector3(0,2.6,3));
 assert(Math.abs(camera.position.y-1.3)<.03,'Camera uses the Z=0 reference, independent of furniture');
 for(let i=0;i<240;i++)nav.step(new Set(['KeyW']),1/60);
 assert(camera.position.z<-2,'Camera passes through walls');assert(Math.abs(nav.feet.y)<.001);
 
}
console.log('PASS: eye-level walking, view-independent direction, frame-rate independence, jump/landing, height parameter, Z=0 eye level and wall pass-through');

// Movement entry must escape furniture before any WASD input, without picking
// the desktop, an unsupported ledge, or the infinite grid outside an imported room.
for(const furniture of [box(4,.15,4,0,.8,0),box(4,3,4,0,1.5,0)]){
 const env=new T.Group();env.add(box(12,.2,12,0,-.1,0),furniture);
 const physics=new SceneCollision(env,{height:175,x:0,y:0,z:0});
 const spawn=physics.walkingStart(new T.Vector3());assert(spawn,'Find a nearby aisle');
 assert(Math.max(Math.abs(spawn.x),Math.abs(spawn.z))>2.2,'Start outside furniture, not inside its closed shell');
 assert(Math.abs(spawn.y)<.03&&physics.clearAt(spawn),'Feet on real floor with clear capsule');
 physics.setFeet(spawn);const before=physics.feet.clone();for(let i=0;i<60;i++)physics.move(new T.Vector3(0,0,.01),1/60);
 assert(physics.feet.distanceTo(before)>.2,'Can immediately walk');physics.dispose();
}
{
 const env=new T.Group();env.add(box(8,.2,8,8,1.9,0));
 const physics=new SceneCollision(env,{height:180,x:0,y:0,z:0}),spawn=physics.walkingStart(new T.Vector3());
 assert(spawn.x>4&&spawn.x<12&&Math.abs(spawn.y-2)<.03,'Find raised imported floor, not blank grid');
 physics.setFeet(spawn);const same=physics.walkingStart(spawn);assert(same.distanceTo(spawn)<1e-6,'Keep already safe placement');physics.dispose();
}
{
 const env=new T.Group();env.add(box(6,.2,6,0,-.1,0),box(6,.2,6,0,1,0));
 const physics=new SceneCollision(env,{height:175,x:0,y:0,z:0});
 assert.equal(physics.walkingStart(new T.Vector3()),null,'No valid headroom: do not place on furniture or outside the room');physics.dispose();
}
console.log('PASS: desk/cabinet escape, immediate walking, supported footprint, raised import, safe-position preservation and no-room failure');
