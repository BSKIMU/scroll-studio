import {balloonPresets,presetStyle} from './balloon-presets.js?v=20261025-release1';
export function createBalloonPresetPicker(anchor,apply,draw){
 const launch=document.createElement('button');launch.id='balloonExamples';launch.type='button';launch.textContent='상황별 예시 16종';launch.className='full';anchor.after(launch);
 const dialog=document.createElement('dialog');dialog.id='balloonPresetDialog';dialog.setAttribute('aria-labelledby','balloonPresetTitle');
 const head=document.createElement('div');head.className='balloon-preset-head';const title=document.createElement('h2');title.id='balloonPresetTitle';title.textContent='상황별 말풍선';const close=document.createElement('button');close.textContent='닫기';close.onclick=()=>dialog.close();head.append(title,close);
 const intro=document.createElement('p');intro.textContent='모양·선·꼬리·글꼴을 함께 적용합니다. 선택된 말풍선의 대사는 그대로 유지됩니다.';
 const grid=document.createElement('div');grid.className='balloon-preset-grid';
 for(const p of balloonPresets){const card=document.createElement('button'),cv=document.createElement('canvas'),label=document.createElement('b'),hint=document.createElement('span');card.type='button';card.setAttribute('aria-label',p.label+' 예시 적용');cv.width=320;cv.height=200;cv.setAttribute('aria-hidden','true');label.textContent=p.label;hint.textContent=p.hint;draw(cv.getContext('2d'),{...presetStyle(p,5),font:p.style.font*2,x:.12,y:.11,w:.76,h:.64,text:p.text},320,200);card.append(cv,label,hint);card.onclick=()=>{apply(p);dialog.close();};grid.append(card);}
 const foot=document.createElement('p');foot.className='balloon-preset-foot';const examples=document.createElement('a');examples.href='./balloon-examples.html';examples.target='_blank';examples.rel='noopener';examples.textContent='예시 시트 · PNG / 편집용 원고';foot.append(examples);dialog.append(head,intro,grid,foot);document.body.append(dialog);launch.onclick=()=>dialog.showModal();return launch;
}
