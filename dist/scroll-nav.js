// Navigation stays outside each scrolling surface so it is always reachable.
for (const [id, host] of [['viewport','main'],['readerScroll','#reader']]) {
  const surface=document.getElementById(id),bar=document.createElement('nav');
  bar.className='scroll-navigation';bar.setAttribute('aria-label','세로 원고 스크롤');
  bar.innerHTML='<button data-step="top" title="원고 맨 위로">⇈ <span>맨 위로</span></button><button data-step="up" title="한 화면 위로">↑</button><span class="scroll-percent">0%</span><button data-step="down" title="한 화면 아래로">↓</button><button data-step="bottom" title="원고 맨 아래로">⇊</button>';
  document.querySelector(host).append(bar);
  const bounds=()=>{if(id!=='viewport'||!document.getElementById('pasteboard'))return {top:0,bottom:surface.scrollHeight-surface.clientHeight};const paper=document.getElementById('paper'),r=paper.getBoundingClientRect(),v=surface.getBoundingClientRect(),top=surface.scrollTop+r.top-v.top-26;return {top,bottom:top+Math.max(0,r.height-surface.clientHeight+60)};};
  const update=()=>{const {top,bottom}=bounds();bar.querySelector('.scroll-percent').textContent=(bottom>top?Math.max(0,Math.min(100,Math.round((surface.scrollTop-top)/(bottom-top)*100))):0)+'%';};
  bar.addEventListener('click',e=>{const step=e.target.closest('button')?.dataset.step;if(!step)return;const limit=bounds(),top=step==='top'?limit.top:step==='bottom'?limit.bottom:surface.scrollTop+(step==='up'?-1:1)*surface.clientHeight*.85;surface.scrollTo({top,behavior:'instant'});});
  surface.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(surface);new MutationObserver(update).observe(surface,{childList:true,subtree:true});
  surface.tabIndex=0;surface.addEventListener('keydown',e=>{if(e.target!==surface)return;if(['Home','End','PageUp','PageDown'].includes(e.key)){e.preventDefault();bar.querySelector(`[data-step="${{Home:'top',End:'bottom',PageUp:'up',PageDown:'down'}[e.key]}"]`).click();}});
}
