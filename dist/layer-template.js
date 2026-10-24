// Layer names based on the supplied CLIP template; blank editable layers only.
export const templateKey='scroll-webtoon-template-v1';
export const webtoonLayers=[
 ['스케치','콘티 펜슬',undefined,100],['스케치','인물 스케치2','#ed8888',45],['스케치','스케치3','#86c494',45],
 ['배경 채색','밑색'],['배경 채색','그림자'],['배경 채색','효과'],
 ['인물 채색','피부'],['인물 채색','머리카락'],['인물 채색','옷'],['인물 채색','소품'],['인물 채색','그림자'],
 ['펜터치','배경주선'],['펜터치','인물속선'],['펜터치','인물주선'],
 ['연출','인물 조명'],['연출','etc'],['효과음','효과음(검)','#20242b',100,'#ffffff'],['효과음','효과음(흰)','#ffffff',100,'#20242b']
].map(([group,name,displayColor,opacity=100,outline])=>({group,name,displayColor,opacity,outline,outlineWidth:outline?2:0,visible:true,locked:false}));
export function blankLayerStyle(l){const keys=['id','name','group','opacity','visible','locked','keepVisible','displayColor','outline','outlineWidth','blendMode','expression','threshold','reference','draft','paletteColor'];return Object.fromEntries(keys.filter(k=>l[k]!==undefined).map(k=>[k,l[k]]));}
export function templateLayers(source=webtoonLayers){return source.map(l=>({...blankLayerStyle(l),id:crypto.randomUUID()}));}
export function defaultLayers(){return templateLayers([{name:'레이어 1',opacity:100,visible:true,locked:false,keepVisible:true}]);}
export function planTemplate(cuts,source=webtoonLayers){
 if(!Array.isArray(source)||!source.length||source.length>30||source.some(l=>typeof l.name!=='string'||!l.name.trim()||!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>100))throw Error('템플릿의 이름·불투명도·레이어 수를 확인하세요.');
 const plan=cuts.map(c=>({cut:c,missing:source.filter(l=>!(c.paintLayers||[]).some(p=>p.name===l.name&&p.group===l.group))}));
 const blocked=plan.find(p=>(p.cut.paintLayers?.length||0)+p.missing.length>30);if(blocked)throw Error((blocked.cut.name||'컷')+'의 레이어가 30장을 넘습니다. 아무 컷도 변경하지 않았습니다.');return plan;
}
export function commitTemplate(plan){let changed=0;for(const {cut,missing} of plan){if(!missing.length)continue;cut.paintLayers??=[];cut.paintLayers.unshift(...templateLayers(missing.filter(l=>l.group==='스케치')));cut.paintLayers.push(...templateLayers(missing.filter(l=>l.group!=='스케치')));cut.activeLayer??=cut.paintLayers.find(l=>l.group==='스케치')?.id||cut.paintLayers[0].id;changed++;}return changed;}
export function projectSummary(p){const cuts=p.cuts||[];return {pages:p.pages?.length||0,cuts:cuts.filter(c=>!c.pageBase).length,paintLayers:cuts.reduce((n,c)=>n+(c.paintLayers?.length||0),0),assets:Object.keys(p.assets||{}).length,people:cuts.reduce((n,c)=>n+(c.scene?.people?.length||0),0),orphanStrokes:cuts.reduce((n,c)=>n+(c.strokes||[]).filter(s=>!(c.paintLayers||[]).some(l=>l.id===(s.layerId||'rough'))).length,0),width:p.width,pageHeight:p.pageHeight,dpi:p.dpi};}
