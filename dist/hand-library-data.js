export const handJointNames=Object.freeze(['Index','Middle','Pinky','Ring','Thumb'].flatMap(n=>[1,2,3].map(i=>n+i)));
export function validHand(joints){return joints&&handJointNames.every(n=>Array.isArray(joints[n])&&joints[n].length===4&&joints[n].every(Number.isFinite)&&Math.abs(Math.hypot(...joints[n])-1)<.01);}
export function applyLibraryHand(person,entry,target='both'){
 if(!person||!['both','left','right'].includes(target))throw Error('적용할 인물과 손을 선택하세요.');
 const sides=target==='both'?['left','right']:[target];
 if(sides.some(side=>!validHand(entry.hands?.[side])))throw Error('손 포즈 데이터가 올바르지 않습니다.');
 person.handPose??={};
 for(const side of sides)person.handPose[side]={id:entry.id,name:entry.name,joints:structuredClone(entry.hands[side])};
}
export function resetLibraryHand(person,target='both'){for(const side of target==='both'?['left','right']:[target])delete person?.handPose?.[side];if(person?.handPose&&!Object.keys(person.handPose).length)delete person.handPose;}
