import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {boneName,validateMotion} from './pose-library-motion.js?v=20261029-anchor1';

// No source models or textures are retained. Import only skeletal samples.
export async function importFBX(buffer,{name='동작',yieldFrame=()=>new Promise(r=>setTimeout(r,0))}={}){
 const manager=new T.LoadingManager();manager.setURLModifier(()=> 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==');
 const object=new FBXLoader(manager).parse(buffer,'');
 try{
  object.updateMatrixWorld(true);const unique=new Map();object.traverse(b=>{if(b.isBone&&!unique.has(boneName(b.name)))unique.set(boneName(b.name),b);});
  const hip=unique.get('Hips'),leg=unique.get('LeftUpLeg'),knee=unique.get('LeftLeg'),foot=unique.get('LeftFoot');
  const animation=object.animations.find(a=>a.tracks.length&&a.duration>0);
  if(!hip||!leg||!knee||!foot||!animation)throw Error('Mixamo 휴머노이드 애니메이션 FBX가 필요합니다.');
  if(animation.duration>180)throw Error('동작 하나는 180초 이하로 잘라 가져오세요.');
  const bones=[...unique.values()],names=[...unique.keys()],rest=bones.map(b=>b.getWorldQuaternion(new T.Quaternion()).invert()),pos=b=>b.getWorldPosition(new T.Vector3());
  const rawLeg=pos(leg).distanceTo(pos(knee))+pos(knee).distanceTo(pos(foot)),unit=rawLeg>10?.01:1;
  const mixer=new T.AnimationMixer(object),action=mixer.clipAction(animation);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const count=Math.ceil(animation.duration*24)+1,frames=[],round=a=>a.map(n=>Math.round(n*1e6)/1e6);
  for(let i=0;i<count;i++){mixer.setTime(animation.duration*i/(count-1));object.updateMatrixWorld(true);frames.push({hip:round(pos(hip).multiplyScalar(unit).toArray()),q:bones.flatMap((b,j)=>round(b.getWorldQuaternion(new T.Quaternion()).multiply(rest[j]).normalize().toArray()))});if(i%48===0)await yieldFrame();}
  mixer.stopAllAction();mixer.uncacheRoot(object);
  return validateMotion({label:name,source:'Mixamo · 사용자 FBX',duration:animation.duration,legLength:rawLeg*unit,bones:names,frames});
 }finally{object.traverse(o=>{o.geometry?.dispose();for(const m of [o.material].flat().filter(Boolean)){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}
}
