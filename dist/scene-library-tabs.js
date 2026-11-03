import {libraryWindow} from './library-window.js?v=20261029-grip3';

// One floating window owns library layout; each tab retains its filters and scroll.
export function sceneLibraryTabs(editor){
 if(editor.libraryTabs)return editor.libraryTabs;
 const host=document.createElement('section');host.id='sceneLibraryTabs';host.hidden=true;host.setAttribute('aria-label','3D 라이브러리');
 host.innerHTML='<header><nav role="tablist" aria-label="라이브러리 종류"></nav><button type="button" aria-label="현재 라이브러리 닫기">×</button></header><div class="scene-library-pages"></div>';
 document.getElementById('sceneView').append(host);
 const nav=host.querySelector('nav'),pages=host.querySelector('.scene-library-pages'),entries=new Map(),opened=new Set();let active;
 const size=libraryWindow(host,'라이브러리',{width:310,height:640});
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./scene-library-tabs.css',import.meta.url).href;document.head.append(css);
 function activate(key,focus=false){
  if(!opened.has(key))return;active=key;
  for(const [id,item]of entries){const selected=id===key;item.panel.hidden=!selected;item.tab.hidden=!opened.has(id);item.tab.setAttribute('aria-selected',String(selected));item.tab.tabIndex=selected?0:-1;item.trigger?.setAttribute('aria-expanded',String(opened.has(id)));}
  host.hidden=false;size.fit();if(focus)entries.get(key).tab.focus({preventScroll:true});
 }
 function close(key,{focus=false}={}){
  const item=entries.get(key);if(!item||!opened.delete(key))return;size.finish();item.panel.hidden=true;item.tab.hidden=true;item.trigger?.setAttribute('aria-expanded','false');
  if(active===key){active=[...opened].at(-1);if(active)activate(active,focus);else host.hidden=true;}
  if(focus&&!active)item.trigger?.focus({preventScroll:true});
 }
 host.querySelector('header>button').onclick=()=>close(active,{focus:true});
 host.addEventListener('keydown',event=>{if(event.defaultPrevented)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(active,{focus:true});}});
 nav.addEventListener('keydown',event=>{const ids=[...opened],i=ids.indexOf(active),next={ArrowRight:ids[(i+1)%ids.length],ArrowLeft:ids[(i-1+ids.length)%ids.length],Home:ids[0],End:ids.at(-1)}[event.key];if(next){event.preventDefault();activate(next,true);}});
 return editor.libraryTabs={
  register(key,label,panel,trigger){
   panel.querySelector(':scope>header')?.remove();panel.querySelector(':scope>.sky-resize')?.remove();panel.classList.add('scene-library-page');panel.setAttribute('role','tabpanel');
   const tab=document.createElement('button');tab.type='button';tab.id='library-tab-'+key;tab.textContent=label;tab.hidden=true;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);panel.setAttribute('aria-labelledby',tab.id);tab.onclick=()=>activate(key);nav.append(tab);pages.append(panel);entries.set(key,{tab,panel,trigger});
   return {open(){opened.add(key);activate(key);},close:options=>close(key,options),isOpen:()=>opened.has(key),isActive:()=>active===key&&!host.hidden};
  },
  closeAll(){for(const key of [...opened])close(key);},host
 };
}
