import * as T from 'three';

// Source assets stay untouched. The runtime copy is centred on its real handle,
// not the shield's boss or the sword's bounding box.
export function normalizeMeleeProp(source,id,side='left'){
 if(!['shield','long-sword'].includes(id))return source;
 const root=new T.Group();root.add(source);
 if(id==='long-sword'){
  source.scale.z*=.4;source.position.y-=.065;
 }else{
  source.updateMatrixWorld(true);
  source.traverse(mesh=>{
   if(!mesh.isMesh)return;
   mesh.geometry=mesh.geometry.clone();mesh.userData.sharedGeometry=false;const points=mesh.geometry.attributes.position,p=new T.Vector3();
   const box=new T.Box3().setFromObject(mesh),size=box.getSize(new T.Vector3()),index=mesh.geometry.index,kept=[];
   // Remove the original shallow handle loop, not the board or its rim.
   const loop=size.x<.06&&size.y>.16&&box.max.z<.005;
   for(let i=0;i<(index?.count??points.count);i+=3){
    const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),centre=new T.Vector3();
    for(const id of ids)centre.add(p.fromBufferAttribute(points,id).applyMatrix4(mesh.matrixWorld));centre.divideScalar(3);
    if(!loop&&!(Math.abs(centre.x)<.19&&Math.abs(centre.y)<.16&&centre.z<-.014))kept.push(...ids);
   }
   mesh.geometry.setIndex(kept);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
  });
  source.scale.setScalar(.9);
  const grip=new T.Vector3(side==='left'?-.130:.143,.007,-.095).multiplyScalar(.9);
  source.position.sub(grip);root.userData.shieldPlateZ=.095*.9;
  const leather=new T.MeshStandardMaterial({color:0x47382c,roughness:.92}),metal=new T.MeshStandardMaterial({color:0x62646a,roughness:.65});
  const handle=new T.Mesh(new T.CylinderGeometry(.011,.011,.09,10),leather);handle.name='Shield palm grip';root.add(handle);
  for(const y of [-.047,.047]){const mount=new T.Mesh(new T.BoxGeometry(.018,.018,.066),metal);mount.position.set(0,y,.033);root.add(mount);}
  const strap=new T.Mesh(new T.BufferGeometry(),leather);strap.name='Shield fitted forearm strap';root.add(strap);
 }
 root.updateMatrixWorld(true);return root;
}

// Keep the board outside the forearm, rotating about the held handle. This
// preserves the palm contact and does not bend or stretch the character's arm.
export function alignShieldForearm(root,figure,side,settings={}){
 if(root.userData.shieldPlateZ===undefined||settings.rotation?.some(v=>v!==0))return;
 const bones=figure.userData.motionRig?.bones,prefix=side==='left'?'Left':'Right';
 if(!bones?.[prefix+'ForeArm'])return;
 const rotation=root.getWorldQuaternion(new T.Quaternion()),position=root.getWorldPosition(new T.Vector3());
 const axis=new T.Vector3(0,1,0).applyQuaternion(rotation),normal=new T.Vector3(0,0,1).applyQuaternion(rotation);
 const arm=bones[prefix+'ForeArm'].getWorldPosition(new T.Vector3()).sub(position);
 arm.addScaledVector(axis,-arm.dot(axis));if(arm.lengthSq()<1e-8)return;
 const outer=arm.cross(axis).normalize();if(outer.dot(normal)<0)outer.negate();
 const angle=Math.atan2(normal.clone().cross(outer).dot(axis),normal.dot(outer));
 const adjusted=new T.Quaternion().setFromAxisAngle(axis,angle).multiply(rotation).normalize();
 root.quaternion.copy(figure.getWorldQuaternion(new T.Quaternion()).invert().multiply(adjusted));root.updateMatrixWorld(true);
 const strap=root.getObjectByName('Shield fitted forearm strap');if(!strap)return;
 const wrist=root.worldToLocal(bones[prefix+'Hand'].getWorldPosition(new T.Vector3())),elbow=root.worldToLocal(bones[prefix+'ForeArm'].getWorldPosition(new T.Vector3())),centre=wrist.clone().lerp(elbow,.48),along=elbow.clone().sub(wrist).setZ(0).normalize(),across=new T.Vector3(-along.y,along.x,0),points=[];
 const stamp=centre.toArray().concat(across.toArray());if(strap.userData.fit?.every((v,i)=>Math.abs(v-stamp[i])<.0005))return;
 // A compact arch around the arm, with both ends on the shield's rear face.
 for(let i=0;i<=8;i++){const angle=i*Math.PI/8;points.push(centre.clone().addScaledVector(across,Math.cos(angle)*.055).setZ(T.MathUtils.lerp(root.userData.shieldPlateZ-.018,centre.z-.048,Math.sin(angle))));}
 const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.007,6,false);strap.geometry.dispose();strap.geometry=geometry;strap.userData.fit=stamp;
}
