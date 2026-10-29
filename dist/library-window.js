// Right-anchored library windows keep their scrollbar on the right.
export function libraryWindow(panel,label,{minWidth=180,minHeight=220,width=258,height=720,docked=false}={}){
 if(!document.getElementById('library-window-css')){const css=document.createElement('link');css.id='library-window-css';css.rel='stylesheet';css.href=new URL('./library-window.css?v=20261029-library6',import.meta.url).href;document.head.append(css);}
 panel.classList.add('library-resizable');const view=panel.parentElement,grip=document.createElement('button');grip.type='button';grip.className='library-window-resize';grip.setAttribute('aria-label',label+' 창 왼쪽 아래 크기 조절');grip.title='왼쪽으로 넓히기 · 아래로 높이 늘리기 · 방향키로 미세 조절';panel.append(grip);
 const edge=docked?document.createElement('div'):null;
 if(edge){edge.className='library-window-edge';edge.setAttribute('role','separator');edge.setAttribute('aria-label',label+' 왼쪽 경계 너비 조절');edge.setAttribute('aria-orientation','vertical');edge.tabIndex=0;panel.append(edge);grip.title='왼쪽으로 넓히기 · 오른쪽으로 줄이기 · 방향키로 미세 조절';}
 let drag=null;const key='scroll-library-size-'+panel.id+(docked?'-dock':'');
 function size(w,h){const style=getComputedStyle(panel),maxW=docked?Math.max(160,Math.min(view.clientWidth-198-(document.body.classList.contains('scene-maximized')?Math.min(280,Math.max(210,innerWidth*.24)):0),view.clientWidth*.55)):Math.max(120,view.clientWidth-(parseFloat(style.right)||48)-8),maxH=Math.max(160,view.clientHeight-(parseFloat(style.top)||48)-8);panel.style.width=Math.min(maxW,Math.max(minWidth,w))+'px';if(!docked)panel.style.height=Math.min(maxH,Math.max(minHeight,h))+'px';if(edge){edge.setAttribute('aria-valuemin',Math.min(minWidth,maxW));edge.setAttribute('aria-valuemax',Math.floor(maxW));edge.setAttribute('aria-valuenow',Math.round(parseFloat(panel.style.width)));}}
 function fit(){size(parseFloat(panel.style.width)||width,parseFloat(panel.style.height)||height);}
 function save(){try{localStorage.setItem(key,JSON.stringify([panel.offsetWidth,panel.offsetHeight]));}catch{}}
 function finish(cancel=false){if(!drag)return;const previous=drag;drag=null;if(cancel)size(previous.width,previous.height);else save();if(previous.handle.hasPointerCapture(previous.id))previous.handle.releasePointerCapture(previous.id);}
 grip.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();const handle=event.currentTarget;handle.focus({preventScroll:true});drag={id:event.pointerId,handle,x:event.clientX,y:event.clientY,width:panel.offsetWidth,height:panel.offsetHeight};handle.setPointerCapture(event.pointerId);};
 grip.onpointermove=event=>{if(!drag||event.pointerId!==drag.id)return;event.preventDefault();event.stopPropagation();size(drag.width+drag.x-event.clientX,drag.height+event.clientY-drag.y);};
 grip.onpointerup=event=>{event.stopPropagation();finish();};grip.onpointercancel=()=>finish(true);grip.onlostpointercapture=()=>finish();
 grip.onkeydown=event=>{if(event.key==='Escape'&&drag){event.preventDefault();event.stopPropagation();finish(true);return;}const d={ArrowLeft:[10,0],ArrowRight:[-10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];if(!d)return;event.preventDefault();event.stopPropagation();size(panel.offsetWidth+d[0],panel.offsetHeight+d[1]);save();};
 if(edge)for(const event of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onlostpointercapture','onkeydown'])edge[event]=grip[event];
 window.addEventListener('blur',()=>finish());
 try{const v=JSON.parse(localStorage.getItem(key));if(Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)){panel.style.width=v[0]+'px';if(!docked)panel.style.height=v[1]+'px';}}catch{}
 new ResizeObserver(()=>{if(!panel.hidden)fit();}).observe(view);
 return {fit,finish};
}
