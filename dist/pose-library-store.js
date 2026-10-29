import {validateMotion} from './pose-library-motion.js?v=20261029-anchor1';
import {classifyMotion,genres} from './pose-library-taxonomy.js?v=20261029-library1';
import {libraryCatalog,libraryClip} from './library-assets.js';

let pending;
function database(){return pending??=new Promise((resolve,reject)=>{const r=indexedDB.open('scroll-pose-library',1);r.onupgradeneeded=()=>{r.result.createObjectStore('catalog',{keyPath:'id'});r.result.createObjectStore('clips');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>{pending=null;reject(r.error);};});}
async function read(store,key){const db=await database();return new Promise((resolve,reject)=>{const r=key===undefined?db.transaction(store).objectStore(store).getAll():db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export const categories=['전체',...genres.map(([id])=>id),'Unsorted','내 포즈'];
export function categorize(name){return /sword|fight|slash|attack|punch|kick|검|격투|베기|액션/i.test(name)?'액션':/walk|run|stair|jump|걷|계단|달리/i.test(name)?'이동':/sit|lay|lie|앉|눕|누워/i.test(name)?'앉기·눕기':'일상';}
export class PoseLibraryStore{
 constructor(){this.entries=[];this.cache=new Map();this.local=false;}
 async refresh(){
  const personal=await read('catalog'),data=await libraryCatalog('pose'),local=data.entries;this.local=data.localService;
  this.entries=[...personal,...local.filter(e=>!personal.some(p=>p.id===e.id))].map(classifyMotion);return this.entries;
 }
 async clip(entry){
  if(this.cache.has(entry.id)){const c=this.cache.get(entry.id);this.cache.delete(entry.id);this.cache.set(entry.id,c);return c;}
  const clip=entry.local?await libraryClip(entry.id):await read('clips',entry.id);
  validateMotion(clip);this.cache.set(entry.id,clip);while(this.cache.size>8)this.cache.delete(this.cache.keys().next().value);return clip;
 }
 async save(clip,{name,category,genre,subcategory,kind='motion',thumbnail}={}){
  validateMotion(clip);const personal=this.entries.filter(e=>!e.local);if(personal.length>=600)throw Error('이 라이브러리는 최대 600개까지 보관합니다.');
  const id=crypto.randomUUID(),entry=classifyMotion({id,name:String(name||clip.label||'내 동작').slice(0,100),category:categories.includes(category)?category:categorize(name||clip.label||''),genre,subcategory,kind,duration:clip.duration,source:String(clip.source||'사용자 동작').slice(0,160),thumbnail});
  const db=await database();await new Promise((resolve,reject)=>{const t=db.transaction(['catalog','clips'],'readwrite');t.objectStore('catalog').put(entry);t.objectStore('clips').put(clip,id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('저장 취소'));});this.entries.unshift(entry);return entry;
 }
 async remove(entry){if(entry.local)throw Error('로컬 폴더의 동작은 원본 폴더에서 관리합니다.');const db=await database();await new Promise((resolve,reject)=>{const t=db.transaction(['catalog','clips'],'readwrite');t.objectStore('catalog').delete(entry.id);t.objectStore('clips').delete(entry.id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});this.cache.delete(entry.id);this.entries=this.entries.filter(e=>e.id!==entry.id);}
}
