import {Mesh,SphereGeometry,ShaderMaterial,BackSide,Color,MathUtils} from 'three';
import {SkyGround} from './sky-ground.js?v=20261027-groundfade1';

// Inward-facing 360° sphere. Removing view translation keeps the distant sky
// wrapped around every camera without making it collide with or cover the set.
export class SkyDome extends Mesh{
 constructor(){
  super(new SphereGeometry(1,48,24),new ShaderMaterial({side:BackSide,depthWrite:false,depthTest:true,
   uniforms:{cubeMap:{value:null},panorama:{value:null},isCube:{value:1},hemisphere:{value:false},horizonAngle:{value:-.56},skyRotation:{value:0},brightness:{value:1},lowerSky:{value:new Color('#d9f2f5')}},
   vertexShader:`varying vec3 skyDirection;
    void main(){skyDirection=position;vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0);gl_Position=clip.xyww;}`,
   fragmentShader:`uniform samplerCube cubeMap;uniform sampler2D panorama;uniform bool isCube;uniform bool hemisphere;uniform float horizonAngle;uniform float skyRotation;uniform float brightness;uniform vec3 lowerSky;varying vec3 skyDirection;
    void main(){vec3 d=normalize(skyDirection);float elevation=asin(clamp(d.y,-1.0,1.0));vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,elevation*.318309886+.5);
     // A painted upper hemisphere has a pale, open lower margin. Place its cloud
     // belt at/below the set horizon, retaining continuous longitude and zenith.
     uv.x=fract(uv.x+skyRotation);
     if(hemisphere){uv.y=.14+.86*clamp((elevation-horizonAngle)/(1.570796327-horizonAngle),0.0,1.0);}
     gl_FragColor=isCube?textureCube(cubeMap,d):texture2D(panorama,uv);
     if(hemisphere)gl_FragColor.rgb=mix(lowerSky,gl_FragColor.rgb,smoothstep(horizonAngle-.48,horizonAngle,elevation));
     gl_FragColor.rgb*=brightness;
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`
  }));
  this.name='360° 고정 스카이돔';this.visible=false;this.frustumCulled=false;this.renderOrder=-10000;this.raycast=()=>{};this.userData.skyDome=true;
  this.ground=new SkyGround();this.add(this.ground);
 }
 setTexture(texture){this.visible=!!texture;if(!texture?.userData.hdri)this.ground.visible=false;const m=this.material;m.uniforms.isCube.value=!!texture?.isCubeTexture;m.uniforms.cubeMap.value=texture?.isCubeTexture?texture:null;m.uniforms.panorama.value=texture&&!texture.isCubeTexture?texture:null;m.uniforms.hemisphere.value=!!texture?.userData.hemisphere;const toneMapped=!texture?.userData.painted;if(m.toneMapped!==toneMapped){m.toneMapped=toneMapped;m.needsUpdate=true;}}
 configure(settings,height=0,groundColor=null){const texture=this.material.uniforms.panorama.value;this.material.uniforms.horizonAngle.value=MathUtils.degToRad(MathUtils.clamp(settings.skyHorizon??-32,-60,10));this.material.uniforms.skyRotation.value=(settings.skyRotation??0)/360;this.material.uniforms.brightness.value=texture?.userData.hdri?(settings.hdriBrightness??1):1;this.ground.configure(texture,settings,height,groundColor);}
}
