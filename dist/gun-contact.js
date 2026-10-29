import * as T from 'three';
import {movementModel} from './mannequin.js?v=20261029-hands2';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),profiles=new Map(),samples=new WeakMap();
const torsoNames=new Set(['Hips','Spine','Spine1','Spine2']);
// Fit small collision proxies once to each body's actual torso vertices. Their
// centres follow the existing bones; no mesh, skin weight or bone length changes.
function profile(person){
 const key=JSON.stringify([person.model,person.height,person.scale]);if(profiles.has(key))return profiles.get(key);
 const model=movementModel(person),bones={},bounds={};model.updateMatrixWorld(true);model.traverse(b=>{if(b.isBone)bones[b.name.replace(/^mixamorig[:_]?/i,'')]=b;});
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const {skinIndex,skinWeight,position}=mesh.geometry.attributes;
  for(let i=0;i<position.count;i++){let dominant=0;for(let j=1;j<4;j++)if(skinWeight.getComponent(i,j)>skinWeight.getComponent(i,dominant))dominant=j;
   const name=mesh.skeleton.bones[skinIndex.getComponent(i,dominant)].name.replace(/^mixamorig[:_]?/i,'');if(!torsoNames.has(name))continue;
   (bounds[name]??=new T.Box3()).expandByPoint(mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld));
  }
 });
 const data={rest:Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,b.getWorldQuaternion(Q())])),volumes:[]};
 for(const [name,box]of Object.entries(bounds)){const bone=bones[name],centre=box.getCenter(V()).sub(bone.getWorldPosition(V())),radius=box.getSize(V()).multiplyScalar(.52);radius.y=Math.max(radius.y,.045*person.height/175);data.volumes.push({name,centre,radius});}
 profiles.set(key,data);return data;
}
export function gunBody(figure,person){
 const data=profile(person),bones=figure.userData.motionRig.bones;
 const volumes=data.volumes.map(v=>{const q=bones[v.name].getWorldQuaternion(Q()).multiply(data.rest[v.name].clone().invert());return {centre:v.centre.clone().applyQuaternion(q).add(bones[v.name].getWorldPosition(V())),inverse:q.clone().invert(),radius:v.radius};});
 const q=bones.Spine2.getWorldQuaternion(Q()).multiply(data.rest.Spine2.clone().invert());
 return {volumes,q,origin:bones.Spine2.getWorldPosition(V()),scale:person.height/175};
}
export function bodyDistance(point,body,padding=0){
 let distance=Infinity;
 for(const v of body.volumes){const radius=v.radius.clone().addScalar(padding),local=point.clone().sub(v.centre).applyQuaternion(v.inverse),n=local.clone().divide(radius).length();distance=Math.min(distance,(n-1)*Math.min(radius.x,radius.y,radius.z));}
 return distance;
}
function gunSamples(root){
 if(samples.has(root))return samples.get(root);
 const points=[],inverse=root.matrixWorld.clone().invert(),box=new T.Box3();root.traverse(o=>{if(o.isMesh&&!o.userData.poseMarker){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));}});
 if(box.isEmpty())box.set(new T.Vector3(-.035,-.06,-.24),new T.Vector3(.035,.08,.6));
 // Include the stock and barrel interior as well as their outside surfaces.
 for(let i=0;i<=16;i++){const z=T.MathUtils.lerp(box.min.z,box.max.z,i/16);for(const x of [box.min.x,0,box.max.x])for(const y of [box.min.y,0,box.max.y])points.push(new T.Vector3(x,y,z));}
 samples.set(root,points);return points;
}
export function gunClearance(root,body,position=root.getWorldPosition(V()),quaternion=root.getWorldQuaternion(Q())){
 const scale=root.getWorldScale(V());let distance=Infinity;
 for(const p of gunSamples(root))distance=Math.min(distance,bodyDistance(p.clone().multiply(scale).applyQuaternion(quaternion).add(position),body,.018*body.scale));
 return distance;
}
