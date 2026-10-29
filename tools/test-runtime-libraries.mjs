import './test-module-loader.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve,sep} from 'node:path';
const originalDist=new URL('../dist/',import.meta.url),dist=process.env.SCROLL_VERIFIED_DIST?pathToFileURL(resolve(process.env.SCROLL_VERIFIED_DIST)+sep):originalDist;
registerHooks({resolve(s,c,next){if(s==='three')return{url:new URL('vendor/three.module.js',dist).href,shortCircuit:true};if(s.startsWith('three/addons/'))return{url:new URL('vendor/addons/'+s.slice(13),dist).href,shortCircuit:true};const r=next(s,c);return r.url.startsWith(originalDist.href)?{...r,url:new URL(r.url.slice(originalDist.href.length),dist).href}:r;}});
globalThis.location={hostname:'bskimu.github.io'};
globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};
const BaseRequest=globalThis.Request;globalThis.Request=class extends BaseRequest{constructor(u,o){super(typeof u==='string'?new URL(u,'https://bskimu.github.io/scroll-studio/'):u,o);}};
const requests=[];globalThis.fetch=async input=>{const u=new URL(typeof input==='string'?input:input.url);requests.push(u.href);assert(!u.pathname.includes('/api/'),'hosted app must not need local APIs');const path=u.protocol==='file:'?u:new URL(u.pathname.replace(/^\/scroll-studio\//,'').replace(/^\//,''),dist);const b=await readFile(path);return new Response(b,{headers:{'Content-Length':b.length}});};
const {libraryCatalog,libraryClip}=await import('../dist/library-assets.js');
const {validateMotion,compileCombo,sampleCombo,MotionRetargeter}=await import('../dist/pose-library-motion.js');
const {loadMannequin,defaultPerson,movementModel}=await import('../dist/mannequin.js');
const {PoseRig}=await import('../dist/pose-lab/rig.js');
const {validHand}=await import('../dist/hand-library-data.js');
const {loadGunCarry}=await import('../dist/gun-carry.js');
const poses=await libraryCatalog('pose'),props=await libraryCatalog('prop'),hands=await libraryCatalog('hand');
assert.equal(poses.entries.length,362);assert.equal(props.entries.length,27);assert.equal(hands.entries.length,500);
for(const data of [poses,props,hands]){assert.equal(data.localService,false);assert.equal(new Set(data.entries.map(e=>e.id)).size,data.entries.length);}
for(const kind of ['pose','prop','hand'])assert(!String(await readFile(new URL(`assets/libraries/${kind}/catalog.json`,dist))).match(/[A-Z]:[\\/]/),'no machine paths in published catalog');
for(const e of props.entries){const b=await readFile(new URL(e.url));assert.equal(b.toString('ascii',0,4),'glTF');assert((await readFile(new URL(e.thumbnail))).length>500);}
for(const e of hands.entries)assert(validHand(e.hands.left)&&validHand(e.hands.right));
await loadMannequin();const rigs=['bodykun','bodychan','mixamo'].map(model=>{const rig=new PoseRig(movementModel(defaultPerson(model)),{fit:false});return{rig,retarget:new MotionRetargeter(rig),scales:rig.bones.map(b=>b.scale.clone()),lengths:rig.bones.map(b=>b.position.length())};});
let samples=0;
for(const entry of poses.entries){
 const clip=validateMotion(await libraryClip(entry.id)),combo=compileCombo([{clip,name:entry.name}]);
 for(const {rig,retarget,scales,lengths}of rigs)for(let frame=0;frame<9;frame++){
  retarget.apply(sampleCombo(combo,clip.duration*frame/8));samples++;
  rig.bones.forEach((b,i)=>{assert(b.matrixWorld.elements.every(Number.isFinite),entry.id+' finite');assert(b.scale.distanceTo(scales[i])<1e-6,'rig scale unchanged');if(b!==rig.pelvis)assert(Math.abs(b.position.length()-lengths[i])<1e-5,'bone length unchanged');});
 }
}
await loadGunCarry();
// Local static servers also fall back when no Python API is running.
globalThis.location.hostname='localhost';const staticFetch=globalThis.fetch;globalThis.fetch=input=>String(input).startsWith('/api/')?Promise.resolve(new Response('',{status:404})):staticFetch(input);
assert.equal((await libraryCatalog('pose')).entries.length,362);validateMotion(await libraryClip(poses.entries[0].id));
console.log(`PASS: 362 motions × 3 rigs, ${samples} sampled poses, 27 GLBs/thumbnails, 500 hands, firearm carry; no hosted API dependency; static-local fallback`);
