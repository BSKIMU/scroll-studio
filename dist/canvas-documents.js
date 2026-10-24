import {EditorHistory} from './editor-history.js?v=20261025-release1';

// Only the active manuscript owns DOM canvases / a 3D editor. Other tabs retain data and history.
export class CanvasDocuments{
 constructor(){this.documents=[];this.activeId=null;this.closed=[];}
 get active(){return this.documents.find(d=>d.id===this.activeId)||null;}
 add(project,view={},id=crypto.randomUUID()){
  const existing=this.documents.find(d=>d.id===id);if(existing){this.activeId=id;return existing;}
  const doc={id,project,view,history:new EditorHistory(),revision:0,savedRevision:-1};
  this.documents.push(doc);this.activeId=id;this.closed=this.closed.filter(d=>d.id!==id);return doc;
 }
 capture(project,view,history){const doc=this.active;if(doc){doc.project=project;doc.view=view;doc.history=history;}return doc;}
 activate(id){if(!this.documents.some(d=>d.id===id))throw Error('열린 원고를 찾을 수 없습니다.');this.activeId=id;return this.active;}
 close(id){
  const index=this.documents.findIndex(d=>d.id===id);if(index<0)return this.active;
  const [doc]=this.documents.splice(index,1);this.closed=this.closed.filter(d=>d.id!==id);
  this.closed.unshift({id,title:doc.project.title,format:doc.project.format,closedAt:Date.now()});
  if(id===this.activeId)this.activeId=this.documents[Math.min(index,this.documents.length-1)]?.id||null;
  return this.active;
 }
 move(id,beforeId){const doc=this.documents.find(d=>d.id===id);if(!doc||id===beforeId)return;this.documents=this.documents.filter(d=>d!==doc);const index=this.documents.findIndex(d=>d.id===beforeId);this.documents.splice(index<0?this.documents.length:index,0,doc);}
 manifest(){return {version:1,activeId:this.activeId,tabs:this.documents.map(d=>d.id),closed:this.closed};}
}

export const documentKey=id=>'canvas:'+id;
export function readStored(db,key){return new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function restoreCanvasDocuments(db,validate){
 const workspace=new CanvasDocuments(),manifest=await readStored(db,'canvas-workspace'),errors=[];
 if(manifest?.version===1&&Array.isArray(manifest.tabs)){
  for(const id of [...new Set(manifest.tabs)]){try{const record=await readStored(db,documentKey(id));if(!record?.project)throw Error('저장 자료 없음');const doc=workspace.add(validate(record.project),record.view||{},id);doc.savedRevision=0;}catch(e){errors.push(id);}}
  workspace.closed=Array.isArray(manifest.closed)?manifest.closed:[];
  // A damaged record remains recoverable; never silently replace it with a blank manuscript.
  for(const id of errors)workspace.closed.push({id,title:'불러오지 못한 원고',format:'',closedAt:Date.now()});
  if(workspace.documents.some(d=>d.id===manifest.activeId))workspace.activeId=manifest.activeId;
 }else{
  const legacy=await readStored(db,'latest');if(legacy)workspace.add(validate(legacy));
 }
 return {workspace,errors};
}
export function persistCanvasDocuments(db,workspace,records=[]){
 if(!db)return Promise.reject(Error('이 기기에 자동 저장할 수 없습니다. 원고 파일을 저장해 주세요.'));
 // IndexedDB clones at put(), so a subsequent switch cannot retarget this write.
 return new Promise((resolve,reject)=>{try{
  const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects');
  for(const doc of records)store.put({project:doc.project,view:doc.view},documentKey(doc.id));
  store.put(workspace.manifest(),'canvas-workspace');
  tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('자동 저장을 완료하지 못했습니다.'));
 }catch(e){reject(e);}});
}
