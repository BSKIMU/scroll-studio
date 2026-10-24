// Vector roughs retain pen-stroke boundaries even where a balloon crosses a frame.
// Fit the rounded body robustly; the small outlier section may be a speech tail.
export function detectBalloonStrokes(strokes,w,h){
 const paths=strokes.filter(s=>!s.erase&&!s.fillRuns&&s.kind!=='fill'&&s.points?.length>=8).map(s=>s.points.filter((_,i,a)=>i%Math.max(1,Math.floor(a.length/240))===0).map(p=>[p[0]*w,p[1]*h]));
 const fits=[];
 for(const points of paths){const options=[points,points.slice(0,Math.ceil(points.length*.72)),points.slice(Math.floor(points.length*.28))],results=options.map(v=>fitBalloon(v)).filter(v=>v&&v.score>.94&&v.w>=14&&v.h>=14&&v.w/v.h>.45&&v.w*v.h<w*h*.12);if(!results.length)continue;const fit=results.sort((a,b)=>b.score-a.score)[0];const outside=points.map(([x,y])=>[x,y,Math.hypot((x-fit.x-fit.w/2)/(fit.w/2),(y-fit.y-fit.h/2)/(fit.h/2))]).filter(p=>p[2]>1.25).sort((a,b)=>b[2]-a[2]);if(outside.length>points.length*.4||outside[0]?.[2]>2.5)continue;if(outside.length>=3)fit.tailPoint=outside[0].slice(0,2);fits.push(fit);}
 // Separate arcs drawn with two pen strokes are joined only when both ends meet.
 for(let i=0;i<paths.length&&i<350;i++)for(let j=i+1;j<paths.length&&j<350;j++){const a=paths[i],b=paths[j],d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);if(Math.min(d(a[0],b[0])+d(a.at(-1),b.at(-1)),d(a[0],b.at(-1))+d(a.at(-1),b[0]))>16)continue;const fit=fitBalloon([...a,...b]);if(fit&&fit.w>=14&&fit.h>=14&&fit.w*fit.h<w*h*.12)fits.push(fit);}
 return fits.filter(b=>!paths.some(path=>{const xs=path.map(p=>p[0]),ys=path.map(p=>p[1]),pw=Math.max(...xs)-Math.min(...xs),ph=Math.max(...ys)-Math.min(...ys);if(ph<b.h*1.8||pw>b.w*1.5||Math.min(...ys)<b.y+b.h*.4||Math.min(...ys)>b.y+b.h*1.2)return false;return [path[0],path.at(-1)].some(([x,y])=>Math.abs(x-b.x-b.w/2)<b.w*.65&&Math.abs(y-b.y-b.h)<b.h*.6);})).sort((a,b)=>b.score-a.score).filter((b,i,all)=>!all.slice(0,i).some(a=>Math.abs(a.x-b.x)<Math.min(a.w,b.w)*.25&&Math.abs(a.y-b.y)<Math.min(a.h,b.h)*.25&&Math.abs(a.w-b.w)<a.w*.3&&Math.abs(a.h-b.h)<a.h*.3)).slice(0,80);
}
export function fitBalloon(points){
 if(points.length<8)return null;const xs=points.map(p=>p[0]).sort((a,b)=>a-b),ys=points.map(p=>p[1]).sort((a,b)=>a-b),q=(a,t)=>a[Math.floor((a.length-1)*t)];
 const left=q(xs,.04),right=q(xs,.96),top=q(ys,.04),bottom=q(ys,.96);const sideFraction=points.filter(([x,y])=>Math.min(Math.abs(x-left),Math.abs(x-right))/(right-left)<.04||Math.min(Math.abs(y-top),Math.abs(y-bottom))/(bottom-top)<.04).length/points.length;if(sideFraction>.68)return null;let v=[(left+right)/2,(top+bottom)/2,(right-left)/2,(bottom-top)/2];if(v[2]<6||v[3]<6||v[2]/v[3]<.25||v[2]/v[3]>5)return null;
 const errors=p=>points.map(([x,y])=>Math.abs(Math.hypot((x-p[0])/p[2],(y-p[1])/p[3])-1)).sort((a,b)=>a-b);
 const loss=p=>{if(p[2]<6||p[3]<6)return 99;const e=errors(p);return e.slice(0,Math.floor(e.length*.68)).reduce((s,n)=>s+n*n,0)/(e.length*.68);};
 let best=loss(v);for(let step=Math.max(v[2],v[3])*.12;step>.3;step*=.55)for(let pass=0;pass<5;pass++){let changed=false;for(let axis=0;axis<4;axis++)for(const sign of [-1,1]){const next=v.slice();next[axis]+=step*sign;const l=loss(next);if(l<best){v=next;best=l;changed=true;}}if(!changed)break;}
 const [cx,cy,rx,ry]=v,e=errors(v),bins=new Set(),out=[];for(const [x,y]of points){const radial=Math.hypot((x-cx)/rx,(y-cy)/ry);if(Math.abs(radial-1)<.15)bins.add(Math.floor((Math.atan2((y-cy)/ry,(x-cx)/rx)+Math.PI)/(Math.PI*2)*32)%32);if(radial>1.22)out.push([x,y,radial]);}
 // A rectangular frame cannot earn continuous ellipse coverage. A stick body is
 // rejected by its long non-elliptical continuation rather than interpreted as a tail.
 if(best>.0055||e[Math.floor(e.length*.65)]>.15||bins.size<20)return null;
 const tail=out.sort((a,b)=>b[2]-a[2])[0];if(tail?.[2]>3.2)return null;
 return {x:cx-rx,y:cy-ry,w:rx*2,h:ry*2,kind:'balloon',score:1-Math.sqrt(best),...(tail&&out.length>=3?{tailPoint:tail.slice(0,2)}:{})};
}
