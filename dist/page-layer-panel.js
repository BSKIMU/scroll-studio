import {nextLayerName} from './layer-names.js?v=20261025-release1';
import {layerCaption,lockIcon} from './layer-row-label.js?v=20261025-release1';
import {balloonLayerRows,balloonLayerAction} from './balloon-layer-panel.js?v=20261025-release1';
import {pageStack,paintKey,movePageLayer,placePageLayer} from './page-layer-stack.js?v=20261025-release1';
import {eyeIcon} from './eye-icon.js?v=20261025-release1';

export function setupPageLayerPanel({getProject,selectedCut,select,checkpoint,save,renderPage,clearSelection,toast,box,thumbnails}){
 const $=id=>document.getElementById(id);let selectedKey=null,suppressClickUntil=0;
 const current=()=>pageStack(getProject(),selectedCut()?.pageId);
 const refresh=(refreshPanel=true)=>{renderPage({refreshPanel});save();};
 function selectEntry(entry){
  selectedKey=entry.key;
  if(entry.cut){entry.cut.activeLayer=entry.model.id;select(entry.cut.id);}
  else if(entry.key==='rough'){const s=current();s.base.activeLayer=s.base.roughLayerIds[0];select(s.base.id);}
  else if(entry.key==='guides'){const c=selectedCut();if(c)c.activeLayer='guide';}
  clearSelection();render();
 }
 function entries(s){
  return [...s.paints,{key:'rough',name:'페이지 러프',model:s.page.stackSettings.rough},{key:'guides',name:'3D 가이드',model:s.page.stackSettings.guides}];
 }
 function render(){
  const s=current();if(!s)return false;
  const c=selectedCut(),list=entries(s),active=list.find(e=>e.cut===c&&e.model.id===c.activeLayer);
  if(c.activeLayer==='text')selectedKey=null;else if(active)selectedKey=active.key;
  else if(c.pageBase&&s.base.roughLayerIds.includes(c.activeLayer))selectedKey='rough';
  const rows=$('layerRows');rows.replaceChildren();rows.dataset.scope='page';balloonLayerRows({cuts:s.cuts,rows,selectedCut,select,checkpoint,refresh,toast});
  const roughEye=$('pageRoughVisibility');if(roughEye){roughEye.innerHTML=eyeIcon(s.base.roughVisible!==false);roughEye.setAttribute('aria-pressed',String(s.base.roughVisible!==false));}
  if($('pageForeground'))$('pageForeground').checked=s.order.indexOf('rough')>s.order.indexOf('guides');
  box.querySelector('.guide-opacity').hidden=true;box.querySelector('.layer-appearance').hidden=!active;
  $('activeLayerBadge').textContent='페이지 전체 · '+(c.activeLayer==='text'?(c.balloonLayers?.find(l=>l.id===c.activeBalloonLayer)?.name||'말풍선'):(list.find(e=>e.key===selectedKey)?.name||'레이어 선택'));
  $('layerUp').title='레이어 위로 · 페이지 전체';$('layerDown').title='레이어 아래로 · 페이지 전체';
  for(const key of [...s.order].reverse()){
   const entry=list.find(e=>e.key===key);if(!entry)continue;
   const {model}=entry,row=document.createElement('div');row.className='paint-layer page-stack-row'+(selectedKey===key?' selected':'');row.dataset.stackKey=key;row.tabIndex=0;
   const eye=document.createElement('input');eye.type='checkbox';eye.checked=key==='rough'?s.base.roughVisible!==false:key==='guides'?s.base.pageGuidesVisible!==false:model.visible!==false;eye.setAttribute('aria-label',entry.name+' 표시');
   eye.onchange=()=>{checkpoint();if(key==='rough')s.base.roughVisible=eye.checked;else if(key==='guides')s.base.pageGuidesVisible=eye.checked;else model.visible=eye.checked;refresh();};
   const name=document.createElement('button');name.className='layer-name';const updateMeta=layerCaption(name,model,entry.name);name.title=entry.cut&&!entry.cut.pageBase?entry.cut.name+' · 드래그 또는 Alt+↑/↓로 페이지 순서 변경':'드래그 또는 Alt+↑/↓로 페이지 순서 변경';name.onclick=()=>selectEntry(entry);
   if(entry.cut){

    name.ondblclick=()=>{const input=document.createElement('input');input.value=model.name;input.setAttribute('aria-label','레이어 이름');name.replaceWith(input);input.focus();input.select();let done=false;const finish=()=>{if(done)return;done=true;const value=input.value.trim().slice(0,40);if(value&&value!==model.name){checkpoint();model.name=value;save();}render();};input.onblur=finish;input.onkeydown=e=>{if(e.key==='Escape')input.value=model.name;if(['Escape','Enter'].includes(e.key))finish();};};
   }
   const lock=document.createElement('button');lock.innerHTML=lockIcon(model.locked);lock.setAttribute('aria-label',entry.name+' 잠금');lock.setAttribute('aria-pressed',String(!!model.locked));lock.onclick=()=>{checkpoint();model.locked=!model.locked;if(key==='rough')for(const l of s.base.paintLayers.filter(l=>s.base.roughLayerIds.includes(l.id)))l.locked=model.locked;render();save();};
   const opacity=document.createElement('input');opacity.type='range';opacity.min=0;opacity.max=100;opacity.value=model.opacity??100;opacity.setAttribute('aria-label',entry.name+' 불투명도');const out=document.createElement('output');out.textContent=opacity.value+'%';let changing=false;
   opacity.oninput=()=>{if(!changing){checkpoint();changing=true;}model.opacity=+opacity.value;out.textContent=opacity.value+'%';updateMeta();refresh(false);};opacity.onchange=()=>changing=false;
   row.append(eye,name,lock,opacity,out);
   row.onkeydown=e=>{if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();selectEntry(entry);move(e.key==='ArrowUp'?1:-1);}};
   let drag=null;
   const clearDrop=()=>rows.querySelectorAll('.layer-drop').forEach(r=>r.classList.remove('layer-drop'));
   row.onpointerdown=e=>{if(e.button!==0||e.target.closest('input')||e.target.closest('button:not(.layer-name)'))return;drag={x:e.clientX,y:e.clientY,id:e.pointerId,active:false,target:null};};
   row.onpointermove=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
    drag.active=true;row.setPointerCapture(e.pointerId);e.preventDefault();clearDrop();
    drag.target=[...rows.querySelectorAll('.page-stack-row')].find(r=>{const b=r.getBoundingClientRect();return r!==row&&e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;});
    drag.target?.classList.add('layer-drop');
   };
   row.onpointerup=e=>{
    if(!drag)return;const state=drag;drag=null;clearDrop();
    if(row.hasPointerCapture(e.pointerId))row.releasePointerCapture(e.pointerId);
    if(!state.active)return;suppressClickUntil=Date.now()+300;e.preventDefault();if(!state.target)return;
    checkpoint();const b=state.target.getBoundingClientRect();placePageLayer(s,key,state.target.dataset.stackKey,e.clientY<b.top+b.height/2);selectEntry(entry);refresh();
   };
   row.onpointercancel=()=>{drag=null;clearDrop();};
   row.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
   rows.append(row);
   if(key==='rough'&&s.base.roughLayerIds.length>1){
    const details=document.createElement('details'),summary=document.createElement('summary');details.className='page-guide-details';summary.textContent='러프 세부 레이어';details.append(summary);
    for(const l of s.base.paintLayers.filter(l=>s.base.roughLayerIds.includes(l.id))){const b=document.createElement('button');b.textContent=l.name;b.onclick=()=>{s.base.activeLayer=l.id;select(s.base.id);selectedKey='rough';render();};details.append(b);}rows.append(details);
   }
   if(key==='guides'){
    const details=document.createElement('details');details.className='page-guide-details';const summary=document.createElement('summary');summary.textContent='배경 · 인물 개별 레이어';details.append(summary);
    for(const cut of s.cuts.filter(c=>!c.pageBase)){const label=document.createElement('label'),input=document.createElement('input');label.textContent=cut.name+' · 통합 가이드 '+cut.guideOpacity+'%';input.type='range';input.min=0;input.max=100;input.value=cut.guideOpacity;input.setAttribute('aria-label',cut.name+' 통합 가이드 불투명도');input.onchange=()=>{checkpoint();cut.guideOpacity=+input.value;refresh();};label.append(input);details.append(label);}
    for(const cut of s.cuts.filter(c=>!c.pageBase))for(const id of ['background','guide']){
     if(!cut[id])continue;const setting=cut.layerSettings[id],label=document.createElement('label'),check=document.createElement('input'),range=document.createElement('input');
     check.type='checkbox';check.checked=setting.visible;check.setAttribute('aria-label',cut.name+' '+(id==='background'?'배경':'인물')+' 표시');check.onchange=()=>{checkpoint();setting.visible=check.checked;refresh();};
     label.append(check,document.createTextNode(cut.name+' · '+(id==='background'?'배경':'인물')));range.type='range';range.min=0;range.max=100;range.value=setting.opacity;range.setAttribute('aria-label',cut.name+' '+(id==='background'?'배경':'인물')+' 불투명도');range.onchange=()=>{checkpoint();setting.opacity=+range.value;refresh();};label.append(range);details.append(label);
    }rows.append(details);
   }
  }
  const paper=document.createElement('div');paper.className='paper-layer-row';paper.textContent='▣ 종이';rows.append(paper);thumbnails.renderPage(s);return true;
 }
 function move(direction){const s=current();if(!s||!selectedKey)return;const i=s.order.indexOf(selectedKey);if(i+direction<0||i+direction>=s.order.length)return;checkpoint();movePageLayer(s,selectedKey,direction);refresh();}
 function action(id){
  const s=current();if(!s)return;
  if(balloonLayerAction(selectedCut(),id,checkpoint,refresh,toast))return;
  if(id==='layerUp'||id==='layerDown')return move(id==='layerUp'?1:-1);
  if(id==='newPaintLayer'){
   if(s.base.paintLayers.length>=30)return toast('페이지 레이어는 30개까지 추가할 수 있습니다.');
   checkpoint();const l={id:crypto.randomUUID(),name:nextLayerName(getProject()),opacity:100,visible:true,locked:false,keepVisible:true};s.base.paintLayers.push(l);s.base.activeLayer=l.id;selectedKey=paintKey(s.base,l.id);select(s.base.id);refresh();return;
  }
  const entry=s.paints.find(e=>e.key===selectedKey);if(!entry)return toast('일반 레이어를 선택하세요. 페이지 러프와 3D 가이드는 눈 아이콘으로 숨길 수 있습니다.');
  const {cut,model}=entry;if(model.locked)return toast('레이어 잠금을 해제하세요.');
  if(id==='deletePaintLayer'){
   if(cut.paintLayers.length===1)return toast('그리기 레이어를 한 장 이상 남겨 주세요.');
   checkpoint();cut.strokes=cut.strokes.filter(st=>(st.layerId||'rough')!==model.id);cut.paintLayers=cut.paintLayers.filter(l=>l!==model);cut.activeLayer=cut.paintLayers[0].id;selectedKey=null;refresh();
  }else if(id==='duplicatePaintLayer'){
   if(cut.paintLayers.length>=30)return toast('레이어 수가 30개를 넘습니다.');
   checkpoint();const l={...structuredClone(model),id:crypto.randomUUID(),name:model.name+' 복사'};cut.paintLayers.push(l);cut.strokes.push(...structuredClone(cut.strokes.filter(st=>(st.layerId||'rough')===model.id)).map(st=>({...st,layerId:l.id})));cut.activeLayer=l.id;selectedKey=paintKey(cut,l.id);refresh();
  }
 }
 for(const id of ['newPaintLayer','duplicatePaintLayer','deletePaintLayer','layerUp','layerDown'])$(id).addEventListener('click',e=>{if(!current())return;e.preventDefault();e.stopImmediatePropagation();action(id);},true);
 return {render};
}
