import * as T from 'three';
import {applyMotionReference} from './motion-reference.js?v=20261025-release1';
import {contactFeet,poseContacts,sampleFootRoute,yaw,ease} from './contact-pose.js?v=20261025-release1';
// One leading step and one following step accompany the door swing.
// Approach steps are only added when the actor is not already at the handle.
export class DoorMotion{
 constructor(m,selection,{open=null,speed=1}={}){
  this.motion=m;this.door=selection.door;this.side=selection.side;this.speed=speed;this.mode='door';this.paused=false;this.done=false;this.error='';this.time=0;this.grip=0;this.fromAngle=this.door.data.angle;this.toAngle=(open??!this.door.open)?this.side*Math.PI*.5:0;this.startFeet=m.physics.feet.clone();this.startHeading=m.controller.heading;const at=m.physics.feet;m.controller.root.set(at.x,0,at.z);m.controller.groundY=at.y;m.controller.renderPose();this.initial=contactFeet(m);this.route=[];
  this.clip=m.bank?.clips?.[this.side>0?'door-out':'door-in']||m.bank?.clips?.['kimodo-door'];
  const target=(i,angle)=>{const heading=this.door.data.rotation+angle+(this.side>0?Math.PI:0),center=this.door.root.localToWorld(new T.Vector3(.54,0,this.side*.40).applyQuaternion(yaw(angle))),point=center.add(new T.Vector3(i===0?.13:-.13,.065,0).applyQuaternion(yaw(heading))),q=yaw(heading-this.startHeading).multiply(this.initial[i].q);return {point,q};};
  const first=target(0,this.fromAngle),second=target(1,this.fromAngle),center=first.point.clone().add(second.point).multiplyScalar(.5),approach=Math.hypot(center.x-this.startFeet.x,center.z-this.startFeet.z)>.3;
  this.approach=approach?.72:0;if(approach)for(let i=0;i<2;i++)this.route.push({i,start:i*.36,duration:.36,lift:.07,...target(i,this.fromAngle)});
  this.turnStart=this.approach+.28;this.turnEnd=this.turnStart+1.35;this.duration=this.turnEnd+.28;
  this.route.push({i:0,start:this.turnStart+.06,duration:.55,lift:.065,...target(0,T.MathUtils.lerp(this.fromAngle,this.toAngle,this.toAngle===0?1:.65))});
  this.route.push({i:1,start:this.turnStart+.72,duration:.55,lift:.065,...target(1,this.toAngle)});this.steps={contacts:this.initial,swing:null};

 }
 get progress(){return Math.min(1,this.time/this.duration);}
 seek(f){this.time=0;this.done=false;this.error='';this.paused=false;this.door.setAngle(this.fromAngle);this.motion.physics.setFeet(this.startFeet);const until=T.MathUtils.clamp(f,0,1)*this.duration;for(let t=0;t<until-1e-6;t+=1/60)this.update(Math.min(1/60,until-t)/this.speed);this.paused=true;}
 update(dt){if(this.paused||this.done)return;this.time=Math.min(this.duration,this.time+dt*this.speed);this.render();if(this.time===this.duration)this.done=true;}
 render(){const m=this.motion,p=m.controller,t=this.time,turn=ease((t-this.turnStart)/(this.turnEnd-this.turnStart)),wantedAngle=T.MathUtils.lerp(this.fromAngle,this.toAngle,turn),old=this.door.data.angle;let angle=wantedAngle;if(this.toAngle===0){const local=this.door.root.worldToLocal(m.physics.feet.clone()),radius=Math.hypot(local.x,local.z),clearance=Math.atan2(-this.side*local.z,local.x)+Math.asin(Math.min(1,.36/Math.max(.36,radius)));angle=this.side*Math.max(Math.abs(wantedAngle),T.MathUtils.clamp(clearance,0,Math.abs(this.fromAngle)));}this.door.setAngle(angle);
  if(!m.physics.doorClear(this.door)){this.door.setAngle(old);m.physics.syncDoors();this.error='문 앞 공간이 막혀 있습니다.';this.done=true;p.state=this.error;return;}
  m.physics.syncDoors();this.steps=sampleFootRoute(this.initial,this.route,t);const wanted=this.door.data.rotation+angle+(this.side>0?Math.PI:0),heading=this.startHeading+Math.atan2(Math.sin(wanted-this.startHeading),Math.cos(wanted-this.startHeading))*ease(t/Math.max(.6,this.approach));
  poseContacts(m,this.steps.contacts,heading,{upperBody:()=>{if(this.clip){applyMotionReference(m,this.clip,(this.toAngle?turn:1-turn)*this.clip.duration*.62,heading,ease(t/.28)*(1-ease((t-this.turnEnd)/.28))*.85);m.rig.root.updateMatrixWorld(true);}const chain=m.rig.chains.rightHand,shoulder=chain.a.getWorldPosition(new T.Vector3()),delta=this.door.handlePoint(this.side).sub(shoulder),distance=delta.length(),reach=(chain.l1+chain.l2)*.94,weight=ease((t-this.approach)/.28)*(1-ease((t-this.turnEnd)/.28));if(distance>reach){const horizontal=Math.hypot(delta.x,delta.z),shift=Math.min(.24,(distance-reach)/Math.max(.25,horizontal/distance))*weight,hip=m.rig.pelvis.getWorldPosition(new T.Vector3());if(horizontal>.01){hip.x+=delta.x/horizontal*shift;hip.z+=delta.z/horizontal*shift;m.rig.pelvis.position.copy(m.rig.pelvis.parent.worldToLocal(hip));m.rig.root.updateMatrixWorld(true);}}}});
  this.grip=ease((t-this.approach)/.28)*(1-ease((t-this.turnEnd)/.28));const chain=m.rig.chains.rightHand,target=chain.c.getWorldPosition(new T.Vector3()).lerp(this.door.handlePoint(this.side),this.grip),direction=target.clone().sub(chain.a.getWorldPosition(new T.Vector3())).normalize(),pole=new T.Vector3(-.25,-1,.15).applyQuaternion(yaw(heading));pole.addScaledVector(direction,-pole.dot(direction)).normalize();p.solveLeg(chain,target,pole,chain.c.getWorldQuaternion(new T.Quaternion()));m.rig.root.updateMatrixWorld(true);p.state=t<this.approach?'문 앞으로 다가가기':t<this.turnStart?'손잡이 잡기':t<this.turnEnd?(this.toAngle?'문 열기 · 두 걸음':'문 닫기 · 두 걸음'):'손 놓기';m.copy();
 }
}


