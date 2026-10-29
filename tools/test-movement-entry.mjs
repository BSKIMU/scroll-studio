import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

// Keep the real movement lifecycle and DOM input handlers; defer only expensive
// motion assets so first-entry keys and cancellation are deterministic.
let resolveAssets;
globalThis.motionAssets=new Promise(resolve=>resolveAssets=resolve);
const mocks={
 'scene-pose-library.js':`export class ScenePoseLibrary{constructor(){this.live={cancel(){}};}contains(){return false;}update(){}}`,
 'pose-lab-motion.js':`export const loadPoseLab=()=>globalThis.motionAssets;export class PoseLabMotion{constructor(controller,figure,person,physics){this.figure=figure;this.person=person;figure.position.copy(physics.feet);Object.assign(person,{x:physics.feet.x,y:physics.feet.y,z:physics.feet.z});}update(dt,direction){this.figure.position.x+=direction.x*dt;this.figure.position.z+=direction.z*dt;Object.assign(this.person,{x:this.figure.position.x,z:this.figure.position.z});}freeze(){}requestJump(){}interact(){}}`,
 'scene-collision.js':`export const initCollision=async()=>{};export class SceneCollision{walkingStart(p){return globalThis.noStandingRoom?null:globalThis.spawnFeet?p.clone().fromArray(globalThis.spawnFeet):p;}setFeet(p){this.feet=p;}dispose(){}nearestSeat(){return null;}}`,
 'furniture-motion.js':`export const loadInteractionClips=async()=>null;`
};
registerHooks({
 resolve(s,c,next){if(s==='three')return {url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true};return next(s,c);},
 load(url,c,next){const name=new URL(url).pathname.split('/').at(-1);return mocks[name]?{format:'module',source:mocks[name],shortCircuit:true}:next(url,c);}
});
class Hub{
 constructor(){this.listeners={};}
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
 emit(name,values={}){const event={code:'',preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...values};for(const fn of this.listeners[name]||[]){fn(event);if(event.stopped)break;}return event;}
}
class Element extends Hub{
 constructor(){super();this.children=[];this.dataset={};this.value='';this.textContent='';this.tagName='DIV';this.classList={add(){},remove(){},toggle(){}};}
 append(...nodes){this.children.push(...nodes);}
 prepend(...nodes){this.children.unshift(...nodes);}
 add(node){this.append(node);}
 replaceChildren(...nodes){this.children=nodes;}
 before(){}after(){}setAttribute(){}
 closest(){return this;}
 querySelector(){return new Element();}
 querySelectorAll(){return [];}
 contains(target){return this===target||this.children.includes(target);}
 focus(){document.activeElement=this;document.emit('focusin',{target:this});}
}
const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const tabs=new Element();tabs.children=[new Element(),new Element()];
const controls=new Element();controls.querySelector=()=>tabs;
globalThis.document=Object.assign(new Hub(),{getElementById:$,createElement:()=>new Element(),querySelector:s=>s==='.scene-controls'?controls:$('hint')});
globalThis.window=new Hub();globalThis.Option=class extends Element{constructor(label,value){super();this.value=value;}};
const T=await import('../dist/vendor/three.module.js');
const {SceneMovement}=await import('../dist/scene-movement.js');
const surface=new Element(),person={height:175,x:0,y:0,z:0},figure={position:new T.Vector3(),userData:{motionRig:{}}};
const editor={state:{people:[person]},index:0,isOpen:true,loading:false,figures:{children:[figure]},renderer:{domElement:surface},
 camera:new T.PerspectiveCamera(45,1,.01,1000),controls:{target:new T.Vector3()},stairs:{nearest(){return null;}},doors:{nearest(){return null;}},storeCamera(){},
 gizmo:{transform:{enabled:true},sync(){},setMode(){},setAxis(){}},
 flush(){this.movement.stop({flush:false});},queueLive(){},controlsUI(){this.movement.sync();}};
