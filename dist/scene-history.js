import {EditorHistory,copyDocument} from './editor-history.js?v=20261025-release1';

const fields=['scene','background','guide','sceneProjection','guideLayout'];
export function captureScene(cut){
 return Object.fromEntries(fields.filter(key=>Object.hasOwn(cut,key)).map(key=>[key,copyDocument(cut[key])]));
}
export function restoreSceneFields(cut,snapshot){
 for(const key of fields){if(Object.hasOwn(snapshot,key))cut[key]=copyDocument(snapshot[key]);else delete cut[key];}
 return cut;
}
// Canvas history owns strokes, layers, cut geometry and ordering. Existing cuts
// retain their latest scene and its render, even when travelling through old ink.
export function keepCurrentScenes(snapshot,current){
 const cuts=new Map(current.cuts.map(c=>[c.id,c]));
 for(const cut of snapshot.cuts){const latest=cuts.get(cut.id);if(latest)restoreSceneFields(cut,latest);}
 snapshot.defaultScene=copyDocument(current.defaultScene);
 snapshot.assets={...snapshot.assets,...current.assets};
 return snapshot;
}
export class SceneHistories{
 constructor(){this.documents=new WeakMap();}
 forCut(documentHistory,id){
  let cuts=this.documents.get(documentHistory);if(!cuts){cuts=new Map();this.documents.set(documentHistory,cuts);}
  if(!cuts.has(id))cuts.set(id,new EditorHistory());return cuts.get(id);
 }
}
