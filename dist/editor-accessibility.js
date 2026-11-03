export function setupEditorAccessibility({setTool}){
 const $=id=>document.getElementById(id),rows=$('layerRows'),body=rows?.parentElement;
 if(body){const settings=document.createElement('div'),list=document.createElement('div'),bar=document.createElement('div');settings.className='layer-settings-scroll';list.className='layer-list-scroll';bar.className='layer-list-divider';bar.tabIndex=0;bar.setAttribute('role','separator');bar.setAttribute('aria-label','레이어 목록 높이 조절');bar.setAttribute('aria-orientation','horizontal');
 while(body.firstChild&&body.firstChild!==rows)settings.append(body.firstChild);while(body.firstChild)list.append(body.firstChild);body.append(settings,bar,list);body.classList.add('layer-split-body');
 const resize=h=>{const height=Math.max(60,Math.min(body.clientHeight-110,h));settings.style.flexBasis=height+'px';bar.setAttribute('aria-valuenow',Math.round(height));};let start;
 bar.onpointerdown=e=>{start=[e.clientY,settings.clientHeight];bar.setPointerCapture(e.pointerId);e.preventDefault();};bar.onpointermove=e=>{if(start)resize(start[1]+e.clientY-start[0]);};bar.onpointerup=bar.onpointercancel=()=>start=null;bar.onkeydown=e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();resize(settings.clientHeight+(e.key==='ArrowUp'?-20:20));}};
 }
 const palette=$('toolPalette'),color=$('penColor');if(!palette||!color)return;
 const wand=document.createElement('button');wand.type='button';wand.title='마법봉 · 자동 선택';wand.setAttribute('aria-label',wand.title);wand.textContent='✧';wand.onclick=()=>{setTool('lasso');$('lassoMode').value='select';$('lassoPath').value='wand';$('lassoPath').dispatchEvent(new Event('change'));};palette.append(wand);
 const colors=document.createElement('div');colors.className='tool-color-swatches';let foreground=color.value,background='#ffffff',selected='foreground';
 for(const [mode,label]of [['foreground','전경색'],['background','배경색'],['transparent','투명색']]){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.dataset.colorMode=mode;b.onclick=()=>choose(mode);colors.append(b);}palette.append(colors);
 function sync(){for(const b of colors.children){b.style.backgroundColor=b.dataset.colorMode==='foreground'?foreground:b.dataset.colorMode==='background'?background:'';b.setAttribute('aria-pressed',String(b.dataset.colorMode===selected));}}
 function choose(mode){selected=mode;document.body.dataset.paintTransparent=String(mode==='transparent');if(mode!=='transparent'){color.value=mode==='foreground'?foreground:background;color.dispatchEvent(new Event('input',{bubbles:true}));}sync();}
 color.addEventListener('input',()=>{if(selected==='background')background=color.value;else if(selected==='foreground')foreground=color.value;sync();});sync();
}
