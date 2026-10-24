import {typingTarget} from './editor-history.js?v=20261025-release1';
import {elementPoint} from './canvas-coordinates.js?v=20261025-release1';
import {balloonTextLayout,dialogueSession} from './balloon-text.js?v=20261025-release1';
import {drawBalloonOutline} from './balloon-outline.js?v=20261025-release1';
import {balloonShapes,presetStyle} from './balloon-presets.js?v=20261025-release1';
import {createBalloonPresetPicker} from './balloon-preset-ui.js?v=20261025-release1';
import {balloonFontFamily,loadProjectFonts} from './balloon-fonts.js?v=20261025-release1';
import {nativeBalloon,ensureBalloonLayers,newBalloonLayer,balloonLayer} from './balloon-model.js?v=20261025-release1';
export {balloonFontFamily};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const defaults={shape:'ellipse',fill:'#ffffff',stroke:'#343934',ink:'#252d29',line:1.5,font:27,family:'sans',weight:'500',italic:false,underline:false,align:'center',tracking:0,lineHeight:1.4,padding:.11,tail:'straight',outline:'solid',transparent:false,clipToFrame:false};
export function balloonDraw(ctx,b,w,h,part='all'){
 const scale=b.metricWidth?w/b.metricWidth:1;
 if(b.metricWidth){w=b.metricWidth;h/=scale;}
 const s={...defaults,...b},x=b.x*w,y=b.y*h,bw=b.w*w,bh=b.h*h,cx=x+bw/2,cy=y+bh/2;
 ctx.save();ctx.scale(scale,scale);ctx.fillStyle=s.fill;ctx.strokeStyle=s.stroke;ctx.lineWidth=s.line*(b.metricWidth?1:w/1000);ctx.lineJoin='round';
 const tail=b.tailPoint||[b.x+b.w*.42,b.y+b.h*1.24],tx=tail[0]*w,ty=tail[1]*h;
 if(s.shape!=='text'&&part!=='text')drawBalloonOutline(ctx,{...s,...(part==='fill'?{line:0}:part==='outline'?{transparent:true}:{})},x,y,bw,bh,tx,ty);
 if(part==='fill'||part==='outline'){ctx.restore();return;}
 const fs=b.metricWidth?s.font:Math.max(8,s.font*w/1000);ctx.font=`${s.italic?'italic ':''}${s.weight||500} ${fs}px ${balloonFontFamily(s.family)}`;ctx.fillStyle=s.ink;ctx.textAlign=s.align;ctx.textBaseline='middle';
 const {lines,lineHeight}=balloonTextLayout(b.text,fs,bw,bh,text=>ctx.measureText(text).width,s);
 ctx.save();ctx.beginPath();ctx.rect(x+bw*.04,y+bh*.04,bw*.92,bh*.92);ctx.clip();
 lines.forEach((l,i)=>{const yy=cy+(i-(lines.length-1)/2)*lineHeight,xx=s.align==='left'?x+bw*s.padding:s.align==='right'?x+bw*(1-s.padding):cx;
 const tw=ctx.measureText(l).width+Math.max(0,[...l].length-1)*s.tracking,left=s.align==='left'?xx:s.align==='right'?xx-tw:xx-tw/2;
 if(s.tracking){ctx.textAlign='left';let cursor=left;for(const ch of l){ctx.fillText(ch,cursor,yy);cursor+=ctx.measureText(ch).width+s.tracking;}ctx.textAlign=s.align;}else ctx.fillText(l,xx,yy);
 if(s.underline&&l)ctx.fillRect(left,yy+fs*.5,tw,Math.max(.5,fs*.05));});ctx.restore();ctx.restore();
}

