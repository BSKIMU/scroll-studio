import * as T from 'three';
import {solveLimb} from './pose-math.js?v=20261025-release1';
import {gripFrame} from './prop-grip.js?v=20261029-curated2';

const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),position=b=>b.getWorldPosition(V());
const worldRotation=(b,q)=>{b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q).normalize());b.updateWorldMatrix(false,true);};
function solveArm(bones,prefix,target,rotation){
 const upper=bones[prefix+'Arm'],fore=bones[prefix+'ForeArm'],hand=bones[prefix+'Hand'];
 const a=position(upper),b=position(fore),c=position(hand),[mid,end]=solveLimb(a.toArray(),b.toArray(),c.toArray(),target.toArray(),b.toArray());
 worldRotation(upper,Q().setFromUnitVectors(b.clone().sub(a).normalize(),new T.Vector3(...mid).sub(a).normalize()).multiply(upper.getWorldQuaternion(Q())));
 worldRotation(fore,Q().setFromUnitVectors(position(hand).sub(position(fore)).normalize(),new T.Vector3(...end).sub(new T.Vector3(...mid)).normalize()).multiply(fore.getWorldQuaternion(Q())));
 worldRotation(hand,rotation);
}
// Two fixed palm contacts on the same handle, solved after the authored motion.
// Projection moves the shared handle only when either arm cannot reach it.
export function supportMelee(figure,person,root,side){
 const item=person.equipment?.[side],other=side==='right'?'left':'right';
 if(item?.id!=='long-sword'||!item.twoHanded||person.propHandsLinked===false||person.equipment?.[other])return false;
 const bones=figure.userData.motionRig?.bones;if(!bones)return false;
 if([side,other].some(s=>['Shoulder','Elbow','Wrist'].some(j=>person.jointLocks?.[s+j])))return false;
 figure.updateMatrixWorld(true);const rotation=root.getWorldQuaternion(Q()),origin=root.getWorldPosition(V()),scale=root.getWorldScale(V()).y,contacts=[];
 for(const s of [side,other]){
  const prefix=s==='left'?'Left':'Right',arm=bones[prefix+'Arm'],fore=bones[prefix+'ForeArm'],hand=bones[prefix+'Hand'],frame=gripFrame(person,s,'Sword');if(!arm||!fore||!hand||!frame)return false;
  const q=rotation.clone().multiply(frame.q.clone().invert()),handScale=hand.getWorldScale(V());
  const offset=frame.p.clone().multiply(handScale).applyQuaternion(q).negate().add(new T.Vector3(0,s===other?-.10*scale:0,0).applyQuaternion(rotation));
  const shoulder=position(arm),reach=shoulder.distanceTo(position(fore))+position(fore).distanceTo(position(hand))-.0001;
  contacts.push({prefix,q,offset,shoulder,reach});
 }
 for(let i=0;i<20;i++)for(const c of contacts){const d=origin.clone().add(c.offset).sub(c.shoulder);if(d.length()>c.reach)origin.copy(c.shoulder).add(d.setLength(c.reach)).sub(c.offset);}
 for(const c of contacts)solveArm(bones,c.prefix,origin.clone().add(c.offset),c.q);
 root.position.copy(root.parent.worldToLocal(origin));root.updateMatrixWorld(true);return true;
}
