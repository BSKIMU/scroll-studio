import {nextLayerName} from './layer-names.js?v=20261025-release1';
import {pageStack,paintKey,placePageLayer} from './page-layer-stack.js?v=20261028-guide3';
import {ensureLayers} from './layers.js?v=20261028-guide3';
export function addPaintLayer(project,cut,properties={},after=null){
 ensureLayers(cut);if(cut.paintLayers.length>=30)throw Error('이 작업 영역의 레이어가 30개입니다. 다른 컷이나 페이지 레이어를 사용하세요.');
 const layer={id:crypto.randomUUID(),name:nextLayerName(project),type:'raster',nativeWidth:(project.width+project.bleed)*cut.width/100,opacity:100,visible:true,locked:false,keepVisible:true,...properties};cut.paintLayers.push(layer);cut.activeLayer=layer.id;
 const stack=pageStack(project,cut.pageId);if(stack&&after)placePageLayer(stack,paintKey(cut,layer.id),after,true);return layer;
}
export function duplicatePaintLayer(project,cut,layer){const copy=addPaintLayer(project,cut,{...structuredClone(layer),id:crypto.randomUUID(),name:layer.name+' 복사',locked:false},paintKey(cut,layer.id));cut.strokes.push(...structuredClone(cut.strokes.filter(s=>(s.layerId||'rough')===layer.id)).map(s=>({...s,layerId:copy.id})));return copy;}
export function removePaintLayer(project,cut,layer){
 if(layer.locked)throw Error('레이어 잠금을 해제하세요.');cut.strokes=cut.strokes.filter(s=>(s.layerId||'rough')!==layer.id);cut.paintLayers=cut.paintLayers.filter(l=>l.id!==layer.id);
 for(const l of cut.paintLayers)if(l.clipTo===layer.id)delete l.clipTo;
 if(cut.roughLayerIds)cut.roughLayerIds=cut.roughLayerIds.filter(id=>id!==layer.id);
 if(!cut.paintLayers.length)addPaintLayer(project,cut,{name:'빈 레이어'});cut.activeLayer=cut.paintLayers.at(-1).id;
 const pg=project.pages?.find(p=>p.id===cut.pageId);for(const f of pg?.layerFolders||[])f.keys=f.keys.filter(k=>k!==paintKey(cut,layer.id));pageStack(project,cut.pageId);
}
export function duplicateLayerFolder(project,page,id){
 const source=page.layerFolders.find(f=>f.id===id);if(!source)return;
 const keys=folderKeys(page,id),members=project.cuts.flatMap(c=>c.paintLayers.map(l=>({c,l,key:paintKey(c,l.id)}))).filter(e=>keys.includes(e.key));
 for(const c of new Set(members.map(e=>e.c)))if(c.paintLayers.length+members.filter(e=>e.c===c).length>30)throw Error('폴더를 복제할 레이어 공간이 부족합니다.');
 const mapping=new Map(),folders=[source];for(let i=0;i<folders.length;i++)folders.push(...page.layerFolders.filter(f=>f.parent===folders[i].id));
 for(const e of members){const l=duplicatePaintLayer(project,e.c,e.l);mapping.set(e.key,paintKey(e.c,l.id));}
 const ids=new Map(folders.map(f=>[f.id,crypto.randomUUID()]));for(const f of folders)page.layerFolders.push({...structuredClone(f),id:ids.get(f.id),name:f.name+(f===source?' 복사':''),parent:ids.get(f.parent)||f.parent,keys:f.keys.map(k=>mapping.get(k)).filter(Boolean)});
 const copies=page.layerOrder.filter(k=>[...mapping.values()].includes(k)),rest=page.layerOrder.filter(k=>!copies.includes(k)),at=Math.max(...keys.map(k=>rest.indexOf(k)))+1;rest.splice(at,0,...copies);page.layerOrder=rest;
 return ids.get(id);
}
export function removeLayerFolder(project,page,id){const ids=new Set([id]);for(let changed=true;changed;){changed=false;for(const f of page.layerFolders)if(ids.has(f.parent)&&!ids.has(f.id)){ids.add(f.id);changed=true;}}
 const keys=new Set(folderKeys(page,id));for(const c of project.cuts)for(const l of [...c.paintLayers])if(keys.has(paintKey(c,l.id)))removePaintLayer(project,c,l);page.layerFolders=page.layerFolders.filter(f=>!ids.has(f.id));
}
export function createLayerFolder(page,order,keys,name='레이어 폴더',parent=null){
 page.layerFolders??=[];const valid=keys.filter(k=>order.includes(k));for(const f of page.layerFolders)f.keys=f.keys.filter(k=>!valid.includes(k));
 const folder={id:crypto.randomUUID(),name,keys:valid,parent,visible:true,locked:false,opacity:100,blendMode:'pass-through',collapsed:false};page.layerFolders.push(folder);
 if(valid.length){const top=Math.max(...valid.map(k=>order.indexOf(k))),rest=order.filter(k=>!valid.includes(k)),at=order.slice(0,top+1).filter(k=>!valid.includes(k)).length;rest.splice(at,0,...order.filter(k=>valid.includes(k)));order.splice(0,order.length,...rest);}return folder;
}
export function dissolveLayerFolder(page,id){const f=page.layerFolders?.find(f=>f.id===id);if(!f)return;const parent=page.layerFolders.find(p=>p.id===f.parent);if(parent)parent.keys.push(...f.keys);for(const child of page.layerFolders)if(child.parent===id)child.parent=f.parent;page.layerFolders=page.layerFolders.filter(p=>p!==f);}
export function folderKeys(page,id){const result=[],seen=new Set();function visit(key){if(seen.has(key))return;seen.add(key);const f=page.layerFolders?.find(f=>f.id===key);if(!f)return;result.push(...f.keys);for(const child of page.layerFolders.filter(p=>p.parent===key))visit(child.id);}visit(id);return [...new Set(result)];}
export function storeLayerComp(project,page,name){page.layerComps??=[];const cuts=project.cuts.filter(c=>!page.id||c.pageId===page.id);const comp={id:crypto.randomUUID(),name,states:cuts.map(c=>({id:c.id,visible:structuredClone(c.visible),roughVisible:c.roughVisible,pageGuidesVisible:c.pageGuidesVisible,layers:c.paintLayers.map(l=>({id:l.id,visible:l.visible,opacity:l.opacity,maskEnabled:l.mask?.enabled})),balloons:c.balloonLayers?.map(l=>({id:l.id,visible:l.visible,opacity:l.opacity}))})),folders:page.layerFolders?.map(f=>({id:f.id,visible:f.visible,opacity:f.opacity})),stack:structuredClone(page.stackSettings)};page.layerComps.push(comp);return comp;}
export function applyLayerComp(project,page,comp){for(const state of comp.states){const c=project.cuts.find(c=>c.id===state.id);if(!c)continue;c.visible={...c.visible,...state.visible};c.roughVisible=state.roughVisible;c.pageGuidesVisible=state.pageGuidesVisible;for(const l of c.paintLayers){const saved=state.layers.find(s=>s.id===l.id);l.visible=saved?.visible??false;if(saved){l.opacity=saved.opacity;if(l.mask)l.mask.enabled=saved.maskEnabled;}}for(const l of c.balloonLayers||[]){const saved=state.balloons?.find(s=>s.id===l.id);if(saved)Object.assign(l,saved);}}for(const f of page.layerFolders||[]){const saved=comp.folders?.find(s=>s.id===f.id);if(saved)Object.assign(f,saved);}if(comp.stack)page.stackSettings=structuredClone(comp.stack);}
