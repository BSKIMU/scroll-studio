import {loadBitmap,makeSurface,rememberBitmap} from './layer-effects.js?v=20261025-release1';
import {rasterScale} from './canvas-coordinates.js?v=20261025-release1';
import {typingTarget} from './editor-history.js?v=20261025-release1';
export function imagePlacement(width,height,imageWidth,imageHeight,center=[.5,.5],upscale=false){
 const fit=Math.min(upscale?Infinity:1,width/imageWidth,height/imageHeight),w=imageWidth*fit,h=imageHeight*fit;
 return {x:Math.max(0,Math.min(width-w,center[0]*width-w/2)),y:Math.max(0,Math.min(height-h,center[1]*height-h/2)),w,h};
}
export async function prepareImageLayer(file,width,height,{center,upscale=false}={}){
 if(file.size>32*1024*1024)throw Error('이미지는 32 MiB 이하로 가져오세요.');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('이미지를 읽지 못했습니다.'));reader.readAsDataURL(file);});
 const image=await loadBitmap(data);if(image.width*image.height>24000000)throw Error('이미지 해상도는 24 MP 이하로 가져오세요.');
 const scale=rasterScale(width,height),cv=makeSurface(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale))),r=imagePlacement(width,height,image.width,image.height,center,upscale),ctx=cv.getContext('2d');
 ctx.drawImage(image,r.x*scale,r.y*scale,r.w*scale,r.h*scale);const bitmap=cv.toDataURL('image/png');rememberBitmap(bitmap,cv);return {bitmap,source:data};
}
export function installImagePaste({canPaste,insert,toast},target=document){
 target.addEventListener('paste',e=>{
  if(e.defaultPrevented||typingTarget(e.target)||!canPaste())return;
  const items=[...(e.clipboardData?.items||[])],files=items.filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);
  if(!files.length)files.push(...[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/')));
  if(!files.length)return;e.preventDefault();
  Promise.resolve(insert(files)).catch(error=>toast(error.message||'이미지를 붙여넣지 못했습니다.'));
 });
}
