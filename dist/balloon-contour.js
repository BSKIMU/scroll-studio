const TAU=Math.PI*2;
// A clockwise contour keeps the tail and body in one closed, unbroken stroke.
export function bodyPoints(shape,x,y,w,h,radius){
 const cx=x+w/2,cy=y+h/2,points=[];
 if(shape==='rect')return [[x+w,y+h/2],[x+w,y+h],[x,y+h],[x,y],[x+w,y]];
 if(shape==='round'){
  const r=Math.min(w,h)*.16;
  for(const [ox,oy,start]of [[x+w-r,y+h-r,0],[x+r,y+h-r,Math.PI/2],[x+r,y+r,Math.PI],[x+w-r,y+r,Math.PI*1.5]])
   for(let i=0;i<=16;i++){const a=start+i/16*Math.PI/2;points.push([ox+r*Math.cos(a),oy+r*Math.sin(a)]);}
 }else if(shape==='sparkle'){
  const ends=[[cx,y],[x+w,cy],[cx,y+h],[x,cy],[cx,y]],controls=[[cx+w*.09,cy-h*.09],[cx+w*.09,cy+h*.09],[cx-w*.09,cy+h*.09],[cx-w*.09,cy-h*.09]];
  for(let q=0;q<4;q++)for(let i=0;i<48;i++){const t=i/48,u=1-t;points.push([0,1].map(k=>u*u*ends[q][k]+2*u*t*controls[q][k]+t*t*ends[q+1][k]));}
 }else{
  const n=shape==='electric'?64:shape==='burst'?36:shape==='shout'?48:240;
  for(let i=0;i<n;i++){const a=i/n*TAU,r=radius(shape,a);points.push([cx+Math.cos(a)*w/2*r,cy+Math.sin(a)*h/2*r]);}
 }
 return points;
}
function rayHit(points,cx,cy,dx,dy){
 let best=null;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],ex=b[0]-a[0],ey=b[1]-a[1],den=dx*ey-dy*ex;
  if(Math.abs(den)<1e-10)continue;
  const ax=a[0]-cx,ay=a[1]-cy,t=(ax*ey-ay*ex)/den,u=(ax*dy-ay*dx)/den;
  if(t>=0&&u>=-1e-8&&u<=1+1e-8&&(!best||t<best.t))best={point:[cx+dx*t,cy+dy*t],edge:i,t};
 }
 return best;
}
export function tailGeometry(s,x,y,w,h,tx,ty,radius){
 const points=bodyPoints(s.shape,x,y,w,h,radius),cx=x+w/2,cy=y+h/2,angle=Math.atan2((ty-cy)/(h/2),(tx-cx)/(w/2));
 const hit=a=>rayHit(points,cx,cy,Math.cos(a)*w/2,Math.sin(a)*h/2);
 const center=hit(angle),tipRadius=Math.hypot((tx-cx)/(w/2),(ty-cy)/(h/2));
 if(!center||tipRadius<=center.t||s.tail==='none'||s.tail==='circles')return null;
 const a=hit(angle-.16),b=hit(angle+.16);if(!a||!b)return null;
 const [ax,ay]=a.point,[bx,by]=b.point,mx=(ax+bx)/2,my=(ay+by)/2,dx=tx-mx,dy=ty-my;
 let commands;
 if(s.tail==='curved'){
  commands=[['Q',(ax+tx)/2-dy*.2,(ay+ty)/2+dx*.2,tx,ty],['Q',(bx+tx)/2-dy*.2,(by+ty)/2+dx*.2,bx,by]];
 }else if(s.tail==='lightning'){
  const len=Math.hypot(dx,dy)||1,nx=-dy/len*Math.min(w,h)*.07,ny=dx/len*Math.min(w,h)*.07;
  commands=[['L',mx+dx*.42+nx,my+dy*.42+ny],['L',mx+dx*.47-nx*.25,my+dy*.47-ny*.25],['L',tx,ty],['L',mx+dx*.62-nx,my+dy*.62-ny],['L',mx+dx*.45-nx*.1,my+dy*.45-ny*.1],['L',bx,by]];
 }else commands=[['L',tx,ty],['L',bx,by]];
 return {points,a,b,commands};
}
export function continuousBalloonPath(g){
 const p=new Path2D();p.moveTo(...g.a.point);
 for(const [op,...args]of g.commands)op==='Q'?p.quadraticCurveTo(...args):p.lineTo(...args);
 let i=(g.b.edge+1)%g.points.length;
 for(let n=0;n<g.points.length;n++,i=(i+1)%g.points.length){p.lineTo(...g.points[i]);if(i===g.a.edge)break;}
 p.lineTo(...g.a.point);p.closePath();return p;
}
