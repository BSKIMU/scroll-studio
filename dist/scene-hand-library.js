import {HandThumbnails} from './hand-library-preview.js?v=20261029-hands2';
import {libraryCatalog} from './library-assets.js';
import {applyLibraryHand,resetLibraryHand,validHand} from './hand-library-data.js?v=20261029-hands2';

const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
export class SceneHandLibrary{
 constructor(library){
  this.library=library;this.e=library.e;this.entries=[];this.images=new Map();this.thumbs=new HandThumbnails();
  const page=this.page=el('div');page.id='handLibraryPage';page.className='hand-library-page';page.hidden=true;page.setAttribute('role','tabpanel');page.setAttribute('aria-labelledby','handLibraryTab');
  page.innerHTML='<div class="hand-library-tools"><input type="search" aria-label="손 포즈 검색" placeholder="손 포즈 이름 검색"><select aria-label="손 포즈 분류"><option value="">전체 손 포즈</option></select><div class="hand-library-target"><select aria-label="손 포즈 적용 대상"><option value="both">양손</option><option value="right">오른손</option><option value="left">왼손</option></select><button data-reset>원래 손 모양</button></div></div><p class="hand-library-status" role="status">손 포즈를 불러옵니다.</p><div class="hand-library-scroll"><div class="hand-library-grid"></div></div>';
  const q=s=>page.querySelector(s);this.search=q('input');this.category=q('select');this.target=q('[aria-label="손 포즈 적용 대상"]');this.status=q('[role=status]');this.scroll=q('.hand-library-scroll');this.grid=q('.hand-library-grid');
  this.search.oninput=this.category.onchange=this.target.onchange=()=>this.render();q('[data-reset]').onclick=()=>this.reset();
  const launch=this.launch=el('button');launch.id='openHandLibrary';launch.className='pose-library-launch hand-library-launch library-icon-launch';launch.type='button';launch.setAttribute('aria-label','손 포즈 라이브러리 열기');launch.setAttribute('aria-controls','handLibraryPage');launch.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 17V7a2 2 0 0 1 4 0v8-11a2 2 0 0 1 4 0v11-9a2 2 0 0 1 4 0v10-5a2 2 0 0 1 4 0v10c0 6-4 9-9 9-4 0-6-2-8-5l-5-7c-2-3 1-5 3-3l3 3Z"/></svg><b>손 포즈</b><small>정지 손 모양 · 양손 / 왼손 / 오른손</small>';launch.onclick=()=>library.open('hand');document.getElementById('dockPropsToggle').before(launch);
 }
 async load(){
  if(this.loaded)return;
  if(!this.pending)this.pending=(async()=>{const data=await libraryCatalog('hand');if(data.version!==1||!Array.isArray(data.entries))throw Error('손 포즈 파일을 확인하세요.');this.entries=data.entries.filter(e=>typeof e.id==='string'&&typeof e.name==='string'&&validHand(e.hands?.left)&&validHand(e.hands?.right));this.loaded=true;for(const c of new Set(this.entries.map(e=>e.category)))this.category.add(new Option(c,c));})().finally(()=>this.pending=null);
  return this.pending;
 }
 async show(){try{await this.load();if(!this.page.hidden)this.render();}catch(e){this.status.textContent=e.message;}}
 hide(){this.observer?.disconnect();this.queue=[];this.token=(this.token||0)+1;}
 render(){
  this.hide();const token=this.token,term=this.search.value.trim().toLowerCase(),matches=this.entries.filter(e=>(!this.category.value||e.category===this.category.value)&&e.name.toLowerCase().includes(term));this.grid.replaceChildren();this.scroll.scrollTop=0;
  this.status.textContent=`${matches.length} / ${this.entries.length}개 · 정지 손 포즈`;
  this.observer=new IntersectionObserver(changes=>{if(token!==this.token||this.page.hidden)return;for(const c of changes)if(c.isIntersecting){this.observer.unobserve(c.target);this.queue.push({img:c.target,entry:c.target.handEntry,token});}this.renderImages();},{root:this.scroll,rootMargin:'200px'});
  const person=this.e.state?.people[this.e.index];
  for(const entry of matches){const b=el('button'),img=el('img'),name=el('span',entry.name),key=entry.id+':'+this.target.value;b.type='button';b.className='hand-library-card';b.title=entry.name+' · 선택한 손에 적용';b.setAttribute('aria-label',entry.name);b.setAttribute('aria-pressed',String(Object.values(person?.handPose||{}).some(p=>p.id===entry.id)));img.alt='';img.width=224;img.height=192;b.append(img,name);b.onclick=()=>this.apply(entry);this.grid.append(b);if(this.images.has(key))img.src=this.images.get(key);else{img.handEntry=entry;this.observer.observe(img);}}
  if(!matches.length)this.grid.append(el('p','검색 조건에 맞는 손 포즈가 없습니다.'));
 }
 async renderImages(){if(this.busy)return;this.busy=true;try{while(this.queue?.length){const {img,entry,token}=this.queue.shift();if(token!==this.token||this.page.hidden)continue;const target=this.target.value;try{const url=await this.thumbs.render(entry,target);this.images.set(entry.id+':'+target,url);if(token===this.token)img.src=url;}catch{img.alt='미리보기 없음';}await new Promise(r=>setTimeout(r,16));}}finally{this.busy=false;}}
 prepare(){this.e.movement.stop();const person=this.e.state?.people[this.e.index];if(!this.e.figures.children[this.e.index]?.userData.motionRig)throw Error('손 포즈를 적용할 인물을 선택하세요.');this.e.flush();return person;}
 apply(entry){try{const person=this.prepare();applyLibraryHand(person,entry,this.target.value);this.e.updatePerson({pose:true});this.e.flush();this.e.hands?.sync?.();for(const b of this.grid.children)b.setAttribute('aria-pressed',String(b.getAttribute('aria-label')===entry.name));this.status.textContent=entry.name+' · '+this.target.selectedOptions[0].textContent+' 적용';}catch(e){this.status.textContent=e.message;}}
 reset(){try{const person=this.prepare();resetLibraryHand(person,this.target.value);this.e.updatePerson({pose:true});this.e.flush();this.render();this.status.textContent='선택한 손을 현재 동작의 손 모양으로 복원했습니다.';}catch(e){this.status.textContent=e.message;}}
}
