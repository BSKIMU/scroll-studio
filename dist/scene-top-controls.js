// Resize the controls, not the render camera or its output framing.
export function setupSceneTopControls(editor){
 const view=document.getElementById('sceneView'),layout=view.parentElement,top=document.createElement('div');top.id='sceneTopControls';
 view.before(top);for(const selector of ['.gizmo-toolbar','.pose-joint-controls','.scene-lens-bar']){const item=layout.querySelector(selector);if(item)top.append(item);}
 const grip=document.createElement('div');grip.id='sceneTopGrip';grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-label','상단 3D 조작부 높이');grip.setAttribute('aria-orientation','horizontal');grip.setAttribute('aria-controls',top.id);grip.title='위로 드래그: 조작부 접기 · 아래로: 펼치기 · 더블클릭: 접기/펼치기';
 grip.innerHTML='<span>⋯</span><button type="button" id="toggleSceneTop">조작부 접기</button>';top.after(grip);
 let preferred=180,lastExpanded=180,drag=null;
 try{const saved=localStorage.getItem('scroll-scene-top-height');if(saved!==null&&Number.isFinite(+saved))preferred=Math.max(0,+saved);}catch{}
 const persist=()=>{try{localStorage.setItem('scroll-scene-top-height',String(preferred));}catch{}};
 function fit(){
  const maximum=Math.max(60,Math.min(450,layout.clientHeight-260)),height=Math.min(maximum,preferred);
  top.style.setProperty('--scene-top-height',height+'px');top.style.height=height===0?'0px':'';top.inert=height===0;
  grip.setAttribute('aria-valuemin','0');grip.setAttribute('aria-valuemax',String(Math.round(maximum)));grip.setAttribute('aria-valuenow',String(Math.round(height)));
  grip.querySelector('button').textContent=height?'조작부 접기':'조작부 펼치기';grip.querySelector('button').setAttribute('aria-expanded',String(height>0));editor.splitter?.fit();
 }
 const toggle=()=>{if(preferred>0){lastExpanded=preferred;preferred=0;}else preferred=lastExpanded;fit();persist();};grip.querySelector('button').onclick=toggle;grip.ondblclick=event=>{if(!event.target.closest('button'))toggle();};
 grip.onpointerdown=event=>{if(event.button!==0||event.target.closest('button'))return;event.preventDefault();drag={id:event.pointerId,y:event.clientY,height:top.offsetHeight,previous:preferred};grip.setPointerCapture(event.pointerId);};
 grip.onpointermove=event=>{if(!drag||drag.id!==event.pointerId)return;preferred=Math.max(0,Math.min(+grip.getAttribute('aria-valuemax'),drag.height+event.clientY-drag.y));if(preferred<24)preferred=0;fit();};
 const end=cancel=>{if(!drag)return;const old=drag;drag=null;if(cancel){preferred=old.previous;fit();}else{if(preferred)lastExpanded=preferred;persist();}if(grip.hasPointerCapture(old.id))grip.releasePointerCapture(old.id);};
 grip.onpointerup=()=>end(false);grip.onpointercancel=()=>end(true);grip.onlostpointercapture=()=>end(false);
 grip.onkeydown=event=>{if(event.code==='Escape'){end(true);return;}if(!['ArrowUp','ArrowDown','Home','End'].includes(event.code))return;event.preventDefault();preferred=event.code==='Home'?0:event.code==='End'?180:Math.max(0,preferred+(event.code==='ArrowDown'?10:-10));fit();persist();};
 editor.splitter?.observe(top);new ResizeObserver(fit).observe(layout);fit();
}
