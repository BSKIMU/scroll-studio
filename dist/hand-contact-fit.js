import * as T from 'three';
import {validHand} from './hand-library-data.js';

// A temporary, hand-local surface tree. Built on demand, never in the render loop.
export function handContactSurface(root, hand){
 root.updateWorldMatrix(true,true);hand.updateWorldMatrix(true,false);
 const inverse=hand.matrixWorld.clone().invert(),triangles=[];
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.visible||mesh.userData.contiEdge)return;
  const p=mesh.geometry?.attributes.position,index=mesh.geometry?.index;if(!p)return;
  const matrix=inverse.clone().multiply(mesh.matrixWorld),count=index?index.count:p.count;
  for(let i=0;i+2<count;i+=3){
   const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(matrix));
   const triangle=new T.Triangle(...v);if(triangle.getArea()<1e-12)continue;
   triangles.push({triangle,mesh:mesh.uuid,box:new T.Box3().setFromPoints(v),center:triangle.getMidpoint(new T.Vector3())});
   if(triangles.length>100000)throw Error('이 소품은 너무 복잡합니다. 경량 소품으로 손을 맞춰주세요.');
  }
 });
 if(!triangles.length)throw Error('손을 맞출 소품 표면을 찾지 못했습니다.');
 const build=items=>{
  const box=new T.Box3();for(const item of items)box.union(item.box);
  if(items.length<=12)return {box,items};
  const size=box.getSize(new T.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
  items.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=items.length>>1;
  return {box,left:build(items.slice(0,mid)),right:build(items.slice(mid))};
 };
 const tree=build(triangles),closest=new T.Vector3();
 // Parity per mesh treats overlapping closed pieces as a union, irrespective
 // of winding. Deduplicate shared-edge hits before counting intersections.
 const inside=point=>{
  let votes=0;
  for(const direction of [new T.Vector3(1,.371,.173),new T.Vector3(.219,1,.431),new T.Vector3(.317,.137,1)]){
   const ray=new T.Ray(point,direction.normalize()),hits=new Map(),target=new T.Vector3();
   const visit=node=>{if(!ray.intersectsBox(node.box))return;if(node.items){for(const {triangle,mesh}of node.items){if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,target)){const d=target.distanceTo(point);if(d>1e-8){if(!hits.has(mesh))hits.set(mesh,[]);hits.get(mesh).push(d);}}}return;}visit(node.left);visit(node.right);};visit(tree);
   if([...hits.values()].some(ds=>{ds.sort((a,b)=>a-b);return ds.filter((d,i)=>!i||d-ds[i-1]>1e-7).length%2;}))votes++;
  }return votes>=2;
 };
 const pointDistance=point=>{
  let best=Infinity;
  const visit=node=>{
   if(node.box.distanceToPoint(point)>best)return;
   if(node.items){for(const item of node.items){item.triangle.closestPointToPoint(point,closest);best=Math.min(best,closest.distanceTo(point));}return;}
   const a=node.left.box.distanceToPoint(point),b=node.right.box.distanceToPoint(point);
   if(a<b){visit(node.left);visit(node.right);}else{visit(node.right);visit(node.left);}
  };visit(tree);return best;
 };
 const segmentDistance=(a,b)=>{
  let best=Math.min(pointDistance(a),pointDistance(b));
  const delta=b.clone().sub(a),length=delta.length();if(length<1e-10)return best;
  const ray=new T.Ray(a,delta.divideScalar(length)),hit=new T.Vector3(),mid=a.clone().lerp(b,.5);
  const visit=node=>{
   if(node.box.distanceToPoint(mid)>length/2+best)return;
   if(node.items){for(const {triangle:t}of node.items){
    if(ray.intersectTriangle(t.a,t.b,t.c,false,hit)&&hit.distanceTo(a)<=length){best=0;return;}
    for(const [c,d]of [[t.a,t.b],[t.b,t.c],[t.c,t.a]])best=Math.min(best,segmentGap(a,b,c,d));
   }return;}visit(node.left);visit(node.right);
  };visit(tree);return best;
 };
 const touchesTriangle=(a,b,c,margin=0)=>{
  const t=new T.Triangle(a,b,c),box=new T.Box3().setFromPoints([a,b,c]).expandByScalar(margin+1e-8),point=new T.Vector3();
  const edges=q=>[[q.a,q.b],[q.b,q.c],[q.c,q.a]];
  const crosses=(p,q,tri)=>{const direction=q.clone().sub(p),length=direction.length();if(length<1e-12)return false;return !!new T.Ray(p,direction.divideScalar(length)).intersectTriangle(tri.a,tri.b,tri.c,false,point)&&point.distanceTo(p)<=length+1e-8;};
  const visit=node=>{
   if(!node.box.intersectsBox(box))return false;
   if(!node.items)return visit(node.left)||visit(node.right);
   for(const {triangle:s,box:surfaceBox}of node.items){
    if(!surfaceBox.intersectsBox(box))continue;
    // Test both directions: a tiny prop can pierce the middle of a large skin
    // triangle without crossing any of that skin triangle's edges.
    if(edges(t).some(([p,q])=>crosses(p,q,s))||edges(s).some(([p,q])=>crosses(p,q,t)))return true;
    for(const p of [a,b,c])if(s.closestPointToPoint(p,point).distanceTo(p)<margin+1e-8)return true;
    for(const p of [s.a,s.b,s.c])if(t.closestPointToPoint(p,point).distanceTo(p)<margin+1e-8)return true;
    for(const [p,q]of edges(t))for(const [u,v]of edges(s))if(segmentGap(p,q,u,v)<margin+1e-8)return true;
   }return false;
  };return visit(tree);
 };
 return {box:tree.box,distance:pointDistance,inside,touchesTriangle,capsule(a,b,radius){const distance=segmentDistance(a,b),buried=inside(a.clone().lerp(b,.5));return {distance,penetration:buried?radius+distance:Math.max(0,radius-distance)};}};
}

