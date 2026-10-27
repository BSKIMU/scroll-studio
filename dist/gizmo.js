import {setupQuickTransform} from './scene-quick-transform.js?v=20261027-selection4';
import {TransformKeyboard} from './transform-keyboard.js?v=20261027-selection4';
import {storageAxis} from './blender-transform.js?v=20261026-walk2';
import {applyPersonTransform} from './person-transform.js?v=20261025-release1';
import {precisionStep,transformSnapshot,copyTransform,thickenGizmo,nearbyGround} from './manipulation.js?v=20261026-walk2';
import * as T from 'three';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
const $=id=>document.getElementById(id);
import {jointBones,jointNames,limitJoint} from './joint-pose.js?v=20261025-release1';
import {setupPoseControls} from './pose-controls.js?v=20261027-selection4';
import {objectTarget,objectProxy,applyObjectProxy,snapshotObject,restoreObject,pickSceneTarget} from './scene-object-transform.js?v=20261027-selection4';
import {relatedMeshes,collectionTarget,combineSelection,targetMeshes,selectionBounds,saveSelectionGroup,removeSelectionGroup} from './scene-selection.js?v=20261027-studio4';
export class PersonGizmo{
 constructor(editor){
  this.editor=editor;this.space='world';this.part='whole';this.axis=null;this.proxy=new T.Object3D();editor.scene.add(this.proxy);this.transform=new TransformControls(editor.camera,editor.renderer.domElement);this.helper=this.transform.getHelper();editor.scene.add(this.helper);this.transform.setSize(1);this.transform.setColors(0xff5555,0x599dff,0x70ce75,0xffdd66);thickenGizmo(this.helper);this.transform.setSpace('world');this.mode='translate';
  editor.controls.mouseButtons={LEFT:null,MIDDLE:T.MOUSE.PAN,RIGHT:T.MOUSE.ROTATE};
  const bar=document.createElement('div');bar.className='gizmo-toolbar';bar.innerHTML='<div class="gizmo-modes"><button data-transform="translate" class="active" title="이동 · G">↔ 이동 <kbd>G</kbd></button><button data-transform="rotate" title="회전 · R">⟳ 회전 <kbd>R</kbd></button><button data-transform="scale" title="크기 · S">⤢ 크기 <kbd>S</kbd></button><button id="framePerson" title="선택 인물 보기 · F">인물 보기 <kbd>F</kbd></button></div><div class="gizmo-selection"><label>선택 부위<select id="jointSelect"><option value="whole">인물 전체</option><option value="leftHand">왼손</option><option value="rightHand">오른손</option><option value="leftFoot">왼발</option><option value="rightFoot">오른발</option></select></label><div class="axis-buttons"><button data-axis="X" class="axis-x" title="X · 좌우 · 빨강">X</button><button data-axis="Y" class="axis-y" title="Y · 앞뒤 · 초록">Y</button><button data-axis="Z" class="axis-z" title="Z · 높이 · 파랑">Z</button><button data-axis="all" class="active">자유</button></div><button id="resetJoint">포즈 초기화</button></div><p id="gizmoHint">화살표를 드래그하세요 · X 빨강 · 좌우 / Y 초록 · 앞뒤 / Z 파랑 · 높이</p>';
  for(const [key,label]of Object.entries(jointNames))bar.querySelector('#jointSelect').add(new Option(label,key));
  const snap=document.createElement('label');snap.className='check';snap.innerHTML='<input id=transformSnap type=checkbox> Ctrl 스냅 · 이동 0.1m / 회전 5°';bar.append(snap);snap.querySelector('input').onchange=()=>this.snapping({});$('sceneView').before(bar);this.toolbar=bar;bar.querySelectorAll('[data-transform]').forEach(b=>b.onclick=()=>this.setMode(b.dataset.transform));bar.querySelectorAll('[data-axis]').forEach(b=>b.onclick=()=>this.setAxis(b.dataset.axis==='all'?null:b.dataset.axis));$('jointSelect').onchange=e=>{this.part=e.target.value;this.setMode(jointBones[this.part]?'rotate':this.part==='whole'?this.mode:'translate');this.sync();};$('framePerson').onclick=()=>this.frame();$('resetJoint').onclick=()=>{const p=editor.state.people[editor.index];if(p){delete p.targets;delete p.motionPose;delete p.hands;delete p.joints;delete p.fingers;delete p.jointLocks;editor.updatePerson({pose:true});editor.controlsUI();}};
  this.transform.addEventListener('dragging-changed',e=>{editor.controls.enabled=!e.value;});
  this.transform.addEventListener('mouseDown',()=>{this.before=this.snapshotTarget();this.cancelled=false;this.rawPrevious=transformSnapshot(this.proxy);this.applied=transformSnapshot(this.proxy);});
  this.transform.addEventListener('objectChange',()=>{if(this.cancelled)return;this.toPerson();});
  this.transform.addEventListener('mouseUp',()=>{this.dragFinished=performance.now();this.sync();editor.controlsUI();editor.transformCommit=!this.cancelled;editor.flush();});
  const resetSize=document.createElement('button');resetSize.id='resetPersonSize';resetSize.textContent='체형 비율 복원';resetSize.title='신장과 자세를 유지하고 가로·세로 늘어남만 복원';resetSize.onclick=()=>{const p=editor.state.people[editor.index];if(!p)return;delete p.scale;this.setMode('translate');editor.updatePerson();editor.flush();};bar.querySelector('.gizmo-selection').append(resetSize);
  const magnet=document.createElement('label');magnet.className='check';magnet.innerHTML='<input id=groundMagnet type=checkbox checked> 🧲 지면 자석 <small>가까운 바닥에 발 붙이기</small>';bar.append(magnet);try{magnet.querySelector('input').checked=localStorage.getItem('scroll-ground-magnet')!=='off';}catch{}magnet.querySelector('input').onchange=e=>{try{localStorage.setItem('scroll-ground-magnet',e.target.checked?'on':'off');}catch{}};
  const surface=editor.renderer.domElement;surface.addEventListener('pointermove',e=>{this.precision=e.shiftKey;},true);surface.addEventListener('pointerdown',e=>{this.precision=e.shiftKey;},true);surface.tabIndex=0;surface.setAttribute('aria-label','3D 인물 조작 화면');surface.addEventListener('pointerdown',()=>surface.focus({preventScroll:true}));
  surface.addEventListener('click',e=>{if(e.button!==0||(editor.movement?.engaged||editor.fly?.active)||e.altKey||this.transform.dragging||performance.now()-(this.dragFinished||0)<250)return;const r=surface.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),editor.camera);const hit=pickSceneTarget(editor,ray);if(!hit)return;let obj=hit.object;while(obj&&obj.userData.person===undefined)obj=obj.parent;if(obj)this.selectPerson(obj.userData.person);else this.selectObject(hit.object,hit.point,{additive:e.shiftKey});});
  const selection=document.createElement('div');selection.className='scene-selection-bar';selection.innerHTML='<output id="sceneSelectionName"></output><button id="groupSceneSelection" title="Shift로 물체를 추가 선택한 뒤 묶기 · Ctrl+G">그룹 묶기</button><button id="ungroupSceneSelection" title="그룹 풀기 · Ctrl+Shift+G">그룹 풀기</button>';this.selectionBar=selection;$('sceneView').append(selection);
  $('groupSceneSelection').onclick=()=>this.groupSelection();$('ungroupSceneSelection').onclick=()=>this.ungroupSelection();
  this.quick=setupQuickTransform(this);this.keyboard=new TransformKeyboard(this);this.poseControls=setupPoseControls(this);
  $('sceneDialog').addEventListener('keydown',e=>{
   if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable||!editor.isOpen||(editor.movement?.engaged||editor.fly?.active))return;
   const k=e.code?.startsWith('Key')?e.code.slice(3).toLowerCase():e.key.toLowerCase();
   if((e.ctrlKey||e.metaKey)&&k==='g'&&this.objectTarget){e.preventDefault();e.stopPropagation();e.shiftKey?this.ungroupSelection():this.groupSelection();return;}
   if(this.keyboard.key(e)){e.stopPropagation();e.preventDefault();return;}
   if(e.ctrlKey||e.metaKey){this.snapping(e);return;}
   if(['x','y','z','f','escape','shift'].includes(k)){e.stopPropagation();e.preventDefault();}
   if(['x','y','z'].includes(k))this.setAxis(k.toUpperCase()===this.axis?null:k.toUpperCase());
   if(k==='f'||e.code==='NumpadDecimal')this.frame();
   if(k==='escape'){if(this.transform.dragging&&this.before)this.cancelDrag();else this.setAxis(null);}
   this.snapping(e);
  });
  $('sceneDialog').addEventListener('keyup',e=>{this.snapping(e);if(this.keyboard.active)this.keyboard.update(e);});
  surface.addEventListener('pointerdown',e=>{if(e.button===2&&this.transform.dragging){e.preventDefault();e.stopImmediatePropagation();this.cancelDrag();}},true);
  surface.addEventListener('blur',()=>{this.snapping({});if(this.transform.dragging)this.cancelDrag();});

 }
 get hasTarget(){return !!this.objectTarget||!!this.editor.state?.people[this.editor.index];}
 snapshotTarget(){return this.objectTarget?snapshotObject(this.editor,this.objectTarget):structuredClone(this.editor.state.people[this.editor.index]);}
 restoreTarget(value){if(this.objectTarget){restoreObject(this.editor,this.objectTarget,value);this.objectChanged();}else{this.editor.state.people[this.editor.index]=structuredClone(value);this.editor.updatePerson({pose:true});}}
 selectPerson(index=this.editor.index){this.objectTarget=null;this.editor.index=index;$('personSelect').value=String(index);this.part='whole';$('jointSelect').value='whole';this.editor.controlsUI();this.setAxis(null);this.setMode('translate');this.editor.invalidate();}
 selectObject(object,point,{individual=false,additive=false}={}){const e=this.editor;if(!object)return;e.flush();let target=objectTarget(e,object),scope=individual?'mesh':$('backgroundSelection')?.value||'object';
  if(target.kind==='mesh'){
   if(scope==='background')target=objectTarget(e,e.environment);
   else if(scope!=='mesh'){const group=relatedMeshes(e,object);if(group.members.length>1)target=collectionTarget(e,group.members,group.label,group.groupId);}
  }
  if(additive&&this.objectTarget)target=combineSelection(e,this.objectTarget,target);
  this.objectTarget=target;this.part='whole';$('jointSelect').value='whole';if(target){e.advanced.selected=e.advanced.meshes.indexOf(targetMeshes(target)[0]);e.advanced.list();}this.setAxis(null);this.setMode('translate');this.sync();e.invalidate();
 }
 groupSelection(){if(saveSelectionGroup(this.editor,this.objectTarget)){this.syncSelectionUI();this.editor.queueLive();this.editor.flush();}}
 ungroupSelection(){if(!this.objectTarget?.groupId)return;removeSelectionGroup(this.editor,this.objectTarget);this.syncSelectionUI();this.editor.queueLive();this.editor.flush();}
 syncSelectionUI(){if(!this.selectionBar)return;const t=this.objectTarget,active=this.editor.movement?.engaged||this.editor.fly?.active;this.selectionBar.hidden=!t||!!active;if(!t)return;const count=targetMeshes(t).length;$('sceneSelectionName').textContent=`${t.label} · ${count}개 메시`;$('groupSceneSelection').hidden=count<2||!!t.groupId||t.kind==='environment'||t.kind==='prop';$('ungroupSceneSelection').hidden=!t.groupId;}
 objectChanged(){const e=this.editor;e.environment.updateMatrixWorld(true);e.advanced?.objectFields();e.advanced?.lightFrame();e.ground?.sync();e.seats?.sync();e.queueLive();}
 snapping(e){this.precision=!!e.shiftKey;const snap=e.ctrlKey||$('transformSnap').checked;this.transform.setTranslationSnap(snap?(e.shiftKey?.01:.1):null);this.transform.setRotationSnap(snap?Math.PI/180*(e.shiftKey?1:5):null);this.transform.setScaleSnap(snap?(e.shiftKey?.01:.1):null);}
 cancelDrag(){const e=this.editor;this.cancelled=true;this.restoreTarget(this.before);this.transform.reset();this.transform.dragging=false;this.transform.axis=null;e.controls.enabled=true;if(!this.objectTarget)e.updatePerson({pose:true});e.controlsUI();this.sync();e.flush();}
 get isJointPart(){return !!jointBones[this.part];}
 setMode(mode){if(mode==='rotate'&&/Hand|Foot/.test(this.part)){this.part=this.part.replace('Hand','Palm').replace('Foot','Ankle');$('jointSelect').value=this.part;}else if(mode==='translate'&&/Palm|Ankle/.test(this.part)){this.part=this.part.replace('Palm','Hand').replace('Ankle','Foot');$('jointSelect').value=this.part;}this.transform.setSpace(jointBones[this.part]?'local':this.space);if(this.part!=='whole'&&mode!==(jointBones[this.part]?'rotate':'translate')){ $('gizmoHint').textContent='손·발은 이동, 관절은 회전으로 조절합니다. 크기는 인물 전체를 선택하세요.';return;}this.mode=mode;this.transform.setMode(mode);this.updateHint();this.toolbar.querySelectorAll('[data-transform]').forEach(b=>{b.classList.toggle('active',b.dataset.transform===mode);b.disabled=this.part!=='whole'&&(/Hand|Foot|Palm|Ankle/.test(this.part)?b.dataset.transform==='scale':b.dataset.transform!=='rotate');});this.sync();}
 setAxis(axis){this.axis=axis;for(const a of ['X','Y','Z'])this.transform['show'+a]=!axis||storageAxis[axis]===a;this.toolbar.querySelectorAll('[data-axis]').forEach(b=>b.classList.toggle('active',b.dataset.axis===(axis||'all')));this.updateHint();this.editor.invalidate();}
 updateHint(){$('gizmoHint').textContent=({translate:'이동 · 화살표를 끌어 위치 조절',rotate:'회전 · 원을 끌어 각도 조절',scale:'크기 · 상자를 끌어 비율 조절'}[this.mode])+(this.axis?' · '+this.axis+'축':' · XYZ 축')+' · G/R/S → 축·숫자 → Enter · Shift 미세 / Ctrl 스냅 / Esc 취소';}

 sync(){const e=this.editor;this.syncSelectionUI();this.poseControls?.sync();$('jointSelect').disabled=!!this.objectTarget;for(const b of this.toolbar.querySelectorAll('#jointSelect,#resetJoint,#resetPersonSize'))b.disabled=!!this.objectTarget;e.figures.traverse(o=>{if(o.userData.poseMarker){let p=o.parent;while(p&&p.userData.person===undefined)p=p.parent;o.visible=!this.objectTarget&&!(e.movement?.engaged||e.fly?.active)&&p?.userData.person===e.index;}});if((e.movement?.engaged||e.fly?.active)){this.helper.visible=false;return;}this.helper.visible=true;if(this.objectTarget){if(!this.objectTarget.object.parent){this.objectTarget=null;}else{if(!this.directDragging&&!this.transform.dragging&&!this.keyboard?.active){objectProxy(this.objectTarget,this.proxy);this.transform.attach(this.proxy);}return;}}const p=e.state?.people[e.index],figure=e.figures.children[e.index];if(!p||!figure){this.transform.detach();return;}if(this.directDragging||this.transform.dragging||this.keyboard?.active)return;figure.updateMatrixWorld(true);if(this.part==='whole'){this.proxy.position.copy(figure.position);this.proxy.quaternion.copy(figure.quaternion);this.proxy.scale.copy(figure.scale);}else{const local=figure.userData.landmarks[this.part.replace('Palm','Hand').replace('Ankle','Foot')];if(!local)return;this.proxy.position.copy(figure.localToWorld(new T.Vector3(...local)));const bone=figure.userData.motionRig?.bones[jointBones[this.part]];if(bone)this.proxy.quaternion.copy(bone.getWorldQuaternion(new T.Quaternion()));else this.proxy.quaternion.identity();this.proxy.scale.set(1,1,1);}this.proxy.updateMatrixWorld(true);this.transform.attach(this.proxy);}
 toPerson(){const e=this.editor,p=e.state.people[e.index];if(!this.objectTarget&&(!p||p.jointLocks?.[this.part]))return;if(this.transform.dragging&&this.rawPrevious){const raw=transformSnapshot(this.proxy);this.applied=precisionStep(this.rawPrevious,this.applied,raw,this.precision);this.rawPrevious=raw;copyTransform(this.proxy,this.applied);}if(this.objectTarget){applyObjectProxy(e,this.objectTarget,this.proxy);this.objectChanged();return;}if(!this.keyboard?.active&&!this.quickDragging)this.snapGround();if(this.part==='whole'){applyPersonTransform(p,this.proxy,this.mode);}else{const figure=e.figures.children[e.index];figure.updateMatrixWorld(true);const bone=figure.userData.motionRig?.bones[jointBones[this.part]];if(bone){p.joints||={};p.joints[this.part]=limitJoint(figure.userData.motionRig,this.part,bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(this.proxy.quaternion).normalize(),p.jointLimits!==false).toArray();}else{p.targets||={};p.targets[this.part]=figure.worldToLocal(this.proxy.position.clone()).toArray();}}e.updatePerson({pose:this.part!=='whole'});e.controlsUI();}
 snapGround(){
  if(this.mode!=='translate'||!$('groundMagnet').checked)return;
  const e=this.editor,g=e.figures.children[e.index];if(!g)return;
  let point;
  if(this.part==='whole'){copyTransform(g,transformSnapshot(this.proxy));g.updateMatrixWorld(true);const box=new T.Box3().setFromObject(g);point=box.getCenter(new T.Vector3());point.y=box.min.y;}
  else if(this.part.endsWith('Foot')){point=this.proxy.position.clone();point.y-=.0585*g.scale.y;}
  else return;
  const height=nearbyGround(e.environment,point);if(height===undefined)return;
  this.proxy.position.y+=height-point.y;
  $('gizmoHint').textContent='🧲 지면에 붙음 · Shift: 1/10 속도 · 자석을 끄면 자유롭게 이동';
 }

 frame(){const e=this.editor,g=this.objectTarget?.object||e.figures.children[e.index];if(!g)return;const box=this.objectTarget?selectionBounds(this.objectTarget):new T.Box3().setFromObject(g),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),distance=Math.max(2.4,size.y*1.8);e.camera.position.copy(center).add(new T.Vector3(distance*.3,distance*.1,distance));e.controls.target.copy(center);e.controls.update();e.storeCamera();}
}
