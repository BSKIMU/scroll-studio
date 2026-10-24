import assert from 'node:assert/strict';
import {CanvasDocuments,restoreCanvasDocuments,persistCanvasDocuments,documentKey} from '../dist/canvas-documents.js';
import {createPageDocuments} from '../dist/page-documents.js';
// Asynchronous storage adapter: clone at put(), finish later, as IndexedDB does.
class MemoryDB{
 data=new Map();
 transaction(){const pending=[],tx={objectStore:()=>({get:key=>{const r={};queueMicrotask(()=>{r.result=structuredClone(this.data.get(key));r.onsuccess?.();});return r;},put:(value,key)=>{pending.push([key,structuredClone(value)]);}})};queueMicrotask(()=>{for(const [k,v]of pending)this.data.set(k,v);tx.oncomplete?.();});return tx;}
}
const db=new MemoryDB(),ws=new CanvasDocuments();
const manuscript=(title,format)=>({title,format,pages:[{id:title+'1'},{id:title+'2'}],activePage:title+'1',cuts:[{id:title,strokes:[]}]});
const a=ws.add(manuscript('웹툰','webtoon'),{},'a');a.history.checkpoint(a.project,'웹툰');a.project.cuts[0].strokes.push({color:'red'});
const pages=createPageDocuments();pages.sync(a.project);pages.open(a.project,'웹툰2');a.project.activePage='웹툰2';
ws.capture(a.project,{zoom:.42,pageTabs:pages.snapshot()},a.history);
const pending=persistCanvasDocuments(db,ws,[a]);
const b=ws.add(manuscript('만화','comic'),{},'b');b.history.checkpoint(b.project,'만화');b.project.cuts[0].strokes.push({color:'blue'});
await pending;await persistCanvasDocuments(db,ws,[b]);
assert.equal(db.data.get(documentKey('a')).project.title,'웹툰','Pending autosave must remain bound to outgoing document');
ws.activate('a');pages.restore(a.project,a.view.pageTabs);assert.equal(pages.active.pageId,'웹툰2');assert.equal(pages.tabs.length,2);const restored=a.history.undo(a.project,'웹툰');a.project=restored.project;
assert.equal(a.project.cuts[0].strokes.length,0);assert.equal(b.project.cuts[0].strokes.length,1,'Undo is manuscript-local');
assert.equal(b.history.past.length,1);
await persistCanvasDocuments(db,ws,[a]);ws.move('b','a');await persistCanvasDocuments(db,ws);
let loaded=await restoreCanvasDocuments(db,x=>x);assert.deepEqual(loaded.workspace.documents.map(d=>d.id),['b','a']);assert.equal(loaded.workspace.activeId,'a');assert.equal(loaded.workspace.active.view.zoom,.42);assert.equal(loaded.workspace.documents[0].project.cuts[0].strokes.length,1);
ws.close('b');assert.equal(ws.activeId,'a');await persistCanvasDocuments(db,ws);assert(db.data.has(documentKey('b')),'Closing is not deleting');
loaded=await restoreCanvasDocuments(db,x=>x);assert.equal(loaded.workspace.closed[0].id,'b');assert.equal(loaded.workspace.documents.length,1);
ws.close('a');await persistCanvasDocuments(db,ws);loaded=await restoreCanvasDocuments(db,x=>x);assert.equal(loaded.workspace.documents.length,0,'Do not resurrect legacy on all-tabs-closed');
const saved=db.data.get(documentKey('b'));ws.add(saved.project,saved.view,'b');assert.equal(ws.closed.length,1);assert.equal(ws.active.project.cuts[0].strokes[0].color,'blue');
const legacyDB=new MemoryDB();legacyDB.data.set('latest',manuscript('이전 원고','webtoon'));loaded=await restoreCanvasDocuments(legacyDB,x=>x);assert.equal(loaded.workspace.active.project.title,'이전 원고');assert(legacyDB.data.has('latest'),'Migration must retain legacy backup');
db.data.delete(documentKey('a'));db.data.set('canvas-workspace',{version:1,tabs:['a','b'],activeId:'a',closed:[]});loaded=await restoreCanvasDocuments(db,x=>x);assert.deepEqual(loaded.errors,['a']);assert.equal(loaded.workspace.activeId,'b');assert.equal(loaded.workspace.closed[0].id,'a');
await assert.rejects(persistCanvasDocuments(null,ws),/자동 저장/);
console.log('PASS: mixed documents, isolated undo, page/view restore, pending save isolation, order, close/reopen, reload, legacy migration and missing-record recovery');
