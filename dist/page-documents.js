import {bookSpreads} from './publication-model.js?v=20261025-release1';
import {comicDefaults,pageRole} from './comic-format.js?v=20261025-release1';

export function pageName(p,pg){
 if(!pg)return '빈 면';
 return ({front:'표지','front-inside':'표지(뒤)',back:'뒤표지','back-inside':'뒤표지(뒤)'})[pageRole(pg)]||String(p.pages.indexOf(pg)+1);
}
// Editing the outer cover is a pair; reading a bound book still starts with a single front cover.
export function editorSpreads(p){
 const spreads=bookSpreads(p),covers=spreads.filter(s=>s.cover),inside=spreads.filter(s=>!s.cover);
 const front=p.pages.find(pg=>pageRole(pg)==='front'),back=p.pages.find(pg=>pageRole(pg)==='back');
 if(!front&&!back)return inside;
 const rtl=comicDefaults(p.comic).binding==='right';
 const outer={left:(rtl?front:back)||null,right:(rtl?back:front)||null,outer:true};
 const used=new Set([front?.id,back?.id]);
 return [outer,...inside,...covers.filter(s=>[s.left,s.right].some(pg=>pg&&!used.has(pg.id)))];
}
export function spreadFor(p,id){return editorSpreads(p).find(s=>s.left?.id===id||s.right?.id===id);}
export function assignExistingCovers(p){
 if(p.format!=='comic'||p.pages.length<4)throw Error('출판만화 4페이지 이상에서 표지를 지정할 수 있습니다.');
 if(p.pages.some(pg=>pageRole(pg)!=='body'))throw Error('이미 표지가 있습니다. 페이지 역할에서 조정하세요.');
 for(const [pg,role]of [[p.pages[0],'front'],[p.pages[1],'front-inside'],[p.pages.at(-2),'back-inside'],[p.pages.at(-1),'back']])pg.role=role;
}
export function placeNewBodyPage(p,pg,afterId){
 const after=p.pages.find(item=>item.id===afterId);p.pages=p.pages.filter(item=>item!==pg);
 let index=after?p.pages.indexOf(after)+1:p.pages.length;
 if(p.format==='comic'&&after){
  if(['front','front-inside'].includes(pageRole(after))){index=p.pages.findIndex(item=>!['front','front-inside'].includes(pageRole(item)));}
  if(['back','back-inside'].includes(pageRole(after))){index=p.pages.findIndex(item=>['back','back-inside'].includes(pageRole(item)));}
 }
 p.pages.splice(index<0?p.pages.length:index,0,pg);
}
export function viewPages(p,view){
 const pg=p.pages.find(pg=>pg.id===view?.pageId);if(!pg)return [];
 return view.spread?[spreadFor(p,pg.id)?.left,spreadFor(p,pg.id)?.right]:[pg];
}
export function viewLabel(p,view){
 const pair=viewPages(p,view),name=pair.length===2?pair.map(pg=>pageName(p,pg)).join(' · '):pageName(p,pair[0]);
 return `${name} / ${p.pages.length}`;
}
export function createPageDocuments(){
 let tabs=[],active=null;
 const key=(p,id,spread)=>spread?'spread:'+viewPages(p,{pageId:id,spread:true}).filter(Boolean).map(pg=>pg.id).sort().join(':'):'page:'+id;
 function open(p,id,spread=false){
  if(!p.pages?.some(pg=>pg.id===id))return;
  const k=key(p,id,spread);let tab=tabs.find(t=>t.key===k);
  if(!tab){tab={key:k,pageId:id,spread};tabs.push(tab);}else tab.pageId=id;
  active=tab;return tab;
 }
 function sync(p){
  const ids=new Set(p.pages?.map(pg=>pg.id));
  tabs=tabs.filter(t=>ids.has(t.pageId));
  // Reordering can change a spread's partner. Resolve its members from the current manuscript.
  for(const t of tabs)t.key=key(p,t.pageId,t.spread);
  tabs=tabs.filter((t,i)=>tabs.findIndex(other=>other.key===t.key)===i);
  if(!tabs.includes(active))active=null;
  if(!active)open(p,p.activePage,p.format==='comic');
  else if(active.pageId!==p.activePage)open(p,p.activePage,false);
  return {tabs,active};
 }
 function close(p,k){
  const index=tabs.findIndex(t=>t.key===k);if(index<0||tabs.length===1)return active;
  const [removed]=tabs.splice(index,1);if(removed===active)active=tabs[Math.min(index,tabs.length-1)];
  return active;
 }
 function snapshot(){return {tabs:tabs.map(({pageId,spread})=>({pageId,spread})),active:tabs.indexOf(active)};}
 function restore(p,saved){tabs=[];active=null;for(const tab of saved?.tabs||[])open(p,tab.pageId,!!tab.spread);active=tabs[saved?.active]||null;sync(p);}
 return {open,sync,close,snapshot,restore,get active(){return active;},get tabs(){return tabs;}};
}