// Use the rendered, skinned vertices (including morphs), not a guessed bone
// radius. Keep every triangle influenced by the wrist/fingers, including seams.
export function handSkinContact(figure,hand,query){
 const inverse=hand.matrixWorld.clone().invert(),surfaces=[];
 const descendants=new Set();hand.traverse(b=>{if(b.isBone)descendants.add(b);});
 figure.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!mesh.visible||mesh.userData.contiEdge)return;
  const {position,skinIndex,skinWeight}=mesh.geometry.attributes;if(!position||!skinIndex||!skinWeight)return;
  const tags=Array.from({length:position.count},(_,i)=>{
   const bones=[];for(let k=0;k<skinIndex.itemSize;k++)if(skinWeight.getComponent(i,k)>1e-6){const bone=mesh.skeleton.bones[skinIndex.getComponent(i,k)];if(descendants.has(bone))bones.push(bone);}return bones;
  });
  const index=mesh.geometry.index,count=index?index.count:position.count,triangles=[];
  for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(ids.some(id=>tags[id].length))triangles.push(ids);}
  if(triangles.length)surfaces.push({mesh,tags,triangles});
 });
 if(!surfaces.length)throw Error('실제 손 메시를 찾지 못해 관통 검사를 수행할 수 없습니다.');
 return (parts=null,gap=0)=>{
  const selected=parts?new Set(parts.flatMap(f=>{const bones=[];f.bone.traverse(b=>bones.push(b));return bones;})):null;
  const bounds=query.box.clone().expandByScalar(gap+1e-8);
  for(const {mesh,tags,triangles}of surfaces){
   const matrix=inverse.clone().multiply(mesh.matrixWorld),points=new Map();
   const vertex=id=>{if(!points.has(id))points.set(id,mesh.getVertexPosition(id,new T.Vector3()).applyMatrix4(matrix));return points.get(id);};
   for(const ids of triangles){
    if(selected&&!ids.some(id=>tags[id].some(b=>selected.has(b))))continue;
    const [a,b,c]=ids.map(vertex),box=new T.Box3().setFromPoints([a,b,c]);if(!bounds.intersectsBox(box))continue;
    if(query.touchesTriangle(a,b,c,gap))return true;
   }
   // Edge crossings do not catch a hand surface wholly inside a closed prop.
   for(const point of points.values())if(query.box.containsPoint(point)&&query.inside(point))return true;
  }return false;
 };
}

