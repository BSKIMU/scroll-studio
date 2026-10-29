import {gunProfiles} from './prop-grip-profiles.js?v=20261029-grip3';
const empty=id=>({id,offset:[0,0,0],rotation:[0,0,0],scale:1});

// Library selection reuses an already held item. Changing hands transfers it;
// a different item in the destination hand swaps back instead of disappearing.
export function equipProp(person,id,side){
 const equipment=person.equipment??={},other=side==='left'?'right':'left';
 if(equipment[other]?.id===id){
  const moving=equipment[other],displaced=equipment[side];
  equipment[side]=moving;
  if(displaced&&displaced.id!==id)equipment[other]=displaced;else delete equipment[other];
 }else equipment[side]=equipment[side]?.id===id?equipment[side]:empty(id);
 if(person.phone?.hand===side)person.phone.hand='';
 return equipment[side];
}

export function moveHeldProp(person,from,to){
 const item=person?.equipment?.[from];if(item&&from!==to)equipProp(person,item.id,to);
 return person?.equipment?.[to];
}

// Older library buttons created loose copies without an explicit detach action.
// Reattach those to a free hand, retaining explicit scene placements and overflow.
export function reconnectLegacyProps(state,catalog){
 const people=state.people||[];if(!people.length)return;
 state.props=(state.props||[]).filter(data=>{
  if(data.interactionDetached||!catalog.some(e=>e.id===data.asset))return true;
  const p=[...people].sort((a,b)=>distance(a)-distance(b))[0];
  function distance(p){return (p.x-(data.position?.[0]||0))**2+(p.z-(data.position?.[2]||0))**2;}
  if(Object.values(p.equipment||{}).some(e=>e.id===data.asset))return false;
  const side=!p.equipment?.right?'right':!p.equipment?.left?'left':null;if(!side)return true;
  equipProp(p,data.asset,side);return false;
 });
}

// Firearms have one supported hold: right grip, left support. Normalize older
// saved left-handed or duplicate equipment without creating loose scene copies.
export function normalizeFirearmHands(person){
 const gear=person?.equipment;if(!gear)return false;
 const item=gunProfiles[gear.right?.id]?gear.right:gunProfiles[gear.left?.id]?gear.left:null;
 if(!item)return false;
 if(gear.right===item&&!gear.left)return false;
 person.equipment={right:gear.right===item?item:{...item,offset:[0,0,0],rotation:[0,0,0]}};
 if(person.phone?.hand)person.phone.hand='';
 return true;
}
