import * as T from 'three';
import {localLibraryService} from './library-assets.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {registerCharacter,loadFigureModel,defaultPerson,mannequin} from './mannequin.js?v=20261029-hands2';
import {loadPoseLab,PoseLabMotion} from './pose-lab-motion.js?v=20261029-curated2';

const markerInfo=[['chin','턱','#46d2cd'],['leftWrist','왼손목','#a9d65c'],['rightWrist','오른손목','#a9d65c'],['leftElbow','왼팔꿈치','#efd669'],['rightElbow','오른팔꿈치','#efd669'],['leftKnee','왼무릎','#edb365'],['rightKnee','오른무릎','#edb365'],['groin','사타구니','#f28eae']];
const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
async function json(url,options){const r=await fetch(url,options);if(!r.ok)throw Error(await r.text());return r.json();}

export class SceneAutoRigger{
 constructor(editor){
  this.e=editor;this.phase='upload';this.busy=false;this.markers={};this.loadToken=0;
  const css=make('link');css.rel='stylesheet';css.href=new URL('./auto-rigger.css?v=20261029-rig2',import.meta.url).href;document.head.append(css);
  const launch=this.launch=make('button');launch.id='openAutoRigger';launch.className='pose-library-launch autorig-launch';launch.innerHTML='<b>＋ 캐릭터 불러오기 · Auto-Rigger</b><small>파일 선택 · 관절 마커 · 자동 리깅</small>';editor.movement.library.handLibrary.launch.after(launch);launch.onclick=()=>this.open();
  const d=this.dialog=make('dialog');d.id='autoRigger';d.setAttribute('aria-labelledby','autoRiggerTitle');
  d.innerHTML=`<header><b id="autoRiggerTitle">캐릭터 불러오기</b><button data-close aria-label="Auto-Rigger 닫기">×</button></header>
   <ol class="autorig-steps"><li>1 파일 선택</li><li>2 마커 배치</li><li>3 리깅 확인</li></ol>
   <section data-upload class="autorig-upload"><h2>내 캐릭터를 움직여 보세요</h2><p>팔을 벌린 A/T 포즈의 사람형 캐릭터를 선택하세요.<br>파일은 이 컴퓨터에서만 처리됩니다.</p><div class="autorig-drop" tabindex="0" role="button" aria-label="캐릭터 파일 선택"><b>↑ 캐릭터 업로드하기</b><span>파일을 선택하거나 여기에 놓으세요</span><small>FBX · OBJ · GLB / 최대 150MB</small></div><p>OBJ는 형상을 불러옵니다. 텍스처가 필요하면 패킹된 GLB 또는 FBX를 사용하세요.</p><p>기존 뼈가 있으면 호환 관절을 확인해 그대로 사용합니다.</p></section>
   <section data-progress class="autorig-progress" hidden><h2>캐릭터 준비 중</h2><progress max="100" value="0" aria-label="캐릭터 처리 진행률"></progress><output>0%</output><p data-progress-text></p></section>
   <section data-edit class="autorig-edit" hidden><div class="autorig-stage"><div class="autorig-view"></div><div class="autorig-markers"></div><div class="autorig-view-buttons"><button data-front>정면 · 마커 배치</button><button data-side>측면 확인</button></div></div><aside><h3 data-guide-title>관절 마커 배치</h3><p data-guide-text>고리를 잡아 모델의 해당 부위로 옮기세요. 정면에서 배치하고 측면에서 깊이를 확인하세요.</p><svg class="autorig-guide" viewBox="0 0 200 210" role="img" aria-label="턱, 손목, 팔꿈치, 무릎, 사타구니 마커 배치 안내"><g fill="none" stroke="#b7c3cd" stroke-width="15" stroke-linecap="round"><circle cx="100" cy="28" r="16" fill="#8b9ba8" stroke-width="2"/><path d="M100 50V115M100 62L56 72 14 80M100 62L144 72 186 80M100 115L77 156 70 199M100 115L123 156 130 199"/></g><g fill="#263744" stroke-width="4"><circle cx="100" cy="47" r="9" stroke="#46d2cd"/><g stroke="#a9d65c"><circle cx="17" cy="79" r="9"/><circle cx="183" cy="79" r="9"/></g><g stroke="#efd669"><circle cx="56" cy="72" r="9"/><circle cx="144" cy="72" r="9"/></g><g stroke="#edb365"><circle cx="77" cy="156" r="9"/><circle cx="123" cy="156" r="9"/></g><circle cx="100" cy="115" r="9" stroke="#f28eae"/></g></svg><ul class="autorig-legend"></ul><p data-rig-info></p><div data-result-tools hidden><button data-walk>걷기 미리보기</button><button data-stand>기본 서기</button><a data-download download>리깅 GLB 저장 ↓</a></div></aside></section>
   <p class="autorig-status" role="status"></p>
   <footer><button data-back>이전</button><label data-symmetry-label><input data-symmetry type="checkbox" checked> 좌우 대칭</label><label data-lod-label>스켈레톤 상세도<select data-lod><option value="body">기본 · 전신 22개</option><option value="hands">손가락 포함 · 62개</option></select></label><button data-next>다음 · 자동 리깅</button></footer>`;
  document.body.append(d);const q=s=>d.querySelector(s);this.q=q;
  q('[data-close]').onclick=()=>this.close();d.addEventListener('cancel',e=>{e.preventDefault();this.close();});d.addEventListener('keydown',e=>e.stopPropagation());
  const drop=q('.autorig-drop');const select=()=>{const f=make('input');f.type='file';f.accept='.fbx,.obj,.glb';f.onchange=()=>{if(f.files[0])this.import(f.files[0]);};f.click();};drop.onclick=select;drop.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();select();}};drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragover');};drop.ondragleave=()=>drop.classList.remove('dragover');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragover');if(e.dataTransfer.files[0])this.import(e.dataTransfer.files[0]);};
  q('[data-front]').onclick=()=>this.view('front');q('[data-side]').onclick=()=>this.view('side');q('[data-walk]').onclick=()=>this.walk();q('[data-stand]').onclick=()=>this.showResult();q('[data-next]').onclick=()=>this.phase==='result'?this.add():this.rig();q('[data-back]').onclick=()=>{if(this.busy)return;this.stopPreview();this.phase='upload';this.sync();};
  for(const [key,name,color]of markerInfo){const li=make('li',name);li.style.setProperty('--marker',color);q('.autorig-legend').append(li);const b=make('button');b.className='autorig-marker';b.title=name;b.setAttribute('aria-label',name+' 마커');b.dataset.marker=key;b.style.setProperty('--marker',color);q('.autorig-markers').append(b);this.bindMarker(b,key);}
 }
 say(text){this.q('.autorig-status').textContent=text;}
 sync(){
  const q=this.q,edit=['markers','result'].includes(this.phase);q('[data-upload]').hidden=this.phase!=='upload';q('[data-progress]').hidden=this.phase!=='progress';q('[data-edit]').hidden=!edit;
  q('footer').hidden=!edit;q('[data-back]').disabled=this.busy;q('[data-next]').disabled=this.busy;
  const markers=this.phase==='markers',reuse=markers&&this.info?.compatible;
  q('[data-next]').textContent=this.phase==='result'?'이 캐릭터를 장면에 추가':reuse?'기존 리깅 사용':'다음 · 자동 리깅';
  q('[data-next]').disabled=this.busy||markers&&this.info?.hasRig&&!reuse;
  q('[data-symmetry-label]').hidden=q('[data-lod-label]').hidden=!markers||reuse;
  q('.autorig-legend').hidden=!markers||reuse;q('.autorig-guide').toggleAttribute('hidden',!markers||reuse);q('[data-result-tools]').hidden=this.phase!=='result';
  q('[data-front]').textContent=markers?'정면 · 마커 배치':'정면';
  q('[data-guide-title]').textContent=this.phase==='result'?'리깅 결과 확인':reuse?'기존 리깅 확인':'관절 마커 배치';
  q('[data-guide-text]').textContent=this.phase==='result'?'드래그로 둘러보고 걷기를 확인하세요. 문제가 없으면 장면에 추가합니다.':reuse?'호환되는 뼈와 스킨 가중치를 찾았습니다. 새 뼈를 만들지 않고 기존 리깅을 사용합니다.':'색상 고리를 해당 관절로 옮기세요. 왼손·오른손은 캐릭터 기준입니다. 화살표 키로도 미세 조절할 수 있습니다. 손가락 포함은 손을 편 A/T 포즈용 추정이며 결과 확인이 필요합니다.';
  q('#autoRiggerTitle').textContent=this.phase==='upload'?'캐릭터 불러오기':this.phase==='result'?'Auto-Rigger · 결과 확인':'Auto-Rigger';
  [...q('.autorig-steps').children].forEach((li,i)=>li.classList.toggle('active',i===(this.phase==='result'?2:this.id?1:0)));
  if(edit&&this.renderer)this.resize();this.drawMarkers();
 }
 async open(){this.e.flush();this.e.movement.library.close({focus:false});this.e.props?.close({focus:false});if(!this.dialog.open)this.dialog.showModal();this.sync();const local=localLibraryService();this.q('.autorig-drop').inert=!local;if(!local){this.say('자동 리깅은 Blender가 설치된 로컬 실행판에서 사용할 수 있습니다.');return;}if(this.phase==='result')await this.showResult();else if(this.phase==='markers')await this.loadPreview();}
 close(){this.dialog.close();this.stopPreview();this.observer?.disconnect();this.controls?.dispose();this.renderer?.dispose();this.renderer=null;this.q('.autorig-view').replaceChildren();this.launch.focus({preventScroll:true});}
 progress(value,text){const p=this.q('progress');if(value===null)p.removeAttribute('value');else p.value=value;this.q('output').textContent=value===null?'처리 중':Math.round(value)+'%';this.q('[data-progress-text]').textContent=text;}
 async import(file){
  if(!localLibraryService()){this.say('캐릭터 자동 리깅은 로컬 실행판에서 사용하세요.');return;}
  if(this.busy)return;if(!/\.(glb|fbx|obj)$/i.test(file.name)||file.size>150*1024*1024||!file.size){this.say('150MB 이하의 FBX, OBJ, GLB를 선택하세요.');return;}
  this.busy=true;this.phase='progress';this.id=null;this.say('');this.sync();this.progress(0,'캐릭터 파일을 로컬로 복사합니다.');
  try{
   const data=await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('POST','/api/character-library/import?name='+encodeURIComponent(file.name));xhr.timeout=180000;xhr.upload.onprogress=e=>this.progress(e.lengthComputable?e.loaded/e.total*100:null,'캐릭터 파일을 로컬로 복사합니다.');xhr.onload=()=>{if(xhr.status!==200){reject(Error(xhr.responseText||'로컬 서버를 확인하세요.'));return;}try{resolve(JSON.parse(xhr.responseText));}catch{reject(Error('서버 응답을 확인하세요.'));}};xhr.onerror=xhr.ontimeout=()=>reject(Error('로컬 서버 연결을 확인하세요.'));xhr.send(file);});
   this.id=data.id;await this.poll();this.info=await json(this.url('info.json'));this.markers=structuredClone(this.info.markers);this.phase='markers';this.q('[data-rig-info]').textContent=`${this.info.name} · ${this.info.vertices.toLocaleString()} 정점${this.info.hasRig?' · '+this.info.bones+'개 뼈':''}`;
   if(this.info.hasRig&&!this.info.compatible)this.say('기존 리깅의 관절 이름을 매핑할 수 없습니다: '+this.info.missing.join(', ')+'. Mixamo 이름으로 내보내거나 뼈 없는 모델을 가져오세요.');
   if(this.dialog.open)await this.loadPreview();
  }catch(error){this.phase='upload';this.say(error.message);}finally{this.busy=false;this.sync();}
 }
 url(file){return '/api/character-library/'+this.id+'/'+file;}
 async poll(){for(;;){const state=await json(this.url('job.json'));this.progress(state.progress??null,state.message);if(state.state==='failed')throw Error(state.message);if(state.state==='done')return;await new Promise(resolve=>setTimeout(resolve,700));}}
 async rig(){
  if(this.busy||!this.id)return;this.busy=true;this.phase='progress';this.stopPreview();this.sync();this.progress(0,'리깅 요청을 준비합니다.');this.say('');
  try{await json(this.url('rig'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(this.info.compatible?{mode:'existing'}:{mode:'generate',markers:this.markers,lod:this.q('[data-lod]').value})});await this.poll();this.entry=await json(this.url('entry.json'));registerCharacter(this.entry);await loadFigureModel(this.entry.id);this.phase='result';if(this.dialog.open)await this.showResult();this.say('로컬 캐릭터 라이브러리에 저장했습니다. 이 PC에서 다시 선택할 수 있습니다.');}
  catch(error){this.phase='markers';this.say(error.message);if(this.dialog.open)await this.loadPreview();}finally{this.busy=false;this.sync();}
 }
 setupPreview(){
  if(this.renderer)return;const view=this.q('.autorig-view');this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor(0x56616b);view.append(this.renderer.domElement);this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1.3,1.3,1.1,-1.1,.01,30);this.camera.position.set(0,.875,5);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.875,0);this.controls.enablePan=false;this.controls.enableZoom=false;this.controls.addEventListener('change',()=>this.paint());this.scene.add(new T.HemisphereLight(0xffffff,0x667482,2.6));const key=new T.DirectionalLight(0xffffff,2.4);key.position.set(2,4,5);this.scene.add(key);this.grid=new T.GridHelper(4,20,0x9baab6,0x6d7d89);this.scene.add(this.grid);this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(view);this.resize();
 }
 disposeModel(){if(!this.model)return;this.scene?.remove(this.model);this.model.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.model=null;}
 async loadPreview(){this.setupPreview();this.stopPreview();const token=this.loadToken=(this.loadToken||0)+1;const g=await new GLTFLoader().loadAsync(this.url('preview.glb'));if(token!==this.loadToken||!this.dialog.open)return;this.disposeModel();this.model=g.scene;this.scene.add(this.model);this.view('front');}
 resize(){if(!this.renderer||!this.dialog.open)return;const r=this.q('.autorig-view').getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height);const width=Math.max(1.2,2.05*r.width/r.height);this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=1.025;this.camera.bottom=-1.025;this.camera.updateProjectionMatrix();this.paint();}
 view(direction){if(!this.camera)return;this.front=direction==='front';this.camera.position.set(this.front?0:5,.875,this.front?5:0);this.controls.target.set(0,.875,0);this.controls.enabled=this.phase==='result';this.controls.update();this.paint();}
 paint(){if(!this.renderer||!this.dialog.open)return;this.renderer.render(this.scene,this.camera);this.drawMarkers();}
 drawMarkers(){
  for(const b of this.q('.autorig-markers').children){b.hidden=this.phase!=='markers'||!this.front||this.info?.compatible||!this.markers[b.dataset.marker]||!this.camera;if(b.hidden)continue;const r=this.q('.autorig-view').getBoundingClientRect(),v=new T.Vector3(...this.markers[b.dataset.marker]).project(this.camera);b.style.left=(v.x*.5+.5)*r.width+'px';b.style.top=(-v.y*.5+.5)*r.height+'px';}
 }
 bindMarker(button,key){
  const move=(x,y)=>{this.markers[key][0]=x;this.markers[key][1]=T.MathUtils.clamp(y,.02,1.74);const mirror=key.startsWith('left')?key.replace('left','right'):key.startsWith('right')?key.replace('right','left'):null;if(this.q('[data-symmetry]').checked){if(mirror)this.markers[mirror]=[-x,this.markers[key][1],this.markers[key][2]];else this.markers[key][0]=0;}this.drawMarkers();};
  let pointer=null;button.onpointerdown=e=>{e.preventDefault();pointer=e.pointerId;button.setPointerCapture(pointer);button.focus();};button.onpointermove=e=>{if(pointer!==e.pointerId)return;const r=this.q('.autorig-view').getBoundingClientRect(),v=new T.Vector3((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1,0).unproject(this.camera);move(T.MathUtils.clamp(v.x,-1.4,1.4),v.y);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>{pointer=null;};button.onkeydown=e=>{const delta=e.shiftKey?.01:.003;const [x,y]=this.markers[key];if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(x+(e.key==='ArrowLeft'?-delta:e.key==='ArrowRight'?delta:0),y+(e.key==='ArrowUp'?delta:e.key==='ArrowDown'?-delta:0));}};
 }
 stopPreview(){++this.loadToken;cancelAnimationFrame(this.frame);this.motion?.freeze();this.motion=null;this.last=null;}
 async showResult(){if(!this.entry||!this.dialog.open)return;this.setupPreview();this.stopPreview();this.disposeModel();this.previewPerson=defaultPerson(this.entry.id);this.model=mannequin(this.previewPerson,0);for(const o of this.model.children)if(o.userData.poseMarker)o.visible=false;this.scene.add(this.model);this.q('[data-rig-info]').textContent=`${this.entry.name} · ${this.entry.bones}개 뼈 · ${this.entry.fingerControl?'손가락 관절 포함':'손가락 개별 제어 없음'}`;this.q('[data-download]').href=this.entry.url;this.q('[data-download]').download=this.entry.name+'-rigged.glb';this.sync();this.view('front');}
 async walk(){if(!this.entry||this.motion)return;const entry=this.entry;this.say('걷기 동작을 준비합니다…');try{const controller=await loadPoseLab();if(!this.dialog.open||this.phase!=='result'||this.entry!==entry)return;this.motion=new PoseLabMotion(controller,this.model,this.previewPerson);let time=0;const tick=now=>{if(!this.motion||!this.dialog.open)return;const dt=this.last?Math.min((now-this.last)/1000,.04):0;this.last=now;time+=dt;this.motion.update(dt,new T.Vector3(0,0,1),{walk:1.3,run:3.6},false);this.model.position.set(0,0,0);this.model.updateMatrixWorld(true);this.paint();this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);this.say('걷기 미리보기 · 관절과 메시 변형을 확인하세요.');}catch(error){this.say('걷기 확인 실패: '+error.message);}}
 async add(){if(this.busy||!this.entry||!this.e.isOpen)return;this.e.movement.stop();const person=defaultPerson(this.entry.id),current=this.e.state.people[this.e.index];Object.assign(person,{x:(current?.x??0)+.7,y:current?.y??0,z:current?.z??0});this.e.state.people.push(person);this.e.index=this.e.state.people.length-1;this.close();this.e.updatePeople();this.e.gizmo.frame();this.e.queueLive();this.e.flush();}
}
