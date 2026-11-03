// Stored bytes are counted once per asset; cuts only refer to its ID.
export function backgroundBytes(asset){
 if(Number.isFinite(asset?.byteLength))return asset.byteLength;
 const data=asset?.data||'',i=data.indexOf(',');
 return data.startsWith('data:')?Math.max(0,Math.floor((data.length-i-1)*3/4)-(data.endsWith('==')?2:data.endsWith('=')?1:0)):0;
}
export function backgroundUsage(project,id){return (project.cuts||[]).filter(c=>c.scene?.asset===id).length;}
export async function backgroundDigest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function matchingBackground(assets,digest,data){return Object.values(assets).find(a=>(digest&&a.digest===digest)||(data&&a.data===data));}
const size=n=>n?`${(n/1048576).toFixed(1)} MB`:'선택 시 불러오기';
export function showBackgroundLibrary({project,assets,select,importFile}){
 let dialog=document.getElementById('library');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='library';document.body.append(dialog);}
 dialog.replaceChildren();dialog.style.cssText='width:min(660px,90vw);max-height:85vh;overflow:hidden';
 const header=document.createElement('div');header.className='modal-head';
 const title=document.createElement('h2');title.textContent='배경 라이브러리';
 const close=document.createElement('button');close.textContent='닫기';close.onclick=()=>dialog.close();header.append(title,close);
 const info=document.createElement('p');info.textContent='배경은 한 번 저장하고 여러 컷에서 공유합니다. 편집 중인 배경 하나만 3D로 불러옵니다.';
 const summary=document.createElement('p');summary.textContent=`원고에 저장된 배경 ${Object.keys(project.assets).length}개 · 파일 합계 ${(Object.values(project.assets).reduce((n,a)=>n+backgroundBytes(a),0)/1048576).toFixed(1)} MB`;
 const add=document.createElement('button');add.className='primary full';add.textContent='＋ 배경 파일 추가 · SKP / BLEND / GLB';add.onclick=importFile;
 const search=document.createElement('input');search.placeholder='배경 이름 검색';search.setAttribute('aria-label','배경 이름 검색');search.style.cssText='width:100%;margin:12px 0';
 const list=document.createElement('div');list.id='assetList';list.style.cssText='overflow-y:auto;max-height:48vh;overscroll-behavior:contain';
 const builtins=[['school-corridor','학교 복도 · 창가'],['interaction-room','상호작용 방'],['room','스튜디오'],['castle','성문 · 샘플'],['empty','빈 공간']].map(([id,name])=>({id,name,builtin:true}));
 const rows=[...builtins,...Object.values(assets)];
 function render(){list.replaceChildren();for(const a of rows.filter(a=>a.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()))){
  const card=document.createElement('div');card.className='asset-card';
  const label=document.createElement('b');label.textContent=a.name;
  const meta=document.createElement('small');meta.textContent=`${a.builtin?'기본 공간':size(backgroundBytes(a))} · ${backgroundUsage(project,a.id)}개 컷에서 사용`;
  if(a.attribution)meta.textContent+=` · ${a.attribution.author} · ${a.attribution.license}`;
  label.append(meta);const button=document.createElement('button');button.textContent='이 컷에 배치';button.onclick=()=>{dialog.close();select(a.id);};card.append(label,button);list.append(card);
 }if(!list.children.length)list.textContent='검색한 배경이 없습니다.';}
 search.oninput=render;dialog.append(header,info,summary,add,search,list);render();if(!dialog.open)dialog.showModal();
}
