import {sceneLibraryTabs} from './scene-library-tabs.js';
export function setupSkyPicker(editor,select,presets){
 const trigger=document.createElement('button');trigger.id='chooseSky';trigger.className='sky-picker-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
 select.hidden=true;select.after(trigger);
 const panel=document.createElement('section');panel.className='figure-picker sky-picker';panel.hidden=true;panel.id='skyPicker';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','하늘 선택');trigger.setAttribute('aria-controls',panel.id);
 panel.innerHTML='<header><b>하늘</b><button aria-label="하늘 선택 닫기">×</button></header><div class="sky-picker-scroll"><div class="figure-picker-grid"></div><p>구형 미리보기를 눌러 360° 하늘을 적용하세요.</p></div><button class="sky-resize" aria-label="하늘 창 왼쪽 아래 크기 조절" title="왼쪽으로 넓히기 · 아래로 높이 늘리기 · 방향키로 미세 조절"></button>';
 const grid=panel.querySelector('.figure-picker-grid'),cards=[];
 for(const [id,title,preview]of [['','단색 배경'],...presets.filter(p=>!p[0].startsWith('cloud-')).map(p=>[p[0],p[1].replace('HDRI 하늘 · ',''),p[9]])]){
  const card=document.createElement('button'),img=document.createElement('img'),name=document.createElement('b');card.className='figure-card sky-card';card.setAttribute('aria-label',title+' 하늘 적용');card.dataset.sky=id;img.alt='';img.loading='lazy';img.src=new URL(preview||'./assets/sky-previews/'+(id||'none')+'.webp',import.meta.url).href;name.textContent=title;card.append(img,name);grid.append(card);cards.push(card);
  card.onclick=()=>{select.value=id;select.onchange();sync();close();};
 }
 const view=document.getElementById('sceneView');view.append(panel);
 const libraryTab=sceneLibraryTabs(editor).register('sky','하늘',panel,trigger);
 function close(focus=true){libraryTab.close({focus});}
 function sync(){const card=cards.find(c=>c.dataset.sky===select.value)||cards[0];trigger.replaceChildren(card.querySelector('img').cloneNode(),document.createTextNode(card.querySelector('b').textContent+' ▾'));for(const c of cards)c.setAttribute('aria-pressed',String(c===card));}
 trigger.onclick=()=>{if(libraryTab.isActive()){close();return;}editor.fly?.finish(true);editor.figurePicker?.close();libraryTab.open();(cards.find(c=>c.dataset.sky===select.value)||cards[0]).focus({preventScroll:true});};
 sync();return {sync,close:()=>close(false)};
}
