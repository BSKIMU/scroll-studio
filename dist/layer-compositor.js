import {drawBlended} from './blend-modes.js?v=20261025-release1';
import {makeSurface,applyAdjustment} from './layer-effects.js?v=20261025-release1';
export function compositeLayer(ctx,l,...args){
 if(l.hidden)return;const opacity=l.opacity??1;
 if(l.adjustment){const mask=makeSurface(ctx.canvas.width,ctx.canvas.height);mask.getContext('2d').drawImage(l.canvas,...args);applyAdjustment(ctx,l.adjustment,mask,opacity);mask.width=1;return;}
 drawBlended(ctx,l.canvas,l.blendMode,opacity,...args);
}
// Groups occupy consecutive positions in the page order. A pass-through group
// evaluates its children against the existing backdrop; other groups isolate it.
export function compositeStack(ctx,items,depth=0){
 for(let i=0;i<items.length;){const item=items[i],folder=item.folders?.[depth];if(!folder){compositeLayer(ctx,item,...item.args);i++;continue;}
  let j=i+1;while(j<items.length&&items[j].folders?.[depth]?.id===folder.id)j++;
  const children=items.slice(i,j);i=j;if(folder.visible===false)continue;
  if(folder.blendMode==='pass-through'&&(folder.opacity??100)===100){compositeStack(ctx,children,depth+1);continue;}
  const cv=makeSurface(ctx.canvas.width,ctx.canvas.height),tc=cv.getContext('2d');
  if(folder.blendMode==='pass-through')tc.drawImage(ctx.canvas,0,0);
  compositeStack(tc,children,depth+1);
  if(folder.blendMode==='pass-through'){const alpha=(folder.opacity??100)/100;for(let y=0;y<cv.height;y+=256){const h=Math.min(256,cv.height-y),a=ctx.getImageData(0,y,cv.width,h),b=tc.getImageData(0,y,cv.width,h);for(let n=0;n<a.data.length;n+=4){const aa=a.data[n+3]/255,ba=b.data[n+3]/255,out=aa*(1-alpha)+ba*alpha;for(let k=0;k<3;k++)a.data[n+k]=out?(a.data[n+k]*aa*(1-alpha)+b.data[n+k]*ba*alpha)/out:0;a.data[n+3]=out*255;}ctx.putImageData(a,0,y);}}
  else drawBlended(ctx,cv,folder.blendMode,(folder.opacity??100)/100,0,0);
  cv.width=1;
 }
}
export function folderPath(page,key){const folders=page?.layerFolders||[];let f=folders.find(f=>f.keys?.includes(key));const result=[],seen=new Set();while(f&&!seen.has(f.id)){seen.add(f.id);result.unshift(f);f=folders.find(p=>p.id===f.parent);}return result;}
