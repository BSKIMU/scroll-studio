import {createNavigator} from './navigator.js?v=20261025-release1';
import {addPaletteEdges} from './palette-edges.js?v=20261025-release1';
const $=id=>document.getElementById(id),key='scroll-palette-layout-v1';
export function setupPanels(){
 const left=document.querySelector('aside.left'),dock=document.createElement('div');dock.id='paletteDock';dock.setAttribute('aria-label','패널 정렬 목록');left.querySelector('.left-bottom').before(dock);
 const rough=document.createElement('section');rough.id='roughPanel';rough.append($('cutList'));
 const wheelPanel=document.createElement('section');wheelPanel.id='colorWheelPanel';wheelPanel.append($('colorWheelControl'));const colors=document.createElement('section');colors.id='colorPalettePanel';colors.append($('drawingTools').querySelector('.swatches'),$('penColor').closest('label'));
 const pageBrowser=document.createElement('section');pageBrowser.id='pageBrowser';pageBrowser.append($('pageOverview').querySelector('.page-actions'),$('pageThumbnails'));const navigator=createNavigator();
 $('pageOverview').append(pageBrowser);
 const entries=[[navigator,'네비게이터'],[wheelPanel,'컬러 서클'],[colors,'컬러 팔레트'],[$('cutPanel'),'컷 도구'],[$('drawingTools'),'도구 · 브러시'],[$('balloonTools'),'텍스트 · 말풍선'],[$('layerPanel'),'레이어'],[rough,'페이지 러프 · 컷']];
 const workspace=document.querySelector('.workspace'),right=document.createElement('aside');right.id='rightPaletteDock';right.setAttribute('aria-label','오른쪽 팔레트 도크');document.body.append(right);
 const near=document.createElement('aside');near.id='scenePaletteDock';near.className='adjacent-palette-dock';near.setAttribute('aria-label','3D 왼쪽 팔레트 도크');const main=document.querySelector('main');main.append(near);let nearWidth=240;try{nearWidth=+localStorage.getItem('scroll-scene-palette-width')||240;}catch{}
 const snapLine=document.createElement('div');snapLine.id='paletteSnapLine';snapLine.hidden=true;document.body.append(snapLine);
 const rightGrip=document.createElement('div');rightGrip.id='rightPaletteWidthGrip';rightGrip.tabIndex=0;rightGrip.setAttribute('role','separator');rightGrip.setAttribute('aria-label','오른쪽 팔레트 너비');rightGrip.setAttribute('aria-orientation','vertical');right.append(rightGrip);
 let rightWidth=260;try{rightWidth=+localStorage.getItem('scroll-right-palette-width')||260;if(!localStorage.getItem('scroll-dock-sizing-v2')){rightWidth=Math.max(240,rightWidth);localStorage.setItem('scroll-right-palette-width',rightWidth);localStorage.setItem('scroll-dock-sizing-v2','1');}}catch{}
 function layoutRight(){const nearShown=!!near.querySelector('.palette:not(.context-hidden)');near.hidden=!nearShown;const nw=Math.max(160,Math.min(460,nearWidth,main.clientWidth-100));near.style.width=nw+'px';main.style.paddingRight=nearShown?nw+'px':'';const shown=!!right.querySelector('.palette:not(.context-hidden)');right.hidden=!shown;const bounds=workspace.getBoundingClientRect();const cap=Math.max(160,innerWidth-(workspace.classList.contains('dock-open')?840:540));const width=Math.max(160,Math.min(600,cap,rightWidth));right.style.top=bounds.top+'px';right.style.width=width+'px';workspace.style.marginRight=shown&&innerWidth>800?width+'px':'';rightGrip.setAttribute('aria-valuenow',Math.round(width));}
 let widthDrag=null;rightGrip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();widthDrag={x:e.clientX,w:right.getBoundingClientRect().width};rightGrip.setPointerCapture(e.pointerId);};rightGrip.onpointermove=e=>{if(widthDrag){rightWidth=widthDrag.w+widthDrag.x-e.clientX;layoutRight();}};rightGrip.onpointerup=()=>{widthDrag=null;try{localStorage.setItem('scroll-right-palette-width',rightWidth);}catch{}};rightGrip.onpointercancel=()=>{if(widthDrag)rightWidth=widthDrag.w;widthDrag=null;layoutRight();};rightGrip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();rightWidth+=(e.key==='ArrowLeft'?20:-20);layoutRight();try{localStorage.setItem('scroll-right-palette-width',rightWidth);}catch{}};
 const nearGrip=document.createElement('div');nearGrip.className='adjacent-width-grip';nearGrip.tabIndex=0;nearGrip.setAttribute('role','separator');nearGrip.setAttribute('aria-label','3D 옆 패널 너비');nearGrip.setAttribute('aria-orientation','vertical');near.prepend(nearGrip);let nearDrag=null;nearGrip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();nearDrag={x:e.clientX,w:near.offsetWidth};nearGrip.setPointerCapture(e.pointerId);};nearGrip.onpointermove=e=>{if(nearDrag){nearWidth=nearDrag.w+nearDrag.x-e.clientX;layoutRight();}};nearGrip.onpointerup=()=>{nearDrag=null;try{localStorage.setItem('scroll-scene-palette-width',nearWidth);}catch{}};nearGrip.onpointercancel=()=>{if(nearDrag)nearWidth=nearDrag.w;nearDrag=null;layoutRight();};nearGrip.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();nearWidth+=e.key==='ArrowLeft'?20:-20;layoutRight();try{localStorage.setItem('scroll-scene-palette-width',nearWidth);}catch{}}};
 new MutationObserver(layoutRight).observe(workspace,{attributes:true,attributeFilter:['class']});
 const marker=document.createElement('div');marker.id='paletteDrop';marker.setAttribute('aria-hidden','true');
 let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
 function persist(){const data={};for(const [el]of entries){const r=el.getBoundingClientRect();data[el.id]={floating:el.classList.contains('palette-floating'),x:r.x,y:r.y,width:parseFloat(el.style.width)||260,height:parseFloat(el.style.height)||0,dockHeight:Number(el.dataset.dockHeight)||0,opacity:Number(el.style.opacity)||1,collapsed:el.classList.contains('palette-collapsed'),side:el.parentElement===right?'right':el.parentElement===near?'scene-left':'left',order:[...el.parentElement.children].filter(n=>n.classList.contains('palette')).indexOf(el)};}try{localStorage.setItem(key,JSON.stringify(data));}catch{}}
 function dockPanel(el,before=null,target=dock){el.classList.remove('palette-floating');el.style.left=el.style.top=el.style.width=el.style.height='';el.classList.remove('palette-wide');target.insertBefore(el,before);el.hidden=false;layoutRight();persist();}
 function move(el,x,y){el.style.left=Math.max(0,Math.min(innerWidth-Math.min(el.offsetWidth,innerWidth),x))+'px';el.style.top=Math.max(68,Math.min(innerHeight-Math.min(el.offsetHeight,innerHeight-68),y))+'px';}
 for(const [el,title]of entries){el.dataset.panelManaged='true';el.classList.add('palette');el.hidden=false;const body=document.createElement('div');body.className='palette-body';body.append(...el.childNodes);el.append(body);const head=document.createElement('div');head.className='palette-grip';head.innerHTML=`<span class="palette-handle" tabindex="0" title="드래그로 순서 변경 · 밖으로 분리 · Alt+↑/↓로 정렬">⠿ ${title}</span><button class="palette-fold" title="패널 접기 / 펼치기">−</button>`;el.prepend(head);const controls=document.createElement('div');controls.className='palette-settings';controls.hidden=true;controls.innerHTML=`<label>패널 불투명도 <output>100%</output><input type="range" min="35" max="100" value="100" aria-label="${title} 패널 불투명도"></label><button data-order="up">위로</button><button data-order="down">아래로</button>`;head.after(controls);
 const state=saved[el.id]||(['navigatorPanel','layerPanel'].includes(el.id)?{side:'right'}:{});el.style.opacity=Math.max(.35,Math.min(1,state.opacity||1));controls.querySelector('input').value=Math.round(Number(el.style.opacity)*100);controls.querySelector('output').textContent=controls.querySelector('input').value+'%';el.classList.toggle('palette-collapsed',!!state.collapsed);(state.side==='right'?right:state.side==='scene-left'?near:dock).append(el);if(state.dockHeight){el.dataset.dockHeight=String(Math.max(110,state.dockHeight));el.style.setProperty('--dock-height',el.dataset.dockHeight+'px');}
 head.addEventListener('contextmenu',e=>{e.preventDefault();controls.hidden=!controls.hidden;});controls.querySelector('input').oninput=e=>{el.style.opacity=e.target.value/100;controls.querySelector('output').textContent=e.target.value+'%';persist();};const fold=head.querySelector('.palette-fold');const syncFold=()=>{const closed=el.classList.contains('palette-collapsed');fold.textContent=closed?'+':'−';fold.setAttribute('aria-label',title+(closed?' 펼치기':' 최소화'));fold.setAttribute('aria-expanded',String(!closed));if(closed)controls.hidden=true;};fold.onclick=()=>{el.classList.toggle('palette-collapsed');syncFold();persist();};new MutationObserver(syncFold).observe(el,{attributes:true,attributeFilter:['class']});syncFold();controls.querySelector('[data-order=up]').onclick=()=>{const parent=el.parentElement;if(![dock,near,right].includes(parent))dockPanel(el);else if(el.previousElementSibling?.classList.contains('palette'))parent.insertBefore(el,el.previousElementSibling);persist();};controls.querySelector('[data-order=down]').onclick=()=>{const parent=el.parentElement;if(![dock,near,right].includes(parent))dockPanel(el);else if(el.nextElementSibling)parent.insertBefore(el,el.nextElementSibling.nextElementSibling);persist();};
 const resize=document.createElement('button');resize.className='palette-resize';resize.title='드래그해서 크기 조절 · 방향키로 미세 조절';resize.setAttribute('aria-label',title+' 패널 크기 조절');el.append(resize);let resizing=null;
 const floating=()=>el.classList.contains('palette-floating');
 const setSize=(w,h)=>{const r=el.getBoundingClientRect();if(floating()){el.style.width=Math.max(220,Math.min(innerWidth-r.left,w))+'px';el.style.height=Math.max(150,Math.min(innerHeight-r.top,h))+'px';}else{const height=Math.max(110,Math.min(workspace.clientHeight-32,h));el.dataset.dockHeight=String(height);el.style.setProperty('--dock-height',height+'px');if(el.parentElement===right){rightWidth=w;layoutRight();}else if(el.parentElement===near){nearWidth=w;layoutRight();}}};
 const resizeControls=[resize];const leftResize=resize.cloneNode();leftResize.classList.add('palette-resize-left');leftResize.setAttribute('aria-label',title+' 패널 왼쪽 모서리 크기 조절');el.append(leftResize);resizeControls.push(leftResize);const bottomResize=resize.cloneNode();bottomResize.className="palette-resize-bottom";bottomResize.setAttribute("aria-label",title+" 패널 아래쪽 크기 조절");el.append(bottomResize);resizeControls.push(bottomResize);
 for(const control of resizeControls){const leftCorner=control===leftResize;
 control.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const r=el.getBoundingClientRect();resizing={x:e.clientX,y:e.clientY,w:r.width,h:r.height};control.setPointerCapture(e.pointerId);};
 control.onpointermove=e=>{if(resizing)setSize(resizing.w+(control===bottomResize?0:(e.clientX-resizing.x)*(leftCorner?-1:1)),resizing.h+e.clientY-resizing.y);};
 const finish=()=>{resizing=null;persist();try{localStorage.setItem('scroll-right-palette-width',rightWidth);localStorage.setItem('scroll-scene-palette-width',nearWidth);}catch{}};
 control.onpointerup=finish;control.onpointercancel=()=>{if(resizing)setSize(resizing.w,resizing.h);finish();};
 control.onkeydown=e=>{const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(!delta)return;e.preventDefault();const r=el.getBoundingClientRect();setSize(r.width+delta[0]*(leftCorner?-1:1),r.height+delta[1]);finish();};
 }
 addPaletteEdges(el,persist);
 new ResizeObserver(()=>{const r=el.getBoundingClientRect();el.classList.toggle('palette-wide',el.classList.contains('palette-floating')&&r.width>=440&&r.width>r.height*1.25);}).observe(el);
 const handle=head.querySelector('.palette-handle');let drag=null,frame=0;
 function updateDrag(){
  frame=0;if(!drag?.active)return;
  move(el,drag.x-drag.dx,drag.y-drag.dy);
  const lr=dock.getBoundingClientRect();
  const scene=$('sceneDialog'),sr=scene.getBoundingClientRect(),fr=el.getBoundingClientRect(),open=!scene.hidden;
  const closeTo=x=>Math.min(Math.abs(drag.x-x),Math.abs(fr.left-x),Math.abs(fr.right-x))<30;
  const target=drag.x>=lr.left-12&&drag.x<=lr.right+24?dock:open&&closeTo(sr.left)?near:open&&closeTo(sr.right)||drag.x>=innerWidth-(right.hidden?40:right.offsetWidth+12)?right:!near.hidden&&drag.x>near.getBoundingClientRect().left&&drag.x<near.getBoundingClientRect().right?near:null;
  snapLine.hidden=!target;if(target){const edge=target===dock?lr.right:target===near?(open?sr.left:main.getBoundingClientRect().right):(open?sr.right:innerWidth-3);Object.assign(snapLine.style,{left:edge+'px',top:workspace.getBoundingClientRect().top+'px',height:workspace.clientHeight+'px'});}near.classList.toggle('drop-active',target===near);
  dock.classList.toggle('drop-active',target===dock);right.classList.toggle('drop-active',target===right);
  if(target){
   if(target===right)right.hidden=false;if(target===near)near.hidden=false;
   const r=target.getBoundingClientRect(),delta=drag.y<r.top+32?-8:drag.y>r.bottom-32?8:0;
   if(delta)target.scrollTop+=delta;
   const next=[...target.children].filter(n=>n.classList.contains('palette')&&n!==el).find(n=>{const box=n.getBoundingClientRect();return drag.y<box.top+box.height/2;});
   if(marker.parentNode!==target||marker.nextElementSibling!==(next||null))target.insertBefore(marker,next||null);
   if(delta)frame=requestAnimationFrame(updateDrag);
  }else{marker.remove();layoutRight();}
 }
 function finishDrag(cancel=false){
  if(!drag)return;cancelAnimationFrame(frame);frame=0;
  const previous=drag;drag=null;
  if(previous.active){
   if(cancel){
    if([dock,near,right].includes(previous.oldParent))dockPanel(el,previous.oldNext?.parentNode===previous.oldParent?previous.oldNext:null,previous.oldParent);
    else{el.style.width=previous.width;el.style.height=previous.height;move(el,previous.oldX,previous.oldY);}
   }else if([dock,near,right].includes(marker.parentElement))dockPanel(el,marker,marker.parentElement);
   marker.remove();snapLine.hidden=true;near.classList.remove('drop-active','palette-sorting');dock.classList.remove('drop-active','palette-sorting');right.classList.remove('drop-active','palette-sorting');layoutRight();el.classList.remove('palette-dragging');
   for(const [panel]of entries){panel.style.removeProperty('--sort-height');}
   persist();
  }
  if(handle.hasPointerCapture(previous.pointerId))handle.releasePointerCapture(previous.pointerId);
 }
 handle.onpointerdown=e=>{
  if(e.button!==0)return;e.preventDefault();handle.focus({preventScroll:true});const r=el.getBoundingClientRect();
  drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,dx:e.clientX-r.x,dy:e.clientY-r.y,oldParent:el.parentElement,oldNext:el.nextSibling,oldX:r.x,oldY:r.y,width:el.style.width,height:el.style.height,active:false};
  handle.setPointerCapture(e.pointerId);
 };
 handle.onpointermove=e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;drag.x=e.clientX;drag.y=e.clientY;
  if(!drag.active){
   if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5)return;
   const r=el.getBoundingClientRect();
   for(const [panel]of entries)if([dock,near,right].includes(panel.parentElement))panel.style.setProperty('--sort-height',panel.getBoundingClientRect().height+'px');
   dock.classList.add('palette-sorting');near.classList.add('palette-sorting');right.classList.add('palette-sorting');marker.style.height=r.height+'px';
   if([dock,near,right].includes(el.parentElement))el.before(marker);
   el.classList.add('palette-floating','palette-dragging');document.body.append(el);
   el.style.width=r.width+'px';el.style.height=r.height+'px';
   drag.active=true;handle.setPointerCapture(e.pointerId);
  }
  if(!frame)frame=requestAnimationFrame(updateDrag);
 };
 handle.onpointerup=e=>{if(!drag)return;drag.x=e.clientX;drag.y=e.clientY;cancelAnimationFrame(frame);updateDrag();finishDrag();};
 handle.onpointercancel=()=>finishDrag(true);
 handle.onlostpointercapture=()=>finishDrag(true);
 handle.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finishDrag(true);}});
 handle.onkeydown=e=>{if(e.key==='Enter'){el.classList.toggle('palette-collapsed');persist();}if(e.altKey&&e.key==='ArrowUp')controls.querySelector('[data-order=up]').click();if(e.altKey&&e.key==='ArrowDown')controls.querySelector('[data-order=down]').click();};
 if(state.floating){el.classList.add('palette-floating');document.body.append(el);el.style.width=(state.width||260)+'px';el.style.height=Math.min(state.height||600,innerHeight-80)+'px';move(el,state.x||230,state.y||100);}
 }
 for(const target of [dock,near,right])[...target.children].filter(n=>n.classList.contains('palette')).sort((a,b)=>(saved[a.id]?.order??(a.id==='cutPanel'?-1:entries.findIndex(x=>x[0]===a)))-(saved[b.id]?.order??(b.id==='cutPanel'?-1:entries.findIndex(x=>x[0]===b)))).forEach(el=>target.append(el));
 // Migrate the previous default once; subsequent custom docking remains intact.
 try{if(!localStorage.getItem('scroll-navigator-first-v3')){const layers=$('layerPanel');if(navigator.parentElement===right&&layers.parentElement===right){right.insertBefore(navigator,layers);persist();}localStorage.setItem('scroll-navigator-first-v3','1');}}catch{}
 layoutRight();
 const reset=document.createElement('button');reset.id='resetPanels';reset.textContent='▦ 패널 정리';reset.onclick=()=>{for(const [el]of entries){el.classList.remove('palette-collapsed');el.style.opacity='1';el.querySelector('.palette-settings input').value=100;el.querySelector('.palette-settings output').textContent='100%';delete el.dataset.dockHeight;el.style.removeProperty('--dock-height');dockPanel(el,null,['navigatorPanel','layerPanel'].includes(el.id)?right:dock);}persist();};$('drawingToggle').after(reset);
 $('layersToggle').onclick=()=>{$('layerPanel').hidden=false;$('layerPanel').classList.remove('palette-collapsed');$('layerPanel').scrollIntoView({block:'nearest'});};
 document.addEventListener('palette-context-change',layoutRight);new ResizeObserver(layoutRight).observe(workspace);
 window.addEventListener('resize',()=>{layoutRight();for(const [el]of entries)if(el.classList.contains('palette-floating')){const r=el.getBoundingClientRect();move(el,r.x,r.y);}});
 return {showBrush:()=>{$('drawingTools').hidden=false;}};
}
