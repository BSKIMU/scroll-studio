import * as T from 'three';
import {assignedSeat} from './imported-background.js?v=20261029-library1';
import {loadPoseLab,PoseLabMotion} from './pose-lab-motion.js?v=20261029-curated2';
import {loadInteractionClips,FurnitureMotion} from './furniture-motion.js?v=20261025-release1';
import {SeatedPose} from './seated-pose.js?v=20261025-release1';

export function setupSeatPresets(editor){
 const box=document.createElement('fieldset');box.hidden=true;box.className='seat-presets';
 box.innerHTML='<legend>배경의 의자</legend><select id="backgroundSeat" aria-label="배경의 좌석"></select><div class="two"><button id="viewBackgroundSeat">좌석 보기</button><button id="sitBackgroundSeat">선택한 인물 앉히기</button></div><small role="status">좌석을 고르면 엉덩이와 발 높이를 맞춰 앉힙니다.</small>';document.getElementById('pose').closest('label').after(box);
 const select=box.querySelector('select'),sit=box.querySelector('#sitBackgroundSeat'),status=box.querySelector('[role="status"]');let seats=[],busy=false;
 const selected=()=>seats[+select.value];
 function view(){const s=selected();if(!s)return;const target=s.anchor.clone().add(new T.Vector3(0,.45,0)),direction=editor.camera.position.clone().sub(editor.controls.target).normalize();editor.controls.target.copy(target);editor.camera.position.copy(target).addScaledVector(direction,3.8);editor.storeCamera();}
 box.querySelector('#viewBackgroundSeat').onclick=view;
 sit.onclick=async()=>{
  const seat=selected(),p=editor.state?.people[editor.index],figure=editor.figures.children[editor.index];if(!seat||!p||busy)return;
  if(!figure?.userData.motionRig){status.textContent='믹사모 인물을 선택하세요.';return;}
  editor.flush();const revision=editor.rebuildToken;busy=true;sit.disabled=true;status.textContent='앉은 자세를 맞추는 중…';
  try{
   const [controller,bank]=await Promise.all([loadPoseLab(),loadInteractionClips()]);
   if(!editor.isOpen||editor.rebuildToken!==revision||editor.state.people[editor.index]!==p||editor.figures.children[editor.index]!==figure)return;
   const front=seat.anchor.clone().addScaledVector(seat.forward,.65);front.y=seat.floor+.015;
   Object.assign(p,{x:front.x,y:front.y,z:front.z,rotation:seat.angle*180/Math.PI,euler:[0,seat.angle,0]});delete p.joints;delete p.targets;delete p.motionPose;
   const motion=new PoseLabMotion(controller,figure,p,null,bank);motion.seatExit=front;
   motion.seated=bank?new FurnitureMotion(motion,seat,bank,{mode:'sit',variant:'sit',speed:1}):new SeatedPose(motion,seat);
   if(motion.seated.seek)motion.seated.seek(1);else motion.seated.update(1);
   motion.freeze();editor.figuresBuild();editor.controlsUI();editor.transformCommit=true;editor.queueLive();view();
   status.textContent=seat.name+'에 앉혔습니다. 아래 손 모양과 보라색 관절로 자세를 더 조절할 수 있습니다.';
  }catch(error){status.textContent='좌석 자세를 불러오지 못했습니다. '+error.message;}
  finally{busy=false;sit.disabled=!editor.state?.people[editor.index];}
 };
 return {sync(){editor.environment.updateMatrixWorld(true);seats=[];editor.environment.traverseVisible(m=>{const s=assignedSeat(m);if(s)seats.push(s);});const previous=select.value;select.replaceChildren(...seats.map((s,i)=>new Option(s.name,i)));select.value=previous!==''&&seats[+previous]?previous:'0';box.hidden=!seats.length;sit.disabled=busy||!editor.state?.people[editor.index];}};
}
