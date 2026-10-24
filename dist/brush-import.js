export async function readSut(file){
 if(file.name.toLowerCase().endsWith('.abr')){
  if(file.size>40*1024*1024)throw Error('ABR 파일은 40MB 이하로 선택하세요.');
  const {readAbr}=await import('./vendor/abr.js');let parsed;
  try{parsed=readAbr(new Uint8Array(await file.arrayBuffer()));}catch(e){throw Error('이 ABR 버전은 읽을 수 없습니다: '+e.message);}
  if(!parsed.brushes.length)throw Error('가져올 수 있는 ABR 브러시 설정이 없습니다.');
  return parsed.brushes.slice(0,100).map(b=>({name:b.name||file.name,size:Math.max(1,Math.min(300,b.shape.size||5)),opacity:Math.round((b.toolOptions?.opacity??1)*100),hardness:Math.round((b.shape.hardness??1)*100),smoothing:Math.min(90,Math.round((b.toolOptions?.smoothingValue??.1)*100)),source:file.name,notice:'ABR 기본 설정 변환 · 샘플 팁·텍스처·이중 브러시·혼색은 미지원'}));
 }
 if(file.size>40*1024*1024)throw Error('SUT 파일은 40MB 이하로 선택하세요.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(new TextDecoder().decode(bytes.subarray(0,15))!=='SQLite format 3')throw Error('지원하는 SUT 데이터베이스가 아닙니다.');
 if(!window.initSqlJs)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./vendor/sql-wasm.js';script.onload=resolve;script.onerror=()=>reject(Error('브러시 읽기 모듈을 불러오지 못했습니다.'));document.head.append(script);});
 const SQL=await window.initSqlJs({locateFile:()=>new URL('./vendor/sql-wasm.wasm',import.meta.url).href}),db=new SQL.Database(bytes);
 try{
  const rows=db.exec('SELECT NodeName, Variant.* FROM Node JOIN Variant ON Node.NodeVariantID=Variant.VariantID WHERE BrushSize IS NOT NULL LIMIT 100');
  if(!rows.length)throw Error('이 SUT에는 지원하는 브러시 설정이 없습니다.');
  return rows[0].values.map(values=>{const r=Object.fromEntries(rows[0].columns.map((c,i)=>[c,values[i]]));return {name:r.NodeName||file.name,size:Math.max(1,Math.min(300,r.BrushSize||5)),opacity:r.Opacity??100,hardness:r.BrushHardness??100,smoothing:Math.min(90,r.BrushRevision||0),pressure:true,source:file.name,notice:'SUT 기본 설정 변환 · 전용 브러시 팁·질감·혼색·필압 곡선은 미지원',settings:{flow:r.BrushFlow,spacing:r.BrushInterval,unit:r.BrushSizeUnit}};});
 }finally{db.close();}
}
