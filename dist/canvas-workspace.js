export function pasteboardSize(width,height,paperWidth){
 const x=Math.max(800,width*1.5),y=Math.max(600,height*1.5);
 return {x,y,width:Math.max(paperWidth,width-88)+x*2};
}

// Real scrollable margins keep pointer coordinates, zoom anchors and frame
// transforms in the same DOM coordinate system as the drawing canvas.
export function setupCanvasWorkspace(){
 const viewport=document.getElementById('viewport'),paper=document.getElementById('paper');
 const stage=document.createElement('div');stage.id='pasteboard';stage.append(...viewport.childNodes);viewport.append(stage);
 let ready=false;
 const surface=()=>document.getElementById('pageSurface')||paper;
 function layout(){
  const sheet=surface(),before=paper.getBoundingClientRect(),size=pasteboardSize(viewport.clientWidth,viewport.clientHeight,sheet.offsetWidth);size.x=Math.max(size.x,(before.width-paper.offsetWidth)/2+viewport.clientWidth);size.y=Math.max(size.y,(before.height-paper.offsetHeight)/2+viewport.clientHeight);size.width=Math.max(sheet.offsetWidth,viewport.clientWidth-88)+size.x*2;
  stage.style.width=size.width+'px';stage.style.padding=`${size.y}px ${size.x}px`;
  const after=paper.getBoundingClientRect();
  if(ready){viewport.scrollLeft+=after.left-before.left;viewport.scrollTop+=after.top-before.top;}else{ready=true;home();}
 }
 function home(y=0){
  const r=surface().getBoundingClientRect(),v=viewport.getBoundingClientRect();
  viewport.scrollTo({left:viewport.scrollLeft+r.left-v.left-(viewport.clientWidth-r.width)/2,top:viewport.scrollTop+r.top-v.top-26+y,behavior:'instant'});
 }
 new ResizeObserver(layout).observe(viewport);new ResizeObserver(layout).observe(paper);
 viewport.addEventListener('canvas-home',event=>{layout();home(event.detail?.y||0);});
 layout();return {layout,home};
}
