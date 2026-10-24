const paths=new WeakMap();
const coordinate=x=>Math.round(x*1e12)/1e12;

// Trace only the boundary of the union of scanline cells. Internal row edges
// must not reach the rasterizer, including when the canvas is rotated.
export function fillRegionPath(runs,rowHeight){
 const cached=paths.get(runs);if(cached?.rowHeight===rowHeight)return cached.path;
 const path=new Path2D(),rows=new Map();
 if(!runs.length||!(rowHeight>0))return path;
 let top=Infinity;for(const [y]of runs)top=Math.min(top,y);
 for(const [y,a,b]of runs){
  const row=Math.round((y-top)/rowHeight);if(!rows.has(row))rows.set(row,[]);
  if(b>a)rows.get(row).push([coordinate(a),coordinate(b)]);
 }
 for(const [row,intervals]of rows){
  intervals.sort((a,b)=>a[0]-b[0]);const merged=[];
  for(const span of intervals){const previous=merged.at(-1);if(previous&&span[0]<=previous[1])previous[1]=Math.max(previous[1],span[1]);else merged.push([...span]);}
  rows.set(row,merged);
 }
 const edges=new Map(),key=(x,y)=>x+':'+y;
 function edge(x1,y1,x2,y2){
  if(x1===x2&&y1===y2)return;
  const k=key(x1,y1);if(!edges.has(k))edges.set(k,{x:x1,y:y1,next:[]});
  edges.get(k).next.push([x2,y2]);
 }
 function horizontal(intervals,neighbor,y,forward){
  let j=0;
  const emit=(a,b)=>forward?edge(a,y,b,y):edge(b,y,a,y);
  for(const [a,b]of intervals){
   let cursor=a;while(j<neighbor.length&&neighbor[j][1]<=a)j++;
   for(let k=j;k<neighbor.length&&neighbor[k][0]<b;k++){
    const [left,right]=neighbor[k];if(left>cursor)emit(cursor,Math.min(left,b));
    cursor=Math.max(cursor,right);if(cursor>=b)break;
   }
   if(cursor<b)emit(cursor,b);
  }
 }
 for(const [row,intervals]of rows){
  for(const [a,b]of intervals){edge(a,row+1,a,row);edge(b,row,b,row+1);}
  horizontal(intervals,rows.get(row-1)||[],row,true);
  horizontal(intervals,rows.get(row+1)||[],row+1,false);
 }
 while(edges.size){
  const [start,point]=edges.entries().next().value;let current=start;
  path.moveTo(point.x,top+point.y*rowHeight);
  do{
   const entry=edges.get(current);if(!entry)break;
   const [x,y]=entry.next.pop();if(!entry.next.length)edges.delete(current);
   path.lineTo(x,top+y*rowHeight);current=key(x,y);
  }while(current!==start);
  path.closePath();
 }
 paths.set(runs,{rowHeight,path});return path;
}
