import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),{SkyPresets}=await import('../dist/sky-presets.js'),{SceneShading}=await import('../dist/scene-shading.js');
const {SceneGrid}=await import('../dist/scene-grid.js');
const grid=new SceneGrid(),gridCamera=new T.PerspectiveCamera(50,1.5,.01,10000);
gridCamera.position.set(5,1.6,9);gridCamera.lookAt(0,1,0);gridCamera.updateMatrixWorld();
grid.onBeforeRender(null,null,gridCamera);
// A ground point beyond the old 20 m boundary must round-trip through the
// screen ray and keep its real depth, so foreground models can occlude it.
for(const point of [new T.Vector3(2,.008,0),new T.Vector3(-30,.008,-180)]){
 const ndc=point.clone().project(gridCamera),u=grid.material.uniforms.unproject.value;
 const start=new T.Vector3(ndc.x,ndc.y,-1).applyMatrix4(u),end=new T.Vector3(ndc.x,ndc.y,.99).applyMatrix4(u),ray=end.sub(start).normalize();
 const hit=start.clone().addScaledVector(ray,(.008-start.y)/ray.y);
 assert(hit.distanceTo(point)<1e-6);assert(ndc.z>-1&&ndc.z<1);
}
assert.equal(grid.geometry.attributes.position.count,4);assert.equal(grid.material.depthWrite,false);
assert.equal(grid.frustumCulled,false);assert.equal(grid.raycast(new T.Raycaster(),[]),undefined);
grid.geometry.dispose();grid.material.dispose();
const manifest=JSON.parse(await readFile(new URL('../dist/assets/clouds/manifest.json',import.meta.url),'utf8'));
for(const volume of manifest.volumes){const bytes=await readFile(new URL(`../dist/assets/clouds/${volume.name}.bin`,import.meta.url));assert.equal(bytes.length,volume.size**3);assert.equal(createHash('sha256').update(bytes).digest('hex'),volume.sha256);}
let renders=0,fail=false,transientDisposals=0;
const renderer={coordinateSystem:T.WebGLCoordinateSystem,xr:{enabled:true},shadowMap:{autoUpdate:true},autoClear:false,toneMapping:T.ACESFilmicToneMapping,
 target:null,face:0,mip:0,getRenderTarget(){return this.target;},getActiveCubeFace(){return this.face;},getActiveMipmapLevel(){return this.mip;},setRenderTarget(t,f=0,m=0){this.target=t;this.face=f;this.mip=m;},
 render(scene){renders++;const material=scene.children[0].material;if(!material.userData.seen){material.userData.seen=true;for(const key of ['shapeNoise','detailNoise'])material.uniforms[key].value.addEventListener('dispose',()=>transientDisposals++);}if(fail)throw Error('simulated GPU failure');}};
let release=null,delay=false;
globalThis.fetch=async(url,{signal})=>{if(delay)await new Promise((resolve,reject)=>{release=resolve;signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));});const data=await readFile(url);return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};};
const skies=new SkyPresets(renderer),settings={cloudCoverage:.55,altitude:48,azimuth:35,lightColor:'#ffffff'};
skies.get('cloud-day',settings);assert(skies.pending);await skies.ready;
assert.equal(renders,6);assert.equal(transientDisposals,2);assert(skies.texture.isCubeTexture);assert.equal(skies.cloud.metrics.retainedGpuBytes,6*512*512*4);
const texture=skies.texture;for(let i=0;i<100;i++)assert.equal(skies.get('cloud-day',{...settings}),texture);assert.equal(renders,6,'Moving/capturing never bakes again');
assert.equal(renderer.target,null);assert.equal(renderer.autoClear,false);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(renderer.toneMapping,T.ACESFilmicToneMapping);
let disposed=0;skies.cloud.target.addEventListener('dispose',()=>disposed++);
skies.get('cloud-sunset',settings);await skies.ready;assert.equal(disposed,1);assert.equal(renders,12);assert.equal(transientDisposals,4);
delay=true;skies.get('cloud-day',{...settings,cloudSeed:.3});const pending=skies.ready;skies.get(null);release?.();await pending;assert.equal(skies.texture,null);assert.equal(skies.cloud.target,null);assert.equal(skies.pending,false);assert.equal(renders,12,'Stale loads cannot install or render a sky');
delay=false;fail=true;skies.get('cloud-day',settings);await skies.ready;assert.match(skies.error,/GPU failure/);assert.equal(skies.pending,false);assert.equal(renderer.target,null);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(transientDisposals,6,'Failure disposes both input volumes');skies.dispose();

