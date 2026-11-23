import {comicFonts} from './comic-font-list.js';
const catalog=new Map(comicFonts.map(font=>['comic-'+font.id,font]));
export function addComicFontOptions(select){
 const groups=new Map();
 for(const [key,font] of catalog){
  if(!groups.has(font.group)){const group=document.createElement('optgroup');group.label=font.group;groups.set(font.group,group);select.append(group);}
  groups.get(font.group).append(new Option(font.localName||font.name,key));
 }
}
export function installFontPreview(select){
 const button=document.createElement('button'),list=document.createElement('div');
 button.type='button';button.className='font-preview-trigger';button.setAttribute('aria-label','글꼴 선택');
 list.id='comicFontPreview';list.popover='auto';button.popoverTargetElement=list;
 select.hidden=true;select.after(button);document.body.append(list);
 function sync(){button.textContent=(select.selectedOptions[0]?.textContent||'글꼴')+' ▾';button.style.fontFamily=balloonFontFamily(select.value);}
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){
  const row=entry.target,pending=loadComicFont(row.dataset.key);
  if(pending)pending.then(()=>{if(!loaded.has(row.dataset.key))row.querySelector('span').textContent='미리보기 불러오기 실패';row.classList.remove('font-loading');});
  observer.unobserve(row);
 }},{root:list});
 function build(){
  observer.disconnect();list.replaceChildren();let group;const nav=document.createElement('nav');nav.setAttribute('aria-label','글꼴 언어');list.append(nav);const headings=new Map();
  for(const option of select.options){
   const name=option.closest('optgroup')?.label||'기본 · 사용자';
   if(name!==group){group=name;const h=document.createElement('strong');h.textContent=name;list.append(h);if(!headings.has(name)){headings.set(name,h);const jump=document.createElement('button');jump.type='button';jump.textContent=name.startsWith('기본')?'기본':name;jump.onclick=()=>{list.scrollTop=h.offsetTop-nav.offsetHeight;};nav.append(jump);}}
   const row=document.createElement('button');row.type='button';row.dataset.key=option.value;if(catalog.has(option.value))row.classList.add('font-loading');row.setAttribute('aria-pressed',String(option.selected));
   const label=document.createElement('small'),sample=document.createElement('span');label.textContent=option.textContent;
   sample.textContent=name==='일본어'?'光と影の物語':name==='영어'?'Once upon a time':'빛과 그림자의 이야기';
   sample.lang=name==='일본어'?'ja':name==='영어'?'en':'ko';sample.style.fontFamily=balloonFontFamily(option.value);
   row.append(label,sample);row.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();list.hidePopover();button.focus();};
   list.append(row);observer.observe(row);
  }
 }
 button.onclick=e=>{e.preventDefault();if(list.matches(':popover-open'))return list.hidePopover();build();list.showPopover();const r=button.getBoundingClientRect();list.style.left=Math.min(r.left,innerWidth-list.offsetWidth-4)+'px';list.style.top=Math.max(4,Math.min(r.bottom+4,innerHeight-list.offsetHeight-4))+'px';list.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});list.querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest'});};
 list.addEventListener('toggle',()=>{if(!list.matches(':popover-open'))observer.disconnect();});
 select.addEventListener('change',sync);select.addEventListener('font-sync',sync);sync();
}
export function loadComicFont(key){
 const font=catalog.get(key);if(!font)return;
 if(!loaded.has(key)){
  const url=new URL('./assets/comic-fonts/'+font.id+'.ttf',import.meta.url);
  loaded.set(key,new FontFace(key,'url("'+url.href+'")').load().then(face=>document.fonts.add(face)).catch(()=>loaded.delete(key)));
 }
 return loaded.get(key);
}
const loaded=new Map();
export const balloonFontFamily=key=>({
 sans:'"Noto Sans KR","Malgun Gothic",sans-serif',
 serif:'"Batang","Noto Serif KR",serif',
 myeongjo:'"Scroll Nanum Myeongjo","Batang",serif',
 round:'"Gulim",sans-serif',mono:'"D2Coding",monospace'
}[key]||(catalog.has(key)?`"${key}",sans-serif`:null)||(/^font-[a-f0-9-]+$/.test(key)?`"${key}",sans-serif`:'sans-serif'));
export async function loadProjectFonts(project){
 for(const cut of project.cuts||[])for(const bubble of cut.bubbles||[])loadComicFont(bubble.family);
 for(const font of project.fonts||[]){
  if(!/^font-[a-f0-9-]+$/.test(font.id)||!/^data:/.test(font.data)||font.data.length>20e6)continue;
  if(!loaded.has(font.id)){
   const face=new FontFace(font.id,`url("${font.data}")`);
   loaded.set(font.id,face.load().then(f=>document.fonts.add(f)).catch(()=>loaded.delete(font.id)));
  }
 }
 await Promise.all([...loaded.values(),document.fonts.load('800 24px "Scroll Nanum Myeongjo"')]);
}
