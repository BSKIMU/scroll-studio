import * as T from 'three';
let pending;
export function loadInteractionClips(){return pending??=fetch('/assets/interaction-clips.json').then(r=>{if(!r.ok)throw Error('local motion bank unavailable');return r.json();}).then(bank=>{if(bank.version!==1||!bank.clips?.sit?.frames?.length||!bank.clips?.lie?.frames?.length)throw Error('invalid motion bank');return bank;}).catch(error=>{pending=null;return null;});}
const yaw=a=>new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),a),smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
export function sampleInteraction(clip,t){const frame=T.MathUtils.clamp(t/clip.duration,0,1)*(clip.frames.length-1),i=Math.floor(frame),a=clip.frames[i],b=clip.frames[Math.min(i+1,clip.frames.length-1)],u=frame-i;return {hip:new T.Vector3(...a.hip).lerp(new T.Vector3(...b.hip),u),q:clip.bones.map((_,j)=>new T.Quaternion().fromArray(a.q,j*4).slerp(new T.Quaternion().fromArray(b.q,j*4),u))};}
export class FurnitureMotion{
 constructor(motion,seat,bank,{mode='sit',variant='auto',speed=1,changing=false,seatTiming='auto'}={}){
  this.motion=motion;this.seat=seat;this.bank=bank;this.mode=mode;this.variant=variant;this.speed=speed;this.time=0;this.paused=false;this.duration=mode==='lie'?1.1:1.65;this.from=motion.rig.bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone()}));this.startHip=motion.rig.pelvis.getWorldPosition(new T.Vector3());this.startHeading=motion.controller.heading;this.startRoot=motion.rig.root.position.clone();this.clip=bank.clips[mode==='lie'?'lie':'sit'];
  this.seatTiming=seatTiming;this.changing=changing;this.configureTiming(seatTiming);if(changing)this.duration=seatTiming==='natural'?1.2:.55;this.used=new Set();this.bindings=motion.rig.bones.map(b=>{const name=b.name.replace(/^mixamorig[:_]?/,''),index=this.clip.bones.indexOf(name);if(index<0||this.used.has(name))return null;this.used.add(name);return {b,index,rest:motion.rig.rest.get(b).worldQ.clone()};}).filter(Boolean);
  this.ratio=(motion.rig.chains.leftFoot.l1+motion.rig.chains.leftFoot.l2)/this.clip.legLength;
 }
 configureTiming(mode){const progress=this.time/this.duration;this.seatTiming=mode;if(this.mode==='sit'&&!this.changing){const turn=Math.abs(Math.atan2(Math.sin(this.seat.angle-this.startHeading),Math.cos(this.seat.angle-this.startHeading)));this.duration=mode==='fast'?.45:mode==='natural'?1.65:mode==='slow'?2.4:T.MathUtils.clamp(.6+(this.seat.distance||0)*.4+turn/Math.PI*.15,.65,1.15);this.time=progress*this.duration;}}
 get progress(){return Math.min(1,this.time/this.duration);}
 seek(t){this.time=T.MathUtils.clamp(t,0,1)*this.duration;this.paused=true;this.render();}
 update(dt){if(!this.paused)this.time+=dt*this.speed;this.render();}
 render(){const {rig,controller}=this.motion,u=this.progress,angle=this.startHeading+Math.atan2(Math.sin(this.seat.angle-this.startHeading),Math.cos(this.seat.angle-this.startHeading))*smooth(u*3),rootQ=yaw(angle);let clip=this.clip;
  const t=this.mode==='lie'?(Math.max(0,this.time-this.duration)%clip.duration):this.changing?clip.duration:Math.min(clip.duration,u*clip.duration);
  let sample=sampleInteraction(clip,t);
  // A selected static pose blends in after the authored stand-to-sit transition.
  if(this.mode==='sit'&&this.variant!=='sit'){
   const ids=['sit-f1','sit-f2','sit-m1','sit-m2'],elapsed=Math.max(0,this.time-this.duration),cycle=(elapsed+(this.changing?3:0))/4.5;
   const apply=(id,weight,time=0)=>{const hold=this.bank.clips[id];if(!hold)return;const target=sampleInteraction(hold,time);sample.q.forEach((q,i)=>{const j=hold.bones.indexOf(clip.bones[i]);if(j>=0)q.slerp(target.q[j],weight);});};
   const mix=this.changing?smooth(u):smooth((u-.75)*4);
   if(this.variant==='auto'){apply(ids[Math.floor(cycle)%ids.length],mix);apply(ids[(Math.floor(cycle)+1)%ids.length],mix*smooth(cycle%1));}
   else {const hold=this.bank.clips[this.variant];const time=hold&&!hold.static?((elapsed%(hold.duration*2))>hold.duration?hold.duration*2-elapsed%(hold.duration*2):elapsed%(hold.duration*2)):0;apply(this.variant,mix,time);}
  }
  for(const [bone,r]of rig.rest){bone.position.copy(r.p);bone.quaternion.copy(r.q);bone.scale.copy(r.s);}rig.root.position.copy(this.startRoot);rig.root.quaternion.copy(rootQ);rig.root.updateMatrixWorld(true);
  for(const {b,index,rest}of this.bindings)rig.setWorldQ(b,rootQ.clone().multiply(sample.q[index]).multiply(rest));
  let hip=this.seat.anchor.clone();
  if(this.mode==='sit'){
   const end=new T.Vector3(...clip.frames.at(-1).hip),delta=sample.hip.clone().sub(end).multiplyScalar(this.ratio).applyQuaternion(rootQ);hip.y+=.10;hip.add(delta);
   const first=new T.Vector3(...clip.frames[this.changing?clip.frames.length-1:0].hip).sub(end).multiplyScalar(this.ratio).applyQuaternion(yaw(this.startHeading)).add(this.seat.anchor).add(new T.Vector3(0,.10,0));hip.addScaledVector(this.startHip.clone().sub(first),1-smooth(u));
  }else{
   // The supplied lying clip is a breathing idle. Blend into it, then loop it.
   // Source root height is unrelated to a mattress; solve vertical support here.
   const offset=sample.hip.clone().sub(new T.Vector3(...clip.frames[0].hip)).multiplyScalar(this.ratio).applyQuaternion(rootQ);hip.add(offset).addScaledVector(this.seat.axis,-.14);hip.y+=.18;
  }
  rig.pelvis.position.copy(rig.pelvis.parent.worldToLocal(hip.clone()));rig.root.updateMatrixWorld(true);
  if(this.mode==='lie'){
   let lift=-Infinity;for(const name of ['Hips','Spine','Spine1','Spine2','Head','LeftLeg','RightLeg','LeftFoot','RightFoot']){const b=rig.bones.find(b=>b.name==='mixamorig'+name);if(b){const at=b.getWorldPosition(new T.Vector3()),support=this.motion.physics?.floor(at,this.seat.y+.65)??this.seat.y,clearance=/Head/.test(name)?.12:/Spine|Hips/.test(name)?.10:.045;lift=Math.max(lift,support+.015+clearance-at.y);}}
   hip.y+=lift;rig.pelvis.position.copy(rig.pelvis.parent.worldToLocal(hip));rig.root.updateMatrixWorld(true);
  }
  const blend=this.mode==='lie'||this.changing?smooth(u):smooth(u*5);for(const {b,p,q}of this.from){b.position.lerpVectors(p,b.position,blend);b.quaternion.slerpQuaternions(q,b.quaternion.clone(),blend);}rig.root.updateMatrixWorld(true);
  if(this.mode==='sit'&&u>=1){for(const side of ['left','right']){const chain=rig.chains[side+'Foot'],at=chain.c.getWorldPosition(new T.Vector3()),floor=this.motion.physics?.floor(at,this.seat.y-.08)??this.seat.floor;if(at.y<floor+.065){const target=at.clone().setY(floor+.065),pole=new T.Vector3(0,0,1).applyQuaternion(rootQ);controller.solveLeg(chain,target,pole,chain.c.getWorldQuaternion(new T.Quaternion()));rig.root.updateMatrixWorld(true);}}}
  controller.heading=angle;controller.state=this.mode==='lie'?(u<1?'눕는 중':'누워서 호흡'):(u<1?(this.changing?'자세 바꾸는 중':'Mixamo · 앉는 중'):this.variant==='kimodo-seat'?'Kimodo · 앉은 미세 움직임':this.variant==='auto'?'앉아서 자세 바꾸기':'앉아 있음');if(this.paused)controller.state+=' · 일시 정지';this.motion.copy();
 }
}
