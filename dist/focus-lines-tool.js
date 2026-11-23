import {elementPoint} from './canvas-coordinates.js?v=20261025-release1';
import {rememberBitmap} from './layer-effects.js?v=20261025-release1';

export function setupFocusLinesTool(api,bindings,maskFor){
 const $=id=>document.getElementById(id),paper=$('paper'),pane=document.createElement('section');pane.id='focusLineOptions';pane.hidden=true;
 pane.innerHTML='<b>집중선</b><label>종류<select id="focusPreset"><option value="sparse">성긴 집중선</option><option value="dense">빽빽한 집중선</option><option value="burst">파열</option></select></label><label>선 수 <input id="focusCount" type="range" min="12" max="360" value="90"><output></output></label><label>선 두께 <input id="focusWidth" type="range" min=".5" max="20" step=".5" value="3"><output></output></label><label>안쪽 길이 변화 <input id="focusJitter" type="range" min="0" max="90" value="25"><output></output></label><label>선 간격 변화 <input id="focusScatter" type="range" min="0" max="100" value="60"><output></output></label><button id="focusNew">새 집중선 그리기</button><p>중심에서 바깥으로 드래그하세요. 비워둘 원형 영역을 정합니다. 선택범위가 있으면 그 안에만 생성됩니다.</p><small id="focusStatus" role="status">새 집중선 레이어로 생성</small>';
 ($('drawingTools').querySelector('.palette-body')||$('drawingTools')).append(pane);
 const presets={sparse:{count:90,width:3,jitter:.25,scatter:.6},dense:{count:230,width:5,jitter:.4,scatter:.15},burst:{count:110,width:8,jitter:.3,scatter:.6,burst:true,length:.12}};
 const fields={count:'focusCount',width:'focusWidth',jitter:'focusJitter',scatter:'focusScatter'},values=()=>Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,+$(id).value/(['jitter','scatter'].includes(key)?100:1)]));
 let target=null,drag=null,checkpointed=false;
 const current=()=>target&&(!api.getSelectedCut||api.getSelectedCut()===target.c)&&api.getProject().cuts.includes(target.c)&&target.c.paintLayers.includes(target.l)&&!target.l.locked;
 function outputs(){for(const id of Object.values(fields))$(id).nextElementSibling.value=$(id).value;}
 function edit(){outputs();if(!current())return;if(!checkpointed){api.checkpoint();checkpointed=true;}Object.assign(target.l.generated,values(),{burst:$('focusPreset').value==='burst'});api.drawCut(target.c,target.cv);api.changed(target.c);}
 for(const id of Object.values(fields)){$(id).oninput=edit;$(id).onchange=()=>{checkpointed=false;if(current())api.save();};}
 $('focusPreset').onchange=()=>{const p=presets[$('focusPreset').value];for(const [key,id]of Object.entries(fields))$(id).value=p[key]*(['jitter','scatter'].includes(key)?100:1);edit();checkpointed=false;if(current())api.save();};outputs();
 $('focusNew').onclick=()=>{target=null;$('focusStatus').textContent='새 집중선 레이어로 생성';};
 function install(){const rail=$('toolPalette');if(!rail)return false;const b=document.createElement('button');b.dataset.tool='focuslines';b.dataset.toolOrder='focuslines';b.title='집중선';b.setAttribute('aria-label','집중선');b.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="1" y="3" width="22" height="18" rx="1" fill="none" stroke="currentColor"/><path d="M1 3h4l5 7z M8 3h2l1 6z M14 3h2l-3 6z M20 3h3l-8 7z M23 7v3l-8 1z M23 15v3l-8-5z M23 21h-4l-5-7z M15 21h-2l-1-6z M6 21H2l8-7z M1 16v-3l8-1z M1 7v3l8 1z"/></svg>';b.onclick=()=>api.setTool('focuslines');rail.append(b);return true;}
 if(!install()){const observer=new MutationObserver(()=>{if(install())observer.disconnect();});observer.observe(document.querySelector('.workspace'),{childList:true});}
 function restoreTarget(){const c=api.getSelectedCut?.(),l=c?.paintLayers.find(l=>l.id===c.activeLayer);if(l?.generated?.kind==='focus'){target={c,l,cv:paper.querySelector(`.panel-wrap[data-id="${c.id}"]>canvas`)};for(const [key,id]of Object.entries(fields))$(id).value=l.generated[key]*(['jitter','scatter'].includes(key)?100:1);$('focusPreset').value=l.generated.burst?'burst':l.generated.count>150?'dense':'sparse';outputs();$('focusStatus').textContent='집중선 편집 중 · 설정을 바꾸면 바로 반영';}else target=null;}
 document.addEventListener('tool-change',()=>{pane.hidden=api.getTool()!=='focuslines';if(!pane.hidden)restoreTarget();if(drag)cancel();});
 document.getElementById('layerPanel')?.addEventListener('click',()=>{if(!pane.hidden)queueMicrotask(restoreTarget);});
 function cancel(){if(!drag)return;drag.preview.remove();drag=null;}
 paper.addEventListener('pointerdown',e=>{if(api.getTool()!=='focuslines'||e.button!==0||e.altKey||e.target.closest('button'))return;const cv=e.target.closest('canvas'),c=bindings.get(cv);if(!c)return;e.preventDefault();e.stopImmediatePropagation();if(c.paintLayers.length>=30)return api.toast('레이어가 가득 찼습니다.');const p=elementPoint(cv,e),wrap=cv.parentElement,preview=document.createElementNS('http://www.w3.org/2000/svg','svg');
 const w=cv.clientWidth,h=cv.clientHeight;preview.setAttribute('viewBox','0 0 '+w+' '+h);preview.setAttribute('aria-hidden','true');preview.classList.add('focus-line-preview');
 Object.assign(preview.style,{position:'absolute',left:wrap.offsetLeft+'px',top:wrap.offsetTop+'px',width:w+'px',height:h+'px',pointerEvents:'none',zIndex:'2147483000'});
 const x=p[0]*w,y=p[1]*h;
 preview.innerHTML='<g fill="none" stroke="white" stroke-width="3"><circle/><path/></g><g fill="none" stroke="#146ba4" stroke-width="1.5"><circle/><path/></g>';
 for(const path of preview.querySelectorAll('path'))path.setAttribute('d','M'+(x-5)+' '+y+'h10 M'+x+' '+(y-5)+'v10');
 for(const circle of preview.querySelectorAll('circle')){circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',2);}
 paper.append(preview);drag={cv,c,w,h,id:e.pointerId,preview,g:{kind:'focus',cx:p[0],cy:p[1],color:$('penColor').value,seed:Math.floor(Math.random()*0xffffffff),...values(),burst:$('focusPreset').value==='burst'}};cv.setPointerCapture(e.pointerId);},true);
 function radius(e,d){const p=elementPoint(d.cv,e);return Math.hypot((p[0]-d.g.cx)*d.w,(p[1]-d.g.cy)*d.h);}
 paper.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const r=radius(e,drag);for(const circle of drag.preview.querySelectorAll('circle'))circle.setAttribute('r',r);},true);
 paper.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;const d=drag,r=radius(e,d);cancel();if(r<2)return;d.g.rx=r/d.w;d.g.ry=r/d.h;d.g.edgeTaper=true;api.checkpoint();const l={id:crypto.randomUUID(),name:'집중선',visible:true,locked:false,keepVisible:true,opacity:100,type:'raster',nativeWidth:(api.getProject().width+api.getProject().bleed)*d.c.width/100,generated:d.g};const mask=maskFor(d.c);if(mask){const bitmap=mask.toDataURL('image/png');const snapshot=document.createElement('canvas');snapshot.width=mask.width;snapshot.height=mask.height;snapshot.getContext('2d').drawImage(mask,0,0);rememberBitmap(bitmap,snapshot);l.mask={bitmap,enabled:true};}d.c.paintLayers.push(l);d.c.activeLayer=l.id;target={c:d.c,l,cv:d.cv};api.select(d.c.id);api.drawCut(d.c,d.cv);api.changed(d.c);api.save();$('focusStatus').textContent='집중선 편집 중 · 설정을 바꾸면 바로 반영';},true);
 paper.addEventListener('pointercancel',cancel,true);document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
}

