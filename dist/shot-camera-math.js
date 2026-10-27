import {MathUtils,PerspectiveCamera,Vector3,Quaternion} from 'three';
export function sensorHeight(shot,aspect){
 const size=MathUtils.clamp(Number(shot.sensorSize)||36,1,100);
 return shot.sensorFit==='vertical'?size:shot.sensorFit==='horizontal'?size/aspect:size/Math.max(1,aspect);
}
export function shotFov(shot,aspect){return MathUtils.radToDeg(2*Math.atan(sensorHeight(shot,aspect)/(2*MathUtils.clamp(Number(shot.focalLength)||50,8,300))));}
export function focalFromShotFov(degrees,shot,aspect){return sensorHeight(shot,aspect)/(2*Math.tan(MathUtils.degToRad(degrees)/2));}
export function configureShot(camera,shot,aspect){
 camera.clearViewOffset();camera.aspect=aspect;camera.fov=shotFov(shot,aspect);camera.zoom=1;
 camera.position.fromArray(shot.position);camera.up.set(0,1,0);camera.lookAt(...shot.target);if(shot.roll)camera.rotateZ(MathUtils.degToRad(shot.roll));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
export function cameraFrame(width,height,aspect){const w=Math.min(width*.82,height*.82*aspect),h=w/aspect;return {x:(width-w)/2,y:(height-h)/2,w,h};}

// Rotate around the camera's own origin. Z is the optical axis (roll), X/Y
// tilt/pan the view without moving the camera or changing target distance.
export function rotateShot(shot,axis,degrees){
 const angle=MathUtils.degToRad(degrees);
 if(axis==='Z')return {...shot,roll:(shot.roll||0)+degrees};
 const camera=new PerspectiveCamera();configureShot(camera,shot,1);
 const q=camera.quaternion.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(axis==='X'?1:0,axis==='Y'?1:0,0),angle));
 const distance=camera.position.distanceTo(new Vector3(...shot.target));
 const target=new Vector3(0,0,-1).applyQuaternion(q).multiplyScalar(distance).add(camera.position);
 camera.up.set(0,1,0);camera.lookAt(target);
 const up=new Vector3(0,1,0).applyQuaternion(q),baseUp=new Vector3(0,1,0).applyQuaternion(camera.quaternion),baseRight=new Vector3(1,0,0).applyQuaternion(camera.quaternion);
 return {...shot,target:target.toArray(),roll:MathUtils.radToDeg(Math.atan2(-up.dot(baseRight),up.dot(baseUp)))};
}
