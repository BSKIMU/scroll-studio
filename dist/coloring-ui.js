import {setupPostprocess} from './postprocess.js?v=20261025-release1';
import {addColorLayer,blendModes} from './coloring.js?v=20261025-release1';
export function setupColoringUI({box,getProject,selectedCut,checkpoint,save,redraw,render,setTool,toast}){
 setupPostprocess({box,getProject,selectedCut,checkpoint,save,redraw,render,setTool,toast});
 const controls=document.createElement('div');controls.className='coloring-layer-controls';
 controls.innerHTML='<div class="color-layer-actions"><button id="newBaseColor" title="선화 아래에 밑색을 만들고 선화를 참조로 지정">＋ 밑색</button><button id="newShadow" title="밑색 위에 곱하기 40% 음영을 만들고 밑색에 클리핑">＋ 음영</button><button id="newLight" title="밑색 위에 스크린 빛 레이어를 만들고 밑색에 클리핑">＋ 빛</button></div><label>합성<select id="paintBlend" aria-label="레이어 합성 모드"></select></label><label>클리핑<select id="paintClip" aria-label="클리핑 기준 레이어"></select></label><label class="check"><input id="paintReference" type="checkbox">채우기 참조 선화</label><small id="colorLayerScope"></small>';
 box.querySelector('.layer-actions').after(controls);
 const $=id=>document.getElementById(id),active=()=>{const c=selectedCut();return [c,c?.paintLayers.find(l=>l.id===c.activeLayer)];};
 for(const [value,label]of Object.entries(blendModes))$('paintBlend').add(new Option(label,value));
 const change=fn=>{const [c,l]=active();if(!l||l.locked)return toast('잠기지 않은 그리기 레이어를 선택하세요.');checkpoint();fn(l);redraw(c);render();save();};
 $('paintBlend').onchange=e=>change(l=>l.blendMode=e.target.value);
 $('paintClip').onchange=e=>change(l=>{if(e.target.value)l.clipTo=e.target.value;else delete l.clipTo;});
 $('paintReference').onchange=e=>change(l=>l.reference=e.target.checked);
 for(const [id,kind]of [['newBaseColor','base'],['newShadow','shadow'],['newLight','light']])$(id).onclick=()=>{
  const [c,l]=active();if(!l)return toast('먼저 선화 또는 밑색 레이어를 선택하세요.');
  if(c.paintLayers.length>=30)return toast('레이어 공간이 부족합니다.');
  checkpoint();const made=addColorLayer(getProject(),c,kind);render();redraw(c);save();setTool(kind==='base'?'fill':'lassofill');toast((c.pageBase?'페이지 전체':c.name)+' · '+made.name+' 준비');
 };
 return {update(){
  const [c,l]=active();controls.hidden=!l;if(!l)return;
  $('paintBlend').value=l.blendMode||'normal';$('paintReference').checked=!!l.reference;
  const clip=$('paintClip');clip.replaceChildren(new Option('없음',''));
  for(const base of c.paintLayers){if(base===l)continue;let p=base,cyclic=false;const seen=new Set();while(p?.clipTo&&!seen.has(p.id)){seen.add(p.id);if(p.clipTo===l.id){cyclic=true;break;}p=c.paintLayers.find(x=>x.id===p.clipTo);}if(!cyclic)clip.add(new Option(base.name,base.id));}
  clip.value=l.clipTo||'';for(const id of ['paintBlend','paintClip','paintReference'])$(id).disabled=l.locked;
  $('colorLayerScope').textContent=(c.pageBase?'페이지 전체':c.name)+' · '+l.name+(l.clipTo?' · 밑색 안에만 칠해집니다':'');
 }};
}
