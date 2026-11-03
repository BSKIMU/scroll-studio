import * as T from 'three';
import {fitHandWithPlacement,handContactSurface,handSkinContact} from './hand-contact-fit.js?v=20261031-skin-contact';
import {gripFrame,placeHeldProp} from './prop-grip.js?v=20261029-curated2';
import {alignShieldForearm} from './melee-props.js?v=20261029-grip3';
import {applyHandPose} from './hand-pose.js';
import {validHand} from './hand-library-data.js';

export class SceneHandFit{
 constructor(editor){
  this.e=editor;
  const panel=this.panel=document.createElement('details');panel.id='handFitPanel';panel.className='hand-fit-panel';
  panel.innerHTML='<summary>손 맞춤 · MANO</summary><p>소품에 손가락 맞추기 · 관통 검사 후 저장</p><p class="hand-fit-safety">실제 손 표면 관통 검사<br>손가락·손바닥·손목을 검사합니다. 필요하면 소품 연결 위치를 최대 5cm 보정하며, 겹침이 남으면 적용하지 않습니다.</p><label>맞출 손 <select data-side><option value="right">오른손</option><option value="left">왼손</option><option value="both">양손</option></select></label><label>표면 여유 (mm) <input data-gap type="number" min="0" max="12" step="1" value="1"></label><label>맞춤 강도 <input data-strength type="range" min="0" max="100" value="75"><output>75%</output></label><div class="hand-fit-actions"><button type="button" data-fit>소품에 손 맞추기</button><button type="button" data-undo disabled>맞춤 되돌리기</button></div><p role="status">손에 소품을 연결한 뒤 실행하세요. 관통 방지를 위해 맞춤 강도가 높아질 수 있습니다. 손목·팔은 유지합니다.</p>';
  document.getElementById('openHandLibrary').after(panel);
  const q=s=>panel.querySelector(s);this.side=q('[data-side]');this.gap=q('[data-gap]');this.strength=q('[data-strength]');this.status=q('[role=status]');this.button=q('[data-fit]');this.undoButton=q('[data-undo]');
  this.strength.oninput=()=>q('output').textContent=this.strength.value+'%';this.button.onclick=()=>this.fit();this.undoButton.onclick=()=>this.undo();
  panel.addEventListener('keydown',e=>e.stopPropagation());
 }
 async candidates(){
  if(this.data)return this.data;
  if(!['localhost','127.0.0.1'].includes(location.hostname))throw Error('MANO 손 맞춤은 로컬 실행에서 사용할 수 있습니다.');
  const response=await fetch('/api/hand-library/mano-fit');if(!response.ok)throw Error('로컬 MANO 데이터가 준비되지 않았습니다. 서버와 MANO 설치를 확인하세요.');
  const data=await response.json();if(data.version!==1||!['left','right'].every(side=>Array.isArray(data.hands?.[side])&&data.hands[side].length>0&&data.hands[side].length<=128&&data.hands[side].every(validHand)))throw Error('MANO 손 데이터 형식이 맞지 않습니다.');
  return this.data=data.hands;
 }
 restore(person,snapshot){
  for(const key of ['handPose','equipment'])if(snapshot[key]===undefined)delete person[key];else person[key]=structuredClone(snapshot[key]);
 }
 async fit(){
  if(this.busy)return;const e=this.e,p=e.state?.people[e.index],figure=e.figures.children[e.index];
  if(!p||!figure?.userData.motionRig){this.status.textContent='손 뼈가 있는 인물을 먼저 선택하세요.';return;}
  if(!Number.isFinite(this.gap.valueAsNumber)){this.status.textContent='표면 여유를 숫자로 입력하세요.';return;}
  const options={gap:this.gap.valueAsNumber/1000,strength:Number(this.strength.value)/100};
  const check=()=>{if(e.state?.people[e.index]!==p||e.figures.children[e.index]!==figure||!e.isOpen)throw Error('선택이 변경되어 맞춤을 취소했습니다.');};
  this.busy=true;this.button.disabled=true;this.undoButton.disabled=true;let snapshot;
  this.status.textContent='실제 손 표면과 소품의 겹침을 검사하고 맞춤 위치를 찾고 있습니다…';
  try{
   const data=await this.candidates();check();
   e.movement.stop();e.flush();e.props.update();figure.updateMatrixWorld(true);
   snapshot={handPose:structuredClone(p.handPose),equipment:structuredClone(p.equipment)};
   const slots=e.props.held.get(figure),sides=this.side.value==='both'?['right','left']:[this.side.value],results=[];
   for(const side of sides){
    const own=slots?.get(side),item=own||(p.propHandsLinked!==false?slots?.get('right'):null);
    if(!item?.root||(side==='left'&&!own&&!['Rifle','Pistol','SMG','Shotgun','Sniper','LMG'].includes(item.category)))throw Error((side==='left'?'왼손':'오른손')+' 소품을 먼저 연결하고 로딩이 끝난 뒤 실행하세요.');
    const owner=own?side:'right',setting=p.equipment[owner];
    const result=await fitHandWithPlacement(figure,item.root,side,data[side],options,{
     offset:setting.offset,adjust:!!own,check,yield:()=>new Promise(resolve=>setTimeout(resolve,0)),
     place:offset=>{const value={...setting,offset};placeHeldProp(item.root,figure,owner,gripFrame(p,owner,item.category),value);alignShieldForearm(item.root,figure,owner,value);}
    });
    check();results.push({side,item,...result});
    setting.offset=result.offset;p.handPose??={};p.handPose[side]={id:'mano-contact-fit',name:'소품에 맞춘 손',joints:result.joints};
    applyHandPose(figure,p);e.props.update();figure.updateMatrixWorld(true);
   }
   e.updatePerson({pose:true});figure.updateMatrixWorld(true);
   // Validate the final attached geometry, after the normal gun/shield constraints.
   for(const {side,item}of results){
    const wrist=figure.userData.motionRig.bones[(side==='left'?'Left':'Right')+'Hand'],scale=wrist.getWorldScale(new T.Vector3());
    const unit=(Math.abs(scale.x)+Math.abs(scale.y)+Math.abs(scale.z))/3;
    if(handSkinContact(figure,wrist,handContactSurface(item.root,wrist))(null,options.gap/unit))throw Error('최종 연결 상태에서 손 표면의 겹침이 남아 맞춤을 취소했습니다. 소품·손목 위치를 조정하세요.');
   }
   this.previous={person:p,...snapshot};snapshot=null;
   e.flush();e.hands?.sync();e.props.syncFields();
   this.status.textContent=results.map(r=>r.side==='left'?'왼손':'오른손').join(' · ')+' 실제 손 표면 검사 통과 · 맞춤을 저장했습니다. 자세나 소품을 바꾸면 다시 맞춰주세요.';
  }catch(error){
   if(snapshot){this.restore(p,snapshot);if(e.state?.people[e.index]===p){e.updatePerson({pose:true});e.flush();e.props.syncFields();}}
   this.status.textContent=error.message;
  }finally{this.busy=false;this.button.disabled=false;this.undoButton.disabled=!this.previous;}
 }
 undo(){const e=this.e,p=e.state?.people[e.index];if(!this.previous||this.previous.person!==p){this.status.textContent='맞춤을 적용했던 인물을 선택하세요.';return;}e.movement.stop();e.flush();this.restore(p,this.previous);this.previous=null;this.undoButton.disabled=true;e.updatePerson({pose:true});e.flush();e.hands?.sync();e.props.syncFields();this.status.textContent='맞춤 전 손 모양과 소품 연결 위치로 되돌렸습니다.';}
}