function segmentGap(a,b,c,d){
 const u=b.clone().sub(a),v=d.clone().sub(c),w=a.clone().sub(c),aa=u.dot(u),bb=u.dot(v),cc=v.dot(v),dd=u.dot(w),ee=v.dot(w),den=aa*cc-bb*bb;
 let s=den>1e-20?T.MathUtils.clamp((bb*ee-cc*dd)/den,0,1):0;
 let t=cc>1e-20?(bb*s+ee)/cc:0;
 if(t<0){t=0;s=aa>1e-20?T.MathUtils.clamp(-dd/aa,0,1):0;}
 else if(t>1){t=1;s=aa>1e-20?T.MathUtils.clamp((bb-dd)/aa,0,1):0;}
 else if(cc<=1e-20)s=aa>1e-20?T.MathUtils.clamp(-dd/aa,0,1):0;
 return a.clone().addScaledVector(u,s).distanceTo(c.clone().addScaledVector(v,t));
}

export function captureHand(figure,side){
 const joints={};for(const f of figure.userData.motionRig?.fingers||[])if(f.side===side){
  joints[f.finger+f.segment]=f.basis.clone().invert().multiply(f.rest.clone().invert()).multiply(f.bone.quaternion).multiply(f.basis).normalize().toArray();
 }return joints;
}

const blocked=message=>Object.assign(new Error(message),{code:'HAND_CONTACT'});

// Try the existing anchor first. Only a failed surface test permits a bounded
// handle correction; the caller supplies the normal attachment transform.
// Never leave preview mutations behind, even on cancellation or failure.
export async function fitHandWithPlacement(figure,root,side,candidates,options,placement){
 const base=placement.offset||[0,0,0],offsets=[base.slice()];
 if(options.strength>0&&placement.adjust!==false)for(const distance of [.01,.02,.03,.04,.05])for(const sign of [side==='right'?-1:1,side==='right'?1:-1]){
  offsets.push([base[0]+distance*sign,base[1],base[2]]);
 }
 let failure;
 try{
  for(const offset of offsets){
   await placement.yield?.();placement.check?.();placement.place(offset);figure.updateMatrixWorld(true);
   try{return {...fitHandToProp(figure,root,side,candidates,options),offset};}
   catch(error){if(error.code!=='HAND_CONTACT')throw error;failure=error;placement.place(base);}
  }
  throw failure;
 }finally{placement.place(base);figure.updateMatrixWorld(true);}
}

