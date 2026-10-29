export const gunCategories=new Set(['Rifle','Pistol','SMG','Shotgun','Sniper','LMG']);
export function equippedWeapon(person,entries){
 for(const side of ['right','left']){const item=person?.equipment?.[side],entry=entries.find(e=>e.id===item?.id);if(entry&&entry.category!=='Shield')return {side,id:entry.id,type:gunCategories.has(entry.category)?'gun':entry.category==='Axe'?'axe':'sword',category:entry.category};}
 return {type:'unarmed',id:'',side:'right'};
}
export function motionWeapon(entry){
 if(['gun','sword','axe','unarmed'].includes(entry?.weaponType))return entry.weaponType;
 const text=[entry?.name,entry?.pack].join(' ');
 return /sword|검술|검 |검격/.test(text.toLowerCase())?'sword':/axe/i.test(text)?'axe':/rifle|shooter|pistol|handgun|총|사격/i.test(text)?'gun':'unarmed';
}
// Keep a compatible authored combo; a different equipped weapon starts a new
// weapon-specific queue. Never substitute a sword for an equipped firearm.
export function weaponCombo(entries,rows,weapon,{defaults=false}={}){
 if(!defaults&&rows.length&&rows.every(row=>{const e=entries.find(e=>e.id===row.id);return e&&motionWeapon(e)===weapon.type;}))return rows;
 const patterns={gun:/^(firing|shooting|shoot)\b/i,sword:/^(great sword slash|sword and shield attack)(?: \(\d+\))?$/i,axe:/^standing melee (?:attack (?:horizontal|downward|backhand)|combo attack)/i,unarmed:/^(martelo|bencao|pontera|meia lua de frente)/i};
 return entries.filter(e=>motionWeapon(e)===weapon.type&&patterns[weapon.type].test(e.name)).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,3).map(e=>({id:e.id,name:e.name,start:0,end:e.duration,speed:1,blend:.18}));
}
