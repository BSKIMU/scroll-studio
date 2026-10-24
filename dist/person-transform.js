// Translation cannot alter body proportions, even with a stale gizmo proxy.
export function applyPersonTransform(person,proxy,mode){
 if(mode==='translate')Object.assign(person,{x:proxy.position.x,y:proxy.position.y,z:proxy.position.z});
 else if(mode==='rotate'){person.euler=[proxy.rotation.x,proxy.rotation.y,proxy.rotation.z];person.rotation=proxy.rotation.y*180/Math.PI;}
 else if(mode==='scale')person.scale=proxy.scale.toArray().map(value=>Math.max(.15,Math.min(5,value/((person.height||175)/175))));
}
