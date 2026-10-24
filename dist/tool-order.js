export function setupToolOrder(rail){
 const key='scroll-tool-order-v1',buttons=[...rail.querySelectorAll('[data-tool-order]')];
 try{const order=JSON.parse(localStorage.getItem(key)||'[]')?.map(id=>['line','rect','ellipse'].includes(id)?'figure':id);if(Array.isArray(order)){for(const id of [...new Set(order)]){const b=buttons.find(b=>b.dataset.toolOrder===id);if(b)rail.append(b);}for(const b of buttons)if(!order.includes(b.dataset.toolOrder))rail.append(b);}}catch{}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify([...rail.querySelectorAll('[data-tool-order]')].map(b=>b.dataset.toolOrder)));}catch{}};
 let drag=null,suppress=null;
 function end(cancel=false){const d=drag;if(!d)return;drag=null;if(d.active){suppress=d.button;if(!cancel&&d.target){rail.insertBefore(d.button,d.before?d.target:d.target.nextSibling);save();}}buttons.forEach(b=>b.classList.remove('tool-dragging','tool-drop'));if(d.button.hasPointerCapture(d.id))d.button.releasePointerCapture(d.id);}
 for(const b of buttons){
  b.draggable=false;b.style.touchAction='none';b.title+=' · 펜/마우스 드래그로 순서 변경 / Alt+↑↓';
  b.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;suppress=null;drag={button:b,id:e.pointerId,x:e.clientX,y:e.clientY,active:false,target:null,before:false};b.setPointerCapture(e.pointerId);});
  b.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7)return;drag.active=true;e.preventDefault();b.classList.add('tool-dragging');const target=buttons.find(n=>{const r=n.getBoundingClientRect();return n!==b&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});buttons.forEach(n=>n.classList.remove('tool-drop'));drag.target=target;if(target){const r=target.getBoundingClientRect();drag.before=e.clientY<r.top+r.height/2;target.classList.add('tool-drop');}});
  b.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)end();});b.addEventListener('pointercancel',()=>end(true));b.addEventListener('lostpointercapture',()=>end(true));
  b.addEventListener('click',e=>{if(suppress===b){e.preventDefault();e.stopImmediatePropagation();suppress=null;}},true);
  b.addEventListener('keydown',e=>{if(e.key==='Escape'){end(true);return;}if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const other=e.key==='ArrowUp'?b.previousElementSibling:b.nextElementSibling;if(!other?.dataset.toolOrder)return;rail.insertBefore(b,e.key==='ArrowUp'?other:other.nextSibling);b.focus();save();});
 }
 window.addEventListener('blur',()=>end(true));
}
