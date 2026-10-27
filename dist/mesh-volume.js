import {Vector3,Ray} from 'three';

// Trimesh contact tests see surfaces only. Use containment during spawn checks
// for closed, outward-facing solids; open walls/planes must remain two-sided.
export function closedMeshVolume(vertices,indices,box){
 const ids=[],unique=new Map(),edges=new Map(),a=new Vector3(),b=new Vector3(),c=new Vector3(),cross=new Vector3();let volume=0;
 for(let i=0;i<vertices.length;i+=3){const key=[0,1,2].map(j=>Math.round(vertices[i+j]*1e5)).join(',');if(!unique.has(key))unique.set(key,unique.size);ids.push(unique.get(key));}
 for(let i=0;i<indices.length;i+=3){
  const tri=[indices[i],indices[i+1],indices[i+2]],v=tri.map(id=>ids[id]);if(new Set(v).size<3)continue;
  a.fromArray(vertices,tri[0]*3);b.fromArray(vertices,tri[1]*3);c.fromArray(vertices,tri[2]*3);volume+=a.dot(cross.crossVectors(b,c))/6;
  for(let j=0;j<3;j++){const x=v[j],y=v[(j+1)%3],key=x<y?x+':'+y:y+':'+x,e=edges.get(key)||{count:0,balance:0};e.count++;e.balance+=x<y?1:-1;edges.set(key,e);}
 }
 if(volume<=1e-7||!edges.size||[...edges.values()].some(e=>e.count!==2||e.balance!==0))return null;
 const ray=new Ray(new Vector3(),new Vector3(1,.371,.529).normalize()),hit=new Vector3();
 return {contains(point){
  if(!box.containsPoint(point))return false;ray.origin.copy(point);const hits=[];
  for(let i=0;i<indices.length;i+=3){a.fromArray(vertices,indices[i]*3);b.fromArray(vertices,indices[i+1]*3);c.fromArray(vertices,indices[i+2]*3);if(ray.intersectTriangle(a,b,c,false,hit))hits.push(hit.distanceToSquared(point));}
  hits.sort((x,y)=>x-y);return hits.filter((v,i)=>!i||Math.abs(v-hits[i-1])>1e-8).length%2===1;
 }};
}
