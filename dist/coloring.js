import {pageStack,paintKey,placePageLayer} from './page-layer-stack.js?v=20261028-guide3';

export {blendModes,canvasBlend} from './blend-modes.js?v=20261025-release1';
export function addColorLayer(project,cut,kind){
 if(cut.paintLayers.length>=30)throw Error('레이어는 작업 영역마다 30장까지 만들 수 있습니다.');
 const active=cut.paintLayers.find(l=>l.id===cut.activeLayer);
 if(!active)throw Error('선화 또는 밑색 레이어를 먼저 선택하세요.');
 const base=kind==='base'?active:cut.paintLayers.find(l=>l.id===active.clipTo)||active;
 const layer={id:crypto.randomUUID(),name:{base:'밑색',shadow:'음영',light:'빛'}[kind],colorRole:kind,opacity:kind==='shadow'?40:100,visible:true,locked:false,keepVisible:true,blendMode:kind==='shadow'?'multiply':kind==='light'?'screen':'normal'};
 if(kind==='base'){active.reference=true;layer.fillReference=active.id;}
 else layer.clipTo=base.id;
 cut.paintLayers.splice(cut.paintLayers.indexOf(base)+(kind==='base'?0:1),0,layer);
 const stack=pageStack(project,cut.pageId);
 if(stack)placePageLayer(stack,paintKey(cut,layer.id),cut.pageBase&&cut.roughLayerIds?.includes(base.id)?'rough':paintKey(cut,base.id),kind!=='base');
 cut.activeLayer=layer.id;return layer;
}
export function fillReferenceLayers(c,active,mode='reference'){
 const visible=c.paintLayers.filter(l=>l.visible!==false&&c.layerGroups?.[l.group]?.visible!==false&&l.opacity>0);
 if(mode==='current')return visible.filter(l=>l===active);
 if(mode==='visible')return visible;
 const explicit=visible.filter(l=>l.id===active.fillReference);
 if(explicit.length)return explicit;
 const marked=visible.filter(l=>l.reference);if(marked.length)return marked;
 // With no designated reference, ignore color/shadow layers and use the ink.
 return visible.filter(l=>!l.colorRole);
}
