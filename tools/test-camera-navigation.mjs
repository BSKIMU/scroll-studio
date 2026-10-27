import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){if(s==='three')return {url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true};const result=next(s,c);if(result.url.startsWith('file:'))result.url=result.url.replace(/\?v=[\w.-]+$/,'');return result;}});
const T=await import('../dist/vendor/three.module.js');
const {FlyNavigation,followCamera,recoverFollow}=await import('../dist/camera-navigation.js');
const near=(a,b,message)=>assert.ok(a.distanceTo(b)<1e-7,message);
function setup(){const camera=new T.PerspectiveCamera(45,1,.01,1000),target=new T.Vector3(0,1,0);camera.position.set(0,1,5);camera.lookAt(target);return {camera,target,nav:new FlyNavigation(camera,target)};}
for(const fps of [30,60,144]){const {camera,target,nav}=setup();for(let i=0;i<fps;i++)nav.step(new Set(['KeyW']),1/fps);near(camera.position,new T.Vector3(0,1,3),'Elapsed seconds, not frames');near(target,new T.Vector3(0,1,-2));}
{
 const {camera,nav}=setup(),before=camera.position.clone();nav.step(new Set(['KeyW','KeyD','KeyE']),.05);assert.ok(Math.abs(camera.position.distanceTo(before)-.1)<1e-8,'No diagonal acceleration');
 nav.look(-Math.PI/.002/2,0);const p=camera.position.clone();nav.step(new Set(['KeyW']),.05);assert.ok(camera.position.x<p.x,'Travel follows mouse yaw');
 nav.look(0,-1e7);assert.ok(Number.isFinite(camera.quaternion.x));assert(nav.pitch<Math.PI/2,'Pitch cannot flip');
 nav.wheel(-1e7);assert(nav.speed<=50);nav.wheel(1e7);assert(nav.speed>=.1);
 const stopped=camera.position.clone();assert(!nav.step(new Set(),1));near(camera.position,stopped,'Release stops immediately');
}
{
 const {camera,target,nav}=setup();nav.step(new Set(['KeyW','ShiftLeft']),.05);assert.equal(camera.position.z,4.7);nav.step(new Set(['KeyW','AltLeft']),.05);assert.ok(Math.abs(camera.position.z-4.68)<1e-8);
 const offset=camera.position.clone().sub(target);followCamera(camera,target,new T.Vector3(100,3,-20));near(camera.position.clone().sub(target),offset,'Following preserves the camera angle and distance');
 const person=new T.Vector3(500,0,0);assert(recoverFollow(camera,target,person,1.8));near(camera.position.clone().sub(target),offset);assert(!recoverFollow(camera,target,person,1.8));
}

// Exercise actual Fly mode input ownership and lifecycle, with only DOM/renderer facades.
class Hub{constructor(){this.listeners={};}addEventListener(n,f){(this.listeners[n]??=[]).push(f);}emit(n,values={}){const e={preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...values};for(const f of this.listeners[n]||[]){f(e);if(e.stopped)break;}return e;}}
class Element extends Hub{
 constructor(){super();this.tagName='DIV';this.children=[];this.nodes={};const classes=new Set();this.classList={add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},contains(n){return classes.has(n);}};}
 append(...nodes){this.children.push(...nodes);}after(){}querySelector(s){return this.nodes[s]??=new Element();}setAttribute(){}
 contains(t){return t===this||this.children.some(c=>c.contains(t))||Object.values(this.nodes).some(c=>c.contains(t));}
 focus(){document.emit('focusin',{target:this});}select(){}requestPointerLock(){document.pointerLockElement=this;document.emit('pointerlockchange');return Promise.resolve();}
 setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
 getBoundingClientRect(){return {left:0,top:0,width:1000,height:600};}
}
const view=new Element(),dialog=new Element(),surface=new Element();view.append(surface);dialog.append(view);
globalThis.document=Object.assign(new Hub(),{getElementById:id=>id==='sceneView'?view:dialog,createElement:()=>new Element(),exitPointerLock(){this.pointerLockElement=null;this.emit('pointerlockchange');}});globalThis.window=Object.assign(new Hub(),{performance:globalThis.performance});
const {SceneFly}=await import('../dist/scene-fly.js');
const {camera,target}=setup();let stored=0,flushed=0;
const editor={camera,isOpen:true,state:{},renderer:{domElement:surface},controls:{target,enabled:true,enableDamping:true,update(){camera.lookAt(target);}},gizmo:{transform:{enabled:true},sync(){}},storeCamera(){stored++;},invalidate(){},flush(){flushed++;this.fly?.finish(true,{flush:false});}};
const fly=editor.fly=new SceneFly(editor),key=(code,extra={})=>document.emit('keydown',{code,target:surface,...extra});
const original=camera.position.clone(),originalTarget=target.clone();fly.start();await Promise.resolve();
assert(fly.active&&!editor.controls.enabled&&!editor.gizmo.transform.enabled);
assert(key('KeyS').stopped,'S cannot scale the character');fly.tick(0);fly.tick(50);assert(camera.position.z>original.z);
assert(!key('KeyW',{target:{tagName:'INPUT'}}).stopped,'Text inputs retain ownership');
key('Escape');assert(!fly.active&&editor.controls.enabled&&editor.gizmo.transform.enabled);near(camera.position,original,'Esc restores pre-Fly position');near(target,originalTarget);
fly.start();key('KeyW');fly.tick(100);fly.tick(150);key('Enter');assert(camera.position.z<original.z,'Enter commits');assert.equal(fly.keys.size,0);