// Preview overrides restore all scene state used by captureSceneLayers/export,
// even on a renderer failure; pose handles retain their own colors.
const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),marker=new T.Mesh(new T.SphereGeometry(),new T.MeshBasicMaterial());marker.userData.poseMarker=true;
const edge=new T.LineSegments();edge.userData.contiEdge=true;mesh.add(edge);
const environment=new T.Group(),figures=new T.Group();environment.add(mesh);figures.add(marker);
const background=new T.CubeTexture(),original=mesh.material,markerMaterial=marker.material,look={skyPreset:'cloud-day',sun:4};
const e={scene:{background},camera:{},state:{look},environment,figures,tone:{paint(){}},advanced:{filter:()=> 'saturate(80%)'},renderer:{domElement:{style:{}},shadowMap:{autoUpdate:true}}};
const shading=Object.assign(Object.create(SceneShading.prototype),{e,mode:'solid',material:new T.MeshMatcapMaterial()});
e.renderer.render=()=>{assert.equal(mesh.material,shading.material);assert.equal(marker.material,markerMaterial);assert.equal(edge.visible,false);assert.equal(e.renderer.shadowMap.autoUpdate,false);throw Error('paint failed');};
assert.throws(()=>shading.paint(),/paint failed/);assert.equal(mesh.material,original);assert.equal(edge.visible,true);assert.equal(e.scene.background,background);assert.equal(e.renderer.shadowMap.autoUpdate,true);assert.equal(look.skyPreset,'cloud-day');
shading.mode='light';e.renderer.render=()=>{assert.notEqual(e.scene.background,background);assert.equal(mesh.material,original);};shading.paint();assert.equal(e.scene.background,background);assert.equal(e.renderer.domElement.style.filter,'saturate(80%)');
shading.mode='sky';e.renderer.render=()=>assert.equal(e.scene.background,background);shading.paint();

// A fixed painted dome loads once; scene-light changes never decode it again.
let downloads=0,closed=0,decodeRelease,holdDecode=false;
globalThis.fetch=async()=>{downloads++;return {ok:true,blob:async()=>({})};};
globalThis.createImageBitmap=async()=>{if(holdDecode)await new Promise(resolve=>decodeRelease=resolve);return {width:4096,height:1024,close(){closed++;}};};
const painted=new SkyPresets(renderer);painted.get('anime-sky');await painted.ready;
const fixed=painted.texture;assert(fixed.userData.hemisphere);assert.equal(fixed.colorSpace,T.SRGBColorSpace);
for(let i=0;i<100;i++)assert.equal(painted.get('anime-sky',{azimuth:i}),fixed);
assert.equal(downloads,1);assert.equal(painted.painted.metrics.retainedGpuBytes,16777216);
painted.dispose();assert.equal(closed,1);
holdDecode=true;painted.get('anime-sky');await Promise.resolve();await Promise.resolve();await Promise.resolve();
painted.dispose();decodeRelease();await painted.ready;assert.equal(painted.texture,null);assert.equal(closed,2,'A stale decoded bitmap is closed');

