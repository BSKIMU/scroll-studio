// Balloon dimensions and typography use document pixels, independent of preview zoom.
export function nativeBalloon(b,width){
 if(!b.metricWidth){
  b.font=Math.max(8,(b.font??27)*width/1000);
  b.line=(b.line??1.5)*width/1000;
  b.metricWidth=width;
 }
 return b;
}
export function ensureBalloonLayers(c){
 c.balloonLayers??=[];
 for(const b of c.bubbles||[]){
  if(!b.balloonLayerId)b.balloonLayerId=crypto.randomUUID();
  if(!c.balloonLayers.some(l=>l.id===b.balloonLayerId))
   c.balloonLayers.push({id:b.balloonLayerId,name:'말풍선 '+(c.balloonLayers.length+1),visible:true,locked:false,opacity:100});
 }
 return c.balloonLayers;
}
export function newBalloonLayer(c){
 ensureBalloonLayers(c);
 const l={id:crypto.randomUUID(),name:'말풍선 '+(c.balloonLayers.length+1),visible:true,locked:false,opacity:100};
 const at=c.balloonLayers.findIndex(l=>l.id===c.activeBalloonLayer);
 c.balloonLayers.splice(at<0?c.balloonLayers.length:at+1,0,l);
 c.activeBalloonLayer=l.id;c.activeLayer='text';return l;
}
export function balloonLayer(c,b){return ensureBalloonLayers(c).find(l=>l.id===(b?.balloonLayerId||c.activeBalloonLayer));}
export function normalizePageBalloons(project){
 for(const pg of project.pages||[]){
  const cuts=project.cuts.filter(c=>c.pageId===pg.id),base=cuts.find(c=>c.pageBase);
  if(!base)continue;
  const pw=project.width+project.bleed,baseWidth=pw*base.width/100;
  ensureBalloonLayers(base);
  if(!base.balloonPageStack){
   const setting=base.layerSettings?.text||{opacity:100};
   for(const layer of base.balloonLayers){layer.opacity=(layer.opacity??100)*(setting.opacity??100)/100;layer.visible=layer.visible!==false&&setting.visible!==false&&base.visible?.text!==false;layer.locked=layer.locked||!!setting.locked;}
   if(base.layerSettings)base.layerSettings.text={...setting,opacity:100,visible:true,locked:false};
   if(base.visible)base.visible.text=true;
   base.balloonPageStack=true;
  }
  for(const c of cuts){
   const width=pw*c.width/100;ensureBalloonLayers(c);
   for(const b of [...c.bubbles]){
    nativeBalloon(b,width);
    if(c===base||b.clipToFrame)continue;
    const x=(c.x||0)-(base.x||0),y=(c.y||0)-(base.y||0);
    const tail=b.tailPoint||[b.x+b.w*.42,b.y+b.h*1.24];
    b.tailPoint=[(x+tail[0]*width)/baseWidth,(y+tail[1]*c.height)/base.height];
    b.x=(x+b.x*width)/baseWidth;b.y=(y+b.y*c.height)/base.height;
    b.w=b.w*width/baseWidth;b.h=b.h*c.height/base.height;b.metricWidth=baseWidth;
    const layer=balloonLayer(c,b);
    if(!base.balloonLayers.some(l=>l.id===layer.id))base.balloonLayers.push({...layer,locked:layer.locked||!!c.layerSettings?.text?.locked,opacity:(layer.opacity??100)*(c.layerSettings?.text?.opacity??100)/100,visible:layer.visible!==false&&c.layerSettings?.text?.visible!==false&&c.visible?.text!==false});
    base.bubbles.push(b);c.bubbles.splice(c.bubbles.indexOf(b),1);
   }
   c.balloonLayers=c.balloonLayers.filter(l=>c.bubbles.some(b=>b.balloonLayerId===l.id)||l.id===c.activeBalloonLayer);
  }
 }
}
