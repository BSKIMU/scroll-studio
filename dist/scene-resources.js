// Imported geometry and textures belong to the one retained source model.
// Instances own their materials and transforms, never the immutable vertex data.
export function instantiateBackground(source){
 const instance=source.clone(true),materials=new Map();
 const material=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};
 instance.traverse(o=>{
  if(o.geometry)o.userData.sharedGeometry=true;
  if(o.material)o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);
 });
 return instance;
}
export function releaseObjects(root,{source=false}={}){
 const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set(),skeletons=new Set();
 root.traverse(o=>{
  if(o.skeleton)skeletons.add(o.skeleton);
  if(o.geometry&&(source||!o.userData.sharedGeometry))geometries.add(o.geometry);
  for(const m of o.material?[].concat(o.material):[])materials.add(m);
 });
 if(source)for(const m of materials)for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
 for(const t of textures){if(t.image?.close)images.add(t.image);t.dispose();}
 for(const i of images)i.close();
 for(const g of geometries)g.dispose();
 for(const m of materials)m.dispose();
 for(const s of skeletons)s.dispose();
 root.clear();
}
export function geometryBytes(root){
 const buffers=new Set();root.traverse(o=>{if(!o.geometry)return;for(const a of [...Object.values(o.geometry.attributes),o.geometry.index].filter(Boolean))buffers.add((a.data||a).array.buffer);});
 return [...buffers].reduce((sum,b)=>sum+b.byteLength,0);
}