const movement=editor.movement=new SceneMovement(editor);
$('sceneDialog').append(surface,movement.panel);
movement.panel.hidden=false;
const key=(name,code,target=surface)=>document.emit(name,{code,target});
editor.camera.position.set(0,1,5);editor.camera.lookAt(0,1,0);
assert.equal(movement.settings().follow,true,'Follow defaults on');
editor.state.movement.follow=false;assert.equal(movement.settings().follow,false,'Explicit follow opt-out persists');
editor.state.movement.follow=true;
const pending=movement.start();
assert(movement.starting&&movement.engaged&&!editor.gizmo.transform.enabled);
assert.equal(key('keydown','KeyS').stopped,true,'S must not reach the scale shortcut while assets load');
assert(movement.keys.has('KeyS'));
key('keydown','KeyW');key('keyup','KeyW');
resolveAssets({});await pending;
assert(movement.active,'First entry starts without switching tabs');
assert(movement.keys.has('KeyS'),'A held key survives initialization');
assert(!movement.keys.has('KeyW'),'A key released while loading does not stick');
key('keyup','KeyS');assert.equal(movement.keys.size,0);
const relative=editor.camera.position.clone().sub(figure.position),viewOffset=editor.controls.target.clone().sub(figure.position);
key('keydown','KeyW');movement.tick(100);movement.tick(150);movement.tick(200);key('keyup','KeyW');
assert(editor.camera.position.clone().sub(figure.position).distanceTo(relative)<1e-9,'Walking preserves camera offset');
assert(editor.controls.target.clone().sub(figure.position).distanceTo(viewOffset)<1e-9,'Following keeps the same framing');
assert.deepEqual(editor.state.camera,editor.camera.position.toArray(),'Followed camera is serializable');
editor.state.movement.follow=false;const fixed=editor.camera.position.clone();key('keydown','KeyW');movement.tick(250);key('keyup','KeyW');assert(editor.camera.position.distanceTo(fixed)<1e-9,'Unchecked follow leaves camera fixed');editor.state.movement.follow=true;

assert.equal(key('keydown','KeyW',Object.assign(new Element(),{tagName:'INPUT'})).stopped,undefined,'Text controls keep their keys');
key('keydown','Escape');assert(!movement.engaged&&editor.gizmo.transform.enabled);
key('keydown','KeyS');await new Promise(resolve=>setImmediate(resolve));assert(movement.active&&movement.keys.has('KeyS'),'Selected movement tab resumes on S instead of scaling');movement.stop();
editor.fly={active:true};assert(!key('keydown','KeyW').stopped,'Walk/Fly owns navigation even while movement tab remains selected');editor.fly.active=false;

// A scene/background still loading must resume once, keeping held input.
editor.loading=true;await movement.start();assert(movement.resumeAfterLoad);
assert.equal(key('keydown','KeyS').stopped,true);
editor.loading=false;movement.sceneReady();await new Promise(resolve=>setImmediate(resolve));
assert(movement.active&&movement.keys.has('KeyS'));
document.emit('pointerdown',{target:new Element()});
assert(!movement.engaged&&movement.keys.size===0,'Changing tabs releases input');

globalThis.spawnFeet=[2,.015,3];await movement.start();
assert.deepEqual(figure.position.toArray(),globalThis.spawnFeet,'Detected empty floor is passed to the motion rig before its first frame');
assert.equal(person.y,.015,'Corrected placement becomes saved scene position');movement.stop();
globalThis.spawnFeet=null;globalThis.noStandingRoom=true;const beforeFailure=figure.position.clone();await movement.start();
assert(!movement.active&&!movement.physics,'No floor/headroom leaves no partially active physics');
assert(figure.position.equals(beforeFailure),'Failed placement preserves the figure');globalThis.noStandingRoom=false;

globalThis.motionAssets=new Promise(resolve=>resolveAssets=resolve);
const cancelled=movement.start();key('keydown','KeyS');key('keydown','Escape');
resolveAssets({});await cancelled;
assert(!movement.engaged&&movement.keys.size===0&&editor.gizmo.transform.enabled,'Cancelled loading cannot reactivate movement');
editor.loading=true;await movement.start();editor.loading=false;movement.sceneReady();movement.stop();
await new Promise(resolve=>setImmediate(resolve));assert(!movement.engaged,'Leaving before scene-ready microtask cancels the restart');
console.log('PASS: first-entry S, held/released keys, scene readiness, editable controls, tab exit and loading cancellation');
