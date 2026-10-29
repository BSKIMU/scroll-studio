import {librarySplit} from './library-split.js?v=20261029-controls2';
import {motionLabel} from './motion-labels.js?v=20261029-equipment4';
import * as T from 'three';
import {PoseLibraryStore} from './pose-library-store.js?v=20261029-library1';
import {libraryFilters,matchesLibraryFilter,activityLabel} from './pose-library-taxonomy.js?v=20261029-delete1';
import {PoseComboTimeline} from './pose-combo-timeline.js?v=20261029-preview3';
import {SceneHandLibrary} from './scene-hand-library.js?v=20261029-controls2';
import {LibraryMotion,validateMotion,boneName} from './pose-library-motion.js?v=20261029-anchor1';
import {PoseThumbnails} from './pose-library-preview.js?v=20261029-library1';
import {SceneLiveCombo} from './scene-live-combo.js?v=20261029-anchor1';
import {SceneMotionBricks} from './scene-motionbricks.js?v=20261029-equipment4';
import {libraryWindow} from './library-window.js?v=20261029-hands2';
import {PoseRig} from './pose-lab/rig.js';
import {movementModel} from './mannequin.js?v=20261029-hands2';

const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
export class ScenePoseLibrary{
 constructor(movement){
  this.m=movement;this.e=movement.e;this.store=new PoseLibraryStore();this.thumbs=new PoseThumbnails();this.cardsToken=0;this.images=new Map();this.thumbQueue=[];this.selected=null;
  const css=el('link');css.rel='stylesheet';css.href=new URL('./pose-library.css?v=20261029-preview3',import.meta.url).href;document.head.append(css);
  this.launch=button('',()=>this.open('motion'));this.launch.id='openPoseLibrary';this.launch.className='pose-library-launch';this.launch.setAttribute('aria-label','움직임 라이브러리 열기');this.launch.setAttribute('aria-controls','poseLibrary');this.launch.setAttribute('aria-expanded','false');this.count=el('span','불러오는 중','library-count');this.launch.append(el('b','움직임 라이브러리 · 포즈집'),this.count,el('small','썸네일 · 장르 검색 · 동작 콤보'));document.getElementById('dockPropsToggle').before(this.launch);this.launch.classList.add('library-icon-launch');this.launch.insertAdjacentHTML('afterbegin','<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="20" cy="5" r="3"/><path d="m7 12 8-3 6 4 7-3M15 9l-3 9 8 4-3 8M12 18l-6 7H2M21 13l-3 5"/></svg>');
  const layout=this.workspace=document.querySelector('#sceneDialog .scene-layout');layout.classList.add('pose-library-layout');
  this.toggle=button('‹',()=>this.panel.hidden?this.open():this.close());this.toggle.className='pose-library-toggle';this.toggle.setAttribute('aria-label','포즈집 펼치기');this.toggle.setAttribute('aria-expanded','false');this.toggle.setAttribute('aria-controls','poseLibrary');layout.append(this.toggle);
  const p=this.panel=el('section',null,'pose-library');p.id='poseLibrary';p.hidden=true;p.setAttribute('role','region');p.setAttribute('aria-label','포즈집');layout.append(p);
  p.innerHTML=`<header><b>포즈집</b><button data-close aria-label="포즈집 닫기">×</button></header><div class="pose-library-tools"><input type="search" placeholder="포즈·동작 이름 검색" aria-label="포즈 검색"><select aria-label="포즈 분류"></select></div><div class="pose-library-import"><button data-import>＋ FBX · 동작 가져오기</button><button data-save>현재 포즈 저장</button><a href="https://www.mixamo.com/" target="_blank" rel="noopener">Mixamo 열기 ↗</a></div><p class="pose-library-message" role="status"></p><div class="pose-library-grid"></div><div class="pose-library-pages"></div><details class="pose-combo" open><summary>동작 콤보 · 순서대로 연결</summary><ol></ol><div class="pose-combo-actions"><button data-play>▶ 연결 재생</button><button data-clear>비우기</button><button data-export>콤보 설정 저장</button><button data-load>설정 불러오기</button></div><label>전체 시점 <input data-time type="range" min="0" max="1000" value="0" aria-label="라이브러리 동작 시점"></label><div class="pose-combo-actions"><button data-pause>재생 / 정지</button><button data-freeze>이 자세로 고정</button></div></details><details class="pose-kimodo"><summary>Kimodo · 로컬 동작 생성</summary><p data-kimodo-status>로컬 실행기를 확인합니다.</p><label>동작 설명<textarea maxlength="1200" placeholder="A person swings a sword from right to left, then returns to a ready stance."></textarea></label><label>길이 (초)<input data-seconds type="number" min="2" max="8" value="4"></label><button data-generate>동작 생성</button></details>`;
  const q=s=>p.querySelector(s);this.message=q('[role=status]');this.grid=q('.pose-library-grid');this.list=q('.pose-combo ol');this.search=q('input[type=search]');q('select').remove();this.filterId='all';
  this.search.oninput=()=>this.renderCards();q('[data-close]').onclick=()=>this.close();
  this.live=new SceneLiveCombo(this);this.motionbricks=new SceneMotionBricks(this);
  const combo=q('.pose-combo');combo.open=false;this.grid.before(combo);q('.pose-library-pages').remove();
  q('.pose-combo-actions').prepend(button('Q 콤보로 사용',async()=>{await this.live.prepare();if(this.live.prepared?.signature!==this.live.signature())return;this.close({focus:false});this.e.renderer.domElement.focus({preventScroll:true});}));
  const body=el('div',null,'pose-library-body'),genresPanel=el('nav',null,'pose-library-genres'),results=el('div',null,'pose-library-results');genresPanel.setAttribute('aria-label','동작 장르');this.genresPanel=genresPanel;
  this.scroll=el('div',null,'pose-library-scroll');this.scroll.append(this.grid);results.append(this.scroll);body.append(genresPanel,results);p.append(body);
  const options=el('details',null,'pose-library-options');options.append(el('summary','가져오기 · 내 포즈 · 생성'),q('.pose-library-import'),q('.pose-kimodo'));combo.before(options);this.window=libraryWindow(p,'움직임 라이브러리',{minWidth:270,width:320,docked:true});
  q('[data-import]').onclick=()=>{const input=el('input');input.type='file';input.accept='.fbx,.json';input.multiple=true;input.onchange=()=>this.importFiles([...input.files]);input.click();};
  q('[data-save]').onclick=()=>this.savePose();q('[data-play]').onclick=()=>this.play();q('[data-clear]').onclick=()=>{this.e.state.movement.libraryCombo=[];this.timeline.changed();};q('[data-pause]').onclick=()=>{const motion=this.m.motion?.seated;if(motion===this.timeline.playback)motion.paused=!motion.paused;};q('[data-freeze]').onclick=()=>{this.m.stop();this.say('현재 자세를 컷에 고정했습니다.');};q('[data-time]').oninput=e=>{this.timeline.seek(+e.target.value/1000);};
  q('[data-export]').onclick=()=>this.exportCombo();q('[data-load]').onclick=()=>this.importCombo();q('[data-generate]').onclick=()=>this.generate();
  p.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();}});this.timeline=new PoseComboTimeline(this);this.setupTabs();this.renderCombo();this.refreshCatalog().catch(()=>{this.count.textContent='목록 확인';});
 }
 setupTabs(){
  const p=this.panel,header=p.querySelector('header');header.querySelector('b').remove();header.querySelector('[data-close]').setAttribute('aria-label','라이브러리 닫기');
  const motion=this.motionPage=el('div',null,'library-motion-page');motion.id='motionLibraryPage';motion.setAttribute('role','tabpanel');motion.setAttribute('aria-labelledby','motionLibraryTab');
  for(const child of [...p.children])if(child!==header&&!child.classList.contains('library-window-resize')&&!child.classList.contains('library-window-edge'))motion.append(child);
  this.handLibrary=new SceneHandLibrary(this);p.append(motion,this.handLibrary.page);
  const upper=el('div',null,'pose-library-upper'),body=motion.querySelector('.pose-library-body');upper.append(motion.querySelector('.pose-library-options'),motion.querySelector('.pose-combo'));body.before(upper);this.split=librarySplit(motion,upper,body);
  const tabs=el('div',null,'library-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','포즈 라이브러리 종류');this.tabs=[];
  for(const [key,name,id,controls]of [['motion','포즈집','motionLibraryTab','motionLibraryPage'],['hand','손 포즈','handLibraryTab','handLibraryPage']]){const b=button(name,()=>this.selectTab(key));b.id=id;b.setAttribute('role','tab');b.setAttribute('aria-controls',controls);b.dataset.library=key;tabs.append(b);this.tabs.push(b);}
  tabs.onkeydown=e=>{const i=this.tabs.indexOf(e.target);if(i<0)return;const j=e.key==='ArrowRight'?(i+1)%2:e.key==='ArrowLeft'?(i+1)%2:e.key==='Home'?0:e.key==='End'?1:-1;if(j<0)return;e.preventDefault();this.selectTab(this.tabs[j].dataset.library);this.tabs[j].focus();};header.prepend(tabs);this.selectTab('motion');
 }
 selectTab(key){
  this.activeTab=key==='hand'?'hand':'motion';const hand=this.activeTab==='hand';this.motionPage.hidden=hand;this.handLibrary.page.hidden=!hand;
  for(const b of this.tabs){const active=b.dataset.library===this.activeTab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
  this.launch.setAttribute('aria-expanded',String(!this.panel.hidden&&!hand));this.handLibrary.launch.setAttribute('aria-expanded',String(!this.panel.hidden&&hand));
  if(hand){this.thumbObserver?.disconnect();this.thumbQueue=[];if(!this.panel.hidden)this.handLibrary.show();}else{this.handLibrary.hide();if(!this.panel.hidden&&this.store.entries.length)this.renderCards();}
 }
 contains(target){return this.panel.contains(target)||this.toggle.contains(target);}
 say(text){this.message.textContent=text;}
 rows(){const s=this.m.settings();return s.libraryCombo??=[];}
 async refreshCatalog(){if(!this.catalogPending)this.catalogPending=this.store.refresh().then(()=>{this.count.textContent=`${this.store.entries.length}개`;}).finally(()=>{this.catalogPending=null;});return this.catalogPending;}
 syncToggle(open){this.launch.setAttribute('aria-expanded',String(open));this.toggle.setAttribute('aria-expanded',String(open));this.toggle.setAttribute('aria-label',open?'포즈집 접기':'포즈집 펼치기');this.toggle.title=open?'포즈집 접기':'포즈집 펼치기';this.toggle.textContent=open?'›':'‹';}
 async open(tab=this.activeTab||'motion'){this.e.fly?.finish(true);this.e.props?.close({focus:false});this.panel.hidden=false;this.workspace.classList.add('pose-library-open');this.window.fit();this.syncToggle(true);this.selectTab(tab);if(tab==='hand'){this.handLibrary.search.focus();return;}this.say('포즈집 불러오는 중…');this.search.focus();try{await this.refreshCatalog();if(this.panel.hidden||this.activeTab!=='motion')return;this.renderCards();this.renderCombo();this.checkKimodo();this.motionbricks.check();}catch(e){this.say('라이브러리를 열지 못했습니다: '+e.message);}}
 close({focus=true}={}){const visible=!this.panel.hidden;this.window.finish();this.split?.finish();this.panel.hidden=true;this.workspace.classList.remove('pose-library-open');this.cardsToken++;this.thumbObserver?.disconnect();this.thumbQueue=[];this.handLibrary.hide();this.handLibrary.launch.setAttribute('aria-expanded','false');this.syncToggle(false);if(focus&&visible)this.toggle.focus({preventScroll:true});}
 renderCards(){
  this.count.textContent=`${this.store.entries.length}개`;
  const filters=libraryFilters(this.store.entries);if(!filters.some(f=>f.id===this.filterId))this.filterId='all';
  this.genresPanel.replaceChildren(el('b','동작 분류'));for(const f of filters){const b=button(f.label,()=>{this.filterId=f.id;this.renderCards();});b.dataset.genre=f.id;b.classList.toggle('genre-child',!!f.child);b.title=f.label+' · '+f.count+'개';b.setAttribute('aria-pressed',String(f.id===this.filterId));this.genresPanel.append(b);}
  const token=++this.cardsToken,term=this.search.value.toLocaleLowerCase(),matches=this.store.entries.filter(e=>matchesLibraryFilter(e,this.filterId)&&[motionLabel(e),e.name,e.genre,e.pack,activityLabel(e.subcategory),e.source].join(' ').toLocaleLowerCase().includes(term));
  this.thumbObserver?.disconnect();this.thumbQueue=[];this.grid.replaceChildren();this.scroll.scrollTop=0;
  this.thumbObserver=new IntersectionObserver((changes,observer)=>{if(token!==this.cardsToken||this.panel.hidden)return;for(const change of changes){if(!change.isIntersecting)continue;const img=change.target;observer.unobserve(img);this.thumbQueue.push({entry:img.poseEntry,img,token});}this.renderThumbnails();},{root:this.scroll,rootMargin:'180px'});
  if(!matches.length)this.grid.append(el('p','조건에 맞는 동작이 없습니다. 검색어나 분류를 바꿔보세요.','library-empty'));
  for(const entry of matches){const card=el('article',null,'pose-card'),select=button('',()=>this.preview(entry)),img=el('img'),name=el('b',motionLabel(entry)),hint=el('small',`${entry.kind==='pose'?'포즈':entry.duration.toFixed(1)+'초'} · ${activityLabel(entry.subcategory)}`);img.alt='';img.width=192;img.height=224;select.title=motionLabel(entry)+' · 이 포즈만 적용';select.append(img,name,hint);const add=button('＋',()=>this.add(entry));add.className='pose-add';add.setAttribute('aria-label',motionLabel(entry)+' 콤보에 추가');add.title='콤보에 추가';card.append(select,add);if(!entry.local){const remove=button('×',()=>this.remove(entry));remove.className='pose-remove';remove.setAttribute('aria-label',motionLabel(entry)+' 삭제');card.append(remove);}this.grid.append(card);const image=entry.thumbnail||this.images.get(entry.id);if(image)img.src=image;else{img.poseEntry=entry;this.thumbObserver.observe(img);}}
  this.say(`${matches.length}개 · 정지 포즈 · 아래로 스크롤`);
 }
 async renderThumbnails(){
  if(this.thumbsBusy)return;this.thumbsBusy=true;
  try{while(this.thumbQueue.length){const {entry,img,token}=this.thumbQueue.shift();if(token!==this.cardsToken||this.panel.hidden)continue;try{const clip=await this.store.clip(entry);if(token!==this.cardsToken||this.panel.hidden)continue;const url=await this.thumbs.render(clip,entry.kind==='pose'?0:undefined);if(token!==this.cardsToken||this.panel.hidden)continue;this.images.set(entry.id,url);img.src=url;}catch{if(token===this.cardsToken)img.alt='미리보기 없음';}await new Promise(r=>setTimeout(r,24));}}
  finally{this.thumbsBusy=false;}
 }
 add(entry){if(this.rows().length>=16){this.say('콤보는 최대 16개까지 연결합니다.');return;}this.rows().push({id:entry.id,name:motionLabel(entry),start:0,end:entry.duration,speed:1,blend:.2});this.timeline.selected=this.rows().length-1;this.panel.querySelector('.pose-combo').open=true;this.renderCombo();this.e.queueLive();this.say(motionLabel(entry)+' · 콤보에 추가했습니다.');}
 renderCombo(){this.timeline.render();}
 async play(rows=this.rows(),{preview=false}={}){
  const request=this.playRequest=(this.playRequest||0)+1;
  try{if(!rows.length)throw Error('카드의 ＋ 콤보로 동작을 추가하세요.');const person=this.e.state.people[this.e.index],items=[];for(const row of rows){const entry=this.store.entries.find(e=>e.id===row.id);if(!entry)throw Error('이 브라우저에 없는 동작입니다: '+row.name);if(row.end<=row.start)throw Error('끝 시점은 시작 시점보다 커야 합니다.');items.push({...row,clip:await this.store.clip(entry)});}
   if(request!==this.playRequest||person!==this.e.state.people[this.e.index]||!this.e.isOpen)return;const equipment=await Promise.all(rows.map(row=>this.e.props?.prepareMotion(this.store.entries.find(e=>e.id===row.id))));if(request!==this.playRequest||person!==this.e.state.people[this.e.index]||!this.e.isOpen)return;await this.m.start();if(request!==this.playRequest||person!==this.e.state.people[this.e.index]||!this.e.isOpen)return;if(!this.m.motion)throw Error('적용할 인물을 먼저 선택하세요.');this.m.motion.sequence=null;this.m.motion.seated=new LibraryMotion(this.m.motion,items);this.m.motion.seated.onSegment=index=>equipment[index]?.();this.m.motion.seated.render();if(!preview){this.previewMotion=null;if(this.previewControls)this.previewControls.hidden=true;this.timeline.playback=this.m.motion.seated;this.timeline.playbackSignature=JSON.stringify(rows);this.say(`${items.length}개 동작 연결 · 재생 중`);}return this.m.motion.seated;
  }catch(e){this.say(e.message);}
 }
 async preview(entry){
  this.live.cancel();this.panel.querySelector('.pose-combo').open=false;
  const motion=await this.play([{id:entry.id,name:motionLabel(entry),start:0,end:entry.duration,speed:1,blend:0}],{preview:true});
  if(motion?.mode!=='library')return;
  this.previewMotion=motion;motion.seek(entry.kind==='pose'?0:.5);
  if(!this.previewControls){
   const controls=this.previewControls=el('div',null,'pose-preview-controls'),slider=this.previewSlider=el('input');slider.type='range';slider.min=0;slider.max=1000;slider.setAttribute('aria-label','선택 포즈 시점');
   slider.oninput=()=>{if(this.previewMotion===this.m.motion?.seated){this.previewMotion.seek(+slider.value/1000);this.e.invalidate();}};
   controls.append(slider,button('▶ / Ⅱ',()=>{if(this.previewMotion===this.m.motion?.seated)this.previewMotion.paused=!this.previewMotion.paused;}),button('자세 고정',()=>{if(this.previewMotion===this.m.motion?.seated){this.m.stop();controls.hidden=true;this.say('선택한 자세를 컷에 고정했습니다.');}}));this.message.after(controls);
  }
  this.previewControls.hidden=false;this.previewSlider.value=Math.round(motion.progress*1000);this.say(`${motionLabel(entry)} · 단일 포즈 · ＋로만 콤보 추가`);
 }
 async importFiles(files){
  if(files.length>300){this.say('한 번에 최대 300개를 선택하세요.');return;}let count=0;const errors=[];
  for(const file of files){this.say(`가져오는 중 ${count+errors.length+1}/${files.length} · ${file.name}`);try{if(file.size>40*1024*1024)throw Error('40MB 이하의 Without Skin FBX를 사용하세요.');let clip;if(/\.fbx$/i.test(file.name)){const {importFBX}=await import('./pose-library-import.js?v=20261029-library1');clip=await importFBX(await file.arrayBuffer(),{name:file.name.replace(/\.fbx$/i,'')});}else clip=validateMotion(JSON.parse(await file.text()));await this.store.save(clip,{name:file.name.replace(/\.(fbx|json)$/i,'')});count++;}catch(e){errors.push(file.name+': '+e.message);}await new Promise(r=>setTimeout(r,0));}
  this.renderCards();this.say(`${count}개 저장${errors.length?' · 실패 '+errors.length+'개: '+errors.slice(0,3).join(' / '):' · 이 브라우저에 보관됩니다.'}`);
 }
 async savePose(){
  try{const p=this.e.state.people[this.e.index],figure=this.e.figures.children[this.e.index];if(!figure?.userData.motionRig)throw Error('인물을 선택하세요.');const rig=new PoseRig(movementModel(p),{fit:false}),inverse=figure.quaternion.clone().invert(),bones=rig.bones.filter(b=>figure.userData.motionRig.bones[boneName(b.name)]),hip=figure.userData.motionRig.bones.Hips.getWorldPosition(new T.Vector3()).sub(figure.position).applyQuaternion(inverse),q=bones.flatMap(b=>inverse.clone().multiply(figure.userData.motionRig.bones[boneName(b.name)].getWorldQuaternion(new T.Quaternion())).multiply(rig.rest.get(b).worldQ.clone().invert()).normalize().toArray());const clip={duration:1,legLength:rig.chains.leftFoot.l1+rig.chains.leftFoot.l2,bones:bones.map(b=>boneName(b.name)),frames:[{hip:hip.toArray(),q}],source:'사용자가 저장한 자세'};rig.helper.geometry.dispose();rig.helper.material.dispose();rig.handles.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
   const name=window.prompt('포즈 이름','내 포즈 '+(this.store.entries.filter(e=>e.kind==='pose').length+1));if(name===null)return;await this.store.save(clip,{name:name||'내 포즈',category:'내 포즈',kind:'pose'});this.renderCards();this.say('현재 자세를 포즈집에 저장했습니다.');
  }catch(e){this.say(e.message);}
 }
 async remove(entry){try{await this.store.remove(entry);this.renderCards();this.say('개인 라이브러리에서 삭제했습니다.');}catch(e){this.say(e.message);}}
 exportCombo(){const data={format:'scroll-motion-combo',version:1,steps:this.rows()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='motion-combo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.say('동작 참조·순서·시점 설정만 저장했습니다.');}
 importCombo(){const input=el('input');input.type='file';input.accept='.json';input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>100000)throw Error('콤보 설정 파일이 너무 큽니다.');const data=JSON.parse(await file.text());if(data.format!=='scroll-motion-combo'||data.version!==1||!Array.isArray(data.steps)||data.steps.length>16)throw Error('콤보 설정 파일이 아닙니다.');this.e.state.movement.libraryCombo=data.steps.map(r=>{if(typeof r.id!=='string'||typeof r.name!=='string'||!['start','end','speed','blend'].every(k=>Number.isFinite(r[k])))throw Error('손상된 콤보 설정입니다.');return {id:r.id,name:r.name.slice(0,100),start:r.start,end:r.end,speed:r.speed,blend:r.blend};});this.renderCombo();this.e.queueLive();this.say('콤보 설정을 불러왔습니다. 동작 파일은 같은 라이브러리에 있어야 합니다.');}catch(e){this.say(e.message);}};input.click();}
 async checkKimodo(){const label=this.panel.querySelector('[data-kimodo-status]'),b=this.panel.querySelector('[data-generate]');try{if(!this.store.local)throw Error();const r=await fetch('/api/pose-library/status');const status=await r.json();b.disabled=!status.kimodo;label.textContent=status.kimodo?'설치된 Kimodo · Vulkan 사용 · 생성 후 라이브러리에 추가':'Kimodo 로컬 실행기를 찾지 못했습니다.';}catch{b.disabled=true;label.textContent='로컬 서버에서 실행할 수 있습니다.';}}
 async generate(){const b=this.panel.querySelector('[data-generate]'),status=this.panel.querySelector('[data-kimodo-status]');b.disabled=true;try{const prompt=this.panel.querySelector('textarea').value.trim();if(!prompt)throw Error('생성할 동작을 영어로 설명하세요.');const r=await fetch('/api/pose-library/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,seconds:+this.panel.querySelector('[data-seconds]').value})});if(!r.ok)throw Error(await r.text());const {id}=await r.json();status.textContent='로컬에서 생성 중 · 수 분 걸릴 수 있습니다. 창을 닫아도 생성은 계속됩니다.';this.pollJob(id);}catch(e){status.textContent=e.message;b.disabled=false;}}
 pollJob(id){clearTimeout(this.jobTimer);this.jobTimer=setTimeout(async()=>{try{const r=await fetch('/api/pose-library/jobs/'+id),job=await r.json();if(job.state==='done'){await this.store.refresh();this.renderCards();this.panel.querySelector('[data-kimodo-status]').textContent='생성 완료 · 액션 또는 일상 분류에서 확인하세요.';this.panel.querySelector('[data-generate]').disabled=false;}else if(job.state==='failed')throw Error(job.message||'생성 실패');else this.pollJob(id);}catch(e){this.panel.querySelector('[data-kimodo-status]').textContent=e.message;this.panel.querySelector('[data-generate]').disabled=false;}},3000);}
 update(){this.live.update();this.timeline.update();const motion=this.m.motion?.seated;if(this.previewControls)this.previewControls.hidden=motion!==this.previewMotion;if(motion===this.previewMotion&&this.previewSlider&&document.activeElement!==this.previewSlider)this.previewSlider.value=Math.round(motion.progress*1000);if(!this.panel.hidden&&motion===this.timeline.playback&&motion?.mode==='library'&&document.activeElement!==this.panel.querySelector('[data-time]'))this.panel.querySelector('[data-time]').value=Math.round(motion.progress*1000);}
}
