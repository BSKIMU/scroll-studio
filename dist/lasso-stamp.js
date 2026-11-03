// Lasso capture is transient; only placing a stamp or filling writes artwork.
import {makeSurface} from './layer-effects.js?v=20261025-release1';
import {liftPixels} from './selection-geometry.js?v=20261102-startup';
export function setupLassoStamp(api){
 const controls=document.createElement('div');controls.className='lasso-stamp-controls';controls.hidden=true;
 controls.innerHTML='<small>둘러싸서 그림을 채집한 뒤 클릭할 때마다 찍습니다. 원본은 유지됩니다.</small><button id="lassoStampReuse" title="채집한 스탬프 다시 사용"><canvas width="120" height="90"></canvas></button><label>색<select id="lassoStampColor"><option value="original">원본 색</option><option value="current">현재 색</option></select></label><label>크기 %<input id="lassoStampScale" type="number" min="1" max="1000" value="100"></label><label>회전 °<input id="lassoStampAngle" type="number" value="0"></label><button id="lassoStampCapture">새로 둘러싸기</button><button id="lassoStampOrigin">제자리에 찍기</button><small>Esc: 찍기 중지 · 미리보기 클릭: 다시 찍기</small>';
 api.options.append(controls);
 const $=id=>controls.querySelector('#'+id),ghost=document.createElement('canvas');ghost.className='lasso-stamp-preview';ghost.hidden=true;api.paper.append(ghost);
 let source=null,origin=null,active=false,busy=false,generation=0,previewSource=null,previewColor=null;
 const scale=()=>Math.max(.01,Math.min(10,(+$('lassoStampScale').value||100)/100));
 const angle=()=>((+$('lassoStampAngle').value||0)%360)*Math.PI/180;
 function stop(){active=false;ghost.hidden=true;generation++;}
 function colored(){const cv=makeSurface(source.width,source.height),ctx=cv.getContext('2d');ctx.drawImage(source,0,0);if($('lassoStampColor').value==='current'){ctx.globalCompositeOperation='source-in';ctx.fillStyle=api.getColor();ctx.fillRect(0,0,cv.width,cv.height);}return cv;}
 async function placeAt(c,cv,p){
  if(!source||!active||busy)return;const l=c.paintLayers.find(l=>l.id===c.activeLayer);if(!api.valid(c,l)){api.toast('잠금 해제된 그리기 레이어를 선택하세요.');return;}
  busy=true;const ticket=generation;
  try{const raw=await api.capture(c,l);if(ticket!==generation){raw.width=1;return;}
   const ink=colored(),ctx=raw.getContext('2d');ctx.save();if(l.alphaLock)ctx.globalCompositeOperation='source-atop';ctx.translate(p[0]*raw.width,p[1]*raw.height);ctx.rotate(angle());ctx.scale(scale(),scale());ctx.imageSmoothingEnabled=false;ctx.drawImage(ink,-ink.width/2,-ink.height/2);ctx.restore();ink.width=1;
   await api.commit(c,l,cv,raw);
  }catch(e){api.toast(e.message);}finally{busy=false;}
 }
 async function finish(p,mask,mode){
  if(busy){mask.width=1;return;}const l=p.c.paintLayers.find(l=>l.id===p.c.activeLayer);if(!api.valid(p.c,l)){mask.width=1;api.toast('잠금 해제된 그리기 레이어를 선택하세요.');return;}
  busy=true;const ticket=++generation;
  try{const raw=await api.capture(p.c,l);if(ticket!==generation){raw.width=1;return;}
   if(mode==='fill'){
    const ink=makeSurface(raw.width,raw.height),ctx=ink.getContext('2d');ctx.drawImage(mask,0,0,ink.width,ink.height);ctx.globalCompositeOperation='source-in';ctx.fillStyle=api.getColor();ctx.fillRect(0,0,ink.width,ink.height);
    const dest=raw.getContext('2d');if(l.alphaLock)dest.globalCompositeOperation='source-atop';dest.drawImage(ink,0,0);dest.globalCompositeOperation='source-over';ink.width=1;await api.commit(p.c,l,p.cv,raw);
   }else{
    const split=liftPixels(raw,mask,makeSurface);raw.width=1;if(!split){api.toast('둘러싼 영역에 그림이 없습니다.');return;}
    if(source)source.width=1;source=split.selected;origin={c:p.c,cv:p.cv,p:[(split.box.x+split.box.w/2)/api.nativeSize(p.c)[0],(split.box.y+split.box.h/2)/api.nativeSize(p.c)[1]]};active=true;
    const preview=controls.querySelector('canvas'),ctx=preview.getContext('2d');ctx.clearRect(0,0,preview.width,preview.height);const k=Math.min(preview.width/source.width,preview.height/source.height);ctx.drawImage(source,(preview.width-source.width*k)/2,(preview.height-source.height*k)/2,source.width*k,source.height*k);api.toast('스탬프 채집 완료 · 클릭해서 반복 배치');
   }
  }catch(e){api.toast(e.message);}finally{mask.width=1;busy=false;}
 }
 function hover(e){if(!active||!source){ghost.hidden=true;return;}const cv=e.target.closest('.panel-wrap>canvas'),c=api.bindings.get(cv);if(!c){ghost.hidden=true;return;}const p=api.point(cv,e),r=cv.parentElement,[w,h]=api.nativeSize(c),color=lassoStampColor.value==='current'?api.getColor():null;if(previewSource!==source||previewColor!==color){const k=Math.min(1,512/Math.max(source.width,source.height));ghost.width=Math.max(1,Math.round(source.width*k));ghost.height=Math.max(1,Math.round(source.height*k));const ctx=ghost.getContext('2d');ctx.drawImage(source,0,0,ghost.width,ghost.height);if(color){ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,ghost.width,ghost.height);ctx.globalCompositeOperation='source-over';}previewSource=source;previewColor=color;}const gw=source.width/w*cv.clientWidth*scale(),gh=source.height/h*cv.clientHeight*scale();Object.assign(ghost.style,{left:r.offsetLeft+p[0]*cv.clientWidth-gw/2+'px',top:r.offsetTop+p[1]*cv.clientHeight-gh/2+'px',width:gw+'px',height:gh+'px',transform:`rotate(${angle()}rad)`});ghost.hidden=false;}
 $('lassoStampCapture').onclick=stop;$('lassoStampReuse').onclick=()=>{active=!!source;};$('lassoStampOrigin').onclick=()=>{if(origin){active=true;placeAt(origin.c,origin.cv,origin.p);}};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){stop();e.preventDefault();}},true);
 api.paper.addEventListener('pointerleave',()=>ghost.hidden=true);
 return {show:v=>controls.hidden=!v,stop,ready:()=>active&&!!source,placeAt,finish,hover};
}
