import {LiveComboMotion} from './live-combo-motion.js?v=20261029-anchor1';
import {equippedWeapon,weaponCombo} from './equipment-motion.js?v=20261029-equipment4';
import {motionLabel} from './motion-labels.js?v=20261029-equipment4';

export class SceneLiveCombo{
 constructor(library){
  this.library=library;this.m=library.m;this.e=library.e;this.version=0;this.pending=0;
  const section=this.section=document.createElement('section');section.className='live-combo-controls';
  section.innerHTML='<div><b>연속 공격</b><kbd>Q</kbd></div><button type="button" data-next>Q · 다음 공격 추가</button><button type="button" data-default>장착 무기에 맞는 콤보</button><p role="status">Q를 짧게 누를 때마다 다음 공격 예약 · 최대 3개<br>현재 무기에 맞춰 동작 선택 · Esc로 자세 고정</p>';
  this.m.panel.prepend(section);this.status=section.querySelector('[role=status]');section.querySelector('[data-next]').onclick=()=>this.press();section.querySelector('[data-default]').onclick=()=>this.prepare({defaults:true});
 }
 say(text){this.status.textContent=text;}
 cancel(){this.version++;this.pending=0;this.preparing=null;this.prepared=null;this.say('Q를 짧게 누르면 다음 공격 예약 · 최대 3개 · Esc로 자세 고정');}
 weapon(){return equippedWeapon(this.e.state.people[this.e.index],this.e.props?.entries||[]);}
 signature(){return JSON.stringify([this.library.rows(),this.weapon()]);}
 async prepare({defaults=false}={}){
  if(this.preparing)return this.preparing;
  const token=this.version,person=this.e.state.people[this.e.index],equipment=JSON.stringify(person?.equipment),valid=()=>token===this.version&&person===this.e.state.people[this.e.index]&&equipment===JSON.stringify(person?.equipment)&&this.e.isOpen;
  this.prepared=null;this.say('Q 콤보 준비 중…');
  const task=(async()=>{
   await Promise.all([this.library.refreshCatalog(),this.e.props?.catalog()]);if(!valid())return;
   const rows=weaponCombo(this.library.store.entries,this.library.rows(),this.weapon(),{defaults});
   if(!rows.length)throw Error('현재 무기에 맞는 공격 모션이 없습니다. 포즈집에서 동작을 추가하세요.');
   this.m.settings().libraryCombo=rows;this.library.renderCombo();this.e.queueLive();
   const signature=this.signature(),items=[];
   for(const row of rows){const entry=this.library.store.entries.find(e=>e.id===row.id);if(!entry)throw Error('동작을 찾을 수 없습니다: '+motionLabel(row));if(row.end<=row.start)throw Error('동작의 끝은 시작보다 뒤여야 합니다.');items.push({...row,name:motionLabel(entry),clip:await this.library.store.clip(entry)});if(!valid())return;}
   if(!valid()||signature!==this.signature())return;
   this.prepared={signature,items};this.say(`${items.length}개 동작 준비 · Q로 다음 공격 · 최대 3개 예약`);this.drain();
  })().catch(error=>{if(valid()){this.pending=0;this.say(error.message);}}).finally(()=>{if(this.preparing===task)this.preparing=null;});
  this.preparing=task;return task;
 }
 press(){
  if(!this.e.state.people[this.e.index]){this.say('먼저 인물을 선택하세요.');return;}
  if(!this.m.engaged)this.m.start();
  this.pending=Math.min(3,this.pending+1);this.e.renderer.domElement.focus({preventScroll:true});
  if(this.prepared?.signature===this.signature())this.drain();else this.prepare();
 }
 drain(){
  if(!this.pending||!this.m.active||this.prepared?.signature!==this.signature())return;
  const motion=this.m.motion;
  if(!(motion.seated instanceof LiveComboMotion)||motion.seated.signature!==this.prepared.signature){
   motion.seated?.release?.();motion.sequence=null;motion.seated=new LiveComboMotion(motion,this.prepared.items);motion.seated.signature=this.prepared.signature;
  }
  while(this.pending){motion.seated.enqueue();this.pending--;}
  motion.seated.render();this.e.invalidate();this.updateStatus();
 }
 updateStatus(){const live=this.m.motion?.seated;if(live?.live){const label=`${live.hits}타 · ${live.current?.name||'준비'} · 다음 ${live.queue.length}개${live.finished?' · Q로 이어가기':''}`;if(this.status.textContent!==label)this.say(label);}}
 update(){this.drain();this.updateStatus();}
}
