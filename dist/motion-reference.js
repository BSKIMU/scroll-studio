import * as T from 'three';
import {sampleInteraction} from './furniture-motion.js?v=20261025-release1';
// Authored Mixamo rotation deltas drive the body. Contact solvers own placement.
const bindings=new WeakMap();
export function applyMotionReference(m,clip,time,heading,weight=1){
 if(!clip)return;let cache=bindings.get(m.rig);if(!cache){cache=new Map();bindings.set(m.rig,cache);}let pairs=cache.get(clip);if(!pairs){pairs=m.rig.bones.filter(b=>!/Finger|Thumb|Index|Middle|Ring|Pinky/.test(b.name)).map(b=>({b,index:clip.bones.indexOf(b.name.replace(/^mixamorig[:_]?/,'')),rest:m.rig.rest.get(b).worldQ.clone()})).filter(p=>p.index>=0);cache.set(clip,pairs);}
 const sample=sampleInteraction(clip,time),root=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading);
 for(const {b,index,rest}of pairs){const q=b.getWorldQuaternion(new T.Quaternion()),target=root.clone().multiply(sample.q[index]).multiply(rest);m.rig.setWorldQ(b,q.slerp(target,weight));}m.rig.root.updateMatrixWorld(true);
}
