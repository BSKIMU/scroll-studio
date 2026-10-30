import {DoorPassageMotion} from './door-passage.js?v=20261026-navigation2';
import {StairMotion} from './stair-motion.js?v=20261025-release1';
import {FurnitureMotion} from './furniture-motion.js?v=20261025-release1';
import {DoorMotion} from './door-motion.js?v=20261025-release1';
import {SlidingDoorMotion} from './sliding-door-motion.js?v=20261025-release1';
import {StandMotion,ActionSequence} from './action-sequence.js?v=20261025-release1';
import {SeatedPose} from './seated-pose.js?v=20261025-release1';
import {applyHandPose,automaticHands,relaxedGrip,clearIdleHands} from './hand-pose.js?v=20261029-hands2';
import {WalkController} from './pose-lab/locomotion.js?v=20261027-navigation5';
import {PoseRig} from './pose-lab/rig.js?v=20261025-release1';
import {movementModel,updateFigureLandmarks} from './mannequin.js?v=20261029-hands2';
import {InteractiveMovement} from './interactive-movement.js?v=20261030-physics60';
import {useCalibratedGunPose} from './curated-guns.js?v=20261029-curated2';
let pending;
export function loadPoseLab(){pending??=WalkController.create().catch(error=>{pending=null;throw error;});return pending;}

