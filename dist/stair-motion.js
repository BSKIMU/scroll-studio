import * as T from 'three';
import {applyMotionReference} from './motion-reference.js?v=20261025-release1';
import {stairSize} from './scene-stairs.js?v=20261025-release1';
import {contactFeet,poseContacts,sampleFootRoute,yaw,ease} from './contact-pose.js?v=20261025-release1';
export class StairMotion{
 constructor(m,selection,{speed=1,handrail=true,stairStyle='stairs-up'}={}){this.motion=m;this.clip=!selection.down?m.bank?.clips?.[stairStyle]:null;this.stepDuration=stairStyle==='stairs-run'?.3:.48;this.stairs=selection.stairs;this.down=selection.down;this.speed=speed;this.handrail=handrail;this.time=0;this.paused=false;this.done=false;this.mode='stairs';this.grip=0;this.initial=contactFeet(m);this.startHeading=m.controller.heading;this.heading=this.stairs.data.rotation+(this.down?Math.PI:0);this.route=[];
  const {count:n,run:d,rise:h,width:w}=stairSize;this.railSide=this.down?1:-1;this.handContact=handContact(m.rig.chains.rightHand.c);let time=0;const center=this.handrail?this.railSide*(w/2-.31):0;
  const place=(i,y,z)=>{const q=yaw(this.heading-this.startHeading).multiply(this.initial[i].q);this.route.push({i,start:time,duration:this.stepDuration,lift:.14,point:this.stairs.point(center+(i===0?.13:-.13)*(this.down?-1:1),y+.065,z),q});time+=this.stepDuration;};
  // Bring both feet into the entrance before stepping to successive tread centres.
  const start=this.down?{y:n*h,z:n*d+.45}:{y:0,z:-.12};place(0,start.y,start.z);place(1,start.y,start.z);
  for(let j=0;j<n;j++){const level=this.down?n-1-j:j;place(j%2,(level+1)*h,(level+.5)*d);}
  const end=this.down?{y:0,z:-.12}:{y:n*h,z:n*d+.45};place(0,end.y,end.z);place(1,end.y,end.z);this.duration=time+.4;
 }
 get progress(){return Math.min(1,this.time/this.duration);}
 seek(f){this.time=Math.max(0,Math.min(1,f))*this.duration;this.paused=true;this.done=false;this.render();}
 update(dt){if(!this.paused)this.time=Math.min(this.duration,this.time+dt*this.speed);this.render();if(this.time===this.duration){this.done=true;this.paused=!this.motion.sequence?.active;}}
 render(){const m=this.motion,{contacts,swing}=sampleFootRoute(this.initial,this.route,this.time);this.steps={contacts,swing};const angle=this.startHeading+Math.atan2(Math.sin(this.heading-this.startHeading),Math.cos(this.heading-this.startHeading))*ease(this.time/.8);poseContacts(m,contacts,angle,{upperBody:()=>{if(this.clip){const phase=Math.max(0,this.time-this.stepDuration*2)/(this.stepDuration*2)%1;applyMotionReference(m,this.clip,phase*this.clip.duration,angle,ease(this.time/.6)*(1-ease((this.time-this.duration+.4)/.4)));}}});
  this.grip=0;this.contact=null;if(this.handrail){
   const local=this.stairs.root.worldToLocal(m.physics.feet.clone()),chain=m.rig.chains.rightHand;
   const preferred=local.z+(this.down?-.18:.44),{surface,orientation,wrist}=railGrip(this.stairs,this.railSide,this.handContact,chain,preferred);
   const reach=ease((this.time-.48)/.48)*(1-ease((this.time-this.duration+.4)/.4)),target=chain.c.getWorldPosition(new T.Vector3()).lerp(wrist,reach),direction=target.clone().sub(chain.a.getWorldPosition(new T.Vector3())).normalize(),pole=new T.Vector3(-.12,-1,-.12).applyQuaternion(yaw(angle));pole.addScaledVector(direction,-pole.dot(direction)).normalize();
   m.controller.solveLeg(chain,target,pole,chain.c.getWorldQuaternion(new T.Quaternion()).slerp(orientation,reach));m.rig.root.updateMatrixWorld(true);this.grip=reach;this.contact={point:surface,offset:this.handContact.offset,weight:reach};
  }
  m.controller.state=(this.down?'계단 내려가기':'계단 올라가기')+(this.paused?' · 일시 정지':'');m.copy();
 }
}
function handContact(hand){
 const child=suffix=>{let bone;hand.traverse(b=>{if(b.name.endsWith(suffix))bone??=b;});return bone?hand.worldToLocal(bone.getWorldPosition(new T.Vector3())):new T.Vector3(0,8,0);};
 const middle=child('Middle1'),forward=middle.clone().normalize(),width=child('Index1').sub(child('Pinky1')).normalize();width.addScaledVector(forward,-width.dot(forward)).normalize();const normal=width.clone().cross(forward).normalize(),scale=hand.getWorldScale(new T.Vector3()),offset=middle.clone().multiplyScalar(.65).addScaledVector(normal,.012/scale.z);
 return {offset,basis:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(width,forward,normal))};
}

// Pick a point ahead on the rail inside the arm's reach sphere. This keeps the
// shoulder relaxed without shortening the arm or letting the palm drift off.
function railGrip(stairs,side,contact,chain,preferred){
 const shoulder=chain.a.getWorldPosition(new T.Vector3()),scale=chain.c.getWorldScale(new T.Vector3()),rotation=stairs.root.getWorldQuaternion(new T.Quaternion()),radius=(chain.l1+chain.l2)*.97,top=stairSize.count*stairSize.run;
 let best;
 for(const [lo,hi,slope]of [[0,top,stairSize.rise/stairSize.run],[top,top+stairSize.landing,0]]){
  const tangent=new T.Vector3(0,slope,1).normalize().applyQuaternion(rotation),across=new T.Vector3(side,0,0).applyQuaternion(rotation),normal=tangent.clone().cross(across).normalize();if(normal.y>0)tangent.negate(),normal.negate();
  const orientation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(tangent,across,normal)).multiply(contact.basis.clone().invert()),offset=contact.offset.clone().multiply(scale).applyQuaternion(orientation);
  const at=z=>{const surface=stairs.rail(z,side).addScaledVector(normal,-.025);return {surface,wrist:surface.clone().sub(offset),orientation};};
  const first=at(lo),delta=at(hi).wrist.clone().sub(first.wrist).divideScalar(hi-lo),relative=first.wrist.clone().sub(shoulder),a=delta.lengthSq(),b=relative.dot(delta),discriminant=b*b-a*(relative.lengthSq()-radius*radius);
  let lower=lo,upper=hi,reachable=false;
  if(discriminant>=0){const root=Math.sqrt(discriminant);lower=Math.max(lo,lo+(-b-root)/a);upper=Math.min(hi,lo+(-b+root)/a);reachable=lower<=upper;}
  const z=reachable?T.MathUtils.clamp(preferred,lower,upper):T.MathUtils.clamp(lo-b/a,lo,hi),grip=at(z),score=Math.abs(z-preferred)+(reachable?0:100+grip.wrist.distanceTo(shoulder));
  if(!best||score<best.score)best={...grip,score};
 }
 return best;
}
