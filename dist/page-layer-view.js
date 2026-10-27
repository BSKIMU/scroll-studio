import {canvasBlend} from './coloring.js?v=20261028-guide3';
import {customBlend} from './blend-modes.js?v=20261025-release1';
import {compositeStack} from './layer-compositor.js?v=20261025-release1';
import {pageStack,pageLayerRank} from './page-layer-stack.js?v=20261028-guide3';

// The interactive cut canvas remains the input target. Display layers are siblings
// on the page so their order can cross cut boundaries without CSS stacking groups.
export function presentPageLayers(project,c,target,layers){
 if(!target.isConnected||!c.pageId)return false;
 const stack=pageStack(project,c.pageId);if(!stack)return false;
 const paper=document.getElementById('paper'),wrap=target.parentElement;paper.style.isolation='isolate';
 const old=[...paper.querySelectorAll('.page-render-layer')].filter(el=>el.dataset.cut===c.id);
 for(const el of old){el.width=1;el.remove();}
 target.style.opacity='0';
 for(const layer of layers){
  const cv=layer.canvas;cv.className='page-render-layer';cv.dataset.cut=c.id;cv.dataset.layer=layer.id;cv.dataset.blend=canvasBlend(layer.blendMode);cv.dataset.rank=String(pageLayerRank(stack,c,layer));cv.setAttribute('aria-hidden','true');
  cv.layerDescriptor={...layer,canvas:cv};
  Object.assign(cv.style,{position:'absolute',left:wrap.style.left,top:wrap.style.top,width:wrap.style.width,height:wrap.style.height,pointerEvents:'none',mixBlendMode:layer.blendMode||'normal',zIndex:cv.dataset.rank,opacity:String(layer.hidden?0:layer.opacity??1)});
  paper.append(cv);
 }
 paper.classList.toggle('has-page-result',stack.cuts.some(c=>c.paintLayers.some(l=>l.fullPageResult&&l.visible!==false)));queuePageComposite();return true;
}
export function pageDisplayLayers(paper){return [...paper.querySelectorAll('.page-render-layer')].sort((a,b)=>+a.dataset.rank-+b.dataset.rank);}
let queued=0;
export function queuePageComposite(){if(!queued)queued=requestAnimationFrame(()=>{queued=0;refreshPageComposite();});}
export function refreshPageComposite(){
 const paper=document.getElementById('paper');if(!paper)return;const layers=pageDisplayLayers(paper),needed=layers.some(c=>c.layerDescriptor&&(customBlend(c.layerDescriptor.blendMode)||c.layerDescriptor.adjustment||c.layerDescriptor.folders?.length));let output=paper.querySelector('.page-composite');
 for(const cv of layers)cv.style.visibility=needed?'hidden':'';
 if(!needed){if(output){output.width=1;output.remove();}return;}if(!paper.clientWidth||!paper.clientHeight)return;
 if(!output){output=document.createElement('canvas');output.className='page-composite';Object.assign(output.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'19000000'});paper.append(output);}
 const scale=Math.min(2,Math.sqrt(4000000/(paper.clientWidth*paper.clientHeight)));output.width=Math.max(1,Math.round(paper.clientWidth*scale));output.height=Math.max(1,Math.round(paper.clientHeight*scale));const ctx=output.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,output.width,output.height);
 compositeStack(ctx,layers.map(cv=>({...cv.layerDescriptor,args:[cv.offsetLeft*scale,cv.offsetTop*scale,cv.clientWidth*scale,cv.clientHeight*scale]})));
 document.dispatchEvent(new Event('page-composited'));
}
