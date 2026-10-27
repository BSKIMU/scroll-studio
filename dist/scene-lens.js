import * as T from 'three';
export function focalToFov(mm,aspect){return T.MathUtils.radToDeg(2*Math.atan(36/Math.max(1,aspect)/(2*mm)));}
export function fovToFocal(fov,aspect){return 36/Math.max(1,aspect)/(2*Math.tan(T.MathUtils.degToRad(fov)/2));}
export function setupLens(e){
 const bar=document.createElement('div');bar.className='scene-lens-bar';
 bar.innerHTML='<label>렌즈 <input id=sceneLens type=number min=12 max=200 step=1 value=35 aria-label="렌즈 초점거리 mm"> mm</label><select id=lensPreset aria-label="렌즈 프리셋"><option value="">화각</option><option value=18>18 광각</option><option value=24>24 광각</option><option value=35>35</option><option value=50>50 표준</option><option value=85>85 망원</option><option value=135>135 망원</option></select><select id=shotFrame aria-label="인물 프레이밍"><option value="">인물 맞춤</option><option value=head>얼굴</option><option value=chest>가슴선</option><option value=upper>상반신</option><option value=whole>전신</option><option value=leftHand>왼손</option><option value=rightHand>오른손</option></select>';
 document.getElementById('sceneView').before(bar);
 const input=bar.querySelector('input'),preset=bar.querySelector('#lensPreset'),frame=bar.querySelector('#shotFrame');
 const coordinates=document.createElement('details');coordinates.innerHTML='<summary>카메라 위치 · 바라보는 위치 (m)</summary>';
 const inputs=[];
 for(const [key,title]of [['camera','카메라'],['target','바라보는 점']]){
  const row=document.createElement('div');row.className='object-triple';const text=document.createElement('b');text.textContent=title;row.append(text);
  for(let axis=0;axis<3;axis++){const field=document.createElement('input');field.type='number';field.step='.05';field.setAttribute('aria-label',title+' '+'XYZ'[axis]);row.append(field);inputs.push({field,key,axis});field.onchange=()=>{if(!e.state)return;const object=key==='camera'?e.camera.position:e.controls.target;object.setComponent(axis,Number(field.value));e.controls.update();e.storeCamera();};}coordinates.append(row);
 }
 document.getElementById('fov').closest('.scene-property-group').append(coordinates);
 const clearForeground=document.createElement('button');clearForeground.textContent='인물 앞을 가리는 배경 물체 숨기기';
 clearForeground.title='선택 인물의 머리·어깨·가슴·골반을 가리는 물체만 숨깁니다. 레이어 탭에서 다시 표시할 수 있습니다.';
 coordinates.before(clearForeground);
 clearForeground.onclick=()=>{
  const figure=e.figures.children[e.index];if(!figure)return;
  e.scene.updateMatrixWorld(true);const hidden=e.advanced.settings().hidden,ray=new T.Raycaster();
  for(const key of ['head','chest','pelvis','leftShoulder','rightShoulder']){
   const point=figure.userData.landmarks[key];if(!point)continue;
   const target=figure.localToWorld(new T.Vector3(...point)),direction=target.sub(e.camera.position),distance=direction.length();
   ray.set(e.camera.position,direction.normalize());ray.far=Math.max(0,distance-.08);
   for(const hit of ray.intersectObjects(e.environment.children,true)){const index=e.advanced.meshes.indexOf(hit.object);if(index>=0&&!hidden.includes(index))hidden.push(index);}
  }
  e.advanced.apply();e.advanced.list();e.queueLive();
 };
 function sync(){if(!e.state||!e.cut)return;const aspect=(e.cut.sceneProjection?.w||e.cut.pageWidth*e.cut.width/100)/(e.cut.sceneProjection?.h||e.cut.height);if(document.activeElement!==input)input.value=Math.round(e.shot?.active?e.shot.data.focalLength:e.state.focalLength||fovToFocal(e.state.fov,aspect));for(const {field,key,axis}of inputs)if(document.activeElement!==field)field.value=Number(e.state[key]?.[axis]||0).toFixed(3);}
 function change(mm){if(!e.state)return;if(e.shot?.active){e.shot.change({focalLength:T.MathUtils.clamp(mm||35,8,300)});return;}e.state.focalLength=T.MathUtils.clamp(mm||35,12,200);e.resize();e.state.fov=e.camera.fov;document.getElementById('fov').value=e.state.fov;document.getElementById('fovValue').textContent=Math.round(e.state.fov)+'°';sync();e.queueLive();}
 input.onchange=()=>change(+input.value);preset.onchange=()=>{if(preset.value)change(+preset.value);preset.value='';};
 frame.onchange=()=>{const figure=e.figures.children[e.index],kind=frame.value;if(!figure||!kind)return;figure.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(figure.userData.motionRig?.model||figure,true),height=(e.state.people[e.index].height||175)/100,fitPoints=[];
  const span=height*({head:.24,chest:.28,upper:.62,whole:1.12,leftHand:.22,rightHand:.22}[kind]||1);
  if(kind==='whole')box.expandByScalar(.03);
  else if(kind.endsWith('Hand')){const point=figure.localToWorld(new T.Vector3(...figure.userData.landmarks[kind]));box.setFromCenterAndSize(point,new T.Vector3(span,span,span*.5));}
  else{
   const bottom=box.max.y-span,upper=new T.Box3(),vertex=new T.Vector3();
   (figure.userData.motionRig?.model||figure).traverse(mesh=>{if(!mesh.isMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,vertex).applyMatrix4(mesh.matrixWorld);if(vertex.y>=bottom){upper.expandByPoint(vertex);if(kind==='chest')fitPoints.push(vertex.clone());}}});
   if(!upper.isEmpty())box.copy(upper);box.min.y=bottom;
  }
  const center=box.getCenter(new T.Vector3()),direction=e.camera.position.clone().sub(e.controls.target).normalize();
  const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right).normalize(),tan=Math.tan(T.MathUtils.degToRad(e.camera.fov/2));
  let distance=.2;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const delta=new T.Vector3(x,y,z).sub(center),depth=delta.dot(direction);distance=Math.max(distance,Math.abs(delta.dot(up))/tan+depth,kind==='chest'?0:Math.abs(delta.dot(right))/(tan*e.camera.aspect)+depth);}
  // Fit the actual head/chest surface; empty box corners pull a low-angle crop back to the waist.
  if(kind==='chest'&&fitPoints.length){
   let top=-Infinity,bottom=-Infinity;
   for(const point of fitPoints){const delta=point.sub(center),vertical=delta.dot(up)/tan,depth=delta.dot(direction);top=Math.max(top,vertical+depth);bottom=Math.max(bottom,-vertical+depth);}
   distance=Math.max(.2,(top+bottom)/2);center.addScaledVector(up,(top-bottom)*tan/2);
  }
  distance*=1.04;
  e.controls.target.copy(center);e.camera.position.copy(center).addScaledVector(direction,distance);e.controls.update();e.storeCamera();frame.value='';
 };
 return {sync};
}