// Keep each finger's three MANO rotations together. This avoids independently
// optimizing individual joints into impossible bend/twist combinations.
export function fitHandToProp(figure,root,side,candidates,{gap=.001,strength=1}={}){
 if(!['left','right'].includes(side)||!Array.isArray(candidates)||!candidates.length||!candidates.every(validHand))throw Error('MANO 손 후보 데이터가 올바르지 않습니다.');
 if(!Number.isFinite(gap)||!Number.isFinite(strength))throw Error('맞춤 설정은 유효한 숫자여야 합니다.');
 gap=T.MathUtils.clamp(gap,0,.012);strength=T.MathUtils.clamp(strength,0,1);
 const rig=figure.userData.motionRig,prefix=side==='left'?'Left':'Right',hand=rig?.bones[prefix+'Hand'];
 const records=rig?.fingers.filter(f=>f.side===side)||[];
 if(!hand||records.length!==15)throw Error('이 인물은 손가락 관절 15개가 필요합니다.');
 const original=new Map(records.map(f=>[f.bone,f.bone.quaternion.clone()]));
 const query=handContactSurface(root,hand),inverse=hand.matrixWorld.clone().invert(),skinContact=handSkinContact(figure,hand,query);
 const scale=hand.getWorldScale(new T.Vector3()),unit=(Math.abs(scale.x)+Math.abs(scale.y)+Math.abs(scale.z))/3;
 const localGap=(gap+.005)/unit; // skin thickness around the finger bones
 const set=(parts,pose,amount=strength)=>{for(const f of parts){const q=f.rest.clone().multiply(f.basis).multiply(new T.Quaternion().fromArray(pose[f.finger+f.segment])).multiply(f.basis.clone().invert());f.bone.quaternion.copy(original.get(f.bone)).slerp(q,amount);}hand.updateWorldMatrix(true,true);};
 const score=parts=>{
  let sum=0,distance=0,n=0,penetration=0;
  for(const f of parts){
   const next=rig.bones[prefix+'Hand'+f.finger+(f.segment+1)];if(!next)throw Error('손끝 뼈가 없어 관통 여부를 검사할 수 없습니다.');
   const a=f.bone.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
   const b=next.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
   const collision=query.capsule(a,b,(.004+gap)/unit);penetration=Math.max(penetration,collision.penetration*unit);
   for(const t of [.5,1]){const p=a.clone().lerp(b,t),d=query.distance(p),error=d-localGap;
    sum+=error*error;distance+=d*unit;n++;
   }
   // Discourage large jumps away from an already authored grip.
   sum+=.000009/(unit*unit)*f.bone.quaternion.angleTo(original.get(f.bone))**2;
  }return {cost:sum,distance:distance/Math.max(n,1),penetration};
 };
 try{
  const before=score(records);if(before.distance>.12)throw Error('손이 소품에서 너무 멉니다. 소품을 손에 연결한 뒤 맞춰주세요.');
  for(const finger of ['Thumb','Index','Middle','Ring','Pinky']){
   const parts=records.filter(f=>f.finger===finger);let chosen=null;const options=[];
   const initial=score(parts);options.push({cost:initial.cost,original:true});
   const open=Object.fromEntries(records.map(f=>[f.finger+f.segment,[0,0,0,1]]));
   for(const amount of strength>0&&strength<1?[strength,1]:[strength]){
    for(const pose of [...candidates,open]){set(parts,pose,amount);options.push({pose,amount,cost:score(parts).cost});}
   }
   options.sort((a,b)=>a.cost-b.cost);
   for(const option of options){
    if(option.original){for(const f of parts)f.bone.quaternion.copy(original.get(f.bone));hand.updateWorldMatrix(true,true);}else set(parts,option.pose,option.amount);
    if(!skinContact(parts,gap/unit)){chosen=option;break;}
   }
   if(!chosen)throw blocked('관통 없는 손 자세를 찾지 못해 적용하지 않았습니다. 실제 손 표면과 소품이 겹칩니다. 손목·소품 위치를 조정하세요.');
   hand.updateWorldMatrix(true,true);
  }
  const after=score(records),joints=captureHand(figure,side);
  if(!validHand(joints)||!Number.isFinite(after.cost))throw Error('손 맞춤 결과를 계산하지 못했습니다.');
  if(skinContact(null,gap/unit))throw blocked('관통 없는 손 자세를 찾지 못해 적용하지 않았습니다. 손바닥·손목 표면이 소품과 겹칩니다. 손목·소품 위치를 조정하세요.');
  return {joints,before:before.distance,after:after.distance,penetration:0,improved:records.some(f=>f.bone.quaternion.angleTo(original.get(f.bone))>1e-7)};
 }finally{for(const [bone,q]of original)bone.quaternion.copy(q);hand.updateWorldMatrix(true,true);}
}
