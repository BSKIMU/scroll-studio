export function addPaletteEdges(el,persist){
 for(const side of ['left','right']){const edge=document.createElement('div');edge.className='palette-edge palette-edge-'+side;edge.tabIndex=0;edge.setAttribute('role','separator');edge.setAttribute('aria-orientation','vertical');edge.setAttribute('aria-label',side==='left'?'패널 왼쪽 크기 조절':'패널 오른쪽 크기 조절');el.append(edge);let drag;
  const change=delta=>{const width=Math.max(220,Math.min(side==='left'?drag.right:innerWidth-drag.left,drag.width+(side==='left'?-delta:delta)));el.style.width=width+'px';if(side==='left')el.style.left=drag.right-width+'px';};
  edge.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const r=el.getBoundingClientRect();drag={x:e.clientX,left:r.left,right:r.right,width:r.width};edge.setPointerCapture(e.pointerId);};
  edge.onpointermove=e=>{if(drag)change(e.clientX-drag.x);};edge.onpointerup=()=>{drag=null;persist();};edge.onpointercancel=()=>{if(drag)change(0);drag=null;persist();};
  edge.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const r=el.getBoundingClientRect();drag={left:r.left,right:r.right,width:r.width};change(e.key==='ArrowLeft'?-10:10);drag=null;persist();};
 }
}
