// Uses the existing local Vulkan installation. Never downloads weights or uploads input.
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {Quaternion,Vector3} from '../dist/vendor/three.module.js';
const folder=path.resolve(process.argv[2]),install=path.resolve(process.argv[3]),request=JSON.parse(await readFile(path.join(folder,'request.json'),'utf8'));
if(!Number.isInteger(request.frames)||request.frames<60||request.frames>240||typeof request.prompt!=='string')throw Error('Invalid generation request');
await writeFile(path.join(folder,'prompt.txt'),request.prompt);
const args=['models/kimodo-soma-rp-v1.1-f32.gguf','Llama-3-Kimodo-Q8_0.gguf',path.join(folder,'prompt.txt'),String(request.frames),String(request.steps),String(request.seed),folder];
const env={...process.env,KIMODO_BACKEND:'vulkan',KIMODO_THREADS:'6',KIMODO_TEXT_LAYER_CHUNK:'8',GGML_VK_DISABLE_COOPMAT:'1',GGML_VK_DISABLE_COOPMAT2:'1',GGML_VK_DISABLE_F16:'1'};
const start=Date.now();await new Promise((resolve,reject)=>{const p=spawn(path.join(install,'runtime/kmd-generate.exe'),args,{cwd:install,env,windowsHide:true,stdio:['ignore','inherit','inherit']});p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error('Kimodo exit '+code)));});
const skeleton=JSON.parse(await readFile(process.env.KIMODO_SKELETON||'D:/_codex/#3d/tools/kimodo-soma30.json','utf8'));
const roots=await readFile(path.join(folder,'root_positions.f32')),raw=await readFile(path.join(folder,'local_rotations_xyzw.f32'));
if(roots.length!==request.frames*12||raw.length!==request.frames*30*16)throw Error('Unexpected generated frame count');
const mapping={Hips:'Hips',Spine1:'Spine',Spine2:'Spine1',Chest:'Spine2',Neck1:'Neck',Head:'Head',LeftShoulder:'LeftShoulder',LeftArm:'LeftArm',LeftForeArm:'LeftForeArm',LeftHand:'LeftHand',RightShoulder:'RightShoulder',RightArm:'RightArm',RightForeArm:'RightForeArm',RightHand:'RightHand',LeftLeg:'LeftUpLeg',LeftShin:'LeftLeg',LeftFoot:'LeftFoot',LeftToeBase:'LeftToeBase',RightLeg:'RightUpLeg',RightShin:'RightLeg',RightFoot:'RightFoot',RightToeBase:'RightToeBase'};
const entries=skeleton.names.map((n,i)=>({name:mapping[n],i})).filter(e=>e.name),rest=[];
for(let i=0;i<30;i++){const v=new Vector3(...skeleton.offsets[i]);rest.push(skeleton.parents[i]<0?v:v.add(rest[skeleton.parents[i]]));}
const index=name=>skeleton.names.indexOf(name),legLength=rest[index('LeftLeg')].distanceTo(rest[index('LeftShin')])+rest[index('LeftShin')].distanceTo(rest[index('LeftFoot')]),frames=[];
for(let f=0;f<request.frames;f++){const world=[];for(let j=0;j<30;j++){const q=new Quaternion(...[0,1,2,3].map(k=>raw.readFloatLE(((f*30+j)*4+k)*4)));if(!Number.isFinite(q.length())||Math.abs(q.length()-1)>.02)throw Error('Invalid generated rotation');world.push(skeleton.parents[j]<0?q.normalize():world[skeleton.parents[j]].clone().multiply(q).normalize());}frames.push({hip:[0,1,2].map(k=>roots.readFloatLE((f*3+k)*4)),q:entries.flatMap(e=>world[e.i].toArray())});}
const label=request.prompt.slice(0,70),clip={label,source:'Kimodo · 로컬 생성',duration:(request.frames-1)/30,legLength,bones:entries.map(e=>e.name),frames,provenance:request};
await writeFile(path.join(folder,'clip.json'),JSON.stringify(clip));
const category=/sword|fight|slash|attack|punch|kick/i.test(request.prompt)?'액션':/walk|run|jump/i.test(request.prompt)?'이동':'일상';
await writeFile(path.join(folder,'entry.json'),JSON.stringify({id:path.basename(folder),name:label,category,duration:clip.duration,kind:'motion',source:clip.source,local:true}));
console.log(JSON.stringify({seconds:(Date.now()-start)/1000,frames:frames.length,category}));
