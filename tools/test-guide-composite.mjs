import './test-module-loader.mjs';
import assert from 'node:assert/strict';
import {drawGuideComposite} from '../dist/guide-composite.js';
import {pageLayerSettings,layerKey} from '../dist/page-layer-stack.js';
// One opaque body pixel overlaps a blue wall. Test source-over independently of
// rendering resolution, including separate image settings and page group alpha.
function pixelContext(){return {pixel:[0,0,0,0],globalAlpha:1,stack:[],save(){this.stack.push(this.globalAlpha);},restore(){this.globalAlpha=this.stack.pop();},drawImage(image){const s=image.pixel,d=this.pixel,a=s[3]*this.globalAlpha,out=a+d[3]*(1-a);this.pixel=[...s.slice(0,3).map((v,i)=>out?(v*a+d[i]*d[3]*(1-a))/out:0),out];}};}
const cut={width:100,height:100,guideOpacity:50,layerSettings:{background:{visible:true,opacity:100},guide:{visible:true,opacity:100}}};
const images={background:{width:100,height:100,pixel:[0,0,1,1]},guide:{width:100,height:100,pixel:[1,0,0,1]}};
let ctx=pixelContext();drawGuideComposite(ctx,images,cut,100,100,100);assert.deepEqual(ctx.pixel,[1,0,0,1],'Opaque body fully covers the wall before fading');
const stack={page:{stackSettings:{guides:{opacity:50}}},base:{}};
const layer=pageLayerSettings(stack,cut,{id:'guideScene',opacity:cut.guideOpacity/100});assert.equal(layerKey(cut,layer),'guides');assert.equal(layer.opacity,.25);
const paper=pixelContext();paper.pixel=[1,1,1,1];paper.globalAlpha=layer.opacity;paper.drawImage(ctx);assert.deepEqual(paper.pixel,[1,.75,.75,1],'Faded body contains paper, not the wall');
cut.layerSettings.guide.visible=false;ctx=pixelContext();drawGuideComposite(ctx,images,cut,100,100,100);assert.deepEqual(ctx.pixel,[0,0,1,1]);
cut.layerSettings.guide.visible=true;cut.layerSettings.guide.opacity=50;ctx=pixelContext();drawGuideComposite(ctx,images,cut,100,100,100);assert.deepEqual(ctx.pixel,[.5,0,.5,1],'Explicit individual transparency still works');
ctx=pixelContext();drawGuideComposite(ctx,{guide:images.guide},cut,100,100,100);assert.deepEqual(ctx.pixel,[1,0,0,.5],'Transparent character-only guide is preserved');
console.log('PASS: flattened tracing opacity, page/cut opacity, per-image visibility and transparency');
