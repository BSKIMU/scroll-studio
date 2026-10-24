const storageKey='scroll-sidebar-story-width';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function setupSidebarWidth(){
 const workspace=document.querySelector('.workspace'),sidebar=workspace.querySelector('.left'),overview=document.getElementById('pageOverview');
 sidebar.id='leftSidebar';
 const grip=document.createElement('div');grip.id='sidebarWidthGrip';grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-label','왼쪽 사이드바 너비 조절');grip.setAttribute('aria-orientation','vertical');grip.setAttribute('aria-controls',sidebar.id);grip.title='좌우 드래그: 너비 조절 · 더블클릭: 기본 너비 · 방향키: 미세 조절';sidebar.append(grip);
 let requested=null,drag=null,frame=0;
 try{const stored=Number(localStorage.getItem(storageKey));if(Number.isFinite(stored)&&stored>=128&&stored<=480)requested=stored;}catch{}
 const defaultWidth=()=>innerWidth<=1200?198:220;
 function maxWidth(){
  if(innerWidth<=800)return Math.min(480,workspace.clientWidth-90);
  const pages=document.body.classList.contains('page-mode'),scene=workspace.classList.contains('dock-open');
  const rail=document.getElementById('toolPalette').getBoundingClientRect().width;
  return Math.max(128,Math.min(480,workspace.clientWidth-rail-(pages?overview.getBoundingClientRect().width:0)-(scene?306:pages?28:274)-240));
 }
 function render(){
  frame=0;const max=maxWidth(),width=Math.round(clamp(requested??defaultWidth(),128,max));
  document.body.style.setProperty('--story-expanded-width',width+'px');
  grip.setAttribute('aria-valuemin','128');grip.setAttribute('aria-valuemax',String(Math.floor(max)));grip.setAttribute('aria-valuenow',String(width));grip.setAttribute('aria-valuetext',width+' 픽셀');
 }
 function persist(){try{requested===null?localStorage.removeItem(storageKey):localStorage.setItem(storageKey,String(requested));}catch{}}
 function finish(cancel=false){
  if(!drag)return;const before=drag;drag=null;
  if(cancel){requested=before.requested;render();}else persist();
  document.body.classList.remove('resizing-sidebar');if(grip.hasPointerCapture(before.id))grip.releasePointerCapture(before.id);
 }
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();grip.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,width:sidebar.getBoundingClientRect().width,requested};grip.setPointerCapture(e.pointerId);document.body.classList.add('resizing-sidebar');};
 grip.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;e.preventDefault();requested=clamp(drag.width+e.clientX-drag.x,128,maxWidth());render();};
 grip.onpointerup=()=>finish();grip.onpointercancel=()=>finish(true);grip.onlostpointercapture=()=>finish(true);
 grip.ondblclick=()=>{finish(true);requested=null;persist();render();};
 grip.onkeydown=e=>{if(e.key==='Escape'&&drag){e.preventDefault();finish(true);return;}if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();requested=e.key==='Home'?128:e.key==='End'?maxWidth():clamp(Number(grip.getAttribute('aria-valuenow'))+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?1:10),128,maxWidth());render();persist();};
 window.addEventListener('blur',()=>finish(true));
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
 new ResizeObserver(schedule).observe(workspace);
 new MutationObserver(schedule).observe(workspace,{attributes:true,attributeFilter:['class','style']});
 new MutationObserver(schedule).observe(overview,{attributes:true,attributeFilter:['hidden','class']});
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
 render();
 setupOverviewWidth(overview,workspace);
}

function setupOverviewWidth(overview,workspace){
 const key='scroll-overview-width',grip=document.createElement('div');grip.id='overviewWidthGrip';grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-label','전체 페이지 너비 조절');grip.setAttribute('aria-orientation','vertical');grip.setAttribute('aria-controls','pageOverview');grip.title='좌우 드래그: 너비 조절 · 더블클릭: 기본 너비 · 방향키: 미세 조절';overview.append(grip);
 let width=112,drag=null;try{width=Number(localStorage.getItem(key))||112;}catch{}
 const maximum=()=>Math.max(96,Math.min(280,workspace.clientWidth*.28));
 const render=()=>{width=clamp(width,96,maximum());document.body.style.setProperty('--overview-expanded-width',Math.round(width)+'px');grip.setAttribute('aria-valuemin','96');grip.setAttribute('aria-valuemax',String(Math.floor(maximum())));grip.setAttribute('aria-valuenow',String(Math.round(width)));};
 const save=()=>{try{localStorage.setItem(key,String(width));}catch{}};
 const finish=(cancel=false)=>{if(!drag)return;const old=drag;drag=null;if(cancel){width=old.width;render();}else save();document.body.classList.remove('resizing-overview');if(grip.hasPointerCapture(old.id))grip.releasePointerCapture(old.id);};
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();drag={id:e.pointerId,x:e.clientX,width};grip.setPointerCapture(e.pointerId);document.body.classList.add('resizing-overview');};
 grip.onpointermove=e=>{if(drag&&e.pointerId===drag.id){width=drag.width+e.clientX-drag.x;render();}};
 grip.onpointerup=()=>finish();grip.onpointercancel=grip.onlostpointercapture=()=>finish(true);
 grip.ondblclick=()=>{finish(true);width=112;render();save();};
 grip.onkeydown=e=>{if(e.key==='Escape'){finish(true);return;}if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();width=e.key==='Home'?96:e.key==='End'?maximum():width+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?1:10);render();save();};
 window.addEventListener('blur',()=>finish(true));new ResizeObserver(render).observe(workspace);render();
}
