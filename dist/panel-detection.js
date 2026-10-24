import {detectBalloonStrokes} from './balloon-detection.js?v=20261025-release1';
// Geometric proposals, never destructive automatic segmentation. Inspired by
// morphology/connected-component contour extraction, not semantic image AI.
export function detectPanels(data,w,h,{gap=3,minWidth=60,minHeight=65,seeds=[],shape='rectangle',balloons=false,strokes=null}={}){
 const ink=new Uint8Array(w*h);for(let i=0;i<ink.length;i++){const p=i*4;ink[i]=data[p+3]>35&&Math.min(data[p],data[p+1],data[p+2])<210?1:0;}
 const mask=new Uint8Array(ink.length);const r=Math.max(1,Math.min(10,gap));
 // Small gaps between separately drawn sides are closed before components.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(ink[y*w+x]){for(let dy=-r;dy<=r;dy++){const yy=y+dy;if(yy<0||yy>=h)continue;for(let dx=-r;dx<=r;dx++){const xx=x+dx;if(xx>=0&&xx<w)mask[yy*w+xx]=1;}}}
 const cells=closedCells(mask,w,h,r,minWidth,minHeight,balloons);
 const queue=new Int32Array(w*h),boxes=[];for(let i=0;i<mask.length;i++){if(mask[i]!==1)continue;let head=0,tail=1,minX=w,minY=h,maxX=0,maxY=0;queue[0]=i;mask[i]=2;while(head<tail){const n=queue[head++],x=n%w,y=Math.floor(n/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const m of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(m>=0&&mask[m]===1){mask[m]=2;queue[tail++]=m;}}if(maxX-minX>=minWidth&&maxY-minY>=minHeight)boxes.push({x:minX+r,y:minY+r,w:maxX-minX-r*2,h:maxY-minY-r*2});}
 boxes.push(...seeds,...cells.filter(c=>c.kind!=='balloon'));
 function coverage(b){const band=Math.max(3,Math.min(b.w,b.h)*.06),values=[];for(const side of [0,1,2,3]){const vertical=side>1,length=vertical?b.h:b.w;let hit=0,total=0;for(let t=.05;t<.96;t+=1/Math.max(30,length)){const x=vertical?b.x+(side===3?b.w:0):b.x+b.w*t,y=vertical?b.y+b.h*t:b.y+(side===1?b.h:0);total++;let found=false;for(let k=-Math.ceil(band);k<=band;k++){const xx=Math.round(x+(vertical?k:0)),yy=Math.round(y+(vertical?0:k));if(xx>=0&&xx<w&&yy>=0&&yy<h&&ink[yy*w+xx]){found=true;break;}}if(found)hit++;}values.push(hit/total);}return Math.min(...values);}
 function fitBox(b){
  const lines=[];
  for(const side of [0,1,2,3]){const vertical=side>1,length=vertical?b.h:b.w,depth=vertical?b.w:b.h,pts=[];
   for(let t=.08;t<.93;t+=1/Math.max(30,length)){const along=(vertical?b.y:b.x)+length*t;for(let d=0;d<depth*.30;d++){const edge=(vertical?b.x:b.y)+((side===1||side===3)?depth-d:d),x=Math.round(vertical?edge:along),y=Math.round(vertical?along:edge);if(x>=0&&x<w&&y>=0&&y<h&&ink[y*w+x]){pts.push([along,edge]);break;}}}
   if(pts.length<length*.45)return null;let used=pts,line;
   for(let pass=0;pass<3;pass++){let sx=0,sy=0,sxx=0,sxy=0;for(const [x,y]of used){sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;}const n=used.length,a=(n*sxy-sx*sy)/(n*sxx-sx*sx||1),offset=(sy-a*sx)/n;line={a,b:offset};const errors=used.map(([x,y])=>Math.abs(y-a*x-offset)).sort((a,b)=>a-b),cut=Math.max(2,errors[Math.floor(errors.length*.65)]*2);used=pts.filter(([x,y])=>Math.abs(y-a*x-offset)<=cut);}
   if(Math.abs(line.a)>.5)return null;lines.push(line);
  }
  const intersection=(horizontal,vertical)=>{const x=(vertical.a*horizontal.b+vertical.b)/(1-vertical.a*horizontal.a);return [x,horizontal.a*x+horizontal.b];};
  const points=[intersection(lines[0],lines[2]),intersection(lines[0],lines[3]),intersection(lines[1],lines[3]),intersection(lines[1],lines[2])];let score=1;
  for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],length=Math.hypot(b[0]-a[0],b[1]-a[1]);let hits=0,n=0;for(let t=.04;t<.97;t+=1/Math.max(30,length)){n++;const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;let hit=false;for(let d=-3;d<=3;d++){const xx=Math.round(x-(b[1]-a[1])/length*d),yy=Math.round(y+(b[0]-a[0])/length*d);if(xx>=0&&xx<w&&yy>=0&&yy<h&&ink[yy*w+xx]){hit=true;break;}}if(hit)hits++;}score=Math.min(score,hits/n);}
  // A wobbly rough is normally a rectangular comic frame. Average opposite
  // endpoints instead of retaining four independently fitted sloping edges.
  if(shape==='rectangle'){
   const left=(points[0][0]+points[3][0])/2,right=(points[1][0]+points[2][0])/2,top=(points[0][1]+points[1][1])/2,bottom=(points[2][1]+points[3][1])/2;
   if(left<0||top<0||right>w||bottom>h||right-left<minWidth||bottom-top<minHeight)return null;
   return {x:left,y:top,w:right-left,h:bottom-top,score};
  }
  const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1])),bw=Math.max(...points.map(p=>p[0]))-x,bh=Math.max(...points.map(p=>p[1]))-y;
  if(x<0||y<0||x+bw>w||y+bh>h||bw<minWidth||bh<minHeight)return null;return {x,y,w:bw,h:bh,score,path:points.map(p=>[(p[0]-x)/bw,(p[1]-y)/bh])};
 }
 const candidates=boxes.filter(b=>b.w>=minWidth&&b.h>=minHeight&&b.w/b.h>.15&&b.w/b.h<12&&b.w*b.h<w*h*.95).map(b=>fitBox(b)||({...b,score:coverage(b)})).filter(b=>b.score>.6).sort((a,b)=>b.w*b.h-a.w*a.h),unique=[];
 const leaves=candidates.filter(b=>{const inner=candidates.filter(a=>a!==b&&a.w*a.h<b.w*b.h*.8&&a.x>=b.x-r*3&&a.y>=b.y-r*3&&a.x+a.w<=b.x+b.w+r*3&&a.y+a.h<=b.y+b.h+r*3);return inner.length<2||inner.reduce((sum,a)=>sum+a.w*a.h,0)<b.w*b.h*.55;});
 for(const b of leaves){if(unique.some(a=>{const overlap=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return overlap/Math.min(a.w*a.h,b.w*b.h)>.85;}))continue;unique.push(b);if(unique.length>=80)break;}if(balloons){const rounded=strokes?detectBalloonStrokes(strokes,w,h):cells.filter(c=>c.kind==='balloon').slice(0,80);for(let i=unique.length-1;i>=0;i--){const b=unique[i];if(rounded.some(a=>Math.abs(a.x-b.x)<a.w*.18&&Math.abs(a.y-b.y)<a.h*.18&&Math.abs(a.w-b.w)<a.w*.3&&Math.abs(a.h-b.h)<a.h*.3))unique.splice(i,1);}unique.push(...rounded);}return unique.sort((a,b)=>Math.abs(a.y-b.y)<20?a.x-b.x:a.y-b.y);
}

