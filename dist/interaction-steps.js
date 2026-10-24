import * as T from 'three';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),smooth=x=>x*x*(3-2*x);
// World-space support contacts. Only the swinging foot changes its contact;
// the opposite foot supports the body throughout approach, pull and recovery.
export class InteractionSteps{
 constructor(controller){this.p=controller;this.next=0;this.swing=null;this.contacts=['left','right'].map(side=>{const f=controller.feet[side];return {chain:f.chain,point:f.chain.c.getWorldPosition(V()),q:f.chain.c.getWorldQuaternion(Q())};});}
 update(dt,velocity){const p=this.p,ideal=this.contacts.map(f=>({point:f.chain.c.getWorldPosition(V()),q:f.chain.c.getWorldQuaternion(Q())}));
  if(!this.swing){const errors=this.contacts.map((f,i)=>f.point.distanceTo(ideal[i].point)+f.q.angleTo(ideal[i].q)*.08);let i=this.next;if(errors[i]<.08&&errors[1-i]>.12)i=1-i;
   if(errors[i]>.08){const f=this.contacts[i],to=ideal[i].point.clone().addScaledVector(velocity,.12);this.swing={i,time:0,duration:.28,from:f.point.clone(),to,q:f.q.clone(),toQ:ideal[i].q.clone()};this.next=1-i;}
  }
  if(this.swing){const s=this.swing,f=this.contacts[s.i];s.time+=dt;const u=Math.min(1,s.time/s.duration);f.point.lerpVectors(s.from,s.to,smooth(u));f.point.y+=Math.sin(Math.PI*u)*.075;f.q.slerpQuaternions(s.q,s.toQ,smooth(u));if(u===1)this.swing=null;}
  // Preserve the source ankle height and bend knees toward the current facing.
  let drop=0;for(const f of this.contacts){const hip=f.chain.a.getWorldPosition(V()),d=hip.clone().sub(f.point),reach=(f.chain.l1+f.chain.l2)*.985;drop=Math.max(drop,d.y-Math.sqrt(Math.max(.01,reach*reach-d.x*d.x-d.z*d.z)));}
  if(drop>0){const hip=p.rig.pelvis.getWorldPosition(V());hip.y-=Math.min(.35,drop);p.rig.pelvis.position.copy(p.rig.pelvis.parent.worldToLocal(hip));p.rig.root.updateMatrixWorld(true);}
  for(const f of this.contacts){const direction=f.point.clone().sub(f.chain.a.getWorldPosition(V())).normalize(),pole=new T.Vector3(0,0,1).applyAxisAngle(new T.Vector3(0,1,0),p.heading);pole.addScaledVector(direction,-pole.dot(direction)).normalize();p.solveLeg(f.chain,f.point,pole,f.q);}
  p.rig.root.updateMatrixWorld(true);
 }
}