fly.start();key('KeyW');window.emit('blur');assert(!fly.active&&fly.keys.size===0,'Blur releases held input');
editor.loading=true;fly.start();assert(!fly.active);editor.loading=false;editor.gizmo.keyboard={active:true};fly.start();assert(!fly.active,'Never steals an in-progress transform');editor.gizmo.keyboard.active=false;
key('Backquote',{shiftKey:true});assert(fly.active);editor.flush();assert(!fly.active,'Document/scene changes finish navigation before saving');
assert(stored&&flushed);
// Walk shares input ownership, but must discard async preparation after cancel/switch.
editor.environment=new T.Group();
const canceled=fly.start('walk');fly.finish(false);await canceled;
assert(!fly.active&&!fly.navigation,'Canceled walk cannot start after collision preparation');
const switched=fly.start('walk');fly.start('fly');await switched;
assert.equal(fly.mode,'fly');assert(fly.navigation instanceof FlyNavigation);fly.finish(true);
await fly.start('walk');assert(fly.active&&fly.navigation.grounded);
assert.equal(fly.navigation.eyeHeight,1.3,'New human view defaults to 1.3m');
key('ShiftLeft');fly.tick(0);for(let t=50;t<=600;t+=50)fly.tick(t);
assert(camera.position.y<.8&&fly.navigation.crouching,'Actual Shift handler crouches the walk camera');
document.emit('keyup',{code:'ShiftLeft'});for(let t=650;t<=1200;t+=50)fly.tick(t);
assert(camera.position.y>1.29&&!fly.navigation.crouching,'Releasing Shift stands back up');
key('Space');assert(!fly.navigation.grounded,'Space starts the short camera jump');document.emit('keyup',{code:'Space'});for(let t=1250;t<=2000;t+=50)fly.tick(t);assert(fly.navigation.grounded);
fly.heightInput.validity={valid:true};fly.heightInput.value='1.85';fly.heightInput.oninput();
assert.equal(editor.state.cameraWalk.eyeHeight,1.85);assert.equal(fly.navigation.eyeHeight,1.85);
key('Enter');assert(!fly.active&&!fly.navigation,'Walk camera lifecycle ends without owning a physics world');
// Both modes own a separate look surface and the document mouse stream.
// Pointer capture can be unavailable without disabling the actual look input.
surface.requestPointerLock=()=>{throw Error('Must not request pointer lock');};
for(const mode of ['fly','walk']){
 await fly.start(mode);
 assert(!fly.lookSurface.hidden);
 const p=camera.position.clone(),q=camera.quaternion.clone();
 const drag=(name,values={})=>(name==='mousedown'||name==='pointerdown'?view:document).emit(name,{target:fly.lookSurface,button:0,buttons:1,pointerId:3,clientX:500,clientY:300,...values});
 drag('mousemove',{clientX:540});assert(camera.quaternion.equals(q),'Hover never rotates');
 key('KeyW');fly.tick(1000);fly.tick(1050);document.emit('keyup',{code:'KeyW'});
 assert(camera.position.distanceTo(p)>.01,'WASD works without holding the mouse');
 const capture=fly.lookSurface.setPointerCapture;fly.lookSurface.setPointerCapture=()=>{throw Error('Embedded capture unavailable');};
 const down=drag('pointerdown');assert(!down.prevented,'Do not cancel the compatibility mousedown');
 drag('mousedown');assert(view.classList.contains('fly-looking'));
 const position=camera.position.clone();drag('mousemove',{clientX:540});
 assert(camera.quaternion.angleTo(q)>.01,'LMB mouse stream rotates even without pointer capture');near(camera.position,position);
 drag('mousemove',{clientX:999});const edgeYaw=fly.navigation.yaw;fly.tick(1100);fly.tick(1150);
 assert(fly.navigation.yaw<edgeYaw,'Holding at the viewport edge continues turning past the physical cursor limit');
 drag('mousemove',{clientX:500});const centerYaw=fly.navigation.yaw;fly.tick(1200);
 assert.equal(fly.navigation.yaw,centerYaw,'Edge turn stops inside the viewport');
 drag('mouseup',{target:document});const released=camera.quaternion.clone();drag('mousemove',{clientX:200,buttons:0});
 assert(camera.quaternion.equals(released)&&!view.classList.contains('fly-looking'));
 assert(fly.active,'LMB release does not cancel navigation');
 drag('mousedown');drag('mousemove',{buttons:0});assert(!fly.lookDrag,'Missed release cannot leave look stuck');
 if(mode==='walk'){drag('mousedown');key('Tab');assert(fly.active&&fly.heightEditing&&!fly.lookDrag);fly.heightInput.onkeydown({code:'Enter',preventDefault(){}});assert(!fly.heightEditing);}
 fly.lookSurface.setPointerCapture=capture;drag('pointerdown');drag('mousedown');window.emit('blur');
 assert(!fly.active&&!fly.lookDrag&&fly.lookSurface.hidden&&!view.classList.contains('fly-looking'));
}
console.log('PASS: Fly/Walk mouse drag, capture failure, continuous edge turn, release/blur cleanup and keyboard ownership');

