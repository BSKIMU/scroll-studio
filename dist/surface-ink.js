import * as T from 'three';

const baseLayer={id:'base',name:'표면선 1',visible:true};
export function inkLayers(state){return state.inkLayers?.length?state.inkLayers:[baseLayer];}
export function syncInkVisibility(editor){
 const hidden=new Set(inkLayers(editor.state).filter(l=>!l.visible).map(l=>l.id));
 for(const root of [editor.figures,editor.environment])root.traverse(o=>{if(o.userData.surfaceInk)o.visible=!hidden.has(o.userData.inkStroke?.layer||'base');});
 editor.invalidate();
}
function ribbonGeometry(rows,soft){
 const geo=new T.BufferGeometry(),cols=soft?5:2,indices=[],colors=[];
 geo.setAttribute('position',new T.BufferAttribute(new Float32Array(rows*cols*3),3).setUsage(T.DynamicDrawUsage));
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const i=row*cols+col;
  if(soft)colors.push(1,1,1,[0,.32,1,.32,0][col]);
  if(row&&col)indices.push(i-cols-1,i-cols,i-1,i-1,i-cols,i);
 }
 if(soft)geo.setAttribute('color',new T.Float32BufferAttribute(colors,4));
 geo.setIndex(indices);return geo;
}
function writeRibbon(geo,stroke,start){
 const attr=geo.attributes.position,cols=stroke.soft?5:2;
 for(let i=start;i<stroke.points.length;i++){
  const [a,b]=stroke.points[i];
  for(let j=0;j<cols;j++){const t=j/(cols-1);attr.setXYZ(i*cols+j,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t);}
 }
 attr.addUpdateRange(start*cols*3,(stroke.points.length-start)*cols*3);attr.needsUpdate=true;
 geo.setDrawRange(0,Math.max(0,stroke.points.length-1)*(cols-1)*6);geo.boundingSphere=geo.boundingBox=null;
}
function inkMesh(stroke){
 const geo=ribbonGeometry(stroke.points.length,stroke.soft);writeRibbon(geo,stroke,0);
 const transparent=!!stroke.soft||stroke.opacity<1;
 const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({color:stroke.color,vertexColors:!!stroke.soft,transparent,depthWrite:!transparent,opacity:stroke.opacity,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
 mesh.userData.surfaceInk=true;mesh.raycast=function(ray,hits){if(ray.inkEraser)T.Mesh.prototype.raycast.call(this,ray,hits);};return mesh;
}
function extendRibbon(part){
 if(!part.mesh){part.mesh=inkMesh({...part.stroke,points:[]});part.mesh.frustumCulled=false;part.obj.add(part.mesh);}
 if(part.stroke.points.length>(part.capacity||0)){
  part.capacity=Math.max(part.stroke.points.length,64,(part.capacity||0)*2);part.mesh.geometry.dispose();
  part.mesh.geometry=ribbonGeometry(part.capacity,part.stroke.soft);part.written=0;
 }
 writeRibbon(part.mesh.geometry,part.stroke,part.written);part.written=part.stroke.points.length;
}
export function restoreSurfaceInk(editor,person=null){
 const figure=person&&editor.figures.children[editor.state.people.indexOf(person)];
 for(const stroke of (person||editor.state).surfaceInk||[]){
  if(!stroke||(!person&&stroke.asset!==editor.state.asset)||(person&&stroke.model!==person.model)||!Array.isArray(stroke.path)||!stroke.points?.length)continue;
  const object=stroke.bone?figure?.getObjectByName(stroke.bone):stroke.path.reduce((obj,i)=>obj?.children[i],figure||editor.environment);
  if(object&&(object.isMesh||object.isBone)&&stroke.points.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))){const mesh=inkMesh(stroke);mesh.userData.inkStroke=stroke;mesh.visible=inkLayers(editor.state).find(l=>l.id===(stroke.layer||'base'))?.visible!==false;object.add(mesh);}
 }
}
export function installSurfacePen(view,getEditor,penMode,toast){
 const ray=new T.Raycaster();let gesture=null;
 function sample(e){
  const ed=getEditor(),r=ed.renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),ed.camera);
  ray.inkEraser=gesture.erase;
  const objects=ray.intersectObjects([ed.figures,ed.environment],true);
  const visible=h=>{for(let o=h.object;o;o=o.parent)if(!o.visible||o.userData.poseMarker)return false;return h.object.isMesh;};
  const hit=objects.find(h=>visible(h)&&!h.object.userData.surfaceInk);
  if(!hit?.face){gesture.part=null;return;}
  if(gesture.erase){
   const ink=objects.find(h=>visible(h)&&h.object.userData.surfaceInk&&(h.object.userData.inkStroke?.layer||'base')===gesture.layer&&h.distance<=hit.distance+.025);
   if(ink){
    const id=ink.object.userData.inkStroke?.gestureId,targets=[];
    for(const root of [ed.environment,ed.figures])root.traverse(mesh=>{if(mesh===ink.object||(id&&mesh.userData.inkStroke?.gestureId===id))targets.push(mesh);});
    for(const mesh of targets){gesture.removed.push({mesh,parent:mesh.parent});mesh.removeFromParent();}ed.invalidate();
   }return;
  }
  let root=hit.object;
  while(root.parent&&root.parent!==ed.figures&&root!==ed.environment)root=root.parent;
  const person=root.parent===ed.figures?ed.state.people[ed.figures.children.indexOf(root)]:null;
  if(!person&&root!==ed.environment)return;
  let anchor=hit.object;
  if(person&&anchor.isSkinnedMesh){
   const indices=anchor.geometry.attributes.skinIndex,weights=anchor.geometry.attributes.skinWeight,score=new Map();
   for(const vi of [hit.face.a,hit.face.b,hit.face.c])for(let k=0;k<4;k++){const bi=indices.getComponent(vi,k);score.set(bi,(score.get(bi)||0)+weights.getComponent(vi,k));}
   anchor=anchor.skeleton.bones[[...score].sort((a,b)=>b[1]-a[1])[0][0]];
  }
  const path=[];for(let obj=anchor;obj!==root;obj=obj.parent)path.unshift(obj.parent.children.indexOf(obj));
  const part=gesture.part,normal=hit.face.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
  const distancePerPixel=2*Math.max(.001,-hit.point.clone().applyMatrix4(ed.camera.matrixWorldInverse).z)*Math.tan(T.MathUtils.degToRad(ed.camera.fov/2))/r.height;
  const travel=part?Math.hypot(e.clientX-part.x,e.clientY-part.y):0;
  if(part&&part.obj===anchor&&normal.dot(part.normal)>.8&&part.point.distanceTo(hit.point)<Math.max(.025,distancePerPixel*(travel+1)*8)){
   const delta=hit.point.clone().sub(part.point);
   if(delta.lengthSq()<1e-12)return;
   const pressure=e.pointerType==='pen'&&e.pressure>0?.2+.8*e.pressure:1;
   const side=normal.clone().cross(delta).normalize().multiplyScalar(part.half*pressure);
   if(part.side&&side.dot(part.side)<0)side.negate();part.side=side;
   const edges=p=>[anchor.worldToLocal(p.clone().sub(side)).toArray(),anchor.worldToLocal(p.clone().add(side)).toArray()];
   if(!part.stroke.points.length)part.stroke.points.push(edges(part.point));
   part.stroke.points.push(edges(hit.point));part.point.copy(hit.point);part.x=e.clientX;part.y=e.clientY;
   extendRibbon(part);ed.invalidate();return;
  }
  const depth=-hit.point.clone().applyMatrix4(ed.camera.matrixWorldInverse).z;
  const half=Math.max(.0003,depth*Math.tan(T.MathUtils.degToRad(ed.camera.fov/2))*gesture.size/(ed.cut.pageWidth*ed.cut.width/100)*r.width/r.height);
  gesture.part={x:e.clientX,y:e.clientY,obj:anchor,owner:person||ed.state,normal,point:hit.point.clone(),half,stroke:{layer:gesture.layer,gestureId:gesture.gestureId,...(person?{model:person.model,bone:anchor.isBone?anchor.name:null}:{asset:ed.state.asset}),path,soft:gesture.soft,color:gesture.color,opacity:gesture.opacity,points:[]}};
  gesture.parts.push(gesture.part);
 }
 function stop(cancel=false){
  if(!gesture)return;
  if(!cancel&&!gesture.erase&&gesture.parts.length===1&&!gesture.part?.mesh&&gesture.part){
   const p=gesture.part,side=new T.Vector3(1,0,0);
   if(Math.abs(p.normal.x)>.9)side.set(0,1,0);
   side.cross(p.normal).normalize().multiplyScalar(p.half);
   const up=p.normal.clone().cross(side),pair=(dy,dx)=>[-1,1].map(sign=>p.obj.worldToLocal(p.point.clone().addScaledVector(up,dy).addScaledVector(side,dx*sign)).toArray());
   for(let i=0;i<=8;i++){const a=Math.PI*i/8;p.stroke.points.push(pair(Math.cos(a),Math.sin(a)));}
   extendRibbon(p);
  }
  const ed=getEditor(),removed=gesture.removed,erase=gesture.erase,parts=gesture.parts.filter(p=>p.mesh);gesture=null;
  if(erase){
   for(const {mesh,parent} of removed){if(cancel){parent.add(mesh);continue;}
    for(const owner of [ed.state,...ed.state.people])if(owner.surfaceInk)owner.surfaceInk=owner.surfaceInk.filter(s=>s!==mesh.userData.inkStroke);
    mesh.geometry.dispose();mesh.material.dispose();
   }
   if(!cancel&&removed.length)ed.queueLive();return;
  }
  if(cancel){for(const p of parts){p.obj.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}ed?.invalidate();return;}
  if(!parts.length){toast('인물이나 배경의 표면을 드래그하세요.');return;}
  for(const p of parts){(p.owner.surfaceInk??=[]).push(p.stroke);p.mesh.userData.inkStroke=p.stroke;}ed.queueLive();
 }
 view.addEventListener('pointerdown',e=>{
  if(gesture||!penMode()||e.button!==0||e.target!==getEditor()?.renderer.domElement)return;
  e.preventDefault();e.stopImmediatePropagation();const id=k=>document.getElementById(k);
  const state=getEditor().state,layer=state.activeInkLayer||'base';if(inkLayers(state).find(l=>l.id===layer)?.visible===false){toast('선택한 표면선 레이어가 숨겨져 있습니다.');return;}
  gesture={layer,gestureId:crypto.randomUUID(),erase:penMode()==='erase',removed:[],id:e.pointerId,soft:id('surfaceBrush').value==='air',color:id('surfaceColor').value,size:T.MathUtils.clamp(+id('surfaceSize').value||1,.1,2000),opacity:T.MathUtils.clamp(+id('surfaceOpacity').value||1,1,100)/100,parts:[]};
  view.setPointerCapture(e.pointerId);sample(e);
 },true);
 view.addEventListener('pointermove',e=>{if(gesture?.id!==e.pointerId)return;e.stopImmediatePropagation();for(const p of e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e])sample(p);},true);
 view.addEventListener('pointerup',e=>{if(gesture?.id!==e.pointerId)return;e.stopImmediatePropagation();sample(e);stop();},true);
 view.addEventListener('lostpointercapture',()=>stop(true));
 view.addEventListener('pointercancel',()=>stop(true));
 return ()=>stop(true);
}
