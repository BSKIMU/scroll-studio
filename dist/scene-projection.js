export function projectionFor(c,pageWidth){return c.sceneProjection||c.guideLayout||{x:0,y:0,w:pageWidth*c.width/100,h:c.height};}
export function applyProjection(camera,c,pageWidth,state=c.scene){
 const r=projectionFor(c,pageWidth),w=pageWidth*c.width/100,h=c.height;
 camera.setViewOffset(r.w,r.h,-r.x,-r.y,w,h);
 if(state?.focalLength){camera.filmGauge=36;camera.setFocalLength(Math.max(12,Math.min(200,state.focalLength)));}
 camera.updateProjectionMatrix();
}
export function inheritedSceneCut(project,selected){
 if(selected&&!selected.pageBase)return selected;
 // A page rough has no scene. Continue the last authored scene on this page.
 const cuts=project.cuts.filter(c=>!c.pageBase&&c.pageId===project.activePage);
 return cuts.filter(c=>c.scene?.asset&&c.scene.asset!=='empty').at(-1)||cuts.at(-1)||project.cuts.filter(c=>!c.pageBase).at(-1);
}
