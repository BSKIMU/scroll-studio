import * as T from 'three';
import {compileCombo,sampleMotion,MotionRetargeter} from './pose-library-motion.js?v=20261029-anchor1';
import {PoseSupport} from './pose-library-support.js?v=20261029-support1';

const Y=new T.Vector3(0,1,0),turn=a=>new T.Quaternion().setFromAxisAngle(Y,a);
const yaw=q=>{const v=new T.Vector3(0,0,1).applyQuaternion(q);return Math.atan2(v.x,v.z);};
const clone=s=>({hip:s.hip.clone(),q:new Map([...s.q].map(([name,q])=>[name,q.clone()]))});
const blend=(a,b,u)=>{b.hip.lerpVectors(a.hip,b.hip,u);for(const [name,q]of b.q)if(a.q.has(name))q.slerpQuaternions(a.q.get(name),q.clone(),u);for(const [name,q]of a.q)if(!b.q.has(name))b.q.set(name,q.clone().slerp(new T.Quaternion(),u));return b;};

// A bounded input buffer: late inputs blend from the actual displayed pose,
// never by recompiling or rewinding a timeline that has already played.
export class LiveComboMotion{
 constructor(motion,items){
  if(!items.length||items.length>16)throw Error('Q 콤보에 동작을 1~16개 넣으세요.');
  this.mode='library';this.live=true;this.keepHands=true;this.motion=motion;this.items=items.map(item=>compileCombo([item]).segments[0]);
  this.retarget=new MotionRetargeter(motion.rig);this.position=motion.physics?.feet.clone()||motion.rig.root.position.clone();this.heading=motion.controller.heading;
  this.support=motion.comboSupport??=new PoseSupport(motion.rig);
  const inverse=turn(this.heading).invert();motion.rig.root.updateMatrixWorld(true);motion.figure?.updateMatrixWorld(true);
  const displayed=motion.figure?.userData.motionRig?.bones||{};
  this.pose={hip:(displayed.Hips||motion.rig.pelvis).getWorldPosition(new T.Vector3()).sub(this.position).applyQuaternion(inverse).divideScalar(this.retarget.leg),q:new Map(this.retarget.bindings.map(({b,name,rest})=>[name,inverse.clone().multiply((displayed[name]||b).getWorldQuaternion(new T.Quaternion())).multiply(rest.clone().invert()).normalize()]))};
  this.queue=[];this.next=0;this.hits=0;this.time=0;this.duration=1;this.speed=1;this.paused=true;this.finished=true;
 }
 enqueue(){
  if(this.queue.length>=3)return false;
  this.queue.push(this.next++%this.items.length);
  if(this.finished)this.begin();
  return true;
 }
 begin(){
  if(this.current)this.render();
  const index=this.queue.shift(),item=this.items[index],first=sampleMotion(item.clip,item.start),rotation=turn(yaw(this.pose.q.get('Hips'))-yaw(first.q.get('Hips')));
  // Each attack uses its own ground-relative height and starts from the same
  // placement anchor. Carrying the previous pelvis offset compounds every hit.
  const offset=first.hip.clone().divideScalar(item.clip.legLength).applyQuaternion(rotation).negate();offset.y=0;
  this.current={...item,index,turn:rotation,offset,airborne:/\b(jump(?:ing)?|flying|aerial)\b|점프|공중/i.test([item.name,item.clip.label].join(' '))};
  this.from=clone(this.renderedPose||this.pose);this.time=0;this.duration=item.length;this.hits++;this.finished=false;this.paused=false;
  this.fade=Math.min(.35,this.duration*.3,Math.max(.08,item.blend||.18));
  // Preserve the main strike; only the final recovery can transition early.
  this.exitAt=Math.max(this.fade,this.duration*.82);
 }
 get progress(){return this.time/this.duration;}
 seek(value){if(!this.current)return;this.queue=[];this.time=T.MathUtils.clamp(value,0,1)*this.duration;this.finished=this.time===this.duration;this.paused=true;this.sample();this.render();}
 sample(){
  const s=this.current,result=sampleMotion(s.clip,s.start+this.time*s.speed);result.hip.divideScalar(s.clip.legLength).applyQuaternion(s.turn).add(s.offset);for(const q of result.q.values())q.premultiply(s.turn);
  const x=T.MathUtils.clamp(this.time/this.fade,0,1);this.pose=blend(this.from,result,x*x*(3-2*x));
 }
 update(dt){
  let remaining=this.paused?0:Math.max(0,dt)*this.speed;
  while(remaining>1e-8&&!this.finished){
   const boundary=this.queue.length?this.exitAt:this.duration,step=Math.min(remaining,Math.max(0,boundary-this.time));
   this.time+=step;remaining-=step;this.sample();
   if(this.time>=boundary-1e-8){if(this.queue.length)this.begin();else{this.finished=true;this.paused=true;}}
  }
  this.render();
 }
 release(){const m=this.motion,feet=m.rig.root.position.clone();m.physics?.setFeet(feet);m.controller.root.copy(feet);m.controller.groundY=feet.y;this.queue=[];}
 render(){
  const m=this.motion;this.retarget.apply(this.pose,{position:this.position,heading:this.heading});
  if(this.current&&!this.current.airborne){const x=T.MathUtils.clamp(this.time/this.fade,0,1);this.support.apply('feet',this.position.y,x*x*(3-2*x));}
  // Keep the editor origin under the displayed body, without feeding this
  // transient stride back into the fixed combo anchor for the next attack.
  const hip=this.retarget.recenter();
  this.renderedPose=clone(this.pose);this.renderedPose.hip.copy(hip).sub(this.position).applyQuaternion(turn(this.heading).invert()).divideScalar(this.retarget.leg);
  m.controller.state=`Q 콤보 · ${this.hits}타 · ${this.current?.name||'준비'} · 다음 ${this.queue.length}개${this.finished?' · 완료':''}`;m.copy();
 }
}
