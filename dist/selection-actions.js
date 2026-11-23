// Mask-only operations never modify artwork or enter the drawing undo stack.
export function invertSelectionMask(mask){
 const ctx=mask.getContext('2d'),image=ctx.getImageData(0,0,mask.width,mask.height);
 for(let i=0;i<image.data.length;i+=4){image.data[i]=image.data[i+1]=image.data[i+2]=255;image.data[i+3]=255-image.data[i+3];}
 ctx.putImageData(image,0,0);
}

// Separable sliding maxima keep expansion linear even on a tall webtoon page.
export function expandSelectionMask(mask,rx,ry=rx){
 const w=mask.width,h=mask.height,ctx=mask.getContext('2d'),image=ctx.getImageData(0,0,w,h),a=new Uint8Array(w*h),b=new Uint8Array(w*h);
 for(let i=0;i<a.length;i++)a[i]=image.data[i*4+3];
 function pass(src,dst,length,lines,radius,vertical){
  radius=Math.max(0,Math.min(length,Math.round(radius)));const queue=new Int32Array(length);
  for(let line=0;line<lines;line++){let head=0,tail=0,next=0;const at=i=>vertical?i*w+line:line*w+i;
   for(let i=0;i<length;i++){while(next<=Math.min(length-1,i+radius)){while(tail>head&&src[at(queue[tail-1])]<=src[at(next)])tail--;queue[tail++]=next++;}while(queue[head]<i-radius)head++;dst[at(i)]=src[at(queue[head])];}
  }
 }
 pass(a,b,w,h,rx,false);pass(b,a,h,w,ry,true);
 for(let i=0;i<a.length;i++){image.data[i*4]=image.data[i*4+1]=image.data[i*4+2]=255;image.data[i*4+3]=a[i];}ctx.putImageData(image,0,0);
}

export const selectionIcons={
 clear:'M4 4h5m4 0h7v5m0 4v7h-5m-4 0H4v-7m0-4V4 M3 3l18 18',
 invert:'M3 3h18v18H3z M12 3v18 M12 3h9v18h-9',
 expand:'M8 8h8v8H8z M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5',
 cut:'M8 9l12 12 M8 15L20 3 M3 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M3 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M13 12h7v7',
 transform:'M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M4 4l6 6 M20 20l-6-6',
 fill:'M3 12l9-9 9 9-9 9z M4 12h16 M8 3l6 6 M21 17s-3 3-1 5c3 1 3-2 1-5',
 apply:'M4 12l5 5L20 6',cancel:'M5 5l14 14 M19 5L5 19'
};
export const selectionIcon=key=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${selectionIcons[key]}"/></svg>`;
