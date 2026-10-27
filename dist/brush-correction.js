import {floodSpans} from './flood-fill.js?v=20261025-release1';
import {paintLayerCanvas} from './paint-layer-render.js?v=20261028-guide3';
import {fillReferenceLayers} from './coloring.js?v=20261028-guide3';
export function brushBoundary(c,layer,p,nativeWidth){
 const refs=fillReferenceLayers(c,layer,'reference').filter(l=>l.id!==layer.id||l.reference);if(!refs.length)return null;
 const scale=Math.min(1,Math.sqrt(2000000/(nativeWidth*c.height))),w=Math.max(1,Math.round(nativeWidth*scale)),h=Math.max(1,Math.round(c.height*scale)),cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{willReadFrequently:true});
 for(const l of refs){const image=paintLayerCanvas(c,l,w,h);ctx.drawImage(image,0,0);image.width=1;}
 const result=floodSpans(ctx.getImageData(0,0,w,h).data,w,h,p[0]*w,p[1]*h,24,{alphaThreshold:32,expand:1});cv.width=1;return {spans:result.spans,rowHeight:result.rowHeight};
}
export function correctStroke(points,amount){if(!amount||points.length<3)return points;const f=Math.max(0,Math.min(1,amount/100));return points.map((p,i)=>{if(!i||i===points.length-1)return p;const prev=points[i-1],next=points[i+1];return [p[0]+((prev[0]+next[0])/2-p[0])*f,p[1]+((prev[1]+next[1])/2-p[1])*f,...p.slice(2)];});}
export function vectorHit(stroke,p,r,w,h){for(let i=0;i<stroke.points.length;i++){const a=stroke.points[Math.max(0,i-1)],b=stroke.points[i],dx=(b[0]-a[0])*w,dy=(b[1]-a[1])*h,px=(p[0]-a[0])*w,py=(p[1]-a[1])*h,t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(px-t*dx,py-t*dy)<=r+stroke.size*w/2000)return true;}return false;}
