const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const radians=a=>a*Math.PI/180;
const rectangle=[[0,0],[1,0],[1,1],[0,1]];
export const cutRect=(c,pageWidth)=>({x:c.x||0,y:c.y||0,w:pageWidth*c.width/100,h:c.height});
export function frameAtPoint(project,pageId,x,y){
 for(const c of [...(project.cuts||[])].reverse()){
  if(c.pageBase||c.pageId!==pageId)continue;const r=cutRect(c,project.width),u=(x-r.x)/r.w,v=(y-r.y)/r.h;if(u<0||u>1||v<0||v>1)continue;
  const path=c.frame?.path;if(!path?.length)return c;let inside=false;for(let i=0,j=path.length-1;i<path.length;j=i++){const [ax,ay]=path[i],[bx,by]=path[j];if((ay>v)!==(by>v)&&u<(bx-ax)*(v-ay)/(by-ay)+ax)inside=!inside;}if(inside)return c;
 }return null;
}
export function frameBox(c,pageWidth){const r=cutRect(c,pageWidth),t=c.frame?.transform;return {cx:r.x+r.w/2,cy:r.y+r.h/2,w:t?.w||r.w,h:t?.h||r.h,angle:t?.angle||0};}
export function framePoint(box,x,y){const a=radians(box.angle),u=(x-.5)*box.w,v=(y-.5)*box.h;return [box.cx+u*Math.cos(a)-v*Math.sin(a),box.cy+u*Math.sin(a)+v*Math.cos(a)];}
export function frameBounds(box){const points=rectangle.map(([x,y])=>framePoint(box,x,y)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};}
export function frameFits(box,page){const r=frameBounds(box),e=1e-6;return box.w>=80-e&&box.h>=160-e&&r.w>=80-e&&r.h>=160-e&&r.h<=5000+e&&r.x>=-e&&r.y>=-e&&r.x+r.w<=page.width+e&&r.y+r.h<=page.height+e;}
function limitChange(from,to,page){if(frameFits(to,page))return to;let lo=0,hi=1;for(let i=0;i<32;i++){const f=(lo+hi)/2,b=Object.fromEntries(Object.keys(from).map(k=>[k,from[k]+(to[k]-from[k])*f]));if(frameFits(b,page))lo=f;else hi=f;}return Object.fromEntries(Object.keys(from).map(k=>[k,from[k]+(to[k]-from[k])*lo]));}
export function moveFrameBox(box,dx,dy,page,snap=false){if(snap){const distance=Math.hypot(dx,dy),a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;dx=Math.cos(a)*distance;dy=Math.sin(a)*distance;}const r=frameBounds(box);return {...box,cx:box.cx+clamp(dx,-r.x,page.width-r.x-r.w),cy:box.cy+clamp(dy,-r.y,page.height-r.y-r.h)};}
export function resizeFrameBox(box,handle,dx,dy,page,ratio=false){
 const a=radians(box.angle),u=dx*Math.cos(a)+dy*Math.sin(a),v=-dx*Math.sin(a)+dy*Math.cos(a),sx=handle.includes('w')?-1:handle.includes('e')?1:0,sy=handle.includes('n')?-1:handle.includes('s')?1:0;
 let w=Math.max(80,box.w+sx*u),h=Math.max(160,box.h+sy*v);
 if(ratio){let scale=sx&&!sy?w/box.w:!sx?h/box.h:Math.abs(w/box.w-1)>Math.abs(h/box.h-1)?w/box.w:h/box.h;scale=Math.max(scale,80/box.w,160/box.h);w=box.w*scale;h=box.h*scale;}
 const du=(w-box.w)*(sx||1)/2,dv=(h-box.h)*(sy||1)/2;
 return limitChange(box,{...box,w,h,cx:box.cx+du*Math.cos(a)-dv*Math.sin(a),cy:box.cy+du*Math.sin(a)+dv*Math.cos(a)},page);
}
export function rotateFrameBox(box,degrees,page,snap=false){const angle=snap?Math.round((box.angle+degrees)/45)*45:box.angle+degrees;return limitChange(box,{...box,angle},page);}
export function guideRect(c,pageWidth){return c.guideLayout||{x:0,y:0,w:pageWidth*c.width/100,h:c.height};}
// Older new-cut creation copied the previous cut's capture rectangle. A frame
// transform explicitly owns cropping; a newly sized cut owns its full capture.
export function repairInheritedGuide(c){const path=c.frame?.path,whole=!path||(path.length===4&&path.every((p,i)=>p[0]===rectangle[i][0]&&p[1]===rectangle[i][1]));if(whole&&c.guideLayout&&!c.frame?.transform&&c.guideLayout.x===0&&c.guideLayout.y===0)delete c.guideLayout;}
export function validateFrameGeometry(c){
 const g=c.guideLayout,t=c.frame?.transform,r=c.sceneProjection;if(r&&(!['x','y','w','h'].every(k=>Number.isFinite(r[k]))||r.w<1||r.h<1||r.w>20000||r.h>20000||Math.abs(r.x)>1000000||Math.abs(r.y)>1000000))throw Error('카메라 투영 영역이 올바르지 않습니다.');
 if(g&&(!['x','y','w','h'].every(k=>Number.isFinite(g[k]))||Math.abs(g.x)>1000000||Math.abs(g.y)>1000000||g.w<1||g.h<1||g.w>20000||g.h>20000))throw Error('가이드 배치 정보가 올바르지 않습니다.');
 if(t&&(!['w','h','angle'].every(k=>Number.isFinite(t[k]))||t.w<80||t.h<160||t.w>20000||t.h>20000||!Array.isArray(t.shape)||t.shape.length<3||t.shape.length>2000||t.shape.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1))))throw Error('컷 회전 정보가 올바르지 않습니다.');
}
export function drawGuideImage(ctx,image,c,w,h,pageWidth){const r=guideRect(c,pageWidth),scale=w/(pageWidth*c.width/100),iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 // A copied camera image fills a new cut without stretching. Explicit guide
 // rectangles still preserve the physical projection through later mask edits.
 if(!c.guideLayout&&iw&&ih){const k=Math.max(r.w/iw,r.h/ih),sw=r.w/k,sh=r.h/k;ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,r.x*scale,r.y*scale,r.w*scale,r.h*scale);}else ctx.drawImage(image,r.x*scale,r.y*scale,r.w*scale,r.h*scale);}

