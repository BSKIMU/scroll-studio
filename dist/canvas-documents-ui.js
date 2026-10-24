export function setupCanvasDocumentTabs(api){
 const bar=document.createElement('nav');bar.id='canvasDocumentBar';bar.setAttribute('aria-label','열린 원고');
 bar.innerHTML='<div id="canvasDocumentTabs" role="tablist" aria-label="열린 캔버스"></div><button id="canvasNew" title="기존 원고를 유지하고 새 캔버스 열기">＋ 새 원고</button><button id="canvasReopen">닫은 원고</button>';
 document.getElementById('pageDocumentBar').before(bar);
 const tabs=bar.querySelector('#canvasDocumentTabs');let locked=false,lastActive=null;
 async function run(task){if(locked)return;locked=true;render();try{await task();}catch(e){api.toast(e.message);}finally{locked=false;render();}}
 const recent=document.createElement('dialog');recent.id='closedCanvases';recent.innerHTML='<div class="modal-head"><h2>닫은 원고</h2><button id="closedCanvasDismiss" aria-label="닫은 원고 목록 닫기">×</button></div><p>이 브라우저에 저장한 원고입니다. 원고를 선택해 다시 여세요.</p><div id="closedCanvasList"></div>';document.body.append(recent);
 recent.querySelector('#closedCanvasDismiss').onclick=()=>recent.close();
 function showRecent(){const list=recent.querySelector('#closedCanvasList');list.replaceChildren();for(const item of api.workspace().closed){const bt=document.createElement('button');bt.textContent=(item.format==='comic'?'출판만화 · ':'웹툰 · ')+(item.title||'이름 없는 원고');bt.onclick=()=>run(async()=>{await api.reopen(item.id);recent.close();});list.append(bt);}if(!list.childNodes.length)list.textContent='닫은 원고가 없습니다.';recent.showModal();}
 bar.querySelector('#canvasReopen').onclick=showRecent;bar.querySelector('#canvasNew').onclick=api.create;
 const welcomeRecent=document.createElement('button');welcomeRecent.id='welcomeRecentCanvases';welcomeRecent.textContent='닫은 원고 다시 열기';welcomeRecent.onclick=showRecent;document.querySelector('.welcome-bottom').append(welcomeRecent);
 function render(){
  const ws=api.workspace();tabs.replaceChildren();bar.querySelector('#canvasNew').disabled=locked;
  for(const doc of ws.documents){const item=document.createElement('div');item.className='canvas-document'+(doc.id===ws.activeId?' active':'');item.draggable=!locked;item.dataset.documentId=doc.id;
   const tab=document.createElement('button');tab.className='canvas-document-name';tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(doc.id===ws.activeId));tab.tabIndex=doc.id===ws.activeId?0:-1;tab.disabled=locked;
   tab.textContent=(doc.project.format==='comic'?'만화 · ':'웹툰 · ')+(doc.project.title||'이름 없는 원고');tab.title=tab.textContent;tab.onclick=()=>run(()=>api.activate(doc.id));
   tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=ws.documents.indexOf(doc),n=ws.documents.length,k=e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowRight'?1:-1)+n)%n;run(()=>api.activate(ws.documents[k].id)).then(()=>tabs.querySelector('[aria-selected=true]')?.focus());};
   const save=document.createElement('button');save.textContent='↓';save.title='이 원고 파일 저장';save.setAttribute('aria-label',doc.project.title+' 원고 파일 저장');save.disabled=locked;save.onclick=()=>run(()=>api.download(doc.id));
   const close=document.createElement('button');close.textContent='×';close.title='자동 저장 후 닫기 · 닫은 원고에서 복원';close.setAttribute('aria-label',doc.project.title+' 원고 닫기');close.disabled=locked;close.onclick=()=>run(()=>api.close(doc.id));
   item.append(tab,save,close);item.ondragstart=e=>e.dataTransfer.setData('application/x-scroll-document',doc.id);item.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-scroll-document'))e.preventDefault();};item.ondrop=e=>{const id=e.dataTransfer.getData('application/x-scroll-document');if(id){e.preventDefault();run(()=>api.move(id,doc.id));}};tabs.append(item);
  }
  if(lastActive!==ws.activeId){tabs.querySelector('.active')?.scrollIntoView({block:'nearest',inline:'nearest'});lastActive=ws.activeId;}
 }
 render();return {render};
}
