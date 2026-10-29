const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function comboTiming(items){
 const segments=[];
 for(const item of items){
  const duration=item.clip?.duration??item.duration??item.end;
  const start=clamp(Number(item.start)||0,0,duration-.001),end=clamp(Number(item.end)||duration,start+.001,duration),speed=clamp(Number(item.speed)||1,.25,3),length=(end-start)/speed;
  const prev=segments.at(-1),overlap=prev?clamp(Number(item.blend)||0,0,Math.min(prev.length,length)*.45):0;
  segments.push({start,end,speed,length,overlap,at:prev?prev.at+prev.length-overlap:0});
 }
 return {segments,duration:segments.length?segments.at(-1).at+segments.at(-1).length:0};
}
