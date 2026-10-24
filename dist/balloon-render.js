import {tailGeometry} from './balloon-contour.js?v=20261025-release1';
import {contourRadius,balloonSilhouette} from './balloon-outline.js?v=20261025-release1';
import {balloonDraw} from './balloons.js?v=20261025-release1';
import {ensureBalloonLayers} from './balloon-model.js?v=20261025-release1';

export function balloonBounds(b,w,h){
 const xs=[b.x*w,(b.x+b.w)*w],ys=[b.y*h,(b.y+b.h)*h];
 if((b.tail||'straight')!=='none'&&b.shape!=='text'){
  const t=b.tailPoint||[b.x+b.w*.42,b.y+b.h*1.24];xs.push(t[0]*w,t[0]*w+b.w*w*.06);ys.push(t[1]*h);
  const g=tailGeometry({...b,shape:b.shape||'ellipse'},b.x*w,b.y*h,b.w*w,b.h*h,t[0]*w,t[1]*h,contourRadius);
  for(const [, ...coords]of g?.commands||[])for(let i=0;i<coords.length;i+=2){xs.push(coords[i]);ys.push(coords[i+1]);}
 }
 // Thought scallops and the stroke extend beyond the nominal ellipse.
 const pad=Math.max(2,(b.line??2)*w/(b.metricWidth||1000)+Math.max(b.w*w,b.h*h)*.07);
 const left=Math.floor(Math.min(...xs)-pad),top=Math.floor(Math.min(...ys)-pad);
 return {left,top,width:Math.ceil(Math.max(...xs)+pad)-left,height:Math.ceil(Math.max(...ys)+pad)-top};
}
export function balloonLayers(c,w,h,createCanvas,mask,includeOutside=true){
 const setting=c.layerSettings.text;
 return ensureBalloonLayers(c).flatMap(layer=>[false,true].flatMap(clipped=>{
  const members=c.bubbles.filter(b=>b.balloonLayerId===layer.id&&!!b.clipToFrame===clipped);
  if(!members.length||(!includeOutside&&!clipped))return [];
  const boxes=members.map(b=>balloonBounds(b,w,h)),left=Math.min(...boxes.map(b=>b.left)),top=Math.min(...boxes.map(b=>b.top));
  const box=clipped?{left:0,top:0,width:w,height:h}:{left,top,width:Math.max(...boxes.map(b=>b.left+b.width))-left,height:Math.max(...boxes.map(b=>b.top+b.height))-top};
  const cv=createCanvas(box.width,box.height),ctx=cv.getContext('2d');ctx.translate(-box.left,-box.top);
  for(const b of members)balloonDraw(ctx,b,w,h,'fill');
  for(const b of members){
   ctx.save();
   for(const other of members){
    if(other===b||other.shape==='text')continue;
    const outside=new Path2D();outside.rect(box.left-10,box.top-10,box.width+20,box.height+20);outside.addPath(balloonSilhouette(other,w,h));ctx.clip(outside,'evenodd');
   }
   balloonDraw(ctx,b,w,h,'outline');ctx.restore();
  }
  for(const b of members)balloonDraw(ctx,b,w,h,'text');
  ctx.setTransform(1,0,0,1,0,0);if(clipped)mask(ctx,c,w,h);
  return [{balloonLayerId:layer.id,name:layer.name,canvas:cv,left:box.left,top:box.top,aboveFrames:!clipped,opacity:setting.opacity/100*(layer.opacity??100)/100,hidden:layer.visible===false||!setting.visible||!c.visible.text}];
 }));
}
// Draw the page-wide dialogue pass after every frame, including page roughs.
export function drawOutsideBalloons(ctx,c,w,h){
 const setting=c.layerSettings.text;if(c.pageBase&&c.roughVisible===false)return;if(!setting.visible||!c.visible.text)return;
 ctx.save();ctx.globalAlpha=setting.opacity/100;
 for(const b of c.bubbles)if(!b.clipToFrame)balloonDraw(ctx,b,w,h);
 ctx.restore();
}
export function layerCrop(layer,x,y,width,height){
 const left=x+(layer.left||0),top=y+(layer.top||0);
 const sx=Math.max(0,-left),sy=Math.max(0,-top),w=Math.min(layer.canvas.width-sx,width-Math.max(0,left)),h=Math.min(layer.canvas.height-sy,height-Math.max(0,top));
 return w>0&&h>0?{sx,sy,w,h,left:Math.max(0,left),top:Math.max(0,top)}:null;
}
export function splitBalloons(bubbles,paths){
 const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const groups=paths.map(()=>[]);
 for(const b of bubbles){if(b.clipToFrame){for(const group of groups)group.push(structuredClone(b));continue;}
  const center=[b.x+b.w/2,b.y+b.h/2],index=paths.findIndex(path=>inside(center,path));
  // A balloon in the gutter still belongs to exactly one cut and keeps its coordinates.
  groups[Math.max(0,index)].push(structuredClone(b));
 }return groups;
}
