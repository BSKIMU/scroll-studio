import * as T from 'three';
const material=new T.MeshStandardMaterial({color:0xaab2ba,roughness:.8}),railMaterial=new T.MeshStandardMaterial({color:0x777f87,roughness:.45});
export const stairSize={count:8,rise:.18,run:.32,width:1.3,landing:.8};
export class InteractiveStairs{
 constructor(data){this.data=data;this.root=new T.Group();this.root.name='손잡이 계단';this.root.position.set(data.x,data.y,data.z);this.root.rotation.y=data.rotation;const {count:n,rise:h,run:d,width:w,landing:l}=stairSize;
  for(let i=0;i<n;i++){const step=new T.Mesh(new T.BoxGeometry(w,(i+1)*h,d),material.clone());step.position.set(0,(i+1)*h/2,(i+.5)*d);step.name='계단 '+(i+1);this.root.add(step);}
  const landing=new T.Mesh(new T.BoxGeometry(w,n*h,l),material.clone());landing.position.set(0,n*h/2,n*d+l/2);this.root.add(landing);
  const bar=(a,b,r=.025)=>{const v=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),10),railMaterial.clone());m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());this.root.add(m);};
  for(const x of [-w/2,w/2]){for(let i=0;i<=n;i+=2){const z=i*d,y=i*h;bar(new T.Vector3(x,y,z),new T.Vector3(x,y+.9,z));}bar(new T.Vector3(x,.9,0),new T.Vector3(x,n*h+.9,n*d));bar(new T.Vector3(x,n*h+.9,n*d),new T.Vector3(x,n*h+.9,n*d+l));}
  this.root.updateMatrixWorld(true);
 }
 point(x,y,z){return this.root.localToWorld(new T.Vector3(x,y,z));}
 get top(){return this.point(0,stairSize.count*stairSize.rise,stairSize.count*stairSize.run+.45);}
 get bottom(){return this.point(0,0,-.4);}
 rail(z,side=-1){return this.point(side*stairSize.width/2,.9+Math.min(stairSize.count*stairSize.rise,Math.max(0,z)*stairSize.rise/stairSize.run),z);}
}
export class SceneStairs{
 constructor(e){this.e=e;this.items=[];}
 build(){const e=this.e;for(const old of this.items){if(old.root.parent){old.root.removeFromParent();old.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}}this.items=[];for(const data of (e.state.stairs||[]).slice(0,8)){if(data.asset!==e.state.asset||!['x','y','z','rotation'].every(k=>Number.isFinite(data[k])))continue;const stairs=new InteractiveStairs(data);stairs.root.position.y-=e.environment.position.y;e.environment.add(stairs.root);this.items.push(stairs);}e.environment.updateMatrixWorld(true);}
 add(){const e=this.e;e.flush();const p=e.state.people[e.index];if(!p||(e.state.stairs||[]).length>=8)return;const a=(p.rotation||0)*Math.PI/180;(e.state.stairs??=[]).push({id:crypto.randomUUID(),asset:e.state.asset,x:p.x+Math.sin(a)*.65,y:p.y||0,z:p.z+Math.cos(a)*.65,rotation:a});this.build();e.queueLive();return true;}
 nearest(physics){let result=null;for(const stairs of this.items)for(const down of [false,true]){const point=down?stairs.top:stairs.bottom,d=physics.feet.distanceTo(point);if(d<1.2&&(!result||d<result.distance))result={stairs,down,distance:d};}return result;}
}
