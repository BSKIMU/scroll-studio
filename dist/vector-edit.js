import {elementPoint} from './canvas-coordinates.js?v=20261025-release1';
export function vectorControls(c,target,api){
 const wrap=target.parentElement;wrap.querySelector('.vector-controls')?.remove();const layer=c.paintLayers.find(l=>l.id===c.activeLayer);if(!layer?.editVector||layer.locked||layer.visible===false)return;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('vector-controls');svg.setAttribute('viewBox',`0 0 ${target.width} ${target.height}`);svg.setAttribute('aria-label','벡터 제어점 · 드래그 이동, 선 더블클릭 추가, 점 우클릭 삭제, Shift 우클릭 선 삭제');
 const strokes=c.strokes.filter(s=>s.layerId===layer.id&&!s.mask&&!s.erase&&!s.fillRuns&&s.kind!=='fill');
 for(const s of strokes){const line=document.createElementNS(ns,'polyline');line.setAttribute('points',s.points.map(p=>p[0]*target.width+','+p[1]*target.height).join(' '));line.setAttribute('class','vector-control-line');line.ondblclick=e=>{e.preventDefault();e.stopPropagation();const p=elementPoint(target,e),point=[p[0],p[1],1];let best=1,dist=Infinity;for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(point[0]-a[0]-dx*t,point[1]-a[1]-dy*t);if(d<dist){dist=d;best=i;}}api.checkpoint();s.points.splice(best,0,point);api.changed();};svg.append(line);
  for(const p of s.points){const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',p[0]*target.width);circle.setAttribute('cy',p[1]*target.height);circle.setAttribute('r',Math.max(3,4*target.width/target.clientWidth));let drag=false,started=false;
   circle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();drag=true;started=false;circle.setPointerCapture(e.pointerId);};
   circle.onpointermove=e=>{if(!drag)return;e.preventDefault();e.stopPropagation();if(!started){api.checkpoint();started=true;}const q=elementPoint(target,e);p[0]=q[0];p[1]=q[1];circle.setAttribute('cx',q[0]*target.width);circle.setAttribute('cy',q[1]*target.height);line.setAttribute('points',s.points.map(p=>p[0]*target.width+','+p[1]*target.height).join(' '));};
   circle.onpointerup=circle.onpointercancel=e=>{if(!drag)return;drag=false;e.stopPropagation();if(started)api.changed();};
   circle.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();api.checkpoint();if(e.shiftKey||s.points.length<=2)c.strokes=c.strokes.filter(x=>x!==s);else s.points.splice(s.points.indexOf(p),1);api.changed();};svg.append(circle);
  }
 }
 wrap.append(svg);
}
