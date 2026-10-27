import {Vector3,MathUtils} from 'three';
import {FlyNavigation} from './camera-navigation.js?v=20261026-navigation2';
// Viewing cameras cross geometry; character collision is independent.
export class WalkNavigation extends FlyNavigation{
 constructor(camera,target,eyeHeight=1.3){super(camera,target);this.speed=1.4;this.feet=new Vector3(camera.position.x,0,camera.position.z);this.velocity=0;this.grounded=true;this.crouch=0;this.crouching=false;this.setEyeHeight(eyeHeight);}
 setEyeHeight(value){this.eyeHeight=MathUtils.clamp(Number.isFinite(value)?value:1.3,.3,3);this.place();}
 place(){this.camera.position.copy(this.feet);this.camera.position.y+=this.eyeHeight*(1-.42*this.crouch);this.orient();}
 jump(){if(!this.grounded||this.crouching)return false;this.velocity=3.2;this.grounded=false;return true;}
 step(keys,dt){
  dt=MathUtils.clamp(dt,0,.05);if(!dt)return false;
  const before=this.camera.position.clone(),forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const move=new Vector3(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*right,0,-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*right).normalize();
  this.crouching=keys.has('ShiftLeft')||keys.has('ShiftRight');
  this.crouch+=((this.crouching?1:0)-this.crouch)*(1-Math.exp(-dt/.09));
  const slow=keys.has('AltLeft')||keys.has('AltRight');this.feet.addScaledVector(move,this.speed*(1-.55*this.crouch)*(slow?.2:1)*dt);
  if(!this.grounded){this.feet.y+=this.velocity*dt-7*dt*dt;this.velocity-=14*dt;if(this.feet.y<=0){this.feet.y=0;this.velocity=0;this.grounded=true;}}
  this.place();return this.camera.position.distanceToSquared(before)>1e-12;
 }
}
