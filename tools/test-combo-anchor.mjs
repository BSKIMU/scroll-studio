// Repeat real attacks across the three built-in bodies. No library mutation.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url);
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
const BaseRequest=globalThis.Request;globalThis.Request=class extends BaseRequest{constructor(url,init){super(new URL(typeof url==='string'?url:url.url,'http://localhost'),init);}};
const custom=[],files=new Map();
for(const [i,folder]of process.argv.slice(2).entries()){
 const entry=JSON.parse(await readFile(resolve(folder,'entry.json'),'utf8')),key=String(i+1).padStart(32,'0');
 entry.id='custom-'+key;entry.url='/api/character-library/'+key+'/model.glb';custom.push(entry);files.set(entry.url,resolve(folder,'model.glb'));
}
const nativeFetch=globalThis.fetch;
globalThis.fetch=async input=>{const raw=typeof input==='string'?input:input.url;if(raw.startsWith('data:'))return nativeFetch(input);const p=new URL(raw,'http://localhost').pathname;if(p==='/api/character-library/catalog')return Response.json({available:true,entries:custom});const b=await readFile(files.get(p)||new URL('dist/'+(p.includes('/dist/')?p.split('/dist/').at(-1):p.slice(1)),root));return new Response(b,{headers:{'Content-Length':b.length}});};globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;
const T=await import('three'),{loadMannequin,mannequin,defaultPerson}=await import('../dist/mannequin.js'),{loadPoseLab,PoseLabMotion}=await import('../dist/pose-lab-motion.js'),{LiveComboMotion}=await import('../dist/live-combo-motion.js'),{weaponCombo}=await import('../dist/equipment-motion.js');
const folder=new URL('dist/assets/libraries/pose/clips/',root),entries=JSON.parse(await readFile(new URL('dist/assets/libraries/pose/catalog.json',root),'utf8')).entries;
await loadMannequin(custom.map(entry=>({model:entry.id})));const controller=await loadPoseLab();
for(const type of ['unarmed','sword','gun','axe']){
 const items=await Promise.all(weaponCombo(entries,[],{type},{defaults:true}).map(async row=>({...row,clip:JSON.parse(await readFile(new URL(row.id+'.json',folder),'utf8'))})));
 assert.ok(items.length,type+' has attacks');
 for(const model of ['bodychan','bodykun','mixamo',...custom.map(entry=>entry.id)]){
  const person={...defaultPerson(model),x:2,y:.4,z:-3,rotation:57},figure=mannequin(person,0),motion=new PoseLabMotion(controller,figure,person),live=motion.seated=new LiveComboMotion(motion,items),anchor=live.position.clone();
  let maxGap=0,maxPivot=0,maxTravel=0;
  const sourceRadius=Math.max(...items.flatMap(item=>item.clip.frames.map(f=>Math.hypot(f.hip[0]-item.clip.frames[0].hip[0],f.hip[2]-item.clip.frames[0].hip[2])/item.clip.legLength*live.retarget.leg))),initialRadius=Math.hypot(live.pose.hip.x,live.pose.hip.z)*live.retarget.leg;
  for(let hit=0;hit<30;hit++){
   live.enqueue();
   for(let frame=0;frame<36;frame++){
    live.update(live.duration/35);
    const hip=motion.rig.pelvis.getWorldPosition(new T.Vector3()),pivot=figure.position;
    maxPivot=Math.max(maxPivot,Math.hypot(hip.x-pivot.x,hip.z-pivot.z));
    maxTravel=Math.max(maxTravel,Math.hypot(pivot.x-anchor.x,pivot.z-anchor.z));
    if(live.time>=live.fade&&!live.current.airborne)maxGap=Math.max(maxGap,Math.abs(live.support.bottom('feet')-anchor.y));
    assert.ok(Math.abs(pivot.y-anchor.y)<1e-6,'scene floor does not change');
   }
  }
  assert.ok(maxGap<.002,type+' '+model+' support gap '+maxGap);
  assert.ok(maxPivot<1e-5,'gizmo stays under hips');assert.ok(maxTravel<=Math.max(sourceRadius,initialRadius)+.001,'travel stays within one source clip rather than accumulating: '+maxTravel);
  const before=figure.userData.motionRig.bones.Hips.getWorldPosition(new T.Vector3());motion.freeze();const restored=mannequin(JSON.parse(JSON.stringify(person)),0);restored.updateMatrixWorld(true);
  assert.ok(restored.userData.motionRig.bones.Hips.getWorldPosition(new T.Vector3()).distanceTo(before)<1e-4,'freeze/reload retains pose and pivot');
  console.log('PASS',type,model,'30 attacks',JSON.stringify({maxGap,maxPivot,maxTravel}));
 }
}
