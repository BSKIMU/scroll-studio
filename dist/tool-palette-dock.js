// Dock only the tool rail; document and palette state stay in their existing owners.
export function setupToolPaletteDock(palette){
 const workspace=palette.closest('.workspace'),key='scroll-studio-tool-dock-v1';if(!workspace)return;
 const grip=document.createElement('button');grip.className='tool-palette-grip';grip.textContent='⠿';grip.title='드래그해서 이동 · 화면 양끝에 놓으면 도킹 · 더블클릭: 왼쪽 복원';grip.setAttribute('aria-label','도구바 이동');palette.prepend(grip);
 const hint=document.createElement('div');hint.className='tool-dock-hint';hint.hidden=true;workspace.append(hint);
 let state={mode:'left',x:0,y:0},drag=null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(['left','right','float'].includes(saved?.mode))state=saved;}catch{}
 function render(){
  const r=workspace.getBoundingClientRect();state.x=Math.max(0,Math.min(Number(state.x)||0,r.width-40));state.y=Math.max(0,Math.min(Number(state.y)||0,r.height-80));
  workspace.dataset.toolDock=state.mode;palette.style.setProperty('--rail-x',state.x+'px');palette.style.setProperty('--rail-y',state.y+'px');
 }
 function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
 grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const r=palette.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,before:{...state}};grip.setPointerCapture(e.pointerId);});
 grip.addEventListener('pointermove',e=>{if(!drag)return;const r=workspace.getBoundingClientRect();state={mode:'float',x:e.clientX-r.left-drag.dx,y:e.clientY-r.top-drag.dy};drag.snap=e.clientX<r.left+55?'left':e.clientX>r.right-55?'right':null;hint.hidden=!drag.snap;hint.dataset.side=drag.snap||'';render();});
 function finish(cancel){if(!drag)return;state=cancel?drag.before:{...state,mode:drag.snap||state.mode};drag=null;hint.hidden=true;render();save();}
 grip.addEventListener('pointerup',()=>finish(false));grip.addEventListener('pointercancel',()=>finish(true));grip.addEventListener('lostpointercapture',()=>finish(true));grip.addEventListener('dblclick',()=>{state.mode='left';render();save();});
 grip.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.mode=e.key==='ArrowLeft'?'left':'right';render();save();}if(e.key==='Escape')finish(true);});window.addEventListener('resize',render);render();
}
