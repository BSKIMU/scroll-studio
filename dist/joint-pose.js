import * as T from 'three';
export const jointBones={leftShoulder:'LeftArm',rightShoulder:'RightArm',leftHip:'LeftUpLeg',rightHip:'RightUpLeg',leftElbow:'LeftForeArm',rightElbow:'RightForeArm',leftKnee:'LeftLeg',rightKnee:'RightLeg',head:'Head',chest:'Spine2',pelvis:'Hips',leftPalm:'LeftHand',rightPalm:'RightHand',leftAnkle:'LeftFoot',rightAnkle:'RightFoot'};
export const jointNames={leftShoulder:'왼어깨',rightShoulder:'오른어깨',leftHip:'왼고관절',rightHip:'오른고관절',leftElbow:'왼팔꿈치',rightElbow:'오른팔꿈치',leftKnee:'왼무릎',rightKnee:'오른무릎',head:'머리',chest:'가슴',pelvis:'골반',leftPalm:'왼손바닥',rightPalm:'오른손바닥',leftAnkle:'왼발목',rightAnkle:'오른발목'};
// Angles relative to the relaxed neutral pose, expressed in figure axes.
// Hinge flexion remains one-sided; shoulder/hip rotation permits a wider cone.
export function jointRange(part){
 if(part.includes('Elbow'))return [[-145,5],[-80,80],[-6,6]];
 if(part.includes('Knee'))return [[-5,150],[-10,10],[-6,6]];
 if(part.includes('Shoulder'))return [[-155,65],[-90,90],[-155,155]];
 if(part.includes('Hip'))return [[-125,35],[-45,45],[-50,50]];
 if(part.includes('Palm'))return [[-80,75],[-85,85],[-30,30]];
 if(part.includes('Ankle'))return [[-45,30],[-20,20],[-25,25]];
 return ({head:[[-45,60],[-80,80],[-40,40]],chest:[[-40,35],[-50,50],[-35,35]],pelvis:[[-40,40],[-60,60],[-35,35]]})[part]||[[-180,180],[-180,180],[-180,180]];
}
export function jointAngles(rig,part,q){
 const name=jointBones[part],base=rig.base[name],frame=rig.jointFrames[name];
 const delta=frame.clone().multiply(q.clone().multiply(base.clone().invert())).multiply(frame.clone().invert());
 const a=new T.Euler().setFromQuaternion(delta,'XYZ');return [a.x,a.y,a.z].map(T.MathUtils.radToDeg);
}
export function jointQuaternion(rig,part,angles,limits=true){
 const range=jointRange(part),a=angles.map((v,i)=>T.MathUtils.degToRad(limits?T.MathUtils.clamp(v,...range[i]):v));
 const name=jointBones[part],frame=rig.jointFrames[name];
 return frame.clone().invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(...a,'XYZ'))).multiply(frame).multiply(rig.base[name]).normalize();
}
export function limitJoint(rig,part,q,enabled=true){return enabled?jointQuaternion(rig,part,jointAngles(rig,part,q),true):q;}
export function mirrorPose(person,rig,source='left'){
 const dest=source==='left'?'right':'left';person.joints||={};
 for(const part of Object.keys(jointBones).filter(k=>k.startsWith(source))){const other=part.replace(source,dest),q=person.joints[part]?new T.Quaternion(...person.joints[part]):rig.bones[jointBones[part]].quaternion;const [x,y,z]=jointAngles(rig,part,q);person.joints[other]=jointQuaternion(rig,other,[x,-y,-z],person.jointLimits!==false).toArray();}
 for(const part of ['Hand','Foot']){const point=person.targets?.[source+part];if(point){person.targets[dest+part]=[-point[0],point[1],point[2]];}}
 if(person.hands?.[source]!==undefined){person.hands[dest]=structuredClone(person.hands[source]);}
 if(person.fingers?.[source]){person.fingers[dest]=structuredClone(person.fingers[source]);}
}
