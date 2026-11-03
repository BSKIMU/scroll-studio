export function affinePoint(p,b,t={}){const a=(t.angle||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=(p[0]-b.x-b.w/2)*(t.sx??1),y=(p[1]-b.y-b.h/2)*(t.sy??1);return [b.x+b.w/2+(t.dx||0)+c*x-s*y,b.y+b.h/2+(t.dy||0)+s*x+c*y];}
export function transformContext(ctx,b,t={}){ctx.translate(b.x+b.w/2+(t.dx||0),b.y+b.h/2+(t.dy||0));ctx.rotate((t.angle||0)*Math.PI/180);ctx.scale(t.sx??1,t.sy??1);ctx.translate(-b.x-b.w/2,-b.y-b.h/2);}
export function alphaBounds(cv,threshold=0){const {width:w,height:h}=cv,ctx=cv.getContext('2d',{willReadFrequently:true});let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y+=128){const rows=Math.min(128,h-y),data=ctx.getImageData(0,y,w,rows).data;for(let i=3;i<data.length;i+=4)if(data[i]>threshold){const n=(i-3)/4,x=n%w,yy=y+Math.floor(n/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,yy);y1=Math.max(y1,yy);}}return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
export function combineMask(target,addition,mode='replace'){const ctx=target.getContext('2d');if(mode==='replace')ctx.clearRect(0,0,target.width,target.height);ctx.save();ctx.globalCompositeOperation={subtract:'destination-out',intersect:'destination-in'}[mode]||'source-over';ctx.drawImage(addition,0,0,target.width,target.height);ctx.restore();return target;}
export function maskOutline(cv,width=cv.width,height=cv.height){const w=cv.width,h=cv.height,data=cv.getContext('2d').getImageData(0,0,w,h).data,sx=width/w,sy=height/h,on=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&data[(y*w+x)*4+3]>=128;let d='';for(let y=0;y<=h;y++){let start=-1;for(let x=0;x<=w;x++){const edge=x<w&&on(x,y-1)!==on(x,y);if(edge&&start<0)start=x;if(!edge&&start>=0){d+=`M${start*sx} ${y*sy}H${x*sx}`;start=-1;}}}for(let x=0;x<=w;x++){let start=-1;for(let y=0;y<=h;y++){const edge=y<h&&on(x-1,y)!==on(x,y);if(edge&&start<0)start=y;if(!edge&&start>=0){d+=`M${x*sx} ${start*sy}V${y*sy}`;start=-1;}}}return d;}
export function splitPixels(source,mask,make){const selected=make(source.width,source.height),rest=make(source.width,source.height);for(const [cv,op]of [[selected,'destination-in'],[rest,'destination-out']]){const ctx=cv.getContext('2d');ctx.drawImage(source,0,0);ctx.globalCompositeOperation=op;ctx.drawImage(mask,0,0,cv.width,cv.height);ctx.globalCompositeOperation='source-over';}return {selected,rest};}
// Interactive transforms keep only the selected fragment, and reuse the source
// surface for the stationary remainder instead of retaining three full pages.
export function liftPixels(source,mask,make){const temp=make(source.width,source.height),ctx=temp.getContext('2d');ctx.drawImage(source,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,temp.width,temp.height);const box=alphaBounds(temp);if(!box){temp.width=1;return null;}const selected=make(box.w,box.h);selected.getContext('2d').drawImage(temp,box.x,box.y,box.w,box.h,0,0,box.w,box.h);temp.width=1;const rest=source,rc=rest.getContext('2d');rc.globalCompositeOperation='destination-out';rc.drawImage(mask,0,0,source.width,source.height);rc.globalCompositeOperation='source-over';return {selected,rest,box};}
// Bilinear quad mapping; inverse sampling avoids seams between triangulated tiles.
export function quadPoint(q,u,v){return [0,1].map(k=>(1-v)*((1-u)*q[0][k]+u*q[1][k])+v*((1-u)*q[3][k]+u*q[2][k]));}
export function warpSelection(source,q,make){
 const x=Math.floor(Math.min(...q.map(p=>p[0]))),y=Math.floor(Math.min(...q.map(p=>p[1]))),w=Math.ceil(Math.max(...q.map(p=>p[0])))-x,h=Math.ceil(Math.max(...q.map(p=>p[1])))-y;
 const scale=Math.min(1,Math.sqrt(4000000/Math.max(1,w*h))),canvas=make(Math.max(1,Math.ceil(w*scale)),Math.max(1,Math.ceil(h*scale))),ctx=canvas.getContext('2d'),out=ctx.createImageData(canvas.width,canvas.height),src=source.getContext('2d').getImageData(0,0,source.width,source.height).data;
 const a=q[0],b=[q[1][0]-a[0],q[1][1]-a[1]],c=[q[3][0]-a[0],q[3][1]-a[1]],d=[q[2][0]-q[1][0]-q[3][0]+a[0],q[2][1]-q[1][1]-q[3][1]+a[1]];
 for(let py=0;py<canvas.height;py++)for(let px=0;px<canvas.width;px++){
  const tx=x+(px+.5)*w/canvas.width-a[0],ty=y+(py+.5)*h/canvas.height-a[1];let u=.5,v=.5;
  for(let n=0;n<8;n++){const ex=b[0]*u+c[0]*v+d[0]*u*v-tx,ey=b[1]*u+c[1]*v+d[1]*u*v-ty,j0=b[0]+d[0]*v,j1=c[0]+d[0]*u,j2=b[1]+d[1]*v,j3=c[1]+d[1]*u,det=j0*j3-j1*j2;if(Math.abs(det)<1e-9)break;u-=(ex*j3-ey*j1)/det;v-=(ey*j0-ex*j2)/det;}
  if(u<0||u>1||v<0||v>1)continue;
  const sx=Math.max(0,Math.min(source.width-1,u*source.width-.5)),sy=Math.max(0,Math.min(source.height-1,v*source.height-.5)),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,oi=(py*canvas.width+px)*4;let alpha=0;const rgb=[0,0,0];
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const si=(Math.min(source.height-1,iy+dy)*source.width+Math.min(source.width-1,ix+dx))*4,weight=(dx?fx:1-fx)*(dy?fy:1-fy),aw=src[si+3]*weight;alpha+=aw;for(let k=0;k<3;k++)rgb[k]+=src[si+k]*aw;}
  for(let k=0;k<3;k++)out.data[oi+k]=alpha?rgb[k]/alpha:0;out.data[oi+3]=alpha;
 }
 ctx.putImageData(out,0,0);return {canvas,x,y,w,h};
}
