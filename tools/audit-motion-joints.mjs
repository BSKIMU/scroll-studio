// Read-only broad-phase audit. Proximity flags require visual review; a guard
// pose may intentionally cross arms. Never rewrite or clamp authored motion.
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {registerHooks} from 'node:module';
const root=new URL('../',import.meta.url);
registerHooks({resolve(s,c,n){if(s==='three')return {url:new URL('dist/vendor/three.module.js',root).href,shortCircuit:true};if(s.startsWith('three/addons/'))return {url:new URL('dist/vendor/addons/'+s.slice(13),root).href,shortCircuit:true};const r=n(s,c);if(r.url.startsWith('file:')){const u=new URL(r.url);u.search='';return {...r,url:u.href};}return r;}});
const BaseRequest=globalThis.Request;globalThis.Request=class extends BaseRequest{constructor(url,init){super(new URL(typeof url==='string'?url:url.url,'http://localhost'),init);}};
globalThis.fetch=async input=>{const p=new URL(typeof input==='string'?input:input.url,'http://localhost').pathname,b=await readFile(new URL('dist/'+(p.includes('/dist/')?p.split('/dist/').at(-1):p.slice(1)),root));return new Response(b,{headers:{'Content-Length':b.length}});};globalThis.ProgressEvent=class{constructor(t,v){Object.assign(this,v);}};globalThis.self=globalThis;
const T=await import('three'),{MotionRetargeter,compileCombo,sampleCombo,validateMotion}=await import('../dist/pose-library-motion.js'),{loadMannequin,movementModel,defaultPerson}=await import('../dist/mannequin.js'),{PoseRig}=await import('../dist/pose-lab/rig.js');
await loadMannequin();
const rigs=['bodychan','bodykun','mixamo'].map(model=>{const rig=new PoseRig(movementModel(defaultPerson(model)),{fit:false});return {model,rig,retarget:new MotionRetargeter(rig),bones:Object.fromEntries(rig.bones.map(b=>[b.name.replace(/^mixamorig[:_]?/i,''),b]))};});
const angle=(a,b,c)=>a.clone().sub(b).angleTo(c.clone().sub(b))*180/Math.PI;
function distance(a,b,c,d){const u=b.clone().sub(a),v=d.clone().sub(c),w=a.clone().sub(c),aa=u.dot(u),bb=u.dot(v),cc=v.dot(v),dd=u.dot(w),ee=v.dot(w),den=aa*cc-bb*bb;let s=T.MathUtils.clamp(den>1e-10?(bb*ee-cc*dd)/den:0,0,1),t=T.MathUtils.clamp((bb*s+ee)/cc,0,1);s=T.MathUtils.clamp((bb*t-dd)/aa,0,1);t=T.MathUtils.clamp((bb*s+ee)/cc,0,1);return a.clone().addScaledVector(u,s).distanceTo(c.clone().addScaledVector(v,t));}
const clips=[],folder=new URL('local/pose-library/',root);
for(const id of await readdir(folder)){try{const entry=JSON.parse(await readFile(new URL(id+'/entry.json',folder),'utf8'));clips.push({entry,path:new URL(id+'/clip.json',folder)});}catch{}}
const bank=JSON.parse(await readFile(new URL('local/interaction-clips.json',root),'utf8'));for(const [id,clip]of Object.entries(bank.clips))clips.push({entry:{id:'builtin-'+id,name:clip.label},clip});
const report={scope:'all source frames; three built-in rigs; bone geometry only, no equipment IK',clips:0,frames:0,models:rigs.map(r=>r.model),nonfinite:[],stretch:[],suspects:[],results:[]};
for(const source of clips){
 let clip;try{clip=validateMotion(source.clip||JSON.parse(await readFile(source.path,'utf8')));}catch(error){report.nonfinite.push({id:source.entry.id,error:error.message});continue;}
 const combo=compileCombo([{clip,name:source.entry.name}]),row={id:source.entry.id,name:source.entry.name,frames:clip.frames.length,models:[]};
 for(const {model,rig,retarget,bones}of rigs){
  const m={model,minArmDistance:Infinity,maxElbowFlex:0,maxWristBend:0,maxStretch:0,finite:true,armFrame:0,wristFrame:0,elbowFrame:0};
  for(let i=0;i<clip.frames.length;i++){
   retarget.apply(sampleCombo(combo,clip.duration*i/Math.max(1,clip.frames.length-1)));
   const p=name=>bones[name]?.getWorldPosition(new T.Vector3()),arms=[];
   for(const side of ['Left','Right']){
    const a=p(side+'Arm'),b=p(side+'ForeArm'),c=p(side+'Hand'),tip=p(side+'HandMiddle1');arms.push([a,b,c]);
    const flex=180-angle(a,b,c);if(flex>m.maxElbowFlex){m.maxElbowFlex=flex;m.elbowFrame=i;}
    if(tip){const bend=180-angle(b,c,tip);if(bend>m.maxWristBend){m.maxWristBend=bend;m.wristFrame=i;}}
    const chain=rig.chains[side.toLowerCase()+'Hand'];m.maxStretch=Math.max(m.maxStretch,Math.abs(a.distanceTo(b)/chain.l1-1),Math.abs(b.distanceTo(c)/chain.l2-1));
   }
   const l=arms[0],r=arms[1],gap=Math.min(distance(l[0],l[1],r[1],r[2]),distance(l[1],l[2],r[0],r[1]),distance(l[1],l[2],r[1],r[2]));if(gap<m.minArmDistance){m.minArmDistance=gap;m.armFrame=i;}
   if(rig.bones.some(b=>![...b.position.toArray(),...b.quaternion.toArray()].every(Number.isFinite)))m.finite=false;
  }
  for(const k of ['minArmDistance','maxElbowFlex','maxWristBend','maxStretch'])m[k]=Math.round(m[k]*10000)/10000;
  row.models.push(m);if(!m.finite)report.nonfinite.push({id:row.id,model});if(m.maxStretch>.005)report.stretch.push({id:row.id,model,value:m.maxStretch});
 }
 report.clips++;report.frames+=clip.frames.length*rigs.length;report.results.push(row);
 if(row.models.some(m=>m.minArmDistance<.025||m.maxElbowFlex>165||m.maxWristBend>105))report.suspects.push(row);
 if(report.clips%50===0)console.log('Audited',report.clips,'clips');
}
await mkdir(new URL('local/pose-library-validation/',root),{recursive:true});await writeFile(new URL('local/pose-library-validation/joint-audit.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify({clips:report.clips,frames:report.frames,nonfinite:report.nonfinite.length,stretch:report.stretch.length,suspects:report.suspects.length}));
