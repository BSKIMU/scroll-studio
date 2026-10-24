import {copyDocument} from './editor-history.js?v=20261025-release1';
import {pageRole,pageSide,comicDefaults,comicGuides,bodyIndex,MAX_PAGES,MAX_CUTS} from './comic-format.js?v=20261025-release1';
export const ROLES={body:'본문',front:'앞표지','front-inside':'앞표지 안쪽','back-inside':'뒤표지 안쪽',back:'뒤표지'};
export function pageLabel(p,pg){const n=p.pages.indexOf(pg)+1;return `${n} · ${pg.name||ROLES[pageRole(pg)]||'본문'}`;}
// A right-bound manga turns its left leaf toward the right. Artwork is never mirrored.
export function pageTurn(binding,delta){const forward=(binding==='right'?-1:1)*delta,side=forward>0?'right':'left';return {side,other:side==='right'?'left':'right',rotation:-forward*Math.PI};}
export function setReadingDirection(p,binding){if(!['right','left'].includes(binding))throw Error('제본 방향을 확인하세요.');p.comic={...comicDefaults(p.comic),binding,firstSide:binding==='right'?'left':'right'};}
export function bookSpreads(p){
 const c=comicDefaults(p.comic),leading=c.binding==='left'?'left':'right',trailing=leading==='left'?'right':'left',spreads=[];
 let spread=null;
 for(const pg of p.pages){
  const side=pageSide(p,pg),role=pageRole(pg);
  if(role==='front'||role==='back'){if(spread){spreads.push(spread);spread=null;}spreads.push({left:null,right:null,[side]:pg,cover:true});continue;}
  if(!spread)spread={left:null,right:null};
  if(spread[side]){spreads.push(spread);spread={left:null,right:null};}
  spread[side]=pg;
  if(side===trailing){spreads.push(spread);spread=null;}
 }
 if(spread)spreads.push(spread);return spreads;
}
export function duplicatePage(p,id){
 const original=p.pages.find(pg=>pg.id===id);if(!original)throw Error('복제할 페이지가 없습니다.');
 const cuts=p.cuts.filter(c=>c.pageId===id);
 if(p.pages.length>=MAX_PAGES||p.cuts.length+cuts.length>MAX_CUTS)throw Error('페이지 또는 컷 수 한도에 도달했습니다.');
 const bundle=copyDocument({page:original,cuts}),ids=new Map();
 function collect(v){if(!v||typeof v!=='object')return;if(typeof v.id==='string'&&!ids.has(v.id))ids.set(v.id,crypto.randomUUID());Object.values(v).forEach(collect);}
 collect(bundle);
 const refs=new Set(['id','pageId','layerId','balloonLayerId','activeLayer','activeBalloonLayer','groupId','parentId','clipTo','fillReferenceLayerId','fillReference','selectedPerson','selectedProp']);
 function mapped(s){if(ids.has(s))return ids.get(s);return s.startsWith('paint:')?s.split(':').map(x=>ids.get(x)||x).join(':'):s;}
 function remap(v,key=''){if(typeof v==='string')return refs.has(key)||['layerOrder','roughLayerIds','children','members'].includes(key)?mapped(v):v;if(Array.isArray(v))return v.map(x=>remap(x,key));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[key==='stackSettings'?mapped(k):k,remap(x,k)]));return v;}
 const result=remap(bundle);result.page.name=(original.name||ROLES[pageRole(original)])+' 사본';result.page.role='body';
 p.pages.splice(p.pages.indexOf(original)+1,0,result.page);p.cuts.push(...result.cuts);return result.page;
}
export function movePages(p,ids,beforeId=null){const moving=p.pages.filter(pg=>ids.includes(pg.id));if(ids.includes(beforeId)||!moving.length)return false;const rest=p.pages.filter(pg=>!ids.includes(pg.id)),index=beforeId?rest.findIndex(pg=>pg.id===beforeId):rest.length;if(index<0)return false;rest.splice(index,0,...moving);p.pages=rest;return true;}
export function removePages(p,ids){if(p.pages.every(pg=>ids.includes(pg.id)))throw Error('한 페이지는 남겨야 합니다.');p.pages=p.pages.filter(pg=>!ids.includes(pg.id));p.cuts=p.cuts.filter(c=>!ids.includes(c.pageId));if(!p.pages.some(pg=>pg.id===p.activePage))p.activePage=p.pages[0].id;}
export function publicationChecks(p){
 if(p.format!=='comic')return [];
 const c=comicDefaults(p.comic),issues=[],bodies=p.pages.filter(pg=>pageRole(pg)==='body');
 if(bodies.length%2)issues.push('본문이 홀수 페이지입니다. 실제 제본에는 빈 뒷면이 추가될 수 있습니다.');
 if(bodies.length%4)issues.push('중철·접지 인쇄라면 본문 페이지 수를 4의 배수로 확인하세요.');
 if(p.dpi<300)issues.push('300dpi 미만입니다. 인쇄소의 해상도 기준을 확인하세요.');
 if(c.gutterMm<c.outerMm)issues.push('제본 안쪽 여백이 바깥쪽보다 좁습니다. 대사가 책등에 가려질 수 있습니다.');
 for(const role of ['front','front-inside','back-inside','back'])if(p.pages.filter(pg=>pageRole(pg)===role).length>1)issues.push(`${ROLES[role]}가 여러 장입니다. 페이지 역할을 확인하세요.`);
 const roles=p.pages.map(pageRole);for(const [role,expected]of [['front',0],['front-inside',1],['back-inside',p.pages.length-2],['back',p.pages.length-1]]){const i=roles.indexOf(role);if(i>=0&&i!==expected)issues.push(`${ROLES[role]} 위치를 확인하세요. 앞표지 2면 → 본문 → 뒤표지 2면 순서를 권장합니다.`);}
 for(const pg of p.pages){const g=comicGuides(p,pg)[2];let count=0;for(const cut of p.cuts.filter(x=>x.pageId===pg.id))for(const b of cut.bubbles||[]){if(!b.text?.trim())continue;const w=p.width*cut.width/100,x=(cut.x||0)+b.x*w,y=(cut.y||0)+b.y*cut.height;if(x<g.x||y<g.y||x+b.w*w>g.x+g.w||y+b.h*cut.height>g.y+g.h)count++;}if(count)issues.push(`${p.pages.indexOf(pg)+1}페이지: 대사 상자 ${count}개가 기본 테두리 밖에 있습니다. 실제 글자 위치를 확인하세요.`);}
 return issues;
}
export function folioLabel(p,pg){return pageRole(pg)==='body'?String(comicDefaults(p.comic).folioStart+bodyIndex(p,pg)):ROLES[pageRole(pg)];}
