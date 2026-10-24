import {elementPoint,rasterScale} from './canvas-coordinates.js?v=20261025-release1';
import {frameAtPoint,cutRect,frameBox,moveFrameBox,resizeFrameBox,rotateFrameBox,reframeCut} from './frame-geometry.js?v=20261025-release1';
export function setupFrameTransform(api){
 const $=id=>document.getElementById(id),paper=$('paper'),viewport=$('viewport');let session=null,drag=null,handlesFor=null,paintQueued=0;const committed=new Set();
 const box=document.createElement('div');box.id='frameTransform';box.hidden=true;box.tabIndex=-1;box.setAttribute('aria-label','컷 이동 · 회전 · 크기 조절');
 for(const [edge,style]of [['n',{left:'0',right:'0',top:'-7px',height:'14px'}],['s',{left:'0',right:'0',bottom:'-7px',height:'14px'}],['w',{left:'-7px',top:'0',bottom:'0',width:'14px'}],['e',{right:'-7px',top:'0',bottom:'0',width:'14px'}]]){const zone=document.createElement('div');zone.className='frame-move-edge';zone.dataset.handle='move';zone.title='테두리 드래그: 컷 이동 · 더블클릭: 적용';zone.setAttribute('aria-label',edge+' 컷 테두리 이동');Object.assign(zone.style,style);box.append(zone);}
 for(const [dir,x,y,label]of [['nw',0,0,'왼쪽 위'],['n',50,0,'위'],['ne',100,0,'오른쪽 위'],['e',100,50,'오른쪽'],['se',100,100,'오른쪽 아래'],['s',50,100,'아래'],['sw',0,100,'왼쪽 아래'],['w',0,50,'왼쪽']]){
  if(dir.length===2){const zone=document.createElement('div');zone.className='frame-rotate-handle';zone.dataset.handle='rotate';zone.style.top=`calc(${y}% + ${y?18:-18}px)`;zone.style.left=`calc(${x}% + ${x?18:-18}px)`;zone.title='꼭짓점 바깥 드래그: 회전 · Shift: 45°';zone.setAttribute('aria-label',label+' 컷 회전');box.append(zone);}
  const b=document.createElement('button');b.type='button';b.dataset.handle=dir;b.className='frame-resize-handle';b.style.left=x+'%';b.style.top=y+'%';b.style.cursor=dir+'-resize';b.setAttribute('aria-label',label+' 컷 크기 조절');b.title=label+' 조절점: 크기 · Shift: 비율 유지';box.append(b);
 }
 const panel=document.createElement('div');panel.id='frameTransformActions';panel.hidden=true;panel.innerHTML='<b>컷 이동 · 회전 · 크기</b><output id="frameTransformSize"></output><small>테두리: 이동 · 꼭짓점 바깥: 회전<br>사각 조절점: 크기 · 3D 비율 유지<br>더블클릭 / Enter: 적용 · Esc: 취소</small><div class="two"><button id="frameTransformApply" class="primary">적용 ↵</button><button id="frameTransformCancel">취소 Esc</button></div>';
 const start=document.createElement('button');start.id='frameTransformStart';start.className='full';start.textContent='⤢ 컷 이동 · 회전 · 크기 · Ctrl+T';$('frameScene').before(start,panel);start.onclick=begin;
 const valid=c=>c&&!c.pageBase&&c.pageId&&api.getProject().pages;
 const limits=()=>({width:api.getProject().width,height:api.getProject().pageHeight});
 function position(b){const z=api.getZoom();Object.assign(box.style,{left:(b.cx-b.w/2)*z+'px',top:(b.cy-b.h/2)*z+'px',width:b.w*z+'px',height:b.h*z+'px',transform:`rotate(${b.angle}deg)`});}
 function paint(c,live=false){const z=api.getZoom(),r=cutRect(c,api.getProject().width),wrap=[...paper.querySelectorAll('.panel-wrap')].find(n=>n.dataset.id===c.id);if(!wrap)return;
  Object.assign(wrap.style,{left:r.x*z+'px',top:r.y*z+'px',width:r.w*z+'px',height:r.h*z+'px',clipPath:c.frame?.path&&c.frame.clip!==false?'polygon('+c.frame.path.map(([x,y])=>`${x*100}% ${y*100}%`).join(',')+')':''});
  const ring=wrap.querySelector('.frame-selection');if(ring){ring.style.display='';ring.querySelector('polygon').setAttribute('points',(c.frame?.path||[]).map(([x,y])=>`${x*100},${y*100}`).join(' '));}const cv=wrap.querySelector('canvas'),scale=Math.min(rasterScale(r.w,r.h),z*Math.min(devicePixelRatio||1,2));
  if(live){api.drawPreview(c,cv);return;}delete cv.dataset.framePreview;cv.width=Math.max(1,Math.round(r.w*scale));cv.height=Math.max(1,Math.round(r.h*scale));api.drawCut(c,cv);
 }
 function preview(){if(!session)return;position(session.box);$('frameTransformSize').textContent=`${Math.round(session.box.w)} × ${Math.round(session.box.h)} px · ${((session.box.angle%360+360)%360).toFixed(1)}°`;if(!paintQueued)paintQueued=requestAnimationFrame(()=>{paintQueued=0;if(session)paint(session.cut,true);});}
 function sync({showHandles=false}={}){const c=api.getSelected();if(session&&c?.id!==session.id)cancel();paper.querySelectorAll('.panel-wrap').forEach(el=>el.classList.toggle('frame-committed',committed.has(el.dataset.id)));if(showHandles)handlesFor=committed.has(c?.id)?null:api.getTool()==='select'?c?.id:null;const usable=valid(c);start.disabled=!usable;box.hidden=!usable||(!session&&(api.getTool()!=='select'||handlesFor!==c.id));if(box.hidden){box.remove();return;}if(box.parentNode!==paper)paper.append(box);position(session?.box||frameBox(c,api.getProject().width));if(session)preview();}
 function begin(){const c=api.getSelected();if(!valid(c)){api.toast('조절할 컷을 먼저 선택하세요.');return false;}if(session)return true;committed.delete(c.id);api.setTool('select');api.pauseScene();session={id:c.id,original:structuredClone(c),cut:structuredClone(c),box:frameBox(c,api.getProject().width),changed:false};const current=session;Promise.resolve(api.preparePreview?.(c)).then(()=>{if(session===current)preview();}).catch(()=>api.toast('3D 미리보기를 준비하지 못했습니다. 저장된 가이드로 표시합니다.'));panel.hidden=false;box.classList.add('transforming');sync();preview();return true;}
 function release(){const d=drag;drag=null;if(d&&box.hasPointerCapture(d.pointer))box.releasePointerCapture(d.pointer);}
 function end(){release();if(paintQueued)cancelAnimationFrame(paintQueued);paintQueued=0;session=null;handlesFor=null;panel.hidden=true;box.classList.remove('transforming');}
 function cancel(){if(!session)return;const original=session.original;end();paint(original);sync();}
 function apply(){if(!session)return;const c=api.getSelected();if(c?.id!==session.id){cancel();return;}const {cut,changed}=session;committed.add(c.id);end();if(changed){api.checkpoint();Object.assign(c,cut);api.render();api.save();if(c.scene?.asset!=='empty'||c.scene?.people?.length)api.refreshScene?.();}else paint(c);sync();}
 $('frameTransformApply').onclick=apply;$('frameTransformCancel').onclick=cancel;
 const inCanvas=target=>viewport.contains(target)&&(box.contains(target)||!target.closest('button,a,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
 viewport.addEventListener('dblclick',e=>{
  if(e.button!==0||api.getTool()!=='select'||api.hasBalloonSelection?.()||e.target.closest('.balloon-plane')||!inCanvas(e.target)||paper.classList.contains('frame-drawing'))return;
  if(session){e.preventDefault();e.stopImmediatePropagation();apply();return;}
  const p=api.getProject();let hit=null;
  if(p.cuts&&Number.isFinite(e.clientX)){const [x,y]=pagePoint(e);hit=frameAtPoint(p,p.activePage||api.getSelected()?.pageId,x,y);}
  if(hit){e.preventDefault();e.stopImmediatePropagation();api.clearArtwork?.();api.select?.(hit.id);begin();return;}
  if(!valid(api.getSelected()))return;e.preventDefault();e.stopImmediatePropagation();if(committed.has(api.getSelected()?.id)){begin();return;}begin();apply();
 },true);
 const pagePoint=e=>{const p=elementPoint(paper,e),l=limits();return [p[0]*l.width,p[1]*l.height];};
 box.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();if(!begin())return;box.focus({preventScroll:true});const point=pagePoint(e);drag={pointer:e.pointerId,handle:e.target.closest('[data-handle]')?.dataset.handle||'move',point,box:{...session.box},cut:session.cut,changed:session.changed,moved:false};box.setPointerCapture(e.pointerId);});
 box.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointer||!session)return;e.preventDefault();e.stopPropagation();const pt=pagePoint(e),dx=pt[0]-drag.point[0],dy=pt[1]-drag.point[1];if(!drag.moved&&Math.hypot(dx,dy)*api.getZoom()<3)return;drag.moved=true;
  const b=drag.box;let next;if(drag.handle==='move')next=moveFrameBox(b,dx,dy,limits(),e.shiftKey);else if(drag.handle==='rotate'){let delta=(Math.atan2(pt[1]-b.cy,pt[0]-b.cx)-Math.atan2(drag.point[1]-b.cy,drag.point[0]-b.cx))*180/Math.PI;delta=(delta+540)%360-180;next=rotateFrameBox(b,delta,limits(),e.shiftKey);}else next=resizeFrameBox(b,drag.handle,dx,dy,limits(),e.shiftKey);
  session.box=next;session.cut=reframeCut(drag.cut,api.getProject().width,next,drag.handle==='move');session.changed=true;preview();});
 box.addEventListener('pointerup',e=>{if(drag){e.stopPropagation();release();}});
 function cancelDrag(){if(drag&&session){const d=drag;release();session.box=d.box;session.cut=d.cut;session.changed=d.changed;preview();}}
 box.addEventListener('pointercancel',cancelDrag);box.addEventListener('lostpointercapture',cancelDrag);
 document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='t'&&valid(api.getSelected())){e.preventDefault();e.stopImmediatePropagation();begin();return;}
  if(!session)return;
  if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();e.key==='Escape'?cancel():apply();return;}
  if((e.ctrlKey||e.metaKey)&&(e.code==='KeyZ'||e.key.toLowerCase()==='z')){const changed=session.changed;cancel();if(changed&&!e.shiftKey){e.preventDefault();e.stopImmediatePropagation();}return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();e.stopImmediatePropagation();const step=e.shiftKey?10:1;session.box=moveFrameBox(session.box,delta[0]*step,delta[1]*step,limits());session.cut=reframeCut(session.cut,api.getProject().width,session.box,true);session.changed=true;preview();}
 },true);
 document.addEventListener('pointerdown',e=>{if(!session||box.contains(e.target)||panel.contains(e.target)||e.target===start)return;if(inCanvas(e.target)){if(e.button===0){e.preventDefault();e.stopImmediatePropagation();}return;}cancel();},true);
 window.addEventListener('blur',cancelDrag);
 return {sync,cancel,apply};
}
