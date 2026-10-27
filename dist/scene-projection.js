import {configureShot,cameraFrame} from './shot-camera-math.js?v=20261027-pose-camera1';
export function projectionFor(c,pageWidth){return c.sceneProjection||c.guideLayout||{x:0,y:0,w:pageWidth*c.width/100,h:c.height};}
export function applyProjection(camera,c,pageWidth,state=c.scene){
 const r=projectionFor(c,pageWidth),w=pageWidth*c.width/100,h=c.height;
 camera.setViewOffset(r.w,r.h,-r.x,-r.y,w,h);
 if(state?.focalLength){camera.filmGauge=36;camera.setFocalLength(Math.max(12,Math.min(200,state.focalLength)));}
 camera.updateProjectionMatrix();
}
export function applyRenderProjection(camera,c,pageWidth,state=c.scene){
 if(!state?.shotCamera){applyProjection(camera,c,pageWidth,state);return;}
 const r=projectionFor(c,pageWidth);configureShot(camera,state.shotCamera,r.w/r.h);
 camera.setViewOffset(r.w,r.h,-r.x,-r.y,pageWidth*c.width/100,c.height);
}
export function applyShotViewport(camera,c,pageWidth,state,width,height){
 const r=projectionFor(c,pageWidth),cutWidth=pageWidth*c.width/100,frame=cameraFrame(width,height,cutWidth/c.height),scale=frame.w/cutWidth;
 configureShot(camera,state.shotCamera,r.w/r.h);
 camera.setViewOffset(r.w,r.h,-r.x-frame.x/scale,-r.y-frame.y/scale,width/scale,height/scale);
 return frame;
}
export function viewportSize(width,height,cutAspect,fill=false){
 const w=Math.max(1,width),h=Math.max(1,height);
 if(fill)return {w,h};
 return w/h>cutAspect?{w:h*cutAspect,h}:{w,h:w/cutAspect};
}
// Extend the cut frustum around its center. Preserve its original scale and
// projection (including cropped cuts) while revealing the surrounding scene.
export function applyViewportProjection(camera,c,pageWidth,state,width,height,fill=false){
 applyProjection(camera,c,pageWidth,state);
 if(!fill)return;
 const r=projectionFor(c,pageWidth),w=pageWidth*c.width/100,h=c.height,scale=Math.min(width/w,height/h),vw=width/scale,vh=height/scale;
 camera.setViewOffset(r.w,r.h,-r.x-(vw-w)/2,-r.y-(vh-h)/2,vw,vh);
 camera.updateProjectionMatrix();
}
// Live cut thumbnails must not inherit the enlarged editor's extra field of view.
export function withCutProjection(camera,c,pageWidth,state,consume){
 const saved=camera.clone();
 try{applyRenderProjection(camera,c,pageWidth,state);return consume();}
 finally{camera.copy(saved);}
}
export function inheritedSceneCut(project,selected){
 if(selected&&!selected.pageBase)return selected;
 // A page rough has no scene. Continue the last authored scene on this page.
 const cuts=project.cuts.filter(c=>!c.pageBase&&c.pageId===project.activePage);
 return cuts.filter(c=>c.scene?.asset&&c.scene.asset!=='empty').at(-1)||cuts.at(-1)||project.cuts.filter(c=>!c.pageBase).at(-1);
}
