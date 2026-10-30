export function backgroundLocked(editor,object){
 if(editor.state?.backgroundLocked===false||!object)return false;
 const props=[...(editor.doors?.items||[]),...(editor.stairs?.items||[]),...(editor.props?.items||[])];
 for(let node=object;node;node=node.parent){
  if(props.some(p=>p.root===node)||node===editor.figures)return false;
  if(node===editor.environment)return true;
 }
 return false;
}
export function setupBackgroundLock(editor,panel){
 const button=document.createElement('button');button.id='backgroundLock';button.className='full';button.type='button';button.textContent='배경 고정';button.setAttribute('aria-pressed','false');
 button.title='배경 선택과 변형을 잠급니다. 인물과 추가 사물은 계속 조절할 수 있습니다.';
 const floorRow=panel.querySelector('#groundEnvironment')?.closest('.two');if(floorRow)floorRow.after(button);else panel.append(button);
 function sync(){const locked=editor.state?.backgroundLocked!==false;button.textContent=locked?'배경 고정됨 · 해제':'배경 고정';button.setAttribute('aria-pressed',String(locked));button.classList.toggle('active',locked);const scope=document.getElementById('backgroundSelection');if(scope)scope.disabled=locked;for(const id of ['environmentHeight','groundEnvironment','resetEnvironmentHeight']){const el=document.getElementById(id);if(el)el.disabled=locked;}}
 button.onclick=()=>{
  editor.flush();const g=editor.gizmo;
  editor.state.backgroundLocked=editor.state.backgroundLocked===false;
  if(g.objectTarget&&(g.objectTarget.members||[g.objectTarget.object]).some(o=>backgroundLocked(editor,o))){
   if(g.keyboard?.active)g.keyboard.finish(false);g.objectTarget=null;g.transform.detach();editor.advanced.selected=-1;editor.advanced.list();g.sync();
  }
  sync();editor.advanced.objectFields();editor.transformCommit=true;editor.queueLive();editor.apply({live:true});editor.invalidate();
 };
 return {sync};
}