// Flood empty enclosed cells as well as ink components, so shared dividers split frames.
function closedCells(mask,w,h,r,minWidth,minHeight,balloons){
 const visited=new Uint8Array(mask.length),q=new Int32Array(mask.length),out=[];
 for(let start=0;start<mask.length;start++){if(mask[start]||visited[start])continue;let head=0,tail=1,left=w,right=0,top=h,bottom=0,edge=false;q[0]=start;visited[start]=1;
  while(head<tail){const n=q[head++],x=n%w,y=Math.floor(n/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);edge ||= x===0||y===0||x===w-1||y===h-1;for(const next of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1])if(next>=0&&!mask[next]&&!visited[next]){visited[next]=1;q[tail++]=next;}}
  const bw=right-left+1,bh=bottom-top+1,fill=tail/(bw*bh);if(edge||bw<minWidth*.7||bh<(balloons?minHeight*.35:minHeight*.7)||fill<.55)continue;
  const box={x:Math.max(0,left-r-1),y:Math.max(0,top-r-1),w:bw+2*r+2,h:bh+2*r+2};
  if(balloons&&fill>.59&&fill<.88&&bw/bh>.35&&bw/bh<4){let hits=0;for(let i=0;i<48;i++){const a=i*Math.PI/24,x=Math.round((left+right)/2+Math.cos(a)*(bw/2+r)),y=Math.round((top+bottom)/2+Math.sin(a)*(bh/2+r));let hit=false;for(let dy=-r-2;dy<=r+2;dy++)for(let dx=-r-2;dx<=r+2;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&mask[(y+dy)*w+x+dx])hit=true;if(hit)hits++;}if(hits/48>.72){out.push({...box,kind:'balloon',score:hits/48});continue;}}
  if(bw>=minWidth*.7&&bh>=minHeight*.7&&fill>.66)out.push(box);
 }return out;
}
