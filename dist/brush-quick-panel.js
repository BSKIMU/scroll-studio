const sizes=[.7,1,1.5,2,2.5,3,4,5,6,7,8,10,12,15,17,20,25,30,40,50,60,70,80,100,120,150,170,200,250,300,400,500,600,700,800,1000,1200,1500,1700,2000];

export function installBrushQuickPanel(body){
 const source=document.getElementById('penSize'),alpha=document.getElementById('brushOpacity');
 const trigger=document.createElement('button'),panel=document.createElement('div');
 trigger.type='button';trigger.id='brushQuickPanel';trigger.setAttribute('aria-label','브러시 빠른 조절');trigger.title='브러시 크기 · 불투명도 빠른 조절';trigger.innerHTML='<span class="quick-full">브러시 빠른 조절</span><span class="quick-short">빠른 조절</span>';
 panel.id='brushSliderPopup';panel.popover='auto';trigger.popoverTargetElement=panel;trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','false');
 panel.innerHTML='<label>크기<output></output><input type="range" aria-label="브러시 크기" min="0" max="'+(sizes.length-1)+'" aria-orientation="vertical"></label><label>불투명도<output></output><input type="range" aria-label="브러시 불투명도" min="0" max="20" aria-orientation="vertical"></label><small>크기 손잡이를 길게 눌러 미세 조절</small>';
 body.prepend(trigger);document.body.append(panel);
 const [size,opacity]=panel.querySelectorAll('input'),[pixels,percent]=panel.querySelectorAll('output');
 function sync(){
  panel.style.setProperty('--brush-color',document.getElementById('penColor').value);
  const px=+source.value;size.value=sizes.reduce((a,v,i)=>Math.abs(v-px)<Math.abs(sizes[a]-px)?i:a,0);
  pixels.value=px+' px';percent.value=alpha.value+'%';opacity.value=Math.round(+alpha.value/5);
  size.setAttribute('aria-valuetext',pixels.value);opacity.setAttribute('aria-valuetext',percent.value);
 }
 function set(el,value){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));sync();}
 size.oninput=()=>set(source,sizes[+size.value]);opacity.oninput=()=>set(alpha,Math.max(+alpha.min,+opacity.value*5));
 const grip=document.createElement('button');grip.type='button';grip.className='brush-dock-grip';grip.title='드래그로 좌우에 붙이기 · 클릭으로 반대쪽에 붙이기';grip.setAttribute('aria-label',grip.title);grip.textContent='⠿';panel.prepend(grip);
 let dock=localStorage.getItem('brush-slider-side')||'left',slide=null,moved=false;
 function anchors(){const left=trigger.closest('#drawingTools').getBoundingClientRect().right+2;
  const edge=document.getElementById('rightPaletteDock')?.getBoundingClientRect();
  return {left,right:(edge?.width&&edge.left>innerWidth/2?edge.left:innerWidth)-panel.offsetWidth-2};}
 function position(){if(slide)return;const r=trigger.getBoundingClientRect();panel.style.left=Math.max(4,Math.min(innerWidth-panel.offsetWidth-4,anchors()[dock]))+'px';panel.style.top=Math.max(4,Math.min(innerHeight-panel.offsetHeight-4,r.top))+'px';}
 function setDockBehavior(){panel.popover=dock==='right'?'manual':'auto';}
 setDockBehavior();
 function attach(side){
  const opened=panel.matches(':popover-open');dock=side;localStorage.setItem('brush-slider-side',side);setDockBehavior();
  if(opened&&!panel.matches(':popover-open'))panel.showPopover();position();
 }
 const rightDock=document.getElementById('rightPaletteDock');
 if(rightDock)new ResizeObserver(()=>{if(panel.matches(':popover-open'))position();}).observe(rightDock);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dock==='right'&&panel.matches(':popover-open'))panel.hidePopover();});
 grip.onpointerdown=e=>{slide={x:e.clientX,left:panel.offsetLeft};moved=false;grip.setPointerCapture(e.pointerId);};
 grip.onpointermove=e=>{if(!slide)return;const x=slide.left+e.clientX-slide.x;if(Math.abs(e.clientX-slide.x)>3)moved=true;const a=anchors();panel.style.left=Math.max(4,Math.min(innerWidth-panel.offsetWidth-4,Math.abs(x-a.right)<28?a.right:Math.abs(x-a.left)<28?a.left:x))+'px';};
 grip.onlostpointercapture=()=>{slide=null;if(moved){const a=anchors();attach(Math.abs(panel.offsetLeft-a.right)<Math.abs(panel.offsetLeft-a.left)?'right':'left');}};
 grip.onclick=()=>{if(!moved)attach(dock==='right'?'left':'right');moved=false;};
 trigger.onclick=event=>{
  event.preventDefault();
  if(panel.matches(':popover-open')){panel.hidePopover();return;}
  sync();panel.showPopover();position();
 };
 panel.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(panel.matches(':popover-open'))));
 document.addEventListener('scroll',()=>{if(panel.matches(':popover-open'))position();},true);
 window.addEventListener('resize',()=>{if(panel.matches(':popover-open'))position();});
 document.addEventListener('tool-change',()=>panel.hidePopover());
 let drag=null;
 function coarse(y){
  const r=size.getBoundingClientRect(),t=Math.max(0,Math.min(1,(r.bottom-8-y)/(r.height-16)));
  set(source,sizes[Math.round(t*(sizes.length-1))]);
 }
 size.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag)return;e.preventDefault();size.focus();size.setPointerCapture(e.pointerId);
  drag={id:e.pointerId,y:e.clientY,px:+source.value,fine:false,moved:false};
  drag.timer=setTimeout(()=>{if(drag){drag.fine=true;panel.dataset.fine='true';}},420);
 });
 size.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId)return;const delta=drag.y-e.clientY;
  if(drag.fine)set(source,Math.max(.7,Math.min(2000,Math.round((drag.px+delta*.05)*10)/10)));
  else if(drag.moved||Math.abs(delta)>3){drag.moved=true;clearTimeout(drag.timer);coarse(e.clientY);}
 });
 function finish(e){if(drag?.id!==e.pointerId)return;if(e.type==='pointerup'&&!drag.fine&&!drag.moved)coarse(e.clientY);clearTimeout(drag.timer);drag=null;delete panel.dataset.fine;}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])size.addEventListener(type,finish);
 const observer=new MutationObserver(sync);
 for(const id of ['brushSizeValue','opacityValue'])observer.observe(document.getElementById(id),{childList:true,characterData:true,subtree:true});
 sync();return trigger;
}
