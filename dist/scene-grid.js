import {Mesh,PlaneGeometry,ShaderMaterial,Color,Matrix4} from 'three';

// Two triangles, world-space metre markings. Pixel derivatives suppress the
// distant subpixel lines instead of exposing the edge of a finite GridHelper.
export class SceneGrid extends Mesh{
 constructor(){
  super(new PlaneGeometry(2,2),new ShaderMaterial({
   transparent:true,depthWrite:false,toneMapped:false,
   uniforms:{lineColor:{value:new Color('#737982')},unproject:{value:new Matrix4()},project:{value:new Matrix4()}},
   vertexShader:`uniform mat4 unproject;varying vec3 rayStart;varying vec3 rayEnd;
    void main(){
     vec4 start=unproject*vec4(position.xy,-1.0,1.0),end=unproject*vec4(position.xy,0.99,1.0);
     rayStart=start.xyz/start.w;rayEnd=end.xyz/end.w;
     gl_Position=vec4(position.xy,0.0,1.0);
    }`,
   fragmentShader:`varying vec3 rayStart;varying vec3 rayEnd;uniform vec3 lineColor;uniform mat4 project;
    float grid(vec2 position,float scale){
     vec2 coord=position/scale,footprint=max(fwidth(coord),vec2(0.00001));
     vec2 edge=abs(fract(coord-0.5)-0.5)/footprint;
     vec2 line=(1.0-smoothstep(vec2(0.35),vec2(1.15),edge))*(1.0-smoothstep(vec2(0.2),vec2(0.8),footprint));
     return max(line.x,line.y);
    }
    void main(){
     vec3 direction=normalize(rayEnd-rayStart);
     if(abs(direction.y)<0.00001)discard;
     float t=(0.008-rayStart.y)/direction.y;if(t<=0.0)discard;
     vec3 world=rayStart+direction*t;
     vec4 clip=project*vec4(world,1.0);float depth=clip.z/clip.w*.5+.5;
     if(depth<0.0||depth>1.0)discard;gl_FragDepth=depth;
     float distanceXZ=length(world.xz-cameraPosition.xz);
     float alpha=max(grid(world.xz,1.0)*0.55,grid(world.xz,10.0)*0.65);
     // Keep the nearby metre markings, then soften both receding distance and
     // grazing view angles. Scale with height so overhead views remain useful.
     float height=abs(cameraPosition.y-0.008);
     alpha*=1.0-smoothstep(max(8.0,height*2.0),max(100.0,height*40.0),distanceXZ);
     alpha*=smoothstep(0.015,0.22,abs(direction.y));
     gl_FragColor=vec4(lineColor,alpha);
     #include <colorspace_fragment>
    }`
  }));
  this.name='수평선 투시 그리드';this.frustumCulled=false;this.raycast=()=>{};
  this.onBeforeRender=(renderer,scene,camera)=>{const u=this.material.uniforms;u.unproject.value.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse);u.project.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);};
 }
}
