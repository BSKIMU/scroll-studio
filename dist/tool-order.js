// One delegated controller handles every tool, including buttons added after startup.
export function setupToolOrder(rail){
 const key='scroll-tool-order-v1',selector=':scope > button[data-tool-order]';
 const buttons=()=>[...rail.querySelectorAll(selector)];
 const anchor=document.createComment('end of tools');buttons().at(-1)?.after(anchor);
 const marker=document.createElement('div');marker.className='tool-insertion-marker';marker.hidden=true;document.body.append(marker);
 Object.assign(marker.style,{position:'fixed',height:'3px',background:'#ff5555',pointerEvents:'none',zIndex:'10000',transition:'top 90ms ease-out'});
 let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||localStorage.getItem('scroll-studio-tool-order-v1')||'[]');}catch{}
 const rank=id=>saved.indexOf(id)<0?999:saved.indexOf(id),known=new WeakSet();
 function prepare(){
  let changed=false;for(const b of buttons())if(!known.has(b)){known.add(b);changed=true;b.draggable=false;b.style.touchAction='none';b.title+=' · 드래그로 순서 변경 / Alt+↑↓';}
  if(changed){const order=buttons().sort((a,b)=>rank(a.dataset.toolOrder)-rank(b.dataset.toolOrder));for(const b of order)anchor.before(b);}
 }
 prepare();new MutationObserver(prepare).observe(rail,{childList:true});
 const save=()=>{saved=buttons().map(b=>b.dataset.toolOrder);try{localStorage.setItem(key,JSON.stringify(saved));}catch{}};
 let drag=null,suppressUntil=0;
 function end(cancel=false){
  const d=drag;if(!d)return;drag=null;marker.hidden=true;d.button.classList.remove('tool-dragging');
  if(d.active){suppressUntil=performance.now()+400;if(!cancel){const before=new Map(buttons().map(b=>[b,b.getBoundingClientRect().top]));(d.next||anchor).before(d.button);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const b of buttons()){const dy=before.get(b)-b.getBoundingClientRect().top;if(dy)b.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:150,easing:'ease-out'});}save();}}
  if(d.button.hasPointerCapture(d.id))d.button.releasePointerCapture(d.id);
 }
 rail.addEventListener('pointerdown',e=>{const button=e.target.closest('button[data-tool-order]');if(e.button!==0||button?.parentElement!==rail||drag)return;drag={button,id:e.pointerId,x:e.clientX,y:e.clientY,active:false,next:null};try{button.setPointerCapture(e.pointerId);}catch{}});
 rail.addEventListener('pointermove',e=>{const d=drag;if(!d||d.id!==e.pointerId)return;if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;d.active=true;e.preventDefault();d.button.classList.add('tool-dragging');const others=buttons().filter(b=>b!==d.button);d.next=others.find(b=>{const r=b.getBoundingClientRect();return e.clientY<r.top+r.height/2;})||null;const r=(d.next||others.at(-1)||d.button).getBoundingClientRect();Object.assign(marker.style,{left:r.left+'px',width:r.width+'px',top:(d.next?r.top:r.bottom)+'px'});marker.hidden=false;});
 rail.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)end();});rail.addEventListener('pointercancel',()=>end(true));rail.addEventListener('lostpointercapture',()=>end(true));
 rail.addEventListener('dragstart',e=>e.preventDefault());
 rail.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 rail.addEventListener('keydown',e=>{if(e.key==='Escape'){end(true);return;}const b=e.target.closest('button[data-tool-order]');if(!b||!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const list=buttons(),i=list.indexOf(b),j=i+(e.key==='ArrowUp'?-1:1);if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];for(const button of list)anchor.before(button);b.focus();save();});
 window.addEventListener('blur',()=>end(true));
}
