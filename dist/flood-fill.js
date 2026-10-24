// Scanline flood fill: stores spans instead of one point per pixel.
export function floodSpans(data,w,h,x,y,tolerance=24,options={}){
 x=Math.max(0,Math.min(w-1,Math.floor(x)));y=Math.max(0,Math.min(h-1,Math.floor(y)));
 const at=(y*w+x)*4,source=Array.from(data.slice(at,at+4)),seen=new Uint8Array(w*h),queue=[[x,y]],spans=[];
 const match=(px,py)=>{const n=py*w+px;if(seen[n])return false;const i=n*4;if(source[3]<8)return data[i+3]<(options.alphaThreshold??8);return Math.abs(data[i+3]-source[3])<=tolerance&&Math.max(...source.slice(0,3).map((v,k)=>Math.abs(v-data[i+k])))<=tolerance;};
 while(queue.length){const [sx,sy]=queue.pop();if(!match(sx,sy))continue;let a=sx,b=sx;while(a>0&&match(a-1,sy))a--;while(b<w-1&&match(b+1,sy))b++;for(let px=a;px<=b;px++)seen[sy*w+px]=1;spans.push([sy/h,a/w,(b+1)/w]);if(spans.length>250000)throw Error('영역이 너무 복잡합니다. 확대하거나 올가미 채색을 사용하세요.');for(const ny of [sy-1,sy+1])if(ny>=0&&ny<h){let open=false;for(let px=a;px<=b;px++){const hit=match(px,ny);if(hit&&!open)queue.push([px,ny]);open=hit;}}}
 const expand=Math.max(0,Math.min(8,Math.round(options.expand||0)));
 if(expand){
  // Grow beneath antialiased lines, but never walk through their opaque core.
  let edge=[];
  for(let n=0;n<seen.length;n++)if(seen[n]){
   const px=n%w,py=Math.floor(n/w);
   if((px&& !seen[n-1])||(px<w-1&&!seen[n+1])||(py&&!seen[n-w])||(py<h-1&&!seen[n+w]))edge.push(n);
  }
  for(let step=0;step<expand&&edge.length;step++){
   const next=[];
   for(const n of edge){const px=n%w,py=Math.floor(n/w);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const xx=px+dx,yy=py+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;
     const i=yy*w+xx;if(seen[i])continue;seen[i]=1;
     if(data[i*4+3]<128)next.push(i);
    }
   }edge=next;
  }
  spans.length=0;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(seen[yy*w+xx]){
   const a=xx;while(xx+1<w&&seen[yy*w+xx+1])xx++;spans.push([yy/h,a/w,(xx+1)/w]);
   if(spans.length>250000)throw Error('영역이 너무 복잡합니다. 올가미 채색을 사용하세요.');
  }
 }
 return {spans,rowHeight:1/h};
}
