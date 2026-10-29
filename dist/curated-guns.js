// The picker is intentionally small. Older documents still resolve the full catalog.
export const curatedGuns=new Map([
 ['colt-1911',{position:[-.035,-.20,.42],pitch:.12,yaw:0}],
 ['mp5a4',{position:[-.24,-.12,.32],pitch:.18,yaw:.55}],
 ['le6920',{position:[-.24,-.12,.32],pitch:.14,yaw:.55}],
 ['g36c',{position:[-.24,-.12,.32],pitch:.18,yaw:.55}],
 ['scar-h',{position:[-.24,-.12,.32],pitch:.14,yaw:.55}],
]);
const firearmCategories=new Set(['Pistol','SMG','Rifle','Shotgun','Sniper','LMG']);
export function pickerProps(entries){
 return entries.filter(e=>!firearmCategories.has(e.category)).concat([...curatedGuns.keys()].map(id=>entries.find(e=>e.id===id)).filter(Boolean));
}
const carryClips=new Set([
 'mixamo-bb2f95497a86f89d94078496889ecf82',
 'mixamo-7a35d5a7501035eff35fa0d825d245b3',
 'mixamo-d1df3a9773f8acc4d38142dc3dacfade',
 'mixamo-46c36d180b932bd71bce25cc20ff79f3',
 'mixamo-ad49e672d364aba2d43a10f147f54c8c',
]);
export const calibratedGunMotion=entry=>carryClips.has(entry?.id);
export function useCalibratedGunPose(person,motion){
 if(!curatedGuns.has(person.equipment?.right?.id)||person.propHandsLinked===false||person.targets||person.joints||person.jointLocks)return false;
 if(motion?.seated){const action=motion.seated;return calibratedGunMotion(action.current||action.combo?.segments[action.segmentIndex??0]);}
 if(motion)return ['idle','cycle'].includes(motion.controller.layer.name);
 return person.motionPose?!!person.motionPose.gunCarry:person.pose==='stand';
}
export function useGunReadyPose(person,motion){
 return useCalibratedGunPose(person,motion)||!motion?.seated&&!person.motionPose&&person.pose==='stand'&&(!motion||motion.controller.layer.name!=='cycle')&&!person.targets&&!person.joints;
}
