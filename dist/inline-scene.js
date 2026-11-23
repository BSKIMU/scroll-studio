import {pageDisplayLayers} from './page-layer-view.js?v=20261028-guide3';
import {compositeStack} from './layer-compositor.js?v=20261025-release1';
import {installSurfacePen,inkLayers,syncInkVisibility} from './surface-ink.js';
export function setupInlineScene({current,select,cutArtwork,open,editor,close,toast}){
 const $=id=>document.getElementById(id),paper=$('paper'),view=$('sceneView'),button=document.createElement('button');
 button.type='button';button.dataset.toolOrder='inline-scene';button.title='컷 안에서 3D 편집';button.setAttribute('aria-label',button.title);
 button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m12 2 9 5v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10"/></svg><small class="cube-badge">3D</small>';
 const rail=$('toolPalette');rail.insertBefore(button,rail.querySelector('.tool-color-swatches'));
 const anchor=document.createComment('3D viewport'),shell=document.createElement('div'),bar=document.createElement('div');
 const artwork=document.createElement('canvas');artwork.className='inline-scene-art';artwork.setAttribute('aria-hidden','true');shell.append(artwork);
 let artworkDirty=true,artworkVersion=0;
 async function paintOverlay(wrap,cut){
  artworkDirty=false;const version=++artworkVersion;
  const scale=Math.min(devicePixelRatio||1,2,Math.sqrt(4000000/Math.max(1,wrap.clientWidth*wrap.clientHeight)));
  artwork.width=Math.max(1,Math.round(wrap.clientWidth*scale));artwork.height=Math.max(1,Math.round(wrap.clientHeight*scale));
  const isArtwork=id=>!['paper','guideScene','guide','background','frame'].includes(id);
  if(!cut.pageId){
   const layers=await cutArtwork(cut,artwork.width);
   try{if(version===artworkVersion&&active&&cut.id===cutId)compositeStack(artwork.getContext('2d'),layers.filter(l=>isArtwork(l.id)).map(l=>({...l,args:[0,0,artwork.width,artwork.height]})));}
   finally{for(const layer of layers)layer.canvas.width=1;}
   return;
  }
  const layers=pageDisplayLayers(paper).filter(cv=>isArtwork(cv.dataset.layer));
  compositeStack(artwork.getContext('2d'),layers.map(cv=>({...cv.layerDescriptor,args:[
   (cv.offsetLeft-wrap.offsetLeft)*scale,(cv.offsetTop-wrap.offsetTop)*scale,cv.clientWidth*scale,cv.clientHeight*scale
  ]})));

 }
 view.before(anchor);shell.className='inline-scene-editor';bar.className='inline-scene-bar';
 const actions=[
  ['translate','이동','M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3'],
  ['rotate','회전','M20 10a8 8 0 1 0-1 7M20 4v6h-6'],
  ['walk','보행 · WASD','M14 4a1.5 1.5 0 1 0 .1 0M6 13l3-4 4-1 3 5h4M12 10l-2 6-5 5M10 16l5 1 2 5'],
  ['ink','표면 펜','M4 20l1-5L16 4l4 4L9 19zM14 6l4 4'],
  ['erase','획 지우개','M3 14l10-10 8 8-8 8H9zM8 9l8 8M12 20h9'],
  ['','편집 완료','M3 12l6 6L21 5']
 ];
 for(const [mode,label,path] of actions){
  const b=document.createElement('button');b.type='button';if(mode)b.dataset.mode=mode;b.title=label;b.setAttribute('aria-label',label);
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';bar.append(b);
 }
 const dock=document.createElement('div'),entry=document.createElement('button'),modeLabel=document.createElement('span');
 dock.className='cut-scene-actions';dock.hidden=true;entry.type='button';entry.textContent='컷 안에서 3D 편집';
 modeLabel.id='inlineToolStatus';modeLabel.setAttribute('role','status');$('currentToolName').after(modeLabel);
 for(const b of bar.children){const caption=document.createElement('span');caption.textContent=b.dataset.mode?b.title.split(' · ')[0]:'완료';b.append(caption);}
 const settings=document.createElement('fieldset');settings.hidden=true;settings.className='surface-settings';
 settings.innerHTML='<legend>표면 펜</legend><label>브러시<select id="surfaceBrush"><option value="pen">펜</option><option value="air">에어브러시</option></select></label><label>색상<input type="color" id="surfaceColor"></label><label>크기 (px)<input type="number" min="0.1" max="2000" step="0.1" id="surfaceSize"></label><label>불투명도 (%)<input type="number" min="1" max="100" id="surfaceOpacity"></label>';
 let initialized=false;
 const layers=document.createElement('details');layers.className='surface-layer-menu';layers.innerHTML='<summary>선 레이어</summary><div><select aria-label="표면선 레이어"></select><button type="button" title="표면선 레이어 추가">＋</button><button type="button" title="표면선 레이어 표시 전환"></button></div>';
 const selector=layers.querySelector('select'),[addLayer,eye]=layers.querySelectorAll('button');
 function refreshLayers(){
  const state=editor()?.state;if(!state)return;
  selector.replaceChildren(...inkLayers(state).map(l=>new Option(l.name,l.id)));selector.value=state.activeInkLayer||'base';
  const visible=inkLayers(state).find(l=>l.id===selector.value)?.visible!==false;eye.textContent=visible?'표시':'숨김';eye.setAttribute('aria-pressed',String(visible));
 }
 selector.onchange=()=>{editor().state.activeInkLayer=selector.value;refreshLayers();editor().queueLive();};
 addLayer.onclick=()=>{const ed=editor(),items=structuredClone(inkLayers(ed.state));const l={id:crypto.randomUUID(),name:'표면선 '+(items.length+1),visible:true};items.push(l);ed.state.inkLayers=items;ed.state.activeInkLayer=l.id;refreshLayers();ed.queueLive();};
 eye.onclick=()=>{const ed=editor();ed.state.inkLayers=inkLayers(ed.state).map(l=>l.id===selector.value?{...l,visible:!l.visible}:l);syncInkVisibility(ed);refreshLayers();ed.queueLive();};
 dock.append(entry,bar,layers);document.body.append(dock);entry.onclick=()=>enter();let active=false,picking=false,mode='translate',cutId=null,token=0;
 const cancelStroke=installSurfacePen(view,editor,()=>active&&['ink','erase'].includes(mode)&&mode,toast);
 function choose(m){
  cancelStroke();mode=m;schedule();
  const guide=document.querySelector('.cut-guide-option');if(guide)guide.after(settings);else $('paletteDock')?.prepend(settings);
  settings.hidden=m!=='ink';if(m==='ink'&&!initialized){for(const [a,b] of [['surfaceColor','penColor'],['surfaceSize','penSize'],['surfaceOpacity','brushOpacity']])$(a).value=$(b).value;initialized=true;}
  const ed=editor();
  if(m==='walk'){ed.movement.start();ed.renderer.domElement.focus({preventScroll:true});}
  else{if(ed.movement.engaged)ed.movement.stop();if(m==='translate'||m==='rotate')ed.gizmo.setMode(m);}
  modeLabel.textContent='컷 안 3D · '+actions.find(a=>a[0]===m)[1];layers.hidden=!['ink','erase'].includes(m);refreshLayers();shell.classList.toggle('surface-pen',m==='ink'||m==='erase');for(const b of bar.children)b.setAttribute('aria-pressed',String(b.dataset.mode===m));
 }
 function reset(){artworkVersion++;artwork.width=artwork.height=1;modeLabel.textContent='';settings.hidden=true;schedule();token++;cancelStroke();active=picking=false;cutId=null;button.setAttribute('aria-pressed','false');if(view.parentElement===shell)anchor.after(view);shell.remove();document.body.classList.remove('inline-cut-mode');}
 function exit(){if(active)close();else reset();}
 bar.onclick=e=>{const b=e.target.closest('button');if(!b)return;b.dataset.mode?choose(b.dataset.mode):exit();};
 const viewport=$('viewport');let pending=0;
 function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;align();});}
 function align(){
  const cut=current(),wrap=cut&&!cut.pageBase&&paper.querySelector('.panel-wrap[data-id="'+CSS.escape(cut.id)+'"]');
  if(active&&(!wrap||cut.id!==cutId)){exit();return;}
  if(active){
   Object.assign(shell.style,{top:wrap.offsetTop+'px',left:wrap.offsetLeft+'px',width:wrap.clientWidth+'px',height:wrap.clientHeight+'px',clipPath:wrap.style.clipPath});
   if(!shell.isConnected)paper.append(shell);
   if(artworkDirty)paintOverlay(wrap,cut).catch(()=>toast('편집 중 원고 선을 표시하지 못했습니다.'));
  }
  if(!wrap||(!active&&(document.body.dataset.tool!=='select'||paper.classList.contains('frame-drawing')))){dock.hidden=true;return;}
  const r=wrap.getBoundingClientRect(),v=viewport.getBoundingClientRect(),top=v.top+4,bottom=v.bottom-4;
  if(r.bottom<=top||r.top>=bottom||r.right<=v.left||r.left>=v.right){dock.hidden=true;return;}
  dock.hidden=false;entry.hidden=active;bar.hidden=!active;layers.hidden=!active||!['ink','erase'].includes(mode);
  dock.style.maxWidth=Math.max(1,v.width-10)+'px';
  const w=dock.offsetWidth,h=dock.offsetHeight;
  dock.style.left=Math.max(v.left+4,Math.min(r.left,v.right-w-4))+'px';
  const y=r.bottom+5+h<=bottom?r.bottom+5:r.top-5-h>=top?r.top-5-h:bottom-h;
  dock.style.top=Math.max(top,y)+'px';
 }
 async function enter(){
  const cut=current();if(!cut||cut.pageBase){picking=true;button.setAttribute('aria-pressed','true');toast('3D로 편집할 컷을 클릭하세요.');return;}
  artworkDirty=true;picking=false;if(!$('sceneDialog').hidden)close();document.body.classList.add('inline-cut-mode');const id=++token;active=true;cutId=cut.id;button.setAttribute('aria-pressed','true');shell.prepend(view);align();
  for(const b of bar.querySelectorAll('[data-mode]'))b.disabled=true;
  const ed=await open();if(id!==token)return;if(!ed){exit();return;}for(const b of bar.children)b.disabled=false;choose('translate');ed.resize();ed.invalidate();
 }
 button.onclick=()=>active||picking?exit():enter();button.setAttribute('aria-pressed','false');
 paper.addEventListener('pointerdown',e=>{if(!picking)return;const wrap=e.target.closest('.panel-wrap:not(.page-base)');if(!wrap)return;e.preventDefault();e.stopImmediatePropagation();select(wrap.dataset.id);enter();},true);
 for(const type of ['pointerdown','pointerup','click','dblclick'])shell.addEventListener(type,e=>e.stopPropagation());
 new MutationObserver(records=>{if(records.some(r=>r.target===paper||r.target.classList?.contains('panel-wrap'))){artworkDirty=true;schedule();}}).observe(paper,{childList:true,attributes:true,attributeFilter:['class','style'],subtree:true});
 const sizeObserver=new ResizeObserver(schedule);for(const el of [viewport,paper,dock])sizeObserver.observe(el);
 document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);schedule();
 document.addEventListener('tool-change',()=>{if(active||picking)exit();schedule();});
 return {reset,exit,get active(){return active;}};
}
