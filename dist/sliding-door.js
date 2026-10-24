import * as T from 'three';
// glTF extras identify a separate sliding leaf; ordinary imported models stay static.
export class InteractiveSlidingDoor{
 constructor(data,root){this.data=data;this.root=root;this.spec=root.userData.scrollDoor;root.userData.door=this;root.traverse(o=>{if(o.userData.scrollDoorLeaf)this.leaf=o;});this.base=this.leaf.position.clone();this.leaf.userData.dynamicDoor=this;this.setAngle(data.angle||0);}
 setAngle(amount){this.data.angle=T.MathUtils.clamp(amount,0,1);this.leaf.position.copy(this.base);this.leaf.position.x+=this.data.angle*this.spec.travel*(this.spec.direction||1);this.root.updateWorldMatrix(true,true);}
 handlePoint(side=1){return this.leaf.localToWorld(new T.Vector3(this.spec.width-.14,1.02,side*.06));}
 collisionCenter(){return this.leaf.localToWorld(new T.Vector3(this.spec.width/2,this.spec.height/2,0));}
 normal(){return new T.Vector3(0,0,1).applyQuaternion(this.root.getWorldQuaternion(new T.Quaternion()));}
 stance(side=1){return this.leaf.localToWorld(new T.Vector3(this.spec.width-.14-side*.23,0,side*.40));}
 sideAt(point){return this.leaf.worldToLocal(point.clone()).z>=0?1:-1;}
 get open(){return this.data.angle>.5;}
}
