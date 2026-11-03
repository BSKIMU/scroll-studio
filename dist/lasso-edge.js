// Find real colour/alpha boundaries, never the edge of the sampled rectangle.
export function nearestLassoEdge(data,width,height,x,y,radius){
 let best=Infinity,point=null;
 const difference=(a,b)=>{
  const aa=data[a+3]/255,ba=data[b+3]/255;
  return Math.max(Math.abs(data[a+3]-data[b+3]),... [0,1,2].map(c=>Math.abs(data[a+c]*aa-data[b+c]*ba)));
 };
 for(let py=1;py<height-1;py++)for(let px=1;px<width-1;px++){
  const distance=Math.hypot(px-x,py-y);if(distance>radius)continue;
  const i=(py*width+px)*4;
  const contrast=Math.max(difference(i-4,i+4),difference(i-width*4,i+width*4));
  if(contrast<24)continue;
  const score=distance/radius+(1-contrast/255)*.35;
  if(score<best){best=score;point=[px,py];}
 }
 return point;
}
