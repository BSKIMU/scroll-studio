import {paintStrokes} from './drawing.js?v=20261025-release1';
import {layerStrokes,layerVisible} from './layers.js?v=20261025-release1';
import {cachedBitmap,paintGenerated,applyLayerEffects} from './layer-effects.js?v=20261025-release1';
const surface=(w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;};
// Clipping is baked into this layer's alpha, keeping its editable strokes and
// blend mode separate. Every output path uses this same renderer.
export function paintLayerCanvas(c,layer,w,h,visiting=new Set(),images=null){
 const cv=surface(w,h);
 if(visiting.has(layer.id))return cv;
 const ctx=cv.getContext('2d'),image=images?.get(layer.bitmap)||cachedBitmap(layer.bitmap),t=layer.transform||{};
 ctx.save();ctx.translate((t.x||0)*w,(t.y||0)*h);ctx.translate(w/2,h/2);ctx.rotate((t.angle||0)*Math.PI/180);ctx.scale(t.scaleX??1,t.scaleY??1);ctx.translate(-w/2,-h/2);
 if(layer.adjustment){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);}if(image)ctx.drawImage(image,0,0,w,h);paintGenerated(ctx,layer,w,h);
 paintStrokes(ctx,layerStrokes(c,layer.id).filter(s=>!s.mask).map(s=>({...s,layerOutline:null,selectionImage:images?.get(s.selectionMask),brushTipImage:images?.get(s.brushSettings?.tipImage),brushTextureImage:images?.get(s.brushSettings?.textureImage)})),w,h);ctx.restore();
 applyLayerEffects(cv,{...layer,nativeWidth:layer.nativeWidth||1000});
 if(layer.mask?.enabled!==false&&layer.mask){const mask=layerMaskCanvas(c,layer,w,h,images);ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-over';mask.width=1;}
 if(layer.clipTo){
  const base=c.paintLayers.find(l=>l.id===layer.clipTo);
  if(!base||!layerVisible(c,base)||!base.opacity){ctx.clearRect(0,0,w,h);return cv;}
  const chain=new Set(visiting);chain.add(layer.id);
  const mask=paintLayerCanvas(c,base,w,h,chain,images);
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-over';mask.width=1;
 }
 return cv;
}
export function layerMaskCanvas(c,layer,w,h,images=null){const cv=surface(w,h),ctx=cv.getContext('2d'),m=layer.mask;if(!m)return cv;ctx.save();if(m.linked!==false){const t=layer.transform||{};ctx.translate((t.x||0)*w,(t.y||0)*h);ctx.translate(w/2,h/2);ctx.rotate((t.angle||0)*Math.PI/180);ctx.scale(t.scaleX??1,t.scaleY??1);ctx.translate(-w/2,-h/2);}ctx.translate((m.x||0)*w,(m.y||0)*h);const image=images?.get(m.bitmap)||cachedBitmap(m.bitmap);if(image)ctx.drawImage(image,0,0,w,h);else if(m.base!==0){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);}paintStrokes(ctx,c.strokes.filter(s=>s.layerId===layer.id&&s.mask).map(s=>({...s,color:'#ffffff',selectionImage:images?.get(s.selectionMask)})),w,h);ctx.restore();if(m.invert){ctx.globalCompositeOperation='xor';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);}if(m.feather>0){const tmp=surface(w,h),tc=tmp.getContext('2d');tc.filter='blur('+m.feather*w/(layer.nativeWidth||w)+'px)';tc.drawImage(cv,0,0);ctx.globalCompositeOperation='copy';ctx.drawImage(tmp,0,0);tmp.width=1;}return cv;}
