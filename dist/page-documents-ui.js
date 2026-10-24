import {createPageDocuments,editorSpreads,viewPages,viewLabel,pageName} from './page-documents.js?v=20261025-release1';
import {appendComicGuides} from './comic-format.js?v=20261025-release1';

export function setupPageDocuments(api){
 const state=createPageDocuments(),paper=document.getElementById('paper'),viewport=document.getElementById('viewport');
 const strip=document.createElement('div');strip.id='pageDocumentBar';strip.hidden=true;
 strip.innerHTML='<div id="pageDocumentTabs" role="tablist" aria-label="열어 둔 페이지"></div><label class="page-jump-label">이동<select id="pageJump" aria-label="작업할 페이지"></select></label><button id="pageSpreadToggle" title="현재 페이지를 두 면 펼침 / 한 면으로 보기">두 면</button>';
 document.getElementById('frameTools').before(strip);
 const surface=document.createElement('div');surface.id='pageSurface';paper.before(surface);surface.append(paper);
 const neighbor=document.createElement('button');neighbor.id='pageNeighbor';neighbor.hidden=true;surface.append(neighbor);
 const status=document.createElement('div');status.id='pageSpreadStatus';status.hidden=true;surface.before(status);
 const tabs=strip.querySelector('#pageDocumentTabs'),jump=strip.querySelector('#pageJump'),toggle=strip.querySelector('#pageSpreadToggle');
 let epoch=0,stamp='',focusKey=null;
 function open(id,spread=false,fit=false){const wasSpread=state.active?.spread;state.open(api.getProject(),id,spread);api.jump(id,0,true);if(fit||wasSpread!==spread)document.getElementById('fitWidth').click();}
 jump.onchange=()=>open(jump.value);
 toggle.onclick=()=>open(api.getProject().activePage,!state.active?.spread,true);
 function render(p,z){
  strip.hidden=!p.pages;document.body.classList.toggle('comic-page-mode',p.format==='comic'&&!!p.pages);
  const wasComic=strip.dataset.comic==='true';strip.dataset.comic=String(p.format==='comic');if(p.format==='comic'&&!wasComic)document.querySelector('#pageOverview.side-minimized .sidebar-restore')?.click();
  const {active}=state.sync(p);if(!p.pages){surface.classList.remove('spread-surface');neighbor.hidden=status.hidden=true;return;}
  tabs.replaceChildren();for(const tab of state.tabs){
   const item=document.createElement('div');item.className='page-document'+(tab===active?' active':'');
   const button=document.createElement('button');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(tab===active));button.tabIndex=tab===active?0:-1;button.textContent=viewLabel(p,tab);button.title=(p.title||'원고')+' · '+button.textContent;button.dataset.pageId=tab.pageId;
   button.onclick=()=>open(tab.pageId,tab.spread);button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=state.tabs.indexOf(tab),n=state.tabs.length,index=e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowRight'?1:-1)+n)%n,t=state.tabs[index];open(t.pageId,t.spread);tabs.querySelector('[aria-selected=true]')?.focus();};
   const close=document.createElement('button');close.className='page-tab-close';close.textContent='×';close.title='탭 닫기 · 원고는 유지됩니다';close.setAttribute('aria-label',viewLabel(p,tab)+' 탭 닫기');close.disabled=state.tabs.length===1;close.onclick=()=>{const next=state.close(p,tab.key);open(next.pageId,next.spread);};
   item.append(button,close);tabs.append(item);
  }
  if(focusKey!==active?.key){focusKey=active?.key;tabs.querySelector('.active')?.scrollIntoView({block:'nearest',inline:'nearest'});}
  for(const bt of document.querySelectorAll('#pageThumbnails [data-page-id]')){bt.classList.toggle('active',bt.dataset.pageId===p.activePage);bt.setAttribute('aria-current',String(bt.dataset.pageId===p.activePage));}
  jump.replaceChildren();for(const pg of p.pages){const opt=document.createElement('option');opt.value=pg.id;opt.textContent=`${pageName(p,pg)} / ${p.pages.length}`;jump.append(opt);}jump.value=p.activePage;
  toggle.hidden=p.format!=='comic';toggle.textContent=active?.spread?'한 면':'두 면';toggle.setAttribute('aria-pressed',String(!!active?.spread));
  const pair=active?.spread?viewPages(p,active):[],two=p.format==='comic'&&pair.length===2;
  surface.classList.toggle('spread-surface',two);neighbor.hidden=status.hidden=!two;
  if(!two){epoch++;stamp='';neighbor.querySelector('canvas')?.remove();return;}
  const activeSide=pair[0]?.id===p.activePage?'left':'right',other=pair[activeSide==='left'?1:0];
  paper.style.order=activeSide==='left'?0:1;neighbor.style.order=activeSide==='left'?1:0;
  Object.assign(neighbor.style,{width:p.width*z+'px',height:p.pageHeight*z+'px'});
  neighbor.disabled=!other;neighbor.setAttribute('aria-label',other?`${pageName(p,other)} 페이지 편집으로 전환`:'빈 면');
  neighbor.onclick=()=>other&&open(other.id,true);
  status.textContent=`${viewLabel(p,active)} · 편집 중: ${pageName(p,p.pages.find(pg=>pg.id===p.activePage))} · 옆 면을 클릭하면 편집 전환`;
  const token=++epoch,key=[other?.id,p.width,p.pageHeight,p.comic?.showGuides,p.comic?.binding,p.comic?.firstSide].join(':');
  if(stamp===key&&neighbor.querySelector('canvas'))return;stamp=key;neighbor.replaceChildren();
  if(other){neighbor.textContent='불러오는 중…';api.renderPage(other,1280).then(cv=>{if(token!==epoch){cv.width=1;return;}neighbor.replaceChildren(cv);appendComicGuides({...p,activePage:other.id},neighbor);}).catch(()=>{if(token===epoch){stamp='';neighbor.textContent='미리보기 다시 열기';}});}
  else neighbor.textContent='빈 면';
 }
 return {state,render,open,spreads:()=>editorSpreads(api.getProject()),get spread(){return !!state.active?.spread;}};
}