export class PoseLabMotion{
 constructor(controller,figure,person,physics=null,bank=null){this.bank=bank;this.interactionOptions={variant:'sit',speed:1};
  this.physics=physics;
  this.controller=controller;this.figure=figure;this.person=person;
  this.rig=new PoseRig(movementModel(person),{fit:false});
  controller.groundY=physics?physics.feet.y:(person.y||0);controller.attach(this.rig);controller.calibrateGround();
  controller.root.set(physics?.feet.x??person.x??0,0,physics?.feet.z??person.z??0);controller.heading=(person.rotation||0)*Math.PI/180;controller.renderPose();
  this.input=new InteractiveMovement(controller,physics);
  const target=figure.userData.motionRig;
  this.pairs=this.rig.bones.map(bone=>[bone,target.bones[bone.name.replace('mixamorig','')]]).filter(pair=>pair[1]);
  this.model=target.model;
  // The controller owns a rig in world metres; the displayed figure retains its existing outer scale.
  this.model.position.copy(this.rig.object.position).divide(figure.scale);
  this.model.scale.copy(this.rig.object.scale).divide(figure.scale);
  this.model.quaternion.copy(this.rig.object.quaternion);
  this.handGrip=relaxedGrip;this.idleWeight=1;this.copy();
 }
 requestJump(){this.sequence=null;if(this.seated)this.stand();this.input.requestJump();}
 interact(options={}){if(['door','stand','stairs'].includes(this.seated?.mode)&&!this.seated.done)return true;this.sequence=null;if(this.seated&&['sit','lie'].includes(this.seated.mode)&&!options.mode&&!options.point){this.seated=new StandMotion(this);return true;}const stair=this.stairs?.nearest(this.physics);if(stair&&!options.mode&&!options.object){this.seated=new StairMotion(this,stair,this.interactionOptions);return true;}const door=this.doors?.nearest(this.physics,options);if(door&&options.mode!=='lie'){this.seated=new (door.door.data.kind==='sliding'?SlidingDoorMotion:DoorMotion)(this,door,this.interactionOptions);return true;}return this.sit(options);}
 sit(options={}){const mode=options.mode||'sit',seat=this.physics?.nearestSeat({...options,lying:mode==='lie'});if(!seat)return false;const exit=this.physics.safeStandingPoint?.(this.physics.feet)||this.physics.feet.clone();this.seatExit=exit;if(mode==='lie'&&!this.bank)return false;this.seated=this.bank?new FurnitureMotion(this,seat,this.bank,{...this.interactionOptions,mode}):new SeatedPose(this,seat);this.input.velocity.set(0,0,0);return true;}
 perform(id){if(id==='door-pass'){const door=this.doors?.nearest(this.physics);if(!door)return false;this.seated=new DoorPassageMotion(this,door,this.interactionOptions);return true;}if(id.startsWith('stairs-')){const stair=this.stairs?.nearest(this.physics);if(!stair||stair.down!==(id==='stairs-down'))return false;this.seated=new StairMotion(this,stair,this.interactionOptions);return true;}if(id==='stand'){this.seated=new StandMotion(this);return true;}if(id.startsWith('door-')){const door=this.doors?.nearest(this.physics);if(!door)return false;this.seated=new (door.door.data.kind==='sliding'?SlidingDoorMotion:DoorMotion)(this,door,{...this.interactionOptions,open:id==='door-open'});return true;}if(id==='pose'&&this.seated?.mode==='sit'){const old=this.seated;this.seated=new FurnitureMotion(this,old.seat,this.bank,{...this.interactionOptions,variant:'auto',changing:true});return true;}return this.sit({mode:id==='lie'?'lie':'sit'});}
 playSequence(steps){this.sequence=new ActionSequence(this,steps);return this.sequence.active;}
 stand(){this.seated?.release?.();if(this.person.motionPose)delete this.person.motionPose.preserveHands;if(this.seatExit&&this.physics){const exit=this.physics.safeStandingPoint?.(this.seatExit);if(exit)this.physics.setFeet(exit);this.seatExit=null;}this.seated=null;this.input.change('idle');this.controller.groundY=this.physics?.feet.y||0;}
 update(dt,direction,settings,run){if(this.seated){if(Math.hypot(direction.x,direction.z)>.001){this.sequence=null;this.stand();}else{this.seated.update(dt);this.sequence?.update(dt);if(this.seated?.done&&!this.seated.paused&&!this.sequence?.active){this.seated=null;this.input.change('idle');}return;}}this.input.update(dt,direction,settings,run);const idle=this.controller.layer.name==='idle',blend=1-Math.exp(-Math.min(dt,.1)/.12);this.handGrip+=( (idle?relaxedGrip:100)-this.handGrip)*blend;this.idleWeight+=((idle?1:0)-this.idleWeight)*blend;this.copy();this.sequence?.update(dt);}
 copy(){
  const {figure,person,rig}=this;
  for(const [from,to]of this.pairs){to.position.copy(from.position);to.quaternion.copy(from.quaternion);to.scale.copy(from.scale);}
  figure.position.copy(rig.root.position);figure.quaternion.copy(rig.root.quaternion);if(!this.seated)clearIdleHands(figure,person,this.idleWeight);if(!this.seated?.keepHands||person.handPose)applyHandPose(figure,['door','stairs'].includes(this.seated?.mode)?{...person,handMode:'manual',hands:{...person.hands,right:(this.seated.grip||0)*70}}:this.seated?.keepHands?{...person,motionPose:{...person.motionPose,preserveHands:true}}:person,this.seated?.keepHands?undefined:this.handGrip);figure.updateMatrixWorld(true);updateFigureLandmarks(figure);
  person.x=figure.position.x;person.y=figure.position.y;person.z=figure.position.z;person.rotation=this.controller.heading*180/Math.PI;person.euler=[0,this.controller.heading,0];
 }
 freeze(){
  const model=this.model;this.seated?.release?.();
  if(['door','stairs'].includes(this.seated?.mode))this.person.hands={...this.person.hands,right:(this.seated.grip||0)*70};
  this.person.motionPose={gunCarry:useCalibratedGunPose(this.person,this)||undefined,preserveHands:this.seated?.keepHands||undefined,handGrip:automaticHands(this.person)?this.handGrip:undefined,seatExit:this.seatExit?this.figure.worldToLocal(this.seatExit.clone()).toArray():undefined,kind:'pose-lab',version:1,feet:this.physics?this.figure.worldToLocal(this.physics.feet.clone()).toArray():undefined,bones:this.pairs.map(([,b])=>({name:b.name,p:b.position.toArray(),q:b.quaternion.toArray(),s:b.scale.toArray()})),model:{p:model.position.toArray(),q:model.quaternion.toArray(),s:model.scale.toArray()}};
  // Leave the rendered bones untouched. detach() would restore the pre-movement pose.
  this.controller.rig=null;
 }
 get state(){return this.controller.state;}
}
