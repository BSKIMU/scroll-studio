import assert from 'node:assert/strict';
import {setupBrushSwitching,setupBrushPicker} from '../dist/brush-picker.js';
import {brushTools,paintTools,pageCanvasTools} from '../dist/tool-policy.js';

class Element extends EventTarget {
 constructor(){super();this.value='';this.children=[];this.dataset={};this.attributes={};this.classList={add(){}};}
 setAttribute(k,v){this.attributes[k]=v;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 after(el){this.afterElement=el;}
 getContext(){return {};}
 focus(){this.focused=true;}
}
const elements=new Map(),doc=new EventTarget();
doc.getElementById=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
doc.createElement=()=>new Element();
let optionsChanged;
Object.assign(globalThis,{document:doc,MutationObserver:class{constructor(fn){optionsChanged=fn;}observe(){}}});
const $=doc.getElementById,select=$('brushPreset');
const presets=Array.from({length:10},(_,i)=>({name:'Brush '+i,size:5+i,opacity:100,hardness:100,smoothing:10}));
Object.assign(presets[8],{brush:'airbrush',size:100,opacity:45,hardness:0,smoothing:0});
Object.assign(presets[9],{brush:'airbrush',erase:true,size:60,opacity:50,hardness:5,smoothing:0});
select.value='0';$('penSize').value='5';$('brushOpacity').value='100';$('brushHardness').value='100';$('brushSmoothing').value='10';
$('brushPressure').checked=true;$('penAntialias').value='middle';
let tool='draw',previews=0,paintCalls=0;
const setTool=t=>{tool=t;doc.dispatchEvent(new Event('tool-change'));};
const choose=i=>{select.value=String(i);select.dispatchEvent(new Event('change'));};
const values=()=>[+select.value,+$('penSize').value,+$('brushOpacity').value];
setupBrushSwitching({presets,getTool:()=>tool,setTool,preview:()=>previews++});
const picker=setupBrushPicker(select,presets,()=>paintCalls++),list=select.afterElement,initialButtons=[...list.children];

// Toolbar switching remembers each freehand family; explicit presets override memory.
$('penSize').value='17';$('brushOpacity').value='72';setTool('airbrush');assert.deepEqual(values(),[8,100,45]);
$('penSize').value='210';$('brushOpacity').value='20';setTool('draw');assert.deepEqual(values(),[0,17,72]);
setTool('airbrush');assert.deepEqual(values(),[8,210,20]);
choose(4);assert.equal(tool,'draw');assert.deepEqual(values(),[4,9,100],'chosen pen must not be overwritten by remembered pen');
setTool('airbrush');assert.deepEqual(values(),[8,210,20]);setTool('draw');assert.deepEqual(values(),[4,9,100]);
choose(8);assert.deepEqual(values(),[8,100,45],'explicit airbrush preset resets to its preset values');
setTool('draw');assert.deepEqual(values(),[4,9,100],'changing the select must not overwrite the departing preset identity');

// Intermediate tools keep the same shared brush controls, without a second state path.
for(const other of ['erase','eyedropper','lasso','select','pan']){setTool(other);setTool('airbrush');setTool('draw');assert.deepEqual(values(),[4,9,100]);}
assert.equal(paintCalls,10,'switches and choices do not rerasterize the ten brush thumbnails');
assert.deepEqual(list.children,initialButtons,'switches preserve focusable list items');
assert.equal(list.children[4].attributes['aria-selected'],'true');assert.equal(list.children[4].tabIndex,0);
list.children[4].onkeydown({key:'ArrowDown',preventDefault(){}});assert.equal(select.value,'5');assert.equal(list.children[5].focused,true);

// Import/copy/delete use the same change event and invalidate only the preset list.
const imported={name:'Imported spray',brush:'airbrush',size:333,opacity:31,hardness:7,smoothing:12,pressure:false,antialias:'weak',notice:'Imported'};
presets.push(imported);optionsChanged();choose(10);
assert.deepEqual(values(),[10,333,31]);assert.equal($('brushPressure').checked,false);assert.equal($('penAntialias').value,'weak');assert.equal($('brushNotice').textContent,'Imported');
setTool('draw');assert.deepEqual(values(),[5,10,100]);setTool('airbrush');assert.deepEqual(values(),[10,333,31]);
choose(9);assert.equal(tool,'erase');assert.deepEqual(values(),[9,60,50]);
choose(10);setTool('draw');presets.splice(10,1);optionsChanged();setTool('airbrush');assert.equal(select.value,'8','a deleted custom preset cannot select a shifted array entry');
presets[0].size=44;picker.refresh();assert.equal(paintCalls,41,'only import, removal and a saved preset definition rebuild thumbnails');
assert(previews>0);
// Separate brush family: filtered options and input settings survive cross-tool switches.
const water={name:'Watercolor',family:'brush',size:70,opacity:40,hardness:80,smoothing:20};presets.push(water);optionsChanged();setTool('brush');assert.equal(select.value,'10');assert.equal(list.children.filter(b=>!b.hidden).length,1);
$('penSize').value='99';$('brushPressure').checked=false;setTool('draw');assert(list.children.filter(b=>!b.hidden).every(b=>+b.dataset.index<8));setTool('airbrush');assert.equal(list.children.filter(b=>!b.hidden).length,1);setTool('brush');assert.equal(+$('penSize').value,99);assert.equal($('brushPressure').checked,false);

// Preserve the distinct input contracts: pan does not capture the page rough,
// and selection/eyedropper/balloons receive page input without becoming paint tools.
assert.deepEqual(brushTools,['draw','brush','airbrush','erase']);
for(const t of ['draw','brush','airbrush','erase','line','curve','rect','ellipse','lasso','lassofill','fill']){assert(paintTools.includes(t));assert(pageCanvasTools.includes(t));}
for(const t of ['select','text','balloon','eyedropper']){assert(pageCanvasTools.includes(t));assert(!paintTools.includes(t));}
assert(!pageCanvasTools.includes('pan'));
console.log('PASS: toolbar/preset ordering, remembered brush identity, intermediate tools, import/delete, keyboard focus, shared input policy');
console.log('Thumbnail paints during tool switches and preset choices: 0 (initial list excluded).');
