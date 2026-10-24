import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

// Keep the real movement lifecycle and DOM input handlers; defer only expensive
// motion assets so first-entry keys and cancellation are deterministic.
let resolveAssets;
globalThis.motionAssets=new Promise(resolve=>resolveAssets=resolve);
const mocks={
 'pose-lab-motion.js':`export const loadPoseLab=()=>globalThis.motionAssets;export class PoseLabMotion{constructor(){}freeze(){}requestJump(){}interact(){}}`,
 'scene-collision.js':`export const initCollision=async()=>{};export class SceneCollision{dispose(){}}`,
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
const {SceneMovement}=await import('../dist/scene-movement.js');
const surface=new Element(),person={height:175,x:0,y:0,z:0},figure={userData:{motionRig:{}}};
const editor={state:{people:[person]},index:0,isOpen:true,loading:false,figures:{children:[figure]},renderer:{domElement:surface},
 gizmo:{transform:{enabled:true},sync(){},setMode(){},setAxis(){}},
 flush(){this.movement.stop({flush:false});},queueLive(){},controlsUI(){this.movement.sync();}};
const movement=editor.movement=new SceneMovement(editor);
const key=(name,code,target=surface)=>document.emit(name,{code,target});
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
assert.equal(key('keydown','KeyW',Object.assign(new Element(),{tagName:'INPUT'})).stopped,undefined,'Text controls keep their keys');
key('keydown','Escape');assert(!movement.engaged&&editor.gizmo.transform.enabled);

// A scene/background still loading must resume once, keeping held input.
editor.loading=true;await movement.start();assert(movement.resumeAfterLoad);
assert.equal(key('keydown','KeyS').stopped,true);
editor.loading=false;movement.sceneReady();await new Promise(resolve=>setImmediate(resolve));
assert(movement.active&&movement.keys.has('KeyS'));
document.emit('pointerdown',{target:new Element()});
assert(!movement.engaged&&movement.keys.size===0,'Changing tabs releases input');

globalThis.motionAssets=new Promise(resolve=>resolveAssets=resolve);
const cancelled=movement.start();key('keydown','KeyS');key('keydown','Escape');
resolveAssets({});await cancelled;
assert(!movement.engaged&&movement.keys.size===0&&editor.gizmo.transform.enabled,'Cancelled loading cannot reactivate movement');
editor.loading=true;await movement.start();editor.loading=false;movement.sceneReady();movement.stop();
await new Promise(resolve=>setImmediate(resolve));assert(!movement.engaged,'Leaving before scene-ready microtask cancels the restart');
console.log('PASS: first-entry S, held/released keys, scene readiness, editable controls, tab exit and loading cancellation');
