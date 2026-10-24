import * as T from 'three';
import {DoorMotion} from './door-motion.js?v=20261025-release1';
import {SlidingDoorMotion} from './sliding-door-motion.js?v=20261025-release1';
import {movementDefaults} from './movement-controller.js?v=20261025-release1';
export class DoorPassageMotion{
 constructor(m,selection,options={}){this.motion=m;this.selection=selection;this.door=selection.door;this.options=options;this.speed=options.speed||1;this.mode='door';this.paused=false;this.done=false;this.error='';this.time=0;this.grip=0;this.startFeet=m.physics.feet.clone();this.startHeading=m.controller.heading;this.startAngle=this.door.data.angle;this.reset();}
 make(open,side){return new (this.door.data.kind==='sliding'?SlidingDoorMotion:DoorMotion)(this.motion,{door:this.door,side},{...this.options,open,speed:1});}
 reset(){const m=this.motion;m.physics.setFeet(this.startFeet);m.controller.root.set(this.startFeet.x,0,this.startFeet.z);m.controller.groundY=this.startFeet.y;m.controller.heading=this.startHeading;m.controller.renderPose();this.door.setAngle(this.startAngle);m.physics.syncDoors();this.phase='open';this.child=this.make(true,this.selection.side);this.time=0;this.done=false;this.error='';this.blocked=0;const w=this.door.spec?.width||1.06,s=this.selection.side;this.route=[this.door.root.localToWorld(new T.Vector3(w/2,0,s*.65)),this.door.root.localToWorld(new T.Vector3(w/2,0,-s*.65))];this.duration=this.child.duration+7;}
 get progress(){return this.done?1:Math.min(.99,this.time/this.duration);}
 seek(f){this.reset();this.paused=false;const end=f>=1?40:this.duration*T.MathUtils.clamp(f,0,1);for(let t=0;t<end&&!this.done;t+=1/60)this.update(Math.min(1/60,end-t)/this.speed);this.paused=true;}
 update(dt){if(this.paused||this.done)return;const m=this.motion,step=dt*this.speed;this.time+=step;
  if(this.phase==='open'||this.phase==='close'){this.child.update(step);this.grip=this.child.grip;if(this.child.error){this.error=this.child.error;this.done=true;return;}if(this.child.done){if(this.phase==='close'){this.done=true;return;}this.phase='cross';if(this.door.data.kind!=='sliding'){const side=this.selection.side;for(const z of [side*.45,-side*.45])this.route.push(this.door.hinge.localToWorld(new T.Vector3(1.46,0,z)));}this.route.push(this.door.stance(-this.selection.side));m.input.change('cycle');}return;}
  this.grip=0;const target=this.route[0],feet=m.physics.feet,delta=target.clone().sub(feet);delta.y=0;const distance=delta.length();if(distance<.09){this.route.shift();if(!this.route.length){this.phase='close';this.child=this.make(false,-this.selection.side);this.duration=this.time+this.child.duration;}return;}
  const direction=delta.normalize(),before=m.physics.feet;m.input.update(Math.min(.05,step),direction,{...movementDefaults,walk:Math.min(1.3,distance/Math.max(step,.001))},false);this.blocked=m.physics.feet.distanceTo(before)<.001?this.blocked+step:0;if(this.blocked>.35){this.error='문 통로가 막혀 있습니다. 주변 가구를 확인하세요.';this.done=true;}m.controller.state=this.error||'열린 문으로 지나가기';m.copy();
 }
}
