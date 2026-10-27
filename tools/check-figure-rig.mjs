import assert from 'node:assert/strict';

export function checkFigureRig(T,api,joints,model){
 const {defaultPerson,mannequin,movementModel,applyMovementPose,setFigureModel,seedFigure}=api;
 const p=defaultPerson(model),figure=mannequin(p,0),rig=figure.userData.motionRig;
 const height=new T.Box3().setFromObject(rig.model,true).getSize(new T.Vector3()).y;
 const motionHeight=new T.Box3().setFromObject(movementModel(p),true).getSize(new T.Vector3()).y;
 assert.ok(Math.abs(height-p.height/100)<.001,`${model}: rendered standing height is ${p.height} cm, got ${height*100}`);
 assert.ok(Math.abs(motionHeight-p.height/100)<.001,`${model}: movement uses the same real-world height`);
 const other=mannequin(p,1),otherPose=Object.fromEntries(Object.entries(other.userData.motionRig.bones).map(([name,b])=>[name,b.quaternion.clone()])),pos=b=>b.getWorldPosition(new T.Vector3());
 const vertices=(object,boneName)=>{
  object.updateMatrixWorld(true);const result=[];
  object.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();
   const index=m.skeleton.bones.findIndex(b=>b.name==='mixamorig'+boneName),a=m.geometry.attributes;
   for(let v=0;v<a.position.count;v++){
    let weight=0;for(let k=0;k<4;k++)if(a.skinIndex.getComponent(v,k)===index)weight+=a.skinWeight.getComponent(v,k);
    if(weight>.25)result.push(m.getVertexPosition(v,new T.Vector3()).applyMatrix4(m.matrixWorld));
   }
  });return result;
 };
 if(model!=='mixamo'){
  assert.equal(Object.keys(rig.bones).length,62);
  assert.equal(rig.fingers.length,30,'All ten fingers have three controllable joints');
  const bind=movementModel(p),bones={};bind.traverse(o=>{if(o.isBone)bones[o.name.replace('mixamorig','')]=o;});
  for(const side of ['Left','Right']){
   const arm=pos(bones[side+'Arm']),hand=pos(bones[side+'Hand']);
   assert.ok(Math.abs(arm.y-hand.y)<.001&&Math.abs(arm.z-hand.z)<.001,'Canonical T bind pose');
   for(const finger of ['Thumb','Index','Middle','Ring','Pinky'])assert.ok(bones[side+'Hand'+finger+'4']);
  }
 }
 for(const [part,name]of Object.entries(joints.jointBones)){
  const angle=part.includes('Elbow')?-60:part.includes('Knee')?60:25;
  const before=vertices(figure,name);assert.ok(before.length,`${model}: weighted geometry for ${part}`);
  const q=joints.jointQuaternion(rig,part,[angle,0,0]);p.joints={[part]:q.toArray()};applyMovementPose(figure,p);
  assert.ok(rig.bones[name].quaternion.angleTo(q)<1e-6,`${part}: requested joint rotation`);
  assert.ok(other.userData.motionRig.bones[name].quaternion.clone().normalize().angleTo(otherPose[name].normalize())<1e-6,'Clones have independent bones');
  const after=vertices(figure,name);
  assert.ok(after.some((v,i)=>v.distanceTo(before[i])>.005),`${model}: ${part} deforms its mesh`);
  assert.ok(after.every(v=>v.toArray().every(Number.isFinite)&&v.length()<3),'No exploded skin');
  delete p.joints;applyMovementPose(figure,p);
 }
 for(const side of ['Left','Right']){
  const keys=['Thumb','Index','Middle','Ring','Pinky'];
  const before=keys.map(f=>pos(rig.bones[side+'Hand'+f+'3']));
  p.handMode='manual';p.hands={[side.toLowerCase()]:100};applyMovementPose(figure,p);
  keys.forEach((f,i)=>assert.ok(pos(rig.bones[side+'Hand'+f+'3']).distanceTo(before[i])>.01,`${model}: ${side} ${f} curl`));
  delete p.hands;delete p.handMode;applyMovementPose(figure,p);
 }
 const original={scene:{asset:'empty',people:[{...p,hands:{left:42}}]}};
 assert.deepEqual(seedFigure(structuredClone(original)),original,'New cuts preserve inherited model and pose');
 const initial=seedFigure({scene:{asset:'empty',people:[]}}).scene.people;
 assert.equal(initial.length,1);assert.equal(initial[0].model,'bodychan');assert.equal(initial[0].height,165);
 p.x=2;p.height=168;p.motionPose={kind:'pose-lab'};p.joints={head:[0,0,0,1]};
 assert.equal(setFigureModel(p,model==='bodychan'?'bodykun':'bodychan'),true);
 assert.equal(p.x,2);assert.equal(p.height,model==='bodychan'?180:165);assert.equal(p.pose,'stand');assert.equal(p.motionPose,undefined);assert.equal(p.joints,undefined);
 console.log(`PASS: ${model} bind pose, independent skin, 15 joint controls, fingers, model switching and inherited cuts`);
}
