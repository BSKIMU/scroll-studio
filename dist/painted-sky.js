import {Texture,SRGBColorSpace,RepeatWrapping,ClampToEdgeWrapping,LinearFilter} from 'three';

// One decoded, fixed panorama. The source Blender file stays on this computer.
export class PaintedSky{
 constructor(){this.abort=null;this.texture=null;this.loads=0;}
 async load(){
  this.dispose();const abort=this.abort=new AbortController(),started=performance.now();
  let bitmap;
  try{
   const response=await fetch(new URL('./assets/skies/anime-sky.webp',import.meta.url),{signal:abort.signal});
   if(!response.ok)throw Error('Anime Sky 텍스처를 읽지 못했습니다.');
   bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'flipY',premultiplyAlpha:'none'});
   if(abort.signal.aborted){bitmap.close();return null;}
   const texture=new Texture(bitmap);texture.colorSpace=SRGBColorSpace;texture.wrapS=RepeatWrapping;texture.wrapT=ClampToEdgeWrapping;texture.minFilter=texture.magFilter=LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
   texture.userData.hemisphere=true;texture.userData.painted=true;
   this.texture=texture;this.loads++;this.metrics={loads:this.loads,prepareMs:Math.round(performance.now()-started),retainedGpuBytes:bitmap.width*bitmap.height*4,width:bitmap.width,height:bitmap.height};return texture;
  }finally{if(this.abort===abort)this.abort=null;}
 }
 dispose(){this.abort?.abort();this.abort=null;if(this.texture){this.texture.dispose();this.texture.image?.close();this.texture=null;}}
}
