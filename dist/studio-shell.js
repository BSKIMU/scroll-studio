import {setupToolOrder} from './tool-order.js?v=20261025-release1';
const $=id=>document.getElementById(id);
import {toolIcon as icon} from './tool-icons.js?v=20261025-release1';
function compactButton(button,name,label){if(!button)return;button.title=label;button.setAttribute('aria-label',label);button.classList.add('compact-command');button.innerHTML=icon(name);}

// Reuse the editor's controls and handlers; the shell only arranges entry points.
export function setupStudioShell({setTool,getTool,sidebars}){
 document.body.classList.add('studio-ui');
 const header=document.querySelector('body>header'),workspace=document.querySelector('.workspace'),toolbar=document.querySelector('main>.toolbar');
 header.setAttribute('aria-label','타이틀 바');
 const meta=document.createElement('span');meta.id='documentMeta';header.append(meta);
 const menu=document.createElement('nav');menu.className='studio-menu';menu.setAttribute('aria-label','메뉴 바');
 const groups=[['파일',[['새 캔버스','newProject'],['프로젝트 열기','openProject'],['프로젝트 저장','projectSave'],['자동 저장 원고 백업',()=>window.open('./project-recovery.html','_blank','noopener')],['내보내기','exportBtn']]],['편집',[['실행 취소','undo'],['다시 실행','redo'],['컷 크기 조절','frameTransformStart']]],['페이지',[['페이지 관리','publicationOpen'],['전체 페이지 보기',()=>{document.querySelector('#pageOverview .sidebar-restore')?.click();}],['페이지 추가','pageAdd'],['컷 추가','addCut'],['컷 인식','recognizePanels'],['작품 · CMC 관리','bookOpen']]],['보기',[['화면에 맞춤','fitWidth'],['집중 모드','focusBtn'],['미리보기 · 웹툰 읽기 / 3D 제본','readBtn'],['3D 창 열기 / 닫기','dockToggle']]],['팔레트',[['도구 속성','drawingToggle'],['레이어','layersToggle'],['패널 배치 초기화','resetPanels'],['배경 소재 라이브러리','libraryBtn']]],['도움말',[['사용 안내','helpBtn']]]];
 for(const [label,items]of groups){const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('div');summary.textContent=label;list.className='studio-menu-items';details.append(summary,list);for(const [name,action]of items){const button=document.createElement('button');button.textContent=name;button.onclick=()=>{details.open=false;typeof action==='function'?action():$(action)?.click();};list.append(button);}details.addEventListener('toggle',()=>{if(details.open)for(const other of menu.querySelectorAll('details'))if(other!==details)other.open=false;});menu.append(details);}
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.querySelectorAll('details').forEach(d=>d.open=false);});
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){const open=menu.querySelector('details[open]');if(open){open.open=false;open.querySelector('summary').focus();}}});
 header.querySelector('.project-name').before(menu);header.after(toolbar);toolbar.setAttribute('aria-label','커맨드 바');toolbar.classList.add('command-bar');
 const menuRegion=document.createElement('div');menuRegion.className='header-menu-region';header.prepend(menuRegion);menuRegion.append($('homeBtn'),menu);
 const statusRegion=document.createElement('div');statusRegion.className='header-status-region';statusRegion.append($('saveState'),meta);header.append(statusRegion);
 const fileCommands=document.createElement('div');fileCommands.className='file-commands';
 const newButton=document.createElement('button');newButton.textContent='＋ 새 캔버스';newButton.onclick=()=>$('newProject').click();fileCommands.append(newButton,...document.querySelector('.header-actions').children);toolbar.prepend(fileCommands);
 compactButton(newButton,'new','새 캔버스');
 const recognize=document.createElement('button');recognize.id='recognizePanelsTop';recognize.textContent='▣ 컷 인식';recognize.title='현재 페이지의 러프에서 컷 인식';recognize.onclick=()=>$('recognizePanels').click();fileCommands.append(recognize);
 for(const [id,name,label]of [['projectSave','save','프로젝트 저장'],['exportBtn','export','내보내기'],['layersToggle','layers','레이어 패널'],['drawingToggle','draw','브러시 패널'],['resetPanels','panels','패널 배치 초기화'],['fitWidth','fit','화면에 맞춤'],['focusBtn','focus','집중 모드']])compactButton($(id),name,label);
 const rail=document.createElement('nav');rail.id='toolPalette';rail.setAttribute('aria-label','도구 팔레트');workspace.prepend(rail);
 const sidebarToggle=sidebars.story.button;sidebarToggle.id='sidebarToggle';sidebarToggle.setAttribute('aria-controls','leftSidebar');rail.append(sidebarToggle);
 for(const [buttonId,panelId]of [['drawingToggle','drawingTools'],['layersToggle','layerPanel']]){const button=$(buttonId),open=button.onclick;button.onclick=e=>{const panel=$(panelId);if(sidebars.story.collapsed&&panel.parentElement.id==='paletteDock'){sidebars.story.setCollapsed(false);panel.hidden=false;panel.classList.remove('palette-collapsed');}else open?.call(button,e);};}
 let lastShape='line';document.querySelectorAll('.command-bar [data-tool="line"],.command-bar [data-tool="rect"],.command-bar [data-tool="ellipse"]').forEach(b=>b.remove());
 for(const [tool,label,key]of [['select','선택','V'],['pan','이동','H / Space'],['draw','펜','B'],['brush','붓','J'],['airbrush','에어브러시','A'],['eyedropper','스포이드','I'],['erase','지우개','E'],['lasso','올가미','L'],['fill','채우기','G'],['text','텍스트','T'],['balloon','말풍선','']]){
  const button=document.querySelector(`.command-bar [data-tool="${tool}"]`)||document.createElement('button');
  button.dataset.tool=tool;button.dataset.toolOrder=tool;button.title=label+(key?' · '+key:'');button.setAttribute('aria-label',button.title);button.innerHTML=icon(tool)+`<span>${label}</span>`;button.onclick=()=>setTool(tool==='figure'?lastShape:tool);rail.append(button);
 }
 const frame=document.createElement('button');frame.title='컷 테두리 · 만화 칸';frame.setAttribute('aria-label',frame.title);frame.innerHTML=icon('frame')+'<span>컷</span>';frame.onclick=()=>$('quickRect').click();frame.dataset.toolOrder='frame';rail.append(frame);setupToolOrder(rail);
 const toolsTitle=$('drawingTools').querySelector('.palette-handle');toolsTitle.textContent='⠿ 도구 속성';
 const materials=document.createElement('div');materials.className='palette-library-row';$('paletteDock').before(materials);$('bookOpen').title='작품 · CMC 페이지 관리';$('bookOpen').textContent='▥ 작품 · 페이지';$('libraryBtn').title='이번 화 배경 소재 라이브러리';$('libraryBtn').textContent='◇ 소재 · 배경';materials.append($('libraryBtn'));$('pageThumbnails').before($('bookOpen'));$('bookOpen').textContent='▥ 작품';
 const swatches=$('colorPalettePanel').querySelector('.swatches');if(swatches)swatches.setAttribute('aria-label','컬러 세트');
 const toolName=document.createElement('span');toolName.id='currentToolName';toolName.setAttribute('aria-live','polite');toolbar.querySelector('.tools').append(toolName);
 const quick=document.createElement('div');quick.className='sidebar-quick-actions';const outline=document.querySelector('.left>.outline-actions');outline.before(quick);quick.append(outline,materials);
 const section=document.querySelector('.left>.sectionhead');section.hidden=true;
 for(const [id,label]of [['projectStatus','프로젝트 정보'],['settingsBtn','캔버스 설정'],['helpBtn','사용 안내']])$(id).title=label;
 $('projectStatus').textContent='정보';$('settingsBtn').textContent='설정';$('helpBtn').textContent='? 도움말';
 $('frameScene').title='선택한 컷의 배경을 오른쪽 3D 장면에서 편집';$('frameScene').textContent='◇ 이 컷의 3D 배경';
 $('frameTransformStart').title='컷 이동 · 회전 · 크기 조절 · Ctrl+T';$('frameTransformStart').textContent='⤢ 이동 · 회전 · 크기';
 const sceneTitle=document.querySelector('#sceneDialog>.modal-head');sceneTitle.querySelector('.eyebrow').textContent='3D';
 const viewportHint=document.querySelector('#sceneView .view-hint'),hint=document.createElement('details'),hintSummary=document.createElement('summary');hint.className='view-help';hintSummary.textContent='? 조작';hint.append(hintSummary,viewportHint);$('sceneView').append(hint);
 const launch=document.createElement('button');launch.id='sceneLauncher';launch.title='오른쪽 3D 편집 창 열기';launch.textContent='◇ 3D 장면';launch.onclick=()=>$('dockToggle').click();workspace.append(launch);
 const docTab=document.createElement('span');docTab.id='documentTab';$('frameTools').prepend(docTab);
 function sync(){const dims=$('dimensions').textContent,z=$('zoomLabel').textContent,name=$('title').value;meta.textContent=`${dims} · ${z}`;docTab.textContent=name;document.title=name+' · 웹툰만화툴';rail.querySelectorAll('[data-tool]').forEach(button=>{const shape=['line','curve','rect','ellipse'].includes(getTool());if(shape)lastShape=getTool();const active=button.dataset.tool===getTool()||(shape&&button.dataset.tool==='figure')||(getTool()==='lassofill'&&button.dataset.tool==='lasso');button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);if(active)toolName.textContent=getTool()==='lassofill'?'올가미 채색':button.getAttribute('aria-label');});}
 document.addEventListener('tool-change',sync);
 for(const id of ['dimensions','zoomLabel','status'])new MutationObserver(sync).observe($(id),{childList:true,characterData:true,subtree:true});$('title').addEventListener('input',sync);sync();
}
