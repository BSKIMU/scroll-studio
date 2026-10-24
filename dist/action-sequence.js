import * as T from 'three';
export const actionNames={sit:'앉기',pose:'자세 바꾸기',lie:'눕기',stand:'일어나기','door-open':'문 열기','door-close':'문 닫기','door-pass':'열고 지나가서 닫기','stairs-up':'계단 올라가기','stairs-down':'계단 내려가기'};
export class StandMotion{
 constructor(motion){this.motion=motion;const exit=motion.seatExit&&motion.physics?.safeStandingPoint?.(motion.seatExit);if(exit)motion.physics.setFeet(exit);motion.seatExit=null;this.time=0;this.duration=['natural','slow'].includes(motion.interactionOptions.seatTiming)?.7:.4;this.speed=motion.interactionOptions.speed;this.mode='stand';this.paused=false;this.from=motion.rig.bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone()}));}
 get progress(){return Math.min(1,this.time/this.duration);}
 get done(){return this.progress===1;}
 seek(t){this.time=T.MathUtils.clamp(t,0,1)*this.duration;this.paused=true;this.render();}
 update(dt){if(!this.paused)this.time+=dt*this.speed;this.render();}
 render(){const m=this.motion,p=m.controller;const feet=m.physics.feet;p.root.set(feet.x,0,feet.z);p.groundY=feet.y;p.layer={name:'idle',time:0};p.renderPose();const u=this.progress,t=u*u*(3-2*u);for(const {b,p:pos,q}of this.from){b.position.lerpVectors(pos,b.position,t);b.quaternion.slerpQuaternions(q,b.quaternion.clone(),t);}m.rig.root.updateMatrixWorld(true);p.state=u<1?'일어나는 중':'서 있음';m.copy();}
}
// Each action owns the pose until its transition and hold finish. The next action
// resolves its current scene target then, so stale furniture positions aren't reused.
export class ActionSequence{
 constructor(motion,steps){this.motion=motion;this.steps=steps.filter(s=>s in actionNames).slice(0,16);this.index=-1;this.hold=0;this.active=true;this.error='';this.next();}
 next(){this.index++;this.hold=0;if(this.index>=this.steps.length){this.active=false;return;}const id=this.steps[this.index];if(!this.motion.perform(id)){this.error=actionNames[id]+' · 가까운 대상이 없습니다.';this.active=false;}}
 update(dt){if(!this.active)return;const action=this.motion.seated;if(action?.paused)return;if(action?.error){this.error=action.error;this.active=false;return;}if(!action||action.progress>=1||action.done){this.hold+=dt;if(this.hold> (['sit','lie','pose'].includes(this.steps[this.index])?(this.motion.interactionOptions.seatTiming==='natural'?1.5:.3):0))this.next();}}
 get label(){return this.error||(this.active?`${this.index+1}/${this.steps.length} · ${actionNames[this.steps[this.index]]}`:'연속 동작 완료');}
}
