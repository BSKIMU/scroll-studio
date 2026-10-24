import * as T from 'three';

export const lightingDefaults={ambientColor:'#e6efff',fill:.35,fillColor:'#b9d1ff',rim:.3,rimColor:'#ffe0bb',shadowSoftness:2,shadowFocus:12};
const base={shadows:true,contrast:100,saturation:100,exposure:1,shadowFocus:12,shadowSoftness:2,...lightingDefaults};
export const lightingPresets=[
 ['창가 자연광',{...base,sun:3.2,ambient:1.4,lightColor:'#fff0d9',ambientColor:'#e3eeff',ground:'#b0bac3',azimuth:-90,altitude:32,fill:.45,rim:.15,shadowSoftness:3,shadowFocus:5,exposure:1.1}],
 ['스튜디오',{...base,sun:3,ambient:1.1,lightColor:'#fff5e9',ground:'#8893a5',azimuth:35,altitude:55}],
 ['한낮',{...base,sun:3.5,ambient:.85,lightColor:'#fff6e5',ground:'#9daabd',azimuth:-45,altitude:65,fill:.25,rim:.2}],
 ['오후',{...base,sun:3.1,ambient:.7,lightColor:'#ffd3a0',ambientColor:'#b9d4ff',ground:'#7989ad',azimuth:-55,altitude:38,fill:.2,rim:.5,rimColor:'#ffc883',contrast:105}],
 ['노을',{...base,sun:2.4,ambient:.55,lightColor:'#ffac70',ambientColor:'#b7bde6',ground:'#696a91',azimuth:110,altitude:18,fill:.15,rim:.6,rimColor:'#ffad75',exposure:1.05}],
 ['새벽',{...base,sun:2.2,ambient:.8,lightColor:'#ffd2aa',ambientColor:'#9fc8ff',ground:'#6685ba',azimuth:-110,altitude:22,fill:.3,fillColor:'#aecfff',rim:.35}],
 ['한밤',{...base,sun:.8,ambient:.3,lightColor:'#adc7ff',ambientColor:'#6c84bc',ground:'#424d74',azimuth:-30,altitude:50,fill:.1,fillColor:'#8fa9db',rim:.35,rimColor:'#aec9ff',exposure:.85,saturation:85}],
 ['흐림',{...base,sun:1,ambient:1.7,lightColor:'#e1eaff',ground:'#929cae',azimuth:25,altitude:65,fill:.2,rim:.1,shadowSoftness:4,contrast:95}],
 ['천둥',{...base,sun:5,ambient:.25,lightColor:'#cde4ff',ambientColor:'#8d9cc5',ground:'#525e86',azimuth:100,altitude:45,fill:.05,rim:.8,rimColor:'#d5e7ff',contrast:110}]
];

// A fixed-size map covers the current composition rather than the whole palace.
export function updateLightFrame(e,s){
 const center=e.controls.target.clone(),radius=T.MathUtils.clamp(s.shadowFocus||12,4,40),a=T.MathUtils.degToRad(s.azimuth),h=T.MathUtils.degToRad(s.altitude);
 e.sun.target.position.copy(center);e.sun.position.copy(center).add(new T.Vector3(Math.sin(a)*Math.cos(h),Math.sin(h),Math.cos(a)*Math.cos(h)).multiplyScalar(60));
 const eye=e.camera.position.clone().sub(center);eye.y=Math.max(2,eye.y);eye.normalize();
 e.fillLight.position.copy(center).addScaledVector(eye,20);e.rimLight.position.copy(center).addScaledVector(eye,-20);e.rimLight.position.y+=10;
 for(const light of [e.sun,e.fillLight,e.rimLight]){light.target.position.copy(center);if(!light.target.parent)e.scene.add(light.target);}
 Object.assign(e.sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,near:.5,far:160});e.sun.shadow.camera.updateProjectionMatrix();
}

export function applyLighting(e,s){
 e.sun.color.set(s.lightColor);e.sun.intensity=s.sun;e.sun.castShadow=s.shadows;
 e.ambient.color.set(s.ambientColor);e.ambient.intensity=s.ambient;e.ambient.groundColor.set(s.ground);
 e.fillLight.color.set(s.fillColor);e.fillLight.intensity=s.fill;e.rimLight.color.set(s.rimColor);e.rimLight.intensity=s.rim;
 e.renderer.toneMappingExposure=s.exposure;e.renderer.shadowMap.enabled=s.shadows;e.renderer.shadowMap.type=T.PCFShadowMap;
 e.sun.shadow.mapSize.set(2048,2048);e.sun.shadow.normalBias=.012;e.sun.shadow.bias=-.00008;e.sun.shadow.radius=s.shadowSoftness;
 updateLightFrame(e,s);
}
