import {normalizeMeleeProp,alignShieldForearm} from './melee-props.js?v=20261029-grip3';
import {libraryCatalog} from './library-assets.js';
import {pickerProps,useGunReadyPose} from './curated-guns.js?v=20261029-curated2';
import {updateFigureLandmarks} from './mannequin.js?v=20261029-hands2';
import {propLabel} from './prop-labels.js?v=20261029-grip3';
import {selectedProps,remapRemovedMeshes} from './scene-prop-delete.js?v=20261029-delete1';
import {gunCategories} from './equipment-motion.js?v=20261029-grip3';
import {loadGunCarry,applyGunCarry,normalizeGun,supportGun} from './gun-carry.js?v=20261029-curated2';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {instantiateBackground,releaseObjects} from './scene-resources.js?v=20261025-release1';
import {gripFrame,placeHeldProp,motionEquipment,equipmentForMotion,applyEquipmentGrip} from './prop-grip.js?v=20261029-curated2';
import {libraryWindow} from './library-window.js?v=20261029-grip3';
import {equipProp,moveHeldProp,reconnectLegacyProps,normalizeFirearmHands} from './prop-equipment.js?v=20261029-grip3';
const names={Sword:'검',Shield:'방패',Axe:'도끼',Rifle:'소총',Pistol:'권총',SMG:'기관단총',Shotgun:'산탄총',Sniper:'저격총',LMG:'기관총'};
const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const btn=(text,fn)=>{const b=make('button',text);b.type='button';b.onclick=fn;return b;};
export class SceneProps{
 removeSelected(){
  const e=this.e,g=e.gizmo,a=e.advanced,items=selectedProps(this.items,g.objectTarget);
  if(!items.length||e.loading||g.transform.dragging||g.keyboard?.active||g.directDragging||g.quickDragging)return false;
  e.flush();const ids=new Set(items.map(p=>p.data.id)),removed=new Set();
  for(const item of items)item.root.traverse(o=>{if(o.isMesh)removed.add(o);});
  const look=a.settings();remapRemovedMeshes(look,a.meshes,removed,e.state.asset);
  e.state.props=e.state.props.filter(p=>!ids.has(p.id));
  for(const id of ids)if(look.objectGroups)delete look.objectGroups[id];
  g.objectTarget=null;g.transform.detach();g.setAxis(null);
  // Release only instance materials/edge helpers; source geometry is shared.
  for(const mesh of removed){const base=a.bases.get(mesh);if(base){mesh.material=base.original;[].concat(base.flat).forEach(m=>m.dispose());a.bases.delete(mesh);}}
  a.meshes=a.meshes.filter(o=>!removed.has(o));a.lines=a.lines.filter(line=>!removed.has(line.parent));a.selected=-1;
  for(const item of items){item.root.removeFromParent();releaseObjects(item.root);}
  this.items=this.items.filter(p=>!ids.has(p.data.id));
  a.list();g.sync();e.seats?.sync();e.ground?.sync();
  this.status.textContent=`소품 ${items.length}개 삭제 · Ctrl+Z로 복원`;
  e.transformCommit=true;e.queueLive();e.apply({live:true});return true;
 }
 constructor(editor){
  this.e=editor;this.items=[];this.cache=new Map();this.held=new Map();this.entries=[];
  const controls=document.querySelector('.scene-controls'),tabs=controls.querySelector('.scene-tabs'),panel=this.panel=make('div');panel.id='propPanel';panel.className='scene-property-group';panel.hidden=true;controls.append(panel);
  const tab=this.tab=btn('소품',()=>{controls.querySelectorAll('.scene-property-group').forEach(p=>p.hidden=p!==panel);tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===tab));this.syncFields();});
  const person=[...tabs.children].find(b=>b.textContent==='인물'),background=[...tabs.children].find(b=>b.textContent==='배경');tabs.prepend(person,tab,background);
  this.launch=btn('',()=>this.open());this.launch.id='openPropLibrary';this.launch.className='prop-library-launch';this.launch.setAttribute('aria-label','소품 라이브러리 열기');this.launch.setAttribute('aria-controls','propLibrary');this.launch.setAttribute('aria-expanded','false');this.count=make('span','불러오는 중');this.count.className='library-count';this.launch.append(make('b','▦ 소품 라이브러리'),this.count,make('small','검 · 방패 · 도끼 · 총 · 손에 연결'));document.getElementById('dockPropsToggle').before(this.launch);
  this.status=make('p','소품은 선택한 인물의 손에 연결됩니다.');this.status.setAttribute('role','status');panel.append(this.status);
  this.auto=make('input');this.auto.type='checkbox';const autoLabel=make('label','액션에 맞는 소품 자동 장착');autoLabel.prepend(this.auto);panel.append(autoLabel);this.auto.onchange=()=>{editor.state.autoMotionProps=this.auto.checked;editor.queueLive();};
  this.side=make('select');this.side.setAttribute('aria-label','소품 장착 손');this.side.add(new Option('오른손','right'));this.side.add(new Option('왼손','left'));panel.append(this.side);this.selectedSide='right';this.side.onchange=()=>{const p=editor.state.people[editor.index],item=moveHeldProp(p,this.selectedSide,this.side.value);this.selectedSide=this.side.value;this.equipmentChanged();const entry=this.entries.find(e=>e.id===item?.id);this.status.textContent=entry?propLabel(entry)+' · '+(this.side.value==='left'?'왼손':'오른손'):'손 소품 없음';};
  this.handLinks=[panel,document.getElementById('personSelect').parentElement].map(parent=>{const button=btn('양손 소품 연결 해제',()=>{const p=editor.state.people[editor.index];if(!p)return;p.propHandsLinked=p.propHandsLinked===false;this.equipmentChanged();editor.updatePerson({pose:true});this.status.textContent=p.propHandsLinked?'양손을 총 손잡이에 연결했습니다.':'보조 손을 자유롭게 조정합니다. 소품을 든 손은 유지됩니다.';});button.title='기본: 양손으로 총 잡기. 해제하면 보조 손을 자유롭게 편집합니다.';if(parent===panel)parent.append(button);else parent.after(button);return button;});
  this.fields=[];for(const [key,label,step]of [['offset','손잡이 위치 · m',.01],['rotation','손잡이 회전 · °',5]]){
   const group=make('fieldset'),title=make('legend',label);group.append(title);const row=make('div');row.className='prop-vector';
   for(let i=0;i<3;i++){const input=make('input');input.type='number';input.step=step;input.setAttribute('aria-label',label+' '+['X','Y','Z'][i]);input.onchange=()=>this.edit(key,i,Number(input.value)||0);this.fields.push({input,key,i});row.append(input);}group.append(row);panel.append(group);
  }
  this.detachButton=btn('상호작용 해제 · 장면에 놓기',()=>this.detach());panel.append(this.detachButton);panel.append(btn('선택 소품을 손에 다시 연결',()=>this.reattach()));
  panel.append(btn('손 소품 해제',()=>{const p=editor.state.people[editor.index];if(p?.equipment)delete p.equipment[this.side.value];this.equipmentChanged();}));
  const pop=this.popup=make('section');pop.id='propLibrary';pop.className='prop-library';pop.hidden=true;pop.setAttribute('role','dialog');pop.setAttribute('aria-label','소품 라이브러리');document.getElementById('sceneView').append(pop);
  const header=make('header');header.append(make('b','소품 라이브러리'),btn('닫기',()=>this.close()));pop.append(header);
  this.search=make('input');this.search.type='search';this.search.placeholder='소품 이름 검색';this.search.setAttribute('aria-label','소품 검색');this.filter=make('select');this.filter.setAttribute('aria-label','소품 종류');this.filter.add(new Option('모든 소품',''));for(const [id,name]of Object.entries(names))this.filter.add(new Option(name,id));pop.append(this.search,this.filter);
  this.message=make('p');this.message.setAttribute('role','status');pop.append(this.message);this.grid=make('div');this.grid.className='prop-library-grid';pop.append(this.grid);this.search.oninput=this.filter.onchange=()=>this.cards();
  const scroll=make('div');scroll.className='library-scroll';scroll.append(...[...pop.children].filter(n=>n!==header));pop.append(scroll);this.window=libraryWindow(pop,'소품');
  this.choice=make('div');this.choice.className='prop-choice';this.choice.hidden=true;this.choice.setAttribute('role','dialog');this.choice.setAttribute('aria-label','소품 적용 방법');pop.append(this.choice);
  pop.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!this.choice.hidden)this.closeChoice();else this.close();}});
  const css=make('link');css.rel='stylesheet';css.href=new URL('./prop-library.css?v=20261029-grip3',import.meta.url).href;document.head.append(css);this.catalog().catch(()=>{this.count.textContent='목록 확인';});
 }
 async catalog(){if(this.entries.length)return this.entries;if(!this.catalogPending)this.catalogPending=(async()=>{this.entries=(await libraryCatalog('prop')).entries;this.count.textContent=`${pickerProps(this.entries).length}개`;this.filter.replaceChildren(new Option('모든 소품',''));for(const category of new Set(pickerProps(this.entries).map(e=>e.category)))this.filter.add(new Option(names[category]||category,category));return this.entries;})().finally(()=>{this.catalogPending=null;});return this.catalogPending;}
 async source(id){await this.catalog();const entry=this.entries.find(e=>e.id===id);if(!entry)throw Error('소품 파일을 찾지 못했습니다.');if(!this.cache.has(id))this.cache.set(id,new GLTFLoader().loadAsync(entry.url).then(g=>g.scene).catch(e=>{this.cache.delete(id);throw e;}));return this.cache.get(id);}
 async open(){this.e.fly?.finish(true);this.e.movement.library.close({focus:false});this.popup.hidden=false;this.window.fit();this.launch.setAttribute('aria-expanded','true');this.message.textContent='소품 불러오는 중…';this.search.focus();try{await this.catalog();if(this.popup.hidden)return;this.cards();}catch(e){this.message.textContent=e.message;}}
 close({focus=true}={}){const visible=!this.popup.hidden;this.window.finish();this.closeChoice(false);this.popup.hidden=true;this.launch.setAttribute('aria-expanded','false');if(focus&&visible)this.launch.focus({preventScroll:true});}
 cards(){this.closeChoice(false);this.grid.replaceChildren();const none=btn('',()=>this.clearHands()),symbol=make('span','∅');none.className='prop-card prop-none';none.setAttribute('aria-label','없음 · 양손 소품 해제');symbol.setAttribute('aria-hidden','true');none.append(symbol,make('b','없음'));this.grid.append(none);const available=pickerProps(this.entries),matches=available.filter(e=>(!this.filter.value||e.category===this.filter.value)&&[propLabel(e),e.name,e.category,names[e.category],['Rifle','Pistol','SMG','Shotgun','Sniper','LMG'].includes(e.category)?'총':''].join(' ').toLowerCase().includes(this.search.value.trim().toLowerCase()));this.message.textContent=`${matches.length} / ${available.length}개 · 총기 5종 · 소품을 눌러 적용`;if(!matches.length){const empty=make('p','조건에 맞는 소품이 없습니다. 검색어나 종류를 바꿔보세요.');empty.className='library-empty';this.grid.append(empty);}for(const entry of matches){const card=btn('',()=>this.choose(entry,card)),image=make('img');card.className='prop-card';card.setAttribute('aria-label',propLabel(entry)+' 소품 선택');card.title=propLabel(entry)+' · '+(names[entry.category]||entry.category);image.src=entry.thumbnail;image.alt='';image.loading='lazy';card.append(image,make('b',propLabel(entry)));this.grid.append(card);}}
 choose(entry,trigger){
  if(gunCategories.has(entry.category)){this.closeChoice(false);this.equip(entry,'right');return;}
  this.choiceTrigger=trigger;const sheet=make('div'),image=make('img'),actions=make('div'),message=make('p');sheet.className='prop-choice-sheet';image.src=entry.thumbnail;image.alt='';message.setAttribute('role','status');sheet.append(image,make('b',propLabel(entry)),message,actions);const controls=[];
  for(const [label,side]of [['오른손','right'],['왼손','left']]){const b=btn(label,async()=>{controls.forEach(c=>c.disabled=true);message.textContent='소품 준비 중…';const ok=await this.equip(entry,side);if(!this.choice.hidden&&this.choiceTrigger===trigger){if(ok)this.closeChoice();else{message.textContent=this.status.textContent;controls.forEach(c=>c.disabled=false);}}});controls.push(b);actions.append(b);}
  sheet.append(btn('뒤로',()=>this.closeChoice()));this.choice.replaceChildren(sheet);this.choice.hidden=false;this.popup.querySelector('.library-scroll').inert=true;controls[0].focus({preventScroll:true});
 }
 closeChoice(focus=true){if(!this.choice)return;this.choice.hidden=true;this.popup.querySelector('.library-scroll').inert=false;if(focus&&this.choiceTrigger?.isConnected)this.choiceTrigger.focus({preventScroll:true});this.choiceTrigger=null;}
 async equip(entry,side,valid=()=>true){
  try{
   const p=this.e.state.people[this.e.index];if(!p)throw Error('먼저 인물을 추가하세요.');
   const gun=gunCategories.has(entry.category);await this.source(entry.id);
   if(p!==this.e.state.people[this.e.index]||!valid())return false;
   if(gun){
    side='right';const library=this.e.movement?.library;if(library)library.playRequest=(library.playRequest||0)+1;
    this.e.movement?.stop({flush:false});
    const held=p.equipment?.right?.id===entry.id?p.equipment.right:p.equipment?.left?.id===entry.id?p.equipment.left:null;
    p.equipment={};if(held)p.equipment.right={...held,offset:[0,0,0],rotation:[0,0,0]};
    for(const key of ['targets','motionPose','joints','jointLocks','hands','fingers','handPose'])delete p[key];
    p.pose='stand';p.handMode='auto';p.propHandsLinked=true;
   }
   equipProp(p,entry.id,side);this.side.value=this.selectedSide=side;
   if(gun)this.e.updatePerson({pose:true});this.equipmentChanged();
   this.status.textContent=propLabel(entry)+(gun?' · 기본 파지 자세':side==='left'?' · 왼손':' · 오른손');return true;
  }catch(e){this.status.textContent=e.message;return false;}
 }

 equipmentChanged(){this.e.movement?.library.live.cancel();if(this.e.movement?.motion?.seated?.live)this.e.movement.motion.stand();this.syncFields();this.update();this.e.queueLive();this.e.invalidate();}
 clearHands(){const p=this.e.state.people[this.e.index];if(!p){this.message.textContent='먼저 인물을 선택하세요.';return;}p.equipment={};if(p.phone)p.phone.hand='';this.equipmentChanged();this.message.textContent='양손 소품을 해제했습니다.';this.status.textContent='손 소품 없음';}
 async prepareMotion(entry){
  if(this.e.state.autoMotionProps===false||!motionEquipment(entry))return ()=>{};
  const p=this.e.state.people[this.e.index];await this.catalog();
  const equipment=equipmentForMotion(p,entry,this.entries);await Promise.all(Object.values(equipment).map(item=>this.source(item.id)));
  return ()=>{if(p!==this.e.state.people[this.e.index]||this.e.state.autoMotionProps===false)return;
   p.equipment=equipmentForMotion(p,entry,this.entries);for(const side of Object.keys(p.equipment))if(p.phone?.hand===side)p.phone.hand='';
   this.update();this.syncFields();this.e.queueLive();
  };
 }
 async forMotion(entry){try{(await this.prepareMotion(entry))();}catch(error){this.status.textContent=error.message;throw error;}}
 edit(key,i,value){const item=this.e.state.people[this.e.index]?.equipment?.[this.side.value];if(!item)return;item[key]??=[0,0,0];item[key][i]=T.MathUtils.clamp(value,key==='offset'?-1:-360,key==='offset'?1:360);this.e.queueLive();}
 syncFields(){const p=this.e.state?.people[this.e.index];normalizeFirearmHands(p);this.side.hidden=Object.values(p?.equipment||{}).some(item=>this.entries.some(e=>e.id===item.id&&gunCategories.has(e.category)));if(this.side.hidden)this.side.value='right';const item=p?.equipment?.[this.side.value];this.detachButton.disabled=!item;this.selectedSide=this.side.value;this.auto.checked=this.e.state?.autoMotionProps!==false;for(const button of this.handLinks){button.disabled=!Object.values(p?.equipment||{}).some(item=>this.entries.some(e=>e.id===item.id&&gunCategories.has(e.category)));button.textContent=p?.propHandsLinked===false?'양손 소품 다시 연결':'양손 소품 연결 해제';button.setAttribute('aria-pressed',String(p?.propHandsLinked!==false));}for(const {input,key,i}of this.fields){input.disabled=!item;input.value=item?.[key]?.[i]||0;}}
 async reattach(){
  const e=this.e,items=selectedProps(this.items,e.gizmo.objectTarget);if(items.length!==1){this.status.textContent='장면의 소품 하나를 선택한 뒤 다시 연결하세요.';return;}
  if(!e.state.people[e.index]){this.status.textContent='먼저 인물을 선택하세요.';return;}
  const entry=this.entries.find(entry=>entry.id===items[0].data.asset);if(!entry)return;
  const target=e.gizmo.objectTarget,side=this.side.value,g=e.gizmo;
  const valid=()=>g.objectTarget===target&&this.side.value===side&&this.items.includes(items[0])&&!e.loading&&!g.transform.dragging&&!g.keyboard?.active&&!g.directDragging&&!g.quickDragging;
  if(!valid())return;
  const ok=await this.equip(entry,side,valid);if(ok)this.removeSelected();
  if(ok)this.status.textContent=propLabel(entry)+' · 손에 다시 연결했습니다.';
 }
 async detach(){
  const e=this.e,p=e.state.people[e.index],side=this.side.value,setting=p?.equipment?.[side],held=this.held.get(e.figures.children[e.index])?.get(side);if(!setting||!held?.root)return;
  try{const source=await this.source(setting.id);if(p!==e.state.people[e.index]||p.equipment?.[side]!==setting)return;
   e.flush();held.root.updateWorldMatrix(true,false);e.environment.updateWorldMatrix(true,false);
   const matrix=e.environment.matrixWorld.clone().invert().multiply(held.root.matrixWorld),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();matrix.decompose(position,quaternion,scale);
   const data={id:crypto.randomUUID(),asset:setting.id,position:position.toArray(),quaternion:quaternion.toArray(),scale:scale.toArray(),gripNormalized:true,meleeGripVersion:1,gripSide:side,interactionDetached:true};
   (e.state.props??=[]).push(data);delete p.equipment[side];const item=this.instance(source,data);e.environment.add(item.root);this.items.push(item);this.equipmentChanged();e.advanced.environmentReady();e.gizmo.selectObject(item.root.children[0]||item.root);e.queueLive();this.status.textContent='상호작용 해제 · 현재 위치에 소품을 놓았습니다.';
  }catch(error){this.status.textContent=error.message;}
 }
 instance(source,data){let root=data.gripNormalized?normalizeGun(instantiateBackground(source),data.asset):instantiateBackground(source);if(data.meleeGripVersion)root=normalizeMeleeProp(root,data.asset,data.gripSide);root.name=this.entries.find(e=>e.id===data.asset)?.name||'소품';root.position.fromArray(data.position);if(data.quaternion)root.quaternion.fromArray(data.quaternion);if(data.scale)root.scale.fromArray(data.scale);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return {root,data};}
 async build(){
  const state=this.e.state,token=this.e.rebuildToken;this.items=[];await this.catalog();if(this.e.state!==state||token!==this.e.rebuildToken)return;
  for(const data of state.props||[]){try{const source=await this.source(data.asset);if(this.e.state!==state||token!==this.e.rebuildToken)return;const item=this.instance(source,data);this.items.push(item);this.e.environment.add(item.root);}catch(error){this.status.textContent=error.message;}}
  // Resolve legacy loose copies only after collecting their mesh indices, so
  // layer/visibility overrides of the remaining scene objects keep their owners.
  reconnectLegacyProps(state,this.entries);for(const person of state.people||[])normalizeFirearmHands(person);
  const removedItems=this.items.filter(item=>!state.props.includes(item.data));if(!removedItems.length)return;
  const removed=new Set(),meshes=[];for(const item of removedItems)item.root.traverse(o=>{if(o.isMesh)removed.add(o);});
  this.e.environment.traverse(o=>{if(o.isMesh&&!o.userData.contiEdge)meshes.push(o);});
  if(state.look){remapRemovedMeshes(state.look,meshes,removed,state.asset);for(const item of removedItems)if(state.look.objectGroups)delete state.look.objectGroups[item.data.id];}
  for(const item of removedItems){item.root.removeFromParent();releaseObjects(item.root);}
  this.items=this.items.filter(item=>state.props.includes(item.data));
 }
 update(){
  const figures=this.e.figures.children;for(const person of this.e.state?.people||[])normalizeFirearmHands(person);
  for(const [figure,slots]of this.held){if(!figures.includes(figure)){this.held.delete(figure);continue;}for(const [side,item]of slots){if(this.e.state.people[figure.userData.person]?.equipment?.[side]?.id!==item.id){if(item.root){releaseObjects(item.root);item.root.removeFromParent();}slots.delete(side);}}}
  for(let i=0;i<figures.length;i++){const figure=figures[i],person=this.e.state?.people[i];if(!person?.equipment)continue;const motion=this.e.movement?.motion?.person===person?this.e.movement.motion:null;applyGunCarry(figure,person,motion);applyEquipmentGrip(figure,person);let slots=this.held.get(figure);if(!slots){slots=new Map();this.held.set(figure,slots);}
   for(const [side,setting]of Object.entries(person.equipment)){let item=slots.get(side);if(item){if(item.root){placeHeldProp(item.root,figure,side,gripFrame(person,side,item.category),setting);alignShieldForearm(item.root,figure,side,setting);supportGun(figure,person,item.root,side,item.category,{ready:useGunReadyPose(person,motion)});}continue;}
    const pending={id:setting.id};slots.set(side,pending);
    this.source(setting.id).then(source=>{if(slots.get(side)!==pending||!this.e.figures.children.includes(figure)||person.equipment?.[side]?.id!==setting.id)return;const entry=this.entries.find(e=>e.id===setting.id),frame=gripFrame(person,side,entry.category);if(!frame)throw Error('이 인물의 손 뼈를 찾지 못했습니다.');if(gunCategories.has(entry.category))loadGunCarry().then(()=>this.e.invalidate()).catch(error=>{this.status.textContent=error.message;});const root=normalizeMeleeProp(normalizeGun(instantiateBackground(source),setting.id),setting.id,side);figure.add(root);root.traverse(o=>{if(o.isMesh)o.castShadow=true;});item={id:setting.id,root,frame,category:entry.category};slots.set(side,item);placeHeldProp(root,figure,side,item.frame,setting);alignShieldForearm(root,figure,side,setting);this.e.queueLive();}).catch(error=>{this.status.textContent=error.message;});
   }
   if(Object.values(person.equipment).some(item=>this.entries.some(e=>e.id===item.id&&gunCategories.has(e.category))))updateFigureLandmarks(figure);
  }
 }
}
