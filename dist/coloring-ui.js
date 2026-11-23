import {setupPostprocess} from './postprocess.js?v=20261028-guide3';
import {blendModes} from './coloring.js?v=20261028-guide3';
export function setupColoringUI({box,getProject,selectedCut,checkpoint,save,redraw,render,setTool,toast}){
 setupPostprocess({box,getProject,selectedCut,checkpoint,save,redraw,render,setTool,toast});
 const controls=document.createElement('details');controls.className='coloring-layer-controls';
 controls.innerHTML='<summary>레이어 속성</summary><label><select id="paintBlend" aria-label="레이어 합성 모드"></select></label><label title="선택한 레이어의 그림 범위 안에만 칠합니다">칠할 범위<select id="paintClip" aria-label="클리핑 기준 레이어"></select></label><label class="check"><input id="paintReference" type="checkbox">채우기 참조 선화</label>';
 box.querySelector('.layer-actions').after(controls);
 const $=id=>document.getElementById(id),active=()=>{const c=selectedCut();return [c,c?.paintLayers.find(l=>l.id===c.activeLayer)];};
 for(const [value,label]of Object.entries(blendModes))$('paintBlend').add(new Option(label,value));
 const change=fn=>{const [c,l]=active();if(!l||l.locked)return toast('잠기지 않은 그리기 레이어를 선택하세요.');checkpoint();fn(l);redraw(c);render();save();};
 $('paintBlend').onchange=e=>change(l=>l.blendMode=e.target.value);
 const quick=document.createElement('div');quick.className='layer-quick-controls';quick.append($('paintBlend').closest('label'));const opacity=document.createElement('label');opacity.innerHTML='<input id="layerQuickOpacity" type="range" min="0" max="100" aria-label="선택 레이어 불투명도"><output id="layerQuickOpacityValue">100%</output>';quick.append(opacity);box.querySelector('#layerRows').before(quick);
 let opacityEditing=false;const opacityInput=$('layerQuickOpacity');opacityInput.oninput=()=>{const [c,l]=active();if(!l||l.locked)return;if(!opacityEditing){checkpoint();opacityEditing=true;}l.opacity=+opacityInput.value;$('layerQuickOpacityValue').textContent=l.opacity+'%';redraw(c);};opacityInput.onchange=()=>{opacityEditing=false;render();save();};opacityInput.onblur=()=>{if(opacityEditing){opacityEditing=false;render();save();}};

 $('paintClip').onchange=e=>change(l=>{if(e.target.value)l.clipTo=e.target.value;else delete l.clipTo;});
 $('paintReference').onchange=e=>change(l=>l.reference=e.target.checked);
 return {update(){
  const [c,l]=active();controls.hidden=!l;quick.hidden=!l;if(!l)return;opacityInput.value=l.opacity??100;opacityInput.disabled=!!l.locked;$('layerQuickOpacityValue').textContent=(l.opacity??100)+'%';
  $('paintBlend').value=l.blendMode||'normal';$('paintReference').checked=!!l.reference;
  const clip=$('paintClip');clip.replaceChildren(new Option('제한 없음',''));
  for(const base of c.paintLayers){if(base===l)continue;let p=base,cyclic=false;const seen=new Set();while(p?.clipTo&&!seen.has(p.id)){seen.add(p.id);if(p.clipTo===l.id){cyclic=true;break;}p=c.paintLayers.find(x=>x.id===p.clipTo);}if(!cyclic)clip.add(new Option(base.name,base.id));}
  clip.value=l.clipTo||'';for(const id of ['paintBlend','paintClip','paintReference'])$(id).disabled=l.locked;
 }};
}
