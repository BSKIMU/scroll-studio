import {figureModels,hasFigureModel,setFigureModel,loadFigureModel} from './mannequin.js?v=20261029-hands2';

export function setupFigureModels(editor){
 const label=document.createElement('label'),select=document.createElement('select');
 label.textContent='모델';select.id='personModel';select.setAttribute('aria-label','인물 모델');
 for(const [key,name]of Object.entries(figureModels))select.add(new Option(name,key));
 const legacy=new Option('기존 소체','legacy');select.add(legacy);
 select.title='모델을 바꾸면 키·자세를 기본값으로 맞춥니다. 여성 165cm · 남성 180cm · Mixamo 175cm. 위치·방향은 유지합니다.';
 label.append(select);document.getElementById('personSelect').parentElement.after(label);
 select.onchange=async()=>{
  editor.movement.stop();const person=editor.state?.people[editor.index];
  if(!person)return;const key=select.value;select.disabled=true;
  try{await loadFigureModel(key);if(!editor.state.people.includes(person)||!setFigureModel(person,key))return;editor.updatePeople();editor.flush();}
  catch(error){select.value=person.model;document.getElementById('liveStatus').textContent=error.message;}
  finally{select.disabled=false;}
 };
 return {sync(){for(const [key,name]of Object.entries(figureModels))if(![...select.options].some(o=>o.value===key))select.add(new Option(name,key));const p=editor.state?.people[editor.index];select.disabled=!p;legacy.hidden=!p||hasFigureModel(p);legacy.disabled=true;select.value=hasFigureModel(p)?p.model:'legacy';}};
}
