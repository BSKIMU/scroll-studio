// Canvas modes plus the channel operations used by desktop painting tools.
export const blendModes={normal:'표준',dissolve:'디졸브',darken:'비교(어두움)',multiply:'곱하기','color-burn':'색상 번','linear-burn':'선형 번',subtract:'감산',lighten:'비교(밝음)',screen:'스크린','color-dodge':'색상 닷지','glow-dodge':'발광 닷지',add:'더하기','add-glow':'더하기(발광)',overlay:'오버레이','soft-light':'소프트 라이트','hard-light':'하드 라이트',difference:'차이','vivid-light':'선명한 라이트','linear-light':'선형 라이트','pin-light':'핀 라이트','hard-mix':'하드 혼합',exclusion:'제외','darker-color':'컬러 비교(어두움)','lighter-color':'컬러 비교(밝음)',divide:'나누기',hue:'색조',saturation:'채도',color:'컬러',luminosity:'휘도'};
const native=new Set(['normal','darken','multiply','color-burn','lighten','screen','color-dodge','overlay','soft-light','hard-light','difference','exclusion','hue','saturation','color','luminosity']);
export const customBlend=mode=>!!mode&&!native.has(mode)&&mode!=='pass-through';
export const canvasBlend=mode=>native.has(mode)&&mode!=='normal'?mode:'source-over';
export const psdBlend=mode=>({add:'linear dodge','add-glow':'linear dodge','glow-dodge':'color dodge','pass-through':'pass through'}[mode]||((mode in blendModes)?mode.replaceAll('-',' '):'normal'));
const clamp=x=>Math.max(0,Math.min(1,x));
const burn=(b,s)=>b===1?1:s<=0?0:1-Math.min(1,(1-b)/s);
const dodge=(b,s)=>b===0?0:s>=1?1:Math.min(1,b/(1-s));
export function blendChannel(b,s,mode){switch(mode){
 case 'linear-burn':return Math.max(0,b+s-1);case 'subtract':return Math.max(0,b-s);case 'add':return Math.min(1,b+s);case 'add-glow':return b+s;case 'glow-dodge':return b/Math.max(1/255,1-s);
 case 'vivid-light':return s<=.5?burn(b,2*s):dodge(b,2*s-1);
 case 'linear-light':return clamp(b+2*s-1);case 'pin-light':return s<=.5?Math.min(b,2*s):Math.max(b,2*s-1);
 case 'hard-mix':return b+s<1?0:1;case 'divide':return s===0?1:Math.min(1,b/s);default:return s;
}}
export function blendPixels(dst,src,mode,opacity=1,originX=0,originY=0,width=1){
 for(let i=0;i<dst.length;i+=4){let sa=src[i+3]/255*opacity;if(!sa)continue;const ba=dst[i+3]/255;
  if(mode==='dissolve'){const p=i/4,x=originX+p%width,y=originY+Math.floor(p/width);let hash=Math.imul(x+1,73856093)^Math.imul(y+1,19349663);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);sa=(hash>>>0)/4294967296<sa?1:0;if(!sa)continue;}
  const oa=sa+ba*(1-sa);let chooseSource=true;
  if(mode==='darker-color'||mode==='lighter-color'){const b=.3*dst[i]+.59*dst[i+1]+.11*dst[i+2],s=.3*src[i]+.59*src[i+1]+.11*src[i+2];chooseSource=mode==='darker-color'?s<b:s>b;}
  for(let k=0;k<3;k++){const b=dst[i+k]/255,s=src[i+k]/255,B=mode==='darker-color'||mode==='lighter-color'?(chooseSource?s:b):blendChannel(b,s,mode);dst[i+k]=255*clamp((sa*(1-ba)*s+sa*ba*B+(1-sa)*ba*b)/oa);}
  dst[i+3]=Math.round(oa*255);
 }return dst;
}
export function drawBlended(ctx,source,mode='normal',opacity=1,...args){
 if(!opacity)return;if(!args.length)args=[0,0];
 if(!customBlend(mode)){ctx.save();ctx.globalAlpha*=opacity;ctx.globalCompositeOperation=canvasBlend(mode);ctx.drawImage(source,...args);ctx.restore();return;}
 // Read back only the affected rectangle, in bounded tiles (long webtoon pages).
 const dest=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],source.width,source.height];
 const [dx,dy,dw,dh]=dest,m=ctx.getTransform(),points=[[dx,dy],[dx+dw,dy],[dx,dy+dh],[dx+dw,dy+dh]].map(([x,y])=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f]);
 const x0=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0])))),y0=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))),x1=Math.min(ctx.canvas.width,Math.ceil(Math.max(...points.map(p=>p[0])))),y1=Math.min(ctx.canvas.height,Math.ceil(Math.max(...points.map(p=>p[1]))));
 const tile=document.createElement('canvas');tile.width=tile.height=512;const tc=tile.getContext('2d',{willReadFrequently:true});
 for(let y=y0;y<y1;y+=512)for(let x=x0;x<x1;x+=512){const w=Math.min(512,x1-x),h=Math.min(512,y1-y);tc.resetTransform();tc.clearRect(0,0,512,512);tc.setTransform(m.a,m.b,m.c,m.d,m.e-x,m.f-y);tc.drawImage(source,...args);const s=tc.getImageData(0,0,w,h),d=ctx.getImageData(x,y,w,h);blendPixels(d.data,s.data,mode,opacity*ctx.globalAlpha,x,y,w);ctx.putImageData(d,x,y);}
 tile.width=1;
}
