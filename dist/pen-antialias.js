const SIZE=256;
// Coverage is adjusted on small CPU masks, never by reading the visible GPU
// canvas. Middle keeps native Canvas coverage; soft brush falloff is separate.
export function drawAntialiased(ctx,stroke,w,h,options,paint){
 const mode=stroke.antialias;if(!['none','weak','strong'].includes(mode)||stroke.brush==='airbrush'||stroke.fillRuns||stroke.kind==='fill')return false;
 const points=stroke.points.slice(Math.max(0,(options.start||0)-2),Math.min(stroke.points.length,options.end??Infinity));
 if(!points.length)return true;
 const blur=stroke.size*w/1000*(1-(stroke.hardness??100)/100)*.45,HALO=Math.ceil(blur*3)+2;
 const radius=stroke.size*w/2000+HALO+1;let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const p of points){left=Math.min(left,p[0]*w-radius);right=Math.max(right,p[0]*w+radius);top=Math.min(top,p[1]*h-radius);bottom=Math.max(bottom,p[1]*h+radius);}
 const m=ctx.getTransform(),det=m.a*m.d-m.b*m.c;
 if(!det)return true;
 const corners=[[0,0],[ctx.canvas.width,0],[0,ctx.canvas.height],[ctx.canvas.width,ctx.canvas.height]].map(([x,y])=>[(m.d*(x-m.e)-m.c*(y-m.f))/det,(-m.b*(x-m.e)+m.a*(y-m.f))/det]);
 left=Math.max(Math.floor(left),Math.floor(Math.min(...corners.map(p=>p[0])))-HALO);right=Math.min(Math.ceil(right),Math.ceil(Math.max(...corners.map(p=>p[0])))+HALO);
 top=Math.max(Math.floor(top),Math.floor(Math.min(...corners.map(p=>p[1])))-HALO);bottom=Math.min(Math.ceil(bottom),Math.ceil(Math.max(...corners.map(p=>p[1])))+HALO);
 if(right<=left||bottom<=top)return true;
 // The same world-aligned masks are used by both full export and live tiles.
 // Changing their origin changes native path coverage at fractional edges.
 left=Math.floor(left/SIZE)*SIZE;top=Math.floor(top/SIZE)*SIZE;
 const mask=document.createElement('canvas');mask.width=mask.height=SIZE+HALO*2;
 const mc=mask.getContext('2d',{willReadFrequently:true}),n=mask.width;
 const soft=blur>.2?document.createElement('canvas'):null;if(soft)soft.width=soft.height=n;
 const hard={...stroke,antialias:'middle',opacity:100,hardness:100,erase:false,color:'#ffffff'};
 for(let y=top;y<bottom;y+=SIZE)for(let x=left;x<right;x+=SIZE){
  mask.width=n;mc.save();mc.translate(HALO-x,HALO-y);paint(mc,[hard],w,h,options);mc.restore();
  const image=mc.getImageData(0,0,n,n),data=image.data,source=mode==='strong'?new Uint8ClampedArray(data):data;
  for(let yy=1;yy<n-1;yy++)for(let xx=1;xx<n-1;xx++){
   const i=(yy*n+xx)*4,a=source[i+3];
   let coverage=mode==='none'?(a>=128?255:0):Math.max(0,Math.min(255,(a-64)*2));
   if(mode==='strong'){
    coverage=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)coverage+=source[((yy+dy)*n+xx+dx)*4+3]*(dx===0?6:1)*(dy===0?6:1);coverage/=64;
   }
   data[i]=data[i+1]=data[i+2]=255;data[i+3]=coverage;
  }
  mc.putImageData(image,0,0);mc.globalCompositeOperation='source-in';mc.fillStyle=stroke.color;mc.fillRect(0,0,n,n);mc.globalCompositeOperation='source-over';
  if(soft){soft.width=n;const sc=soft.getContext('2d');sc.filter=`blur(${blur}px)`;sc.drawImage(mask,0,0);}
  ctx.save();ctx.imageSmoothingEnabled=mode!=='none';const tw=Math.min(SIZE,right-x),th=Math.min(SIZE,bottom-y);ctx.drawImage(soft||mask,HALO,HALO,tw,th,x,y,tw,th);ctx.restore();
 }
 mask.width=1;if(soft)soft.width=1;return true;
}
