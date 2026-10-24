export const makeSurface=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};
const decoded=new Map(),pending=new Map(),transient=new Map();let bytes=0;
export function cachedBitmap(src){if(transient.has(src))return transient.get(src);const im=decoded.get(src);if(im){decoded.delete(src);decoded.set(src,im);}return im;}
export async function loadBitmap(src){
 if(!src)return null;if(transient.has(src)||decoded.has(src))return cachedBitmap(src);if(pending.has(src))return pending.get(src);
 if(!/^data:image\/(png|jpeg|webp|gif|bmp);base64,/i.test(src))throw Error('레이어 이미지는 내장 PNG/JPEG/WebP/BMP만 지원합니다.');
 const task=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{pending.delete(src);decoded.set(src,im);bytes+=im.width*im.height*4;for(const [key,old]of decoded){if(bytes<=64*1024*1024||decoded.size===1)break;bytes-=old.width*old.height*4;decoded.delete(key);}resolve(im);};im.onerror=()=>{pending.delete(src);reject(Error('레이어 이미지를 읽지 못했습니다.'));};im.src=src;});pending.set(src,task);return task;
}
export function rememberTransientBitmap(src,image){transient.set(src,image);}
export function forgetBitmap(src){transient.delete(src);const old=decoded.get(src);if(old){bytes-=old.width*old.height*4;decoded.delete(src);}}
export function rememberBitmap(src,image){forgetBitmap(src);decoded.set(src,image);bytes+=image.width*image.height*4;}
export async function prepareLayerImages(c,id=null){const images=new Map(),take=async src=>{if(src)images.set(src,await loadBitmap(src));};const selected=new Set();let layer=c.paintLayers?.find(l=>l.id===id);while(layer&&!selected.has(layer.id)){selected.add(layer.id);layer=c.paintLayers.find(l=>l.id===layer.clipTo);}for(const l of (c.paintLayers||[]).filter(l=>!id||selected.has(l.id)))for(const src of [l.bitmap,l.mask?.bitmap,l.alphaMask])if(src)await take(src);if(c.pixelSelection?.bitmap)await take(c.pixelSelection.bitmap);for(const src of new Set((c.strokes||[]).flatMap(s=>[s.selectionMask,s.brushSettings?.tipImage,s.brushSettings?.textureImage]).filter(Boolean)))await take(src);return images;}
const clamp=(x,a=0,b=255)=>Math.max(a,Math.min(b,x));
const rgb=hex=>[1,3,5].map(n=>parseInt((hex||'#000000').slice(n,n+2),16));
const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;
function hsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;if(!d)return [0,0,l];let h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;return [h/6,d/(1-Math.abs(2*l-1)),l];}
function fromHsl(h,s,l){const f=n=>{const k=(n+h*12)%12;return 255*(l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1)));};return [f(0),f(8),f(4)];}
export const adjustmentTypes={brightness:'밝기 / 대비',hsl:'색상 / 채도 / 명도',levels:'레벨 보정',curves:'톤 커브',balance:'컬러 밸런스',gradient:'그라데이션 맵',invert:'계조 반전',posterize:'계조화',threshold:'2계조화',gray:'흑백'};
export function adjustPixels(data,settings){
 const {type}=settings,amount=Number(settings.amount??0),a=rgb(settings.colorA||'#102040'),b=rgb(settings.colorB||'#ffedc0');
 for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;let r=data[i],g=data[i+1],bl=data[i+2],v=lum(r,g,bl),out=[r,g,bl];
  if(type==='invert')out=out.map(x=>255-x);
  else if(type==='gray')out=[v,v,v];
  else if(type==='threshold')out=out.map(()=>v>Number(settings.threshold??128)?255:0);
  else if(type==='posterize'){const n=Math.max(2,Number(settings.steps??4))-1;out=out.map(x=>Math.round(x/255*n)*255/n);}
  else if(type==='brightness'){const c=clamp(Number(settings.contrast??0),-100,100),f=(259*(c*2.55+255))/(255*(259-c*2.55));out=out.map(x=>f*(x-128)+128+amount*2.55);}
  else if(type==='levels'){const lo=Number(settings.black??0),hi=Math.max(lo+1,Number(settings.white??255)),gamma=Math.max(.1,Number(settings.gamma??1));out=out.map(x=>255*Math.pow(clamp((x-lo)/(hi-lo),0,1),1/gamma));}
  else if(type==='curves'){const points=[[0,settings.low??0],[64,settings.quarter??64],[128,settings.mid??128],[192,settings.threeQuarter??192],[255,settings.high??255]];out=out.map((x,k)=>{if(settings.channel&&settings.channel!=='rgb'&&k!=={red:0,green:1,blue:2}[settings.channel])return x;let i=1;while(i<4&&x>points[i][0])i++;const [a,b]=[points[i-1],points[i]];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);});}
  else if(type==='balance')out=[r+Number(settings.red??0),g+Number(settings.green??0),bl+Number(settings.blue??0)];
  else if(type==='hsl'){let [h,s,l]=hsl(r,g,bl);h=(h+Number(settings.hue??0)/360+1)%1;s=clamp(s+Number(settings.saturation??0)/100,0,1);l=clamp(l+Number(settings.lightness??0)/100,0,1);out=fromHsl(h,s,l);}
  else if(type==='gradient')out=a.map((x,k)=>x+(b[k]-x)*v/255);
  for(let k=0;k<3;k++)data[i+k]=clamp(out[k]);
 }return data;
}
export function applyAdjustment(ctx,settings,mask=null,opacity=1){
 const w=ctx.canvas.width,h=ctx.canvas.height;
 for(let y=0;y<h;y+=256){const n=Math.min(256,h-y),im=ctx.getImageData(0,y,w,n),old=new Uint8ClampedArray(im.data),m=mask?.getContext('2d').getImageData(0,y,w,n).data;adjustPixels(im.data,settings);for(let i=0;i<im.data.length;i+=4){const alpha=opacity*(m?m[i+3]/255:1);for(let k=0;k<3;k++)im.data[i+k]=old[i+k]+(im.data[i+k]-old[i+k])*alpha;}ctx.putImageData(im,0,y);}
}
export function paintGenerated(ctx,l,w,h){
 const g=l.generated;if(!g)return;
 if(g.kind==='solid'){ctx.fillStyle=g.color||'#ffffff';ctx.fillRect(0,0,w,h);}
 if(g.kind==='gradient'){const angle=Number(g.angle??90)*Math.PI/180,dx=Math.cos(angle)*w/2,dy=Math.sin(angle)*h/2;const gradient=g.radial?ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)/2):ctx.createLinearGradient(w/2-dx,h/2-dy,w/2+dx,h/2+dy);gradient.addColorStop(0,g.colorA||'#000000');gradient.addColorStop(1,g.transparent?'#ffffff00':g.colorB||'#ffffff');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);}
 if(g.kind==='tone'){const spacing=Math.max(1,Number(g.spacing??12)*w/(l.nativeWidth||w)),density=clamp(Number(g.density??35),0,100)/100,tile=makeSurface(Math.ceil(spacing),Math.ceil(spacing)),tc=tile.getContext('2d'),size=tile.width;tc.fillStyle=g.color||'#000000';if(density>=1)tc.fillRect(0,0,size,size);else for(let y=-size/2;y<size*2;y+=size)for(let x=-size/2;x<size*2;x+=size){if(g.shape==='line')tc.fillRect(x-size/2,y-size*density/2,size,size*density);else if(g.shape==='square'){const q=Math.sqrt(density)*size;tc.fillRect(x-q/2,y-q/2,q,q);}else if(g.shape==='diamond'){const q=Math.sqrt(density/2)*size;tc.beginPath();tc.moveTo(x,y-q);tc.lineTo(x+q,y);tc.lineTo(x,y+q);tc.lineTo(x-q,y);tc.closePath();tc.fill();}else if(g.shape==='cross'){const q=size*(1-Math.sqrt(1-density));tc.fillRect(x-size/2,y-q/2,size,q);tc.fillRect(x-q/2,y-size/2,q,size);}else{tc.beginPath();tc.arc(x,y,Math.sqrt(density/Math.PI)*size,0,Math.PI*2);tc.fill();}}
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate(Number(g.angle??45)*Math.PI/180);ctx.scale(spacing/size,spacing/size);ctx.fillStyle=ctx.createPattern(tile,'repeat');const d=Math.hypot(w,h)*size/spacing;ctx.fillRect(-d,-d,d*2,d*2);ctx.restore();tile.width=1;
 }
}
export function applyLayerEffects(cv,l){
 const ctx=cv.getContext('2d');if(l.outline&&l.outlineWidth>0){const src=makeSurface(cv.width,cv.height);src.getContext('2d').drawImage(cv,0,0);ctx.clearRect(0,0,cv.width,cv.height);const r=l.outlineWidth*cv.width/(l.nativeWidth||cv.width);for(let i=0;i<24;i++)ctx.drawImage(src,Math.cos(i*Math.PI/12)*r,Math.sin(i*Math.PI/12)*r);ctx.globalCompositeOperation='source-in';ctx.fillStyle=l.outline;ctx.fillRect(0,0,cv.width,cv.height);ctx.globalCompositeOperation='source-over';ctx.drawImage(src,0,0);src.width=1;}if(l.expression&&l.expression!=='color')applyAdjustment(ctx,{type:l.expression==='gray'?'gray':'threshold',threshold:l.threshold??128});
 if(l.colorEffect){applyAdjustment(ctx,{type:'gradient',colorA:l.colorEffect.dark,colorB:l.colorEffect.light});}
 if(l.lineExtract){const w=cv.width,h=cv.height,im=ctx.getImageData(0,0,w,h),src=new Uint8ClampedArray(im.data),limit=l.lineExtract.threshold??35;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,j=(y*w+Math.min(w-1,x+1))*4,k=(Math.min(h-1,y+1)*w+x)*4,v=lum(src[i],src[i+1],src[i+2]),edge=Math.abs(v-lum(src[j],src[j+1],src[j+2]))+Math.abs(v-lum(src[k],src[k+1],src[k+2]));im.data[i]=im.data[i+1]=im.data[i+2]=0;im.data[i+3]=edge>limit?src[i+3]:0;}ctx.putImageData(im,0,0);}
}
