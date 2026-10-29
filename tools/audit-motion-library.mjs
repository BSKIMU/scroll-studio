import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url);
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
const RequestBase=globalThis.Request;globalThis.Request=class extends RequestBase{constructor(url,init){super(new URL(typeof url==='string'?url:url.url,'http://localhost'),init);}};
globalThis.fetch=async input=>{const p=new URL(typeof input==='string'?input:input.url,'http://localhost').pathname,b=await readFile(new URL('dist/'+(p.includes('/dist/')?p.split('/dist/').at(-1):p.slice(1)),root));return new Response(b,{headers:{'Content-Length':b.length}});};
globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;
const T=await import('three'),{MotionRetargeter,compileCombo,sampleCombo,validateMotion}=await import('../dist/pose-library-motion.js'),{loadMannequin,movementModel,defaultPerson}=await import('../dist/mannequin.js'),{PoseRig}=await import('../dist/pose-lab/rig.js');
await loadMannequin();
const rigs=['bodychan','bodykun','mixamo'].map(model=>({model,rig:new PoseRig(movementModel(defaultPerson(model)),{fit:false})}));
for(const row of rigs)row.retarget=new MotionRetargeter(row.rig);
const library=new URL('local/pose-library/',root),fingerprints=new Map(),report={files:0,unique:0,duplicates:[],models:rigs.map(r=>r.model),results:[]};
for(const id of (await readdir(library)).filter(n=>n.startsWith('mixamo-'))){
 const folder=new URL(id+'/',library),entry=JSON.parse(await readFile(new URL('entry.json',folder),'utf8')),clip=validateMotion(JSON.parse(await readFile(new URL('clip.json',folder),'utf8')));report.files++;
 const combo=compileCombo([{clip,name:entry.name}]),hash=createHash('sha256');
 hash.update(String(Math.round(clip.duration*1000)));
 for(let i=0;i<clip.frames.length;i++){
  const sample=sampleCombo(combo,clip.duration*i/(clip.frames.length-1)),values=sample.hip.toArray();
  for(const name of [...sample.q.keys()].sort()){const q=sample.q.get(name),sign=q.w<0?-1:1;values.push(...q.toArray().map(v=>v*sign));}
  hash.update(values.map(v=>Math.round(v*10000)).join(','));
 }
 const fingerprint=hash.digest('hex');entry.motionHash=fingerprint;
 if(fingerprints.has(fingerprint)){entry.duplicateOf=fingerprints.get(fingerprint);report.duplicates.push({id,name:entry.name,of:entry.duplicateOf});}
 else {delete entry.duplicateOf;fingerprints.set(fingerprint,id);report.unique++;}
 const result={id,name:entry.name,frames:clip.frames.length,duration:clip.duration,models:[]};
 for(const {model,rig,retarget} of rigs){
  const metrics={model,finite:true,minFoot:Infinity,maxRootStep:0,maxBodyAngle:0,maxHandStep:0},prev=new Map();let oldHip;
  const watch=['Hips','Head','LeftHand','RightHand','LeftFoot','RightFoot'];
  const bones=Object.fromEntries(rig.bones.map(b=>[b.name.replace(/^mixamorig[:_]?/i,''),b]));
  for(let i=0;i<clip.frames.length;i++){
   const s=sampleCombo(combo,clip.duration*i/(clip.frames.length-1));retarget.apply(s);
   const hip=rig.pelvis.getWorldPosition(new T.Vector3());if(oldHip)metrics.maxRootStep=Math.max(metrics.maxRootStep,oldHip.distanceTo(hip));oldHip=hip;
   for(const name of watch){const b=bones[name],p=b.getWorldPosition(new T.Vector3()),q=b.getWorldQuaternion(new T.Quaternion());if(![...p.toArray(),...q.toArray()].every(Number.isFinite))metrics.finite=false;
    const old=prev.get(name);if(old){metrics.maxBodyAngle=Math.max(metrics.maxBodyAngle,q.angleTo(old.q));if(name.endsWith('Hand'))metrics.maxHandStep=Math.max(metrics.maxHandStep,p.distanceTo(old.p));}prev.set(name,{p,q});
    if(name.endsWith('Foot'))metrics.minFoot=Math.min(metrics.minFoot,p.y);
   }
  }
  for(const k of ['minFoot','maxRootStep','maxBodyAngle','maxHandStep'])metrics[k]=Math.round(metrics[k]*10000)/10000;
  result.models.push(metrics);
 }
 entry.validation={version:1,scope:'all-frames-numeric',models:result.models,visual:'pending'};
 await writeFile(new URL('entry.json',folder),JSON.stringify(entry,null,2));report.results.push(result);
 if(report.files%40===0)console.log('Checked',report.files,'clips × 3 rigs');
}
await writeFile(new URL('local/pose-library-validation/rig-audit.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify({files:report.files,unique:report.unique,duplicates:report.duplicates.length,nonfinite:report.results.filter(r=>r.models.some(m=>!m.finite)).length,footBelow15cm:report.results.filter(r=>r.models.some(m=>m.minFoot<-.15)).map(r=>r.name),rootJump:report.results.filter(r=>r.models.some(m=>m.maxRootStep>.45)).map(r=>r.name)}));
