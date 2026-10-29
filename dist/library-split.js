// Resizes the tools/list split without changing the dock or thumbnail width.
export function librarySplit(page, upper, body) {
 const bar=document.createElement('div'),key='scroll-pose-list-split';
 bar.className='pose-list-split';bar.tabIndex=0;bar.setAttribute('role','separator');
 bar.setAttribute('aria-label','포즈 목록 높이 조절');bar.setAttribute('aria-orientation','horizontal');
 body.id='poseLibraryResults';bar.setAttribute('aria-controls',body.id);
 bar.title='위아래로 드래그 · 방향키로 조절 · 더블클릭으로 초기화';upper.after(bar);
 let ratio=null,drag=null;try{const saved=Number(localStorage.getItem(key));if(saved>0&&saved<1)ratio=saved;}catch{}
 const apply=()=>{
  if(!page.clientHeight)return;
  const total=upper.getBoundingClientRect().height+body.getBoundingClientRect().height;
  const min=Math.min(64,total*.25),max=Math.max(min,total-120);
  if(ratio!==null){upper.style.maxHeight='none';upper.style.flex=`0 0 ${Math.max(min,Math.min(max,total*ratio))}px`;}
  const height=upper.getBoundingClientRect().height;
  for(const [name,value]of [['min',Math.round(min)],['max',Math.round(max)],['now',Math.round(height)]])bar.setAttribute('aria-value'+name,String(value));
 };
 const set=height=>{const total=upper.getBoundingClientRect().height+body.getBoundingClientRect().height;ratio=Math.max(.05,Math.min(.95,height/Math.max(1,total)));apply();};
 const save=()=>{try{if(ratio===null)localStorage.removeItem(key);else localStorage.setItem(key,String(ratio));}catch{}};
 const finish=()=>{if(!drag)return;const id=drag.id;drag=null;bar.classList.remove('dragging');if(bar.hasPointerCapture(id))bar.releasePointerCapture(id);save();};
 bar.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();bar.focus();drag={id:e.pointerId,y:e.clientY,height:upper.getBoundingClientRect().height};bar.setPointerCapture(e.pointerId);bar.classList.add('dragging');};
 bar.onpointermove=e=>{if(drag)set(drag.height+e.clientY-drag.y);};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])bar.addEventListener(type,finish);
 bar.ondblclick=()=>{ratio=null;upper.style.flex='';upper.style.maxHeight='';save();apply();};
 bar.onkeydown=e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const height=upper.getBoundingClientRect().height;set(e.key==='Home'?0:e.key==='End'?page.clientHeight:height+(e.key==='ArrowUp'?-24:24));save();};
 new ResizeObserver(apply).observe(page);apply();return {bar,finish};
}
