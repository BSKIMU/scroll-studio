import * as T from 'three';
import R from './vendor/rapier.mjs';
import {closedMeshVolume} from './mesh-volume.js?v=20261026-navigation3';
import {assignedSeat} from './imported-background.js?v=20261027-selection4';
import {findGroundSurface} from './environment-ground.js?v=20261027-selection4';
let initialized;
export const initCollision=()=>initialized??=R.init();
const inherited=(o,key)=>{for(;o;o=o.parent)if(o.userData[key])return o;return null;};
// Build world-space triangles once when entering movement. All imported/built-in
// visible meshes use the same path, including rotated and scaled furniture.
export class SceneCollision{
 constructor(environment,person){
  this.world=new R.World({x:0,y:-18,z:0});this.world.timestep=1/120;this.environment=environment;this.seats=[];this.platforms=[];this.volumes=[];this.dynamicDoors=[];const assignedSeats=[];
  environment.updateWorldMatrix(true,true);const v=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();
  environment.traverseVisible(mesh=>{const seat=assignedSeat(mesh);if(seat)assignedSeats.push(seat);
   if(mesh.userData.dynamicDoor){const door=mesh.userData.dynamicDoor,g=mesh.geometry?.parameters||{width:door.spec.width,height:door.spec.height,depth:.055},scale=mesh.getWorldScale(new T.Vector3()),collider=this.world.createCollider(R.ColliderDesc.cuboid(g.width*scale.x/2,g.height*scale.y/2,g.depth*scale.z/2));this.dynamicDoors.push({mesh,collider,door});this.syncDoors();return;}
   const pos=mesh.geometry?.attributes.position;if(!mesh.isMesh||!pos||inherited(mesh,'noCollision')||inherited(mesh,'dynamicDoor'))return;const verts=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);verts.set(v.toArray(),i*3);}let indices=mesh.geometry.index?Uint32Array.from(mesh.geometry.index.array):Uint32Array.from({length:pos.count},(_,i)=>i);if(mesh.matrixWorld.determinant()<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];const collider=this.world.createCollider(R.ColliderDesc.trimesh(verts,indices));collider.userData={name:mesh.name,seat:inherited(mesh,'scrollSeat')?.uuid};const box=new T.Box3().setFromObject(mesh);this.platforms.push({mesh,collider,box});const volume=closedMeshVolume(verts,indices,box);if(volume)this.volumes.push(volume);
   if(inherited(mesh,'scrollSeat')||inherited(mesh,'scrollNoSeat'))return;
   const planes=new Map();for(let i=0;i<indices.length;i+=3){a.fromArray(verts,indices[i]*3);b.fromArray(verts,indices[i+1]*3);c.fromArray(verts,indices[i+2]*3);normal.crossVectors(b.clone().sub(a),c.clone().sub(a));const area=Math.abs(normal.y)*.5;if(area<.0001||Math.abs(normal.y)<normal.length()*.92)continue;const y=(a.y+b.y+c.y)/3,key=Math.round(y/.04),p=planes.get(key)||{area:0,box:new T.Box3(),weighted:0};p.area+=area;p.weighted+=area*y;p.box.expandByPoint(a).expandByPoint(b).expandByPoint(c);planes.set(key,p);}
   for(const p of planes.values()){const size=p.box.getSize(v);if(p.area>=.07&&size.x>=.22&&size.z>=.22&&size.x<=5&&size.z<=5)this.seats.push({name:mesh.name||'가구',mesh,box:p.box,y:p.weighted/p.area,collider});}
  });
  // Outside imported floors, the editor grid is the ground plane.
  // An enormous thin cuboid loses contact precision in capsule shape casts.
  // A half-space represents the editor's infinite ground without distant edges.
  this.grid=this.world.createCollider(new R.ColliderDesc(new R.HalfSpace({x:0,y:1,z:0})).setTranslation(0,-.008,0));
  this.height=Math.max(.6,(person.height||175)/100*(person.scale?.[1]||1));this.radius=Math.min(this.height*.18,.23*Math.max(person.scale?.[0]||1,person.scale?.[2]||1));this.half=Math.max(.1,this.height/2-this.radius);
  this.body=this.world.createCollider(R.ColliderDesc.capsule(this.half,this.radius).setTranslation(person.x||0,(person.y||0)+this.half+this.radius,person.z||0));
  this.controller=this.world.createCharacterController(.008);this.controller.setMaxSlopeClimbAngle(Math.PI/4);this.controller.setMinSlopeSlideAngle(Math.PI/3);this.controller.enableAutostep(.20,.18,false);this.controller.enableSnapToGround(.14);this.velocityY=0;this.grounded=false;this.world.step();this.move(new T.Vector3(),1/120);this.seats=this.seats.filter(s=>{const center=s.box.getCenter(new T.Vector3()),samples=[[s.box.min.x-.25,center.z],[s.box.max.x+.25,center.z],[center.x,s.box.min.z-.25],[center.x,s.box.max.z+.25]].map(([x,z])=>this.floor({x,z},s.y-.12)).sort((a,b)=>a-b),ground=samples[1];return s.y-ground>=.26&&s.y-ground<=1.1;});this.seats.push(...assignedSeats);this.findBeds();
 }
 get feet(){const p=this.body.translation();return new T.Vector3(p.x,p.y-this.half-this.radius,p.z);}
 clearAt(feet){let clear=true;const center={x:feet.x,y:feet.y+this.half+this.radius+.025,z:feet.z};this.world.intersectionsWithShape(center,{x:0,y:0,z:0,w:1},this.body.shape,c=>{clear=false;return false;},undefined,undefined,this.body);return clear;}
 safeStandingPoint(preferred=this.feet){const start=preferred.clone();if(this.clearAt(start))return start;for(const radius of [.15,.3,.45,.6,.8,1])for(let i=0;i<16;i++){const p=start.clone().add(new T.Vector3(Math.sin(i*Math.PI/8)*radius,0,Math.cos(i*Math.PI/8)*radius));const floor=this.floor(p,start.y+.22);if(Math.abs(floor-start.y)>.22)continue;p.y=floor+.015;if(this.clearAt(p))return p;}return null;}
 // Entering walking needs support under the feet AND room for a full standing
 // capsule. Snap-to-ground alone cannot escape an imported desk or bookshelf.
 walkingStart(preferred=this.feet){
  const ground=findGroundSurface(this.environment),requireMesh=ground!==null;
  const support=(x,z,level)=>{
   const hit=this.world.castRayAndGetNormal(new R.Ray({x,y:level+.24,z},{x:0,y:-1,z:0}),.5,true,undefined,undefined,this.body,undefined,c=>!requireMesh||c.handle!==this.grid.handle);
   return hit&&hit.normal.y>.7?level+.24-hit.timeOfImpact:null;
  };
  const candidate=(x,z,level)=>{
   const y=support(x,z,level);if(y===null)return null;
   const p=new T.Vector3(x,y+.015,z),center=new T.Vector3(x,y+this.height/2,z);if(!this.clearAt(p)||this.volumes.some(v=>v.contains(center)))return null;
   // A center ray alone accepts ledges/holes too narrow to stand on.
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const edge=support(x+dx*this.radius*.8,z+dz*this.radius*.8,y);
    if(edge===null||Math.abs(edge-y)>.12)return null;
   }
   return p;
  };
  const current=candidate(preferred.x,preferred.z,preferred.y);if(current)return current;
  const bounds=new T.Box3().setFromObject(this.environment),center=preferred.clone();
  if(!bounds.isEmpty()){center.x=T.MathUtils.clamp(center.x,bounds.min.x,bounds.max.x);center.z=T.MathUtils.clamp(center.z,bounds.min.z,bounds.max.z);}
  const levels=[preferred.y];if(Math.abs(preferred.y-(ground??0))>.24)levels.push(ground??0);
  const limit=bounds.isEmpty()?2:Math.min(16,Math.hypot(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)+.5);
  for(const level of levels){
   const atCenter=candidate(center.x,center.z,level);if(atCenter)return atCenter;
   for(let radius=.35;radius<=limit;radius+=.35){
    const count=Math.min(96,Math.max(16,Math.ceil(2*Math.PI*radius/.35)));
    for(let i=0;i<count;i++){
     const angle=i*2*Math.PI/count,x=center.x+Math.sin(angle)*radius,z=center.z+Math.cos(angle)*radius;
     if(requireMesh&&!bounds.containsPoint(new T.Vector3(x,T.MathUtils.clamp(level,bounds.min.y,bounds.max.y),z)))continue;
     const p=candidate(x,z,level);if(p)return p;
    }
   }
  }
  return null;
 }
 setFeet(p){this.body.setTranslation({x:p.x,y:p.y+this.half+this.radius,z:p.z});this.velocityY=0;this.world.step();}
 syncDoors(){for(const {mesh,collider,door}of this.dynamicDoors){collider.setTranslation(door.collisionCenter?door.collisionCenter():mesh.getWorldPosition(new T.Vector3()));collider.setRotation(mesh.getWorldQuaternion(new T.Quaternion()));}}
 doorClear(door){const item=this.dynamicDoors.find(d=>d.door===door);if(!item)return true;this.syncDoors();let clear=true;this.world.intersectionsWithShape(item.collider.translation(),item.collider.rotation(),item.collider.shape,c=>{if(c.handle!==item.collider.handle){clear=false;return false;}return true;},undefined,undefined,item.collider);return clear;}
 visibleContact(point,door){const from=this.feet;from.y+=Math.min(this.height*.7,1.25);const delta=point.clone().sub(from),length=delta.length();const leaf=this.dynamicDoors.find(d=>d.door===door)?.collider;const hit=this.world.castRay(new R.Ray(from,delta.normalize()),length,false,undefined,undefined,this.body,undefined,c=>c!==leaf);return !hit||hit.timeOfImpact>length-.12;}
 floor(p,top){const hit=this.world.castRayAndGetNormal(new R.Ray({x:p.x,y:top,z:p.z},{x:0,y:-1,z:0}),100,true,undefined,undefined,this.body);return hit?top-hit.timeOfImpact:0;}
 jump(){if(!this.grounded)return false;this.velocityY=5.8;this.grounded=false;return true;}
 move(delta,dt){this.velocityY=Math.max(-18,this.velocityY-18*dt);const request={x:delta.x,y:this.velocityY*dt,z:delta.z};this.controller.computeColliderMovement(this.body,request);const d=this.controller.computedMovement(),p=this.body.translation();this.body.setTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});this.grounded=this.controller.computedGrounded();if(this.grounded&&this.velocityY<0||this.velocityY>0&&d.y<request.y-.001)this.velocityY=0;this.world.step();return this.feet;}
 // Large support surfaces are found geometrically, including uneven blankets.
 findBeds(){this.beds=[];for(const p of this.platforms){if(inherited(p.mesh,'scrollSeat')||inherited(p.mesh,'scrollNoSeat'))continue;const size=p.box.getSize(new T.Vector3());if(Math.min(size.x,size.z)<.55||Math.max(size.x,size.z)<1.4||Math.max(size.x,size.z)>3.5||size.y>1.5)continue;
  const center=p.box.getCenter(new T.Vector3()),pos=p.mesh.geometry.attributes.position,points=[];let xx=0,zz=0,xz=0;
  for(let i=0;i<pos.count;i++){const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.mesh.matrixWorld).sub(center);points.push(v);xx+=v.x*v.x;zz+=v.z*v.z;xz+=v.x*v.z;}
  const theta=.5*Math.atan2(2*xz,xx-zz),axis=new T.Vector3(Math.cos(theta),0,Math.sin(theta)),side=new T.Vector3(-axis.z,0,axis.x);let lo=Infinity,hi=-Infinity,lw=Infinity,hw=-Infinity;
  for(const v of points){const d=v.dot(axis),w=v.dot(side);lo=Math.min(lo,d);hi=Math.max(hi,d);lw=Math.min(lw,w);hw=Math.max(hw,w);}const length=hi-lo,width=hw-lw;if(length<1.4||width<.55||width>2.5)continue;
  center.addScaledVector(axis,(lo+hi)/2).addScaledVector(side,(lw+hw)/2);const heights=[];let valid=true;
  for(const t of [-.38,-.2,0,.2,.38]){const at=center.clone().addScaledVector(axis,t*length),hit=this.world.castRayAndGetNormal(new R.Ray({x:at.x,y:p.box.max.y+.65,z:at.z},{x:0,y:-1,z:0}),size.y+.85,true,undefined,undefined,this.body);if(!hit||Math.abs(hit.normal.y)<.55){valid=false;break;}heights.push(p.box.max.y+.65-hit.timeOfImpact);}
  if(!valid||Math.max(...heights)-Math.min(...heights)>.35)continue;
  const y=heights[2],outside=center.clone().addScaledVector(side,width/2+.25),floor=this.floor(outside,Math.min(...heights)-.15);if(y-floor<.26||y-floor>1.1)continue;
  center.y=y;if(axis.z<-.1||Math.abs(axis.z)<=.1&&axis.x<0)axis.negate();const bed={...p,name:'넓은 가구',y,anchor:center,axis,length,width,bed:true};if(!this.beds.some(b=>b.anchor.distanceTo(center)<.45))this.beds.push(bed);
 }}
 seatPathClear(seat){const p=this.feet,delta=seat.anchor.clone().sub(p);delta.y=0;const length=delta.length();if(length<.1)return true;delta.normalize();const side=new T.Vector3(-delta.z,0,delta.x);for(const h of [.3,.68,1.1])for(const offset of [-.14,0,.14]){const from=p.clone().addScaledVector(side,offset);from.y+=h;const hit=this.world.castRay(new R.Ray(from,delta),length,false,undefined,undefined,this.body,undefined,c=>c.userData?.seat!==seat.mesh.uuid);if(hit&&hit.timeOfImpact<length-.08&&!(seat.virtual&&seat.box.clone().expandByScalar(.06).containsPoint(from.clone().addScaledVector(delta,hit.timeOfImpact))))return false;}return true;}
 nearestSeat({point=null,object=null,lying=false}={}){const p=this.feet;let best=null;const candidates=lying?this.beds:[...this.beds,...this.seats];for(const s of candidates){
  if(point&&(point.x<s.box.min.x-.15||point.x>s.box.max.x+.15||point.z<s.box.min.z-.15||point.z>s.box.max.z+.15))continue;
  if(object&&!s.bed&&!(s.virtual&&point)&&s.mesh!==object&&(!s.assigned||inherited(object,'scrollSeat')!==s.mesh))continue;
  if(s.assigned){const distance=Math.hypot(s.anchor.x-p.x,s.anchor.z-p.z);if(distance>1.05||Math.abs(s.y-p.y)>.95||!this.seatPathClear(s))continue;const eye=p.clone();eye.y+=Math.min(this.height*.7,1.25);const end=s.anchor.clone();end.y+=.35;const ray=end.sub(eye),length=ray.length(),hit=this.world.castRay(new R.Ray(eye,ray.normalize()),length,false,undefined,undefined,this.body);if(hit&&hit.timeOfImpact<length-.22&&!(s.virtual&&s.box.clone().expandByScalar(.06).containsPoint(eye.clone().addScaledVector(ray,hit.timeOfImpact))))continue;if(!best||distance<best.distance)best={...s,anchor:s.anchor.clone(),distance,floor:s.virtual?s.floor:this.floor(p,p.y+.1)};continue;}
  const center=s.box.getCenter(new T.Vector3()),dx=p.x-center.x,dz=p.z-center.z,angle=Math.atan2(dx,dz),dir=new T.Vector3(Math.sin(angle),0,Math.cos(angle));const q=s.box.clampPoint(p,new T.Vector3());q.y=s.y;const distance=Math.hypot(q.x-p.x,q.z-p.z);if(distance>1.05||Math.abs(s.y-p.y)>.95)continue;
  const anchor=lying?s.anchor.clone():q.clone().addScaledVector(dir,-.18);anchor.x=T.MathUtils.clamp(anchor.x,s.box.min.x+.08,s.box.max.x-.08);anchor.z=T.MathUtils.clamp(anchor.z,s.box.min.z+.08,s.box.max.z-.08);anchor.y=s.y;
  let hit=null;const initial=anchor.clone();for(const blend of [0,.25,.5,.75,1]){if(lying&&blend>0)break;anchor.lerpVectors(initial,center,blend);hit=this.world.castRayAndGetNormal(new R.Ray({x:anchor.x,y:s.y+.12,z:anchor.z},{x:0,y:-1,z:0}),.4,true,undefined,undefined,this.body);if(hit&&Math.abs(hit.normal.y)>=.55&&(lying||Math.abs(s.y+.12-hit.timeOfImpact-s.y)<.18))break;hit=null;}if(!hit)continue;anchor.y=lying?s.y:s.y+.12-hit.timeOfImpact;
  const eye=p.clone();eye.y=Math.max(p.y+Math.min(this.height*.7,1.25),s.y+.3);const end=anchor.clone();end.y+=.35;const ray=end.clone().sub(eye),length=ray.length();ray.normalize();const obstruction=this.world.castRay(new R.Ray(eye,ray),length,false,undefined,undefined,this.body);if(obstruction&&obstruction.timeOfImpact<length-.15)continue;
  if(!best||distance<best.distance)best={...s,y:anchor.y,anchor,angle:lying?Math.atan2(s.axis.x,s.axis.z):angle,distance,floor:this.floor(p,p.y+.1)};
 }return best;}

 dispose(){this.world.free();}
}
