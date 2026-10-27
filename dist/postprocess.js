import {pageStack} from './page-layer-stack.js?v=20261028-guide3';
export function drawFade(ctx,s,w,h){
 const vertical=['top','bottom'].includes(s.edge),reverse=['bottom','right'].includes(s.edge),length=Math.max(.001,Math.min(1,s.length||.25));
 const end=vertical?h:w,start=reverse?end:0,stop=reverse?end*(1-length):end*length;
 const g=ctx.createLinearGradient(vertical?0:start,vertical?start:0,vertical?0:stop,vertical?stop:0);
 g.addColorStop(0,s.color||'#ffffff');g.addColorStop(1,(s.color||'#ffffff')+'00');ctx.fillStyle=g;
 if(vertical)ctx.fillRect(0,reverse?stop:0,w,end*length);else ctx.fillRect(reverse?stop:0,0,end*length,h);
}
export function setupPostprocess({box,getProject,selectedCut,checkpoint,save,redraw,render,setTool,toast}){
 const pane=document.createElement('details');pane.className='postprocess-tools';
 pane.innerHTML='<summary>후보정 · 흰색 페이드 / 에어브러시</summary><label>방향<select id=fadeEdge><option value=top>위에서 흰색으로</option><option value=bottom>아래에서 흰색으로</option><option value=left>왼쪽에서 흰색으로</option><option value=right>오른쪽에서 흰색으로</option></select></label><label>길이 px<input id=fadeLength type=number min=1 max=12000 value=200></label><div class=two><button id=addWhiteFade>흰색 페이드 추가</button><button id=whiteAirbrush>흰색 에어브러시</button></div>';
 box.append(pane);const $=id=>document.getElementById(id);
 function make(name){
  const c=selectedCut();if(!c)return;
  if(c.paintLayers.length>=30){toast('레이어 공간이 부족합니다.');return;}
  checkpoint();const layer={id:crypto.randomUUID(),name,visible:true,opacity:100,locked:false,keepVisible:true,blendMode:'normal'};
  c.paintLayers.push(layer);c.activeLayer=layer.id;pageStack(getProject(),c.pageId);return {c,layer};
 }
 $('addWhiteFade').onclick=()=>{const made=make('흰색 페이드');if(!made)return;const {c,layer}=made,edge=$('fadeEdge').value,extent=['top','bottom'].includes(edge)?c.height:getProject().width*c.width/100;c.strokes.push({layerId:layer.id,kind:'fade',edge,length:Math.min(1,Math.max(1,+$('fadeLength').value)/extent),points:[[0,0,1],[1,1,1]],size:1,opacity:100,color:'#ffffff'});render();redraw(c);save();toast('별도 레이어에 페이드 추가 · 눈 / 불투명도로 조절');};
 $('whiteAirbrush').onclick=()=>{const made=make('흰색 에어브러시');if(!made)return;render();save();setTool('draw');const select=$('brushPreset'),option=[...select.options].find(o=>o.text==='에어브러시');select.value=option.value;select.dispatchEvent(new Event('change'));for(const [id,value]of [['penColor','#ffffff'],['penSize',500],['brushOpacity',60]]){$(id).value=value;$(id).dispatchEvent(new Event('input'));}toast('흰색 에어브러시 · 가장자리를 가로로 쓸어 주세요.');};
}
