// Half-plane clipping keeps artwork coordinates unchanged in each split frame.
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
function clip(poly,nx,ny,offset){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*nx+a[1]*ny-offset,db=b[0]*nx+b[1]*ny-offset;
  if(da>=-1e-8)out.push(a);
  if((da>0&&db<0)||(da<0&&db>0)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
 }
 return out;
}
export function splitFrame(path,width,height,{angle=0,position=50,gap=24}={}){
 if(![width,height,angle,position,gap].every(Number.isFinite)||width<=0||height<=0||gap<0)throw Error('분할 수치가 올바르지 않습니다.');
 const poly=(path||[[0,0],[1,0],[1,1],[0,1]]).map(([x,y])=>[x*width,y*height]);
 // One polygon per cut: reject concave outlines rather than silently bridge disjoint pieces.
 let sign=0;
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],c=poly[(i+2)%poly.length],v=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(v)>1e-6){if(sign&&Math.sign(v)!==sign)throw Error('안으로 꺾인 자유형 컷은 분할할 수 없습니다. 사각 컷이나 볼록한 컷을 선택하세요.');sign=Math.sign(v);}}
 const rad=angle*Math.PI/180,nx=-Math.sin(rad),ny=Math.cos(rad),projections=poly.map(([x,y])=>x*nx+y*ny),lo=Math.min(...projections),hi=Math.max(...projections),offset=lo+(hi-lo)*position/100;
 const parts=[clip(poly,-nx,-ny,-offset+gap/2),clip(poly,nx,ny,offset+gap/2)];
 if(parts.some(p=>p.length<3||area(p)<Math.max(1000,width*height*.005)))throw Error('분할선이 컷 가장자리에 너무 가깝거나 간격이 큽니다.');
 return parts.map(p=>p.map(([x,y])=>[Math.max(0,Math.min(1,x/width)),Math.max(0,Math.min(1,y/height))]));
}
