import {layerCaption,lockIcon} from './layer-row-label.js?v=20261025-release1';
import {ensureBalloonLayers,newBalloonLayer} from './balloon-model.js?v=20261025-release1';

export function balloonLayerRows({cuts,rows,selectedCut,select,checkpoint,refresh,toast}){
 const current=selectedCut();
 for(const cut of [...cuts].reverse())for(const layer of [...ensureBalloonLayers(cut)].reverse()){
  const row=document.createElement('div');row.className='paint-layer balloon-layer-row'+(current===cut&&cut.activeLayer==='text'&&cut.activeBalloonLayer===layer.id?' selected':'');
  row.dataset.balloonCut=cut.id;row.dataset.balloonLayer=layer.id;
  const eye=document.createElement('input');eye.type='checkbox';eye.checked=layer.visible!==false;eye.setAttribute('aria-label',layer.name+' 표시');
  eye.onchange=()=>{checkpoint();layer.visible=eye.checked;refresh();};
  const name=document.createElement('button');name.className='layer-name';layerCaption(name,layer,layer.name);name.onclick=()=>{cut.activeLayer='text';cut.activeBalloonLayer=layer.id;select(cut.id);document.dispatchEvent(new Event('balloon-layer-selected'));refresh();};
  name.ondblclick=()=>{const input=document.createElement('input');input.value=layer.name;name.replaceWith(input);input.focus();input.select();input.onblur=()=>{checkpoint();layer.name=input.value.trim().slice(0,40)||'말풍선';refresh();};input.onkeydown=e=>{if(e.key==='Enter')input.blur();};};
  const lock=document.createElement('button');lock.innerHTML=lockIcon(layer.locked);lock.setAttribute('aria-label',layer.name+' 잠금');lock.onclick=()=>{checkpoint();layer.locked=!layer.locked;refresh();};
  const range=document.createElement('input');range.type='range';range.min=0;range.max=100;range.value=layer.opacity??100;range.setAttribute('aria-label',layer.name+' 불투명도');const out=document.createElement('output');out.textContent=range.value+'%';range.onchange=()=>{checkpoint();layer.opacity=+range.value;refresh();};
  row.append(eye,name,lock,range,out);rows.append(row);
 }
 if(current?.activeLayer==='text'){
  const controls=document.createElement('div');controls.className='layer-compact-actions';
  const add=document.createElement('button');add.textContent='＋ 말풍선';add.onclick=()=>{checkpoint();newBalloonLayer(current);document.dispatchEvent(new CustomEvent('balloon-layer-selected',{detail:{create:true}}));refresh();};
  const merge=document.createElement('button');merge.textContent='아래와 합치기';merge.title='두 말풍선 레이어를 합쳐 겹친 내부 경계를 지웁니다.';
  merge.onclick=()=>{const layers=ensureBalloonLayers(current),at=layers.findIndex(l=>l.id===current.activeBalloonLayer);if(at<1)return toast('합칠 아래 말풍선 레이어가 없습니다.');const source=layers[at],target=layers[at-1];if(source.locked||target.locked)return toast('말풍선 레이어 잠금을 해제하세요.');checkpoint();for(const b of current.bubbles)if(b.balloonLayerId===source.id)b.balloonLayerId=target.id;layers.splice(at,1);current.activeBalloonLayer=target.id;refresh();};controls.append(add,merge);rows.append(controls);
 }
}
export function balloonLayerAction(c,id,checkpoint,refresh,toast){
 if(c?.activeLayer!=='text')return false;
 const layers=ensureBalloonLayers(c),at=layers.findIndex(l=>l.id===c.activeBalloonLayer),layer=layers[at];
 if(id==='newPaintLayer')return false;
 if(!layer)return false;
 if(layer.locked){toast('말풍선 레이어 잠금을 해제하세요.');return true;}
 if(id==='layerUp'||id==='layerDown'){
  const next=at+(id==='layerUp'?1:-1);if(next>=0&&next<layers.length){checkpoint();[layers[at],layers[next]]=[layers[next],layers[at]];refresh();}
 }else if(id==='deletePaintLayer'){checkpoint();c.bubbles=c.bubbles.filter(b=>b.balloonLayerId!==layer.id);layers.splice(at,1);c.activeBalloonLayer=layers[Math.max(0,at-1)]?.id;refresh();}
 else if(id==='duplicatePaintLayer'){checkpoint();const copy=newBalloonLayer(c);copy.name=layer.name+' 복사';c.bubbles.push(...structuredClone(c.bubbles.filter(b=>b.balloonLayerId===layer.id)).map(b=>({...b,balloonLayerId:copy.id})));refresh();}
 return true;
}
