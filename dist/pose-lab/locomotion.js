import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PoseRig} from './rig.js';
import {MOTION_URLS,pickMotion,loadMixamoSource,loadMixamoBody,loadMotionClips} from './mixamo-assets.js?v=20261025-release1';
import {setMotionOffset,applyMotionOffsets} from './motion-controls.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
const ZERO=new T.Vector3(),STEP_UP=.3;
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const smooth=t=>t*t*(3-2*t),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const yaw=a=>Q().setFromAxisAngle(V(0,1,0),a);
// Exact critically damped spring step toward 0 (frame-rate independent): offset x and velocity v after dt.
const spring=(x,v,halflife,dt)=>{const y=2*Math.LN2/halflife,j1=v+x*y,e=Math.exp(-y*dt);return [e*(x+j1*dt),e*(v-j1*y*dt)];};
// Contact tables are sampled at RATE; clip changes crossfade over FADE seconds at 1x, plus STEP_FADE per foot that
// re-steps. A crossfade may not slide a supporting foot through a spacing change over STANCE_CHANGE or spin it by
// more than STANCE_TURN.
// Facing is continuous: a critically damped spring toward the input direction with a halflife per gait, blended by
// the walk/run mix. Contact never blocks the turn; it holds the supporting foot (see holdFeet). The top turn speed
// is the gait's own: HIP_TWIST over the time a heel stays down in the source clip, so a flat foot is not spun.
// A foot on its ball pivots back under the body with time constant BALL_PIVOT; a lifted foot's hold eases out over
// RELEASE. Times are source seconds at 1x.
const RATE=120,FADE=.25,STEP_FADE=.35,CYCLE_SAMPLES=64,STANCE_CHANGE=.03,STANCE_TURN=T.MathUtils.degToRad(10);
// A held foot turns on its contact once the leg's twist against it reaches HIP_TWIST, the hip's rotation range.
// The gaze leads the turn (Patla 1999): chest, neck and head turn toward the input up to LEAD in equal shares,
// easing with halflife LEAD_EASE, while the pelvis and feet follow at the gait's own rate.
const FACING={walk:.25,run:.12},BALL_PIVOT=.08,RELEASE=.15,HIP_TWIST=T.MathUtils.degToRad(40),LEAD=T.MathUtils.degToRad(45),LEAD_EASE=.1;
const LEAD_BONES=['Spine','Spine1','Spine2','Neck','Head'];
const LOOPS=new Set(['idle','walk','run']);
// Hips and both legs down to the toe, parent before child; contact points are the feet (3, 7) and toes (4, 8).
const LEG_PARENTS=[-1,0,1,2,3,0,5,6,7],CONTACT_BONES=[3,4,7,8];
// Movement options (docs/research/locomotion-feel). The defaults are the shipped behaviour. Previs output must not slide
// (user decision 2026-10-03), so only options that keep the supporting feet within the source's own slide are on:
// jumpBuffer, jumpPrep, stopLate. startCancel, stopCancel, stopWait (with stopLate), blendNow, walkJump 'now' and sim
// answer sooner but slide the feet (measurements/); they stay for the playground until dedicated motions replace them.
// - jumpBuffer: seconds a jump request made during a jump stays queued (pressed just before landing it fires on landing;
//   earlier presses are dropped instead of firing a second jump much later). Requests elsewhere wait as before. jumpPrep: seconds of the standing jump's anticipation kept
//   before takeoff (null = the source's whole lead-in).
// - walkJump: 'run' turns a walking jump into the running jump; 'now' starts the standing jump at once and carries
//   the walking velocity through it (the feet slide during the short anticipation).
// - startCancel: releasing during the first half of the start (idle -> cycle fade, about 1 s with its re-steps)
//   turns back to idle. stopCancel: input during the stop clip re-enters the cycle. stopWait: longest wait in seconds for a matching stop
//   entry before entering at the current phase. stopLate: enter the stop clip in its last steps before it settles
//   (the source walks about 1 m first) instead of its walking lead-in. blendNow: walk/run blending starts at once
//   instead of at a heel strike.
// - stride: step length scale for the walk/run cycle (stride warping): the feet move along the travel direction about
//   the root, the pelvis drops when a leg cannot reach, and the root follows the scaled contacts.
// - sim: {halflife, turnHalflife, ratio, maxDist, lock} code-driven simulation the body is pulled toward (Holden 2021,
//   ledger Q07/T101): input sets the simulation velocity; the root moves toward it by at most ratio x its own step,
//   the simulation stays within maxDist of the body, planted feet hold against the pull up to lock metres, and
//   facing follows the input with turnHalflife without the gait's turn-rate cap.
// - terrain: {height(x,z,y), push(x,z,radius,maxTop)} ground and blocking boxes; the body follows the ground under
//   the root, each foot reaches the ground under it, and the pelvis drops for the lower foot. height(x,z,maxTop) is the
//   highest surface at x,z whose top is at most maxTop (the floor otherwise); push returns the move out of every box
//   taller than maxTop, or null. A body steps up STEP_UP at most.
export const MOVE_OPTIONS={jumpBuffer:.2,jumpPrep:.35,walkJump:'run',startCancel:false,stopCancel:false,stopWait:Infinity,stopLate:true,blendNow:false,stride:1,sim:null,terrain:null};
const legBones=(rig,toe)=>[rig.pelvis,...['left','right'].flatMap(side=>{const c=rig.chains[side+'Foot'];return [c.a,c.b,c.c,toe(c.c)];})];
const toeOf=foot=>foot.children.find(b=>b.isBone&&/toebase/i.test(b.name))||foot;

