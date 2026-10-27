import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const T=await import('../dist/vendor/three.module.js');
const {findGroundSurface,environmentHeight}=await import('../dist/environment-ground.js');
const {prepareImportedBackground}=await import('../dist/imported-background.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function room(){
 const g=new T.Group();
 for(const [w,h,d,x,y,z]of [[10,.2,10,0,5,0],[.2,8,10,-5,6,0],[10,8,.2,0,6,-5],[2,.1,2,1,6.4,1]]){
  const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial());m.position.set(x,y,z);g.add(m);
 }
 return g;
}
const original=room(),positions=original.children.map(m=>m.position.toArray());near(findGroundSurface(original),5.1);
const imported=prepareImportedBackground(original,{name:'new',groundMode:'auto'});near(findGroundSurface(imported.wrapper),0);assert.equal(imported.wrapper.userData.scrollGround.mode,'surface');assert.deepEqual(original.children.map(m=>m.position.toArray()),positions,'Only the wrapper moves, never source vertices or object transforms');
const legacy=prepareImportedBackground(room(),{name:'existing'});near(legacy.wrapper.position.y,-2);assert(!legacy.wrapper.userData.scrollGround,'Old assets keep bottom-bound alignment');
const calibrated=room();calibrated.userData.scrollPreset={floorY:5.1,camera:[0,7,8],target:[0,5.1,0]};const preset=prepareImportedBackground(calibrated,{name:'authored',groundMode:'auto'});near(preset.camera.target.y,0);near(findGroundSurface(preset.wrapper),0);assert.equal(preset.wrapper.userData.scrollGround.mode,'preset');
const ball=new T.Mesh(new T.SphereGeometry(1,16,8),new T.MeshBasicMaterial());ball.position.y=8;const fallback=prepareImportedBackground(ball,{name:'no floor',groundMode:'auto'});near(new T.Box3().setFromObject(fallback.wrapper).min.y,0);assert.equal(fallback.wrapper.userData.scrollGround.mode,'bounds');
const rotated=room();rotated.position.y=3;rotated.rotation.y=.7;rotated.scale.set(-1,2,1);near(findGroundSurface(rotated),13.2);const transformed=prepareImportedBackground(rotated,{name:'transformed',scale:.5,groundMode:'auto'});near(findGroundSurface(transformed.wrapper),0);
near(environmentHeight({asset:'a',environmentPlacement:{a:{z:2.75}}}),2.75);near(environmentHeight({asset:'new'}),0);
console.log('PASS: elevated room floor, slab top, table rejection, legacy alignment, authored floor/camera, bottom fallback, mirrored/scaled hierarchy and saved manual offsets');
