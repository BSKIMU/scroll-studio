import {followCamera,recoverFollow} from './camera-navigation.js?v=20261026-navigation2';
import {RunInput} from './run-input.js?v=20261025-release1';
import {actionNames} from './action-sequence.js?v=20261025-release1';
import {loadInteractionClips} from './furniture-motion.js?v=20261025-release1';
import {initCollision,SceneCollision} from './scene-collision.js?v=20261028-guide3';
import * as T from 'three';
import {movementDirection,movementKeys,editableTarget,movementDefaults} from './movement-controller.js?v=20261026-navigation2';
import {loadPoseLab,PoseLabMotion} from './pose-lab-motion.js?v=20261027-pose-camera1';
const $=id=>document.getElementById(id),speeds=[['moveWalk','walk'],['moveRun','run']];

export class SceneMovement{
 constructor(editor){
  this.e=editor;this.active=false;this.keys=new Set();this.runInput=new RunInput();this.forward={x:0,z:-1};this.lastTime=0;this.startToken=0;
  const controls=document.querySelector('.scene-controls'),tabs=controls.querySelector('.scene-tabs');
  const panel=document.createElement('div');panel.id='movementPanel';panel.className='scene-property-group movement-panel';panel.hidden=true;
  panel.innerHTML=`<p class="movement-intro">포즈랩 모션 · 선택한 인물을 직접 움직여 자세를 잡으세요.</p>
   <button id="movementStop" disabled>현재 자세로 멈춤 · Esc</button>
   <p id="movementStatus" role="status">움직임 탭을 누르면 바로 조작합니다.</p>
   <div class="furniture-actions"><button id="interactSeat" class="interaction-prompt" hidden>E · 앉기</button><button id="interactLie" hidden>누워 보기</button></div><div id="interactionTimeline" hidden><div class="interaction-playback"><button id="interactionPause">Ⅱ 일시 정지</button><button id="interactionReplay">↶ 다시</button><button id="interactionFreeze">이 자세로 고정</button></div><label>동작 시점 <output id="interactionTimeValue">0%</output><input id="interactionTime" type="range" min="0" max="1000" value="0" aria-label="가구 동작 시점"></label></div><label>앉은 자세<select id="interactionVariant"><option value="sit">기본 · 앉기 동작</option><option value="sit-f1">앉은 포즈 1</option><option value="sit-f2">앉은 포즈 2</option><option value="sit-m1">앉은 포즈 3</option><option value="sit-m2">앉은 포즈 4</option></select></label><label>동작 속도<select id="interactionSpeed"><option value="0.5">0.5×</option><option value="1" selected>1× · 프리비즈</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><small id="interactionSource"></small><div class="movement-pad" aria-label="인물 이동 버튼"><button data-move="KeyW" aria-label="앞으로 이동">W ↑</button><button data-move="KeyA" aria-label="왼쪽으로 이동">A ←</button><button data-move="KeyS" aria-label="뒤로 이동">S ↓</button><button data-move="KeyD" aria-label="오른쪽으로 이동">D →</button><button data-move="Space" aria-label="점프">Space · 점프</button></div>
   <p class="advanced-note">카메라 기준 W 앞 · S 뒤 · A 왼쪽 · D 오른쪽<br>WASD 두 번 / Shift 달리기 · Space 점프 · Esc 자세 고정</p>
   <label>걷기 속도 <output id="moveWalkValue"></output><input id="moveWalk" aria-label="걷기 속도" type="range" min="0.3" max="3" step="0.1"></label>
   <label>달리기 속도 <output id="moveRunValue"></output><input id="moveRun" aria-label="달리기 속도" type="range" min="1" max="6" step="0.1"></label>
   <label class="check"><input id="moveFollow" type="checkbox">카메라 따라가기</label>
   <p class="advanced-note">빠른 입력 반응 · 원본 모션<br>카메라를 돌리면 이동 방향도 함께 바뀝니다. 모든 배경의 벽·가구와 충돌하며, 점프해서 윗면에 착지합니다. 가까운 가구 클릭: 앉기 · 넓은 침대 더블클릭: 눕기 · E: 앉기/일어나기. 동작 바를 끌어 원하는 순간에 멈출 수 있습니다.</p>`;
  controls.append(panel);this.panel=panel;
  panel.prepend(panel.querySelector('.movement-pad'));
  const seatTiming=document.createElement('label');seatTiming.innerHTML='앉기 전환<select id=seatTiming><option value=auto>자동 · 가까운 의자 빠르게</option><option value=fast>빠르게 · 0.45초</option><option value=natural>자연스럽게 · 1.65초</option><option value=slow>천천히 · 2.4초</option></select>';$('interactionSpeed').closest('label').after(seatTiming);$('seatTiming').onchange=e=>{this.settings().seatTiming=e.target.value;if(this.motion){this.motion.interactionOptions.seatTiming=e.target.value;this.motion.seated?.configureTiming?.(e.target.value);}editor.queueLive();};
  const stairStyle=document.createElement('label');stairStyle.innerHTML='계단 오르기<select id=stairStyle><option value=stairs-up>Mixamo · 걷기</option><option value=stairs-ascend>Mixamo · 오르기</option><option value=stairs-run>Mixamo · 뛰어오르기</option></select>';$('seatTiming').closest('label').after(stairStyle);$('stairStyle').onchange=e=>{this.settings().stairStyle=e.target.value;if(this.motion)this.motion.interactionOptions.stairStyle=e.target.value;editor.queueLive();};
  $('interactionVariant').prepend(new Option('자동 · 자연스럽게 자세 바꾸기','auto'));$('interactionVariant').add(new Option('Kimodo · 앉은 호흡 / 미세 움직임','kimodo-seat'));$('interactionVariant').value='auto';
  panel.querySelector('.movement-intro').textContent='가까운 문·가구에서 E · 원하는 순간에 자세 고정';
  panel.querySelector('.advanced-note:last-child').textContent='WASD 이동 · WASD 두 번 / Shift 달리기 · Space 점프 · E 문 열기/닫기 또는 앉기/일어나기. 가구 클릭: 앉기 · 침대 더블클릭: 눕기. 연속 동작은 현재 위치에서 가까운 대상을 사용합니다.';
  const actions=document.createElement('details');actions.className='motion-sequence';actions.innerHTML='<summary>연속 동작 · 쌓아서 재생</summary><div id="sequenceAdd" class="sequence-add"></div><ol id="sequenceSteps"></ol><div class="two"><button id="sequencePlay">▶ 순서대로</button><button id="sequenceClear">비우기</button></div><p id="sequenceStatus" role="status">동작을 눌러 순서에 추가하세요.</p>';
  const passage=document.createElement('button');passage.id='doorPassage';passage.textContent='문 열고 지나가서 닫기';passage.onclick=async()=>{await this.start();if(!this.motion?.perform('door-pass'))this.status('문 손잡이 가까이로 이동하세요.');editor.renderer.domElement.focus({preventScroll:true});};$('interactionSource').before(passage);
  const doorTools=document.createElement('div');doorTools.className='door-tools';doorTools.innerHTML='<button id="addInteractionDoor">＋ 인물 앞에 문 추가</button><button id="removeInteractionDoor">마지막 문 제거</button>';
  $('interactionSource').after(actions,doorTools);const stairsTools=document.createElement('div');stairsTools.className='stairs-tools';stairsTools.innerHTML='<button id=addInteractionStairs>＋ 인물 앞에 손잡이 계단 추가</button><label class=check><input id=useStairRail type=checkbox checked>계단 손잡이 잡기</label>';doorTools.after(stairsTools);$('addInteractionStairs').onclick=()=>{this.stop();this.status(editor.stairs.add()?'계단을 추가했습니다. 아래 또는 위 입구에서 E를 누르세요.':'계단은 컷당 8개까지 추가할 수 있습니다.');};$('useStairRail').onchange=()=>{if(this.motion){this.motion.interactionOptions.handrail=$('useStairRail').checked;if(this.motion.seated?.mode==='stairs')this.motion.seated.handrail=$('useStairRail').checked;}};
  for(const [id,label]of Object.entries(actionNames)){const b=document.createElement('button');b.textContent='＋ '+label;b.onclick=()=>{const steps=this.sequenceSteps();if(steps.length<16){steps.push(id);this.renderSequence();editor.queueLive();}};$('sequenceAdd').append(b);}
  $('sequencePlay').onclick=async()=>{await this.start();this.motion?.playSequence([...this.sequenceSteps()]);surface.focus({preventScroll:true});};
  $('sequenceClear').onclick=()=>{if(this.motion)this.motion.sequence=null;this.settings().sequence=[];this.renderSequence();editor.queueLive();};
  $('addInteractionDoor').onclick=()=>{const door=editor.doors.add();this.status(door?'인물 앞에 문을 추가했습니다. 움직임 탭에서 가까이 가서 E를 누르세요.':'문은 컷당 16개까지 추가할 수 있습니다.');};
  $('removeInteractionDoor').onclick=async()=>{editor.flush();const doors=editor.state.doors||[],i=doors.findLastIndex(d=>d.asset===editor.state.asset);if(i<0)return;doors.splice(i,1);await editor.buildEnvironment();editor.queueLive();};

  const tab=document.createElement('button');tab.textContent='움직임';tab.id='movementTab';
  tab.onclick=()=>{controls.querySelectorAll('.scene-property-group').forEach(p=>p.hidden=p!==panel);tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===tab));this.start();};tabs.children[1].after(tab);
  const freeze=()=>{this.stop();surface.focus({preventScroll:true});};$('movementStop').onclick=freeze;$('interactionFreeze').onclick=freeze;
  $('interactLie').onclick=()=>{this.motion?.interact({mode:'lie'});surface.focus({preventScroll:true});};
  $('interactionPause').onclick=()=>{const m=this.motion?.seated;if(m)m.paused=!m.paused;};
  $('interactionReplay').onclick=()=>{const m=this.motion?.seated;if(m?.seek){m.seek(0);m.paused=false;}};
  $('interactionTime').oninput=e=>this.motion?.seated?.seek?.(+e.target.value/1000);
  $('interactionVariant').onchange=e=>{if(this.motion){this.motion.interactionOptions.variant=e.target.value;const current=this.motion.seated;if(current?.mode==='sit'){this.motion.perform('pose');this.motion.seated.variant=e.target.value;}}};
  $('interactionSpeed').onchange=e=>{if(this.motion){this.motion.interactionOptions.speed=+e.target.value;if(this.motion.seated)this.motion.seated.speed=+e.target.value;}};$('interactSeat').onclick=()=>{this.motion?.interact();editor.renderer.domElement.focus({preventScroll:true});};
  for(const [id,key]of speeds)$(id).oninput=()=>{this.settings()[key]=Number($(id).value);$(id+'Value').textContent=$(id).value+' m/s';editor.queueLive();};
  $('moveFollow').onchange=()=>{this.settings().follow=$('moveFollow').checked;if(this.settings().follow&&this.active)this.frameFollow();editor.queueLive();};
  const surface=editor.renderer.domElement,focused=target=>$('sceneDialog').contains(target),movementSelected=()=>!panel.hidden;
  let clickTimer=0;this.cancelFurnitureClick=()=>clearTimeout(clickTimer);const ray=new T.Raycaster(),view=$('sceneView');
  const pick=event=>{const r=surface.getBoundingClientRect();ray.setFromCamera(new T.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),editor.camera);return ray.intersectObject(editor.environment,true)[0];};
  // Camera drag captures pointers on sceneView and suppresses clicks after a drag.
  // Listen on that same view so real clicks survive pointer capture.
  view.addEventListener('click',event=>{if(!this.active||event.button!==0||event.altKey||![surface,view].includes(event.target))return;const hit=pick(event);if(!hit)return;clearTimeout(clickTimer);const pendingMotion=this.motion,token=this.startToken;clickTimer=setTimeout(()=>{if(this.active&&this.motion===pendingMotion&&this.startToken===token&&!this.motion.interact({mode:'sit',point:hit.point,object:hit.object})){this.promptUntil=performance.now()+1800;this.status('의자 옆 빈 통로로 조금 더 가까이 이동하세요.');}},hit.object.userData.scrollSeat||hit.object.parent?.userData.scrollSeat?0:250);});
  view.addEventListener('dblclick',event=>{if(!this.active||event.button!==0||event.altKey||![surface,view].includes(event.target))return;clearTimeout(clickTimer);const hit=pick(event);if(!hit)return;event.preventDefault();event.stopImmediatePropagation();if(!this.motion.interact({mode:'lie',point:hit.point,object:hit.object})){this.promptUntil=performance.now()+1800;this.status('눕기에는 가까운 넓은 가구가 필요합니다.');}},true);
  document.addEventListener('keydown',event=>{ 
   if(editor.fly?.active||(!this.engaged&&!movementSelected())||editableTarget(event.target)||!focused(event.target)||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
   if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.stop();return;}
   if(event.code==='KeyE'){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)this.motion?.interact();return;}if(!movementKeys.has(event.code))return;
   event.preventDefault();event.stopImmediatePropagation();
   // A layout change or blur may have frozen motion. The selected movement tab
   // still owns WASD, including S, so resume without falling into Scale.
   if(!this.engaged)this.start();
   this.keys.add(event.code);this.runInput.down(event.code,performance.now(),event.repeat);
   if(event.code==='Space'&&!event.repeat)this.motion?.requestJump();
  },true);
  document.addEventListener('keyup',event=>{this.keys.delete(event.code);this.runInput.up(event.code);if(this.engaged&&focused(event.target)&&movementKeys.has(event.code)&&!editableTarget(event.target)){event.preventDefault();event.stopImmediatePropagation();}},true);
  window.addEventListener('blur',()=>this.stop());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
  document.addEventListener('focusin',event=>{if(this.engaged&&(!focused(event.target)||editableTarget(event.target)&&!panel.contains(event.target)))this.stop();});
  document.addEventListener('pointerdown',event=>{if(this.engaged&&event.target!==tab&&!panel.contains(event.target)&&!$('sceneView').contains(event.target))this.stop();},true);
  // Capture before loading so releasing during the first asset load cannot leave a key pressed.
  panel.querySelectorAll('[data-move]').forEach(button=>{
   button.onpointerdown=async event=>{if(event.button!==0)return;event.preventDefault();button.setPointerCapture(event.pointerId);button.classList.add('active');await this.start();if(!this.active||!button.hasPointerCapture(event.pointerId))return;this.keys.add(button.dataset.move);this.runInput.down(button.dataset.move,performance.now());if(button.dataset.move==='Space')this.motion.requestJump();};
   const release=()=>{this.keys.delete(button.dataset.move);this.runInput.up(button.dataset.move);button.classList.remove('active');};
   for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,release);
  });
 }
 get engaged(){return !!(this.active||this.starting||this.resumeAfterLoad);}
 sceneReady(){this.sync();if(this.resumeAfterLoad)queueMicrotask(()=>{if(this.resumeAfterLoad)this.start();});}
 settings(){const s=this.e.state;if(!s)return {...movementDefaults};const settings=s.movement??={};for(const [key,min,max]of [['walk',.3,3],['run',1,6]])settings[key]=Number.isFinite(settings[key])?Math.max(min,Math.min(max,settings[key])):movementDefaults[key];settings.follow=typeof settings.follow==='boolean'?settings.follow:movementDefaults.follow;settings.seatTiming=['auto','fast','natural','slow'].includes(settings.seatTiming)?settings.seatTiming:'auto';settings.stairStyle=['stairs-up','stairs-ascend','stairs-run'].includes(settings.stairStyle)?settings.stairStyle:'stairs-up';return settings;}
 reset(){this.stop({flush:false});this.person=null;this.figure=null;this.status(this.e.state?.people[this.e.index]?'움직임 탭을 누르면 바로 조작합니다.':'인물 탭에서 인물 가이드를 추가하세요.');}
 sync(){const s=this.settings();for(const [id,key]of speeds){$(id).value=s[key];$(id+'Value').textContent=$(id).value+' m/s';}$('moveFollow').checked=s.follow;$('seatTiming').value=s.seatTiming;$('stairStyle').value=s.stairStyle;$('movementStop').disabled=!this.engaged;const icon=$('cameraMovement');if(icon){icon.classList.toggle('active',this.engaged);icon.setAttribute('aria-pressed',String(this.engaged));}this.e.gizmo.transform.enabled=!this.engaged&&!this.e.fly?.active;$('sceneDialog').classList.toggle('movement-active',this.engaged);this.e.gizmo.sync();this.renderSequence();}
 sequenceSteps(){const s=this.settings();s.sequence=Array.isArray(s.sequence)?s.sequence.filter(id=>id in actionNames).slice(0,16):[];return s.sequence;}
 renderSequence(){const list=$('sequenceSteps');if(!list||!this.e.state)return;list.replaceChildren();this.sequenceSteps().forEach((id,i)=>{const li=document.createElement('li'),label=document.createElement('span');label.textContent=actionNames[id];li.append(label);for(const [text,title,fn]of [['↑','앞으로',()=>{const a=this.sequenceSteps();if(i)[a[i-1],a[i]]=[a[i],a[i-1]];}],['×','제거',()=>this.sequenceSteps().splice(i,1)]]){const b=document.createElement('button');b.textContent=text;b.title=title;b.onclick=()=>{fn();this.renderSequence();this.e.queueLive();};li.append(b);}list.append(li);});}
 async start(){
  const e=this.e;
  if(this.active){e.renderer.domElement.focus({preventScroll:true});return;}
  if(this.starting||!e.isOpen||e.gizmo.transform.dragging)return;
  e.gizmo.keyboard?.finish(false);e.gizmo.quick?.cancel();
  if(e.loading){this.resumeAfterLoad=true;this.sync();e.renderer.domElement.focus({preventScroll:true});this.status('장면 준비 후 움직임을 시작합니다…');return;}
  if(!e.state?.people[e.index]){this.stop();this.status('인물 탭에서 인물 가이드를 추가하세요.');return;}
  const held=this.resumeAfterLoad?[...this.keys]:[];
  e.flush();e.gizmo.setMode('translate');e.gizmo.setAxis(null);for(const code of held){this.keys.add(code);this.runInput.down(code,performance.now());}
  const token=++this.startToken,p=e.state.people[e.index],figure=e.figures.children[e.index];
  if(!figure?.userData.motionRig){this.status('믹사모 인물 가이드에서 사용할 수 있습니다.');return;}
  this.starting=true;this.status('포즈랩 원본 모션을 불러오는 중…');this.sync();e.renderer.domElement.focus({preventScroll:true});
  try{
   const [controller,,bank]=await Promise.all([loadPoseLab(),initCollision(),loadInteractionClips()]);
   if(token!==this.startToken||!e.isOpen||e.loading||e.state.people[e.index]!==p||e.figures.children[e.index]!==figure)return;
   const resume=p.motionPose?.seatExit||p.motionPose?.feet,feet=Array.isArray(resume)&&resume.length===3&&resume.every(Number.isFinite)?figure.localToWorld(new T.Vector3(...resume)):new T.Vector3(p.x||0,p.y||0,p.z||0);
   this.physics=new SceneCollision(e.environment,{...p,x:feet.x,y:feet.y,z:feet.z});
   const standing=this.physics.walkingStart(feet);
   if(!standing){this.physics.dispose();this.physics=null;this.status('주변에 서 있을 바닥과 빈 공간을 찾지 못했습니다. 인물을 넓은 바닥으로 옮겨 주세요.');return;}
   const relocated=standing.distanceTo(feet)>.08;this.physics.setFeet(standing);
   this.motion=new PoseLabMotion(controller,figure,p,this.physics,bank);this.motion.doors=e.doors;this.motion.stairs=e.stairs;delete p.targets;this.motion.interactionOptions={stairStyle:$('stairStyle').value,seatTiming:this.settings().seatTiming,variant:$('interactionVariant').value,speed:+$('interactionSpeed').value,handrail:$('useStairRail').checked};$('interactionVariant').querySelector('[value=kimodo-seat]').disabled=!bank?.clips?.['kimodo-seat'];if(!bank?.clips?.['kimodo-seat']&&$('interactionVariant').value==='kimodo-seat')$('interactionVariant').value='auto';$('interactionSource').textContent=bank?.clips?.['kimodo-seat']?'Mixamo 문·계단·앉기 · 손발 접촉 보정':bank?'Mixamo 로컬 동작 · 문은 손잡이 IK':'기본 앉기 포즈 · 문은 손잡이 IK';
   this.person=p;this.figure=figure;this.active=true;this.e.gizmo.sync();this.changed=true;this.lastTime=0;if(this.settings().follow)this.frameFollow();
   this.previousHint=document.querySelector('.view-hint').textContent;document.querySelector('.view-hint').textContent='WASD: 이동 · Shift: 달리기 · Space: 점프 · Esc: 현재 자세로 멈춤 · 마우스 드래그: 카메라';
   e.queueLive();this.status(relocated?'빈 바닥으로 위치를 맞췄습니다. · WASD / Space':'움직임 모드 · WASD / Space');
  }catch(error){this.physics?.dispose();this.physics=null;if(token===this.startToken)this.status('모션을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 움직임 탭을 다시 누르세요.');console.error('Pose Lab motion:',error);}
  finally{if(token===this.startToken){this.starting=false;this.sync();}}
 }
 stop({flush=true}={}){
  const wasLoading=this.starting||this.resumeAfterLoad;this.resumeAfterLoad=false;this.cancelFurnitureClick?.();++this.startToken;this.starting=false;this.keys.clear();this.runInput.reset();
  if(!this.active){if(wasLoading){this.sync();this.status('정지 · 움직임 탭으로 다시 조작');}return;}
  this.active=false;this.lastTime=0;this.motion.freeze();this.motion=null;this.physics?.dispose();this.physics=null;$('interactSeat').hidden=true;$('interactLie').hidden=true;$('interactionTimeline').hidden=true;this.panel.querySelectorAll('[data-move]').forEach(b=>b.classList.remove('active'));
  document.querySelector('.view-hint').textContent=this.previousHint;
  const e=this.e;e.gizmo.setMode('translate');e.gizmo.setAxis(null);e.gizmo.sync();e.controlsUI();
  if(this.changed){e.movementCommit=true;e.queueLive();if(flush)e.flush();}
  this.sync();this.status('현재 자세가 컷에 반영됐습니다. · WASD로 바로 재개');
 }
 tick(time){
  if(!this.active)return;
  const e=this.e;if(!e.isOpen||e.loading||e.state.people[e.index]!==this.person||e.figures.children[e.index]!==this.figure){this.stop();return;}
  const dt=this.lastTime?Math.min(.05,(time-this.lastTime)/1000):0;this.lastTime=time;if(!dt)return;
  const direction=movementDirection(this.keys,e.camera.getWorldDirection(new T.Vector3()),this.forward,new T.Vector3().setFromMatrixColumn(e.camera.matrixWorld,0));this.forward=direction.forward;
  const before=this.figure.position.clone(),run=this.runInput.running||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');
  this.motion.update(dt,direction,this.settings(),run);const playback=this.motion.seated;$('interactionTimeline').hidden=!playback?.seek;if(playback?.seek){$('interactionPause').textContent=playback.paused?'▶ 재생':'Ⅱ 일시 정지';if(document.activeElement!==$('interactionTime'))$('interactionTime').value=Math.round(playback.progress*1000);$('interactionTimeValue').textContent=Math.round(playback.progress*100)+'%';}if(time-(this.proximityTime||0)>140){this.proximityTime=time;$('interactLie').hidden=!this.motion.bank||!this.physics?.nearestSeat({lying:true});const seated=['sit','lie'].includes(playback?.mode),stair=e.stairs.nearest(this.physics),door=e.doors.nearest(this.physics),seat=seated||this.physics?.nearestSeat();$('interactSeat').hidden=!seat&&!door&&!stair;$('interactSeat').disabled=['door','stand','stairs'].includes(playback?.mode)&&!playback.done;$('interactSeat').textContent=seated?'E · 일어나기':stair?(stair.down?'E · 계단 내려가기':'E · 계단 올라가기'):door?(door.door.open?'E · 문 닫기':'E · 문 열기'):'E · 가까운 가구에 앉기';}if(this.motion.sequence)$('sequenceStatus').textContent=this.motion.sequence.label;
  if(this.settings().follow){const delta=this.figure.position.clone().sub(before);followCamera(e.camera,e.controls.target,delta);e.state.camera=e.camera.position.toArray();e.state.target=e.controls.target.toArray();}
  this.changed=true;e.queueLive();if(time>(this.promptUntil||0)&&time-(this.statusTime||0)>100){this.status(this.motion.state);this.statusTime=time;}
 }
 frameFollow(){const e=this.e;if(!this.figure)return;recoverFollow(e.camera,e.controls.target,this.figure.position,this.person.height/100);e.storeCamera();}
 status(message){const p=this.person||this.e.state?.people[this.e.index],metres=v=>(Math.abs(v||0)<.005?0:v).toFixed(2);$('movementStatus').textContent=message+(p?` · X ${metres(p.x)} / Y ${metres(-p.z)} / Z ${metres(p.y)} m`:'');}
}
