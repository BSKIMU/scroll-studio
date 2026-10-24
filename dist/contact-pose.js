import * as T from 'three';
export const ease=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
export const yaw=a=>new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),a);
export function contactFeet(m){return ['left','right'].map(side=>{const chain=m.rig.chains[side+'Foot'];return {chain,point:chain.c.getWorldPosition(new T.Vector3()),q:chain.c.getWorldQuaternion(new T.Quaternion())};});}
// Kinematic preview routes use explicit tread/ground contacts; the stance foot
// never chases the root. Pose and hand goals can then be layered on top.
export function poseContacts(m,contacts,heading,{upperBody=()=>{}}={}){
 const p=m.controller,center=contacts[0].point.clone().add(contacts[1].point).multiplyScalar(.5),ground=Math.min(...contacts.map(f=>f.point.y))-.065;
 p.root.set(center.x,0,center.z);p.groundY=ground;p.heading=heading;p.layer={name:'idle',time:0};p.runBlend=0;p.stride=1;p.renderPose();upperBody();
 let drop=0;for(const f of contacts){const d=f.chain.a.getWorldPosition(new T.Vector3()).sub(f.point),reach=(f.chain.l1+f.chain.l2)*.975;drop=Math.max(drop,d.y-Math.sqrt(Math.max(.01,reach*reach-d.x*d.x-d.z*d.z)));}
 if(drop>0){const hip=m.rig.pelvis.getWorldPosition(new T.Vector3());hip.y-=Math.min(.3,drop);m.rig.pelvis.position.copy(m.rig.pelvis.parent.worldToLocal(hip));m.rig.root.updateMatrixWorld(true);}
 for(const f of contacts){const direction=f.point.clone().sub(f.chain.a.getWorldPosition(new T.Vector3())).normalize(),pole=new T.Vector3(0,0,1).applyQuaternion(yaw(heading));pole.addScaledVector(direction,-pole.dot(direction)).normalize();p.solveLeg(f.chain,f.point,pole,f.q);}
 m.rig.root.updateMatrixWorld(true);m.physics.setFeet(new T.Vector3(center.x,ground,center.z));
}
export function sampleFootRoute(initial,steps,time){
 const contacts=initial.map(f=>({...f,point:f.point.clone(),q:f.q.clone()}));let swing=null;
 for(const step of steps){if(time<step.start)break;const f=contacts[step.i],u=Math.min(1,(time-step.start)/step.duration),t=ease(u);f.point.lerp(step.point,t);f.point.y+=Math.sin(Math.PI*u)*(step.lift||.09);f.q.slerp(step.q,t);if(u<1){swing={i:step.i};break;}}
 return {contacts,swing};
}
