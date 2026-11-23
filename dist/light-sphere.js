import {Vector3,Quaternion,MathUtils} from 'three';

// Analytic sphere normals: a shaded 3D preview without a second WebGL context.
export function setupLightSphere(editor,advanced){
 const view=document.getElementById('sceneView'),button=document.createElement('button'),panel=document.createElement('section');
 button.id='lightSphereToggle';button.title='광원 방향 · 구체를 드래그';button.setAttribute('aria-label','광원 방향 조절');button.setAttribute('aria-expanded','false');
 button.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M20 4l-2 2M6 18l-2 2"/></svg>';
 panel.id='lightSpherePanel';panel.hidden=true;panel.innerHTML='<header><b>광원 방향</b><button aria-label="광원 방향 닫기">×</button></header><canvas width="160" height="160" tabindex="0" role="slider" aria-label="광원 구체 · 드래그 또는 방향키로 방향 조절" aria-valuemin="-180" aria-valuemax="180"></canvas><output></output><small>드래그: 회전 · 방향키: 미세 조절</small>';
 view.querySelector('.viewport-actions').append(button);view.append(panel);const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),output=panel.querySelector('output');let drag=null,frame=0;
 const setOpen=open=>{panel.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)sync();};button.onclick=()=>setOpen(panel.hidden);panel.querySelector('button').onclick=()=>setOpen(false);
 function sync(){if(panel.hidden||!editor.state)return;const s=advanced.settings(),a=MathUtils.degToRad(s.azimuth),h=MathUtils.degToRad(s.altitude),light=new Vector3(Math.sin(a)*Math.cos(h),Math.sin(h),Math.cos(a)*Math.cos(h)).applyQuaternion(editor.camera.getWorldQuaternion(new Quaternion()).invert());
  const im=ctx.createImageData(160,160);for(let y=0;y<160;y++)for(let x=0;x<160;x++){const nx=(x-79.5)/72,ny=(79.5-y)/72,r=nx*nx+ny*ny;if(r>1)continue;const z=Math.sqrt(1-r),diffuse=Math.max(0,nx*light.x+ny*light.y+z*light.z),v=Math.round(255*Math.pow(.09+.78*diffuse,1/2.2)),i=(y*160+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=Math.min(255,(1-r)*3000);}ctx.putImageData(im,0,0);
  output.textContent=`방향 ${Math.round(s.azimuth)}° · 고도 ${Math.round(s.altitude)}°`;canvas.setAttribute('aria-valuenow',String(Math.round(s.azimuth)));canvas.setAttribute('aria-valuetext',output.textContent);
 }
 const right=new Vector3(1,0,0),up=new Vector3(0,1,0);
 function change(dx,dy){if(!editor.state)return;const s=advanced.settings();s.hdriNatural=false;const a=MathUtils.degToRad(s.azimuth),h=MathUtils.degToRad(s.altitude),camera=editor.camera.getWorldQuaternion(new Quaternion());
  const dir=new Vector3(Math.sin(a)*Math.cos(h),Math.sin(h),Math.cos(a)*Math.cos(h))
   .applyQuaternion(camera.clone().invert()).applyAxisAngle(up,MathUtils.degToRad(dx)).applyAxisAngle(right,-MathUtils.degToRad(dy)).applyQuaternion(camera).normalize();
  s.azimuth=MathUtils.radToDeg(Math.atan2(dir.x,dir.z));s.altitude=MathUtils.radToDeg(Math.asin(MathUtils.clamp(dir.y,-1,1)));
  if(editor.previewLoop?.shading.mode==='solid'){editor.previewLoop.shading.mode='light';editor.previewLoop.shading.sync();}sync();if(!frame)frame=requestAnimationFrame(()=>{frame=0;advanced.sync();advanced.apply();editor.queueLive();editor.invalidate();});}
 canvas.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,before:{azimuth:advanced.settings().azimuth,altitude:advanced.settings().altitude,hdriNatural:advanced.settings().hdriNatural}};canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(drag?.id!==e.pointerId)return;change((e.clientX-drag.x)*1.5,(drag.y-e.clientY)*1.2);drag.x=e.clientX;drag.y=e.clientY;};
 function finish(cancel=false){if(!drag)return;if(cancel){Object.assign(advanced.settings(),drag.before);advanced.sync();advanced.apply();editor.queueLive();}drag=null;editor.flush();}
 canvas.onpointerup=()=>finish();canvas.onpointercancel=()=>finish(true);canvas.onlostpointercapture=()=>finish(true);
 canvas.onkeydown=e=>{const step=e.shiftKey?10:2,d={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,step],ArrowDown:[0,-step]}[e.key];if(d){e.preventDefault();change(...d);}if(e.key==='Escape'){finish(true);setOpen(false);}};
 return {sync};
}
