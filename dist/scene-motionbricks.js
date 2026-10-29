import {localLibraryService} from './library-assets.js';
// Generate once locally; playback uses the ordinary motion library and rigs.
export class SceneMotionBricks{
 constructor(library){
  this.library=library;const section=document.createElement('div');section.className='pose-motionbricks';
  section.innerHTML='<b>AI 동작 연결 · MotionBricks</b><p>위 콤보 2~8개 사이에 연결 동작을 생성합니다. 완성된 동작은 포즈집에 저장됩니다.</p><button type="button" data-connect disabled>연결 동작 생성</button><button type="button" data-preview hidden>생성 결과 미리보기</button><button type="button" data-use hidden>이 결과를 콤보에 넣기</button><p role="status">로컬 실행기를 확인합니다.</p>';
  library.panel.querySelector('.pose-combo').append(section);this.section=section;this.button=section.querySelector('[data-connect]');this.status=section.querySelector('[role=status]');this.preview=section.querySelector('[data-preview]');this.use=section.querySelector('[data-use]');
  this.button.onclick=()=>this.generate();this.preview.onclick=()=>this.library.play(this.resultRows());this.use.onclick=()=>{library.m.settings().libraryCombo=this.resultRows();library.live.cancel();library.renderCombo();library.e.queueLive();this.status.textContent='생성 결과를 콤보에 넣었습니다. 연결 재생으로 확인하세요.';};
 }
 resultRows(){const e=this.result;return e?[{id:e.id,name:e.name,start:0,end:e.duration,speed:1,blend:0}]:[];}
 async check(){if(this.busy)return;try{if(!localLibraryService())throw Error();const r=await fetch('/api/pose-library/status');if(!r.ok)throw Error();const s=await r.json();this.button.disabled=!s.motionbricks;this.status.textContent=s.motionbricks?'로컬 준비 완료 · 원래 공격은 유지하고 사이 동작만 생성':'MotionBricks 로컬 모델이 필요합니다.';}catch{this.button.disabled=true;this.status.textContent='로컬 실행판에서 연결 동작을 생성할 수 있습니다.';}}
 async generate(){
  if(this.busy)return;this.busy=true;this.button.disabled=true;this.preview.hidden=this.use.hidden=true;
  try{const steps=this.library.rows().map(({id,start,end,speed})=>({id,start,end,speed}));if(steps.length<2||steps.length>8)throw Error('먼저 위 콤보에 동작을 2~8개 추가하세요.');
   const r=await fetch('/api/pose-library/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({steps,name:'AI 연결 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})})});if(!r.ok)throw Error(await r.text());const {id}=await r.json();this.status.textContent='로컬에서 연결 생성 중… 창을 닫아도 작업은 계속됩니다.';this.poll(id);
  }catch(e){this.status.textContent=e.message;this.busy=false;this.button.disabled=false;}
 }
 poll(id){clearTimeout(this.timer);this.timer=setTimeout(async()=>{try{const r=await fetch('/api/pose-library/jobs/'+id);if(!r.ok)throw Error('연결 작업 상태를 읽지 못했습니다.');const job=await r.json();if(job.state==='failed')throw Error(job.message);if(job.state!=='done'){this.poll(id);return;}
    await this.library.refreshCatalog();this.result=this.library.store.entries.find(e=>e.id===job.entry);if(!this.result)throw Error('생성 결과를 목록에서 찾지 못했습니다.');if(!this.library.panel.hidden)this.library.renderCards();this.preview.hidden=this.use.hidden=false;this.status.textContent=`${job.metrics.duration.toFixed(1)}초 동작 저장 완료 · 결과를 미리 보고 사용하세요.`;this.busy=false;this.button.disabled=false;
   }catch(e){this.status.textContent=e.message;this.busy=false;this.button.disabled=false;}},1000);}
}
