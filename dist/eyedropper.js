import {elementPoint} from './canvas-coordinates.js?v=20261025-release1';
import {pageDisplayLayers,refreshPageComposite} from './page-layer-view.js?v=20261028-guide3';
import {compositeStack} from './layer-compositor.js?v=20261025-release1';
export function setupEyedropper({getTool,setTool,selectedCut,toast}){
 const paper=document.getElementById('paper'),pane=document.getElementById('drawingTools'),controls=document.createElement('div');controls.id='eyedropperControls';controls.hidden=true;controls.innerHTML='<label>색 참조<select id="eyedropperSource"><option value="visible">표시된 모든 레이어</option><option value="current">현재 그리기 레이어</option></select></label><label class="check"><input id="eyedropperReturn" type="checkbox" checked>색 선택 후 이전 도구로</label><small>단축키 I · 그리는 중 Alt+클릭도 사용 가능</small><output id="eyedropperValue"></output>';pane.querySelector('.palette-body').prepend(controls);let previous='draw';
 document.addEventListener('tool-change',()=>{controls.hidden=getTool()!=='eyedropper';if(!controls.hidden)return;if(['draw','brush','airbrush','fill','lassofill'].includes(getTool()))previous=getTool();});
 paper.addEventListener('pointerdown',e=>{if(e.button!==0||!(getTool()==='eyedropper'||e.altKey&&['draw','brush','airbrush','erase','fill'].includes(getTool())))return;e.preventDefault();e.stopImmediatePropagation();
  const cv=document.createElement('canvas');cv.width=cv.height=1;const ctx=cv.getContext('2d',{willReadFrequently:true}),p=elementPoint(paper,e),x=p[0]*paper.clientWidth,y=p[1]*paper.clientHeight,current=document.getElementById('eyedropperSource').value==='current',c=selectedCut();
  if(!current){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1,1);}
  const layers=pageDisplayLayers(paper).filter(el=>!current||el.dataset.cut===c?.id&&el.dataset.layer===c?.activeLayer);
  // Use original layer surfaces, so the color is independent of preview resolution.
  compositeStack(ctx,layers.map(el=>({...el.layerDescriptor,opacity:current?1:el.layerDescriptor?.opacity,folders:current?[]:el.layerDescriptor?.folders,hidden:current?false:el.layerDescriptor?.hidden,blendMode:current?'normal':el.layerDescriptor?.blendMode,args:[el.offsetLeft-x,el.offsetTop-y,el.clientWidth,el.clientHeight]})));
  if(!layers.length&&!current)for(const wrap of paper.querySelectorAll('.panel-wrap')){const src=wrap.querySelector('canvas');if(src)ctx.drawImage(src,wrap.offsetLeft-x,wrap.offsetTop-y,wrap.clientWidth,wrap.clientHeight);}
  if(!current)for(const plane of paper.querySelectorAll('.balloon-plane'))for(const src of plane.querySelectorAll('canvas'))ctx.drawImage(src,plane.offsetLeft+src.offsetLeft-x,plane.offsetTop+src.offsetTop-y,src.clientWidth,src.clientHeight);
  const pixel=ctx.getImageData(0,0,1,1).data;if(!pixel[3])return toast('현재 레이어의 투명한 부분입니다.');const hex='#'+Array.from(pixel.slice(0,3),v=>v.toString(16).padStart(2,'0')).join(''),color=document.getElementById('penColor');color.value=hex;color.dispatchEvent(new Event('input'));document.getElementById('eyedropperValue').textContent=hex.toUpperCase();if(getTool()==='eyedropper'&&document.getElementById('eyedropperReturn').checked)setTool(previous);
 },true);
}
