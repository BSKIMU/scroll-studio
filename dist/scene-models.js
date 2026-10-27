import {figureModels,hasFigureModel,setFigureModel} from './mannequin.js?v=20261027-pose-camera1';

export function setupFigureModels(editor){
 const label=document.createElement('label'),select=document.createElement('select');
 label.textContent='모델';select.id='personModel';select.setAttribute('aria-label','인물 모델');
 for(const [key,name]of Object.entries(figureModels))select.add(new Option(name,key));
 const legacy=new Option('기존 소체','legacy');select.add(legacy);
 select.title='모델을 바꾸면 키·자세를 기본값으로 맞춥니다. 여성 165cm · 남성 180cm · Mixamo 175cm. 위치·방향은 유지합니다.';
 label.append(select);document.getElementById('personSelect').parentElement.after(label);
 select.onchange=()=>{
  editor.movement.stop();const person=editor.state?.people[editor.index];
  if(!person||!setFigureModel(person,select.value))return;
  editor.updatePeople();editor.flush();
 };
 return {sync(){const p=editor.state?.people[editor.index];select.disabled=!p;legacy.hidden=!p||hasFigureModel(p);legacy.disabled=true;select.value=hasFigureModel(p)?p.model:'legacy';}};
}
