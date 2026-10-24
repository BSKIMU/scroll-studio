// Bottom-to-top document order, shared by screen, navigator and exports.
import {folderPath} from './layer-compositor.js?v=20261025-release1';
import {nextLayerName} from './layer-names.js?v=20261025-release1';
export const paintKey=(cut,id)=>`paint:${cut.id}:${id}`;
export function pageStack(project,pageId=project.activePage){
 const page=project.pages?.find(p=>p.id===pageId);if(!page)return null;
 const cuts=project.cuts.filter(c=>c.pageId===pageId),base=cuts.find(c=>c.pageBase);if(!base)return null;
 if(!base.roughLayerIds){
  if(!base.paintLayers?.length)base.paintLayers=[{id:crypto.randomUUID(),name:'페이지 러프',opacity:100,visible:true,locked:false}];
  base.roughLayerIds=base.paintLayers.map(l=>l.id);
  const layer={id:crypto.randomUUID(),name:nextLayerName(project),opacity:100,visible:true,locked:false,keepVisible:true};
  if(base.paintLayers.length<30)base.paintLayers.push(layer);
 }
 const paints=cuts.flatMap(c=>(c.paintLayers||[]).filter(l=>!c.pageBase||!base.roughLayerIds.includes(l.id)).map(l=>({key:paintKey(c,l.id),cut:c,model:l,name:l.name})));
 const keys=['guides','rough',...paints.map(p=>p.key)];
 const cutPaints=paints.filter(p=>!p.cut.pageBase).map(p=>p.key),pagePaints=paints.filter(p=>p.cut.pageBase).map(p=>p.key);
 page.layerOrder??=base.onTop===false?['rough','guides',...cutPaints,...pagePaints]:['guides',...cutPaints,'rough',...pagePaints];
 const valid=page.layerOrder.filter((key,i,a)=>keys.includes(key)&&a.indexOf(key)===i);
 page.layerOrder.splice(0,page.layerOrder.length,...valid);
 for(const key of keys)if(!page.layerOrder.includes(key))page.layerOrder.push(key);
 if(page.layerFolders?.length){const group=(keys,depth=0)=>{const result=[],seen=new Set();for(const key of keys){const f=folderPath(page,key)[depth];if(!f){result.push(key);continue;}if(seen.has(f.id))continue;seen.add(f.id);result.push(...group(keys.filter(k=>folderPath(page,k)[depth]?.id===f.id),depth+1));}return result;};page.layerOrder.splice(0,page.layerOrder.length,...group(page.layerOrder));}
 page.stackSettings??={};page.stackSettings.guides??={opacity:100,locked:true};page.stackSettings.rough??={opacity:100,locked:false};
 return {page,cuts,base,paints,order:page.layerOrder};
}
export function layerKey(c,layer){
 if(layer.id==='paper')return 'paper';
 if(layer.id==='frame')return 'frame';
 if(layer.id==='text')return 'text';
 if(c.pageBase&&(c.roughLayerIds||[]).includes(layer.id))return 'rough';
 if(['background','guide'].includes(layer.id))return 'guides';
 return paintKey(c,layer.id);
}
export function pageLayerRank(stack,c,layer){
 if(c.paintLayers?.find(l=>l.id===layer.id)?.fullPageResult)return 19000000+stack.order.indexOf(paintKey(c,layer.id));
 const key=layerKey(c,layer),i=key==='paper'?-1:key==='frame'?stack.order.length:key==='text'?stack.order.length+1:stack.order.indexOf(key);
 return (i+1)*1000+stack.cuts.findIndex(cut=>cut.id===c.id);
}
export function pageLayerSettings(stack,c,layer){
 const key=layerKey(c,layer),s=stack.page.stackSettings[key];
 return {...layer,folders:folderPath(stack.page,key),opacity:(layer.opacity??1)*(s?.opacity??100)/100,hidden:layer.hidden||s?.hidden||(key==='rough'&&stack.base.roughVisible===false)||(key==='guides'&&stack.base.pageGuidesVisible===false)};
}
export function movePageLayer(stack,key,direction){
 const index=stack.order.indexOf(key),next=index+direction;
 if(index<0||next<0||next>=stack.order.length)return false;
 [stack.order[index],stack.order[next]]=[stack.order[next],stack.order[index]];return true;
}
export function placePageLayer(stack,key,target,above){
 if(key===target||!stack.order.includes(key)||!stack.order.includes(target))return false;
 stack.order.splice(stack.order.indexOf(key),1);stack.order.splice(stack.order.indexOf(target)+(above?1:0),0,key);return true;
}
