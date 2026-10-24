export const mmToPx=(mm,dpi)=>Math.round(mm*dpi/25.4);
export const MAX_PAGES=200,MAX_CUTS=2000;
export function comicDefaults(c={}){
 const m=c.innerMarginMm??12,binding=c.binding??'right';
 return {paperWidthMm:210,paperHeightMm:297,trimWidthMm:182,trimHeightMm:257,bleedMm:3,innerMarginMm:m,
  gutterMm:m,outerMm:m,topMm:m,bottomMm:m,binding,firstSide:binding==='right'?'left':'right',showGuides:true,
  folio:false,folioStart:1,folioSizePt:9,folioInsetMm:6,spineMm:3,...c};
}
export function comicConfig(values){
 const c=comicDefaults(values.comic),{paperWidthMm:w,paperHeightMm:h,trimWidthMm:tw,trimHeightMm:th,bleedMm:b,innerMarginMm:m}=c;
 if(![w,h,tw,th,b,m,values.dpi,c.gutterMm,c.outerMm,c.topMm,c.bottomMm,c.spineMm,c.folioStart,c.folioSizePt,c.folioInsetMm].every(Number.isFinite)||Math.min(w,h,tw,th)<=0||Math.min(b,m,c.gutterMm,c.outerMm,c.topMm,c.bottomMm,c.spineMm,c.folioInsetMm)<0)throw Error('용지와 여백 크기를 확인하세요.');
 if(tw+2*b>w+.001||th+2*b>h+.001)throw Error('용지는 재단 크기와 양쪽 도련을 모두 포함해야 합니다.');
 if(m*2>=Math.min(tw,th))throw Error('안쪽 여백은 재단 크기의 절반보다 작아야 합니다.');
 if(c.gutterMm+c.outerMm>=tw||c.topMm+c.bottomMm>=th)throw Error('여백을 제외한 기본 테두리 안쪽에 그릴 공간이 있어야 합니다.');
 if(!['left','right'].includes(c.binding)||!['left','right'].includes(c.firstSide))throw Error('제본 방향과 시작 면을 확인하세요.');
 if(!Number.isInteger(c.folioStart)||c.folioStart<1||c.folioStart>9999||c.folioSizePt<6||c.folioSizePt>36||c.folioInsetMm>=th/2||c.spineMm>100)throw Error('쪽 번호 또는 책등 설정 범위를 확인하세요.');
 const width=mmToPx(w,values.dpi),pageHeight=mmToPx(h,values.dpi);
 if(width>8192||pageHeight>20000||width<320||pageHeight<320)throw Error('변환된 크기는 가로 320–8192px, 세로 320–20000px 범위여야 합니다.');
 return {...values,format:'comic',width,pageHeight,comic:c};
}
export const pageRole=pg=>pg?.role||'body';
export function bodyIndex(p,pg){return (p.pages||[]).filter(x=>pageRole(x)==='body').findIndex(x=>x.id===pg?.id);}
export function pageSide(p,pg){
 const c=comicDefaults(p.comic),front=c.binding==='left'?'right':'left',back=front==='left'?'right':'left',r=pageRole(pg);
 if(r==='front'||r==='back-inside')return front;
 if(r==='back'||r==='front-inside')return back;
 const i=Math.max(0,bodyIndex(p,pg));return i%2?(c.firstSide==='left'?'right':'left'):c.firstSide;
}
export function comicGuides(p,pg=p.pages?.find(x=>x.id===p.activePage)){
 if(p.format!=='comic'||!p.comic)return [];
 const c=comicDefaults(p.comic),sx=p.width/c.paperWidthMm,sy=p.pageHeight/c.paperHeightMm,x=(c.paperWidthMm-c.trimWidthMm)/2,y=(c.paperHeightMm-c.trimHeightMm)/2;
 const left=pageSide(p,pg)==='right'?c.gutterMm:c.outerMm,right=pageSide(p,pg)==='right'?c.outerMm:c.gutterMm;
 return [{kind:'bleed',label:'도련 바깥선',x:(x-c.bleedMm)*sx,y:(y-c.bleedMm)*sy,w:(c.trimWidthMm+c.bleedMm*2)*sx,h:(c.trimHeightMm+c.bleedMm*2)*sy},
  {kind:'trim',label:'재단선',x:x*sx,y:y*sy,w:c.trimWidthMm*sx,h:c.trimHeightMm*sy},
  {kind:'inner',label:'기본 테두리 · 제본 안쪽 여백',x:(x+left)*sx,y:(y+c.topMm)*sy,w:(c.trimWidthMm-left-right)*sx,h:(c.trimHeightMm-c.topMm-c.bottomMm)*sy}];
}
export function folioInfo(p,pg){
 const c=comicDefaults(p.comic),index=bodyIndex(p,pg);if(p.format!=='comic'||!c.folio||index<0||pg.hideFolio)return null;
 const trim=comicGuides(p,pg)[1],inset=c.folioInsetMm*p.width/c.paperWidthMm;
 return {text:String(c.folioStart+index),x:pageSide(p,pg)==='left'?trim.x+inset:trim.x+trim.w-inset,y:trim.y+trim.h-c.folioInsetMm*p.pageHeight/c.paperHeightMm,size:c.folioSizePt*p.dpi/72};
}
export function drawFolio(ctx,p,pg,scale=1,offsetX=0,offsetY=0){const f=folioInfo(p,pg);if(!f)return;ctx.save();ctx.fillStyle='#111';ctx.font=`${f.size*scale}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(f.text,(f.x-offsetX)*scale,(f.y-offsetY)*scale);ctx.restore();}
export function appendComicGuides(p,paper){
 if(p.format!=='comic')return;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('comic-page-guides');svg.setAttribute('viewBox',`0 0 ${p.width} ${p.pageHeight}`);svg.setAttribute('aria-label','출판만화 도련 · 재단선 · 기본 테두리');
 if(p.comic?.showGuides!==false)for(const g of comicGuides(p)){const rect=document.createElementNS(ns,'rect');for(const [key,value]of Object.entries({x:g.x,y:g.y,width:g.w,height:g.h}))rect.setAttribute(key,value);rect.dataset.guide=g.kind;const title=document.createElementNS(ns,'title');title.textContent=g.label;rect.append(title);svg.append(rect);}
 const f=folioInfo(p,p.pages?.find(x=>x.id===p.activePage));if(f){const t=document.createElementNS(ns,'text');t.textContent=f.text;for(const [k,v]of Object.entries({x:f.x,y:f.y,'font-size':f.size,'text-anchor':'middle',fill:'#111','font-family':'sans-serif'}))t.setAttribute(k,v);svg.append(t);}paper.append(svg);
}
// Output crops are measured from the original manuscript, never by resizing its art.
export function printRegion(p,pg,mode='trim'){
 const c=comicDefaults(p.comic),trim=comicGuides(p,pg)[1],sx=p.width/c.paperWidthMm,sy=p.pageHeight/c.paperHeightMm;
 if(mode==='paper')return {x:0,y:0,w:p.width,h:p.pageHeight,widthMm:c.paperWidthMm,heightMm:c.paperHeightMm};
 const b=mode==='kdp'?3.175:mode==='bleed'?c.bleedMm:0;
 if(b>c.bleedMm+.001)throw Error(`이 출력에는 ${b}mm 도련이 필요합니다. 원고 설정에서 도련과 용지를 넓혀 주세요.`);
 const left=mode==='kdp'?(pageSide(p,pg)==='left'?b:0):b,right=mode==='kdp'?(pageSide(p,pg)==='right'?b:0):b;
 return {x:trim.x-left*sx,y:trim.y-b*sy,w:(c.trimWidthMm+left+right)*sx,h:(c.trimHeightMm+2*b)*sy,widthMm:c.trimWidthMm+left+right,heightMm:c.trimHeightMm+2*b};
}