const {SkyDome}=await import('../dist/sky-dome.js'),{captureSceneLayers}=await import('../dist/scene-capture.js');
const dome=new SkyDome();dome.setTexture(fixed);assert.equal(dome.geometry.type,'SphereGeometry');assert.equal(dome.material.side,T.BackSide);assert.equal(dome.material.depthWrite,false);assert.equal(dome.material.uniforms.hemisphere.value,true);assert.equal(dome.material.toneMapped,false);
dome.configure({skyHorizon:-32,skyRotation:90});assert.equal(dome.material.uniforms.skyRotation.value,.25);assert(Math.abs(dome.material.uniforms.horizonAngle.value+32*Math.PI/180)<1e-8);assert.equal(painted.painted.loads,1,'Horizon/rotation only change mapping, never decode again');
e.skyDome=dome;shading.mode='light';e.renderer.render=()=>assert.equal(dome.visible,false);shading.paint();assert.equal(dome.visible,true);
const captures=[],ce={scene:{background},camera:{},environment,figures,skyDome:dome,grid:{visible:true},gizmo:{helper:{visible:true}},renderer:{
 autoClear:true,domElement:{},getClearColor(c){return c.set('white');},getClearAlpha(){return 1;},setClearColor(){},clear(){},render(){captures.push({sky:dome.visible,env:environment.visible,people:figures.visible});}
}};
captureSceneLayers(ce,()=>{});assert.deepEqual(captures,[{sky:true,env:true,people:false},{sky:false,env:true,people:true}]);assert.equal(dome.visible,true);
assert.throws(()=>captureSceneLayers(ce,kind=>{if(kind==='guide')throw Error('capture cancelled');}),/cancelled/);assert.equal(dome.visible,true);assert.equal(ce.scene.background,background);
dome.setTexture(texture);assert.equal(dome.material.uniforms.isCube.value,true);assert.equal(dome.material.toneMapped,true);dome.setTexture(null);assert.equal(dome.visible,false);
console.log('PASS: cloud/painted sky ownership, fixed caching, stale cancellation, inward sphere, three display modes and transparent capture preservation');

