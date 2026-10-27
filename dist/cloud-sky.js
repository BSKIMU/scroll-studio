import * as T from 'three';

// The cloud volume is sampled only while baking this distant, static sky.
// Orbiting, Fly, manuscript captures and exports reuse a single owned cubemap.
export const cloudMemory={shape:128**3,detail:32**3,cube:6*512**2*4};
const vertexShader=`varying vec3 rayDirection;
void main(){rayDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader=`precision highp sampler3D;
uniform sampler3D shapeNoise;uniform sampler3D detailNoise;
uniform vec3 zenith;uniform vec3 horizon;uniform vec3 sunlight;uniform vec3 sunDirection;
uniform float coverage;uniform float seed;
varying vec3 rayDirection;
float density(vec3 p){
 float h=(length(p+vec3(0.0,1600.0,0.0))-1601.2)/1.2;
 if(h<=0.0||h>=1.0)return 0.0;
 vec3 uv=p*vec3(.23,.27,.23)+vec3(seed,.0,seed*.37);
 float shape=texture(shapeNoise,uv).r;
 float erosion=(1.0-texture(detailNoise,uv*4.1).r)*.06;
 float weather=smoothstep(.73,.92,texture(shapeNoise,vec3(p.x*.09,.17,p.z*.09)+vec3(seed+.31,0.0,seed*.37)).r);
 float profile=smoothstep(0.0,.16,h)*(1.0-smoothstep(.65,1.0,h));
 return max(0.0,(shape-(.99-(.10+coverage*.20)*weather)-erosion-h*h*.045)*24.0)*profile;
}
void main(){
 vec3 ray=normalize(rayDirection);
 vec3 sky=mix(horizon,zenith,pow(max(ray.y,0.0),.48));
 float sunDot=max(dot(ray,sunDirection),0.0);
 sky+=sunlight*(pow(sunDot,700.0)*2.4+pow(sunDot,20.0)*.12);
 if(ray.y>-.02){
  // Intersect a curved cloud shell: a flat slab with a short far cutoff leaves
  // an empty strip at the horizon. These distances remain finite at ray.y=0.
  float b=1600.0*ray.y;
  float t0=-b+sqrt(b*b+3841.44),t1=-b+sqrt(b*b+7685.76),stepSize=(t1-t0)/64.0;
  float transmittance=1.0;vec3 cloud=vec3(0.0);
  for(int i=0;i<64;i++){
   if(transmittance<.015)break;
   vec3 p=ray*(t0+(float(i)+.5)*stepSize);float d=density(p);
   if(d>.002){
    float shadow=density(p+sunDirection*.14)*.14+density(p+sunDirection*.4)*.26+density(p+sunDirection*.85)*.45;
    float transmission=exp(-shadow*6.0);
    vec3 light=mix(vec3(.30,.38,.49),horizon*.65,.38)+sunlight*(.35+.85*transmission);
    float alpha=1.0-exp(-d*stepSize*4.3);
    cloud+=transmittance*alpha*light;transmittance*=1.0-alpha;
   }
  }
  vec3 composite=cloud+sky*transmittance;
  sky=mix(sky,composite,smoothstep(-.02,.015,ray.y));
 }
 gl_FragColor=vec4(sky,1.0);
}`;

function volume(bytes,size){
 if(bytes.byteLength!==size**3)throw Error('구름 노이즈 파일 크기가 올바르지 않습니다.');
 const texture=new T.Data3DTexture(new Uint8Array(bytes),size,size,size);
 texture.format=T.RedFormat;texture.type=T.UnsignedByteType;texture.minFilter=texture.magFilter=T.LinearFilter;
 texture.wrapS=texture.wrapT=texture.wrapR=T.RepeatWrapping;texture.unpackAlignment=1;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}
export class CloudSky{
 constructor(renderer){this.renderer=renderer;this.target=null;this.abort=null;this.generation=0;this.builds=0;}
 async build(settings,preset){
  this.cancel();const generation=this.generation,abort=this.abort=new AbortController(),started=performance.now();
  // Coalesce lighting sliders: a drag should not bake six faces on every input.
  await new Promise((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},timer=setTimeout(()=>{abort.signal.removeEventListener('abort',cancel);resolve();},120);abort.signal.addEventListener('abort',cancel,{once:true});});
  const buffers=await Promise.all(['shape','detail'].map(async name=>{const response=await fetch(new URL(`./assets/clouds/${name}.bin`,import.meta.url),{signal:abort.signal});if(!response.ok)throw Error('구름 노이즈를 읽지 못했습니다.');return response.arrayBuffer();}));
  if(generation!==this.generation)return null;
  let shape,detail,geometry,material,target;
  try{
   shape=volume(buffers[0],128);detail=volume(buffers[1],32);
   const az=T.MathUtils.degToRad(settings.azimuth??35),alt=T.MathUtils.degToRad(settings.altitude??48);
   material=new T.ShaderMaterial({vertexShader,fragmentShader,side:T.BackSide,depthWrite:false,depthTest:false,toneMapped:false,uniforms:{shapeNoise:{value:shape},detailNoise:{value:detail},zenith:{value:new T.Color(preset[2])},horizon:{value:new T.Color(preset[3])},sunlight:{value:new T.Color(settings.lightColor||preset[4])},sunDirection:{value:new T.Vector3(Math.sin(az)*Math.cos(alt),Math.sin(alt),Math.cos(az)*Math.cos(alt))},coverage:{value:T.MathUtils.clamp(settings.cloudCoverage??.55,.1,.95)},seed:{value:settings.cloudSeed??0}}});
   geometry=new T.BoxGeometry(2,2,2);const scene=new T.Scene();scene.add(new T.Mesh(geometry,material));
   target=new T.WebGLCubeRenderTarget(512,{type:T.UnsignedByteType,format:T.RGBAFormat,generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false});
   const camera=new T.CubeCamera(.1,10,target),r=this.renderer,previous={target:r.getRenderTarget(),face:r.getActiveCubeFace(),mip:r.getActiveMipmapLevel(),autoClear:r.autoClear,toneMapping:r.toneMapping,xr:r.xr.enabled,shadow:r.shadowMap.autoUpdate};
   try{r.autoClear=true;r.toneMapping=T.NoToneMapping;r.shadowMap.autoUpdate=false;camera.update(r,scene);}
   finally{r.setRenderTarget(previous.target,previous.face,previous.mip);r.autoClear=previous.autoClear;r.toneMapping=previous.toneMapping;r.xr.enabled=previous.xr;r.shadowMap.autoUpdate=previous.shadow;}
   this.target?.dispose();this.target=target;target=null;this.builds++;
   this.metrics={builds:this.builds,prepareMs:Math.round(performance.now()-started),retainedGpuBytes:cloudMemory.cube,transientNoiseBytes:cloudMemory.shape+cloudMemory.detail};
   return this.target.texture;
  }finally{shape?.dispose();detail?.dispose();geometry?.dispose();material?.dispose();target?.dispose();if(this.abort===abort)this.abort=null;}
 }
 cancel(){this.generation++;this.abort?.abort();this.abort=null;}
 dispose(){this.cancel();this.target?.dispose();this.target=null;}
}
