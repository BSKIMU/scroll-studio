import assert from 'node:assert/strict';
import {sceneDropMode,setupSceneWorkspace} from '../dist/scene-workspace.js';
const rect={left:0,top:60,right:1200,bottom:900,width:1200,height:840},canvasRect={left:180,top:80,right:760,bottom:900,width:580,height:820};
assert.equal(sceneDropMode(450,400,rect,canvasRect),'max');assert.equal(sceneDropMode(1150,400,rect,canvasRect),'dock');assert.equal(sceneDropMode(450,30,rect,canvasRect),null);
class Hub{constructor(){this.events={};}addEventListener(n,f){(this.events[n]??=[]).push(f);}emit(n,e={}){e={preventDefault(){},stopImmediatePropagation(){},...e};for(const f of this.events[n]||[])f(e);}}
class Element extends Hub{
 constructor(){super();this.children=[];this.nodes={};this.attrs={};this.style={setProperty(){}};this.classList={toggle(){},add(){},remove(){}};}
 append(...n){this.children.push(...n);}prepend(...n){this.children.unshift(...n);}querySelector(s){return this.nodes[s]??=new Element();}setAttribute(k,v){this.attrs[k]=v;}
 contains(t){return t===this||this.children.includes(t)||Object.values(this.nodes).includes(t);}closest(){return null;}focus(){}setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}getBoundingClientRect(){return rect;}
}
const dock=new Element(),workspace=new Element(),canvas=new Element(),toolbar=new Element(),body=new Element();canvas.getBoundingClientRect=()=>canvasRect;
dock.getBoundingClientRect=()=>({...rect,right:1460,width:1460});
globalThis.document=Object.assign(new Hub(),{body,getElementById:()=>dock,createElement:()=>new Element(),querySelector:s=>s==='.workspace'?workspace:s==='main'?canvas:s==='.command-bar'?toolbar:null});globalThis.window=new Hub();globalThis.requestAnimationFrame=f=>f();
let opens=0,flushed=0,resized=0,ready=true;
const ui=setupSceneWorkspace({ensureOpen:async()=>{opens++;return ready;},flush:()=>flushed++,resize:()=>resized++,toast(){}});
assert(!ui.maximized,'Default is the right dock');await ui.maximize();assert(ui.maximized);await ui.maximize();assert.equal(opens,1,'Already maximized does not reopen/rebuild the scene');ui.restore();assert(!ui.maximized&&flushed===2&&resized===3);
const head=dock.querySelector('.modal-head').querySelector('div');
head.emit('pointerdown',{button:0,target:head,pointerId:1,clientX:900,clientY:80});head.emit('pointermove',{pointerId:1,clientX:450,clientY:400});head.emit('pointerup');await Promise.resolve();assert(ui.maximized,'Dropping on the manuscript maximizes');
head.emit('pointerdown',{button:0,target:head,pointerId:2,clientX:700,clientY:80});head.emit('pointermove',{pointerId:2,clientX:1150,clientY:400});document.emit('keydown',{code:'Escape'});head.emit('pointerup');assert(ui.maximized,'Escape cancels a docking drag');
head.emit('pointerdown',{button:0,target:head,pointerId:3,clientX:700,clientY:80});head.emit('pointermove',{pointerId:3,clientX:1440,clientY:400});head.emit('pointerup');assert(!ui.maximized,'Maximized docking uses the full visible right edge, including the palette column');
ui.restore();ready=false;await ui.maximize();assert(!ui.maximized,'No full-screen cut-picker covering the canvas');
ready=true;const pending=ui.maximize();ui.restore();await pending;assert(!ui.maximized,'Closing/changing document cancels pending maximize');
console.log('PASS: default dock, maximize/restore without rebuilding, drag targets, Escape, missing cut and asynchronous cancellation');
