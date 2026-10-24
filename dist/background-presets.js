// Local catalog survives new projects; model bytes enter the project only when used.
export function localBackgroundPresets(getProject,onAdded,toDataURL){
 // Classroom is CC BY; the user authorized public Tea Time distribution on 2026-10-20.
 const bundled={'local-tea-time':{id:'local-tea-time',name:'Tea Time · 티 타임',meshes:161,scale:1,version:2,url:'./assets/tea-time.glb'},'local-korean-classroom':{id:'local-korean-classroom',name:'한국 교실 · 미닫이문 / 의자',meshes:179,url:'./assets/korean-classroom.glb',attribution:{title:'Classroom',author:'Pino_156 (titi_156)',url:'https://sketchfab.com/3d-models/classroom-d4553cc2008242849214e4cbf8ad8551',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',changes:'한국 교실 재구성, 의자 간소화, 미닫이문·좌석 메타데이터 추가'}}};
 let presets={...bundled};
 const pending=new WeakMap();
 return {
  async load(){
   if(!['127.0.0.1','localhost'].includes(location.hostname))return;
   try{
    const response=await fetch('/api/background-presets',{signal:AbortSignal.timeout(3000)});
    if(!response.ok)return;
    const rows=await response.json();
    if(!Array.isArray(rows))return;
    presets={...Object.fromEntries(rows.filter(p=>/^local-[a-z0-9-]+$/.test(p.id)&&typeof p.name==='string'&&/^\/api\/background-presets\/[a-z0-9-]+\.glb$/.test(p.url)).map(p=>[p.id,p])),...bundled};
   }catch{/* Static preview servers simply have no local catalog. */}
  },
  assets(){return {...presets,...getProject().assets};},
  async resolve(id){
   const project=getProject(),preset=presets[id];
   if(project.assets[id]||!preset)return;
   let requests=pending.get(project);if(!requests){requests=new Map();pending.set(project,requests);}
   if(!requests.has(id))requests.set(id,(async()=>{
    const response=await fetch(preset.url);
    if(!response.ok)throw Error('로컬 배경 파일을 찾지 못했습니다.');
    const bytes=await response.arrayBuffer(),header=new DataView(bytes);
    if(bytes.byteLength<12||header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||header.getUint32(8,true)!==bytes.byteLength)throw Error('올바른 GLB 배경이 아닙니다.');
    const data=await toDataURL(new Blob([bytes],{type:'model/gltf-binary'}));
    if(project!==getProject())throw Error('프로젝트가 바뀌어 배경 불러오기를 중단했습니다.');
    project.assets[id]={id,name:preset.name,data,sourceType:'glb',presetVersion:preset.version||1,meshes:preset.meshes,scale:preset.scale||undefined,attribution:preset.attribution||null};
    onAdded();
   })().finally(()=>requests.delete(id)));
   return requests.get(id);
  }
 };
}
