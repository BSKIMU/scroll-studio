export function nextLayerName(project,extra=[]){
 let next=1;for(const l of [...(project.cuts||[]).flatMap(c=>c.paintLayers||[]),...extra]){const match=/^레이어\s*(\d+)$/.exec(l.name||'');if(match)next=Math.max(next,+match[1]+1);}return '레이어 '+next;
}
// Rename only newly created default layers, never existing or user-named layers.
export function numberNewLayers(project,cut){cut.paintLayers??=defaultLayers();const added=[];for(const layer of cut.paintLayers){if(/^레이어\s*\d+$/.test(layer.name))layer.name=nextLayerName(project,added);added.push(layer);}}
import {defaultLayers} from './layer-template.js?v=20261025-release1';
