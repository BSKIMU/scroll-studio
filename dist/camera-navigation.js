import {Vector3,MathUtils} from 'three';

export const flyKeys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight','AltLeft','AltRight']);
// Camera-local travel, with world-up vertical motion and no accumulated velocity.
export class FlyNavigation{
 constructor(camera,target){
  this.camera=camera;this.target=target;this.speed=2;
  this.distance=Math.max(.5,camera.position.distanceTo(target));
  const direction=camera.getWorldDirection(new Vector3());
  this.yaw=Math.atan2(-direction.x,-direction.z);this.pitch=Math.asin(MathUtils.clamp(direction.y,-1,1));
 }
 look(dx,dy){this.yaw-=dx*.002;this.pitch=MathUtils.clamp(this.pitch-dy*.002,-Math.PI/2+.01,Math.PI/2-.01);this.orient();}
 direction(){return new Vector3(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch));}
 orient(){this.target.copy(this.camera.position).addScaledVector(this.direction(),this.distance);this.camera.lookAt(this.target);this.camera.updateMatrixWorld();}
 wheel(delta){this.speed=MathUtils.clamp(this.speed*Math.exp(-MathUtils.clamp(delta,-120,120)*.003),.1,50);}
 step(keys,dt){
  const axis=(positive,negative)=>Number(keys.has(positive))-Number(keys.has(negative));
  const move=this.direction().multiplyScalar(axis('KeyW','KeyS'));
  move.addScaledVector(new Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw)),axis('KeyD','KeyA'));
  move.y+=axis('KeyE','KeyQ');if(move.lengthSq()<1e-12)return false;
  const fast=keys.has('ShiftLeft')||keys.has('ShiftRight'),slow=keys.has('AltLeft')||keys.has('AltRight');
  move.normalize().multiplyScalar(this.speed*(fast?3:1)*(slow?.2:1)*MathUtils.clamp(dt,0,.05));
  this.camera.position.add(move);this.orient();return true;
 }
}

export function followCamera(camera,target,delta){camera.position.add(delta);target.add(delta);}
// Recover a character already outside the shot without changing viewing angle or lens.
export function recoverFollow(camera,target,position,height){
 const focus=position.clone().add(new Vector3(0,height*.6,0));camera.updateMatrixWorld();
 const screen=focus.clone().project(camera);
 if(screen.z>=-1&&screen.z<=1&&Math.abs(screen.x)<.8&&Math.abs(screen.y)<.8)return false;
 followCamera(camera,target,focus.sub(target));camera.updateMatrixWorld();return true;
}
