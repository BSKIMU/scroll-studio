import assert from 'node:assert/strict';
import {setupFrameTransform} from '../dist/frame-transform.js';

// Exercise the real viewport listener: drawing must never start a frame session.
class Surface {
 constructor(){this.events=new Map();this.style={};this.dataset={};this.children=[];this.hidden=false;this.classList={add(){},remove(){},toggle(){},contains(){return false;}};}
 addEventListener(type,fn){const list=this.events.get(type)||[];list.push(fn);this.events.set(type,list);}
 emit(type,props={}){const e={button:0,target:viewport,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...props};for(const fn of this.events.get(type)||[]){fn(e);if(e.stopped)break;}return e;}
 setAttribute(){} before(){} closest(){return null;}
 append(el){this.children.push(el);el.parentNode=this;}
 remove(){this.parentNode=null;}
 contains(el){return this===el||this.children.includes(el);}
 querySelectorAll(){return [];}
}
const viewport=new Surface(),paper=new Surface(),doc=new Surface(),win=new Surface();
const nodes=new Map([['viewport',viewport],['paper',paper]]);
doc.getElementById=id=>{if(!nodes.has(id))nodes.set(id,new Surface());return nodes.get(id);};
doc.createElement=()=>new Surface();doc.querySelector=()=>null;
Object.assign(globalThis,{document:doc,window:win,requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
let tool='draw',balloonSelected=false,toolChanges=0,scenePauses=0;
const cut={id:'cut',pageId:'page',x:40,y:200,width:80,height:600};
const project={width:1600,pageHeight:2000,pages:[{id:'page'}]};
const ui=setupFrameTransform({getTool:()=>tool,getSelected:()=>cut,getProject:()=>project,getZoom:()=>.5,
 hasBalloonSelection:()=>balloonSelected,setTool:value=>{tool=value;toolChanges++;},pauseScene:()=>scenePauses++,toast(){}});

for(const activeTool of ['draw','erase','line','shape','text','balloon','pan']){
 tool=activeTool;
 for(let i=0;i<5;i++)assert.equal(viewport.emit('dblclick').prevented,undefined,activeTool+' must keep its input');
 assert.equal(tool,activeTool);
}
assert.equal(toolChanges,0);assert.equal(scenePauses,0,'rapid pen taps must not close the 3D editor');
tool='select';balloonSelected=true;
assert.equal(viewport.emit('dblclick').stopped,undefined,'a clipped balloon receives its double-click');
balloonSelected=false;
const plane=new Surface();plane.closest=s=>s==='.balloon-plane'?plane:null;viewport.append(plane);
assert.equal(viewport.emit('dblclick',{target:plane}).stopped,undefined,'page balloon selection stays with the balloon tool');
const input=new Surface();input.closest=s=>s.includes('input')?input:null;viewport.append(input);
assert.equal(viewport.emit('dblclick',{target:input}).prevented,undefined,'property input is not a frame gesture');
assert.equal(viewport.emit('dblclick',{button:2}).prevented,undefined);
assert.equal(toolChanges,0);

assert.equal(viewport.emit('dblclick').stopped,true,'Select still confirms a frame');
assert.equal(toolChanges,1);assert.equal(scenePauses,1);
assert.equal(viewport.emit('dblclick').stopped,true,'Select reopens a committed frame');
assert.equal(doc.emit('keydown',{key:'Enter'}).prevented,true,'Enter still confirms the reopened frame');
ui.cancel();
console.log('PASS: real frame input routing, repeated drawing taps, 3D stays active, balloon/input exclusion, Select reopen and Enter confirm');