// Frame edits change the mask. Artwork keeps its physical size, and a move carries
// it with the frame. Source pixels remain available when the mask grows again.
export function reframeCut(c,pageWidth,box,move=false){
 const before=cutRect(c,pageWidth),after=frameBounds(box),dx=move?0:before.x-after.x,dy=move?0:before.y-after.y;
 const point=p=>[(p[0]*before.w+dx)/after.w,(p[1]*before.h+dy)/after.h,...p.slice(2)];
 const shape=c.frame?.transform?.shape||c.frame?.path||rectangle;
 const path=shape.map(([x,y])=>{const p=framePoint(box,x,y);return [clamp((p[0]-after.x)/after.w,0,1),clamp((p[1]-after.y)/after.h,0,1)];});
 const guide=guideRect(c,pageWidth),factor=before.w/after.w;
 return {...c,x:Math.max(0,after.x),y:Math.max(0,after.y),width:after.w/pageWidth*100,height:after.h,
  guideLayout:{...guide,x:guide.x+dx,y:guide.y+dy},
  ...(c.scene?.asset!=='empty'||c.scene?.people?.length?{sceneProjection:{...(c.sceneProjection||guide),x:(c.sceneProjection||guide).x+dx,y:(c.sceneProjection||guide).y+dy}}:{}),
  frame:{...c.frame,path,transform:{w:box.w,h:box.h,angle:box.angle,shape},erased:(c.frame?.erased||[]).map(s=>({...s,size:s.size*factor,points:s.points.map(point)}))},
  strokes:(c.strokes||[]).map(s=>({...s,size:s.size*factor,points:s.points.map(point)})),
  paintLayers:c.paintLayers?.map(l=>({...l,...(l.outline?{outlineWidth:(l.outlineWidth||2)*factor}:{})})),
  bubbles:(c.bubbles||[]).map(b=>{const [x,y]=point([b.x,b.y]);return {...b,x,y,w:b.w*factor,h:b.h*before.h/after.h,font:(b.font??27)*(b.metricWidth?1:factor),line:(b.line??2)*(b.metricWidth?1:factor),...(b.metricWidth?{metricWidth:after.w}:{}),...(b.tailPoint?{tailPoint:point(b.tailPoint)}:{})};})};
}
export function resizeCutBounds(c,pageWidth,r){
 const old=cutRect(c,pageWidth),shape=c.frame?.path||rectangle;
 // Numeric geometry fields describe the enclosing page-aligned rectangle.
 return reframeCut({...c,frame:{...c.frame,transform:undefined,path:shape}},pageWidth,{cx:r.x+r.w/2,cy:r.y+r.h/2,w:r.w,h:r.h,angle:0},r.w===old.w&&r.h===old.h);
}
