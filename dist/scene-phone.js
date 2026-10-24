import * as T from 'three';
export function updatePhone(figure,p){
 let phone=figure.getObjectByName('held-phone');
 if(!p.phone?.hand){if(phone)phone.visible=false;return;}
 if(!phone){
  phone=new T.Group();phone.name='held-phone';
  const body=new T.Mesh(new T.BoxGeometry(.076,.153,.009),new T.MeshStandardMaterial({color:0x67566d,roughness:.5}));
  const screen=new T.Mesh(new T.BoxGeometry(.065,.13,.001),new T.MeshStandardMaterial({color:0x202933,roughness:.3}));
  screen.position.z=.005;phone.add(body,screen);
  for(const x of [-.022,-.006]){const lens=new T.Mesh(new T.CylinderGeometry(.006,.006,.002,12),new T.MeshStandardMaterial({color:0x16151b}));lens.rotation.x=Math.PI/2;lens.position.set(x,.056,-.006);phone.add(lens);}
  figure.add(phone);phone.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 }
 const hand=figure.userData.landmarks[p.phone.hand+'Hand'];phone.visible=!!hand;if(!hand)return;
 phone.position.fromArray(hand);phone.position.y+=.05;phone.position.z+=.025;
 phone.rotation.set(T.MathUtils.degToRad(p.phone.tilt??-12),T.MathUtils.degToRad(p.phone.turn??0),0);
}
export function setupPhone(e){
 const label=document.createElement('label');label.innerHTML='손 소품<select id=personPhone><option value="">없음</option><option value=left>왼손 · 휴대폰</option><option value=right>오른손 · 휴대폰</option></select>';
 document.getElementById('personSelect').closest('label').after(label);
 label.querySelector('select').onchange=event=>{const p=e.state.people[e.index];if(!p)return;p.phone={hand:event.target.value,tilt:-12};e.updatePerson();};
 const angles=document.createElement('div');angles.className='two';
 for(const [key,title,value]of [['tilt','휴대폰 기울기',-12],['turn','휴대폰 방향',0]]){
  const control=document.createElement('label');control.textContent=title+' °';
  const input=document.createElement('input');input.type='number';input.min='-180';input.max='180';input.step='5';input.value=value;input.id='phone'+key;
  input.setAttribute('aria-label',title);control.append(input);angles.append(control);
  input.onchange=()=>{const p=e.state.people[e.index];if(!p?.phone?.hand)return;p.phone[key]=T.MathUtils.clamp(Number(input.value)||0,-180,180);e.updatePerson();};
 }
 label.after(angles);
 e.syncPhone=()=>{const p=e.state?.people[e.index];for(const [key,value]of [['tilt',-12],['turn',0]]){const input=angles.querySelector('#phone'+key);input.disabled=!p?.phone?.hand;input.value=p?.phone?.[key]??value;}};
 label.querySelector('select').addEventListener('change',()=>e.syncPhone());
}
