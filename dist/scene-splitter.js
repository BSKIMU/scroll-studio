// Resize only the live editor layout; camera state and exported framing stay intact.
export function setupSceneSplitter(controls){
 const layout=controls.parentElement,pose=layout.querySelector('.pose-joint-controls'),toolbar=layout.querySelector('.gizmo-toolbar');
 layout.classList.add('resizable-scene');
 const grip=document.createElement('div');grip.id='sceneSettingsGrip';grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','horizontal');grip.setAttribute('aria-label','3D 화면과 설정 높이 조절');grip.setAttribute('aria-controls','sceneView');grip.title='위아래 드래그: 설정 높이 · 더블클릭: 기본 높이 · ↑/↓: 미세 조절';controls.before(grip);
 let preferred=240,drag=null;
 try{const saved=Number(localStorage.getItem('scroll-scene-settings-height'));if(saved>=100)preferred=saved;}catch{}
 function fit(){
  if(!layout.clientHeight)return;
  const top=layout.querySelector('#sceneTopControls');
  const available=layout.clientHeight-(top?top.offsetHeight+14:(toolbar?.offsetHeight||0)+(pose?.offsetHeight||0)+(layout.querySelector('.scene-lens-bar')?.offsetHeight||0))-8;
  const max=Math.max(100,available-120),height=Math.min(max,Math.max(100,preferred));
  layout.style.setProperty('--scene-settings-height',height+'px');
  grip.setAttribute('aria-valuemin','100');grip.setAttribute('aria-valuemax',String(Math.round(max)));grip.setAttribute('aria-valuenow',String(Math.round(height)));
 }
 const persist=()=>{try{localStorage.setItem('scroll-scene-settings-height',String(preferred));}catch{}};
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={id:e.pointerId,y:e.clientY,height:controls.offsetHeight,previous:preferred};grip.setPointerCapture(e.pointerId);document.body.classList.add('resizing-scene-settings');};
 grip.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;preferred=Math.max(100,Math.min(Number(grip.getAttribute('aria-valuemax')),drag.height+drag.y-e.clientY));fit();};
 const end=cancel=>{if(!drag)return;const previous=drag;drag=null;if(cancel){preferred=previous.previous;fit();}else persist();document.body.classList.remove('resizing-scene-settings');if(grip.hasPointerCapture(previous.id))grip.releasePointerCapture(previous.id);};
 grip.onpointerup=()=>end(false);grip.onpointercancel=()=>end(true);grip.onlostpointercapture=()=>end(false);
 grip.ondblclick=()=>{preferred=240;fit();persist();};
 grip.onkeydown=e=>{if(e.key==='Escape'){end(true);return;}if(!['ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();preferred=e.key==='Home'?240:controls.offsetHeight+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?40:10);fit();persist();};
 const observer=new ResizeObserver(fit);for(const el of [layout,toolbar,pose])if(el)observer.observe(el);fit();
 return {fit,observe:el=>observer.observe(el)};
}
