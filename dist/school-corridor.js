// Lightweight, editable preview environment. Dimensions in metres.
export function buildSchoolCorridor(e){
 const add=(name,w,h,d,x,y,z,color)=>{const m=e.box(w,h,d,x,y,z,color);m.name=name;e.environment.add(m);return m;};
 add('복도 바닥',5,.12,24,0,-.06,-7,0xb6b2a3);
 add('복도 천장',5,.12,24,0,3.3,-7,0xe4e6df);
 add('교실 벽',.12,3.3,24,2.5,1.65,-7,0xc9d4c8);
 add('창 아래 벽',.12,.9,24,-2.5,.45,-7,0xb8c4b3);
 add('창 위 벽',.12,.5,24,-2.5,3.05,-7,0xe2e5db);
 add('복도 끝',5,3.3,.12,0,1.65,-19,0xc0c9c3);
 for(let z=3;z>-18;z-=3){
  add('창틀',.14,2.0,.08,-2.5,1.85,z,0x8c9c99);
  add('창 가로틀',.14,.06,3,-2.5,1.85,z-1.5,0x8c9c99);
  add('교실 문',.14,2.3,1,2.41,1.15,z-1,0x889d92);
  add('문 유리',.15,.65,.65,2.32,1.73,z-1,0xd9e8e6);
  add('천장 보',5,.16,.16,0,3.1,z,0x939e9e);
 }
 e.presetCamera={position:e.camera.position.clone().set(-.4,.65,3),target:e.controls.target.clone().set(0,1.8,-2),fov:64};
}
