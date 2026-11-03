// Connected-color selection, bounded to four million samples on long pages.
export function connectedMask(source,point,tolerance=32){
 const ratio=Math.min(1,Math.sqrt(4000000/(source.width*source.height))),w=Math.max(1,Math.round(source.width*ratio)),h=Math.max(1,Math.round(source.height*ratio));
 const out=document.createElement('canvas');out.width=w;out.height=h;const ctx=out.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,w,h);
 const input=ctx.getImageData(0,0,w,h).data,result=ctx.createImageData(w,h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
 const start=Math.min(h-1,Math.max(0,Math.floor(point[1]*h)))*w+Math.min(w-1,Math.max(0,Math.floor(point[0]*w)));let head=0,tail=1;queue[0]=start;seen[start]=1;
 const matches=n=>{for(let c=0;c<4;c++)if(Math.abs(input[n*4+c]-input[start*4+c])>tolerance)return false;return true;};
 while(head<tail){const n=queue[head++];if(!matches(n))continue;result.data.set([255,255,255,255],n*4);const x=n%w;for(const m of [x?n-1:-1,x<w-1?n+1:-1,n-w,n+w])if(m>=0&&m<w*h&&!seen[m]){seen[m]=1;queue[tail++]=m;}}
 ctx.putImageData(result,0,0);return out;
}
