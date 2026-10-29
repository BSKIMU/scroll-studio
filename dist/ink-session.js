import {paintStrokes} from './drawing.js?v=20261028-guide3';
import {layerStrokes,layerVisible} from './layers.js?v=20261028-guide3';
import {drawGuideComposite} from './guide-composite.js?v=20261028-guide3';
import {maskFrame,paintFrame} from './pages.js?v=20261029-library1';
import {balloonDraw} from './balloons.js?v=20261025-release1';

const SIZE=256,BUDGET=24*1024*1024;
const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const clear=c=>c.getContext('2d').clearRect(0,0,c.width,c.height);
export function strokeRegion(stroke,w,h,start=0){
 const points=stroke.points.slice(start),base=stroke.size*w/1000,blur=stroke.brush==='airbrush'||stroke.erase?0:base*(1-(stroke.hardness??100)/100)*.45,pad=base*(stroke.brushSettings?2+(stroke.brushSettings.scatter||0)/100:.5)+blur*3+3;
 let x=w,y=h,r=0,b=0;for(const p of points){x=Math.min(x,p[0]*w-pad);y=Math.min(y,p[1]*h-pad);r=Math.max(r,p[0]*w+pad);b=Math.max(b,p[1]*h+pad);}return {x:Math.max(0,Math.floor(x)),y:Math.max(0,Math.floor(y)),r:Math.min(w,Math.ceil(r)),b:Math.min(h,Math.ceil(b))};
}
// A bounded cache of touched tiles. Old layers are rasterized once per tile;
// mature curve segments are committed once, with only the live tip replaceable.
export class InkSession{
 constructor(c,target,stroke,{pageWidth,images={},guides=true,replace=false,clipMask=null}={}){
  this.clipMask=clipMask;this.cut=c;this.target=target;this.stroke=stroke;this.w=target.width;this.h=target.height;this.pageWidth=pageWidth;this.images=images;this.guides=guides;this.replace=replace||!!stroke.brushSettings||['none','weak','strong'].includes(stroke.antialias);this.tiles=new Map();this.count=0;this.lastRegion=null;
  this.layer=c.paintLayers.find(l=>l.id===stroke.layerId);this.style={...stroke,color:this.layer.displayColor||stroke.color};
  const prior={...c,strokes:c.strokes.filter(s=>s!==stroke)};this.layers=c.paintLayers.map(l=>({layer:l,strokes:layerStrokes(prior,l.id)}));
  const halo=s=>s.brush==='airbrush'||s.erase?0:s.size*this.w/1000*(1-(s.hardness??100)/100)*1.35;let pad=halo(stroke);for(const {layer,strokes}of this.layers)for(const s of strokes)pad=Math.max(pad,halo(s)+(layer.outline?(layer.outlineWidth||2)*this.w/1000:0));this.pad=Math.ceil(2+pad);
  const size=SIZE+2*this.pad;this.scratch=surface(size,size);this.output=surface(size,size);this.limit=Math.max(1,Math.floor(BUDGET/(size*size*4*3)));
  this.stats={frames:0,pixels:0,maxMs:0,peakBytes:0};
 }
 at(canvas,tile,fn){const ctx=canvas.getContext('2d');ctx.save();ctx.translate(-tile.x,-tile.y);fn(ctx);ctx.restore();}
 mask(canvas,tile){this.at(canvas,tile,ctx=>{maskFrame(ctx,this.cut,this.w,this.h);if(this.clipMask){ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.clipMask,0,0);ctx.restore();}});}
 tile(tx,ty){
  const key=tx+','+ty;if(this.tiles.has(key)){const tile=this.tiles.get(key);this.tiles.delete(key);this.tiles.set(key,tile);return tile;}
  if(this.tiles.size>=this.limit){const [key,old]=this.tiles.entries().next().value;for(const cv of [old.base,old.active,old.over])cv.width=1;this.tiles.delete(key);}
  const size=SIZE+2*this.pad,tile={x:tx-this.pad,y:ty-this.pad,tx,ty,base:surface(size,size),active:surface(size,size),over:surface(size,size),done:this.stroke.brush==='airbrush'?0:1},c=this.cut;
  this.at(tile.base,tile,ctx=>{ctx.fillStyle='#fafbf8';if((!c.pageId||c.pageBase||c.frame?.fill)&&!(c.pageBase&&c.onTop))ctx.fillRect(0,0,this.w,this.h);});this.mask(tile.base,tile);
  if(this.guides&&c.visible.background){clear(this.scratch);this.at(this.scratch,tile,ctx=>drawGuideComposite(ctx,this.images,c,this.w,this.h,this.pageWidth));this.mask(this.scratch,tile);const ctx=tile.base.getContext('2d');ctx.globalAlpha=c.guideOpacity/100;ctx.drawImage(this.scratch,0,0);ctx.globalAlpha=1;}
  let above=false;for(const {layer,strokes}of this.layers){if(layer.id===this.layer.id){this.at(tile.active,tile,ctx=>paintStrokes(ctx,strokes,this.w,this.h));above=true;continue;}if(!layerVisible(c,layer)||!c.visible.sketch||!strokes.length)continue;clear(this.scratch);this.at(this.scratch,tile,ctx=>paintStrokes(ctx,strokes,this.w,this.h,{surface:{width:size,height:size,x:tile.x,y:tile.y}}));this.mask(this.scratch,tile);const ctx=(above?tile.over:tile.base).getContext('2d');ctx.globalAlpha=layer.opacity/100;ctx.drawImage(this.scratch,0,0);ctx.globalAlpha=1;}
  clear(this.scratch);this.at(this.scratch,tile,ctx=>paintFrame(ctx,{...c,widthPixels:this.pageWidth*c.width/100},this.w,this.h));tile.over.getContext('2d').drawImage(this.scratch,0,0);
  if(c.visible.text&&c.layerSettings.text.visible)for(const b of c.bubbles)if(b.clipToFrame){clear(this.scratch);this.at(this.scratch,tile,ctx=>balloonDraw(ctx,b,this.w,this.h));this.mask(this.scratch,tile);const ctx=tile.over.getContext('2d');ctx.globalAlpha=c.layerSettings.text.opacity/100;ctx.drawImage(this.scratch,0,0);ctx.globalAlpha=1;}
  this.tiles.set(key,tile);this.stats.peakBytes=Math.max(this.stats.peakBytes,(this.tiles.size*3+2)*size*size*4);return tile;
 }
 update(final=false){
  const started=performance.now(),n=this.stroke.points.length,region=strokeRegion(this.stroke,this.w,this.h,this.replace?0:Math.max(0,this.count-3));this.style.points=this.stroke.points;
  if(this.replace&&this.lastRegion){region.x=Math.min(region.x,this.lastRegion.x);region.y=Math.min(region.y,this.lastRegion.y);region.r=Math.max(region.r,this.lastRegion.r);region.b=Math.max(region.b,this.lastRegion.b);}if(this.replace)this.lastRegion=strokeRegion(this.stroke,this.w,this.h);this.count=n;
  const end=final?n:Math.max(this.stroke.brush==='airbrush'?0:1,n-1),ctx=this.target.getContext('2d');
  for(let ty=Math.floor(region.y/SIZE)*SIZE;ty<region.b;ty+=SIZE)for(let tx=Math.floor(region.x/SIZE)*SIZE;tx<region.r;tx+=SIZE){
   const tile=this.tile(tx,ty);if(!this.replace&&end>tile.done){this.at(tile.active,tile,c=>paintStrokes(c,[this.style],this.w,this.h,{start:tile.done,end,dot:false}));tile.done=end;}
   clear(this.scratch);this.scratch.getContext('2d').drawImage(tile.active,0,0);this.at(this.scratch,tile,c=>paintStrokes(c,[this.style],this.w,this.h,{start:this.replace?1:end,end:n,dot:n===1}));this.mask(this.scratch,tile);
   clear(this.output);const out=this.output.getContext('2d');out.drawImage(tile.base,0,0);out.globalAlpha=this.cut.visible.sketch?this.layer.opacity/100:0;out.drawImage(this.scratch,0,0);out.globalAlpha=1;out.drawImage(tile.over,0,0);
   const w=Math.min(SIZE,this.w-tx),h=Math.min(SIZE,this.h-ty);ctx.clearRect(tx,ty,w,h);ctx.drawImage(this.output,this.pad,this.pad,w,h,tx,ty,w,h);this.stats.pixels+=w*h;
  }
  this.stats.frames++;this.stats.maxMs=Math.max(this.stats.maxMs,performance.now()-started);
 }
 dispose(){if(this.clipMask)this.clipMask.width=1;for(const t of this.tiles.values())for(const cv of [t.base,t.active,t.over])cv.width=1;this.tiles.clear();this.scratch.width=this.output.width=1;}
}
