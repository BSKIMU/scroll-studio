import * as T from 'three';
import {applyMotionReference} from './motion-reference.js?v=20261025-release1';
import {contactFeet,poseContacts,sampleFootRoute,yaw,ease} from './contact-pose.js?v=20261025-release1';
export class SlidingDoorMotion{
 constructor(m,selection,{open=null,speed=1}={}){
  this.motion=m;this.door=selection.door;this.side=selection.side;this.speed=speed;this.mode='door';this.paused=false;this.done=false;this.error='';this.time=0;this.grip=0;this.from=this.door.data.angle;this.to=(open??!this.door.open)?1:0;this.startFeet=m.physics.feet.clone();this.startHeading=m.controller.heading;this.heading=this.door.data.rotation+(this.side>0?Math.PI:0);
  m.controller.root.set(this.startFeet.x,0,this.startFeet.z);m.controller.groundY=this.startFeet.y;m.controller.renderPose();this.initial=contactFeet(m);this.route=[];
  const center=this.door.stance(this.side),direction=new T.Vector3(1,0,0).transformDirection(this.door.root.matrixWorld),travel=(this.to-this.from)*this.door.spec.travel*(this.door.spec.direction||1);
  center.y=this.startFeet.y;const target=(i,shift)=>({point:center.clone().addScaledVector(direction,shift).add(new T.Vector3(i===0?.13:-.13,.065,0).applyQuaternion(yaw(this.heading))),q:yaw(this.heading-this.startHeading).multiply(this.initial[i].q)});
  this.approach=Math.hypot(center.x-this.startFeet.x,center.z-this.startFeet.z)>.25?.9:0;if(this.approach)for(let i=0;i<2;i++)this.route.push({i,start:i*.45,duration:.45,lift:.06,...target(i,0)});
  this.slideStart=this.approach+.45;this.slideEnd=this.slideStart+1.9;this.duration=this.slideEnd+.45;
  // Two small side steps, with the trailing foot following each time.
  const leading=direction.clone().multiplyScalar(Math.sign(travel)||1).dot(new T.Vector3(1,0,0).applyQuaternion(yaw(this.heading)))>=0?0:1;for(let step=0;step<4;step++){const i=(leading+step)%2;this.route.push({i,start:this.slideStart+step*.45,duration:.45,lift:.035,...target(i,travel*(step<2?.5:1))});}
  this.steps={contacts:this.initial,swing:null};
 }
 get progress(){return Math.min(1,this.time/this.duration);}
 seek(f){this.time=0;this.done=false;this.error='';this.paused=false;this.door.setAngle(this.from);this.motion.physics.setFeet(this.startFeet);const until=T.MathUtils.clamp(f,0,1)*this.duration;for(let t=0;t<until-1e-6;t+=1/60)this.update(Math.min(1/60,until-t)/this.speed);this.paused=true;}
 update(dt){if(this.paused||this.done)return;this.time=Math.min(this.duration,this.time+dt*this.speed);this.render();if(this.time===this.duration)this.done=true;}
 render(){const m=this.motion,p=m.controller,t=this.time,old=this.door.data.angle;this.door.setAngle(T.MathUtils.lerp(this.from,this.to,ease((t-this.slideStart)/1.9)));
  if(!m.physics.doorClear(this.door)){this.door.setAngle(old);m.physics.syncDoors();this.error='미닫이문 앞 공간이 막혀 있습니다.';this.done=true;p.state=this.error;return;}m.physics.syncDoors();
  this.steps=sampleFootRoute(this.initial,this.route,t);const heading=this.startHeading+Math.atan2(Math.sin(this.heading-this.startHeading),Math.cos(this.heading-this.startHeading))*ease(t/Math.max(.5,this.approach));poseContacts(m,this.steps.contacts,heading,{upperBody:()=>{applyMotionReference(m,m.bank?.clips?.['door-out'],Math.max(0,t-this.approach)*.45,heading,.18*ease(t/.4));const chain=m.rig.chains.rightHand,shoulder=chain.a.getWorldPosition(new T.Vector3()),delta=this.door.handlePoint(this.side).sub(shoulder),distance=delta.length(),reach=(chain.l1+chain.l2)*.94,weight=ease((t-this.approach)/.45)*(1-ease((t-this.slideEnd)/.45));if(distance>reach){const horizontal=Math.hypot(delta.x,delta.z),shift=Math.min(.28,(distance-reach)/Math.max(.25,horizontal/distance))*weight,hip=m.rig.pelvis.getWorldPosition(new T.Vector3());if(horizontal>.01){hip.x+=delta.x/horizontal*shift;hip.z+=delta.z/horizontal*shift;m.rig.pelvis.position.copy(m.rig.pelvis.parent.worldToLocal(hip));m.rig.root.updateMatrixWorld(true);}}}});
  this.grip=ease((t-this.approach)/.45)*(1-ease((t-this.slideEnd)/.45));const chain=m.rig.chains.rightHand,target=chain.c.getWorldPosition(new T.Vector3()).lerp(this.door.handlePoint(this.side),this.grip),direction=target.clone().sub(chain.a.getWorldPosition(new T.Vector3())).normalize(),pole=new T.Vector3(-.25,-1,.15).applyQuaternion(yaw(heading));pole.addScaledVector(direction,-pole.dot(direction)).normalize();p.solveLeg(chain,target,pole,chain.c.getWorldQuaternion(new T.Quaternion()));m.rig.root.updateMatrixWorld(true);p.state=t<this.approach?'미닫이문 앞으로 다가가기':t<this.slideStart?'문 손잡이 잡기':t<this.slideEnd?(this.to?'미닫이문 밀어 열기':'미닫이문 당겨 닫기'):'손 놓기';m.copy();
 }
}
