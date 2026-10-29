import {motionLabel} from './motion-labels.js?v=20261029-equipment4';
import {comboTiming} from './pose-combo-timing.js?v=20261029-delete1';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,label,fn)=>{const b=el('button',text);b.type='button';b.setAttribute('aria-label',label);b.onclick=fn;return b;};
export class PoseComboTimeline{
 constructor(library){
  this.l=library;this.selected=0;this.section=library.panel.querySelector('.pose-combo');
  this.view=el('div',null,'combo-order-scroll');this.view.setAttribute('aria-label','콤보 동작 순서');
  this.detail=el('div',null,'combo-clip-detail');library.list.replaceWith(this.view,this.detail);
  this.readout=el('output','0 / 0초');this.section.querySelector('[data-time]').parentElement.prepend(this.readout);
  this.view.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';};
  this.view.ondrop=e=>{e.preventDefault();const target=e.target.closest('[data-clip]'),index=target?+target.dataset.clip:library.rows().length;this.drop(e.dataTransfer,index);};
 }
 changed(){this.l.live.cancel();if(this.playback)this.playback.paused=true;this.playback=null;this.render();this.l.e.queueLive();}
 move(from,to){const rows=this.l.rows();if(from<0||from>=rows.length||to<0||to>=rows.length||from===to)return;rows.splice(to,0,rows.splice(from,1)[0]);this.selected=to;this.changed();}
 drop(data,index){
  const from=data.getData('application/x-scroll-combo');
  if(from!==''){if(/^\d+$/.test(from))this.move(+from,Math.min(index,this.l.rows().length-1));return;}

 }
 render(){
  const l=this.l,rows=l.rows(),entries=rows.map(r=>l.store.entries.find(e=>e.id===r.id));
  this.timing=comboTiming(rows.map((r,i)=>({...r,duration:entries[i]?.duration??r.end})));
  this.section.querySelector('summary').textContent=`동작 콤보 · ${rows.length}개`;
  const scroll=this.view.scrollLeft;this.view.replaceChildren();this.detail.replaceChildren();
  if(!rows.length){this.view.append(el('p','포즈의 ＋를 누르면 여기에 순서대로 쌓입니다.','combo-empty'));this.update(0);return;}
  this.selected=Math.max(0,Math.min(this.selected,rows.length-1));
  const {segments,duration}=this.timing;
  const track=this.track=el('div',null,'combo-order-track');this.view.append(track);
  rows.forEach((row,i)=>{
   const segment=segments[i],entry=entries[i],strip=button('',`${i+1}. ${motionLabel(entry||row)} 동작 선택`,()=>{this.selected=i;this.render();this.seek((segment.at+segment.length*.5)/duration);});
   strip.className='combo-order-card';strip.dataset.clip=String(i);strip.setAttribute('aria-pressed',String(i===this.selected));strip.draggable=true;strip.ondragstart=e=>e.dataTransfer.setData('application/x-scroll-combo',String(i));strip.title=motionLabel(entry||row)+' · 드래그로 순서 변경';
   const img=el('img');img.alt='';img.draggable=false;const src=entry?.thumbnail||l.images.get(row.id);if(src)img.src=src;else if(entry)l.thumbQueue.push({entry,img,token:l.cardsToken});
   strip.append(el('span',String(i+1),'combo-order-number'),img,el('b',motionLabel(entry||row)));
   track.append(strip);
  });
  this.view.scrollLeft=scroll;
  const row=rows[this.selected],entry=entries[this.selected],heading=el('div',null,'pose-combo-heading');heading.append(el('b',`${this.selected+1}. ${motionLabel(entry||row)}`));
  const prev=button('←','선택 동작 앞으로',()=>this.move(this.selected,this.selected-1)),next=button('→','선택 동작 뒤로',()=>this.move(this.selected,this.selected+1));prev.disabled=this.selected===0;next.disabled=this.selected===rows.length-1;
  heading.append(prev,next,button('×','선택 동작 콤보에서 제거',()=>{rows.splice(this.selected,1);this.changed();}));this.detail.append(heading);
  const values=el('div',null,'pose-combo-values');
  for(const [key,label,min,max,step]of [['start','시작(초)',0,entry?.duration??180,1/30],['end','끝(초)',.001,entry?.duration??180,1/30],['speed','속도',.25,3,.05],['blend','연결(초)',0,2,.05]]){
   const field=el('label',label),input=el('input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=Number(row[key].toFixed(3));input.setAttribute('aria-label',`선택 동작 ${label}`);
   input.onchange=()=>{let value=Number(input.value);if(!Number.isFinite(value)){input.value=row[key];return;}value=Math.max(min,Math.min(max,value));if(key==='start')value=Math.min(value,row.end-.001);if(key==='end')value=Math.max(value,row.start+.001);row[key]=value;this.changed();};field.append(input);values.append(field);
  }
  const advanced=el('details',null,'combo-timing-options');advanced.append(el('summary','세부 시간 · 속도'),values);this.detail.append(advanced);this.update();l.renderThumbnails();
 }
 async seek(progress){
  this.pendingProgress=progress;this.update(progress);if(this.seeking)return;
  const l=this.l,signature=JSON.stringify(l.rows());this.seeking=true;
  try{
   if(this.playback!==l.m.motion?.seated||this.playbackSignature!==signature)await l.play();
   if(this.playback===l.m.motion?.seated&&this.playbackSignature===JSON.stringify(l.rows())){this.playback.seek(this.pendingProgress);l.panel.querySelector('[data-time]').value=Math.round(this.pendingProgress*1000);l.e.invalidate();}
  }finally{this.seeking=false;this.update(this.pendingProgress);}
 }
 update(progress){
  if(this.l.panel.hidden)return;
  if(progress===undefined)progress=this.playback===this.l.m.motion?.seated?this.playback?.progress:0;
  const time=(progress||0)*(this.timing?.duration||0),frame=Math.round(time*30);
  this.view.querySelectorAll('[data-clip]').forEach((card,i)=>card.classList.toggle('playing',this.playback===this.l.m.motion?.seated&&time>=this.timing.segments[i].at&&time<this.timing.segments[i].at+this.timing.segments[i].length));
  const text=`${time.toFixed(1)} / ${(this.timing?.duration||0).toFixed(1)}초`;
  if(this.readout.textContent!==text)this.readout.textContent=text;
 }
}