// Dispatch through the real drag handlers: Shift+RMB/MMB pans over gizmos,
// preserving orientation, distance, and the selected object's transform.
const {installCameraDrag}=await import('../dist/camera-drag.js');
globalThis.localStorage={getItem:()=>null};dialog.parentElement={before(){}};
surface.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:600});surface.clientHeight=view.clientHeight=600;
view.setPointerCapture=()=>{};view.hasPointerCapture=()=>true;view.releasePointerCapture=()=>{};
editor.controls.addEventListener=()=>{};editor.figures=new T.Group();editor.gizmo.transform.axis='X';
editor.gizmo.transform.pointerHover=()=>{};installCameraDrag(editor);
const pointer=(name,values)=>view.emit(name,{target:surface,pointerId:7,pointerType:'mouse',button:2,clientX:500,clientY:300,shiftKey:true,...values});
for(const button of [2,1]){
 const p=camera.position.clone(),t=target.clone(),q=camera.quaternion.clone(),distance=p.distanceTo(t);
 assert(pointer('pointerdown',{button}).stopped,'Pan wins over object handles');
 pointer('pointermove',{button,clientX:560,clientY:330,shiftKey:false});
 near(camera.position.clone().sub(p),target.clone().sub(t),'Camera and target get the same translation');
 assert(camera.position.distanceTo(p)>.1);assert(camera.quaternion.angleTo(q)<1e-7,'Pan never rotates');
 assert(Math.abs(camera.position.distanceTo(target)-distance)<1e-7,'Pan never zooms');
 pointer('pointerup',{button});assert(editor.controls.enabled&&editor.controls.enableDamping);
}
assert(!pointer('pointerdown',{shiftKey:false}).stopped,'Ordinary RMB remains OrbitControls rotation');
assert(pointer('contextmenu',{}).prevented);
console.log('PASS: Shift+RMB/MMB camera-plane pan, modifier release, gizmo priority and drag cleanup');
