import {SceneShotCamera} from './scene-shot-camera.js?v=20261027-pose-camera1';
import {applyEnvironmentPlacement} from './scene-object-transform.js?v=20261027-selection4';
import {SceneGrid} from './scene-grid.js?v=20261027-groundfade1';
import {SkyDome} from './sky-dome.js?v=20261027-groundfade1';
import {setupFigurePicker} from './scene-figure-picker.js?v=20261027-studio4';
import {setupSceneTopControls} from './scene-top-controls.js?v=20261026-walk2';
import {SceneFly} from './scene-fly.js?v=20261027-pose-camera1';
import {setupFigureModels} from './scene-models.js?v=20261027-studio4';
import {setupLens} from './scene-lens.js?v=20261027-studio4';
import {buildSchoolCorridor} from './school-corridor.js?v=20261025-release1';
import {setupPhone,updatePhone} from './scene-phone.js?v=20261025-release1';
import {SceneStairs} from './scene-stairs.js?v=20261025-release1';
import {instantiateBackground,releaseObjects,geometryBytes} from './scene-resources.js?v=20261025-release1';
import {applyProjection,applyRenderProjection,projectionFor,viewportSize,applyViewportProjection,withCutProjection} from './scene-projection.js?v=20261027-studio4';
import {environmentHeight,setupEnvironmentGround} from './environment-ground.js?v=20261027-selection4';
import {applyFigureTransform} from './hand-pose.js?v=20261027-pose-camera1';
import {setupHandControls} from './scene-hands.js?v=20261027-studio4';
import {ScenePreview} from './scene-preview.js?v=20261027-studio4';
import {guideRect} from './frame-geometry.js?v=20261025-release1';
import {captureSceneLayers} from './scene-capture.js?v=20261027-studio4';
import {loadMannequin,mannequin,defaultPerson,hasFigureModel,figureModels,applyMovementPose} from './mannequin.js?v=20261027-pose-camera1';
import {SceneMovement} from './scene-movement.js?v=20261027-pose-camera1';
import {SceneDoors,buildInteractionRoom} from './scene-doors.js?v=20261025-release1';
import {SceneAdvanced} from './scene-advanced.js?v=20261027-pose-camera1';
import {installCameraDrag} from './camera-drag.js?v=20261027-selection4';
import {scenePanels} from './scene-panels.js?v=20261027-selection4';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {prepareImportedBackground} from './imported-background.js?v=20261027-selection4';
import {setupSeatPresets} from './scene-seats.js?v=20261027-studio4';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PersonGizmo} from './gizmo.js?v=20261027-studio4';
import {solveLimb} from './pose-math.js?v=20261025-release1';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
const $=id=>document.getElementById(id);
export const defaultScene=()=>({asset:'room',people:[defaultPerson()],camera:[4,3.1,6],target:[0,1,0],fov:45,grid:true,wire:false});
export class SceneEditor{
 constructor(assets,onApply,onImport,onPreview,resolveAsset=async()=>{}){
  this.resolveAsset=resolveAsset;this.onPreview=onPreview;this.assets=assets;this.onApply=onApply;this.onImport=onImport;this.scene=new T.Scene();this.skyDome=new SkyDome();this.scene.add(this.skyDome);this.scene.background=new T.Color('#dfe5db');
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.setClearColor('#dfe5db',1);$('sceneView').append(this.renderer.domElement);
  this.camera=new T.PerspectiveCamera(45,1,.01,10000);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.addEventListener('change',()=>this.storeCamera());
  this.ambient=new T.HemisphereLight(0xffffff,0x8f9d7d,2.4);this.scene.add(this.ambient);const key=new T.DirectionalLight(0xffffff,3);key.position.set(5,10,7);this.scene.add(key);this.sun=key;this.fillLight=new T.DirectionalLight(0xcbdcff,.75);this.fillLight.position.set(-8,5,6);this.scene.add(this.fillLight);this.rimLight=new T.DirectionalLight(0xffe5cd,.35);this.rimLight.position.set(-3,7,-5);this.scene.add(this.rimLight);
  this.environment=new T.Group();this.figures=new T.Group();this.scene.add(this.environment,this.figures);this.grid=new SceneGrid();this.scene.add(this.grid);
  this.cache=new Map();this.index=0;this.isOpen=false;this.rebuildToken=0;
  this.renderer.domElement.addEventListener('click',e=>{if(this.fly?.active||this.movement?.active||!e.altKey||!this.state.people[this.index])return;const rect=this.renderer.domElement.getBoundingClientRect(),pointer=new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new T.Raycaster();ray.setFromCamera(pointer,this.camera);const hits=ray.intersectObjects(this.environment.children,true);let point=hits[0]?.point;if(!point){point=new T.Vector3();if(!ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),point))return;}Object.assign(this.state.people[this.index],{x:point.x,y:point.y,z:point.z});this.controlsUI();this.updatePerson();});
  document.querySelector('.view-hint').textContent='빈 공간 왼쪽 드래그: 회전 · Shift: 미세 회전 · 인물: 화살표 조작 · Shift + 오른쪽 / 휠 버튼 드래그: 화면 이동 · 오른쪽 드래그: 회전 · 휠: 확대';
  new ResizeObserver(()=>{if(this.isOpen)this.resize();}).observe($('sceneView'));

  $('removePerson').onclick=()=>{this.state.people.splice(this.index,1);this.index=Math.max(0,this.index-1);this.updatePeople();};
  $('personSelect').onchange=e=>{this.gizmo.selectPerson(+e.target.value);};
  const yLabel=document.createElement('label');yLabel.textContent='Z · 높이';const yInput=document.createElement('input');yInput.id='personY';yInput.type='range';yInput.min='-3';yInput.max='12';yInput.step='0.05';yLabel.append(yInput);$('personZ').parentElement.after(yLabel);$('personZ').parentElement.firstChild.textContent='Y · 앞뒤';$('personX').parentElement.firstChild.textContent='X · 좌우';
  for(const [id,prop] of [['personX','x'],['personY','y'],['personZ','z'],['personRotation','rotation'],['personScale','height'],['pose','pose']])$(id).oninput=e=>{let p=this.state.people[this.index];if(!p)return;p[prop]=prop==='pose'?e.target.value:Number(e.target.value)*(id==='personZ'?-1:1);if(prop==='pose'){delete p.targets;delete p.motionPose;delete p.joints;delete p.jointLocks;}if(prop==='rotation')p.euler=[p.euler?.[0]||0,p.rotation*Math.PI/180,p.euler?.[2]||0];if(prop==='height')p.height=Math.min(230,Math.max(80,p.height||175));this.updatePerson({pose:prop==='pose'});};
  $('fov').oninput=e=>{if(this.shot?.active){this.shot.inputs.fov.value=e.target.value;this.shot.inputs.fov.onchange();return;}delete this.state.focalLength;this.state.fov=+e.target.value;this.camera.fov=this.state.fov;this.camera.updateProjectionMatrix();this.lens?.sync();$('fovValue').textContent=this.state.fov+'°';this.queueLive();};
  $('gridToggle').onchange=e=>{this.state.grid=e.target.checked;this.grid.visible=e.target.checked;this.queueLive();};
  $('wireToggle').onchange=e=>{this.state.wire=e.target.checked;this.materialMode();};
  $('scenePreset').onchange=e=>this.selectAsset(e.target.value).catch(err=>{$('liveStatus').textContent='배경 로드 실패: '+err.message;});
  document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>{const type=b.dataset.camera;this.camera.position.set(0,type==='low'?.4:type==='high'?5:1.65,5);this.controls.target.set(0,1,0);this.storeCamera();});
  $('fitModel').onclick=()=>this.fit();$('captureScene').onclick=()=>this.apply();$('modelImport').onclick=()=>this.onImport();
  this.loading=false;this.pending=false;this.openToken=0;this.gizmo=new PersonGizmo(this);scenePanels(this);installCameraDrag(this);this.advanced=new SceneAdvanced(this);this.doors=new SceneDoors(this);this.stairs=new SceneStairs(this);this.movement=new SceneMovement(this);this.hands=setupHandControls(this);this.models=setupFigureModels(this);this.figurePicker=setupFigurePicker(this);this.ground=setupEnvironmentGround(this);this.seats=setupSeatPresets(this);this.previewLoop=new ScenePreview(this);this.fly=new SceneFly(this);this.lens=setupLens(this);this.shot=new SceneShotCamera(this);setupPhone(this);setupSceneTopControls(this);
 }
 storeCamera(){if(!this.state)return;this.state.camera=this.camera.position.toArray();this.state.target=this.controls.target.toArray();this.state.fov=this.camera.fov;this.shot?.track();this.lens?.sync();this.advanced?.lightFrame();this.queueLive();}
 queueLive({initial=false}={}){this.invalidate();if(!this.isOpen||this.loading||this.capturing||this.transient)return;this.initialCapture=initial;this.pending=true;this.previewDirty=true;$('liveStatus').textContent='● 실시간 미리보기';clearTimeout(this.liveTimer);if(this.fly?.active||this.movement?.active||this.gizmo.keyboard?.active||this.gizmo.transform.dragging)return;this.liveTimer=setTimeout(()=>{this.liveTimer=null;if(this.pending)this.apply({live:true});},400);}
 preview(){
  if(!this.previewDirty||!this.isOpen||this.loading||this.capturing||this.advanced.skies.pending)return;this.previewDirty=false;
  const size=this.renderer.getSize(new T.Vector2()),aspect=this.cut.pageWidth*this.cut.width/100/this.cut.height,cutSize=viewportSize(size.x,size.y,aspect);
  try{this.renderer.setSize(Math.max(1,Math.round(cutSize.w)),Math.max(1,Math.round(cutSize.h)),false);withCutProjection(this.camera,this.cut,this.cut.pageWidth,this.state,()=>captureSceneLayers(this,(kind,canvas)=>this.onPreview?.(canvas,this.cut.id,this.advanced.filter(),kind)));}
  finally{this.renderer.setSize(size.x,size.y,false);}
 }
 flush(){this.fly?.finish(true,{flush:false});if(this.gizmo?.keyboard?.active){this.gizmo.keyboard.finish(true);return;}this.movement?.stop({flush:false});clearTimeout(this.liveTimer);this.liveTimer=null;if(this.pending&&!this.loading)this.apply({live:true});}
 invalidate(){this.previewLoop?.request();}
 captureFrame(cut,w,h){
  if(this.loading||this.capturing||this.advanced.skies.pending||this.cut?.id!==cut.id)return null;
  const size=this.renderer.getSize(new T.Vector2()),ratio=this.renderer.getPixelRatio(),camera=this.camera.clone(),images={};this.capturing=true;
  try{
   this.renderer.setPixelRatio(1);this.renderer.setSize(w,h,false);applyRenderProjection(this.camera,cut,cut.pageWidth,this.state);
   captureSceneLayers(this,(kind,source)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').filter=this.advanced.filter();cv.getContext('2d').drawImage(source,0,0,w,h);images[kind]=cv;});
   return images;
  }finally{this.camera.copy(camera);this.renderer.setPixelRatio(ratio);this.renderer.setSize(size.x,size.y,false);this.capturing=false;this.previewLoop.paint();}
 }
 close(){this.figurePicker.close();this.flush();this.shot.reset();this.advanced.skyPicker.close();this.isOpen=false;this.skyDome.setTexture(null);this.scene.environment=null;this.advanced.skies.dispose();this.previewLoop?.stop();++this.openToken;++this.rebuildToken;}
 async open(cut,{transient=false}={}){this.figurePicker.close();this.flush();this.shot.reset();this.advanced.skyPicker.close();this.transient=transient;const token=++this.openToken;this.loading=true;this.controls.enableDamping=false;this.controls.update();this.controls.enableDamping=true;this.cut=cut;this.state=structuredClone(cut.scene||defaultScene());this.index=0;this.gizmo.objectTarget=null;this.movement?.reset();this.isOpen=true;this.camera.position.fromArray(this.state.camera);this.controls.target.fromArray(this.state.target);this.camera.fov=this.state.fov;this.camera.updateProjectionMatrix();this.grid.visible=this.state.grid;this.updateOptions();try{await Promise.all([this.buildEnvironment(),loadMannequin()]);if(token!==this.openToken)return;await this.advanced.skies.ready;if(token!==this.openToken)return;this.updatePeople();this.gizmo.setMode('translate');this.gizmo.setAxis(null);this.controls.update();this.resize();this.shot?.sync();this.lens?.sync();$('fov').value=this.state.fov;$('fovValue').textContent=this.state.fov+'°';$('gridToggle').checked=this.state.grid;$('wireToggle').checked=this.state.wire;}finally{if(token===this.openToken){this.loading=false;this.movement?.sceneReady();this.invalidate();}}if(this.state.look?.skyPreset||!cut.background||(this.state.people.length&&!cut.guide))this.queueLive({initial:true});else{this.pending=false;this.previewDirty=false;}}

 updateOptions(){const s=$('scenePreset');s.replaceChildren();for(const [id,name] of [['school-corridor','학교 복도 · 창가'],['room','스튜디오'],['interaction-room','상호작용 연습실 · 문 / 의자 / 침대'],['stair-room','계단 연습실 · 손잡이'],['castle','성문 · 샘플'],['empty','빈 공간'],...Object.values(this.assets()).map(a=>[a.id,a.name])]){let o=new Option(name,id);s.add(o);}s.value=this.state.asset;}
 async selectAsset(id){
  this.flush();const token=++this.openToken,previous=this.state.asset;this.loading=true;
  $('liveStatus').textContent='배경 불러오는 중…';
  try{
   await this.resolveAsset(id);if(token!==this.openToken)return;
   this.state.asset=id;this.updateOptions();await this.buildEnvironment();if(token!==this.openToken)return;this.fit();
  }catch(error){
   if(token===this.openToken){this.state.asset=previous;this.updateOptions();await this.buildEnvironment();}
   throw error;
  }finally{if(token===this.openToken){this.loading=false;this.movement?.sceneReady();this.invalidate();}}
  this.queueLive();
 }
 resize(){
  const v=$('sceneView'),region={w:this.cut.pageWidth*this.cut.width/100,h:this.cut.height},aspect=region.w/region.h;
  const fill=this.shot?.active||document.body.classList.contains('scene-maximized')||!!document.fullscreenElement?.contains(v);
  const {w,h}=viewportSize(v.clientWidth,v.clientHeight,aspect,fill);v.style.setProperty('--scene-aspect',String(aspect));
  this.renderer.setSize(w,h);this.renderer.domElement.style.margin='auto';this.renderer.domElement.style.position='absolute';this.renderer.domElement.style.inset='0';
  applyViewportProjection(this.camera,this.cut,this.cut.pageWidth,this.state,w,h,fill);this.shot?.resize(w,h);if(this.state.focalLength&&!this.shot?.active)this.state.fov=this.camera.fov;this.invalidate();
 }
 material(color){return new T.MeshStandardMaterial({color,roughness:.9,side:T.DoubleSide});}
 box(w,h,d,x,y,z,color){let m=new T.Mesh(new T.BoxGeometry(w,h,d),this.material(color));m.position.set(x,y,z);return m;}
 clear(group){releaseObjects(group);}
 async buildEnvironment(){const token=++this.rebuildToken;this.gizmo.objectTarget=null;this.advanced?.reset();this.clear(this.environment);this.environment.position.set(0,0,0);this.environment.rotation.set(0,0,0);this.environment.scale.set(1,1,1);this.presetCamera=null;this.environment.position.y=environmentHeight(this.state);const a=this.state.asset;for(const [id,entry]of this.cache)if(id!==a){releaseObjects(entry.scene,{source:true});this.cache.delete(id);}this.geometryBytes=0;let name='빈 공간';
  if(a==='room'){name='스튜디오';this.environment.add(this.box(12,.08,12,0,-.05,0,0xdddccc),this.box(12,4,.1,0,2,-4,0xc7d0c7),this.box(.1,4,8,-5,2,0,0xb9c7be));for(let x of [-3,0,3]){this.environment.add(this.box(1.5,1.8,.08,x,2.4,-3.9,0xeff3da));}const table=new T.Group();table.name="테이블";this.environment.add(table);table.add(this.box(2.3,.15,1.2,2,.8,-1,0x849987));for(let x of [1.1,2.9])for(let z of [-1.45,-.55])table.add(this.box(.1,.8,.1,x,.4,z,0x718474));}
  else if(a==='school-corridor'){name='학교 복도 · 창가';buildSchoolCorridor(this);}
  else if(a==='castle'){name='성문 · 샘플';this.environment.add(this.box(25,.1,25,0,-.06,0,0xc7ccba));for(let x of [-4,4]){this.environment.add(this.box(2.8,7,3,x,3.5,-4,0xadb9a4));for(let dx of [-.9,0,.9])this.environment.add(this.box(.5,.7,3,x+dx,7.2,-4,0xadb9a4));for(let y of [2,4.8])this.environment.add(this.box(.5,1.2,.08,x,y,-2.46,0x667969));}this.environment.add(this.box(5,2.5,1,0,4.8,-4,0xb7c2ac),this.box(1.5,3.5,1,-2,1.75,-4,0xb7c2ac),this.box(1.5,3.5,1,2,1.75,-4,0xb7c2ac));}
  else if(a==='stair-room'){name='계단 연습실';this.environment.add(this.box(10,.1,10,0,-.055,0,0x666b70));if(!this.state.stairRoomCreated){(this.state.stairs??=[]).push({id:'practice-stairs',asset:a,x:0,y:0,z:0,rotation:0});this.state.stairRoomCreated=true;}}
  else if(a==='interaction-room'){name='상호작용 연습실';buildInteractionRoom(this.environment);if(!this.state.interactionRoomCreated){(this.state.doors??=[]).push({id:'practice-door',asset:a,x:-.53,y:0,z:-1.3,rotation:0,angle:0});this.state.interactionRoomCreated=true;}}
  else if(a!=='empty'){const asset=this.assets()[a];if(asset){name=asset.name;let source;const cached=this.cache.get(a);
   if(cached?.data===asset.data)source=cached.scene;
   else{
    for(const entry of this.cache.values())releaseObjects(entry.scene,{source:true});this.cache.clear();
    const buf=await (await fetch(asset.data)).arrayBuffer();
    const decoder=new DRACOLoader().setDecoderPath(new URL('./vendor/draco/',import.meta.url).href).setWorkerLimit(2);let gltf;
    try{gltf=await new GLTFLoader().setDRACOLoader(decoder).parseAsync(buf,'');}finally{decoder.dispose();}
    if(token!==this.rebuildToken){releaseObjects(gltf.scene,{source:true});return;}
    source=gltf.scene;this.cache.set(a,{data:asset.data,scene:source});
   }
   if(token!==this.rebuildToken)return;
   const object=instantiateBackground(source);this.geometryBytes=geometryBytes(source);
   const prepared=prepareImportedBackground(object,asset);this.environment.add(prepared.wrapper);this.environment.updateMatrixWorld(true);this.presetCamera=prepared.camera;if(this.presetCamera){this.presetCamera.position.y+=this.environment.position.y;this.presetCamera.target.y+=this.environment.position.y;}}}
  this.doors?.build();this.stairs?.build();applyEnvironmentPlacement(this);$('modelLabel').textContent=name;this.advanced?.environmentReady();this.ground?.sync();this.seats?.sync();this.materialMode();
 }
 materialMode(){this.environment.traverse(o=>{if(o.material)for(const m of [].concat(o.material))m.wireframe=!!this.state.wire;});this.queueLive();}
 fit(){if(this.presetCamera){this.camera.position.copy(this.presetCamera.position);this.controls.target.copy(this.presetCamera.target);delete this.state.focalLength;this.state.fov=this.camera.fov=this.presetCamera.fov;this.lens?.sync();this.camera.updateProjectionMatrix();$('fov').value=this.state.fov;$('fovValue').textContent=this.state.fov+'°';this.storeCamera();return;}let b=new T.Box3().setFromObject(this.environment);if(b.isEmpty())b=new T.Box3(new T.Vector3(-2,0,-2),new T.Vector3(2,2,2));const size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),d=Math.max(size.x,size.y,size.z)*.85;this.controls.target.copy(c);this.camera.position.set(c.x+d*.7,c.y+d*.55,c.z+d);this.storeCamera();}
 updatePeople(){this.gizmo.objectTarget=null;const select=$('personSelect');select.replaceChildren();this.state.people.forEach((p,i)=>select.add(new Option('인물 '+(i+1)+' · '+(figureModels[p.model]||'기존 소체'),i)));select.value=this.index;this.controlsUI();this.figuresBuild();}
 controlsUI(){this.fly?.sync();this.models?.sync();this.seats?.sync();this.movement?.sync();this.hands?.sync();this.syncPhone?.();const p=this.state.people[this.index];for(const id of ['personX','personY','personZ','personRotation','personScale','pose'])$(id).disabled=!p;if(!p)return;if($('personPhone'))$('personPhone').value=p.phone?.hand||'';$('personX').value=p.x;$('personY').value=p.y||0;$('personZ').value=-p.z;$('personRotation').value=p.rotation;$('personScale').value=p.height;$('pose').value=p.pose;}
 updatePerson({pose=false}={}){const p=this.state?.people[this.index],figure=this.figures.children[this.index];if(!p)return;if(!figure?.userData.motionRig||figure.userData.basePose!==p.pose||figure.userData.baseModel!==p.model){this.figuresBuild();return;}applyFigureTransform(figure,p);if(pose)applyMovementPose(figure,p);updatePhone(figure,p);this.gizmo.sync();this.queueLive();}
 figuresBuild(){this.clear(this.figures);this.state.people.forEach((p,i)=>{if(hasFigureModel(p)){const figure=mannequin(p,i);if(figure){this.figures.add(figure);return;}}const g=new T.Group();g.userData.person=i;g.userData.landmarks={};const mat=this.material(i===this.index?0xd5b38f:0xb4c4d5),joint=this.material(0x6b766e);const sphere=(v,r=.065,scale,part)=>{const m=new T.Mesh(new T.SphereGeometry(r,16,12),mat);m.position.fromArray(v);if(scale)m.scale.fromArray(scale);m.userData.part=part||'whole';g.add(m);};const bone=(a,b,r1=.065,r2=.08)=>{let av=new T.Vector3(...a),bv=new T.Vector3(...b);const m=new T.Mesh(new T.CylinderGeometry(r1,r2,av.distanceTo(bv),12),mat);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());g.add(m);};let hip= p.pose==='sit'?.62:.94;const head=hip+.63;sphere([0,head,0],.13,[.8,1.2,.9]);bone([0,hip+.22,0],[0,hip+.48,0],.20,.145);bone([0,hip,0],[0,hip+.17,0],.14,.17);bone([0,hip+.45,0],[0,hip+.51,0],.05,.055);for(let s of [-1,1]){let shoulder=[s*.23,hip+.40,0],elbow=[s*.29,hip+.13,.02],hand=[s*.27,hip-.10,.05],knee=[s*.105,.48,0],foot=[s*.11,.06,.07];if(p.pose==='walk'){knee=[s*.12,.48,s*.26];foot=[s*.13,.07,s*.48];elbow[2]=-s*.20;hand[2]=-s*.32;}if(p.pose==='sit'){knee=[s*.16,.57,.43];foot=[s*.16,.08,.47];elbow=[s*.3,.82,.24];hand=[s*.17,.67,.43];}if(p.pose==='reach'&&s===1){elbow=[.5,hip+.45,.08];hand=[.77,hip+.5,.14];}let pelvis=[s*.10,hip,0],handKey=s===1?'leftHand':'rightHand',footKey=s===1?'leftFoot':'rightFoot';if(p.targets?.[handKey])[elbow,hand]=solveLimb(shoulder,elbow,hand,p.targets[handKey]);if(p.targets?.[footKey])[knee,foot]=solveLimb(pelvis,knee,foot,p.targets[footKey]);g.userData.landmarks[handKey]=hand;g.userData.landmarks[footKey]=foot;bone(shoulder,elbow,.055,.073);bone(elbow,hand,.045,.055);sphere(shoulder);sphere(elbow,.045);sphere(hand,.065,[.8,1.2,.65],handKey);bone(pelvis,knee,.075,.095);bone(knee,foot,.043,.072);sphere(knee,.07);sphere(foot,.09,[.7,.65,1.7],footKey);}g.position.set(p.x,p.y||0,p.z);g.rotation.set(...(p.euler||[0,p.rotation*Math.PI/180,0]));g.scale.fromArray(p.scale||[1,1,1]).multiplyScalar(p.height/175);this.figures.add(g);});this.figures.children.forEach((f,i)=>updatePhone(f,this.state.people[i]));this.figures.traverse(o=>{if(o.isMesh){o.castShadow=!o.userData.poseMarker;o.receiveShadow=!o.userData.poseMarker;}});this.gizmo?.sync();this.queueLive();}
 apply({live=false}={}){if(this.advanced.skies.pending){if(this.pending&&!this.loading&&this.cut)this.onApply({scene:structuredClone(this.state)},this.cut.id,{live:true,initial:this.initialCapture});return;}
  if(!this.isOpen||this.loading||this.capturing||this.gizmo.keyboard?.active||this.gizmo.transform.dragging)return;
  this.capturing=true;clearTimeout(this.liveTimer);this.liveTimer=null;this.pending=false;this.previewDirty=false;
  const pixelRatio=this.renderer.getPixelRatio(),savedCamera=this.camera.clone(),layers={};
  try{
   this.storeCamera();this.advanced?.cameraRoll();
   const empty=this.state.asset==='empty'&&!this.state.people.length&&!this.cut.background&&!this.cut.guide&&!this.cut.scene?.people?.length;
   if(!empty){
   const region={w:this.cut.pageWidth*this.cut.width/100,h:this.cut.height},w=Math.round(region.w),h=Math.round(region.h);
   this.renderer.setPixelRatio(1);this.renderer.setSize(w,h);applyRenderProjection(this.camera,this.cut,this.cut.pageWidth,this.state);
   captureSceneLayers(this,(kind,canvas)=>layers[kind]=this.advanced.png(canvas));
   }
  }finally{this.camera.copy(savedCamera);this.renderer.setPixelRatio(pixelRatio);this.resize();this.capturing=false;}
  const movement=this.movementCommit,transform=this.transformCommit;this.movementCommit=false;this.transformCommit=false;
  this.onApply({scene:structuredClone(this.state),sceneProjection:structuredClone(projectionFor(this.cut,this.cut.pageWidth)),guideLayout:{x:0,y:0,w:this.cut.pageWidth*this.cut.width/100,h:this.cut.height},...layers},this.cut.id,{live,movement,transform,initial:this.initialCapture});$('liveStatus').textContent='✓ 선택한 컷에 반영됨';
 }
}
export async function objToGLB(text){const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');const object=new OBJLoader().parse(text);object.traverse(o=>{if(o.isMesh)o.material=new T.MeshStandardMaterial({color:0xc9d1c4,side:T.DoubleSide});});return new GLTFExporter().parseAsync(object,{binary:true});}
