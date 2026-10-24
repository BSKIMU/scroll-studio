export function setupLayerThumbnails(box,draw){
 const label=document.createElement('label');label.className='thumbnail-menu';label.textContent='▧ 미리보기';const menu=document.createElement('select');menu.id='layerThumbnailSize';menu.setAttribute('aria-label','레이어 썸네일 크기');for(const [v,t]of [['none','없음 · 글만'],['small','작게'],['medium','보통'],['large','크게']])menu.add(new Option(t,v));label.append(menu);label.hidden=true;box.querySelector('#layerRows').before(label);const popup=document.createElement('div');popup.id='layerThumbnailContext';popup.hidden=true;popup.setAttribute('role','menu');popup.setAttribute('aria-label','레이어 미리보기 크기');document.body.append(popup);popup.append(document.createTextNode('레이어 미리보기'));for(const option of menu.options){const button=document.createElement('button');button.textContent=option.text;button.dataset.value=option.value;button.setAttribute('role','menuitemradio');button.onclick=()=>{menu.value=option.value;menu.onchange();popup.hidden=true;};popup.append(button);}box.addEventListener('contextmenu',e=>{if(e.target.closest('input,textarea,select'))return;e.preventDefault();for(const button of popup.querySelectorAll('button'))button.setAttribute('aria-checked',String(button.dataset.value===menu.value));popup.hidden=false;popup.style.left=Math.min(e.clientX,innerWidth-164)+'px';popup.style.top=Math.min(e.clientY,innerHeight-190)+'px';popup.querySelector('button[aria-checked=true]')?.focus();});document.addEventListener('pointerdown',e=>{if(!popup.contains(e.target))popup.hidden=true;});popup.onkeydown=e=>{if(e.key==='Escape')popup.hidden=true;};
 menu.value='large';try{const saved=localStorage.getItem('scroll-layer-thumbnails');if([...menu.options].some(o=>o.value===saved))menu.value=saved;}catch{}
 let current=[],epoch=0,observer=null;
 menu.onchange=()=>{try{localStorage.setItem('scroll-layer-thumbnails',menu.value);}catch{}renderRows(current);};
 function renderRows(entries){
  current=entries;const token=++epoch;observer?.disconnect();box.dataset.thumbnails=menu.value;
  box.querySelectorAll('.layer-thumbnail').forEach(el=>el.remove());
  if(menu.value==='none')return;
  const pending=new Map();let queue=Promise.resolve();
  observer=new IntersectionObserver(items=>{
   for(const item of items){
    if(!item.isIntersecting)continue;
    const parts=pending.get(item.target);if(!parts)continue;
    pending.delete(item.target);observer.unobserve(item.target);
    queue=queue.then(async()=>{if(token!==epoch||!item.target.isConnected)return;try{await draw(parts,item.target);}catch{item.target.title='미리보기를 읽지 못했습니다';}});
   }
  },{root:box,rootMargin:'120px'});
  for(const {row,parts}of entries){
   const name=row.querySelector('.layer-name');if(!name)continue;
   let caption=name.querySelector('.layer-caption');
   if(!caption){caption=document.createElement('span');caption.className='layer-caption';caption.append(...name.childNodes);name.append(caption);}
   const cv=document.createElement('canvas');cv.width=cv.height=128;cv.className='layer-thumbnail';cv.setAttribute('aria-hidden','true');cv.title=caption.textContent+' 미리보기';
   name.prepend(cv);
   pending.set(cv,parts);observer.observe(cv);
  }
 }
 function render(c){renderRows(c?[...box.querySelectorAll('[data-layer]')].map(row=>({row,parts:[{cut:c,ids:[row.dataset.layer]}]})):[]);}
 function renderPage(stack){
  const paints=new Map(stack.paints.map(entry=>[entry.key,entry]));
  renderRows([...box.querySelectorAll('[data-stack-key]')].map(row=>{
   const key=row.dataset.stackKey,entry=paints.get(key);
   const parts=entry?[{cut:entry.cut,ids:[entry.model.id]}]:key==='rough'?[{cut:stack.base,ids:stack.base.roughLayerIds}]:stack.cuts.filter(c=>c.background||c.guide).map(cut=>({cut,ids:['background','guide'].filter(id=>cut[id])}));
   return {row,parts};
  }));
 }
 return {render,renderPage};
}
