// Reuse the document renderer (including clipping and erasers) at thumbnail
// resolution. This never captures or opens a live 3D scene.
export async function drawLayerThumbnail(parts,target,getLayers,pageWidth){
 const ctx=target.getContext('2d');ctx.clearRect(0,0,target.width,target.height);
 if(!parts.length)return;
 const positioned=parts.length>1;
 const rects=parts.map(({cut})=>({x:positioned?(cut.x||0):0,y:positioned?(cut.y||0):0,w:pageWidth*cut.width/100,h:cut.height}));
 const left=Math.min(...rects.map(r=>r.x)),top=Math.min(...rects.map(r=>r.y));
 const width=Math.max(...rects.map(r=>r.x+r.w))-left,height=Math.max(...rects.map(r=>r.y+r.h))-top;
 const scale=Math.min(1,512/Math.max(width,height)),source=document.createElement('canvas');
 source.width=Math.max(1,Math.ceil(width*scale));source.height=Math.max(1,Math.ceil(height*scale));
 const paint=source.getContext('2d',{willReadFrequently:true});
 try{
  for(let i=0;i<parts.length;i++){
   const {cut,ids}=parts[i],r=rects[i];
   for(const id of ids){
    const layers=await getLayers(cut,scale,false,{},id);
    for(const layer of layers){
     paint.drawImage(layer.canvas,(r.x-left)*scale,(r.y-top)*scale,r.w*scale,r.h*scale);
     layer.canvas.width=1;
    }
   }
  }
  const {data}=paint.getImageData(0,0,source.width,source.height);
  let x0=source.width,y0=source.height,x1=-1,y1=-1;
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
   if(data[(y*source.width+x)*4+3]<4)continue;
   x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
  }
  if(x1<0)return;
  const w=x1-x0+1,h=y1-y0+1,k=Math.min((target.width-8)/w,(target.height-8)/h);
  ctx.drawImage(source,x0,y0,w,h,(target.width-w*k)/2,(target.height-h*k)/2,w*k,h*k);
 }finally{source.width=1;}
}
