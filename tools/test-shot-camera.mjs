import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){const r=s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);r.url=r.url.replace(/\?v=[\w.-]+$/,'');return r;}});
const T=await import('three'),{configureShot,rotateShot,shotFov,focalFromShotFov}=await import('../dist/shot-camera-math.js');
const initial={position:[2,1.3,5],target:[0,1,0],roll:12,focalLength:50,sensorSize:36,sensorFit:'auto'};
const before=new T.PerspectiveCamera();configureShot(before,initial,1.5);
for(const axis of ['X','Y','Z']){
 const shot=rotateShot(initial,axis,23),camera=new T.PerspectiveCamera();configureShot(camera,shot,1.5);
 const expected=before.quaternion.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(axis==='X'?1:0,axis==='Y'?1:0,axis==='Z'?1:0),T.MathUtils.degToRad(23)));
 assert(expected.angleTo(camera.quaternion)<1e-6,axis+' uses the camera local axis');assert.deepEqual(shot.position,initial.position);
 assert(Math.abs(camera.position.distanceTo(new T.Vector3(...shot.target))-before.position.distanceTo(new T.Vector3(...initial.target)))<1e-8);
 if(axis==='Z')assert.deepEqual(shot.target,initial.target,'Roll keeps the image center stationary');
 const saved=JSON.parse(JSON.stringify(shot)),restored=new T.PerspectiveCamera();configureShot(restored,saved,1.5);assert(restored.quaternion.angleTo(camera.quaternion)<1e-6,'Saved projection keeps rotation');
}
for(const aspect of [.5,1.8])for(const sensorFit of ['auto','horizontal','vertical']){const s={...initial,sensorFit};assert(Math.abs(focalFromShotFov(shotFov(s,aspect),s,aspect)-50)<1e-7);}
class Hub{constructor(){this.events={};}addEventListener(n,f){(this.events[n]??=[]).push(f);}emit(n,values={}){const e={preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},stopPropagation(){},...values};for(const f of this.events[n]||[]){f(e);if(e.stopped)break;}return e;}}
class Element extends Hub{constructor(){super();this.tagName='DIV';this.children=[];const c=new Set();this.classList={add:n=>c.add(n),remove:n=>c.delete(n)};}append(c){this.children.push(c);}setAttribute(){}contains(t){return t===this||this.children.includes(t);}focus(){}getBoundingClientRect(){return {left:100,top:100,right:900,width:800,height:500};}}
globalThis.document=new Hub();document.createElement=()=>new Element();globalThis.window=new Hub();
const {ShotCameraTransform}=await import('../dist/shot-camera-transform.js');
const view=new Element(),surface=new Element(),e={renderer:{domElement:surface},controls:{enabled:true},gizmo:{transform:{enabled:true},keyboard:{finish(){}}},flush(){}};
const shot={e,active:true,data:structuredClone(initial),frame:new Element(),panel:new Element(),change(v){Object.assign(this.data,v);}};
const control=new ShotCameraTransform(shot,view),key=(code,key)=>document.emit('keydown',{code,key,target:surface});
control.select();key('KeyR','r');assert(control.active&&!control.pivot.hidden&&!e.controls.enabled);
key('Digit3','3');key('Digit0','0');assert.equal(shot.data.roll,42);key('Escape','Escape');assert.deepEqual(shot.data,initial);assert(e.controls.enabled&&e.gizmo.transform.enabled);
key('KeyR','r');key('KeyY','y');key('Digit2','2');key('Digit0','0');key('Enter','Enter');assert(!control.active);assert.notDeepEqual(shot.data.target,initial.target);
const committed=structuredClone(shot.data);key('KeyR','r');document.emit('pointermove',{clientX:400,clientY:400});window.emit('blur');assert.deepEqual(shot.data,committed,'Blur cancels unfinished camera turn');
assert(!document.emit('keydown',{code:'KeyR',key:'r',target:{tagName:'INPUT'}}).stopped,'Numeric controls retain keyboard input');control.deselect();assert(!key('KeyR','r').stopped,'R returns to ordinary object transform after deselection');
console.log('PASS: camera origin/local XYZ, centered roll, focal/sensor fit, save/restore, frame selection, R/numeric rotation, confirm/cancel/blur and input ownership');