export class WalkController {
  static async create(){
    // The walk motion and the source skeleton come from the shared body; the other motions from clip JSON when current.
    const [source,model,jump,clips]=await Promise.all([loadMixamoSource(),loadMixamoBody(),new GLTFLoader().loadAsync(MOTION_URLS.jump),loadMotionClips(['idle','stop','run','leap','leapMirror'])]);
    clips.walk=pickMotion(source,MOTION_URLS.walk);clips.jump=pickMotion(jump,MOTION_URLS.jump);
    return new WalkController(new PoseRig(model),clips,new PoseRig(jump.scene));
  }
  constructor(source,clips,jumpSource){
    this.source=source;this.clips=clips;
    this.mixer=new T.AnimationMixer(source.root);this.currentClip=null;this.currentAction=null;
    this.jumpSource=jumpSource;this.jumpMixer=new T.AnimationMixer(jumpSource.root);this.jumpMixer.clipAction(clips.jump).play();
    this.tables={};this.markCache=null;
    this.rig=null;this.state='정지';this.error=0;this.opts={...MOVE_OPTIONS};
  }
  // Poses the source skeleton at an absolute clip time.
  pose(name,time){
    const clip=this.clips[name],D=clip.duration;
    time=LOOPS.has(name)?((time%D)+D)%D:T.MathUtils.clamp(time,0,D-1e-4);
    if(name==='jump'){this.jumpMixer.setTime(time);this.jumpSource.root.updateMatrixWorld(true);return this.jumpSource;}
    if(this.currentClip!==name){this.currentAction?.stop();this.mixer.setTime(0);this.currentAction=this.mixer.clipAction(clip);this.currentAction.reset().play();this.currentClip=name;}
    this.mixer.setTime(time);this.source.root.updateMatrixWorld(true);return this.source;
  }
  // Normalized-time access for the source analysis tools.
  sample(phase,name='walk'){return this.pose(name,(LOOPS.has(name)?phase:T.MathUtils.clamp(phase,0,1))*this.clips[name].duration);}
  table(name){
    // Per-clip source record: hip, heel/toe points, their height above the standing floor and contact weight.
    // hipS is the hip's travel without the per-step sway; the root follows hipS, the sway stays in the pose.
    if(this.tables[name])return this.tables[name];
    const src=name==='jump'?this.jumpSource:this.source,D=this.clips[name].duration,n=Math.round(D*RATE)+1,loop=LOOPS.has(name);
    const leg=legBones(src,toeOf),bones=CONTACT_BONES.map(i=>leg[i]);
    this.pose(name==='jump'?'jump':'idle',0);const floor=bones.map(b=>b.getWorldPosition(V()).y);
    const hip=[],points=[],quats=[];
    for(let i=0;i<n;i++){this.pose(name,Math.min(i/RATE,D-1e-4));hip.push(src.pelvis.getWorldPosition(V()));points.push(bones.map(b=>b.getWorldPosition(V())));quats.push(leg.map(b=>b.getWorldQuaternion(Q())));}
    const drift=loop?hip[n-1].clone().sub(hip[0]).setY(0):V();let hipS;
    if(loop){const line=i=>hip[0].clone().addScaledVector(drift,i/(n-1)),mean=V();for(let i=0;i<n-1;i++)mean.add(hip[i].clone().sub(line(i)));mean.divideScalar(n-1);hipS=hip.map((h,i)=>line(i).add(mean).setY(0));}
    else{const r=Math.round(.25*RATE);hipS=hip.map((h,i)=>{const k=Math.min(r,i,n-1-i),m=V();for(let j=i-k;j<=i+k;j++)m.add(hip[j]);return m.divideScalar(2*k+1).setY(0);});}
    const heights=points.map(ps=>ps.map((p,j)=>p.y-floor[j]));
    // A point supports the body within 1-3 cm of its floor, within 0.5-2 cm of the lowest point, and while
    // it moves with the lowest point (0.15-0.45 m/s apart). Start/Stop stand up to 1.2 cm above the idle
    // floor, and their swing heels pass 2 cm over the ground at over 2 m/s.
    const band=(x,from,width)=>1-smooth(T.MathUtils.clamp((x-from)/width,0,1));
    const at=i=>loop?points[(i+n-1)%(n-1)]:points[T.MathUtils.clamp(i,0,n-1)];
    const weights=heights.map((h,i)=>{
      const low=h.indexOf(Math.min(...h)),velocity=j=>at(i+1)[j].clone().sub(at(i-1)[j]).setY(0).multiplyScalar(RATE/2);
      return h.map((x,j)=>band(x,.01,.02)*band(x-h[low],.005,.015)*band(velocity(j).distanceTo(velocity(low)),.15,.3));
    });
    // A clip travels when its hip carries the body (Start/Stop, Running Jump); in-place clips do not.
    const travels=(loop?drift.length():hipS[n-1].distanceTo(hipS[0]))>.3;
    return this.tables[name]={D,n,loop,drift,travels,hip,hipS,points,quats,heights,weights,floor};
  }
  rec(name,time,scale=name==='jump'?this.jumpRatio:this.legRatio){
    const tb=this.table(name);let t=time,k=0;
    if(tb.loop){k=Math.floor(t/tb.D);t-=k*tb.D;}else t=T.MathUtils.clamp(t,0,tb.D);
    const x=Math.min(t*RATE,tb.n-1),i=Math.min(Math.floor(x),tb.n-2),u=x-i,off=tb.drift.clone().multiplyScalar(k);
    const lv=(a,b)=>a.clone().lerp(b,u).add(off).multiplyScalar(scale),ln=(a,b)=>a.map((v,j)=>T.MathUtils.lerp(v,b[j],u));
    return {hip:lv(tb.hip[i],tb.hip[i+1]),hipS:lv(tb.hipS[i],tb.hipS[i+1]),quats:tb.quats[i].map((q,j)=>q.clone().slerp(tb.quats[i+1][j],u)),points:tb.points[i].map((p,j)=>lv(p,tb.points[i+1][j])),h:ln(tb.heights[i],tb.heights[i+1]),w:ln(tb.weights[i],tb.weights[i+1]),floor:tb.floor.map(y=>y*scale)};
  }
  // Root travel implied by the source between two times: supporting points stay where they are.
  groundStep(r0,r1){
    const w=r0.w.map((x,j)=>(x+r1.w[j])/2),W=w.reduce((a,b)=>a+b,0);
    if(W<1e-4)return {d:V(),g:0};
    const foot=V();r1.points.forEach((p,j)=>foot.addScaledVector(p.clone().sub(r0.points[j]),w[j]/W));
    return {d:r1.hipS.clone().sub(r0.hipS).sub(foot).setY(0),g:Math.min(1,W)};
  }
  cycleTime(name,phase){return (phase+this.offset[name])*this.clips[name].duration;}
  feature(name,time){
    // Transition matching in source units: foot placement around hipS, heel/toe heights and ground-frame velocities.
    const a=this.rec(name,time,1),b=this.rec(name,time+.05,1),ground=this.groundStep(a,b),out=[];
    for(const j of [0,2]){
      const rel=a.points[j].clone().sub(a.hipS),v=b.points[j].clone().sub(a.points[j]).sub(b.hipS.clone().sub(a.hipS)).add(ground.d);
      out.push(rel.x,rel.z,a.h[j],a.h[j+1],v.x*2,v.z*2);
    }
    out.push(ground.d.x*6,ground.d.z*6);return out;
  }
  marks(){
    if(this.markCache)return this.markCache;
    const D=name=>this.clips[name].duration,dist=(a,b)=>Math.sqrt(a.reduce((s,x,i)=>s+(x-b[i])**2,0));
    const range=(a,b,step=1/60)=>{const r=[];for(let t=a;t<=b;t+=step)r.push(t);return r;};
    // Cycle phase 0 is the left heel strike of each loop, so walk and run blend at matching contacts.
    const strike=name=>{const w=this.table(name).weights;for(let i=1;i<w.length;i++)if(w[i-1][0]<.5&&w[i][0]>=.5)return i/(w.length-1);return 0;};
    this.offset={walk:strike('walk'),run:strike('run')};
    // Enter the standing jump shortly before the source's hip leaves its standing position.
    const onset=name=>{const {hip}=this.table(name),i=hip.findIndex(h=>h.distanceTo(hip[0])>.01);return Math.max(0,i/RATE-.1);};
    const walkF=Array.from({length:CYCLE_SAMPLES},(_,k)=>this.feature('walk',this.cycleTime('walk',k/CYCLE_SAMPLES)));
    // Stop entries per walk phase, taken from the clip's walking lead-in; the soonest good one is used.
    const stopF=range(0,D('stop')*.3).map(t=>[t,this.feature('stop',t)]);
    const stops=walkF.map(g=>stopF.reduce((best,[t,f])=>{const e=dist(f,g);return e<best.e?{time:t,e}:best;},{e:Infinity}));
    const minE=Math.min(...stops.map(s=>s.e));stops.forEach(s=>s.ok=s.e<=minE*1.5+.02);
    // Late entries: the stop's last walking steps (about 20-30% into the clip), matched the same way.
    const lateF=range(D('stop')*.2,D('stop')*.3).map(t=>[t,this.feature('stop',t)]);
    const stopsLate=walkF.map(g=>lateF.reduce((best,[t,f])=>{const e=dist(f,g);return e<best.e?{time:t,e}:best;},{e:Infinity}));
    const minL=Math.min(...stopsLate.map(s=>s.e));stopsLate.forEach(s=>s.ok=s.e<=minL*1.5+.02);
    const idle0=this.feature('idle',0),settle=(name,a,b)=>range(a,b).reduce((best,t)=>{const e=dist(this.feature(name,t),idle0);return e<best.e?{time:t,e}:best;},{e:Infinity}).time;
    const jumpEntry=onset('jump'),support=this.table('jump').weights.map(w=>Math.max(...w));
    const takeoffIndex=support.findIndex((w,i)=>i/RATE>jumpEntry&&w<.5),landIndex=support.findIndex((w,i)=>i>takeoffIndex&&w>=.5);
    const takeoff=takeoffIndex/RATE,landing=landIndex/RATE;
    // Running Jump (Mixamo has no in-place version): entered from the walk or run cycle before its takeoff,
    // left into whichever cycle matches its landing run-out. Its forward travel reaches the root once, via contacts.
    const flight=name=>{const s=this.table(name).weights.map(w=>Math.max(...w)),i=s.findIndex(w=>w<.5),j=s.findIndex((w,k)=>k>i&&w>=.5);return [i/RATE,j/RATE];};
    const [leapTakeoff,leapLanding]=flight('leap');
    const [leapMirrorTakeoff,leapMirrorLanding]=flight('leapMirror');
    // This source begins in the air; enter from the run's matching flight phase. Its landed run-out
    // changes to the run cycle before the next foot strike. Both cues are from the fixed Beta clips.
    const leapFromRun=Array.from({length:CYCLE_SAMPLES},(_,k)=>({time:.10,ok:k===52||k===20,name:k===20?'leapMirror':'leap'}));
    const leapExit={time:.75,phase:.5,run:1};
    const leapMirrorExit={...leapExit,time:.75,phase:0};
    // Longest heel-down stretch of either foot in a cycle, in source seconds.
    const heelDown=name=>{const w=this.table(name).weights,n=w.length;let best=0;for(const j of [0,2]){let run=0;for(const x of w.concat(w)){run=x[j]>.5?run+1:0;best=Math.max(best,run);}}return Math.min(best,n)/n*this.clips[name].duration;};
    const turnRate={walk:HIP_TWIST/heelDown('walk'),run:HIP_TWIST/heelDown('run')};
    return this.markCache={turnRate,stops,stopsLate,stopExit:settle('stop',D('stop')*.3,D('stop')*.75),jumpEntry,takeoff,landing,jumpExit:settle('jump',landing+.2,D('jump')-.05),
      leapFromRun,leapTakeoff,leapLanding,leapExit,leapMirrorTakeoff,leapMirrorLanding,leapMirrorExit};
  }
  makeBindings(rig,source){
    const bones=new Map(),used=new Set();
    for(const b of source.bones)if(!bones.has(norm(b.name)))bones.set(norm(b.name),b);
    const bindings=[];
    for(const target of rig.bones){const key=norm(target.name),bone=bones.get(key);
      if(!bone||used.has(key))continue;used.add(key);
      bindings.push({target,source:bone,sourceRest:source.rest.get(bone).worldQ.clone().invert(),targetRest:rig.rest.get(target).worldQ.clone()});
    }
    return bindings;
  }
  attach(rig){
    if(!rig.supported||!rig.pelvis)throw Error('Walk 보행의 뼈 대응이 없는 소체입니다.');
    this.rig=rig;this.base=rig.snapshot();rig.reset();
    this.bindings=this.makeBindings(rig,this.source);this.bodyBindings=new Map(this.bindings.map(b=>[b.target,b]));
    this.jumpBindings=new Map(this.makeBindings(rig,this.jumpSource).map(b=>[b.target,b]));
    this.legRatio=(rig.chains.leftFoot.l1+rig.chains.leftFoot.l2)/(this.source.chains.leftFoot.l1+this.source.chains.leftFoot.l2);
    this.jumpRatio=(rig.chains.leftFoot.l1+rig.chains.leftFoot.l2)/(this.jumpSource.chains.leftFoot.l1+this.jumpSource.chains.leftFoot.l2);
    this.feet={};
    rig.object.traverse(o=>{if(o.skeleton)o.skeleton.update();});
    for(const side of ['left','right']){
      const chain=rig.chains[side+'Foot'],bone=chain.c,ankle=bone.getWorldPosition(V()),descendants=new Set();bone.traverse(b=>{if(b.isBone)descendants.add(b);});
      let minY=Infinity;const candidates=[];
      rig.object.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
        for(let i=0;i<indices.count;i++){let weight=0;for(let k=0;k<4;k++)if(descendants.has(mesh.skeleton.bones[indices.getComponent(i,k)]))weight+=weights.getComponent(i,k);
          if(weight>.65){const y=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld).y;minY=Math.min(minY,y);candidates.push({mesh,index:i,y});}
        }
      });
      if(!Number.isFinite(minY))minY=0;
      this.feet[side]={chain,toe:toeOf(bone),height:ankle.y-minY,skinVertices:candidates,descendants,planted:true,contact:'sole',plantId:0,pins:[null,null],hold:null,release:null};
    }
    this.footHeight=(this.feet.left.height+this.feet.right.height)/2;
    // Rest offsets of the target legs, for evaluating the blended output's contacts without posing the rig.
    this.leg=legBones(rig,toeOf);this.legOffsets=this.leg.map((b,i)=>i?b.position.clone().multiply(this.leg[LEG_PARENTS[i]].getWorldScale(V())):null);
    this.marks();
    this.root=V(rig.root.position.x,0,rig.root.position.z);this.heading=0;this.headingVel=0;this.lead=0;this.leadVel=0;this.velocity=V();
    this.leadBones=LEAD_BONES.map(n=>rig.bones.find(b=>norm(b.name)===norm('mixamorig'+n))).filter(Boolean);
    this.layer={name:'idle',time:0};this.fade=null;this.runBlend=0;this.runShift=false;this.pendingStop=null;this.pendingLeap=null;this.jumpQueued=false;
    this.jumpAge=0;this.stopAge=0;this.jumpCarry=null;this.rootY=this.groundY||0;this.simPos=this.root.clone();this.simVel=V();this.stride=1;this.reach=0;this.pelvisDrop=0;
    this.motion='idle';this.state='정지';this.error=0;
    this.offsets=new Map();this.handShape=.5;
    this.renderPose();
  }
  detach(){if(this.rig)this.rig.restore(this.base);this.rig=null;}
  standingPose(rig){
    // The stopped idle frame is also the pose tab's editing baseline.
    this.attach(rig);const pose=rig.snapshot();this.detach();return pose;
  }
  previewClips(rig){
    // Named copies for the pose tab and GLB export; the controller keeps its own clips.
    const names={idle:'Mixamo 대기',walk:'Mixamo 걷기',stop:'Mixamo 정지',run:'Mixamo 달리기',
      leap:'Mixamo 달리며 점프',leapMirror:'Mixamo 달리며 점프 (좌우 반전)'};
    const clips=Object.entries(names).map(([id,name])=>{const clip=this.clips[id].clone();clip.name=name;return clip;});
    return [...clips,this.bakeJump(rig,'Mixamo 점프')];
  }
  bakeJump(rig,name,fps=30){
    // The jump source is a Blender-converted GLB whose bone frames and units differ from the FBX body.
    // Bake it through the same world-rotation retarget as the move mode, without foot contact.
    const bindings=this.makeBindings(rig,this.jumpSource),leg=r=>r.chains.leftFoot.l1+r.chains.leftFoot.l2,ratio=leg(rig)/leg(this.jumpSource);
    const clip=this.clips.jump,count=Math.round(clip.duration*fps)+1,times=[],rotations=new Map(bindings.map(b=>[b.target,[]])),hips=[];
    const saved=rig.snapshot();rig.reset();
    for(let i=0;i<count;i++){
      const t=Math.min(i/fps,clip.duration);times.push(t);this.pose('jump',t);
      for(const b of bindings){rig.setWorldQ(b.target,b.source.getWorldQuaternion(Q()).multiply(b.sourceRest).multiply(b.targetRest));rotations.get(b.target).push(...b.target.quaternion.toArray());}
      const hip=this.jumpSource.pelvis.getWorldPosition(V()).sub(this.jumpSource.rest.get(this.jumpSource.pelvis).worldP).multiplyScalar(ratio).add(rig.rest.get(rig.pelvis).worldP);
      hips.push(...rig.pelvis.parent.worldToLocal(rig.root.localToWorld(hip)).toArray());
    }
    rig.restore(saved);
    const tracks=[...rotations].map(([bone,values])=>new T.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`,times,values));
    tracks.push(new T.VectorKeyframeTrack(`${rig.pelvis.uuid}.position`,times,hips));
    return new T.AnimationClip(name,clip.duration,tracks);
  }
  requestJump(){this.jumpQueued=true;this.jumpAge=0;}
  jumpStart(){const m=this.markCache,p=this.opts.jumpPrep;return p==null?m.jumpEntry:Math.max(m.jumpEntry,m.takeoff-p);}
  play(name,time){
    // The root absorbs the common shift of the supporting feet between the two clips. A change in foot
    // spacing or a turned foot cannot be absorbed, so those feet re-step one after the other instead of sliding.
    const out=this.contactFrame(this.parts()),layer=this.layer;
    this.fade=null;this.layer={name,time};this.pendingStop=null;this.pendingLeap=null;
    const inn=this.contactFrame(this.parts()),move=i=>inn.rel[2*i].clone().sub(out.rel[2*i]).setY(0);
    const angle=(c,i)=>Math.atan2(c.rel[2*i+1].x-c.rel[2*i].x,c.rel[2*i+1].z-c.rel[2*i].z),turned=i=>Math.abs(wrap(angle(inn,i)-angle(out,i)))>STANCE_TURN;
    const supported=[0,1].every(i=>Math.min(out.w[2*i]+out.w[2*i+1],inn.w[2*i]+inn.w[2*i+1])>.5),change=move(0).distanceTo(move(1));
    const feet=[];
    if(supported){
      if(change>STANCE_CHANGE)feet.push(move(0).length()>move(1).length()?0:1);
      for(const i of [0,1])if(turned(i)&&!feet.includes(i))feet.push(i);
    }
    const duration=FADE+STEP_FADE*feet.length;
    // Each re-stepping foot has its own window of the fade; the other foot carries the root meanwhile.
    const steps=feet.map((foot,k)=>{
      const chain=this.feet[['left','right'][foot]].chain,hip=chain.a.getWorldPosition(V()),knee=chain.b.getWorldPosition(V()),ankle=chain.c.getWorldPosition(V());
      const dir=ankle.clone().sub(hip).normalize(),pole=knee.sub(hip);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
      return {foot,from:ankle,pole,heading:this.heading,lift:Math.min(.05,Math.max(.02,.4*change)),
        a:(FADE/2+STEP_FADE*k)/duration,b:(FADE/2+STEP_FADE*(k+1))/duration};
    });
    this.fade={layer,t:0,duration,steps};
  }
  stepping(){
    // Re-stepping feet and their progress in the current fade.
    const p=this.fade?this.fade.t/this.fade.duration:0;
    return (this.fade?.steps||[]).filter(s=>p>=s.a&&p<=s.b).map(s=>({...s,u:smooth((p-s.a)/(s.b-s.a))}));
  }
  // Playback speed applies to the locomotion clips; idle and jump keep their source timing.
  pace(name,rate){return name==='idle'||name==='jump'||name==='leap'||name==='leapMirror'?1:rate;}
  clock(name,rate){
    const pace=this.pace(name,rate);
    return name==='cycle'?pace/T.MathUtils.lerp(this.clips.walk.duration,this.clips.run.duration,this.runBlend):pace;
  }
  // Weighted clip samples that make up the output. The list keeps a fixed shape between
  // transitions so that consecutive substeps can be compared entry by entry.
  parts(){
    const list=[],f=this.fade?smooth(Math.min(1,this.fade.t/this.fade.duration)):1;
    const add=(layer,k)=>{
      if(layer.name!=='cycle'){list.push({name:layer.name,time:layer.time,k});return;}
      list.push({name:'walk',time:this.cycleTime('walk',layer.time),k:k*(1-this.runBlend)},{name:'run',time:this.cycleTime('run',layer.time),k:k*this.runBlend});
    };
    if(this.fade)add(this.fade.layer,1-f);add(this.layer,f);return list;
  }
  nextEntry(phase,stops){
    // The soonest cycle phase ahead whose pose matches an entry into the next clip.
    const n=stops.length,base=Math.floor(phase*n);
    for(let i=1;i<=n;i++){const s=stops[(base+i)%n];if(s.ok)return {at:(base+i)/n,time:s.time,name:s.name};}
    return {at:phase,time:stops[0].time};
  }
  transition(wants,dt=0){
    const L=this.layer,m=this.markCache,o=this.opts;
    if(this.fade&&o.startCancel&&!wants&&L.name==='cycle'&&this.fade.layer.name==='idle'&&this.fade.t<this.fade.duration/2){this.play('idle',0);return;}
    if(this.fade)return;
    if(L.name==='idle'){if(this.jumpQueued){this.jumpQueued=false;this.play('jump',this.jumpStart());}else if(wants)this.play('cycle',0);}
    else if(L.name==='cycle'){
      // A jump with direction held uses the authored Running Jump; without direction the cycle stops first and the standing jump follows.
      if(wants&&this.jumpQueued&&o.walkJump==='now'&&this.runBlend<.5){this.jumpQueued=false;this.jumpCarry=this.velocity.clone();this.play('jump',this.jumpStart());}
      else if(wants&&this.jumpQueued){
        if(this.runBlend>.99&&!this.runShift){this.pendingLeap??=this.nextEntry(L.time,m.leapFromRun);if(L.time>=this.pendingLeap.at){this.jumpQueued=false;this.play(this.pendingLeap.name,this.pendingLeap.time);}}
      }
      else if(wants)this.pendingStop=null;
      else if(this.runBlend<.1){
        const stops=o.stopLate?m.stopsLate:m.stops;
        if(!this.pendingStop)this.stopAge=0;this.stopAge+=dt;this.pendingStop??=this.nextEntry(L.time,stops);
        // stopWait: past it, enter the stop at the current phase's own entry even if it matches less well.
        if(L.time>=this.pendingStop.at)this.play('stop',this.pendingStop.time);
        else if(this.stopAge>=o.stopWait){const n=stops.length;this.play('stop',stops[Math.floor((L.time-Math.floor(L.time))*n)%n].time);}
      }
    }
    else if(L.name==='stop'){if(wants&&o.stopCancel)this.play('cycle',0);else if(L.time>=m.stopExit){if(this.jumpQueued){this.jumpQueued=false;this.play('jump',this.jumpStart());}else this.play('idle',0);}}
    else if(L.name==='jump'&&L.time>=m.jumpExit)this.play('idle',0);
    else if((L.name==='leap'||L.name==='leapMirror')&&L.time>=m[L.name==='leap'?'leapExit':'leapMirrorExit'].time){const exit=m[L.name==='leap'?'leapExit':'leapMirrorExit'];this.runBlend=exit.run;this.runShift=false;this.play('cycle',exit.phase);}
  }
  update(dt,direction,speed,run=false){
    // speed: a tempo (playback rate; step length from the source) or {walk, run} m/s (see speedSplit).
    if(!this.rig)return;
    let remaining=Math.min(dt,.1);while(remaining>1e-8){const step=Math.min(remaining,1/120);this.advance(step,direction,speed,run);remaining-=step;}
    this.renderPose();
  }
  advance(dt,direction,speed,run){
    const wants=direction.lengthSq()>.01,o=this.opts;let [rate,stride]=this.speedSplit(speed);rate=T.MathUtils.clamp(rate,.2,2.5);
    if(this.jumpQueued&&/^(jump|leap|leapMirror)$/.test(this.layer.name)&&(this.jumpAge+=dt)>o.jumpBuffer){this.jumpQueued=false;this.pendingLeap=null;}
    this.stride=this.layer.name==='cycle'||this.fade?.layer.name==='cycle'?stride:1;
    this.transition(wants,dt);
    const before=this.parts(),c0=this.contactFrame(before),moving=this.layer.name==='cycle';
    // Facing follows the input while the cycle plays; elsewhere it settles where it is.
    const difference=wants&&moving?wrap(Math.atan2(direction.x,direction.z)-this.heading):0,turn=this.opts.sim?this.simTurn(difference,dt):this.turnStep(difference,dt*this.pace(this.layer.name,rate));
    [this.lead,this.leadVel]=spring(this.lead-T.MathUtils.clamp(difference-turn,-LEAD,LEAD),this.leadVel,LEAD_EASE,dt*this.pace(this.layer.name,rate));this.lead+=T.MathUtils.clamp(difference-turn,-LEAD,LEAD);
    // Walk and run share contacts only just after a heel strike (walk stance lasts 60% of its cycle,
    // run stance 20%), so the gait change starts at a strike and completes within 0.2 s.
    if(this.layer.name==='cycle'){
      const target=(run||this.jumpQueued)&&wants?1:0,cycle=this.layer.time-Math.floor(this.layer.time);
      if(target!==this.runBlend&&(this.runShift||o.blendNow||cycle%.5<.05))this.runShift=true;
      if(this.runShift)this.runBlend=T.MathUtils.clamp(this.runBlend+(target?5:-5)*dt,0,1);
      if(this.runBlend===target)this.runShift=false;
    }
    for(const layer of [this.fade?.layer,this.layer])if(layer)layer.time+=dt*this.clock(layer.name,rate);
    // Fades and re-steps span the same source time at any playback speed.
    if(this.fade)this.fade.t+=dt*this.pace(this.layer.name,rate);
    // Turn about the supporting contact, then move the root so the supporting points of the blended
    // output stay put: this covers the source's own travel and the crossfade between clips alike.
    const after=this.parts(),c1=this.contactFrame(after),move=V(),pivot=V();let W=0,W0=0;
    // The pivot is the ball of the supporting foot (its heel only while the toe is off the ground), where that foot
    // actually stands, i.e. with its hold applied.
    c0.w.forEach((w0,j)=>{const w=(w0+c1.w[j])/2,p=j%2?w0:w0*(1-c0.w[j+1]);W+=w;W0+=p;move.addScaledVector(c1.rel[j].clone().sub(c0.rel[j]).setY(0),-w);if(p)pivot.addScaledVector(this.held(j>>1,this.world(c0.rel[j])).setY(0),p);});
    const center=W0>1e-4?pivot.divideScalar(W0):this.root.clone();
    if(turn){this.root.sub(center).applyQuaternion(yaw(turn)).add(center);this.heading+=turn;}
    this.holdFeet(c1,turn,center,dt*this.pace(this.layer.name,rate));
    // Without support, a travelling clip moves the root by its own hip travel; in-place clips keep the last velocity.
    const air=V();let carry=0;
    before.forEach((p,e)=>{const k=after[e].k;if(!k)return;if(this.table(p.name).travels)air.addScaledVector(this.rec(p.name,after[e].time).hipS.sub(this.rec(p.name,p.time).hipS).setY(0),k);else carry+=k;});
    // At the run's flight phase the outgoing clip has no planted contact. Keep the moving
    // jump's authored root travel through the crossfade instead of attenuating it with pose weight.
    if((this.layer.name==='leap'||this.layer.name==='leapMirror')&&this.fade){const name=this.layer.name,i=before.findIndex(p=>p.name===name);if(i>=0){air.copy(this.rec(name,after[i].time).hipS.sub(this.rec(name,before[i].time).hipS).setY(0));carry=0;}}
    air.applyQuaternion(yaw(this.heading)).addScaledVector(this.velocity,carry*dt);
    const G=Math.min(1,W),step=(W>1e-4?move.divideScalar(W):move).applyQuaternion(yaw(this.heading)).multiplyScalar(G).addScaledVector(air,1-G);
    this.root.add(step);if(G>.5||carry<.5)this.velocity.copy(step).divideScalar(dt);
    // walkJump 'now': the standing jump carries the walking velocity, fading out over its landing.
    if(this.jumpCarry){if(this.layer.name!=='jump')this.jumpCarry=null;else{const m=this.markCache,u=T.MathUtils.clamp((this.layer.time-m.landing)/.3,0,1);this.root.addScaledVector(this.jumpCarry,dt*(1-u));}}
    if(o.sim)this.followSim(wants?direction:ZERO,rate*stride,run,step,dt);
    if(o.terrain)this.followGround(c1,G,dt);
    if(this.fade&&this.fade.t>=this.fade.duration)this.fade=null;
    const L=this.layer,m=this.markCache;
    this.motion=L.name==='cycle'?(this.runBlend>.5?'run':'walk'):L.name;
    this.state={idle:'정지',stop:'멈춤'}[L.name]||(L.name==='jump'?(L.time<m.takeoff?'점프 준비':L.time<m.landing?'점프':L.time<m.landing+.4?'착지':'회복')
      :(L.name==='leap'||L.name==='leapMirror')?(L.time<m[L.name+'Takeoff']?'점프 준비':L.time<m[L.name+'Landing']?'점프':'착지')
      :this.pendingStop?'멈춤':Math.abs(difference)>.35?'방향 전환':this.motion==='run'?'달리기':'걷기');
  }
  // Speed of a looping gait at 1x in metres per second of the target body: the root speed its contacts give while
  // supported (the walk source is nearly in place, so hip drift underestimates it; in flight the root keeps that speed).
  gaitSpeed(name){
    const c=this.gaitCache??={};
    if(c[name]==null){const n=Math.round(this.clips[name].duration*RATE),d=V();let k=0;for(let i=0;i<n;i++){const g=this.groundStep(this.rec(name,i/RATE,1),this.rec(name,(i+1)/RATE,1));if(g.g>.5){d.add(g.d);k++;}}c[name]=k?d.length()*RATE/k:0;}
    return c[name]*this.legRatio;
  }
  // [rate, stride] for update()'s speed: a tempo number (playback rate of the cycle, stride from opts), or target speeds
  // {walk, run} in m/s, where cadence and step length both scale with the square root of the speed change (ledger Q10):
  // cadence within 0.75-1.3x of the source and stride within 0.7-1.4x; beyond that the speed is not reached.
  speedSplit(speed){
    if(typeof speed==='number')return [speed,this.opts.stride];
    const {walk,run}=speed;
    const split=(v,v0)=>{const r=v/v0,rate=T.MathUtils.clamp(Math.sqrt(r),.75,1.3);return [rate,T.MathUtils.clamp(r/rate,.7,1.4)];};
    const [rw,sw]=split(walk,this.gaitSpeed('walk')),[rr,sr]=split(run,this.gaitSpeed('run')),k=this.runBlend;
    return [T.MathUtils.lerp(rw,rr,k),T.MathUtils.lerp(sw,sr,k)];
  }
  // Expected travel speed in m/s at the current walk/run mix for update()'s speed.
  expectedSpeed(speed=1){const [rate,stride]=this.speedSplit(speed);return T.MathUtils.lerp(this.gaitSpeed('walk'),this.gaitSpeed('run'),this.runBlend)*rate*stride;}
  simTurn(difference,dt){
    // Facing under sim: the spring alone, at the configured halflife.
    let [x,vel]=spring(-difference,this.headingVel,this.opts.sim.turnHalflife,dt);this.headingVel=vel;return x+difference;
  }
  followSim(direction,rate,run,step,dt){
    const s=this.opts.sim,gait=T.MathUtils.lerp(this.gaitSpeed('walk'),this.gaitSpeed('run'),run?1:0)*rate;
    const desired=direction.clone().setY(0).multiplyScalar(gait),k=1-Math.exp(-Math.LN2*dt/s.halflife);
    this.simVel.lerp(desired,k);this.simPos.addScaledVector(this.simVel,dt).setY(0);
    // Pull the body toward the simulation by at most ratio x its own step, keep the simulation within maxDist.
    const gap=this.simPos.clone().sub(this.root).setY(0),limit=s.ratio*step.length()+1e-9,corr=gap.clone().multiplyScalar(k);
    if(corr.length()>limit)corr.setLength(limit);
    this.root.add(corr);gap.sub(corr);if(gap.length()>s.maxDist)this.simPos.copy(this.root).add(gap.setLength(s.maxDist));
    // Planted feet hold their place against the pull up to lock metres in total per stance; beyond it they slide.
    // Only the pull is limited: the hold's turn compensation is left as it is.
    for(const f of Object.values(this.feet)){
      if(!(f.hold&&f.planted)){f.pull=null;continue;}
      const before=f.pull??V(),next=before.clone().sub(corr);if(next.length()>s.lock)next.setLength(s.lock);
      f.hold.t.add(next.clone().sub(before));f.pull=next;
    }
    this.simCorrection=corr.length()/dt;
  }
  footSole(c,j){return this.world(c.rel[j]).y-this.footHeight;}
  followGround(c,G,dt){
    const t=this.opts.terrain,airborne=G<.5;
    // Lowest contact point above the walking plane: lets a jump clear a step and blocks while the feet are below it.
    const lift=Math.max(0,Math.min(this.footSole(c,0),this.footSole(c,2)));
    const push=t.push(this.root.x,this.root.z,.22,this.rootY+lift+STEP_UP);if(push){this.root.add(push);this.simPos.add(push);}
    if(!airborne){const g=t.height(this.root.x,this.root.z,this.rootY+lift+STEP_UP),h=g>this.rootY?.05:.08;this.rootY+=(g-this.rootY)*(1-Math.exp(-Math.LN2*dt/h));}
    else for(const j of [0,2]){const p=this.world(c.rel[j]),sole=this.rootY+p.y-this.footHeight,g=t.height(p.x,p.z,sole+.15);if(sole<g)this.rootY+=g-sole;}
  }
  turnStep(difference,dt){
    // Heading error through the facing spring, then the gait's top turn speed.
    const k=this.runBlend,halflife=T.MathUtils.lerp(FACING.walk,FACING.run,k),max=T.MathUtils.lerp(...['walk','run'].map(n=>this.markCache.turnRate[n]),k);
    let [x,vel]=spring(-difference,this.headingVel,halflife,dt),turn=x+difference;
    if(Math.abs(turn)>max*dt){turn=Math.sign(turn)*max*dt;vel=Math.sign(vel)*Math.min(Math.abs(vel),max);}
    this.headingVel=vel;return turn;
  }
  world(rel){return rel.clone().applyQuaternion(yaw(this.heading)).add(this.root);}
  // Each supporting foot carries a planar hold H(X)=yaw(a)·X+t on top of its clip pose. It is identity until the
  // body turns: the body's turn about the pivot is cancelled for the planted feet, so they keep their place and yaw.
  holdOf(i){const f=this.feet[['left','right'][i]];if(f.hold)return f.hold;if(f.release){const s=1-smooth(Math.min(1,f.release.u));return {a:f.release.a*s,t:f.release.t.clone().multiplyScalar(s)};}return {a:0,t:V()};}
  held(i,p){const {a,t}=this.holdOf(i);return p.applyQuaternion(yaw(a)).add(t);}
  holdFeet(c,turn,center,dt){
    const stepping=new Set(this.stepping().map(s=>s.foot));
    for(const [i,side] of ['left','right'].entries()){
      const f=this.feet[side];
      const step=stepping.has(i)&&this.fade.steps.find(x=>x.foot===i);
      if(step&&(step.started||!f.hold&&!f.release)){step.started=true;f.hold=f.release=null;continue;}   // the re-step drives this leg
      if(step||Math.max(c.w[2*i],c.w[2*i+1])>.5){
        const h=f.hold??={a:0,t:V()};f.release=null;
        if(turn){h.t.add(center.clone().sub(center.clone().applyQuaternion(yaw(-turn))).applyQuaternion(yaw(h.a)));h.a-=turn;}
        if(step){h.handoff=true;continue;}
        // The foot turns about the point it stands on: its ball while the heel is up (back toward the clip's yaw),
        // and whichever point carries it once the twist reaches the hip's range.
        const onBall=c.w[2*i]<.5&&c.w[2*i+1]>.5,a=onBall?h.a*Math.exp(-dt/BALL_PIVOT):T.MathUtils.clamp(h.a,-HIP_TWIST,HIP_TWIST);
        if(a!==h.a){const j=c.w[2*i+1]>=c.w[2*i]?2*i+1:2*i,anchor=this.world(c.rel[j]),p=this.held(i,anchor.clone());h.t.copy(p).sub(anchor.applyQuaternion(yaw(a)));h.a=a;}
      }else if(f.hold){f.release={a:f.hold.a,t:f.hold.t.clone(),u:0};f.hold=null;}
      if(f.release&&(f.release.u+=dt/RELEASE)>=1)f.release=null;
    }
  }
  hipOffset(r,k,hip){
    // Pelvis in root space: the source sway around hipS, and the source height above its standing floor.
    return hip.add(V(r.hip.x-r.hipS.x,r.hip.y-(r.floor[0]+r.floor[2])/2+this.footHeight,r.hip.z-r.hipS.z).multiplyScalar(k));
  }
  contactFrame(parts){
    // Contact points of the blended output relative to the root (source axes), by forward kinematics with
    // the same rotation blend as renderPose, and their support weights.
    const total=parts.reduce((s,p)=>s+p.k,0)||1,w=[0,0,0,0],quats=[],sums=[],hip=V();
    for(const p of parts){
      if(!p.k)continue;const r=this.rec(p.name,p.time),k=p.k/total,binds=p.name==='jump'?this.jumpBindings:this.bodyBindings;
      this.hipOffset(r,k,hip);r.w.forEach((x,j)=>w[j]+=k*x);
      this.leg.forEach((bone,b)=>{const a=binds.get(bone);if(!a)return;const q=r.quats[b].multiply(a.sourceRest).multiply(a.targetRest),sum=(sums[b]||0)+k;
        if(quats[b])quats[b].slerp(q,k/sum);else quats[b]=q;sums[b]=sum;});
    }
    const at=[hip];for(let b=1;b<this.leg.length;b++)at[b]=at[LEG_PARENTS[b]].clone().add(this.legOffsets[b].clone().applyQuaternion(quats[LEG_PARENTS[b]]||Q()));
    // Stride warping moves each foot rigidly along the travel direction (+z) about the root.
    if(this.stride!==1)for(const [ankle,toe] of [[3,4],[7,8]]){const dz=(this.stride-1)*at[ankle].z;at[ankle].z+=dz;at[toe].z+=dz;}
    for(const s of this.stepping())w[2*s.foot]=w[2*s.foot+1]=0;
    return {rel:CONTACT_BONES.map(b=>at[b]),w};
  }
  reachLeg(chain,target,step){
    // Carry the outgoing knee plane through the swing, then return to the source pose's plane.
    // Near extension the current knee alone has too little bend to define a stable plane.
    const a=chain.a.getWorldPosition(V()),dir=target.clone().sub(a).normalize(),sourcePole=this.kneePlane(chain,dir);
    const pole=step.pole.clone().applyQuaternion(yaw(this.heading-step.heading));pole.addScaledVector(dir,-pole.dot(dir));
    if(pole.lengthSq()<1e-8)pole.copy(sourcePole);else pole.normalize();
    const footQ=chain.c.getWorldQuaternion(Q());if(step.yaw)footQ.premultiply(yaw(step.yaw*(1-step.u)));
    this.solveLeg(chain,target,pole.lerp(sourcePole,step.u).normalize(),footQ);
  }
  kneePlane(chain,dir){const a=chain.a.getWorldPosition(V()),p=chain.b.getWorldPosition(V()).sub(a);return p.addScaledVector(dir,-p.dot(dir)).normalize();}
  solveLeg(chain,target,pole,footQ){
    // Two-bone reach of the ankle to target with the knee in the plane of pole; the foot ends at footQ.
    const rig=this.rig,a=chain.a.getWorldPosition(V()),b=chain.b.getWorldPosition(V()),{l1,l2}=chain;
    const to=target.clone().sub(a),d=T.MathUtils.clamp(to.length(),Math.abs(l1-l2)+1e-4,l1+l2-1e-4),dir=to.normalize();
    const x=(l1*l1-l2*l2+d*d)/(2*d),knee=a.clone().addScaledVector(dir,x).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-x*x)));
    rig.setWorldQ(chain.a,Q().setFromUnitVectors(b.clone().sub(a).normalize(),knee.sub(a).normalize()).multiply(chain.a.getWorldQuaternion(Q())));
    const b2=chain.b.getWorldPosition(V()),c2=chain.c.getWorldPosition(V()),end=a.clone().addScaledVector(dir,d);
    rig.setWorldQ(chain.b,Q().setFromUnitVectors(c2.sub(b2).normalize(),end.sub(b2).normalize()).multiply(chain.b.getWorldQuaternion(Q())));
    rig.setWorldQ(chain.c,footQ);
  }
  renderPose(){
    const rig=this.rig;if(!rig)return;
    const parts=this.parts().filter(p=>p.k>0),total=parts.reduce((s,p)=>s+p.k,0),rootQ=yaw(this.heading);
    // groundY lifts the whole walk onto a flat floor at that height (previs move mode); foot targets follow the placed rig.
    rig.root.position.set(this.root.x,this.opts.terrain?this.rootY:this.groundY||0,this.root.z);rig.root.quaternion.copy(rootQ);
    for(const [bone,rest]of rig.rest){bone.position.copy(rest.p);bone.quaternion.copy(rest.q);bone.scale.copy(rest.s);}rig.root.updateMatrixWorld(true);
    // One owner per joint: the weighted source clips. The root carries travel and heading;
    // the pelvis keeps the source sway around hipS and the source height above its standing floor.
    const rotations=new Map(),weights=new Map(),hip=V();
    for(const p of parts){
      const k=p.k/total,r=this.rec(p.name,p.time),binds=p.name==='jump'?this.jumpBindings:this.bodyBindings;
      this.hipOffset(r,k,hip);this.pose(p.name,p.time);
      for(const b of this.bindings){const a=binds.get(b.target);if(!a)continue;
        const q=a.source.getWorldQuaternion(Q()).multiply(a.sourceRest).multiply(a.targetRest),sum=(weights.get(b.target)||0)+k;
        if(rotations.has(b.target))rotations.get(b.target).slerp(q,k/sum);else rotations.set(b.target,q);weights.set(b.target,sum);
      }
    }
    rig.pelvis.position.copy(rig.pelvis.parent.worldToLocal(rig.root.localToWorld(hip)));rig.pelvis.updateWorldMatrix(false,true);
    for(const b of this.bindings)if(rotations.has(b.target))rig.setWorldQ(b.target,rootQ.clone().multiply(rotations.get(b.target)));
    rig.root.updateMatrixWorld(true);
    if(Math.abs(this.lead)>1e-5){const share=yaw(this.lead/this.leadBones.length);for(const b of this.leadBones)rig.setWorldQ(b,share.clone().multiply(b.getWorldQuaternion(Q())));rig.root.updateMatrixWorld(true);}
    if(this.stride!==1)this.warpStride(rootQ);
    // A foot that was held when its re-step window opened starts the step from its held place, knee plane and yaw.
    for(const [i,side] of ['left','right'].entries()){
      const f=this.feet[side];if(!f.hold?.handoff)continue;
      const s=this.fade.steps.find(x=>x.foot===i),r=yaw(f.hold.a),chain=f.chain,a=chain.a.getWorldPosition(V());
      s.from=chain.c.getWorldPosition(V()).applyQuaternion(r).add(f.hold.t);
      s.pole=this.kneePlane(chain,s.from.clone().sub(a).normalize()).applyQuaternion(r);s.heading=this.heading;s.yaw=f.hold.a;s.started=true;f.hold=null;
    }
    // A re-stepping foot leaves its outgoing contact and lands where the blended pose puts it at its window end.
    for(const s of this.stepping()){
      const chain=this.feet[['left','right'][s.foot]].chain,target=s.from.clone().lerp(chain.c.getWorldPosition(V()),s.u);target.y+=Math.sin(Math.PI*s.u)*s.lift;
      this.reachLeg(chain,target,s);rig.root.updateMatrixWorld(true);
    }
    // A held foot stays where it stands while the body turns over it: the leg turns at the hip and the knee follows the foot.
    for(const [i,side] of ['left','right'].entries()){
      const {a,t}=this.holdOf(i);if(Math.abs(a)<1e-7&&t.lengthSq()<1e-14)continue;
      const chain=this.feet[side].chain,r=yaw(a),target=chain.c.getWorldPosition(V()).applyQuaternion(r).add(t);
      const pole=this.kneePlane(chain,target.clone().sub(chain.a.getWorldPosition(V())).normalize()).applyQuaternion(r);
      this.solveLeg(chain,target,pole,r.clone().multiply(chain.c.getWorldQuaternion(Q())));rig.root.updateMatrixWorld(true);
    }
    if(this.opts.terrain)this.reachGround();
    this.measureContacts(this.contactFrame(parts).w);
    for(const c of Object.values(rig.chains))c.target.copy(rig.root.worldToLocal(c.c.getWorldPosition(V())));
    this.applyOffsets();rig.updateVisuals();
  }
  // Legs reach targets with the pelvis lowered first when a target is beyond the leg (both feet keep their targets).
  reachTargets(targets){
    const rig=this.rig,chains=[this.feet.left.chain,this.feet.right.chain];
    let drop=0;chains.forEach((c,i)=>{const a=c.a.getWorldPosition(V()),d=targets[i].distanceTo(a),max=(c.l1+c.l2)*.995;if(d>max)drop=Math.max(drop,d-max);});
    this.reach=Math.max(...chains.map((c,i)=>targets[i].distanceTo(c.a.getWorldPosition(V()))/(c.l1+c.l2)));this.pelvisDrop=drop;
    if(drop){const p=rig.pelvis.getWorldPosition(V());p.y-=drop;rig.pelvis.position.copy(rig.pelvis.parent.worldToLocal(p));rig.root.updateMatrixWorld(true);}
    chains.forEach((c,i)=>{const dir=targets[i].clone().sub(c.a.getWorldPosition(V())).normalize();this.solveLeg(c,targets[i],this.kneePlane(c,dir),c.c.getWorldQuaternion(Q()));rig.root.updateMatrixWorld(true);});
  }
  warpStride(rootQ){
    const fwd=V(0,0,1).applyQuaternion(rootQ),origin=this.rig.root.position;
    this.reachTargets([this.feet.left.chain,this.feet.right.chain].map(c=>{const p=c.c.getWorldPosition(V());return p.addScaledVector(fwd,(this.stride-1)*p.clone().sub(origin).dot(fwd));}));
  }
  reachGround(){
    // Each foot to the ground under it relative to the walking plane; the pelvis drops for the lower one.
    const t=this.opts.terrain,base=this.rootY;
    this.reachTargets([this.feet.left.chain,this.feet.right.chain].map(c=>{const p=c.c.getWorldPosition(V()),sole=p.y-this.footHeight;return p.setY(p.y+Math.max(-.35,t.height(p.x,p.z,sole+STEP_UP)-base));}));
  }
  measureContacts(contact){
    // Diagnostics only: how far each supporting foot has slid along the ground since it touched down.
    // Nothing is corrected here.
    let slide=0;
    ['left','right'].forEach((side,i)=>{
      const f=this.feet[side],heel=contact[2*i],toe=contact[2*i+1],planted=Math.max(heel,toe)>.5;
      if(planted&&!f.planted){f.plantId++;f.pins=[null,null];}
      f.planted=planted;f.contact=planted?(toe>heel+.1?'toe':'sole'):null;
      // A rolling foot pivots on one point, so the foot's slide is that of its least-moving supporting point.
      if(planted)slide=Math.max(slide,Math.min(...[[heel,f.chain.c],[toe,f.toe]].map(([w,bone],j)=>{if(w<=.5)return Infinity;const p=bone.getWorldPosition(V()).setY(0);f.pins[j]??=p;return p.distanceTo(f.pins[j]);})));
    });
    this.error=slide;
  }
  setOffset(id,bend=0,turn=0){
    setMotionOffset(this,id,bend,turn);
  }
  applyOffsets(){
    applyMotionOffsets(this);
  }
}
