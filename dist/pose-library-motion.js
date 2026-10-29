import * as T from 'three';
import {comboTiming} from './pose-combo-timing.js?v=20261029-delete1';
import {PoseSupport,supportMode} from './pose-library-support.js?v=20261029-support1';

const clamp=T.MathUtils.clamp, Y=new T.Vector3(0,1,0);
const yaw=q=>{const v=new T.Vector3(0,0,1).applyQuaternion(q);return Math.atan2(v.x,v.z);};
const rotation=a=>new T.Quaternion().setFromAxisAngle(Y,a);
export const boneName=name=>name.replace(/^mixamorig[:_]?/i,'');
export function validateMotion(clip){
 if(!clip||!Array.isArray(clip.bones)||!clip.bones.includes('Hips')||clip.bones.length>128||new Set(clip.bones).size!==clip.bones.length||!clip.bones.every(n=>typeof n==='string'&&n.length<90))throw Error('Mixamo 이름의 휴머노이드 뼈가 필요합니다.');
 if(!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>180||!Number.isFinite(clip.legLength)||clip.legLength<.05||clip.legLength>10||!Array.isArray(clip.frames)||!clip.frames.length||clip.frames.length>5401)throw Error('180초 이하의 유효한 동작을 선택하세요.');
 for(const f of clip.frames){if(!Array.isArray(f.hip)||f.hip.length!==3||!f.hip.every(n=>Number.isFinite(n)&&Math.abs(n)<1000)||!Array.isArray(f.q)||f.q.length!==clip.bones.length*4||!f.q.every(Number.isFinite))throw Error('손상된 포즈 데이터입니다.');for(let i=0;i<f.q.length;i+=4){const len=Math.hypot(...f.q.slice(i,i+4));if(Math.abs(len-1)>.03)throw Error('회전 데이터가 올바르지 않습니다.');}}
 return clip;
}
export function sampleMotion(clip,time){
 const f=clamp(time/clip.duration,0,1)*(clip.frames.length-1),i=Math.floor(f),a=clip.frames[i],b=clip.frames[Math.min(i+1,clip.frames.length-1)],u=f-i;
 return {hip:new T.Vector3(...a.hip).lerp(new T.Vector3(...b.hip),u),q:new Map(clip.bones.map((name,j)=>[name,new T.Quaternion().fromArray(a.q,j*4).slerp(new T.Quaternion().fromArray(b.q,j*4),u)]))};
}
// Precompute the timeline once. Each incoming root starts at the outgoing root
// at the overlap, so locomotion is continuous rather than snapping to FBX origins.
export function compileCombo(items){
 if(!items.length||items.length>16)throw Error('동작을 1~16개 추가하세요.');
 const segments=[];
 const timing=comboTiming(items.map(item=>({...item,clip:validateMotion(item.clip)})));
 for(const [index,item]of items.entries()){
  const clip=item.clip,{start,end,speed,length,overlap,at}=timing.segments[index];
  const prev=segments.at(-1),first=sampleMotion(clip,start),initialYaw=yaw(first.q.get('Hips'));
  const origin=prev?sampleSegment(prev,at):null,heading=origin?yaw(origin.q.get('Hips')):0;
  const segment={...item,clip,start,end,speed,length,at,overlap,support:supportMode(item),turn:rotation(heading-initialYaw),offset:origin?.hip.clone()||new T.Vector3()};
  const transformed=first.hip.clone().divideScalar(clip.legLength).applyQuaternion(segment.turn);
  if(!prev)segment.offset.y=transformed.y;
  segment.offset.sub(transformed);
  // Vertical FBX pelvis coordinates are heights above the source floor, not
  // root travel. Chaining them would turn a crouch recovery into an ascent.
  segment.offset.y=0;segments.push(segment);
 }
 return {segments,duration:segments.at(-1).at+segments.at(-1).length};
}
function sampleSegment(s,time){
 const sample=sampleMotion(s.clip,clamp(s.start+(time-s.at)*s.speed,s.start,s.end));
 sample.hip.divideScalar(s.clip.legLength).applyQuaternion(s.turn).add(s.offset);
 for(const q of sample.q.values())q.premultiply(s.turn);
 return sample;
}
export function sampleCombo(combo,time){
 const t=clamp(time,0,combo.duration),segments=combo.segments;let i=segments.findLastIndex(s=>s.at<=t);i=Math.max(0,i);
 const s=segments[i],sample=sampleSegment(s,t);sample.index=i;
 if(i&&s.overlap&&t<s.at+s.overlap){const a=sampleSegment(segments[i-1],t),x=(t-s.at)/s.overlap,u=x*x*(3-2*x);sample.hip.lerpVectors(a.hip,sample.hip,u);for(const [name,q]of sample.q){if(a.q.has(name))q.slerpQuaternions(a.q.get(name),q.clone(),u);}for(const [name,q]of a.q)if(!sample.q.has(name))sample.q.set(name,q.slerp(new T.Quaternion(),u));}
 return sample;
}
export class MotionRetargeter{
 constructor(rig){this.rig=rig;this.leg=rig.chains.leftFoot.l1+rig.chains.leftFoot.l2;this.bindings=rig.bones.map(b=>({b,name:boneName(b.name),rest:rig.rest.get(b).worldQ.clone()}));}
 apply(sample,{position=new T.Vector3(),heading=0}={}){
  const rig=this.rig,turn=rotation(heading);
  for(const [b,r]of rig.rest){b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s);}
  rig.root.position.copy(position);rig.root.quaternion.copy(turn);rig.root.updateMatrixWorld(true);
  for(const {b,name,rest}of this.bindings){const q=sample.q.get(name);if(q)rig.setWorldQ(b,turn.clone().multiply(q).multiply(rest));}
  const hip=sample.hip.clone().multiplyScalar(this.leg).applyQuaternion(turn).add(position);
  rig.pelvis.position.copy(rig.pelvis.parent.worldToLocal(hip));rig.root.updateMatrixWorld(true);
 }
 recenter(){
  const rig=this.rig,hip=rig.pelvis.getWorldPosition(new T.Vector3());
  rig.root.position.x=hip.x;rig.root.position.z=hip.z;rig.root.updateMatrixWorld(true);
  rig.pelvis.position.copy(rig.pelvis.parent.worldToLocal(hip.clone()));rig.root.updateMatrixWorld(true);
  return hip;
 }
}
export class LibraryMotion{
 constructor(motion,items){this.mode='library';this.motion=motion;this.combo=compileCombo(items);this.duration=this.combo.duration;this.time=0;this.speed=1;this.paused=false;this.keepHands=true;this.retarget=new MotionRetargeter(motion.rig);this.position=motion.physics?.feet.clone()||motion.rig.root.position.clone();this.heading=motion.controller.heading;if(this.combo.segments.some(s=>s.support))this.support=new PoseSupport(motion.rig);}
 get progress(){return this.time/this.duration;}
 seek(value){this.time=clamp(value,0,1)*this.duration;this.paused=true;this.render();}
 update(dt){if(!this.paused){this.time=Math.min(this.duration,this.time+dt*this.speed);if(this.time===this.duration)this.paused=true;}this.render();}
 release(){const m=this.motion,feet=m.rig.root.position.clone();m.physics?.setFeet(feet);m.controller.root.copy(feet);m.controller.groundY=feet.y;}
 render(){
  const m=this.motion,s=sampleCombo(this.combo,this.time),segment=this.combo.segments[s.index];this.retarget.apply(s,{position:this.position,heading:this.heading});
  let mode=segment.support,weight=mode?1:0;
  if(s.index&&segment.overlap&&this.time<segment.at+segment.overlap){const previous=this.combo.segments[s.index-1],x=(this.time-segment.at)/segment.overlap,u=x*x*(3-2*x);weight=(previous.support?1:0)*(1-u)+weight*u;mode=mode||previous.support;}
  this.support?.apply(mode,this.position.y,weight);
  this.retarget.recenter();
  if(this.segmentIndex!==s.index){this.segmentIndex=s.index;this.onSegment?.(s.index);}
  m.controller.state=`${s.index+1}/${this.combo.segments.length} · ${segment.name||'라이브러리 동작'}`;m.copy();
 }
}
