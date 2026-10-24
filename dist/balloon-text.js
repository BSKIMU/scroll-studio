// Shared canvas/editor wrapping keeps Korean text and manual line breaks consistent.
export function balloonTextLayout(text,font,width,height,measure,{tracking=0,lineHeight=1.4,padding=.11}={}){
 const lines=[];
 for(const paragraph of String(text||'').split('\n')){
  let line='';
  for(const ch of paragraph){if(line&&measure(line+ch)+tracking*[...line].length>width*(1-2*padding)&&!/[.,!?…。、，。？！]/.test(ch)){lines.push(line);line=ch;}else line+=ch;}
  lines.push(line);
 }
 const leading=font*lineHeight;
 return {lines,lineHeight:leading,height:Math.min(height*.88,Math.max(leading,lines.length*leading))};
}

export function dialogueSession(bubble,checkpoint,save){
 let draft=String(bubble.text||''),closed=false;
 return {
  get text(){return draft;},
  update(text){if(!closed)draft=text;},
  finish(commit=true){
   if(closed)return false;closed=true;
   if(!commit||draft===String(bubble.text||''))return false;
   checkpoint();bubble.text=draft;save();return true;
  }
 };
}
