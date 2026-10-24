importScripts('./vendor/sql-wasm.js','./vendor/fflate.js');
const sql=initSqlJs({locateFile:()=>new URL('./vendor/sql-wasm.wasm',self.location.href).href});
const text=new TextDecoder(),MAX_DB=64*1024*1024;
function rows(db,query){const result=db.exec(query)[0];return result?result.values.map(v=>Object.fromEntries(result.columns.map((k,i)=>[k,v[i]]))):[];}
async function database(file){
 const head=new Uint8Array(await file.slice(0,24).arrayBuffer());
 if(text.decode(head.subarray(0,15))==='SQLite format 3'){if(file.size>MAX_DB)throw Error('관리 파일이 너무 큽니다.');return new Uint8Array(await file.arrayBuffer());}
 if(text.decode(head.subarray(0,8))!=='CSFCHUNK')throw Error('지원하는 CMC/CLIP 파일이 아닙니다.');
 let position=24,windowStart=-1,windowBytes;
 for(let count=0;position+16<=file.size&&count<100000;count++){
  if(windowStart<0||position<windowStart||position+16>windowStart+windowBytes.length){windowStart=position;windowBytes=new Uint8Array(await file.slice(position,position+65536).arrayBuffer());}
  const offset=position-windowStart,type=text.decode(windowBytes.subarray(offset,offset+8)),length=Number(new DataView(windowBytes.buffer,windowBytes.byteOffset+offset+8,8).getBigUint64(0));
  if(!Number.isSafeInteger(length)||position+16+length>file.size)throw Error('파일 저장이 끝나지 않았거나 손상된 CLIP입니다.');
  if(type==='CHNKSQLi'){if(length>MAX_DB)throw Error('페이지 정보가 지원 크기를 초과합니다.');return new Uint8Array(await file.slice(position+16,position+16+length).arrayBuffer());}
  position+=16+length;
 }
 throw Error('CLIP의 페이지 정보를 찾지 못했습니다.');
}
async function read(file,kind){
 const SQL=await sql,db=new SQL.Database(await database(file));
 try{
  if(kind==='book'){
   const project=rows(db,'SELECT * FROM Project LIMIT 1')[0],nodes=rows(db,'SELECT MainId,NextIndex,FirstChildIndex,LinkPath FROM CanvasNode'),map=new Map(nodes.map(n=>[n.MainId,n])),pages=[],seen=new Set();
   const walk=id=>{while(id){if(seen.has(id))throw Error('CMC 페이지 연결이 순환합니다.');seen.add(id);const n=map.get(id);if(!n)throw Error('CMC 페이지 연결이 누락되었습니다.');if(n.LinkPath)pages.push({path:n.LinkPath});if(n.FirstChildIndex)walk(n.FirstChildIndex);id=n.NextIndex;}};
   walk(project.ProjectRootCanvasNode);if(pages.length>300)throw Error('한 작품은 300페이지까지 지원합니다.');return {pages};
  }
  const c=rows(db,'SELECT CanvasWidth,CanvasHeight,CanvasResolution,CanvasRootFolder FROM Canvas LIMIT 1')[0],preview=rows(db,'SELECT ImageData,ImageWidth,ImageHeight FROM CanvasPreview LIMIT 1')[0];
  if(!c||!preview||!preview.ImageData)throw Error('저장된 페이지 미리보기가 없습니다.');
  if(preview.ImageWidth*preview.ImageHeight>24000000)throw Error('미리보기 해상도가 너무 큽니다.');
  const blob=new Blob([preview.ImageData],{type:'image/png'});
  if(kind==='preview')return {blob};
  const layers=rows(db,'SELECT MainId,LayerName,LayerOpacity,LayerVisibility,LayerFolder,LayerFirstChildIndex,LayerNextIndex FROM Layer LIMIT 3000');
  const bitmap=await createImageBitmap(blob),width=Math.min(96,bitmap.width),height=Math.max(1,Math.round(bitmap.height*width/bitmap.width)),canvas=new OffscreenCanvas(width,height);canvas.getContext('2d').drawImage(bitmap,0,0,width,height);bitmap.close();
  return {width:c.CanvasWidth,height:c.CanvasHeight,dpi:c.CanvasResolution,root:c.CanvasRootFolder,layers,previewWidth:preview.ImageWidth,previewHeight:preview.ImageHeight,thumb:await canvas.convertToBlob({type:'image/webp',quality:.75})};
 }finally{db.close();}
}
let queue=Promise.resolve();
self.onmessage=e=>{queue=queue.then(async()=>{const {id,kind,file}=e.data;try{
 if(kind==='zip'){
  if(file.size>256*1024*1024)throw Error('ZIP은 256MB 이하로 선택하세요. 큰 작품은 폴더 연결을 사용하세요.');
  let total=0,count=0;const files=fflate.unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:item=>{if(!/\.(cmc|clip)$/i.test(item.name))return false;total+=item.originalSize;count++;if(total>512*1024*1024||count>350)throw Error('압축 해제 크기가 큽니다. 폴더 연결을 사용하세요.');return true;}});
  self.postMessage({id,result:{files:Object.entries(files).map(([path,data])=>({path,file:new File([data],path.split('/').pop(),{lastModified:0})}))}});
 }else self.postMessage({id,result:await read(file,kind)});
 }catch(error){self.postMessage({id,error:error.message});}});};
