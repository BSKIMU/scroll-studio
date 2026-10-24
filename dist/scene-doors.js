import * as T from 'three';
import {InteractiveSlidingDoor} from './sliding-door.js?v=20261025-release1';
const Y=new T.Vector3(0,1,0);
export const doorSize={width:1.06,height:2.15,depth:.065};
const material=color=>new T.MeshStandardMaterial({color,roughness:.72});
function box(parent,w,h,d,x,y,z,color,decor=false){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.userData.noCollision=decor;parent.add(m);return m;}

// Door state is plain JSON; the hinge, leaf and handle are rebuilt from it.
export class InteractiveDoor{
 constructor(data){this.data=data;this.root=new T.Group();this.root.name='상호작용 문';this.root.userData.door=this;this.root.position.set(data.x||0,data.y||0,data.z||0);this.root.rotation.y=data.rotation||0;
  const {width:w,height:h,depth:d}=doorSize;
  box(this.root,.1,h+.1,.16,-.09,h/2,0,0x59636a);box(this.root,.1,h+.1,.16,w+.09,h/2,0,0x59636a);box(this.root,w+.28,.1,.16,w/2,h+.07,0,0x59636a);
  this.hinge=new T.Group();this.root.add(this.hinge);this.leaf=box(this.hinge,w,h-.02,d,w/2,h/2+.01,0,0x9b7857);this.leaf.userData.dynamicDoor=this;
  for(const y of [.55,1.53])box(this.hinge,w-.2,.7,.012,w/2,y,d/2+.008,0xb18d68,true);
  this.handle=new T.Group();this.handle.position.set(w-.14,1.02,0);this.hinge.add(this.handle);
  for(const side of [-1,1]){box(this.handle,.045,.13,.045,0,0,side*.065,0xc9cfd4,true);box(this.handle,.15,.028,.035,-.055,0,side*.092,0xdde1e5,true);}
  this.setAngle(Number.isFinite(data.angle)?data.angle:0);
 }
 setAngle(angle){this.data.angle=T.MathUtils.clamp(angle,-Math.PI*.52,Math.PI*.52);this.hinge.rotation.y=this.data.angle;this.root.updateWorldMatrix(true,true);}
 handlePoint(side=1){return this.handle.localToWorld(new T.Vector3(-.055,0,side*.092));}
 normal(){return new T.Vector3(0,0,1).applyQuaternion(this.hinge.getWorldQuaternion(new T.Quaternion()));}
 stance(side=1){return this.hinge.localToWorld(new T.Vector3(doorSize.width-.32,0,side*.36));}
 sideAt(point){return this.hinge.worldToLocal(point.clone()).z>=0?1:-1;}
 get open(){return Math.abs(this.data.angle)>.5;}
}

export function buildInteractionRoom(environment){
 box(environment,8,.1,8,0,-.055,0,0x666b70);
 // The gap is a real opening. No invisible full wall behind the hinged leaf.
 box(environment,3.4,2.7,.15,-2.3,1.35,-1.3,0x92999c);box(environment,3.4,2.7,.15,2.3,1.35,-1.3,0x92999c);box(environment,1.2,.5,.15,0,2.45,-1.3,0x92999c);
 box(environment,.55,.09,.55,-1.8,.46,.6,0xb7986e);box(environment,.55,.55,.08,-1.8,.78,.3,0xb7986e);for(const x of [-2,-1.6])for(const z of [.4,.8])box(environment,.06,.43,.06,x,.215,z,0x565d62);
 box(environment,1.15,.36,2.1,2.25,.18,.55,0x696779);box(environment,1.15,.14,2.1,2.25,.43,.55,0xc2bec8);box(environment,.9,.12,.4,2.25,.56,-.2,0xe6e0d6);
}
export class SceneDoors{
 constructor(editor){this.e=editor;this.items=[];}
 build(){const e=this.e;this.items=[];if(!Array.isArray(e.state.doors))e.state.doors=[];e.state.doors=e.state.doors.filter(d=>d&&['x','y','z','rotation','angle'].every(k=>Number.isFinite(d[k]))).slice(0,16);
  e.environment.updateWorldMatrix(true,true);const roots=[];e.environment.traverse(o=>{const s=o.userData.scrollDoor;if(s?.type==='sliding'&&[s.width,s.height,s.travel].every(n=>Number.isFinite(n)&&n>0&&n<10)&&o.children.some(c=>c.userData.scrollDoorLeaf))roots.push(o);});
  for(const root of roots){const sourceId=root.userData.scrollDoorId||root.name;let data=e.state.doors.find(d=>d.asset===e.state.asset&&d.sourceId===sourceId&&d.kind==='sliding');if(!data){if(e.state.doors.length>=16)break;const p=root.getWorldPosition(new T.Vector3()),direction=new T.Vector3(0,0,1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));data={id:sourceId,sourceId,kind:'sliding',asset:e.state.asset,x:p.x,y:p.y,z:p.z,rotation:Math.atan2(direction.x,direction.z),angle:0};e.state.doors.push(data);}this.items.push(new InteractiveSlidingDoor(data,root));}
  for(const data of e.state.doors){if(data.asset!==e.state.asset||data.kind==='sliding')continue;const door=new InteractiveDoor(data);door.root.position.y-=e.environment.position.y;e.environment.add(door.root);this.items.push(door);}e.environment.updateWorldMatrix(true,true);}
 add(){const e=this.e;e.flush();const p=e.state.people[e.index];if(!p||(e.state.doors||[]).length>=16)return;const a=(p.rotation||0)*Math.PI/180,front=new T.Vector3(0,0,1).applyAxisAngle(Y,a),right=new T.Vector3(1,0,0).applyAxisAngle(Y,a);const at=new T.Vector3(p.x,p.y||0,p.z).addScaledVector(front,1.25).addScaledVector(right,-doorSize.width/2);
  (e.state.doors??=[]).push({id:crypto.randomUUID(),asset:e.state.asset,x:at.x,y:at.y,z:at.z,rotation:a,angle:0});const door=new InteractiveDoor(e.state.doors.at(-1));door.root.position.y-=e.environment.position.y;e.environment.add(door.root);this.items.push(door);e.advanced.environmentReady();e.queueLive();return door;
 }
 nearest(physics,{object=null}={}){const feet=physics.feet;let nearest=null;for(const door of this.items){if(object){let o=object;while(o&&o!==door.root)o=o.parent;if(!o)continue;}const side=door.sideAt(feet),point=door.handlePoint(side),distance=Math.hypot(point.x-feet.x,point.z-feet.z);if(distance>1.65||Math.abs(point.y-feet.y-1)>.65)continue;if(!physics.visibleContact(point,door))continue;if(!nearest||distance<nearest.distance)nearest={door,side,distance};}return nearest;}
}
