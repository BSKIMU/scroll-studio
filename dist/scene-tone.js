import * as T from 'three';

export const toneDefaults={gamma:1,sss:false,sssStrength:.3,sssRadius:1,sssThreshold:.7,sssColor:'#ff7966',sssColorStrength:.65};
export function toneValues(look={}){
 const number=(key,fallback,min,max)=>Number.isFinite(+look[key])?Math.min(max,Math.max(min,+look[key])):fallback;
 return {gamma:number('gamma',1,.3,3),contrast:number('contrast',100,0,200)/100,saturation:number('saturation',100,0,200)/100,
  strength:look.sss?number('sssStrength',.3,0,1.5):0,radius:number('sssRadius',1,.25,3),threshold:number('sssThreshold',.7,.2,.98),
  scatterColor:/^#[\da-f]{6}$/i.test(look.sssColor)?look.sssColor:toneDefaults.sssColor,scatterMix:number('sssColorStrength',toneDefaults.sssColorStrength,0,1)};
}
const vertexShader='precision highp float; attribute vec3 position; attribute vec2 uv; varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}';
const fragmentHeader='precision highp float; varying vec2 vUv; uniform sampler2D source;';
const material=(uniforms,fragmentShader)=>new T.RawShaderMaterial({uniforms,vertexShader,fragmentShader:fragmentHeader+fragmentShader,depthTest:false,depthWrite:false,blending:T.NoBlending});

// Display-referred soft bloom: the reference's stylized SSS look, not a skin
// thickness simulation. Copy the finished framebuffer so ACES/exposure run once
// and the environment depth remains intact for separate character captures.
export class SceneTone{
 constructor(editor){
  this.e=editor;this.screen=new T.Scene();this.camera=new T.Camera();
  this.extract=material({source:{value:null},threshold:{value:.7}},`
   uniform float threshold;
   void main(){vec4 p=texture2D(source,vUv);vec3 c=p.rgb/max(p.a,.00001);
    float brightness=max(c.r,max(c.g,c.b));float weight=smoothstep(threshold-.15,threshold+.15,brightness);
    gl_FragColor=vec4(c*weight*p.a,1.0);}`);
  this.blur=material({source:{value:null},direction:{value:new T.Vector2()}},`
   uniform vec2 direction;
   void main(){vec3 c=texture2D(source,vUv).rgb*.227027;
    c+=(texture2D(source,vUv+direction*1.384615).rgb+texture2D(source,vUv-direction*1.384615).rgb)*.316216;
    c+=(texture2D(source,vUv+direction*3.230769).rgb+texture2D(source,vUv-direction*3.230769).rgb)*.070270;
    gl_FragColor=vec4(c,1.0);}`);
  this.grade=material({source:{value:null},bloom:{value:null},strength:{value:0},scatterColor:{value:new T.Color()},scatterMix:{value:0},gamma:{value:1},contrast:{value:1},saturation:{value:1}},`
   uniform sampler2D bloom;uniform float strength;uniform vec3 scatterColor;uniform float scatterMix;uniform float gamma;uniform float contrast;uniform float saturation;
   void main(){vec4 p=texture2D(source,vUv);if(p.a<.00001){gl_FragColor=vec4(0.0);return;}
    vec3 c=p.rgb/p.a;
    if(strength>0.0){
     vec3 light=texture2D(bloom,vUv).rgb;
     // Tint only the scattered highlight contribution. Zero mix preserves
     // the untinted bloom without adding a full-frame color wash.
     float brightness=dot(light,vec3(.2126,.7152,.0722));
     light=mix(light,scatterColor*brightness,scatterMix);
     c=1.0-(1.0-c)*exp(-light*strength);
    }
    c=(c-.5)*contrast+.5;
    float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,saturation);
    c=pow(clamp(c,0.0,1.0),vec3(1.0/gamma));
    gl_FragColor=vec4(c*p.a,p.a);}`);
  this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.grade);this.quad.frustumCulled=false;this.screen.add(this.quad);
 }
 paint(){
  const s=toneValues(this.e.state?.look),r=this.e.renderer;
  if(!s.strength&&s.gamma===1&&s.contrast===1&&s.saturation===1){this.release();return;}
  const size=r.getDrawingBufferSize(new T.Vector2());
  if(!this.source||this.source.image.width!==size.x||this.source.image.height!==size.y){
   this.source?.dispose();this.source=new T.FramebufferTexture(size.x,size.y);this.source.minFilter=this.source.magFilter=T.LinearFilter;
  }
  // copyFramebufferToTexture binds slot 0, but the bundled renderer can leave
  // another slot active when the source is already bound from the prior pass.
  r.state.activeTexture(r.getContext().TEXTURE0);
  r.copyFramebufferToTexture(this.source);
  const auto=r.autoClear,target=r.getRenderTarget(),viewport=r.getViewport(new T.Vector4()),scissor=r.getScissor(new T.Vector4()),scissorTest=r.getScissorTest();
  try{
   r.autoClear=false;r.setScissorTest(false);
   if(s.strength){
    const scale=Math.min(.5,640/Math.max(size.x,size.y)),w=Math.max(1,Math.round(size.x*scale)),h=Math.max(1,Math.round(size.y*scale));
    if(!this.a){const options={depthBuffer:false,stencilBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter};this.a=new T.WebGLRenderTarget(w,h,options);this.b=new T.WebGLRenderTarget(w,h,options);}
    else if(this.a.width!==w||this.a.height!==h){this.a.setSize(w,h);this.b.setSize(w,h);}
    this.extract.uniforms.source.value=this.source;this.extract.uniforms.threshold.value=s.threshold;
    this.pass(this.extract,this.a);
    const radius=s.radius*Math.min(w,h)/180;
    for(let i=0;i<2;i++){
     this.blur.uniforms.source.value=this.a.texture;this.blur.uniforms.direction.value.set(radius/w,0);this.pass(this.blur,this.b);
     this.blur.uniforms.source.value=this.b.texture;this.blur.uniforms.direction.value.set(0,radius/h);this.pass(this.blur,this.a);
    }
   }else{this.a?.dispose();this.b?.dispose();this.a=this.b=null;}
   const u=this.grade.uniforms;u.source.value=this.source;u.bloom.value=this.a?.texture||this.source;
   for(const key of ['strength','scatterMix','gamma','contrast','saturation'])u[key].value=s[key];
   // The copied framebuffer is already display-referred, so this tint must
   // stay in sRGB too (Color.set otherwise converts it to linear RGB).
   u.scatterColor.value.set(s.scatterColor).convertLinearToSRGB();
   r.setRenderTarget(target);r.setViewport(viewport);r.setScissor(scissor);r.setScissorTest(scissorTest);
   this.quad.material=this.grade;r.render(this.screen,this.camera);
  }finally{r.setRenderTarget(target);r.setViewport(viewport);r.setScissor(scissor);r.setScissorTest(scissorTest);r.autoClear=auto;}
 }
 pass(shader,target){this.quad.material=shader;this.e.renderer.setRenderTarget(target);this.e.renderer.render(this.screen,this.camera);}
 release(){this.source?.dispose();this.a?.dispose();this.b?.dispose();this.source=this.a=this.b=null;}
}
