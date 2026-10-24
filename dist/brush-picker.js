import {presetTool} from './brush-presets.js?v=20261025-release1';
export function setupBrushSwitching({presets,getTool,setTool,preview}){
 const $=id=>document.getElementById(id),select=$('brushPreset');
 const fields={size:$('penSize'),opacity:$('brushOpacity'),hardness:$('brushHardness'),smoothing:$('brushSmoothing')};
 let brushTool='draw',shownPreset=presets[+select.value];
 const remembered=Object.fromEntries(['draw','brush','airbrush','erase'].map(tool=>{const preset=presets.find(p=>presetTool(p)===tool);return [tool,{...preset,preset}];}));
 remembered.draw={preset:shownPreset,...read()};
 function read(){return {...Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,+input.value])),pressure:$('brushPressure').checked,antialias:$('penAntialias')?.value||'middle'};}
 function show(state){
  const preset=presets.includes(state.preset)?state.preset:presets.find(p=>presetTool(p)===brushTool)||presets[0];
  shownPreset=preset;select.value=String(presets.indexOf(preset));
  for(const [key,input]of Object.entries(fields))input.value=state[key]??preset[key];
  $('brushPressure').checked=state.pressure!==false;$('penAntialias').value=state.antialias||'middle';
 }
 document.addEventListener('tool-change',()=>{
  const next=getTool();if(!Object.hasOwn(remembered,next)||next===brushTool)return;
  // The select already contains the clicked option during a change event.
  // Save the preset that owns the displayed values before restoring another tool.
  remembered[brushTool]={preset:shownPreset,...read()};brushTool=next;
  show(remembered[next]);preview();
 });
 select.addEventListener('change',()=>{
  const preset=presets[+select.value];if(!preset)return;
  setTool(presetTool(preset));
  show({...preset,preset});
  if(preset.pressure!==undefined)$('brushPressure').checked=preset.pressure;
  if(preset.antialias)$('penAntialias').value=preset.antialias;
  $('brushNotice').textContent=preset.notice||'필압은 펜 입력에서 적용됩니다. 마우스는 일정한 굵기로 그립니다.';
  preview();
 });
}

export function setupBrushPicker(select,presets,paint){
 const list=document.createElement('div');list.id='brushPicker';list.setAttribute('role','listbox');list.setAttribute('aria-label','브러시 미리보기');select.after(list);select.classList.add('brush-select-source');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 const choose=i=>{select.value=String(i);select.dispatchEvent(new Event('change'));};
 function sync(){const family=presetTool(presets[+select.value]||{});list.setAttribute('aria-label',({draw:'펜',brush:'붓',airbrush:'에어브러시',erase:'지우개'}[family])+' 보조 도구');for(const b of list.children){const on=b.dataset.index===select.value;b.hidden=presetTool(presets[+b.dataset.index])!==family;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;}}
 function refresh(){list.replaceChildren();presets.forEach((p,i)=>{const b=document.createElement('button'),cv=document.createElement('canvas'),name=document.createElement('span');b.type='button';b.dataset.index=String(i);b.setAttribute('role','option');b.setAttribute('aria-label',p.name);b.title=p.name;cv.width=144;cv.height=40;cv.setAttribute('aria-hidden','true');name.textContent=p.name;b.append(cv,name);list.append(b);
  const spray=presetTool(p)==='airbrush';paint(cv.getContext('2d'),[{...p,erase:false,color:'#ffffff',opacity:spray?100:p.opacity,brushSettings:spray?{...p.brushSettings,density:70}:p.brushSettings,size:spray?200:Math.max(10,Math.min(60,p.size*3)),curve:true,points:Array.from({length:40},(_,j)=>[.06+j*.88/39,.52+Math.sin(j/39*Math.PI*2)*.18,.3+Math.sin(j/39*Math.PI)*.7])}],144,40);
  b.onclick=()=>choose(i);b.onkeydown=e=>{const visible=[...list.children].filter(b=>!b.hidden),at=visible.indexOf(b),n={ArrowDown:1,ArrowUp:-1,Home:-at,End:visible.length-1-at}[e.key];if(n===undefined)return;e.preventDefault();const target=visible[Math.max(0,Math.min(visible.length-1,at+n))];choose(+target.dataset.index);target.focus();};
 });sync();}
 select.addEventListener('change',sync);
 document.addEventListener('tool-change',sync);
 new MutationObserver(refresh).observe(select,{childList:true});
 refresh();return {refresh,sync};
}
