import * as T from 'three';
import {FPS} from './timeline.js';

const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g,'');
const rad = T.MathUtils.degToRad;
const wrapDegrees = angle => ((angle+180)%360+360)%360-180;
// Curl at 100% grip per Mixamo finger segment (1 proximal ... 3 distal).
const curl = {thumb:[20,30,25],finger:[45,60,40]};
const colors = {leftHand:0x8de4bb,rightHand:0x9eaefb,leftFoot:0x8de4bb,rightFoot:0x9eaefb};
export const labels = {leftHand:'왼손',rightHand:'오른손',leftFoot:'왼발',rightFoot:'오른발',pelvis:'골반',headTop:'머리 위'};

export class PoseRig {
  // fit:true normalises an arbitrary file to a 1.7 m body standing on the origin.
  // fit:false keeps a body that is already in metres and placed by its root (Blender previs export, per-character height).
  constructor(object,{fit=true}={}) {
    this.object=object; this.root=new T.Group(); this.root.name='PoseLabRoot'; this.root.add(object);
    this.bones=[]; object.traverse(o=>{if(o.isBone)this.bones.push(o);if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
    this.root.updateMatrixWorld(true);
    if(fit){
      let box=new T.Box3().setFromObject(object);
      if(box.isEmpty() && this.bones.length) box.setFromPoints(this.bones.map(b=>b.getWorldPosition(V())));
      const size=box.getSize(V());
      if(!Number.isFinite(size.y)||size.y<1e-6) throw Error('크기를 확인할 수 없는 모델입니다.');
      const scale=1.7/size.y; object.scale.multiplyScalar(scale);
      object.position.sub(V(box.getCenter(V()).x,box.min.y,box.getCenter(V()).z).multiplyScalar(scale));
      this.root.updateMatrixWorld(true);
    }
    this.height=fit?1.7:null;
    this.rest=new Map(this.bones.map(b=>[b,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),worldP:b.getWorldPosition(V()),worldQ:b.getWorldQuaternion(new T.Quaternion())}]));
    this.editBase=this.rest;
    // FBX may repeat a joint name on a leaf child; the first match is the animated joint.
    const find=name=>this.bones.find(b=>normalize(b.name)===normalize('mixamorig'+name));
    this.profile=this.bones.some(b=>/mixamorig/i.test(b.name))?'mixamo':'unknown';
    this.chains={};
    for(const side of ['left','right']) for(const limb of ['Hand','Foot']) {
      const arm=limb==='Hand',names=arm?['Arm','ForeArm','Hand']:['UpLeg','Leg','Foot'];
      const bones=names.map(n=>find(side+n));
      if(bones.every(Boolean)) {
        const [a,b,c]=bones, pa=a.getWorldPosition(V()),pb=b.getWorldPosition(V()),pc=c.getWorldPosition(V());
        this.chains[side+limb]={a,b,c,l1:pa.distanceTo(pb),l2:pb.distanceTo(pc),rest1:pb.clone().sub(pa).normalize(),rest2:pc.clone().sub(pb).normalize(),target:pc.clone(),initial:pc.clone(),pole:0,poleBase:0,arm,side,angle:0,clamped:false};
      }
    }
    this.supported=Object.keys(this.chains).length===4;
    this.spine=find('Spine');
    this.leanBone=this.spine;
    this.head=find('Head');
    this.pelvis=find('Hips');
    this.lean=0;this.grip=0;this.limits=true;this.jointOffsets=new Map();this.jointAngles=new Map();
    this.setupJoints(find);
    this.helper=new T.SkeletonHelper(object);this.helper.material.depthTest=false;this.helper.renderOrder=3;this.helper.visible=false;
    this.handles=new T.Group();
    for(const [name,c] of Object.entries(this.chains)) {
      const m=new T.Mesh(new T.SphereGeometry(.037,16,12),new T.MeshBasicMaterial({color:colors[name],depthTest:false,transparent:true,opacity:.9}));
      m.userData.target=name;m.renderOrder=5;this.handles.add(m);c.handle=m;
    }
    if(this.pelvis&&this.head)for(const [name,bone,color] of [['pelvis',this.pelvis,0xffc77e],['headTop',this.head,0xffd891]]){
      const m=new T.Mesh(new T.SphereGeometry(.044,16,12),new T.MeshBasicMaterial({color,depthTest:false,transparent:true,opacity:.9}));
      m.userData.target=name;m.userData.bodyBone=bone;m.renderOrder=5;this.handles.add(m);
    }
    for(const [name,bone] of Object.entries(this.joints)){
      const m=new T.Mesh(new T.SphereGeometry(.026,12,10),new T.MeshBasicMaterial({color:0xf6f0d9,depthTest:false,transparent:true,opacity:.82}));
      m.userData.joint=name;m.userData.jointBone=bone;m.renderOrder=6;this.handles.add(m);
    }
    this.updateVisuals();
  }
  // Uniform body size; keep bone-local snapshots and the scene placement unchanged.
  setHeight(height) {
    if(this.height===null||!Number.isFinite(height)||height<=0)throw Error('유효한 소체 키(m)가 아닙니다.');
    const ratio=height/this.height;
    this.object.scale.multiplyScalar(ratio);this.object.position.multiplyScalar(ratio);
    for(const r of this.rest.values())r.worldP.multiplyScalar(ratio);
    if(this.editBase!==this.rest)for(const r of this.editBase.values())r.worldP.sub(this.editRootPosition||V()).multiplyScalar(ratio).add(this.editRootPosition||V());
    for(const c of Object.values(this.chains)){
      c.l1*=ratio;c.l2*=ratio;c.target.multiplyScalar(ratio);c.initial.multiplyScalar(ratio);
      if(c.floorY!==undefined)c.floorY=(c.floorY-(this.editRootPosition?.y||0))*ratio+(this.editRootPosition?.y||0);
    }
    this.height=height;this.updateVisuals();
  }
  setupJoints(find) {
    // Axes come from the Mixamo bind: T pose, +Z forward, palms down with thumbs forward.
    // Joint axes live in the parent's rest frame, so offsets premultiply the local rotation.
    this.joints={};this.jointAxes={};this.fingers=[];
    const torso={head:find('Head'),neck:find('Neck'),waist:find('Spine'),chest:find('Spine2')};
    if(!this.supported||Object.values(torso).some(b=>!b?.parent))return;
    const worldP=b=>this.rest.get(b).worldP.clone(),local=(b,axis)=>axis.clone().normalize().applyQuaternion(this.rest.get(b.parent).worldQ.clone().invert());
    const X=V(1,0,0),Y=V(0,1,0),Z=V(0,0,1);
    for(const [id,b] of Object.entries(torso)){this.joints[id]=b;this.jointAxes[id]={bend:local(b,X),turn:local(b,Y),roll:local(b,Z)};}
    for(const side of ['left','right']){
      const s=side[0],arm=this.chains[side+'Hand'],leg=this.chains[side+'Foot'],middle=find(side+'HandMiddle1');
      const armDir=worldP(arm.b).sub(worldP(arm.a)),foreDir=worldP(arm.c).sub(worldP(arm.b)),shinDir=worldP(leg.c).sub(worldP(leg.b));
      const handDir=middle?worldP(middle).sub(worldP(arm.c)):foreDir.clone();
      this.joints[s+'Shoulder']=arm.a;this.jointAxes[s+'Shoulder']={bend:local(arm.a,armDir.clone().cross(Y)),turn:local(arm.a,X.clone().negate())};
      this.joints[s+'Elbow']=arm.b;this.jointAxes[s+'Elbow']={bend:local(arm.b,foreDir.clone().cross(Z)),turn:null};
      this.joints[s+'Knee']=leg.b;this.jointAxes[s+'Knee']={bend:local(leg.b,shinDir.clone().cross(Z.clone().negate())),turn:null};
      this.joints[s+'Wrist']=arm.c;this.jointAxes[s+'Wrist']={bend:local(arm.c,handDir.clone().cross(Y.clone().negate())),turn:local(arm.c,handDir.clone().cross(Z)),roll:local(arm.c,handDir)};
      for(const finger of ['Thumb','Index','Middle','Ring','Pinky'])for(let i=1;i<=3;i++){
        const b=find(`${side}Hand${finger}${i}`),next=find(`${side}Hand${finger}${i+1}`);if(!b||!next)continue;
        const axis=worldP(next).sub(worldP(b)).cross(Y.clone().negate()).normalize().applyQuaternion(this.rest.get(b).worldQ.clone().invert());
        this.fingers.push({bone:b,axis,amount:curl[finger==='Thumb'?'thumb':'finger'][i-1]});
      }
    }
  }
  jointRotation(id,bend=0,turn=0,roll=0) {
    const axes=this.jointAxes[id],q=new T.Quaternion().setFromAxisAngle(axes.bend,rad(bend));
    if(axes.turn)q.multiply(new T.Quaternion().setFromAxisAngle(axes.turn,rad(turn)));
    if(axes.roll)q.multiply(new T.Quaternion().setFromAxisAngle(axes.roll,rad(roll)));
    return q;
  }
  setJoint(id,bend,turn,roll=0) {
    const b=this.joints[id];this.jointAngles.set(id,{bend:id==='waist'?0:bend,turn,roll});
    // Waist bend is the lean about the body's lateral axis; its twist is an offset.
    if(id==='waist'){this.lean=bend;this.jointOffsets.set(b,this.jointRotation(id,0,turn,roll));}
    else this.jointOffsets.set(b,this.jointRotation(id,bend,turn,roll));
    this.solve();
  }
  jointAngle(id) {
    const value=this.jointAngles.get(id)||{bend:0,turn:0,roll:0};
    return id==='waist'?{bend:this.lean+value.bend,turn:value.turn,roll:value.roll}:value;
  }
  controlBone(name){return this.joints[name]||this.chains[name]?.c||(name==='pelvis'?this.pelvis:name==='headTop'?this.head:null);}
  controlPoint(name){return ['pelvis','headTop'].includes(name)?this.bodyPoint(name):this.controlBone(name)?.getWorldPosition(V());}
  moveControl(name,target){
    const c=this.chains[name];
    if(c){c.target.copy(this.root.worldToLocal(target.clone()));this.solve();}
    else this.moveBody(name,target);
  }
  rotateControl(name,delta){
    const bone=this.controlBone(name);if(!bone)return;
    this.root.updateMatrixWorld(true);
    const chain=Object.values(this.chains).find(c=>bone===c.a||bone===c.b);
    if(chain){
      // IK owns shoulders, elbows and knees. Rotate their goal and bend plane,
      // never write a bone quaternion that the next solve would replace.
      const start=chain.a.getWorldPosition(V()),mid=chain.b.getWorldPosition(V()),end=chain.c.getWorldPosition(V());
      const pivot=bone===chain.a?start:mid;
      end.sub(pivot).applyQuaternion(delta).add(pivot);
      if(bone===chain.a)mid.sub(pivot).applyQuaternion(delta).add(pivot);
      const dir=end.clone().sub(start).normalize(),bend=mid.sub(start);
      bend.addScaledVector(dir,-bend.dot(dir)).normalize();
      const pole=(chain.arm?V(0,-1,-.4):V(0,0,1)).applyQuaternion(this.root.getWorldQuaternion(new T.Quaternion()));
      pole.addScaledVector(dir,-pole.dot(dir)).normalize();
      if(pole.lengthSq()&&bend.lengthSq())chain.pole=T.MathUtils.radToDeg(Math.atan2(dir.dot(pole.clone().cross(bend)),pole.dot(bend)));
      chain.target.copy(this.root.worldToLocal(end));
    }else{
      // Convert the requested world orientation after IK establishes the parent frame.
      // This also avoids a jump when the authored baseline first enters the solver.
      return this.solve({bone,worldQ:delta.clone().multiply(bone.getWorldQuaternion(new T.Quaternion()))});
    }
    this.solve();
  }
  // After a pose was written straight to the bones (a sampled clip), move the IK goals and bend planes onto it
  // so the next edit starts from this pose instead of the previous goals.
  syncTargetsFromPose() {
    this.root.updateMatrixWorld(true);
    const rootQ=this.root.getWorldQuaternion(new T.Quaternion());
    for(const c of Object.values(this.chains)){
      const start=c.a.getWorldPosition(V()),mid=c.b.getWorldPosition(V()),end=c.c.getWorldPosition(V());
      const dir=end.clone().sub(start).normalize(),bend=mid.sub(start);bend.addScaledVector(dir,-bend.dot(dir));
      const pole=(c.arm?V(0,-1,-.4):V(0,0,1)).applyQuaternion(rootQ);pole.addScaledVector(dir,-pole.dot(dir));
      if(pole.lengthSq()>1e-8&&bend.lengthSq()>1e-8){pole.normalize();bend.normalize();c.pole=T.MathUtils.radToDeg(Math.atan2(dir.dot(pole.clone().cross(bend)),pole.dot(bend)));}
      c.target.copy(this.root.worldToLocal(end));c.clamped=false;
    }
    this.updateVisuals();
  }
  readJointOffset(id,q){
    const about=(rotation,axis)=>wrapDegrees(Math.round(T.MathUtils.radToDeg(2*Math.atan2(rotation.x*axis.x+rotation.y*axis.y+rotation.z*axis.z,rotation.w))));
    const axes=this.jointAxes[id],bend=about(q,axes.bend);
    const residual=new T.Quaternion().setFromAxisAngle(axes.bend,rad(bend)).invert().multiply(q),turn=axes.turn?about(residual,axes.turn):0;
    const roll=axes.roll?about(new T.Quaternion().setFromAxisAngle(axes.turn,rad(turn)).invert().multiply(residual),axes.roll):0;
    this.jointAngles.set(id,{bend,turn,roll});
  }
  // keepPoles: keep each leg's current bend plane (a sitting or crossed pose sampled from Blender); by default a leg's
  // hinge is the toes' forward so the standing idle knee does not become the permitted bend direction.
  captureEditingBaseline({keepPoles=false}={}) {
    // The authored standing pose is an editing state, never a replacement for the skin's bind/rest pose.
    this.root.updateMatrixWorld(true);
    const rootQ=this.root.getWorldQuaternion(new T.Quaternion()),inverse=rootQ.clone().invert();
    this.editBase=new Map(this.bones.map(b=>[b,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone(),worldP:b.getWorldPosition(V()),worldQ:b.getWorldQuaternion(new T.Quaternion()).premultiply(inverse)}]));
    for(const c of Object.values(this.chains)) {
      const a=c.a.getWorldPosition(V()),b=c.b.getWorldPosition(V()),end=c.c.getWorldPosition(V());
      c.l1=a.distanceTo(b);c.l2=b.distanceTo(end);
      c.rest1=b.clone().sub(a).normalize().applyQuaternion(inverse);
      c.rest2=end.clone().sub(b).normalize().applyQuaternion(inverse);
      // A frame baseline (keepPoles) keeps the floor limit of a standing baseline taken earlier (a raised or crouched foot
      // of that frame is not a floor). A body that never had one (Blender metric) takes each frame's foot height, as before.
      c.initial.copy(this.root.worldToLocal(end.clone()));c.target.copy(c.initial);if(!keepPoles||!this.standingBaseline)c.floorY=end.y;
      const dir=end.clone().sub(a).normalize(),mid=b.clone().sub(a).addScaledVector(dir,-b.clone().sub(a).dot(dir));
      const pole=(c.arm?V(0,-1,-.4):V(0,0,1)).applyQuaternion(rootQ).addScaledVector(dir,-(c.arm?V(0,-1,-.4):V(0,0,1)).applyQuaternion(rootQ).dot(dir)).normalize();
      c.pole=mid.lengthSq()>1e-8&&pole.lengthSq()>1e-8?T.MathUtils.radToDeg(Math.atan2(dir.dot(pole.clone().cross(mid.normalize())),pole.dot(mid))):0;
      // The toes define +Z as forward. The idle knee may sit behind the hip-ankle line;
      // that pose must not become the permitted hinge direction for editing.
      // A frame baseline keeps a leg's bend plane only when the knee is clearly bent (over 15°); a near-straight leg's
      // plane is noise and could make the knee hinge backwards.
      const bend=T.MathUtils.radToDeg(Math.acos(T.MathUtils.clamp((a.distanceTo(end)**2-c.l1**2-c.l2**2)/(2*c.l1*c.l2),-1,1)));
      const keep=c.arm||keepPoles&&bend>15;
      c.poleBase=keep?c.pole:0;
      if(!keep)c.pole=0;
      c.baseAngle=c.angle=bend;
      c.clamped=false;
    }
    if(!keepPoles)this.standingBaseline=true;
    this.editRootPosition=this.root.position.clone();this.editRootQuaternion=this.root.quaternion.clone();
    this.lean=0;this.grip=0;this.jointOffsets.clear();this.jointAngles.clear();this.updateVisuals();
  }
  // The editing baseline as a value: the pose tab keeps its standing baseline while frame baselines come and go.
  // captureEditingBaseline always builds a new editBase map, so holding the old one is safe.
  editingBaselineState() {
    const chains=Object.fromEntries(Object.entries(this.chains).map(([k,c])=>[k,{initial:c.initial.clone(),rest1:c.rest1.clone(),rest2:c.rest2.clone(),l1:c.l1,l2:c.l2,floorY:c.floorY,pole:c.pole,poleBase:c.poleBase,baseAngle:c.baseAngle}]));
    return {editBase:this.editBase,root:[this.editRootPosition?.clone(),this.editRootQuaternion?.clone()],chains,standing:this.standingBaseline};
  }
  setEditingBaselineState(state) {
    this.editBase=state.editBase;[this.editRootPosition,this.editRootQuaternion]=state.root.map(v=>v?.clone());this.standingBaseline=state.standing;
    for(const [k,v] of Object.entries(state.chains))Object.assign(this.chains[k],{...v,initial:v.initial.clone(),rest1:v.rest1.clone(),rest2:v.rest2.clone()});
  }
  editingBaseline() {
    for(const [b,r] of this.editBase){b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s);}
    this.root.position.copy(this.editRootPosition||V());this.root.quaternion.copy(this.editRootQuaternion||new T.Quaternion());
    this.lean=0;this.grip=0;this.jointOffsets.clear();this.jointAngles.clear();
    for(const c of Object.values(this.chains)){c.target.copy(c.initial);c.angle=c.baseAngle??c.angle;c.clamped=false;}
    this.updateVisuals();
  }
  reset() {
    for(const [b,r] of this.rest){b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s);}
    this.root.position.set(0,0,0);this.root.quaternion.identity();this.lean=0;this.grip=0;this.jointOffsets.clear();this.jointAngles.clear();
    for(const c of Object.values(this.chains)){c.target.copy(c.initial);c.pole=c.poleBase;}
    this.root.updateMatrixWorld(true);
    this.updateVisuals();
  }
  setWorldQ(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);}
  setFlex(c,angle){
    this.root.updateMatrixWorld(true);
    const start=c.a.getWorldPosition(V()),goal=this.root.localToWorld(c.target.clone()),dir=goal.sub(start).normalize();
    const flex=T.MathUtils.clamp(angle,this.limits?4:.5,this.limits?145:175);
    const distance=Math.sqrt(c.l1*c.l1+c.l2*c.l2+2*c.l1*c.l2*Math.cos(T.MathUtils.degToRad(flex)));
    c.target.copy(this.root.worldToLocal(start.addScaledVector(dir,distance)));this.solve();
  }
  bodyPoint(name){
    const point=(name==='headTop'?this.head:this.pelvis).getWorldPosition(V());
    if(name==='headTop')point.add(V(0,.16,0).applyQuaternion(this.root.getWorldQuaternion(new T.Quaternion())));
    return point;
  }
  moveBody(name,target){
    if(!this.supported||!['pelvis','headTop'].includes(name))return false;
    this.root.updateMatrixWorld(true);
    const delta=target.clone().sub(this.bodyPoint(name));
    const feet=['leftFoot','rightFoot'].map(key=>{
      const c=this.chains[key];return {c,foot:this.root.localToWorld(c.target.clone()),hip:c.a.getWorldPosition(V())};
    });
    const feasible=t=>feet.every(({c,foot,hip})=>{
      const d=hip.clone().addScaledVector(delta,t).distanceTo(foot);
      const reach=deg=>Math.sqrt(c.l1*c.l1+c.l2*c.l2+2*c.l1*c.l2*Math.cos(rad(deg)));
      return d>=reach(this.limits?145:175)-.002&&d<=reach(this.limits?4:.5)+.002;
    });
    let amount=1;
    if(!feasible(1)){let lo=0,hi=1;for(let i=0;i<20;i++){const mid=(lo+hi)/2;if(feasible(mid))lo=mid;else hi=mid;}amount=lo;}
    if(amount<1e-5)return false;
    this.root.position.addScaledVector(delta,amount);this.root.updateMatrixWorld(true);
    for(const {c,foot} of feet)c.target.copy(this.root.worldToLocal(foot));
    this.solve();return amount>.999;
  }
  turnShoulder(c,raise,forward){
    // Sideways raise about the body's forward axis, forward raise about its lateral axis.
    this.root.updateMatrixWorld(true);
    const start=c.a.getWorldPosition(V()),goal=this.root.localToWorld(c.target.clone()),arm=goal.sub(start);
    const rq=this.root.getWorldQuaternion(new T.Quaternion());
    arm.applyAxisAngle(V(0,0,1).applyQuaternion(rq),rad(raise*(c.side==='left'?1:-1)));
    arm.applyAxisAngle(V(-1,0,0).applyQuaternion(rq),rad(forward));
    const restDir=this.editBase.get(c.c).worldP.clone().sub(this.editBase.get(c.a).worldP).normalize();
    const angle=restDir.angleTo(arm),limit=T.MathUtils.degToRad(this.limits?75:120);
    if(angle>limit)arm.copy(restDir.applyQuaternion(new T.Quaternion().setFromUnitVectors(restDir,arm.clone().normalize()).slerp(new T.Quaternion(),1-limit/angle)).multiplyScalar(arm.length()));
    c.target.copy(this.root.worldToLocal(start.add(arm)));this.solve();
  }
  solve(rotationEdit=null) {
    if(!this.supported)return;
    for(const [b,r] of this.editBase){b.position.copy(r.p);b.quaternion.copy(r.q);b.scale.copy(r.s);}
    this.root.updateMatrixWorld(true);
    if(this.leanBone && this.lean) {
      const axis=V(1,0,0).applyQuaternion(this.root.getWorldQuaternion(new T.Quaternion())).applyQuaternion(this.leanBone.parent.getWorldQuaternion(new T.Quaternion()).invert());
      this.leanBone.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis,T.MathUtils.degToRad(this.lean)));
      this.leanBone.updateWorldMatrix(false,true);
    }
    const applyOffset=b=>{
      if(b&&rotationEdit?.bone===b){
        const offset=b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotationEdit.worldQ).multiply(b.quaternion.clone().invert()).normalize();
        if(this.limits){const limit=rad(b===this.pelvis?35:65),angle=offset.angleTo(new T.Quaternion());if(angle>limit)offset.slerp(new T.Quaternion(),1-limit/angle);}
        this.jointOffsets.set(b,offset);
        const id=Object.keys(this.joints).find(id=>this.joints[id]===b);if(id)this.readJointOffset(id,offset);
      }
      if(b&&this.jointOffsets.has(b)){b.quaternion.premultiply(this.jointOffsets.get(b));b.updateWorldMatrix(false,true);}
    };
    const torso=new Set([this.pelvis,this.joints.waist,this.joints.chest]);
    for(const b of torso)applyOffset(b);
    const rq=this.root.getWorldQuaternion(new T.Quaternion());
    for(const c of Object.values(this.chains)) {
      if(!c.arm)c.target.y=Math.max((c.floorY??c.initial.y)-this.root.position.y,c.target.y);
      const start=c.a.getWorldPosition(V()),goal=this.root.localToWorld(c.target.clone()),delta=goal.sub(start);
      const desired=delta.length(),dir=desired>1e-7?delta.divideScalar(desired):V(0,-1,0);
      const flexMin=this.limits?4:.5,flexMax=this.limits?(c.arm?145:145):175;
      const reach=f=>Math.sqrt(c.l1*c.l1+c.l2*c.l2+2*c.l1*c.l2*Math.cos(T.MathUtils.degToRad(f)));
      const dist=T.MathUtils.clamp(desired,reach(flexMax),reach(flexMin));
      c.clamped=Math.abs(desired-dist)>.002;
      c.angle=T.MathUtils.radToDeg(Math.acos(T.MathUtils.clamp((dist*dist-c.l1*c.l1-c.l2*c.l2)/(2*c.l1*c.l2),-1,1)));
      let pole=(c.arm?V(0,-1,-.4):V(0,0,1)).applyQuaternion(rq);
      const poleAngle=c.arm?c.pole:c.poleBase+T.MathUtils.clamp(wrapDegrees(c.pole-c.poleBase),-65,65);
      pole.applyAxisAngle(dir,rad(poleAngle));
      pole.addScaledVector(dir,-pole.dot(dir));
      if(pole.lengthSq()<1e-5) pole=V(1,0,0).applyQuaternion(rq).addScaledVector(dir,-V(1,0,0).applyQuaternion(rq).dot(dir));
      pole.normalize();
      const x=(c.l1*c.l1-c.l2*c.l2+dist*dist)/(2*dist),y=Math.sqrt(Math.max(0,c.l1*c.l1-x*x));
      const mid=start.clone().addScaledVector(dir,x).addScaledVector(pole,y),end=start.clone().addScaledVector(dir,dist);
      const q1=new T.Quaternion().setFromUnitVectors(c.rest1.clone().applyQuaternion(rq),mid.clone().sub(start).normalize()).multiply(rq.clone().multiply(this.editBase.get(c.a).worldQ));
      this.setWorldQ(c.a,q1);
      const q2=new T.Quaternion().setFromUnitVectors(c.rest2.clone().applyQuaternion(rq),end.clone().sub(mid).normalize()).multiply(rq.clone().multiply(this.editBase.get(c.b).worldQ));
      this.setWorldQ(c.b,q2);
      // Feet keep the editing baseline's root-relative orientation. Wrists inherit the forearm; no competing world-space wrist constraint.
      if(!c.arm)this.setWorldQ(c.c,rq.clone().multiply(this.editBase.get(c.c).worldQ));
    }
    if(this.grip)for(const {bone,axis,amount} of this.fingers)bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,rad(amount*this.grip/100)));
    const offsetBones=new Set(this.jointOffsets.keys());if(rotationEdit)offsetBones.add(rotationEdit.bone);
    for(const b of offsetBones)if(!torso.has(b)&&!Object.values(this.chains).some(c=>b===c.a||b===c.b))applyOffset(b);
    this.root.updateMatrixWorld(true);this.updateVisuals();
  }
  updateVisuals() {
    this.root.updateMatrixWorld(true);
    for(const c of Object.values(this.chains)) {c.handle.position.copy(c.c.getWorldPosition(V()));c.handle.material.color.setHex(c.clamped?0xffb66e:colors[Object.keys(this.chains).find(k=>this.chains[k]===c)]);}
    for(const handle of this.handles.children)if(handle.userData.target==='pelvis'||handle.userData.target==='headTop')handle.position.copy(this.bodyPoint(handle.userData.target));
    for(const handle of this.handles.children)if(handle.userData.joint)handle.position.copy(handle.userData.jointBone.getWorldPosition(V()));
  }
  snapshot(){return {bones:this.bones.map(b=>({name:b.name,p:b.position.toArray(),q:b.quaternion.toArray(),s:b.scale.toArray()})),position:this.root.position.toArray(),quaternion:this.root.quaternion.toArray(),targets:Object.fromEntries(Object.entries(this.chains).map(([k,c])=>[k,{p:c.target.toArray(),pole:c.pole}])),lean:this.lean,grip:this.grip};}
  restore(s){
    // FBX may contain a joint and its child with the same name. Snapshots and key tracks use traversal order.
    // Bone and root quaternions are normalised here, so a snapshot taken after restore() can differ in the last digits from
    // one taken from key playback: compare bone order/names exactly and transforms within a tolerance, not as JSON text.
    if(s.bones.length!==this.bones.length||s.bones.some((b,i)=>b.name!==this.bones[i].name))throw Error('현재 소체와 포즈의 뼈 구성이 다릅니다.');
    this.bones.forEach((b,i)=>{const a=s.bones[i];b.position.fromArray(a.p);b.quaternion.fromArray(a.q).normalize();b.scale.fromArray(a.s);});
    this.root.position.fromArray(s.position);this.root.quaternion.fromArray(s.quaternion).normalize();
    for(const [k,c]of Object.entries(this.chains)){if(s.targets[k]){c.target.fromArray(s.targets[k].p);c.pole=s.targets[k].pole;}}
    this.lean=s.lean;this.grip=s.grip;this.jointOffsets.clear();this.jointAngles.clear();
    if(Object.keys(this.joints).length){
      // Recover editing offsets from the existing bone snapshot, without extra saved fields.
      const saved=this.bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
      if(this.pelvis)this.jointOffsets.set(this.pelvis,this.pelvis.quaternion.clone().multiply(this.editBase.get(this.pelvis).q.clone().invert()));
      this.solve();
      for(const [id,b] of Object.entries(this.joints))if(!/(Shoulder|Elbow|Knee)$/.test(id)){
        const q=saved[this.bones.indexOf(b)].q.clone().multiply(b.quaternion.clone().invert());
        this.jointOffsets.set(b,q);this.readJointOffset(id,q);
      }
      for(const c of Object.values(this.chains))if(!c.arm)this.jointOffsets.set(c.c,saved[this.bones.indexOf(c.c)].q.clone().multiply(c.c.quaternion.clone().invert()));
      this.bones.forEach((b,i)=>{b.position.copy(saved[i].p);b.quaternion.copy(saved[i].q);b.scale.copy(saved[i].s);});
      for(const [k,c]of Object.entries(this.chains))if(s.targets[k])c.target.fromArray(s.targets[k].p);
    }
    this.updateVisuals();
  }
  clip(keys){
    if(keys.length<2)return null;
    const times=keys.map(k=>k.frame/FPS),tracks=[];
    for(let i=0;i<this.bones.length;i++) {
      const b=this.bones[i];
      tracks.push(new T.QuaternionKeyframeTrack(`${b.uuid}.quaternion`,times,keys.flatMap(k=>k.pose.bones[i].q)));
      tracks.push(new T.VectorKeyframeTrack(`${b.uuid}.position`,times,keys.flatMap(k=>k.pose.bones[i].p)));
    }
    tracks.push(new T.VectorKeyframeTrack(`${this.root.uuid}.position`,times,keys.flatMap(k=>k.pose.position)));
    tracks.push(new T.QuaternionKeyframeTrack(`${this.root.uuid}.quaternion`,times,keys.flatMap(k=>k.pose.quaternion)));
    return new T.AnimationClip('PoseLab_keys',times.at(-1),tracks);
  }
  dispose(scene){for(const o of [this.root,this.helper,this.handles]){scene.remove(o);o.traverse(n=>{n.geometry?.dispose();if(n.material){for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}});}}
}
