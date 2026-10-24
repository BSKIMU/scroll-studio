import * as T from 'three';

// Input owns horizontal travel; Pose Lab still owns the authored body/jump poses.
// Contact-matched turns and long recovery clips must not gate an editor's controls.
export const movementResponse={velocityTime:.025,turnRate:22,blendTime:.10,jumpPrep:.08,landingTime:.08,jumpBuffer:.15};
const jumping=name=>name==='jump'||name==='leap'||name==='leapMirror';
const wrap=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));

export class InteractiveMovement{
 constructor(pose,physics=null){
  this.physics=physics;this.launched=false;
  this.pose=pose;this.velocity=new T.Vector3();this.phase=0;this.jumpRequest=0;this.blend=null;
  pose.fade=null;pose.jumpCarry=null;pose.jumpQueued=false;pose.pendingStop=pose.pendingLeap=null;
  pose.runBlend=0;pose.runShift=false;pose.headingVel=0;pose.lead=pose.leadVel=0;
  // The original solver's persistent contact holds belong to its root-motion path.
  for(const foot of Object.values(pose.feet)){foot.hold=foot.release=null;foot.pins=[null,null];}
 }
 requestJump(){this.jumpRequest=movementResponse.jumpBuffer;}
 change(name,time=0){
  const p=this.pose;
  this.blend={time:0,bones:p.rig.bones.map(b=>({bone:b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}))};
  p.layer={name,time};p.fade=null;p.pendingStop=p.pendingLeap=null;
 }
 jumpTimes(name){const m=this.pose.markCache;return name==='jump'?{takeoff:m.takeoff,landing:m.landing}:{takeoff:m[name+'Takeoff'],landing:m[name+'Landing']};}
 advance(dt,direction,settings,run){
  const p=this.pose,wants=Math.hypot(direction.x,direction.z)>.001;
  const target=new T.Vector3(direction.x,0,direction.z).multiplyScalar(wants?(run?settings.run:settings.walk):0);
  // Exact first-order response: same displacement at 30/60/120 Hz, with no post-jump speed state.
  const tau=movementResponse.velocityTime,decay=Math.exp(-dt/tau);
  const delta=target.clone().multiplyScalar(dt).addScaledVector(this.velocity.clone().sub(target),tau*(1-decay));
  if(this.physics){const pos=this.physics.move(delta,dt);p.root.set(pos.x,0,pos.z);p.groundY=pos.y;}else p.root.add(delta);
  this.velocity.sub(target).multiplyScalar(decay).add(target);
  if(this.velocity.lengthSq()<1e-12)this.velocity.set(0,0,0);
  p.velocity.copy(this.velocity);
  if(wants){const error=wrap(Math.atan2(direction.x,direction.z)-p.heading);p.heading+=T.MathUtils.clamp(error,-movementResponse.turnRate*dt,movementResponse.turnRate*dt);}
  const mix=wants&&run?1:0;p.runBlend=T.MathUtils.clamp(p.runBlend+Math.sign(mix-p.runBlend)*dt/movementResponse.blendTime,0,1);
  const [rate,stride]=p.speedSplit(settings);
  if(wants)this.phase+=dt*rate/T.MathUtils.lerp(p.clips.walk.duration,p.clips.run.duration,p.runBlend);

  if(jumping(p.layer.name)){
   const {landing}=this.jumpTimes(p.layer.name);
   if((!this.physics||this.launched&&this.physics.grounded)&&p.layer.time>=landing+movementResponse.landingTime){
    const exit=p.markCache[p.layer.name+'Exit'];
    if(exit?.phase!==undefined)this.phase=exit.phase;
    this.change(wants?'cycle':'idle',wants?this.phase:0);
   }
  }
  if(!jumping(p.layer.name)){
   if(this.jumpRequest>0&&(!this.physics||this.physics.grounded)){
    const name=wants?(this.phase%1<.5?'leapMirror':'leap'):'jump';
    const {takeoff}=this.jumpTimes(name);
    this.change(name,Math.max(0,takeoff-movementResponse.jumpPrep));this.jumpRequest=0;this.launched=false;
   }else if(wants&&p.layer.name!=='cycle')this.change('cycle',this.phase);
   else if(!wants&&p.layer.name!=='idle')this.change('idle');
  }
  this.jumpRequest=Math.max(0,this.jumpRequest-dt);
  p.stride=p.layer.name==='cycle'?stride:1;
  if(p.layer.name==='cycle')p.layer.time=this.phase;else p.layer.time+=dt;
  if(this.physics&&jumping(p.layer.name)){const {takeoff,landing}=this.jumpTimes(p.layer.name);if(!this.launched&&p.layer.time>=takeoff){this.launched=this.physics.jump();}if(this.launched&&!this.physics.grounded)p.layer.time=Math.min(p.layer.time,landing-.03);else if(this.launched&&this.physics.grounded&&p.layer.time<landing)p.layer.time=landing;}
  if(this.blend)this.blend.time+=dt;
  p.motion=p.layer.name==='cycle'?(run?'run':'walk'):p.layer.name;
  if(jumping(p.layer.name)){const times=this.jumpTimes(p.layer.name);p.state=p.layer.time<times.takeoff?'점프 준비':p.layer.time<times.landing?'점프':'착지';}
  else p.state=wants?(run?'달리기':'걷기'):'정지';
 }
 update(seconds,direction,settings,run){
  let remaining=Math.max(0,Math.min(seconds,.1));
  while(remaining>1e-8){const dt=Math.min(remaining,1/120);this.advance(dt,direction,settings,run);remaining-=dt;}
  if(this.physics){const p=this.pose;let lift=0;if(jumping(p.layer.name)){const frame=p.contactFrame(p.parts());lift=Math.max(0,Math.min(frame.rel[0].y,frame.rel[2].y)-p.footHeight);}p.groundY=this.physics.feet.y-lift;}
  this.pose.renderPose();
  if(this.blend){
   const u=Math.min(1,this.blend.time/movementResponse.blendTime),weight=u*u*(3-2*u);
   // Blend from the visible pose, allowing rapid stop/start to interrupt an existing blend.
   for(const {bone,p,q,s}of this.blend.bones){bone.position.lerpVectors(p,bone.position,weight);bone.quaternion.slerpQuaternions(q,bone.quaternion.clone(),weight);bone.scale.lerpVectors(s,bone.scale,weight);}
   this.pose.rig.root.updateMatrixWorld(true);if(u===1)this.blend=null;
  }
 }
}
