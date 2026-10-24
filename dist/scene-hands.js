export function setupHandControls(editor){
 const panel=document.createElement('details');panel.className='hand-pose';panel.open=true;
 panel.innerHTML='<summary>손 모양</summary><div class="hand-presets"><button data-grip="0">편 손</button><button data-grip="35">가볍게 쥠</button><button data-grip="100">주먹</button></div>';
 const inputs=[],fingerInputs=[];
 const sideSelect=document.createElement('select');sideSelect.setAttribute('aria-label','손 모양 적용 대상');for(const [key,name]of [['both','양손'],['left','왼손'],['right','오른손']])sideSelect.add(new Option(name,key));panel.append(sideSelect);
 const extra=document.createElement('div');extra.className='hand-presets';for(const [name,values]of [['V 손',[80,0,0,100,100]],['가리키기',[75,0,100,100,100]],['엄지 척',[0,100,100,100,100]]]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{const p=editor.state?.people[editor.index];if(!p)return;p.fingers||={};for(const side of sideSelect.value==='both'?['left','right']:[sideSelect.value])p.fingers[side]=Object.fromEntries(['Thumb','Index','Middle','Ring','Pinky'].map((key,i)=>[key,values[i]]));editor.updatePerson({pose:true});sync();editor.flush();};extra.append(b);}panel.append(extra);
 for(const [side,name]of [['left','왼손'],['right','오른손']]){
  const row=document.createElement('label');row.textContent=name+' 굽힘';const out=document.createElement('output'),input=document.createElement('input');
  input.type='range';input.min=0;input.max=100;input.step=1;input.id='handGrip-'+side;input.setAttribute('aria-label',name+' 손가락 굽힘');row.append(out,input);panel.append(row);inputs.push({input,out,side});
  input.oninput=()=>{const person=editor.state?.people[editor.index];if(!person)return;person.hands??={};person.hands[side]=Number(input.value);delete person.fingers?.[side];editor.updatePerson({pose:true});sync();};
  input.onchange=()=>editor.flush();
  const detail=document.createElement('details');detail.className='hand-fingers';detail.innerHTML='<summary>'+name+' 손가락별 조절</summary>';panel.append(detail);for(const [finger,label]of [['Thumb','엄지'],['Index','검지'],['Middle','중지'],['Ring','약지'],['Pinky','새끼']]){const row=document.createElement('label'),input=document.createElement('input');input.type='range';input.min=0;input.max=100;input.setAttribute('aria-label',name+' '+label+' 굽힘');row.append(label,input);detail.append(row);fingerInputs.push({input,side,finger});input.oninput=()=>{const p=editor.state?.people[editor.index];if(!p)return;p.fingers||={};p.fingers[side]||={};p.fingers[side][finger]=+input.value;editor.updatePerson({pose:true});};input.onchange=()=>editor.flush();}
 }
 for(const button of panel.querySelectorAll('[data-grip]')){
  button.title='양손에 적용';button.onclick=()=>{const person=editor.state?.people[editor.index];if(!person)return;person.hands||={};for(const side of sideSelect.value==='both'?['left','right']:[sideSelect.value]){person.hands[side]=Number(button.dataset.grip);delete person.fingers?.[side];}editor.updatePerson({pose:true});sync();editor.flush();};
 }
 const reset=document.createElement('button');reset.textContent='원래 손 모양';reset.title='손 조절을 해제하고 현재 포즈·모션의 손 모양으로 복원';reset.onclick=()=>{const person=editor.state?.people[editor.index];if(!person)return;delete person.hands;delete person.fingers;editor.updatePerson({pose:true});sync();editor.flush();};panel.append(reset);
 document.getElementById('pose').parentElement.after(panel);
 function sync(){
  const person=editor.state?.people[editor.index],enabled=!!person&&person.model==='mixamo'&&!editor.movement?.active;
  for(const {input,out,side}of inputs){const value=person?.hands?.[side];input.value=Number.isFinite(value)?Math.max(0,Math.min(100,value)):0;input.disabled=!enabled;out.textContent=Number.isFinite(value)?input.value+'%':'원래 포즈';}
  for(const {input,side,finger}of fingerInputs){input.value=person?.fingers?.[side]?.[finger]??person?.hands?.[side]??0;input.disabled=!enabled;}
  panel.querySelectorAll('button').forEach(button=>button.disabled=!enabled);
 }
 sync();return {sync};
}
