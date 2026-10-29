// Mixamo's visible genre list is the primary taxonomy; activity tags refine it.
export const genres=[['Combat','전투'],['Adventure','모험'],['Sport','스포츠'],['Dance','댄스'],['Fantasy','판타지'],['Superhero','슈퍼히어로'],['Skinning Test','리깅 테스트']];
export const activities=[['Sword','검술'],['Firearms','사격'],['Unarmed','맨손 격투'],['Archery','궁술'],['Melee','근접 무기'],['Locomotion','이동'],['Everyday','일상'],['Sitting','앉기·눕기']];
export const activityLabel=id=>activities.find(([key])=>key===id)?.[1]||id;
const combatKinds=['Sword','Firearms','Unarmed','Archery','Melee'];
export function matchesLibraryFilter(entry,id){
 const text=[entry.name,entry.pack].join(' '),combat=entry.genre==='Combat'||combatKinds.includes(entry.subcategory);
 if(id==='all')return true;
 if(id==='combat')return combat;
 if(id==='mine')return entry.kind==='pose';
 if(id==='shield')return combat&&/shield|방패/i.test(text);
 if(id==='axe')return combat&&/axe|도끼/i.test(text);
 if(id==='Melee')return entry.subcategory==='Melee'&&!/axe|도끼/i.test(text);
 return entry.subcategory===id;
}
export function libraryFilters(entries){
 const definitions=[['all','전체'],['combat','전투'],['Firearms','총',true],['Shield','방패',true],['Sword','검',true],['axe','도끼',true],['Unarmed','맨손',true],['Archery','활',true],['Melee','기타 무기',true],['Locomotion','걷기·달리기'],['Sitting','앉기·눕기'],['Everyday','일상'],['mine','내 포즈']];
 return definitions.map(([id,label,child])=>{if(id==='Shield')id='shield';return {id,label,child,count:entries.filter(e=>matchesLibraryFilter(e,id)).length};}).filter(f=>f.id==='all'||f.count);
}
export function classifyMotion(entry){
 const text=[entry.name,entry.pack,entry.source,entry.category].filter(Boolean).join(' ');
 let subcategory=entry.subcategory;
 if(!activities.some(([key])=>key===subcategory)){
  subcategory=/sword|sabre|saber|검술|검 |베기|찌르기/i.test(text)?'Sword':/rifle|pistol|shoot|firearm|reload|gun|사격|총/i.test(text)?'Firearms':/bow|archery|궁술/i.test(text)?'Archery':/axe|dagger|spear|melee/i.test(text)?'Melee':/fight|punch|kick|capoeira|boxing|mma|격투|주먹|발차기/i.test(text)?'Unarmed':/sit|lay|lie|앉|눕|누워/i.test(text)?'Sitting':/walk|run|stair|jump|걷|계단|달리/i.test(text)?'Locomotion':'Everyday';
 }
 let genre=entry.genre;
 if(!genres.some(([key])=>key===genre))genre=['Sword','Firearms','Unarmed','Archery','Melee'].includes(subcategory)?'Combat':/skinning|리깅/i.test(text)?'Skinning Test':/superhero|super hero|슈퍼히어로/i.test(text)?'Superhero':/magic|spell|wizard|판타지|마법/i.test(text)?'Fantasy':/danc|hip hop|rumba|samba|댄스|춤/i.test(text)?'Dance':/sport|soccer|golf|basketball|fitness|운동|스포츠/i.test(text)?'Sport':/climb|adventure|모험/i.test(text)||subcategory==='Locomotion'?'Adventure':'Unsorted';
 return {...entry,genre,subcategory};
}
