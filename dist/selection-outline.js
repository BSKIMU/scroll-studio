import * as T from 'three';
import {targetMeshes} from './scene-selection.js?v=20261027-studio4';

// Editor-only visibility mask. One unlit pass, no animation, blur or bloom;
// export/cut capture never calls this overlay.
export class SelectionOutline{
 constructor(editor){
  this.e=editor;this.white=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});this.black=new T.MeshBasicMaterial({color:0x000000,toneMapped:false});
  this.screen=new T.Scene();this.camera=new T.Camera();
  this.material=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{mask:{value:null},texel:{value:new T.Vector2()},color:{value:new T.Color('#ffc34d')}},vertexShader:'varying vec2 uvMask; void main(){uvMask=uv;gl_Position=vec4(position,1.0);}',fragmentShader:`
   uniform sampler2D mask;uniform vec2 texel;uniform vec3 color;varying vec2 uvMask;
   void main(){float center=texture2D(mask,uvMask).r;float edge=0.0;
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)edge=max(edge,texture2D(mask,uvMask+vec2(float(x),float(y))*texel).r);
    float alpha=max(0.0,edge-center);if(alpha<.01)discard;gl_FragColor=vec4(color,alpha*.95);
    #include <colorspace_fragment>
   }`});
  this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.quad.frustumCulled=false;this.screen.add(this.quad);
 }
 paint(){
  const e=this.e;if(!e.isOpen||e.movement?.engaged||e.fly?.active||!e.gizmo.helper.visible)return;
  const selected=e.gizmo.objectTarget?targetMeshes(e.gizmo.objectTarget):[];
  const figure=e.figures.children[e.index];if(!e.gizmo.objectTarget&&figure)figure.traverse(o=>{if(o.isMesh&&!o.userData.poseMarker)selected.push(o);});
  if(!selected.length)return;
  const r=e.renderer,size=r.getDrawingBufferSize(new T.Vector2()),scale=Math.min(.8,1400/Math.max(size.x,size.y)),w=Math.max(1,Math.round(size.x*scale)),h=Math.max(1,Math.round(size.y*scale));
  if(!this.target)this.target=new T.WebGLRenderTarget(w,h,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true});else if(this.target.width!==w||this.target.height!==h)this.target.setSize(w,h);
  this.material.uniforms.mask.value=this.target.texture;this.material.uniforms.texel.value.set(1/w,1/h);this.material.uniforms.color.value.set(e.gizmo.objectTarget?'#ffc34d':'#65caff');
  const chosen=new Set(selected),materials=[],hidden=[],target=r.getRenderTarget(),auto=r.autoClear,shadow=r.shadowMap.autoUpdate,background=e.scene.background,environment=e.scene.environment,clear=r.getClearColor(new T.Color()),alpha=r.getClearAlpha();
  const visibility=o=>{hidden.push([o,o.visible]);o.visible=false;};
  try{
   for(const child of e.scene.children)if(child!==e.environment&&child!==e.figures)visibility(child);
   for(const root of [e.environment,e.figures])root.traverse(o=>{
    if(o.userData.poseMarker||o.userData.contiEdge||o.isLine||o.isSprite){visibility(o);return;}
    if(!o.isMesh||o.userData.contiEdge)return;const source=o.material;materials.push([o,source]);
    if(!chosen.has(o)&&[].concat(source).every(m=>m.transparent&&m.opacity<.5)){visibility(o);return;}
    o.material=chosen.has(o)?this.white:this.black;
   });
   e.scene.background=null;e.scene.environment=null;r.shadowMap.autoUpdate=false;r.autoClear=true;r.setClearColor(0,1);r.setRenderTarget(this.target);r.render(e.scene,e.camera);
  }finally{
   for(const [o,m]of materials)o.material=m;for(const [o,v]of hidden)o.visible=v;
   e.scene.background=background;e.scene.environment=environment;r.shadowMap.autoUpdate=shadow;r.setRenderTarget(target);r.setClearColor(clear,alpha);r.autoClear=auto;
  }
  try{r.autoClear=false;r.render(this.screen,this.camera);}finally{r.autoClear=auto;}
 }
 release(){this.target?.dispose();this.target=null;}
}
