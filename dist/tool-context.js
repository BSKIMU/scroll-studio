import {brushTools} from './tool-policy.js?v=20261025-release1';
import {toolIcon} from './tool-icons.js?v=20261025-release1';
import {shapeTools} from './shape-tools.js?v=20261025-release1';
export function setupToolContext(getTool,setTool){
 const $=id=>document.getElementById(id),pane=$('drawingTools'),sub=document.createElement('div');
 sub.id='lassoSubtools';sub.innerHTML='<b>올가미</b><div class="two"><button data-lasso="lasso">선택 · 이동</button><button data-lasso="lassofill">올가미 채색</button></div><p>영역을 둘러싸세요. 채색은 현재 색으로 채웁니다.</p>';
 pane.querySelector('.palette-body').prepend(sub);sub.querySelectorAll('button').forEach(b=>b.onclick=()=>setTool(b.dataset.lasso));
 const figures=document.createElement('div');figures.id='figureSubtools';figures.innerHTML='<b>도형</b><div class="figure-options">'+[['line','직선'],['curve','곡선'],['rect','직사각형'],['ellipse','타원']].map(([id,name])=>`<button data-figure="${id}" aria-pressed="false">${toolIcon(id)}<span>${name}</span></button>`).join('')+'</div><label id="curveBendField">굽힘 <output id="curveBendValue">40%</output><input id="curveBend" aria-label="곡선 굽힘" type="range" min="-100" max="100" value="40"></label><p id="figureHint">드래그해서 도형을 그리세요.</p>';
 sub.after(figures);figures.querySelectorAll('[data-figure]').forEach(b=>b.onclick=()=>setTool(b.dataset.figure));$('curveBend').oninput=()=>$('curveBendValue').textContent=$('curveBend').value+'%';
 const hide=(el,value)=>el?.classList.toggle('context-hidden',value);
 function update(){const t=getTool(),frame=$('paper').classList.contains('frame-drawing'),figure=shapeTools.includes(t),brush=brushTools.includes(t)||figure,lasso=['lasso','lassofill'].includes(t),color=['draw','brush','airbrush','eyedropper','lassofill','fill'].includes(t)||figure,object=t==='select'||t==='pan';
  hide($('colorWheelPanel'),!color);hide($('colorPalettePanel'),!color);hide($('cutPanel'),!object&&!frame);hide($('roughPanel'),true);hide(document.querySelector('.sidebar-quick-actions'),false);hide($('libraryBtn'),!object||frame);hide(pane,!(brush||lasso||t==='fill'||t==='eyedropper'));
  for(const [id,n]of [['colorWheelPanel',-3],['colorPalettePanel',-2],['drawingTools',-1]])$(id).style.order=brush||lasso||t==='fill'||t==='eyedropper'?n:'';hide($('balloonTools'),!['text','balloon'].includes(t));pane.dataset.context=t;sub.hidden=!lasso;sub.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.lasso===t));
  for(const id of ['penFields','brushPreview'])hide($(id),!brush);
  $('fillControls').hidden=t!=='fill';figures.hidden=!figure;$('curveBendField').hidden=t!=='curve';$('figureHint').textContent=t==='curve'?'드래그해서 곡선을 그리세요. 굽힘으로 방향과 곡률을 조절합니다.':'드래그해서 도형을 그리세요.';figures.querySelectorAll('[data-figure]').forEach(b=>{const on=b.dataset.figure===t;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  hide($('brushPreset').closest('label'),!brush||t==='erase'||figure);hide($('brushSmoothing').closest('label'),!brush||figure);hide(pane.querySelector('.brush-advanced'),!brush||figure);hide($('brushPreview'),!brush||figure);hide($('brushOpacity').closest('label'),t==='lasso'||t==='eyedropper');hide($('penAntialias')?.closest('label'),t==='eyedropper');
  for(const el of pane.querySelectorAll('.drawing-shapes,#importBrush,#brushNotice,.drawing-assist-options'))hide(el,t==='erase');$('balloonTools').style.order=['text','balloon'].includes(t)?-4:'';const title=pane.querySelector('.palette-handle');title.textContent='⠿ '+({draw:'펜',brush:'붓',airbrush:'에어브러시',eyedropper:'스포이드',erase:'지우개',lasso:'올가미',lassofill:'올가미 채색',fill:'채우기'}[t]||'펜 · 브러시');
  if(figure)pane.querySelector('.palette-handle').textContent='⠿ 도형';$('brushSizeName').textContent=figure?'도형 선 크기':'브러시 크기';$('penSize').setAttribute('aria-label',figure?'도형 선 크기':'브러시 크기');
  document.dispatchEvent(new Event('palette-context-change'));
 }
 document.addEventListener('tool-change',update);new MutationObserver(update).observe($('paper'),{attributes:true,attributeFilter:['class']});update();
}
