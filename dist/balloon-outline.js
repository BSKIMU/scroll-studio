import {tailGeometry,continuousBalloonPath} from './balloon-contour.js?v=20261025-release1';
const TAU=Math.PI*2;
const spikeCount=shape=>shape==='electric'?64:shape==='burst'?36:48;
const spikeRadius=(shape,i)=>i%2?(shape==='burst'?.69+.1*Math.sin(i*2.3):shape==='electric'?.89:.82):(shape==='burst'?.94+.06*Math.sin(i*1.7):1);
export function contourRadius(shape,a){
 if(shape==='thought')return 1+.05*Math.cos(a*12);
 if(shape==='wave')return .97+.035*Math.sin(a*9)+.018*Math.sin(a*17+.4);
 if(shape==='rough')return .95+.025*Math.sin(a*17)+.035*Math.sin(a*37+1.3)+.02*Math.cos(a*61);
 if(['shout','burst','electric'].includes(shape)){
  const n=spikeCount(shape),angle=(a%TAU+TAU)%TAU,i=Math.floor(angle/TAU*n),j=(i+1)%n,a1=i/n*TAU,a2=(i+1)/n*TAU,x=Math.cos(a1)*spikeRadius(shape,i),y=Math.sin(a1)*spikeRadius(shape,i),dx=Math.cos(a2)*spikeRadius(shape,j)-x,dy=Math.sin(a2)*spikeRadius(shape,j)-y;
  return (x*dy-y*dx)/(Math.cos(angle)*dy-Math.sin(angle)*dx);
 }
 return 1;
}
export function balloonPath(shape,x,y,w,h){
 const p=new Path2D(),cx=x+w/2,cy=y+h/2;
 if(shape==='rect'||shape==='round'){p.roundRect(x,y,w,h,shape==='round'?Math.min(w,h)*.16:0);return p;}
 if(shape==='sparkle'){
  p.moveTo(cx,y);p.quadraticCurveTo(cx+w*.09,cy-h*.09,x+w,cy);p.quadraticCurveTo(cx+w*.09,cy+h*.09,cx,y+h);p.quadraticCurveTo(cx-w*.09,cy+h*.09,x,cy);p.quadraticCurveTo(cx-w*.09,cy-h*.09,cx,y);p.closePath();return p;
 }
 if(['shout','burst','electric'].includes(shape)){
  const n=spikeCount(shape);
  for(let i=0;i<n;i++){const a=i/n*TAU,r=spikeRadius(shape,i),px=cx+Math.cos(a)*w/2*r,py=cy+Math.sin(a)*h/2*r;i?p.lineTo(px,py):p.moveTo(px,py);}p.closePath();return p;
 }
 if(['thought','wave','rough'].includes(shape)){
  for(let i=0;i<240;i++){const a=i/240*TAU,r=contourRadius(shape,a),px=cx+Math.cos(a)*w/2*r,py=cy+Math.sin(a)*h/2*r;i?p.lineTo(px,py):p.moveTo(px,py);}p.closePath();return p;
 }
 p.ellipse(cx,cy,w/2,h/2,0,0,TAU);return p;
}

export function drawBalloonOutline(ctx,s,x,y,w,h,tx,ty){
 const cx=x+w/2,cy=y+h/2,g=tailGeometry(s,x,y,w,h,tx,ty,contourRadius),p=g?continuousBalloonPath(g):balloonPath(s.shape,x,y,w,h),lw=ctx.lineWidth;
 ctx.lineCap='round';ctx.setLineDash(s.outline==='dashed'?[lw*4,lw*3]:s.outline==='dotted'?[lw*.3,lw*2.8]:[]);
 if(s.shape==='flash'){
  // A clear central area with tapering ink rays; everything stays in the body bounds.
  if(!s.transparent){ctx.fillStyle=s.fill;ctx.fill(p);}ctx.fillStyle=s.stroke;
  for(let i=0;i<48;i++){const a=i/48*TAU,inner=.72+.08*Math.sin(i*2.1),spread=.009+(i%3)*.003;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*w*.5*inner,cy+Math.sin(a)*h*.5*inner);ctx.lineTo(cx+Math.cos(a-spread)*w*.5,cy+Math.sin(a-spread)*h*.5);ctx.lineTo(cx+Math.cos(a+spread)*w*.5,cy+Math.sin(a+spread)*h*.5);ctx.closePath();ctx.fill();}ctx.fillStyle=s.fill;return;
 }
 if(!s.transparent)ctx.fill(p);if(s.line>0)ctx.stroke(p);
 if(s.outline==='double'&&s.line>0){ctx.save();ctx.translate(cx,cy);ctx.scale(.91,.88);ctx.translate(-cx,-cy);ctx.stroke(p);ctx.restore();}
 if(s.tail==='none')return;
 const angle=Math.atan2((ty-cy)/(h/2),(tx-cx)/(w/2)),point=a=>[cx+Math.cos(a)*w/2*contourRadius(s.shape,a),cy+Math.sin(a)*h/2*contourRadius(s.shape,a)];
 if(s.tail==='circles'){
  const [sx,sy]=point(angle),distance=Math.hypot(tx-sx,ty-sy),radius=Math.min(Math.min(w,h)*.055,distance*.17);
  for(const [t,k]of [[.24,1],[.62,.65],[1,.35]]){ctx.beginPath();ctx.ellipse(sx+(tx-sx)*t,sy+(ty-sy)*t,Math.max(.4,radius*k),Math.max(.4,radius*k),0,0,TAU);if(!s.transparent)ctx.fill();if(s.line>0)ctx.stroke();}return;
 }
}

// The same silhouette is used for painting and subtracting shared internal borders.
export function balloonSilhouette(b,w,h){
 const x=b.x*w,y=b.y*h,bw=b.w*w,bh=b.h*h,t=b.tailPoint||[b.x+b.w*.42,b.y+b.h*1.24];
 const g=tailGeometry({...b,shape:b.shape||'ellipse'},x,y,bw,bh,t[0]*w,t[1]*h,contourRadius);
 return g?continuousBalloonPath(g):balloonPath(b.shape||'ellipse',x,y,bw,bh);
}