// Real HDR input, radiance-preserving downsample, bounded PMREM ownership.
const {HDRISky,lightingSource,hdriFiles}=await import('../dist/hdri-sky.js');
let pmremBuilds=0,generatorDisposals=0,environmentDisposals=0,sourceDisposals=0,panoramaDisposals=0;
const makePMREM=()=>({fromEquirectangular(t){pmremBuilds++;assert.equal(t.image.width,1024);assert.equal(t.image.height,512);t.addEventListener('dispose',()=>sourceDisposals++);const target=new T.WebGLRenderTarget(768,1024);target.addEventListener('dispose',()=>environmentDisposals++);return target;},dispose(){generatorDisposals++;}});
globalThis.fetch=async(url,{signal})=>{const b=await readFile(url);return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
for(const [id,hash]of [['hdri-day','2eba3a4d7eeb23cbfbeca364c97e7980'],['hdri-sunset','590a829b3cf71216451655e601d542c6']])assert.equal(createHash('md5').update(await readFile(new URL('../dist/assets/hdri/'+hdriFiles[id],import.meta.url))).digest('hex'),hash);
const hdrSkies=new SkyPresets(renderer);hdrSkies.hdri=new HDRISky(renderer,makePMREM);hdrSkies.get('hdri-day');await hdrSkies.ready;
const panorama=hdrSkies.texture;assert.equal(panorama.type,T.HalfFloatType);assert.equal(panorama.colorSpace,T.LinearSRGBColorSpace);assert.equal(panorama.flipY,true);assert.equal(panorama.userData.hemisphere,undefined);
assert(panorama.image.data.some(x=>T.DataUtils.fromHalfFloat(x)>100),'Input retains HDR radiance beyond display white');
panorama.addEventListener('dispose',()=>panoramaDisposals++);
for(let i=0;i<100;i++)assert.equal(hdrSkies.get('hdri-day',{skyRotation:i,hdriBrightness:.5}),panorama);
assert.equal(pmremBuilds,1);assert.equal(sourceDisposals,1);assert.equal(generatorDisposals,1);assert.equal(hdrSkies.hdri.metrics.retainedGpuBytes,22*1024*1024);
const energy=new T.DataTexture(new Uint16Array([4,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1].map(T.DataUtils.toHalfFloat)),2,2);
const average=lightingSource(energy);assert.equal(T.DataUtils.fromHalfFloat(average.image.data[0]),1);average.dispose();energy.dispose();
dome.setTexture(panorama);dome.configure({skyRotation:90,hdriBrightness:.7,hdriGround:true},2);
assert.equal(dome.material.uniforms.hemisphere.value,false);assert.equal(dome.material.uniforms.brightness.value,.7);assert.equal(dome.ground.visible,true);assert.equal(dome.ground.position.y,1.85);
e.skyDome=dome;shading.mode='light';e.renderer.render=()=>{assert.equal(dome.visible,false);};shading.paint();assert.equal(dome.visible,true);
captures.length=0;captureSceneLayers(ce,()=>{});assert.equal(captures[1].sky,false,'HDRI and its ground never appear in the transparent guide');
hdrSkies.get('hdri-sunset');await hdrSkies.ready;assert.equal(pmremBuilds,2);assert.equal(panoramaDisposals,1);assert.equal(environmentDisposals,1);
dome.setTexture(null);assert.equal(dome.ground.visible,false);hdrSkies.dispose();assert.equal(environmentDisposals,2);
let finishHDR;
globalThis.fetch=async()=>({ok:true,arrayBuffer:()=>new Promise(resolve=>finishHDR=resolve)});
hdrSkies.get('hdri-day');await Promise.resolve();hdrSkies.dispose();finishHDR(new ArrayBuffer(0));await hdrSkies.ready;assert.equal(hdrSkies.texture,null);assert.equal(pmremBuilds,2,'Stale HDR never parses or builds a PMREM');
console.log('PASS: HDR radiance, single cached environment, replacement/close/stale disposal and transparent HDRI ground exclusion');
globalThis.fetch=async url=>{const b=await readFile(url);return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
const failedHDR=new HDRISky(renderer,()=>({fromEquirectangular(){renderer.setRenderTarget('temporary target',2,1);throw Error('HDR GPU failure');},dispose(){}}));
await assert.rejects(failedHDR.load('hdri-day'),/HDR GPU failure/);assert.equal(renderer.target,null);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(failedHDR.texture,null);assert.equal(failedHDR.target,null);

// Each time of day uses an independent, intact panorama. Switching still owns
// only one HDR + PMREM, and dark presets must not retain daytime direct lights.
const {skyPresets,hdriLook,hdriAzimuth}=await import('../dist/sky-presets.js');
const times=[['hdri-night','38cd55b96bd7430d57bb9c1f690c6c6e'],['hdri-predawn','4cb126e77a8f28c6ea0638f2ca471366'],['hdri-dawn','b5d5244221b3571199032dae0d9d6c5c'],['hdri-twilight','4bb56d6163ef1c7ec762e4a7ef8ede81']];
const timeSkies=new SkyPresets(renderer);timeSkies.hdri=new HDRISky(renderer,makePMREM);let lastTexture,lastTarget;
for(const [id,hash]of times){
 const bytes=await readFile(new URL('../dist/assets/hdri/'+hdriFiles[id],import.meta.url));assert.equal(createHash('md5').update(bytes).digest('hex'),hash);
 let oldPanoramaReleased=false,oldEnvironmentReleased=false;lastTexture?.addEventListener('dispose',()=>oldPanoramaReleased=true);lastTarget?.addEventListener('dispose',()=>oldEnvironmentReleased=true);
 timeSkies.get(id);await timeSkies.ready;assert.equal(timeSkies.error,null);assert(timeSkies.texture?.image.data.some(x=>x>0));assert.equal(timeSkies.texture.image.width,2048);assert.equal(timeSkies.hdri.metrics.retainedGpuBytes,22*1024*1024);
 if(lastTexture){assert(oldPanoramaReleased);assert(oldEnvironmentReleased);}
 lastTexture=timeSkies.texture;lastTarget=timeSkies.hdri.target;
 const count=pmremBuilds;for(let i=0;i<20;i++)assert.equal(timeSkies.get(id,{skyRotation:i,hdriBrightness:i/20}),lastTexture);assert.equal(pmremBuilds,count);
 const look=hdriLook(id);assert(look.hdriBrightness>0&&look.hdriLight>0);assert.equal(look.rim,0);assert.equal(hdriAzimuth(id,look.skyRotation+360),look.azimuth);
 if(id!=='hdri-dawn')assert.equal(skyPresets.find(p=>p[0]===id)[6],0,'No direct sun at night, pre-dawn or after sunset');
}
timeSkies.dispose();assert.equal(timeSkies.texture,null);assert.equal(timeSkies.hdri.target,null);
assert(hdriLook('hdri-predawn').hdriBrightness<hdriLook('hdri-dawn').hdriBrightness);
console.log('PASS: four verified time-of-day HDRIs, exposure calibration, light direction, fixed caching and bounded replacement memory');
