export function installColorHistory(swatches){
 const tabs=document.createElement('div'),recent=document.createElement('div'),input=document.getElementById('penColor');
 tabs.className='color-views';recent.className='color-recent';swatches.before(tabs);swatches.after(recent);
 let colors=[];const key='scroll-used-colors';
 try{colors=JSON.parse(localStorage.getItem(key)||'[]').filter(c=>/^#[0-9a-f]{6}$/i.test(c)).slice(0,64);}catch{}
 function render(){
  recent.replaceChildren();
  if(!colors.length){const msg=document.createElement('small');msg.textContent='그림에 사용한 색이 여기에 표시됩니다.';recent.append(msg);}
  for(const color of colors){const b=document.createElement('button');b.style.background=color;b.title=color;b.setAttribute('aria-label',color);b.onclick=()=>{input.value=color;input.dispatchEvent(new Event('input',{bubbles:true}));};recent.append(b);}
 }
 function show(index){swatches.hidden=!!index;recent.hidden=!index;[...tabs.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(index===i)));}
 ['컬러 세트','히스토리'].forEach((name,i)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>show(i);tabs.append(b);});
 document.addEventListener('used-paint-color',e=>{const color=e.detail?.toLowerCase();if(!/^#[0-9a-f]{6}$/.test(color)||colors[0]===color)return;colors=[color,...colors.filter(c=>c!==color)].slice(0,64);try{localStorage.setItem(key,JSON.stringify(colors));}catch{}render();});
 const panel=swatches.closest('#colorPalettePanel');new ResizeObserver(([entry])=>{
  const {width,height}=entry.contentRect;if(!width||!height)return;
  const resized=panel.dataset.dockHeight||panel.style.height;
  panel.style.setProperty('--swatch-h',Math.round(Math.max(9,Math.min(26,width*.13,resized?(height-68)/3:26)))+'px');
  const compact=width<125;[...tabs.children].forEach((b,i)=>{const label=i?'히스토리':'컬러 세트';b.title=label;b.setAttribute('aria-label',label);const text=compact?(i?'기록':'색상'):label;if(b.textContent!==text)b.textContent=text;});
 }).observe(panel);
 render();show(0);
}
