import * as T from 'three';
import {libraryClip} from './library-assets.js';
import {movementModel} from './mannequin.js?v=20261029-hands2';
import {sampleMotion,validateMotion} from './pose-library-motion.js?v=20261029-anchor1';
import {solveLimb} from './pose-math.js?v=20261025-release1';
import {gunProfiles} from './prop-grip-profiles.js?v=20261029-grip3';
import {supportHandFrame} from './prop-grip.js?v=20261029-curated2';
import {gunBody,bodyDistance,gunClearance} from './gun-contact.js?v=20261029-contact4';
import {curatedGuns,useCalibratedGunPose} from './curated-guns.js?v=20261029-curated2';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),restCache=new Map();
const contacts=new WeakMap();
const armFrames=new Map();
function bindArmFrame(person,name){
 const key=person.model+'|'+name;if(armFrames.has(key))return armFrames.get(key);
 const model=movementModel(person),bones={};model.updateMatrixWorld(true);model.traverse(b=>{if(b.isBone)bones[b.name.replace(/^mixamorig[:_]?/i,'')]=b;});
 const bone=bones[name],next=bones[name.replace(/ForeArm$/,'Hand').replace(/(?<!Fore)Arm$/,'ForeArm')],long=next.getWorldPosition(V()).sub(bone.getWorldPosition(V())).normalize();
 const bend=new T.Vector3(0,0,1).addScaledVector(long,-long.z).normalize(),basis=Q().setFromRotationMatrix(new T.Matrix4().makeBasis(long,bend,long.clone().cross(bend)));
 const frame=basis.invert().multiply(bone.getWorldQuaternion(Q()));armFrames.set(key,frame);return frame;
}
const clipIds={idle:'mixamo-bb2f95497a86f89d94078496889ecf82',walk:'mixamo-7a35d5a7501035eff35fa0d825d245b3',run:'mixamo-d1df3a9773f8acc4d38142dc3dacfade'};
let clips,loading;
export function loadGunCarry(){return loading??=Promise.all(Object.entries(clipIds).map(async([kind,id])=>[kind,validateMotion(await libraryClip(id))])).then(rows=>clips=Object.fromEntries(rows)).catch(e=>{loading=null;throw e;});}
function rest(person){if(!restCache.has(person.model)){const model=movementModel(person),bones={};model.updateMatrixWorld(true);model.traverse(b=>{if(b.isBone)bones[b.name.replace(/^mixamorig[:_]?/i,'')]=b.getWorldQuaternion(Q());});restCache.set(person.model,bones);}return restCache.get(person.model);}
const setWorld=(bone,q)=>{bone.quaternion.copy(bone.parent.getWorldQuaternion(Q()).invert().multiply(q).normalize());bone.updateWorldMatrix(false,true);};
// Only arms are layered over the existing locomotion. Legs, root motion,
// collision and authored action clips keep their own animation.
export function applyGunCarry(figure,person,motion,bank=clips){
 const fitted=useCalibratedGunPose(person,motion);
 if(!bank||person.propHandsLinked===false||!Object.values(person.equipment||{}).some(e=>gunProfiles[e.id]))return;
 if(!fitted&&(motion?.seated||!motion&&(person.motionPose||person.pose!=='stand')))return;
 const bones=figure.userData.motionRig?.bones;if(!bones?.Spine2)return;
 const moving=!fitted&&motion?.controller.layer.name==='cycle',phase=moving?motion.controller.layer.time%1:.4,sample=sampleMotion(moving?bank.walk:bank.idle,phase*(moving?bank.walk:bank.idle).duration),bind=rest(person);
 if(moving&&motion.controller.runBlend>0){const run=sampleMotion(bank.run,phase*bank.run.duration);for(const [name,q]of sample.q)if(run.q.has(name))q.slerp(run.q.get(name),motion.controller.runBlend);}
 figure.updateMatrixWorld(true);
 const leftHanded=!!gunProfiles[person.equipment?.left?.id]&&!gunProfiles[person.equipment?.right?.id];
 const source=name=>{const q=sample.q.get(leftHanded?name.replace(/^(Left|Right)/,s=>s==='Left'?'Right':'Left'):name)?.clone();if(q&&leftHanded){q.y=-q.y;q.z=-q.z;}return q;};
 const reference=source('Spine2').multiply(bind.Spine2),frame=bones.Spine2.getWorldQuaternion(Q()).multiply(reference.invert());
 for(const side of ['Left','Right']){
  const key=side.toLowerCase();if(person.targets?.[key+'Hand']||['Shoulder','Elbow','Wrist'].some(j=>person.joints?.[key+j]||person.jointLocks?.[key+j]))continue;
  // Fitted grips solve both arms below. Layer only the relaxed shoulder here,
  // so a walk/run clip switch cannot jerk the already constrained hands.
  for(const part of fitted?['Shoulder']:['Shoulder','Arm','ForeArm','Hand']){const name=side+part,bone=bones[name],q=source(name);if(bone&&q&&bind[name])setWorld(bone,frame.clone().multiply(q).multiply(bind[name]));}
 }
 figure.updateMatrixWorld(true);
}
export function normalizeGun(root,id){
 const profile=gunProfiles[id];if(!profile)return root;
 const wrapper=new T.Group(),q=Q().setFromAxisAngle(new T.Vector3(0,1,0),profile.reverse?Math.PI:0);
 wrapper.add(root);root.quaternion.premultiply(q);root.position.sub(new T.Vector3(...profile.grip).applyQuaternion(q));wrapper.updateMatrixWorld(true);return wrapper;
}
export function supportGun(figure,person,root,side,category,{active=true,ready=false}={}){
 if(!active||person.propHandsLinked===false)return;
 const other=side==='right'?'left':'right',bones=figure.userData.motionRig?.bones,profile=gunProfiles[person.equipment?.[side]?.id];
 if(!profile||!bones?.Spine2||person.equipment?.[other]?.id)return;
 const locked=s=>['Shoulder','Elbow','Wrist'].some(j=>person.jointLocks?.[s+j]);if(locked(other))return;
 const p=bone=>bone.getWorldPosition(V()),chain=s=>{const prefix=s==='left'?'Left':'Right';return ['Arm','ForeArm','Hand'].map(part=>bones[prefix+part]);};
 const holding=chain(side),support=chain(other);if([...holding,...support].some(b=>!b))return;
 const poseStamp=()=>['Hips','Spine','Spine1','Spine2','LeftShoulder','RightShoulder',...['Left','Right'].flatMap(s=>['Arm','ForeArm','Hand'].map(n=>s+n))].flatMap(n=>[...p(bones[n]).toArray(),...bones[n].getWorldQuaternion(Q()).toArray()]);
 const settings=JSON.stringify([side,person.equipment,person.jointLocks,ready]),prior=contacts.get(root),stamp=poseStamp();
 // Render invalidation is not a new pose. Reuse its solved contact rather than
 // accumulating another correction every time selection/UI is repainted.
 if(prior?.settings===settings&&stamp.every((v,i)=>Math.abs(v-prior.stamp[i])<1e-6)){
  root.position.copy(root.parent.worldToLocal(prior.position.clone()));root.quaternion.copy(root.parent.getWorldQuaternion(Q()).invert().multiply(prior.rotation));root.updateMatrixWorld(true);return;
 }
 const body=gunBody(figure,person),forward=new T.Vector3(0,0,1).applyQuaternion(body.q),scale=root.getWorldScale(V());
 const calibrated=ready&&curatedGuns.get(person.equipment?.[side]?.id);
 const originalP=root.getWorldPosition(V()),originalQ=root.getWorldQuaternion(Q()),position=originalP.clone(),rotation=originalQ.clone();
 // Long guns use the actual underside of the fore-end; pistols wrap the
 // opposite side of the main hand. Leave room for the supporting palm skin.
 const grip=new T.Vector3(...profile.support);
 if(category==='Pistol'){if(side==='left')grip.x=-grip.x;}
 else grip.y-=.008;
 grip.multiply(scale);
 const middle=bones[(other==='left'?'Left':'Right')+'HandMiddle1'],palmLocal=p(middle).sub(p(support[2])).multiplyScalar(.58).applyQuaternion(support[2].getWorldQuaternion(Q()).invert());
 const handLocalQ=originalQ.clone().invert().multiply(holding[2].getWorldQuaternion(Q())),handQ=Q(),supportQ=Q();
 const wristLocal=p(holding[2]).sub(originalP).applyQuaternion(originalQ.clone().invert());
 let holdingOffset=V(),supportOffset=V();
 const orient=()=>{handQ.copy(rotation).multiply(handLocalQ);supportQ.copy(rotation).multiply(supportHandFrame(person,other,category));holdingOffset.copy(wristLocal).applyQuaternion(rotation);supportOffset.copy(grip).applyQuaternion(rotation).sub(palmLocal.clone().applyQuaternion(supportQ));};
 if(ready){
  // A deterministic chest-relative ready pose, with a separate support-hand
  // frame for pistols. Imported action wrists are not used as pose targets.
  const poses={Pistol:[-.035,-.20,.42,.12],SMG:[-.10,-.20,.30,.20],Rifle:[-.13,-.16,.30,.17],Shotgun:[-.13,-.19,.31,.22],Sniper:[-.13,-.16,.31,.12],LMG:[-.18,-.12,.38,.10]},[x,y,z,pitch]=calibrated?[...calibrated.position,calibrated.pitch]:poses[category]||poses.Rifle;
  position.set(side==='right'?x:-x,y,z).multiplyScalar(body.scale).applyQuaternion(body.q).add(body.origin);
  const yaw=calibrated?calibrated.yaw:-.10;
  rotation.copy(body.q).multiply(Q().setFromEuler(new T.Euler(pitch,side==='right'?yaw:-yaw,0)));
 }
 orient();
 const reach=arm=>p(arm[0]).distanceTo(p(arm[1]))+p(arm[1]).distanceTo(p(arm[2]))-.006*body.scale;
 const limits=[{arm:holding,offset:()=>holdingOffset,radius:reach(holding)},{arm:support,offset:()=>supportOffset,radius:reach(support)}];
 const projectReach=(candidate,iterations)=>{for(let i=0;i<iterations;i++)for(const limit of limits){const d=candidate.clone().add(limit.offset()).sub(p(limit.arm[0])),excess=d.length()-limit.radius;if(excess>0)candidate.addScaledVector(d.normalize(),-excess);}};
 const targetAcross=position.clone().add(supportOffset).sub(body.origin).applyQuaternion(body.q.clone().invert()).x*(other==='left'?1:-1)<-.06*body.scale;
 // A firearm crossing the torso cannot be fixed by pulling the other hand
 // through the chest. Turn it toward the chest's forward frame, then find a
 // clear position reachable by both hands. The rest of the action stays intact.
 if(!calibrated&&!locked(side)&&(targetAcross||gunClearance(root,body,position,rotation)<-.002)){
  const localForward=new T.Vector3(0,0,1).applyQuaternion(rotation).applyQuaternion(body.q.clone().invert());
  const yaw=T.MathUtils.clamp(Math.atan2(localForward.x,localForward.z),-.5,.5),pitch=T.MathUtils.clamp(Math.asin(T.MathUtils.clamp(localForward.y,-1,1)),-.45,.45);
  const z=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).applyQuaternion(body.q),up=new T.Vector3(0,1,0).applyQuaternion(body.q),x=up.clone().cross(z).normalize();
  rotation.setFromRotationMatrix(new T.Matrix4().makeBasis(x,z.clone().cross(x).normalize(),z));
  orient();
  for(let i=0;i<18;i++){
   const gap=gunClearance(root,body,position,rotation);if(gap<.001)position.addScaledVector(forward,Math.min(.035*body.scale,.004-gap));
   projectReach(position,1);
   if(gap>=.001&&limits.every(l=>position.clone().add(l.offset()).distanceTo(p(l.arm[0]))<=l.radius+.001))break;
  }
 }
 if(!locked(side))projectReach(position,5);
 // If the authored grip lies across the body or leaves no shared reach, use a
 // chest-relative ready position. Both wrists must reach it without stretching.
 if(!calibrated&&!locked(side)&&(gunClearance(root,body,position,rotation)<-.002||position.clone().add(holdingOffset).sub(body.origin).applyQuaternion(body.q.clone().invert()).x*(side==='left'?1:-1)<-.02*body.scale)){
  const sign=side==='left'?1:-1;rotation.copy(body.q).multiply(Q().setFromEuler(new T.Euler(.12,-sign*.55,0)));orient();
  const shoulder=p(holding[0]).sub(body.origin).applyQuaternion(body.q.clone().invert());
  let best=null;
  for(const y of [-.08,-.16,-.24])for(const z of [.24,.30,.36,.42])for(const x of [.10,.16,.22,.28,.34]){
   const candidate=new T.Vector3(sign*x*body.scale,shoulder.y+y*body.scale,z*body.scale).applyQuaternion(body.q).add(body.origin);
   projectReach(candidate,12);
   const gap=gunClearance(root,body,candidate,rotation),cost=Math.max(0,.003-gap)*100+candidate.distanceTo(originalP);
   if(!best||cost<best.cost)best={candidate,cost};
  }
  position.copy(best.candidate);
 }
 const orientArm=(bone,direction,normal,name)=>{const long=direction.clone().normalize(),bend=normal.clone().cross(long).normalize(),basis=Q().setFromRotationMatrix(new T.Matrix4().makeBasis(long,bend,long.clone().cross(bend)));setWorld(bone,basis.multiply(bindArmFrame(person,name)));};
 const solve=(arm,target,q,s)=>{
  // Keep elbows beside/below the ribcage, not on the line through the chest.
  const a=p(arm[0]),b=p(arm[1]),c=p(arm[2]),sign=s==='left'?1:-1;let best,solution;
  // The five fitted carry poses have a fixed elbow pole: switching the best
  // candidate every frame causes visible snapping during walking and running.
  const limb=([x,y,z])=>{const hint=a.clone().add(new T.Vector3(sign*x,y,z).multiplyScalar(body.scale).applyQuaternion(body.q));return solveLimb(a.toArray(),b.toArray(),c.toArray(),target.toArray(),hint.toArray());};
  if(calibrated)solution=limb([.22,-.32,.10]);
  else for(const hint of [[.22,-.32,.10],[.35,-.16,.3],[.3,.05,.35],[.4,-.2,-.05]]){
   const [mid,end]=limb(hint),elbow=new T.Vector3(...mid),wrist=new T.Vector3(...end);
   const gap=Math.min(...[.4,.6,.8,1].map(t=>bodyDistance(a.clone().lerp(elbow,t),body)),...[.2,.4,.6,.8,1].map(t=>bodyDistance(elbow.clone().lerp(wrist,t),body)));
   const rise=elbow.clone().sub(a).applyQuaternion(body.q.clone().invert()).y;
   const cost=Math.max(0,.028*body.scale-gap)*100+Math.max(0,rise+.05*body.scale)*20+elbow.distanceTo(b)*.03;
   if(!best||cost<best.cost)best={mid,end,cost};if(gap>.028*body.scale&&rise<-.05*body.scale)break;
  }
  const [mid,end]=solution||[best.mid,best.end];
  const upper=new T.Vector3(...mid).sub(a),fore=new T.Vector3(...end).sub(new T.Vector3(...mid)),normal=upper.clone().cross(fore).normalize(),prefix=s==='left'?'Left':'Right';
  // Rebuild the bend frame from the bind pose. A shortest-arc correction of
  // the previous action preserves its axial twist and can invert the elbow.
  orientArm(arm[0],upper,normal,prefix+'Arm');orientArm(arm[1],fore,normal,prefix+'ForeArm');
  // Pronation belongs to the forearm. Rotating only the wrist toward the gun
  // left a backwards-looking wrist even though the palm reached its anchor.
  const bind=rest(person),foreQ=arm[1].getWorldQuaternion(Q()),neutral=foreQ.clone().multiply(bind[prefix+'ForeArm'].clone().invert().multiply(bind[prefix+'Hand'])),delta=q.clone().multiply(neutral.invert()),axis=p(arm[2]).sub(p(arm[1])).normalize(),amount=delta.x*axis.x+delta.y*axis.y+delta.z*axis.z,twist=new T.Quaternion(axis.x*amount,axis.y*amount,axis.z*amount,delta.w);
  if(twist.lengthSq()>1e-10)setWorld(arm[1],twist.normalize().multiply(foreQ));setWorld(arm[2],q);
 };
 if(!locked(side)){solve(holding,position.clone().add(holdingOffset),handQ,side);position.copy(p(holding[2]).sub(holdingOffset));}
 root.position.copy(root.parent.worldToLocal(position.clone()));root.quaternion.copy(root.parent.getWorldQuaternion(Q()).invert().multiply(rotation));root.updateMatrixWorld(true);
 solve(support,position.clone().add(supportOffset),supportQ,other);figure.updateMatrixWorld(true);
 contacts.set(root,{settings,stamp:poseStamp(),position:position.clone(),rotation:rotation.clone()});
}
