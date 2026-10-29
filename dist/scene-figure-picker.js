import {figureModels,defaultPerson,customFigures,refreshCharacterCatalog,loadFigureModel} from './mannequin.js?v=20261029-hands2';

export function setupFigurePicker(editor){
 const trigger=document.getElementById('addPerson'),view=document.getElementById('sceneView'),panel=document.createElement('section');
 panel.className='figure-picker';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','인물 가이드 선택');panel.id='figurePicker';trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','false');
 const heading=document.createElement('header'),title=document.createElement('b'),close=document.createElement('button');title.textContent='인물 가이드';close.textContent='×';close.setAttribute('aria-label','인물 선택 닫기');heading.append(title,close);panel.append(heading);
 const grid=document.createElement('div');grid.className='figure-picker-grid';panel.append(grid);
 function populate(){grid.replaceChildren();for(const [key,name]of Object.entries(figureModels)){
  const card=document.createElement('button'),img=document.createElement('img'),label=document.createElement('b'),hint=document.createElement('small');
  card.className='figure-card';card.setAttribute('aria-label',name+' 인물 추가');img.src=new URL(`./assets/portraits/${customFigures.has(key)?'mixamo':key}.png`,import.meta.url).href;img.alt=customFigures.has(key)?'사용자 캐릭터 표시 아이콘':'';img.loading='lazy';label.textContent=name;hint.textContent=customFigures.has(key)?'내 캐릭터 · 로컬':key==='mixamo'?'동작 · 175 cm':key==='bodykun'?'180 cm':'165 cm';card.append(img,label,hint);grid.append(card);
  card.onclick=async()=>{if(!editor.isOpen||editor.loading)return;editor.movement.stop();card.disabled=true;const state=editor.state;try{await loadFigureModel(key);if(editor.state!==state||!editor.isOpen)return;const person=defaultPerson(key),current=editor.state.people[editor.index];Object.assign(person,{x:(current?.x??0)+.7,y:current?.y??0,z:current?.z??0});editor.state.people.push(person);editor.index=editor.state.people.length-1;hide();editor.updatePeople();editor.flush();}catch(error){note.textContent=error.message;}finally{card.disabled=false;}};
 }}populate();
 const note=document.createElement('p');note.textContent='인물을 선택하면 현재 장면에 추가합니다.';panel.append(note);view.append(panel);
 function hide(focus=true){if(panel.hidden)return;panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true});}
 trigger.onclick=async()=>{if(!editor.isOpen||editor.loading)return;if(!panel.hidden){hide();return;}editor.fly?.finish(true);panel.hidden=false;trigger.setAttribute('aria-expanded','true');populate();grid.querySelector('button').focus({preventScroll:true});await refreshCharacterCatalog();if(!panel.hidden)populate();};
 close.onclick=()=>hide();document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!trigger.contains(e.target))hide(false);},true);
 panel.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();hide();}if(e.code==='Tab'){const buttons=[...panel.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(e.shiftKey&&i===0||!e.shiftKey&&i===buttons.length-1){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0].focus();}}});
 return {close:()=>hide(false)};
}
