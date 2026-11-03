import * as T from 'three';
import {sceneLibraryTabs} from './scene-library-tabs.js';
import {presetAngles,presetFrames,presetOffset,presetDistance,presetThumbnail} from './camera-presets.js';

export function setupCameraPresets(e){
 const trigger=document.createElement('button');trigger.id='openCameraPresets';trigger.textContent='▣ 카메라 프리셋';trigger.setAttribute('aria-expanded','false');
 document.getElementById('personSelect').parentElement.after(trigger);
 const panel=document.createElement('section');panel.id='cameraPresetLibrary';panel.hidden=true;
 const note=document.createElement('p');note.textContent='선택한 인물을 중심으로 각도를 적용합니다.';
 const scroll=document.createElement('div');scroll.className='camera-preset-scroll';panel.append(note,scroll);
 const tab=sceneLibraryTabs(e).register('camera','카메라 프리셋',panel,trigger);
 function apply(frame,yaw,button){
  const figure=e.figures.children[e.index];if(!figure){note.textContent='인물을 먼저 추가하거나 선택하세요.';return;}
  e.flush();e.shot.exit();figure.updateMatrixWorld(true);
  const person=e.state.people[e.index],height=(person.height||175)/100*(person.scale?.[1]||1);
  const head=figure.userData.motionRig?.bones.Head;
  const center=figure.getWorldPosition(new T.Vector3());center.y+=height*frame.center;
  if(head&&frame.id==='face'){head.getWorldPosition(center);center.y+=height*.055;}
  const direction=new T.Vector3(0,0,1).applyQuaternion(figure.getWorldQuaternion(new T.Quaternion()));
  const rotation=Math.atan2(direction.x,direction.z)*180/Math.PI;
  const distance=presetDistance(height,frame.span,e.camera.fov,e.camera.aspect);
  const damping=e.controls.enableDamping;e.controls.enableDamping=false;e.controls.update();
  e.controls.target.copy(center);e.camera.position.copy(center).add(new T.Vector3(...presetOffset(yaw+rotation,frame.pitch,distance)));
  e.controls.update();e.controls.enableDamping=damping;e.storeCamera();e.flush();
  panel.querySelectorAll('[aria-pressed]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  note.textContent='선택한 구도를 적용했습니다.';
 }
 for(const frame of presetFrames){
  const grid=document.createElement('div');grid.className='camera-preset-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label',frame.label);scroll.append(grid);
  for(const [name,yaw]of presetAngles){const b=document.createElement('button');b.type='button';b.title=`${frame.label} · ${name}`;b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed','false');b.innerHTML=presetThumbnail(yaw,frame);b.onclick=()=>apply(frame,yaw,b);grid.append(b);}
 }
 trigger.onclick=()=>{e.fly.finish(true);e.figurePicker.close();e.movement.library.close({focus:false});tab.open();};
 return {close:()=>tab.close({focus:false})};
}
