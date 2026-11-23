import assert from 'node:assert/strict';
import {setupToolOrder} from '../dist/tool-order.js';
let observer,saved;
class Element{
 constructor(id){this.dataset=id?{toolOrder:id}:{};this.children=[];this.handlers={};this.style={};this.title=id||'';this.hidden=false;this.classList={add(){},remove(){}};}
 querySelectorAll(){return this.children.filter(b=>b.dataset.toolOrder);}
 append(...items){for(const b of items){b.parentElement?.remove(b);this.children.push(b);b.parentElement=this;}}
 remove(b){this.children.splice(this.children.indexOf(b),1);b.parentElement=null;}
 before(b){const parent=this.parentElement;b.parentElement?.remove(b);parent.children.splice(parent.children.indexOf(this),0,b);b.parentElement=parent;}
 after(b){const parent=this.parentElement;b.parentElement?.remove(b);parent.children.splice(parent.children.indexOf(this)+1,0,b);b.parentElement=parent;}
 closest(){return this.dataset.toolOrder?this:null;}
 addEventListener(t,fn){(this.handlers[t]??=[]).push(fn);}
 emit(t,props={}){const e={target:this,button:0,pointerId:1,clientX:10,clientY:10,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...props};for(const fn of this.parentElement.handlers[t]||[])fn(e);return e;}
 getBoundingClientRect(){const i=this.parentElement.querySelectorAll().indexOf(this);return {left:0,right:32,width:32,top:i*32,bottom:i*32+32,height:32};}
 setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}focus(){}animate(){}
}
const body=new Element(),rail=new Element();body.append(rail);const pen=new Element('draw'),balloon=new Element('balloon'),frame=new Element('frame');rail.append(pen,balloon,frame);
globalThis.document={body,createComment:()=>new Element(),createElement:()=>new Element()};globalThis.localStorage={getItem:()=>null,setItem:(_,v)=>saved=v};globalThis.window={addEventListener(){}};globalThis.MutationObserver=class{constructor(fn){observer=fn;}observe(){}};globalThis.matchMedia=()=>({matches:false});
setupToolOrder(rail);const wand=new Element('wand');rail.append(wand);observer();const order=()=>rail.querySelectorAll().map(b=>b.dataset.toolOrder),marker=body.children[1];
pen.emit('pointerdown');assert.equal(pen.capture,1,'capture stays on clicked button so taps activate it');pen.emit('pointerup');assert(!pen.emit('click').prevented);
for(const [button,type]of [[wand,'pen'],[balloon,'mouse'],[frame,'pen'],[pen,'mouse']]){const r=button.getBoundingClientRect();button.emit('pointerdown',{clientY:r.top+15,pointerType:type});button.emit('pointermove',{clientY:-8,pointerType:type});assert.equal(marker.hidden,false,'every tool shows insertion preview');button.emit('pointerup',{clientY:-8,pointerType:type});assert.equal(order()[0],button.dataset.toolOrder);assert.equal(marker.hidden,true);assert(button.emit('click').prevented,'drag does not select another tool');}
assert.deepEqual(JSON.parse(saved),order());const before=order();wand.emit('pointerdown',{clientY:100});wand.emit('pointermove',{clientY:-8});wand.emit('pointercancel');assert.deepEqual(order(),before,'cancel preserves order');
const index=order().indexOf(wand.dataset.toolOrder);wand.emit('keydown',{key:'ArrowUp',altKey:true});assert.equal(order().indexOf('wand'),index-1);assert(rail.children.at(-1).dataset.toolOrder===undefined,'tool anchor stays after buttons');
console.log('PASS: taps, pen/mouse sorting of all tools, red preview, late-added wand, cancellation, persistence, keyboard order');
