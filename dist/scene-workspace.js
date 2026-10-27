// One editor/renderer and one cut state; only its layout changes.
export function sceneDropMode(x,y,workspace,canvas){
 if(x<workspace.left||x>workspace.right||y<workspace.top||y>workspace.bottom)return null;
 if(x>=workspace.right-Math.min(180,workspace.width*.2))return 'dock';
 return x>=canvas.left&&x<=canvas.right&&y>=canvas.top&&y<=canvas.bottom?'max':null;
}

export function setupSceneWorkspace({ensureOpen,flush,resize,toast}){
 const dock=document.getElementById('sceneDialog'),workspace=document.querySelector('.workspace'),canvas=document.querySelector('main'),head=dock.querySelector('.modal-head');
 const handle=head.querySelector('div');handle.id='sceneDockHandle';handle.title='제목을 원고 위로 드래그: 3D 최대화 · 오른쪽 끝으로 드래그: 도킹';handle.setAttribute('aria-label','3D 패널 이동');handle.tabIndex=0;
 const nav=document.createElement('nav');nav.className='editor-workspaces';nav.setAttribute('aria-label','작업 공간');
 nav.innerHTML='<button type="button" id="canvasWorkspace" aria-pressed="true">캔버스</button><button type="button" id="sceneWorkspace" aria-pressed="false">3D 작업</button>';
 document.querySelector('.command-bar').append(nav);
 const toggle=document.createElement('button');toggle.id='maximizeScene';head.querySelector('.dock-actions').prepend(toggle);
 const overlay=document.createElement('div');overlay.id='sceneDockDrop';overlay.hidden=true;document.body.append(overlay);
 let maximized=false,drag=null,pending=0,hover=false;
 function sync(){
  document.body.classList.toggle('scene-maximized',maximized);
  nav.querySelector('#sceneWorkspace').setAttribute('aria-pressed',String(maximized));nav.querySelector('#canvasWorkspace').setAttribute('aria-pressed',String(!maximized));
  const label=maximized?'오른쪽에 복원':'최대화';toggle.title=label+' · Ctrl + Space';toggle.setAttribute('aria-label',label);toggle.setAttribute('aria-pressed',String(maximized));
  toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(maximized?'<path d="M8 8V4h12v12h-4"/><rect x="4" y="8" width="12" height="12" rx="1"/>':'<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 8h16"/>')+'</svg>';
  dock.style.setProperty('--scene-max-top',workspace.getBoundingClientRect().top+'px');
  requestAnimationFrame(()=>resize());
 }
 function restore(){++pending;if(!maximized)return;flush();maximized=false;sync();}
 async function maximize(){
  if(maximized)return;const token=++pending;
  if(!await ensureOpen()){if(token===pending)toast('3D를 편집할 컷을 먼저 선택해 주세요.');return;}
  if(token!==pending)return;flush();maximized=true;sync();
 }
 toggle.onclick=()=>maximized?restore():maximize();
 nav.querySelector('#canvasWorkspace').onclick=restore;nav.querySelector('#sceneWorkspace').onclick=maximize;
 handle.ondblclick=()=>maximized?restore():maximize();
 dock.addEventListener('pointerenter',()=>hover=true);dock.addEventListener('pointerleave',()=>hover=false);
 function end(cancel=false){
  if(!drag)return;const before=drag;drag=null;overlay.hidden=true;document.body.classList.remove('scene-docking');
  if(handle.hasPointerCapture(before.id))handle.releasePointerCapture(before.id);
  if(!cancel&&before.moved){if(before.mode==='max')maximize();else if(before.mode==='dock')restore();}
 }
 handle.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('button,input,select,a'))return;
  event.preventDefault();flush();handle.focus({preventScroll:true});
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,mode:null};handle.setPointerCapture(event.pointerId);
 });
 handle.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
  drag.moved=true;event.preventDefault();document.body.classList.add('scene-docking');
  const w=(maximized?dock:workspace).getBoundingClientRect(),c=maximized?{left:w.left,right:w.right-180,top:w.top,bottom:w.bottom}:canvas.getBoundingClientRect();
  drag.mode=sceneDropMode(event.clientX,event.clientY,w,c);overlay.hidden=!drag.mode;
  const right=drag.mode==='dock',box=right?{left:w.right-Math.min(360,w.width*.4),top:w.top,width:Math.min(360,w.width*.4),height:w.height}:c;
  Object.assign(overlay.style,{left:box.left+'px',top:box.top+'px',width:(box.width??box.right-box.left)+'px',height:(box.height??box.bottom-box.top)+'px'});
  overlay.textContent=right?'놓으면 오른쪽 도크로 복원':'놓으면 3D 작업창 최대화';
 });
 handle.addEventListener('pointerup',()=>end());handle.addEventListener('pointercancel',()=>end(true));handle.addEventListener('lostpointercapture',()=>end(true));
 document.addEventListener('keydown',event=>{
  if(drag&&event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();end(true);return;}
  if(event.code!=='Space'||!event.ctrlKey||event.altKey||event.metaKey||event.repeat||event.isComposing||event.target.closest('input,textarea,select,[contenteditable=true]')||document.querySelector('dialog[open]'))return;
  if(!(hover||dock.contains(event.target)||nav.contains(event.target)))return;
  event.preventDefault();event.stopImmediatePropagation();maximized?restore():maximize();
 },true);
 window.addEventListener('blur',()=>end(true));window.addEventListener('resize',()=>{if(maximized){dock.style.setProperty('--scene-max-top',workspace.getBoundingClientRect().top+'px');resize();}});
 sync();return {maximize,restore,get maximized(){return maximized;}};
}
