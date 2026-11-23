// Stored as procedural layer data, so settings stay editable and exports share the renderer.
export function paintFocusLines(ctx,g,w,h,nativeWidth=w){
 // Downsample small preview tiles to retain coverage along subpixel tapered tips.
 // A single temporary tile also bounds memory on long webtoon pages.
 const shape=new Path2D();traceRays(shape,g,w,h,nativeWidth);
 if(typeof document!=='undefined'){
  const tile=document.createElement('canvas'),side=384,scale=w<nativeWidth?3:1;
  tile.width=tile.height=side*scale;const tc=tile.getContext('2d',{willReadFrequently:true});
  const reduced=document.createElement('canvas');reduced.width=reduced.height=side;
  const rc=reduced.getContext('2d',{willReadFrequently:true});rc.imageSmoothingQuality='high';
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  for(let y=0;y<h;y+=side)for(let x=0;x<w;x+=side){
   const tw=Math.min(side,w-x),th=Math.min(side,h-y);
   tc.setTransform(scale,0,0,scale,-x*scale,-y*scale);tc.clearRect(x,y,tw,th);
   tc.fillStyle=g.color||'#000000';tc.fill(shape);
   if(scale===1){ctx.drawImage(tile,0,0,tw,th,x,y,tw,th);continue;}
   rc.clearRect(0,0,tw,th);rc.drawImage(tile,0,0,tw*scale,th*scale,0,0,tw,th);ctx.drawImage(reduced,0,0,tw,th,x,y,tw,th);
  }
  ctx.restore();reduced.width=tile.width=tile.height=1;return;
 }
 ctx.save();ctx.fillStyle=g.color||'#000000';ctx.fill(shape);ctx.restore();
}
function traceRays(ctx,g,w,h,nativeWidth){
 let seed=(g.seed||1)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const count=Math.max(8,Math.min(600,Math.round(g.count||100))),cx=g.cx*w,cy=g.cy*h,rx=Math.max(1,g.rx*w),ry=Math.max(1,g.ry*h),reach=Math.hypot(w,h),width=(g.width||3)*w/nativeWidth;
 for(let i=0;i<count;i++){
  const a=(i+(random()-.5)*(g.scatter??.6))*Math.PI*2/count,dx=Math.cos(a),dy=Math.sin(a),inner=1/Math.sqrt((dx/rx)**2+(dy/ry)**2)*(1+(g.edgeTaper?1:-1)*random()*(g.jitter??.25)),boundary=Math.min(dx>0?(w-cx)/dx:dx<0?-cx/dx:Infinity,dy>0?(h-cy)/dy:dy<0?-cy/dy:Infinity),outer=g.burst?inner+reach*(g.length??.12)*(1+random()*.35):boundary+2;
  if(outer<=inner)continue;
  const thick=width*(.45+random()*.85),ix=cx+dx*inner,iy=cy+dy*inner,ox=cx+dx*outer,oy=cy+dy*outer;
  const shoulder=Math.min(outer,inner+Math.min(w,h)*.35);
  const sx=cx+dx*shoulder,sy=cy+dy*shoulder;
  ctx.moveTo(ix,iy);ctx.lineTo(sx-dy*thick/2,sy+dx*thick/2);
  ctx.lineTo(ox-dy*thick/2,oy+dx*thick/2);ctx.lineTo(ox+dy*thick/2,oy-dx*thick/2);
  ctx.lineTo(sx+dy*thick/2,sy-dx*thick/2);ctx.closePath();
 }
}
