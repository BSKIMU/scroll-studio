import './test-module-loader.mjs';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {paintWithOverlays}=await import('../dist/scene-overlays.js');
const scene=new T.Scene(),camera=new T.PerspectiveCamera(),figures=new T.Group(),gizmo=new T.Group(),shot=new T.Group();
const marker=new T.Mesh(),arrow=new T.Mesh(),body=new T.Mesh();marker.userData.poseMarker=true;
figures.add(body,marker);gizmo.add(arrow);scene.add(figures,gizmo,shot);scene.background=new T.Color('red');scene.fog=new T.Fog('red',1,100);
const savedBackground=scene.background,savedFog=scene.fog;marker.layers.enable(4);camera.layers.enable(4);
const masks=[camera,body,marker,gizmo,arrow,shot].map(o=>o.layers.mask);
const r={autoClear:true,toneMapping:T.ACESFilmicToneMapping,shadowMap:{autoUpdate:true},render(s,c){
 assert(c.layers.test(marker.layers)&&c.layers.test(arrow.layers));assert(!c.layers.test(body.layers));
 assert.equal(s.background,null);assert.equal(s.fog,null);assert.equal(r.toneMapping,T.NoToneMapping);assert(!r.autoClear);assert(!r.shadowMap.autoUpdate);
}};
const editor={scene,camera,figures,gizmo:{helper:gizmo},shot:{helper:shot},renderer:r};let paints=0;
const world=()=>{paints++;assert(camera.layers.test(body.layers));assert(!camera.layers.test(marker.layers));assert(!camera.layers.test(arrow.layers));};
paintWithOverlays(editor,world);assert.equal(paints,1);
function restored(){assert.deepEqual([camera,body,marker,gizmo,arrow,shot].map(o=>o.layers.mask),masks);assert.equal(scene.background,savedBackground);assert.equal(scene.fog,savedFog);assert.equal(r.toneMapping,T.ACESFilmicToneMapping);assert(r.autoClear&&r.shadowMap.autoUpdate);}
restored();assert.throws(()=>paintWithOverlays(editor,()=>{throw Error('render failure');}));restored();
console.log('PASS: joint/XYZ/camera helpers excluded from world effects; unlit overlay and render/picking state restored even on failure');