export function setupBalloons({getProject,getTool,setTool,selectedCut,select,checkpoint,save,redraw,toast,layerRender,getLayers}){
 const $=id=>document.getElementById(id),pane=document.createElement('aside');pane.id='balloonTools';pane.hidden=true;
 pane.innerHTML=`<div class="drawing-head"><b>말풍선 · 대사</b><button id="closeBalloons" aria-label="말풍선 도구 닫기">✕</button></div><p>컷을 드래그해 말풍선을 만드세요.<br>선택 도구(V): 이동 · 모서리: 크기 · 꼬리 끝: 방향</p><input id="balloonText" type="hidden"><label>모양<select id="balloonShape"><option value="ellipse">타원</option><option value="round">둥근 사각형</option><option value="rect">사각형 · 내레이션</option><option value="thought">생각 · 구름</option><option value="shout">외침 · 톱니</option><option value="text">텍스트만</option></select></label><div class="balloon-colors"><label>선 색<input id="balloonStroke" type="color" value="#343934"></label><label>채색<input id="balloonFill" type="color" value="#ffffff"></label><label>글자 색<input id="balloonInk" type="color" value="#252d29"></label><label>글자 크기<input id="balloonFont" type="number" min="1" max="1000" value="27"></label></div><label>선 두께<input id="balloonLine" type="range" min="0" max="12" step=".5" value="1.5"></label><label class="check"><input id="balloonTransparent" type="checkbox"> 내부 투명</label><label>꼬리<select id="balloonTail"><option value="straight">직선</option><option value="curved">곡선</option><option value="none">없음</option></select></label><button id="balloonNew" class="full primary">＋ 새 말풍선</button><div class="two"><button id="balloonApply">선택에 적용</button><button id="balloonDelete">선택 삭제</button></div><p id="balloonStatus">말풍선은 대사 레이어에 저장됩니다.</p>`;
 document.body.append(pane);let current=null,overlay=null,editing=null,lineCustomized=false,lineFactor=1,shownTool=null,handlesVisible=true,forceNew=false;
 $('balloonShape').replaceChildren(...balloonShapes.map(([value,name])=>new Option(name,value)));
 for(const [value,name]of [['circles','작은 원 · 생각'],['lightning','번개 · 전화']])$('balloonTail').add(new Option(name,value));
 const outline=document.createElement('label');outline.textContent='선 모양';const outlineSelect=document.createElement('select');outlineSelect.id='balloonOutline';for(const [value,name]of [['solid','실선'],['dashed','파선 · 속삭임'],['dotted','점선 · 작은 목소리'],['double','이중선 · 강조']])outlineSelect.add(new Option(name,value));outline.append(outlineSelect);$('balloonLine').closest('label').after(outline);
 const typography=document.createElement('div');typography.className='balloon-typography';typography.innerHTML='<label>글꼴<select id=balloonFamily><option value=sans>고딕</option><option value=serif>명조</option><option value=myeongjo>나눔명조 · ExtraBold 지원</option><option value=round>둥근 고딕</option><option value=mono>고정폭</option></select></label><label>굵기<select id=balloonWeight><option value=400>보통</option><option value=500 selected>중간</option><option value=700>굵게</option><option value=800>ExtraBold</option><option value=900>매우 굵게</option></select></label>';pane.querySelector('.balloon-colors').after(typography);
 const styles=document.createElement('div');styles.className='text-styles';styles.innerHTML='<label class=check><input id=balloonItalic type=checkbox>기울임</label><label class=check><input id=balloonUnderline type=checkbox>밑줄</label>';typography.append(styles);
 const align=document.createElement('label');align.innerHTML='정렬<select id=balloonAlign><option value=left>왼쪽</option><option value=center selected>가운데</option><option value=right>오른쪽</option></select>';typography.append(align);
 const extra=document.createElement('div');extra.innerHTML='<label>글자 사이 px<input id=balloonTracking type=number min=-10 max=50 step=.1 value=0></label><label>줄 간격<input id=balloonLineHeight type=number min=.6 max=3 step=.05 value=1.4></label><label>글자 주변 여백<input id=balloonPadding type=number min=0 max=.3 step=.01 value=.11></label><button id=balloonFontImport>글꼴 파일 불러오기</button><input id=balloonFontFile type=file accept=".ttf,.otf,.woff,.woff2" hidden>';typography.append(extra);
 $('balloonFontImport').onclick=()=>$('balloonFontFile').click();
 $('balloonFontFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>12e6)throw Error('글꼴은 12MB 이하로 선택하세요.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});const font={id:'font-'+crypto.randomUUID(),name:f.name,data};checkpoint();(getProject().fonts??=[]).push(font);await loadProjectFonts(getProject());$('balloonFamily').add(new Option(font.name,font.id));$('balloonFamily').value=font.id;$('balloonFamily').dispatchEvent(new Event('change'));save();toast('글꼴을 원고에 포함했습니다.');}catch(error){toast(error.message);}e.target.value='';};
 const mode=document.createElement('label');mode.innerHTML='추가 방법<select id=balloonAddMode><option value=new>레이어 신규 작성</option><option value=selected>선택 중인 레이어에 추가</option></select>';pane.querySelector('p').after(mode);
 
 typography.prepend($('balloonFont').closest('label'));typography.prepend($('balloonFamily').closest('label'));typography.append($('balloonInk').closest('label'));
 for(const id of ['Shape','Stroke','Fill','Line','Transparent','Tail','Outline'])$('balloon'+id).closest('label').dataset.balloonOnly='';
 const clip=document.createElement('label');clip.className='check';clip.innerHTML='<input id="balloonClipToFrame" type="checkbox"> 컷 안으로 자르기';$('balloonNew').before(clip);
 const hint=pane.querySelector('p');pane.append(hint);
 const fields={shape:'Shape',stroke:'Stroke',fill:'Fill',ink:'Ink',family:'Family',weight:'Weight',font:'Font',line:'Line',tail:'Tail',outline:'Outline',transparent:'Transparent',clipToFrame:'ClipToFrame',italic:'Italic',underline:'Underline',align:'Align',tracking:'Tracking',lineHeight:'LineHeight',padding:'Padding'};
 createBalloonPresetPicker($('balloonShape').closest('label'),preset=>{
  finish();if(current&&!editable(current.c))return;
  setTool(preset.style.shape==='text'?'text':'balloon');lineFactor=preset.style.lineFactor;lineCustomized=false;
  const s=presetStyle(preset,frameLine(current?.c||selectedCut()));
  if(current){const {c,b,cv}=current;checkpoint();Object.assign(b,s);populate(b);redraw(c,cv);mark(c,b,cv);save();}
  else populate({...s,text:''});
  $('balloonStatus').textContent=preset.label+' · '+(current?'선택한 말풍선에 적용됨':'원고를 드래그해 새 말풍선을 만드세요.');
 },balloonDraw);
 const syncContext=()=>document.body.classList.toggle('page-dialogue',['text','balloon'].includes(getTool()));document.addEventListener('tool-change',syncContext);syncContext();
 document.body.classList.toggle('balloon-edit',['select','text','balloon'].includes(getTool()));
 const paper=$('paper');let drag=null;const planes=new Map();
 function sync(){for(const [cv,plane]of planes){if(!cv.isConnected){plane.remove();planes.delete(cv);continue;}const wrap=cv.parentElement;Object.assign(plane.style,{left:wrap.offsetLeft+'px',top:wrap.offsetTop+'px',width:wrap.clientWidth+'px',height:wrap.clientHeight+'px'});}layoutInput();}
 new MutationObserver(records=>{if(records.some(r=>r.target.classList?.contains('panel-wrap')||[...r.addedNodes,...r.removedNodes].some(n=>n.classList?.contains('panel-wrap'))))sync();}).observe(paper,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
 function planeFor(c,cv){if(planes.has(cv))return planes.get(cv);const plane=document.createElement('div');plane.className='balloon-plane';plane.dataset.cut=c.id;paper.append(plane);planes.set(cv,plane);plane.addEventListener('pointerdown',e=>start(e,c,cv));plane.addEventListener('dblclick',()=>{if(current?.cv===cv)doubleClick(current);});sync();return plane;}
 function paint(c,cv){if(!cv.isConnected)return;const plane=planeFor(c,cv);plane.querySelectorAll('canvas').forEach(el=>el.remove());for(const [index,l]of getLayers(previewCut(c),cv).entries()){if(!l.aboveFrames||l.hidden){l.canvas.width=1;continue;}const el=l.canvas;el.dataset.bubble=String(index);el.className='balloon-art';el.setAttribute('aria-label',`말풍선 ${index+1}`);Object.assign(el.style,{left:l.left/cv.width*100+'%',top:l.top/cv.height*100+'%',width:el.width/cv.width*100+'%',height:el.height/cv.height*100+'%',opacity:String(l.opacity)});plane.append(el);}if(current?.cv===cv)mark(c,current.b,cv);sync();}
 function style(){const s={};for(const [key,id]of Object.entries(fields)){const el=$('balloon'+id);s[key]=el.type==='checkbox'?el.checked:el.type==='number'||el.type==='range'?+el.value:el.value;}s.font=clamp(s.font||27,1,1000);s.line=clamp(s.line||0,0,12);s.text=$('balloonText').value;return s;}
 function editable(c,b){const l=c.layerSettings.text,group=balloonLayer(c,b||(current?.c===c?current.b:null));if(group?.locked||group?.visible===false||l.locked||!l.visible||!c.visible.text){toast('대사 레이어를 표시하고 잠금을 해제하세요.');return false;}return true;}
 function show(){
  for(const f of getProject().fonts||[])if(![...$('balloonFamily').options].some(o=>o.value===f.id))$('balloonFamily').add(new Option(f.name,f.id));pane.hidden=false;pane.classList.remove('context-hidden');$('drawingTools').hidden=true;
  const isText=getTool()==='text';
  if(!isText&&shownTool==='text'&&current?.b.shape==='text')clear();
  pane.dataset.context=isText?'text':'balloon';
  hint.textContent=isText?'원고를 드래그해 바로 입력 · 바깥 클릭: 자동 적용 · 더블클릭: 수정':'더블클릭: 선택 확정 · Delete: 삭제 · Enter/대사 편집: 입력 · V: 이동';
  if(!current)$('balloonStatus').textContent=isText?'컷 안과 컷 사이 여백에 글자를 배치할 수 있습니다.':'말풍선은 대사 레이어에 저장됩니다.';
  const heading=pane.querySelector('.palette-handle');if(heading)heading.textContent=isText?'⠿ 텍스트':'⠿ 말풍선';
  $('balloonNew').textContent=isText?'＋ 새 텍스트':'＋ 새 말풍선';
  if(shownTool!==getTool()){const body=pane.querySelector('.palette-body');if(body)body.scrollTop=0;}
  pane.querySelector('.drawing-head b').textContent=isText?'텍스트':'말풍선 · 대사';
  if(!current&&isText){$('balloonShape').value='text';$('balloonTail').value='none';}
  else if(!current&&shownTool==='text'&&$('balloonShape').value==='text'){$('balloonShape').value='ellipse';$('balloonTail').value='straight';}
  shownTool=getTool();$('balloonShape').dispatchEvent(new CustomEvent('balloon-shape-sync'));
 }
 document.addEventListener('balloon-layer-selected',e=>{clear();if(e.detail?.create){$('balloonAddMode').value='selected';forceNew=true;setTool('balloon');}show();});
 function clear(){finish();current=null;overlay?.remove();overlay=null;}
 // Suppression applies only to the live canvas; exports keep the saved text.
 function previewCut(c){return editing?.c===c?{...c,bubbles:c.bubbles.map(b=>b===editing.b?{...b,text:''}:b)}:c;}
 function layoutInput(){
  if(!editing)return;
  const {b,cv,input}=editing,s={...defaults,...b},width=b.metricWidth||cv.width,scale=cv.clientWidth/width,fs=b.metricWidth?s.font:Math.max(8,s.font*width/1000),ctx=cv.getContext('2d');
  ctx.save();ctx.font=`${s.italic?'italic ':''}${s.weight||500} ${fs}px ${balloonFontFamily(s.family)}`;
  const layout=balloonTextLayout(input.value,fs,b.w*width,b.h*cv.height/cv.width*width,t=>ctx.measureText(t).width,s);ctx.restore();
  Object.assign(input.style,{left:(b.x+b.w*s.padding)*100+'%',top:(b.y+b.h/2)*100+'%',width:b.w*(100-200*s.padding)+'%',height:layout.height*scale+'px',fontFamily:balloonFontFamily(s.family),fontWeight:s.weight||'500',fontStyle:s.italic?'italic':'normal',textDecoration:s.underline?'underline':'none',textAlign:s.align,fontSize:fs*scale+'px',letterSpacing:s.tracking*scale+'px',lineHeight:layout.lineHeight*scale+'px',color:s.ink,caretColor:s.ink,opacity:String(editing.c.layerSettings.text.opacity/100)});
 }
 function finish(commit=true){
  if(!editing)return;const session=editing;editing=null;
  session.session.update(session.input.value);session.session.finish(commit);
  session.input.remove();handlesVisible=false;overlay?.remove();overlay=null;populate(session.b);redraw(session.c,session.cv);$('balloonStatus').textContent='대사 적용됨 · Delete: 삭제 · Enter: 대사 편집';
 }
 function edit(selection){
  if(editing?.b===selection.b){editing.input.focus();return;}
  finish();const {c,b,cv}=selection;if(!editable(c))return;
  const input=document.createElement('textarea');input.className='balloon-inline-input';input.setAttribute('aria-label',b.shape==='text'?'텍스트 입력':'말풍선 안에서 대사 입력');input.placeholder='대사 입력';input.spellcheck=false;input.value=b.text||'';
  input.title='Enter 줄바꿈 · 바깥 클릭 자동 적용 · Ctrl+Enter 완료 · Esc 취소';
  handlesVisible=false;overlay?.remove();overlay=null;editing={c,b,cv,input,session:dialogueSession(b,checkpoint,save)};$('balloonStatus').textContent='대사 입력 중 · 바깥 클릭 자동 적용';
  const plane=planeFor(c,cv);plane.append(input);layoutInput();redraw(c,cv);input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);
  input.addEventListener('pointerdown',e=>e.stopPropagation());
  input.addEventListener('input',()=>{editing?.session.update(input.value);layoutInput();});
  input.addEventListener('keydown',e=>{
   e.stopPropagation();if(e.isComposing||e.keyCode===229)return;
   if(e.key==='Escape'||(e.key==='Enter'&&(e.ctrlKey||e.metaKey))){e.preventDefault();finish(e.key!=='Escape');$('viewport').focus({preventScroll:true});}
   else if((e.ctrlKey||e.metaKey)&&e.code==='KeyS'){e.preventDefault();finish();$('projectSave').click();}
  });
  input.addEventListener('blur',()=>{if(editing?.input===input)finish();});
 }
 // Object selection and text editing own different keyboard targets.
 function doubleClick(selection){
  if(getTool()==='text'){edit(selection);return;}
  if(!['select','balloon'].includes(getTool()))return;
  finish();handlesVisible=false;mark(selection.c,selection.b,selection.cv);show();
  $('viewport').focus({preventScroll:true});$('balloonStatus').textContent='말풍선 선택됨 · Delete: 삭제 · Enter: 대사 편집';
 }
 const editButton=document.createElement('button');editButton.id='balloonEditText';editButton.className='full';editButton.textContent='대사 편집 · Enter';mode.before(editButton);
 editButton.onclick=()=>{if(current)edit(current);else toast('먼저 말풍선을 선택하세요.');};
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.isComposing||e.keyCode===229||e.key!=='Enter'||e.ctrlKey||e.metaKey||e.altKey||editing||!current||!['select','balloon','text'].includes(getTool())||typingTarget(e.target)||e.target.closest('button,select,#sceneDialog')||document.querySelector('dialog[open]'))return;
  e.preventDefault();edit(current);
 });
 document.addEventListener('pointerdown',e=>{if(editing&&!editing.input.contains(e.target))finish();},true);
 window.addEventListener('beforeunload',()=>finish());
 function mark(c,b,cv){current={c,b,cv};c.activeBalloonLayer=b.balloonLayerId;overlay?.remove();overlay=null;if(editing||!handlesVisible)return;overlay=document.createElement('div');overlay.className='balloon-selection';overlay.style.left=b.x*100+'%';overlay.style.top=b.y*100+'%';overlay.style.width=b.w*100+'%';overlay.style.height=b.h*100+'%';const handle=document.createElement('i');handle.dataset.mode='resize';overlay.append(handle);if((b.tail||'straight')!=='none'&&b.shape!=='text'){const t=b.tailPoint||[b.x+b.w*.42,b.y+b.h*1.24],dot=document.createElement('i');dot.className='tail-handle';dot.dataset.mode='tail';dot.style.left=(t[0]-b.x)/b.w*100+'%';dot.style.top=(t[1]-b.y)/b.h*100+'%';overlay.append(dot);}planeFor(c,cv).append(overlay);$('balloonStatus').textContent='선택됨 · Delete: 삭제 · 모서리와 꼬리 끝: 조절';}
 function populate(b){const s={...defaults,...b};$('balloonText').value=b.text;for(const [key,id]of Object.entries(fields)){const el=$('balloon'+id);if(el.type==='checkbox')el.checked=s[key];else el.value=s[key];}$('balloonShape').dispatchEvent(new CustomEvent('balloon-shape-sync'));}
 function frameLine(c){const width=c?.pageWidth*c?.width/100||document.querySelector(`.panel-wrap[data-id="${c?.id}"] canvas`)?.width||1000;return (c?.frame?.size??2)*.75*1000/width;}
 function add(c,position=[.1,.08],emptyText=false){if(!editable(c))return;checkpoint();const s=style(),width=(getProject().width+getProject().bleed)*c.width/100;if(!lineCustomized)s.line=(c.frame?.size??2)*.75*lineFactor;if(getTool()==='text')Object.assign(s,{shape:'text',tail:'none'});const group=$('balloonAddMode').value==='selected'&&balloonLayer(c)||newBalloonLayer(c);const b={...s,metricWidth:width,balloonLayerId:group.id,x:position[0],y:position[1],w:Math.min(.5,220/width),h:Math.min(.5,100/c.height)};if(emptyText)b.text='';c.bubbles.push(b);c.activeLayer='text';c.activeBalloonLayer=group.id;layerRender();const cv=document.querySelector(`.panel-wrap[data-id="${c.id}"] canvas`);redraw(c,cv);mark(c,b,cv);save();return b;}

 const wrapText=document.createElement('button');wrapText.id='wrapTextBalloon';wrapText.textContent='선택한 텍스트에 말풍선 씌우기';$('balloonNew').before(wrapText);wrapText.onclick=()=>{if(!current)return toast('먼저 텍스트를 선택하세요.');const {c,b,cv}=current;if(!editable(c))return;checkpoint();b.shape=$('balloonShape').value==='text'?'ellipse':$('balloonShape').value;b.tail='straight';b.transparent=false;populate(b);redraw(c,cv);mark(c,b,cv);save();};
 $('closeBalloons').onclick=()=>pane.hidden=true;
 $('balloonNew').onclick=()=>{clear();forceNew=true;setTool(getTool()==='text'?'text':'balloon');show();$('balloonStatus').textContent=getTool()==='text'?'원고를 드래그하면 바로 글자를 입력합니다.':'원고를 드래그해 새 말풍선을 만드세요.';};
 $('balloonApply').onclick=()=>{if(!current)return toast('먼저 컷에서 말풍선을 선택하세요.');const {c,b,cv}=current;if(!editable(c))return;checkpoint();Object.assign(b,style());redraw(c,cv);mark(c,b,cv);save();};
 function removeSelected(){if(!current)return false;const {c,b,cv}=current;if(!editable(c,b))return true;const at=c.bubbles.indexOf(b);if(at<0){clear();return false;}finish();checkpoint();c.bubbles.splice(at,1);clear();redraw(c,cv);layerRender();save();toast('말풍선·텍스트 삭제 · Ctrl+Z로 복원');return true;}
 $('balloonDelete').onclick=removeSelected;
 function pos(e,cv){return elementPoint(cv,e);}
 function limits(cv){const wrap=cv.parentElement;return {x0:-wrap.offsetLeft/cv.clientWidth,y0:-wrap.offsetTop/cv.clientHeight,x1:(paper.clientWidth-wrap.offsetLeft)/cv.clientWidth,y1:(paper.clientHeight-wrap.offsetTop)/cv.clientHeight};}
 function start(e,c,cv){
  if(!['select','text','balloon'].includes(getTool())||e.button!==0)return;
  let p=pos(e,cv);const r=cv.getBoundingClientRect(),near=a=>Math.hypot((a[0]-p[0])*r.width,(a[1]-p[1])*r.height)<13;
  let b=current?.c===c?current.b:null,mode=e.target.dataset.mode||'move';
  if(forceNew){b=null;mode='new';}else if(!e.target.dataset.mode){
   if(b&&near([b.x+b.w,b.y+b.h]))mode='resize';
   else if(b&&(b.tail||'straight')!=='none'&&b.shape!=='text'&&near(b.tailPoint||[b.x+b.w*.42,b.y+b.h*1.24]))mode='tail';
   else b=ensureBalloonLayers(c).flatMap(l=>c.bubbles.filter(b=>b.balloonLayerId===l.id)).reverse().find(b=>balloonLayer(c,b)?.visible!==false&&p[0]>=b.x&&p[0]<=b.x+b.w&&p[1]>=b.y&&p[1]<=b.y+b.h);
  }
  if(!b&&['text','balloon'].includes(getTool())&&!$('balloonClipToFrame').checked&&c.pageId){const base=getProject().cuts.find(x=>x.pageBase&&x.pageId===c.pageId),baseCv=document.querySelector(`.panel-wrap[data-id="${base.id}"] canvas`);c=base;cv=baseCv;p=pos(e,cv);}
  select(c.id);if(!editable(c,b))return;forceNew=false;
  if(['text','balloon'].includes(getTool())&&!b){b=add(c,p,true);mode='new';}else if(b){populate(b);}else{clear();return;}
  if(!b)return;handlesVisible=true;drag={c,cv,b,mode,start:p,original:structuredClone(b),pointer:e.pointerId,moved:false};c.activeLayer='text';layerRender();mark(c,b,cv);
  // Capture on the stable viewport: the balloon artwork is repainted during dragging.
  $('viewport').focus({preventScroll:true});$('viewport').setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();
 }
 document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;e.preventDefault();e.stopPropagation();
  const {c,cv,b,mode,start,original:o}=drag,p=pos(e,cv),dx=p[0]-start[0],dy=p[1]-start[1],l=limits(cv);
  if(!drag.moved){if(Math.hypot(dx*cv.clientWidth,dy*cv.clientHeight)<4)return;if(mode!=='new')checkpoint();drag.moved=true;}
  if(mode==='move'){b.x=clamp(o.x+dx,l.x0,Math.max(l.x0,l.x1-b.w));b.y=clamp(o.y+dy,l.y0,Math.max(l.y0,l.y1-b.h));if(o.tailPoint)b.tailPoint=[o.tailPoint[0]+b.x-o.x,o.tailPoint[1]+b.y-o.y];}
  else if(mode==='tail')b.tailPoint=[clamp(p[0],l.x0,l.x1),clamp(p[1],l.y0,l.y1)];
  else if(mode==='resize'){if(b.shape==='text'){const k=clamp(Math.max((o.w+dx)/o.w,(o.h+dy)/o.h),.2,Math.min((l.x1-b.x)/o.w,(l.y1-b.y)/o.h,1000/(o.font||27)));b.w=o.w*k;b.h=o.h*k;b.font=(o.font||27)*k;populate(b);}else{b.w=clamp(o.w+dx,8/(b.metricWidth||1000),Math.max(8/(b.metricWidth||1000),l.x1-b.x));b.h=clamp(o.h+dy,8/c.height,Math.max(8/c.height,l.y1-b.y));}}
  else if(Math.hypot(dx*cv.clientWidth,dy*cv.clientHeight)>5){const x=clamp(p[0],l.x0,l.x1),y=clamp(p[1],l.y0,l.y1);b.x=Math.min(start[0],x);b.y=Math.min(start[1],y);b.w=Math.max(8/(b.metricWidth||1000),Math.abs(x-start[0]));b.h=Math.max(8/c.height,Math.abs(y-start[1]));if(e.shiftKey){const size=Math.min(b.w*cv.width,b.h*cv.height);b.w=size/cv.width;b.h=size/cv.height;}}
  redraw(c,cv);mark(c,b,cv);
 },true);
 let lastTap=null;
 const end=e=>{if(drag&&e.pointerId===drag.pointer){const d=drag;drag=null;save();if(e.type==='pointerup'&&d.mode==='new'&&getTool()==='text'){lastTap=null;edit(d);return;}if(e.type==='pointerup'&&d.mode==='move'&&!d.moved){const now=performance.now();if(lastTap?.b===d.b&&now-lastTap.time<450){lastTap=null;doubleClick(d);}else lastTap={b:d.b,time:now};}else lastTap=null;}};
 for(const name of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(name,end,true);
 window.addEventListener('blur',()=>{if(drag){drag=null;save();}});
 function bind(c,cv){cv.addEventListener('pointerdown',e=>start(e,c,cv));cv.addEventListener('dblclick',()=>{if(current?.cv===cv)doubleClick(current);});}
 $('balloonLine').addEventListener('input',()=>lineCustomized=true);
 for(const id of Object.values(fields))$('balloon'+id).addEventListener('change',()=>{if(current)$('balloonApply').click();});
 return {show,clear,bind,add,paint,sync,previewCut,finish,removeSelected,hasSelection:()=>!!current&&current.c.bubbles.includes(current.b)};
}
