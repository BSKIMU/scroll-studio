import {setupSceneSplitter} from './scene-splitter.js?v=20261026-walk2';
const tabIcons={
 '인물':'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 21v-3a8 8 0 0 1 16 0v3z',
 '소품':'m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10',
 '배경':'M2 4h20v16H2zM3 18l6-7 4 4 3-3 6 7M16 7h1',
 '움직임':'M15 3a1.5 1.5 0 1 0 .1 0M5 13l4-5 5 1 3 4h4M13 10l-3 6-7 4m8-5 5 2 2 5',
 '카메라':'M2 7h5l2-3h6l2 3h5v13H2zM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
 '스타일':'m4 16 12-12 4 4L8 20l-6 2zM14 6l4 4',
 '톤·렌더':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18m3-16v14m3-12v10',
 '광원':'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
 '레이어':'m2 7 10-5 10 5-10 5zM2 12l10 5 10-5M2 17l10 5 10-5'
};
export function sceneTab(name,panel,onOpen){
 const tabs=document.querySelector('.scene-tabs'),button=document.createElement('button');
 button.title=name;button.setAttribute('aria-label',name);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+tabIcons[name]+'"/></svg>';button.append(name);
 button.onclick=()=>{
  for(const item of tabs.parentElement.querySelectorAll('.scene-property-group'))item.hidden=item!==panel;
  for(const tab of tabs.children)tab.classList.toggle('active',tab===button);
  document.getElementById('sceneDialog').classList.toggle('scene-navigation',name!=='인물');
  onOpen?.();
 };
 tabs.append(button);return button;
}
export function scenePanels(editor){
 const gizmo=editor.gizmo.toolbar,more=document.createElement('details');more.className='gizmo-options';more.innerHTML='<summary>세부 조작 · 축 · 스냅</summary>';for(const el of [...gizmo.children])if(!el.matches('.gizmo-modes')&&el.id!=='transformReadout')more.append(el);gizmo.append(more);
 const $=id=>document.getElementById(id),controls=document.querySelector('.scene-controls'),tabs=document.createElement('nav');tabs.className='scene-tabs';tabs.setAttribute('aria-label','3D 속성');
 const groups=[['배경',[$('openBackgroundLibrary'),$('modelImport'),$('importState'),$('scenePreset').parentElement,$('wireToggle').parentElement]],['인물',[$('addPerson').parentElement,$('personSelect').parentElement,$('pose').parentElement,...['personX','personZ','personY','personRotation','personScale'].map(id=>$(id).parentElement)]],['카메라',[$('fov').parentElement,$('fitModel').parentElement,$('gridToggle').parentElement,$('captureScene')]]];
 const importHelp=document.createElement('details');importHelp.className='scene-import-help';
 const helpSummary=document.createElement('summary');helpSummary.textContent='지원 파일 · 가져오기 안내';
 const importState=$('importState');importState.before(importHelp);importHelp.append(helpSummary,importState);
 groups[0][1]=groups[0][1].map(el=>el===importState?importHelp:el);
 controls.prepend(tabs);groups.forEach(([name,els],i)=>{const p=document.createElement('div');p.className='scene-property-group';p.dataset.group=String(i);p.hidden=i!==1;els.filter(Boolean).forEach(el=>p.append(el));controls.append(p);sceneTab(name,p).classList.toggle('active',i===1);});
 const views=document.createElement('div');views.className='scene-views';
 for(const [name,dir]of [['정면',[0,0,1]],['측면',[1,0,0]],['뒤',[0,0,-1]],['위',[0,1,.001]]]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{editor.gizmo.frame();const distance=editor.camera.position.distanceTo(editor.controls.target);editor.camera.position.copy(editor.controls.target).addScaledVector({x:dir[0],y:dir[1],z:dir[2]},distance);editor.controls.update();editor.storeCamera();};views.append(b);}
 const isolate=document.createElement('button');isolate.textContent='배경 잠시 숨김';isolate.title='포즈 편집용 · 컷에는 배경이 그대로 출력됩니다';isolate.onclick=()=>{editor.environment.visible=!editor.environment.visible;isolate.classList.toggle('active',!editor.environment.visible);editor.invalidate();};views.append(isolate);const scope=document.createElement('select');scope.id='backgroundSelection';scope.setAttribute('aria-label','배경 선택 범위');scope.title='배경을 클릭하면 선택 범위에 맞춰 조절 축을 표시합니다';scope.add(new Option('물체·그룹 선택','object'));scope.add(new Option('배경 전체 선택','background'));scope.add(new Option('메시 직접 선택','mesh'));scope.onchange=()=>{const t=editor.gizmo.objectTarget;if(t)editor.gizmo.selectObject(t.members?.[0]||t.object);};const presets=document.createElement('details'),summary=document.createElement('summary');
 summary.textContent='시점';presets.className='view-presets';presets.append(summary,views);
 views.addEventListener('click',event=>{if(event.target.closest('button'))presets.open=false;});
 const row=document.createElement('div');row.className='viewport-actions';row.append(presets,scope);$('sceneView').append(row);
 $('closeScene').textContent='−';$('closeScene').title='3D 창 최소화';$('closeScene').setAttribute('aria-label','3D 창 최소화');
 controls.append($('dockPropsToggle'));editor.splitter=setupSceneSplitter(controls);
}
