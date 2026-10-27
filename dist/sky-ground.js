import {Mesh,PlaneGeometry,MeshStandardMaterial,MathUtils} from 'three';

// A translucent floor retains contact shading while the actual lower HDRI
// hemisphere shows through. Fade only the floor, never recolor the panorama.
export class SkyGround extends Mesh{
 constructor(){
  const material=new MeshStandardMaterial({color:'#c7ccba',roughness:1,metalness:0,transparent:true,opacity:.2,depthWrite:false});
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 horizonWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nhorizonWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader='varying vec3 horizonWorld;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`float haze=smoothstep(20.0,220.0,length(horizonWorld.xz-cameraPosition.xz));
    diffuseColor.a*=1.0-haze;
    #include <opaque_fragment>`);
  };
  super(new PlaneGeometry(20000,20000),material);this.rotation.x=-Math.PI/2;this.receiveShadow=true;this.castShadow=false;this.frustumCulled=false;this.renderOrder=-9999;this.name='HDRI 수평선 바닥';this.visible=false;this.raycast=()=>{};
 }
 configure(texture,settings,height=0,color=null){
  this.visible=!!texture?.userData.hdri&&settings.hdriGround!==false;
  this.position.y=height-.15;this.material.color.set(color||settings.hdriGroundColor||'#c7ccba');
  this.material.opacity=MathUtils.clamp(settings.hdriGroundOpacity??.2,0,1);
 }
}
