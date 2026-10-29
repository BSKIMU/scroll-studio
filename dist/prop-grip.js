import * as T from 'three';
import {movementModel} from './mannequin.js?v=20261029-hands2';
import {applyHandPose,automaticHands} from './hand-pose.js?v=20261029-hands2';
import {gunProfiles} from './prop-grip-profiles.js?v=20261029-grip3';
import {curatedGuns,calibratedGunMotion} from './curated-guns.js?v=20261029-curated2';
const cache=new Map(),V=()=>new T.Vector3();
const supportCache=new Map();
export function supportHandFrame(person,side,category='Rifle'){
 const key=[person.model,side,category].join('|');if(supportCache.has(key))return supportCache.get(key);
 const model=movementModel(person),bones={};model.traverse(b=>{if(b.isBone)bones[b.name.replace(/^mixamorig[:_]?/i,'')]=b;});model.updateMatrixWorld(true);
 const prefix=side==='left'?'Left':'Right',hand=bones[prefix+'Hand'],p=b=>b.getWorldPosition(V());
 const long=p(bones[prefix+'HandMiddle1']).sub(p(hand)).normalize(),thumb=p(bones[prefix+'HandIndex1']).sub(p(bones[prefix+'HandPinky1']));thumb.addScaledVector(long,-thumb.dot(long)).normalize();
 // A supporting palm faces up under the fore-end: fingers curl across its
 // width and the thumb points along the barrel. Mirror roles for left carry.
 const targetLong=category==='Pistol'?new T.Vector3(0,0,1):new T.Vector3(side==='left'?-1:1,0,0),targetThumb=category==='Pistol'?new T.Vector3(0,1,0):new T.Vector3(0,0,1);
 const source=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(long,thumb,long.clone().cross(thumb))),target=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(targetLong,targetThumb,targetLong.clone().cross(targetThumb)));
 const q=target.multiply(source.invert()).multiply(hand.getWorldQuaternion(new T.Quaternion()));supportCache.set(key,q);return q;
}
export function applyEquipmentGrip(figure,person){
 if(!automaticHands(person))return;
 const hands={},fingers={};for(const side of ['left','right'])if(person.equipment?.[side]?.id){const item=person.equipment[side],profile=gunProfiles[item.id];hands[side]=item.grip??profile?.curl??72;if(profile){fingers[side]={Index:35,Thumb:45};const other=side==='left'?'right':'left';if(person.propHandsLinked!==false&&!person.equipment[other]){hands[other]=profile.supportCurl??58;fingers[other]={Thumb:30};}}}
 if(Object.keys(hands).length)applyHandPose(figure,{handMode:'manual',hands,fingers,handPose:person.handPose});
}
// Model-specific palm frames are derived from the untouched bind skeleton.
// Props follow the hand's rotation, while their metre scale stays independent of bone units.
export function gripFrame(person,side,category){
 const profile=gunProfiles[person.equipment?.[side]?.id];
 const key=[person.model,person.height,person.scale,side,category,person.equipment?.[side]?.id].join('|');if(cache.has(key))return cache.get(key);
 const model=movementModel(person),bones={};model.traverse(b=>{if(b.isBone)bones[b.name.replace(/^mixamorig[:_]?/i,'')]=b;});model.updateMatrixWorld(true);
 const prefix=side==='left'?'Left':'Right',hand=bones[prefix+'Hand'],middle=bones[prefix+'HandMiddle1'],index=bones[prefix+'HandIndex1'],pinky=bones[prefix+'HandPinky1'];
 if(!hand||!middle||!index||!pinky)return null;
 const p=b=>b.getWorldPosition(V()),w=p(hand),long=p(middle).sub(w).normalize(),thumb=p(index).sub(p(pinky)).normalize();thumb.addScaledVector(long,-thumb.dot(long)).normalize();
 let y,z;
 if(category==='Shield'){y=thumb;z=new T.Vector3(0,-1,0);}
 else if(['Sword','Axe'].includes(category)){y=thumb;z=long.clone().negate();}
 // Pistol-grip fingers point toward the muzzle before curling around the
 // grip. The palm faces its side, never straight down the barrel.
 else {y=thumb;z=long.clone();}
 const x=y.clone().cross(z).normalize();z=x.clone().cross(y).normalize();
 const worldQ=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z)),handQ=hand.getWorldQuaternion(new T.Quaternion());
 const palm=p(index).sub(w).cross(p(pinky).sub(w)).normalize();if(palm.y>0)palm.negate();
 const center=w.clone().lerp(p(middle),.58).addScaledVector(palm,.008);
 // Match the inside of the palm to the measured side of this handle, not
 // its centre. The handle rake also differs between pistol grips and stocks.
 if(profile?.palm){
  worldQ.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-T.MathUtils.degToRad(profile.tilt||0)));
  const contact=new T.Vector3(...profile.palm);if(side==='left')contact.x=-contact.x;
  center.sub(contact.multiplyScalar(person.height/175).applyQuaternion(worldQ));
 }
 // Reverse the axe blade and shield face around their vertical axis;
 // the grip anchor stays in the palm in either hand.
 if(category==='Axe'||category==='Shield')worldQ.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));
 const frame={q:handQ.invert().multiply(worldQ),p:hand.worldToLocal(center),scale:person.height/175};cache.set(key,frame);return frame;
}
export function placeHeldProp(root,figure,side,frame,settings={}){
 const hand=figure.userData.motionRig?.bones[(side==='left'?'Left':'Right')+'Hand'];if(!hand||!frame)return;
 hand.updateWorldMatrix(true,false);const worldQ=hand.getWorldQuaternion(new T.Quaternion()).multiply(frame.q),worldP=hand.localToWorld(frame.p.clone());
 const offset=new T.Vector3().fromArray(settings.offset||[0,0,0]).applyQuaternion(worldQ);worldP.add(offset);
 root.position.copy(figure.worldToLocal(worldP));root.quaternion.copy(figure.getWorldQuaternion(new T.Quaternion()).invert().multiply(worldQ));
 root.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(...(settings.rotation||[0,0,0]).map(T.MathUtils.degToRad))));
 root.scale.setScalar(frame.scale*(settings.scale||1)).divide(figure.getWorldScale(new T.Vector3()));root.updateMatrixWorld(true);
}
export function motionEquipment(entry){
 if(!entry)return null;
 const text=[entry.name,entry.pack].join(' ');
 if(/sword|검|베기/i.test(text)||entry.subcategory==='Sword')return {right:'long-sword',...(/shield|방패/i.test(text)?{left:'shield'}:{})};
 if(/axe|도끼/i.test(text)||entry.weaponType==='axe')return {right:'viking-axe'};
 if(/shield|방패/i.test(text))return {left:'shield'};
 if(/pistol|handgun|권총/i.test(text))return {right:'colt-1911'};
 if(/rifle|shooter|shoot|총|사격/i.test(text)||entry.subcategory==='Firearms')return {right:'le6920'};
 return null;
}

// A library selection chooses the equipment; Q chooses motions for the equipment.
// Keep calibrated grips for compatible items, replace mismatched weapons in both hands.
export function equipmentForMotion(person,entry,catalog){
 const required=motionEquipment(entry);if(!required)return null;
 const result={};
 for(const [side,id]of Object.entries(required)){
  const current=person.equipment?.[side],wanted=catalog.find(e=>e.id===id),held=catalog.find(e=>e.id===current?.id);
  const adapted=side==='right'&&curatedGuns.has(current?.id)&&calibratedGunMotion(entry);
  result[side]=held&&wanted&&(held.category===wanted.category||adapted)?{...current}:{id,offset:[0,0,0],rotation:[0,0,0],scale:1,automatic:true};
 }
 return result;
}
