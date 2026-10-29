import * as T from 'three';

export function supportMode(item){
 const text=[item.name,item.clip?.label,item.id].join(' ');
 if(/stairs?|계단/i.test(text))return 'feet';
 if(/\blie\b|lying|laying|누워|눕|호흡/i.test(text))return 'body';
 return null;
}

// Keep extrema per skin joint, not the entire (sometimes 100k-vertex) body.
// These samples include the back/head for reclining poses and soles for stairs.
export class PoseSupport{
 constructor(rig){
  this.rig=rig;this.samples=[];this.point=new T.Vector3();
  const directions=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)directions.push(new T.Vector3(x,y,z).normalize());
  rig.object.traverse(mesh=>{
   if(!mesh.isSkinnedMesh)return;
   const {position,skinIndex,skinWeight}=mesh.geometry.attributes,groups=new Map();
   for(let i=0;i<position.count;i++){
    let joint=0,weight=-1;for(let k=0;k<4;k++)if(skinWeight.getComponent(i,k)>weight){weight=skinWeight.getComponent(i,k);joint=skinIndex.getComponent(i,k);}
    let group=groups.get(joint);if(!group){group=directions.map(()=>({index:0,value:-Infinity}));groups.set(joint,group);}
    this.point.fromBufferAttribute(position,i);
    directions.forEach((d,k)=>{const value=this.point.dot(d);if(value>group[k].value)group[k]={index:i,value};});
   }
   for(const [joint,extrema]of groups){const foot=/Foot|Toe/i.test(mesh.skeleton.bones[joint]?.name||'');for(const index of new Set(extrema.map(e=>e.index)))this.samples.push({mesh,index,foot});}
  });
 }
 bottom(mode){
  let bottom=Infinity;
  for(const {mesh,index,foot}of this.samples){if(mode==='feet'&&!foot)continue;bottom=Math.min(bottom,mesh.getVertexPosition(index,this.point).applyMatrix4(mesh.matrixWorld).y);}
  return bottom;
 }
 apply(mode,floor,weight=1){
  if(!mode||!weight)return;
  const bottom=this.bottom(mode);if(!Number.isFinite(bottom))return;
  const rig=this.rig,hip=rig.pelvis.getWorldPosition(this.point);hip.y+=(floor-bottom)*weight;
  rig.pelvis.position.copy(rig.pelvis.parent.worldToLocal(hip));rig.root.updateMatrixWorld(true);
 }
}
