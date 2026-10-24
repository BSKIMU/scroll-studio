// Display-only rotation/mirroring. Document coordinates and exports stay intact.
export const canvasDisplay={angle:0,flip:false};
export function elementPoint(el,e){
 const r=el.getBoundingClientRect(),a=canvasDisplay.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
 return [(.5+(dx*c+dy*s)*(canvasDisplay.flip?-1:1)/el.clientWidth),(.5+(-dx*s+dy*c)/el.clientHeight)];
}
export function elementScreen(el,p){
 const r=el.getBoundingClientRect(),a=canvasDisplay.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=(p[0]-.5)*el.clientWidth*(canvasDisplay.flip?-1:1),y=(p[1]-.5)*el.clientHeight;
 return [r.left+r.width/2+x*c-y*s,r.top+r.height/2+x*s+y*c];
}
export function rasterScale(w,h){return Math.min(1,16384/h,16384/w,Math.sqrt(32000000/(w*h)));}
