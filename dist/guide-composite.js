import {drawGuideImage} from './frame-geometry.js?v=20261028-guide3';

// Individual BG/figure settings belong inside this surface. Tracing opacity is
// applied once to the completed image, so walls never bleed through the body.
export function drawGuidePass(ctx,image,cut,key,w,h,pageWidth){
 const setting=cut.layerSettings[key];
 if(!image||!setting?.visible)return;
 ctx.save();ctx.globalAlpha=setting.opacity/100;
 drawGuideImage(ctx,image,cut,w,h,pageWidth);ctx.restore();
}
export function drawGuideComposite(ctx,images,cut,w,h,pageWidth){
 for(const key of ['background','guide'])drawGuidePass(ctx,images[key],cut,key,w,h,pageWidth);
}
