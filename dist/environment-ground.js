import * as T from 'three';
import {setupBackgroundLock} from './scene-background-lock.js?v=20261030-physics60';

// Prefer a broad horizontal surface, not the lowest vertex of a backdrop/wall.
// New imports opt into this detection; existing assets retain their saved alignment.
export function findGroundSurface(group){
 group.updateWorldMatrix(true,true);
 const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3());
 if(bounds.isEmpty())return null;
 const footprint=size.x*size.z;if(footprint<.001)return null;
 const bins=new Map(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),cross=new T.Vector3();
 group.traverseVisible(mesh=>{
  const pos=mesh.geometry?.attributes.position;if(!mesh.isMesh||!pos)return;
  const index=mesh.geometry.index,count=index?.count||pos.count,normalSign=mesh.matrixWorld.determinant()<0?-1:1;
  for(let i=0;i+2<count;i+=3){
   a.fromBufferAttribute(pos,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);
   b.fromBufferAttribute(pos,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
   c.fromBufferAttribute(pos,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
   cross.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a));const area=Math.abs(cross.y)*.5,y=(a.y+b.y+c.y)/3;
   if(area<1e-8||Math.abs(cross.y)<cross.length()*.995||Math.max(a.y,b.y,c.y)-Math.min(a.y,b.y,c.y)>.01||y>bounds.min.y+size.y*.45)continue;
   const key=Math.round(y/.002),bin=bins.get(key)||{area:0,upArea:0,weighted:0};bin.area+=area;if(cross.y*normalSign>0)bin.upArea+=area;bin.weighted+=y*area;bins.set(key,bin);
  }
 });
 const broad=[...bins.values()].filter(v=>v.area>=footprint*.2),up=broad.filter(v=>v.upArea>=footprint*.2);
 const surfaces=(up.length?up:broad).sort((a,b)=>b.area-a.area);
 return surfaces.length?surfaces[0].weighted/surfaces[0].area:null;
}

export const presetGroundHeight=asset=>asset==='local-test-light'?-.669203262944:0;
export function environmentHeight(state){const value=state.environmentPlacement?.[state.asset]?.z;return Number.isFinite(value)?T.MathUtils.clamp(value,-1000,1000):presetGroundHeight(state.asset);}

export function setupEnvironmentGround(editor){
 const panel=document.querySelector('.scene-property-group[data-group="0"]'),box=document.createElement('div');box.className='environment-ground';
 box.innerHTML='<label>배경 높이 Z · m<input id="environmentHeight" aria-label="배경 높이 Z" type="number" min="-1000" max="1000" step="0.01" value="0"></label><div class="two"><button type="button" id="groundEnvironment">바닥을 Z=0에 맞춤</button><button type="button" id="resetEnvironmentHeight">높이 초기화</button></div><p role="status" id="environmentGroundStatus">새 배경은 바닥을 Z=0에 자동으로 맞춥니다. 높이를 직접 조절할 수도 있습니다.</p>';
 panel.append(box);const lock=setupBackgroundLock(editor,box),input=box.querySelector('input'),status=box.querySelector('[role="status"]');
 function sync(){input.value=String(+environmentHeight(editor.state).toFixed(6));const ground=editor.environment.children.find(o=>o.userData.scrollGround)?.userData.scrollGround;if(ground)status.textContent=environmentHeight(editor.state)!==0?'자동 바닥 기준에 수동 높이를 더했습니다.':ground.mode==='bounds'?'넓은 바닥 면이 없어 모델 최하단을 Z=0에 맞췄습니다.':'배경 바닥을 Z=0에 자동으로 맞췄습니다.';else status.textContent='저장된 배경 높이를 유지합니다. 바닥 맞춤이나 높이 입력으로 조절하세요.';}
 function apply(z){
  if(!Number.isFinite(z))return;
  editor.flush();const state=editor.state;
  state.environmentPlacement||={};state.environmentPlacement[state.asset]={...state.environmentPlacement[state.asset],z:T.MathUtils.clamp(z,-1000,1000)};
  editor.environment.position.y=environmentHeight(state);editor.environment.updateMatrixWorld(true);sync();editor.gizmo?.sync();editor.seats?.sync();editor.advanced?.lightFrame();editor.transformCommit=true;editor.queueLive();editor.apply({live:true});
 }
 input.addEventListener('change',()=>{if(!input.validity.valid||input.value===''){sync();return;}apply(input.valueAsNumber);status.textContent='배경 높이가 현재 컷에 반영됐습니다. 인물 위치와 크기는 유지됩니다.';});
 box.querySelector('#groundEnvironment').onclick=()=>{
  const y=findGroundSurface(editor.environment);
  if(y===null){status.textContent='넓은 바닥 면을 찾지 못했습니다. 배경 높이 Z를 직접 조절하세요.';return;}
  apply(environmentHeight(editor.state)-y);status.textContent='넓은 바닥 면을 Z=0에 맞췄습니다. 다층 건물은 높이를 직접 조절하세요.';
 };
 box.querySelector('#resetEnvironmentHeight').onclick=()=>{apply(presetGroundHeight(editor.state.asset));status.textContent='불러올 때의 배경 높이로 복원했습니다.';};
 return {sync(){lock.sync();sync();}};
}
