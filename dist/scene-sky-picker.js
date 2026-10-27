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
 const grip=panel.querySelector('.sky-resize');let drag=null;
 function size(width,height){panel.style.width=Math.min(view.clientWidth-64,Math.max(160,width))+'px';panel.style.height=Math.min(view.clientHeight-75,Math.max(220,height))+'px';}
 function finish(cancel=false){if(!drag)return;const previous=drag;drag=null;if(cancel)size(previous.width,previous.height);if(grip.hasPointerCapture(previous.id))grip.releasePointerCapture(previous.id);}
 grip.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();grip.focus({preventScroll:true});drag={id:event.pointerId,x:event.clientX,y:event.clientY,width:panel.offsetWidth,height:panel.offsetHeight};grip.setPointerCapture(event.pointerId);};
 grip.onpointermove=event=>{if(!drag||event.pointerId!==drag.id)return;event.preventDefault();event.stopPropagation();size(drag.width+drag.x-event.clientX,drag.height+event.clientY-drag.y);};
 grip.onpointerup=event=>{event.stopPropagation();finish();};grip.onpointercancel=()=>finish(true);grip.onlostpointercapture=()=>finish();
 grip.onkeydown=event=>{if(event.key==='Escape'&&drag){event.preventDefault();event.stopPropagation();finish(true);return;}const delta={ArrowLeft:[10,0],ArrowRight:[-10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];if(!delta)return;event.preventDefault();event.stopPropagation();size(panel.offsetWidth+delta[0],panel.offsetHeight+delta[1]);};
 window.addEventListener('blur',()=>finish());
 function close(focus=true){finish();panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true});}
 function sync(){const card=cards.find(c=>c.dataset.sky===select.value)||cards[0];trigger.replaceChildren(card.querySelector('img').cloneNode(),document.createTextNode(card.querySelector('b').textContent+' ▾'));for(const c of cards)c.setAttribute('aria-pressed',String(c===card));}
 trigger.onclick=()=>{if(!panel.hidden){close();return;}editor.fly?.finish(true);editor.figurePicker?.close();panel.hidden=false;trigger.setAttribute('aria-expanded','true');(cards.find(c=>c.dataset.sky===select.value)||cards[0]).focus();};
 panel.querySelector('header button').onclick=()=>close();panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}if(event.key==='Tab'){const buttons=[...panel.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(event.shiftKey&&i===0||!event.shiftKey&&i===buttons.length-1){event.preventDefault();buttons[event.shiftKey?buttons.length-1:0].focus();}}});
 document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!trigger.contains(event.target))close(false);},true);
 sync();return {sync,close:()=>close(false)};
}
