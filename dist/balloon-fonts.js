const loaded=new Map();
export const balloonFontFamily=key=>({
 sans:'"Noto Sans KR","Malgun Gothic",sans-serif',
 serif:'"Batang","Noto Serif KR",serif',
 myeongjo:'"Scroll Nanum Myeongjo","Batang",serif',
 round:'"Gulim",sans-serif',mono:'"D2Coding",monospace'
}[key]||(/^font-[a-f0-9-]+$/.test(key)?`"${key}",sans-serif`:'sans-serif'));
export async function loadProjectFonts(project){
 for(const font of project.fonts||[]){
  if(!/^font-[a-f0-9-]+$/.test(font.id)||!/^data:/.test(font.data)||font.data.length>20e6)continue;
  if(!loaded.has(font.id)){
   const face=new FontFace(font.id,`url("${font.data}")`);
   loaded.set(font.id,face.load().then(f=>document.fonts.add(f)).catch(()=>loaded.delete(font.id)));
  }
 }
 await Promise.all([...loaded.values(),document.fonts.load('800 24px "Scroll Nanum Myeongjo"')]);
}
