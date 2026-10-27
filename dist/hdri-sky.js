import {DataTexture,DataUtils,RGBAFormat,HalfFloatType,LinearSRGBColorSpace,LinearFilter,RepeatWrapping,EquirectangularReflectionMapping,PMREMGenerator} from 'three';
import {HDRLoader} from './vendor/addons/loaders/HDRLoader.js';
import {analyzeHDRLighting} from './hdri-lighting.js?v=20261027-natural1';

export const hdriFiles={
 'hdri-day':'kloofendal_48d_partly_cloudy_puresky_2k.hdr',
 'hdri-sunset':'kloppenheim_06_puresky_2k.hdr',
 'hdri-night':'clarens_night_02_2k.hdr',
 'hdri-aurora':'../skies/aurora_dark_night_clouds_2k.hdr',
 'hdri-predawn':'qwantani_dawn_puresky_2k.hdr',
 'hdri-dawn':'qwantani_sunrise_puresky_2k.hdr',
 'hdri-twilight':'belfast_sunset_puresky_2k.hdr',
 'hdri-winter':'snow_field_puresky_2k.hdr',
 'hdri-overcast':'kloofendal_overcast_puresky_2k.hdr',
 'hdri-rain':'kloofendal_overcast_puresky_2k.hdr',
 'hdri-storm':'kloofendal_overcast_puresky_2k.hdr',
 'hdri-summer':'kloofendal_48d_partly_cloudy_puresky_2k.hdr',
 'hdri-autumn':'kloppenheim_06_puresky_2k.hdr',
 'hdri-horror':'clarens_night_02_2k.hdr'
};
export const skyGrades={'hdri-twilight':[1.12,.66,1.28],'hdri-rain':[.55,.65,.8],'hdri-storm':[.26,.32,.42],'hdri-horror':[.5,.7,.65]};
export function gradeSky(data,id){const grade=skyGrades[id];if(grade)for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)data[i+c]=DataUtils.toHalfFloat(Math.min(65000,DataUtils.fromHalfFloat(data[i+c])*grade[c]));return data;}
function texture(data,width,height){
 const t=new DataTexture(data,width,height,RGBAFormat,HalfFloatType);t.colorSpace=LinearSRGBColorSpace;t.mapping=EquirectangularReflectionMapping;t.minFilter=t.magFilter=LinearFilter;t.wrapS=RepeatWrapping;t.flipY=true;t.generateMipmaps=false;t.needsUpdate=true;return t;
}
// The visible panorama remains 2k. Diffuse/rough reflections need only a 1k
// source; average radiance (not encoded half-float bits) to retain sun energy.
export function lightingSource(source){
 const {width,height,data}=source.image,w=width/2,h=height/2,out=new Uint16Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++){
  const a=(y*2*width+x*2)*4+c;
  out[(y*w+x)*4+c]=DataUtils.toHalfFloat((DataUtils.fromHalfFloat(data[a])+DataUtils.fromHalfFloat(data[a+4])+DataUtils.fromHalfFloat(data[a+width*4])+DataUtils.fromHalfFloat(data[a+width*4+4]))/4);
 }
 return texture(out,w,h);
}
export class HDRISky{
 constructor(renderer,makePMREM=r=>new PMREMGenerator(r)){this.renderer=renderer;this.makePMREM=makePMREM;this.loads=0;this.builds=0;}
 async load(id){
  this.dispose();const abort=this.abort=new AbortController(),start=performance.now(),r=this.renderer;let panorama,source,generator,target,saved;
  try{
   const response=await fetch(new URL('./assets/hdri/'+hdriFiles[id],import.meta.url),{signal:abort.signal});if(!response.ok)throw Error('HDRI 하늘을 읽지 못했습니다.');
   const bytes=await response.arrayBuffer();if(abort.signal.aborted)return null;
   const hdr=new HDRLoader().parse(bytes);panorama=texture(gradeSky(hdr.data,id),hdr.width,hdr.height);panorama.userData.hdri=true;panorama.userData.hdriLighting=analyzeHDRLighting(panorama.image);
   source=lightingSource(panorama);saved={target:r.getRenderTarget(),face:r.getActiveCubeFace(),mip:r.getActiveMipmapLevel(),xr:r.xr.enabled,shadow:r.shadowMap.autoUpdate};r.xr.enabled=false;r.shadowMap.autoUpdate=false;
   generator=this.makePMREM(r);target=generator.fromEquirectangular(source);
   this.texture=panorama;this.target=target;this.loads++;this.builds++;
   this.metrics={loads:this.loads,environmentBuilds:this.builds,prepareMs:Math.round(performance.now()-start),width:hdr.width,height:hdr.height,retainedGpuBytes:hdr.data.byteLength+target.width*target.height*8};
   return panorama;
  }catch(error){panorama?.dispose();target?.dispose();throw error;}
  finally{source?.dispose();generator?.dispose();if(saved){r.setRenderTarget(saved.target,saved.face,saved.mip);r.xr.enabled=saved.xr;r.shadowMap.autoUpdate=saved.shadow;}if(this.abort===abort)this.abort=null;}
 }
 dispose(){this.abort?.abort();this.abort=null;this.texture?.dispose();this.target?.dispose();this.texture=null;this.target=null;}
}
