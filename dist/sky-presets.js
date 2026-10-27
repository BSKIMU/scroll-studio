import {CloudSky} from './cloud-sky.js?v=20261027-horizon1';
import {PaintedSky} from './painted-sky.js?v=20261027-horizon1';
import {HDRISky} from './hdri-sky.js?v=20261027-natural1';
import * as T from 'three';
export const skyPresets=[
 ['hdri-day','HDRI 하늘 · 낮','#4599ce','#c4d3e0','#fff5e4',.5,2.5,.8,48],
 ['hdri-sunset','HDRI 하늘 · 노을','#536b8b','#efcfac','#ffcb9a',.5,1.5,.6,5],
 ['hdri-twilight','HDRI 하늘 · 황혼','#3b477e','#b6a1b1','#e5b3c1',.1,0,.2,5],
 ['hdri-night','HDRI 하늘 · 밤 · 달빛 구름','#0b1528','#273342','#9bb8df',0,0,.1,45],
 ['hdri-aurora','HDRI 하늘 · 오로라 · 밤 구름','#071a2b','#17464f','#9be4d5',0,0,.08,35,'./assets/skies/hdri-aurora.webp'],
 ['hdri-predawn','HDRI 하늘 · 일출 전 · 푸른 새벽','#263b65','#b4999a','#b8c8ef',0,0,.18,5],
 ['hdri-dawn','HDRI 하늘 · 새벽 · 동틀녘','#5484ad','#e6c4a5','#ffcc99',0,1,.35,5],
 ['anime-sky','Anime Sky · 애니메이션 하늘','#327fa1','#bce7ec','#fff8e7',.5,3.2,1.35,48],
 ['cloud-day','구름 하늘 · 낮','#2384cb','#c4deec','#fff6e5',.55,4,1.35,48],
 ['cloud-sunset','구름 하늘 · 노을','#394e87','#f3ad82','#ffd4af',.55,3.3,.85,12],
 ['hdri-summer','여름 · 푸른 구름','#167cc1','#b9e9ed','#fff',.45,4.5,1.4,70],
 ['hdri-winter','겨울 · 옅은 구름','#8aaec8','#e4edf1','#fff',.28,.5,1.2,27],
 ['hdri-overcast','흐린 날','#707d8c','#c4cbd2','#d2d6db',.85,.2,1.2,38],
 ['hdri-rain','비오기 전 · 잿빛 구름','#344658','#8b9fae','#909eaa',.93,0,.6,25],
 ['hdri-storm','폭풍우 · 먹구름','#1c2635','#687680','#505e6d',1,0,.3,20],
 ['hdri-autumn','가을 · 따뜻한 하늘','#3d7eb8','#e6d8b3','#f5e7d2',.18,1.5,.7,32],
 ['hdri-horror','어두운 밤','#171e29','#637660','#657468',.7,0,.1,10]
];
// Night/dawn panoramas were photographed at different exposures. Calibrate
// the visible sky and environment together; do not leave daytime lights on.
export const hdriLooks={
 'hdri-day':{skyRotation:125,sourceAzimuth:56,hdriBrightness:1,hdriLight:.7,ambientColor:'#e6efff',ground:'#9299a4',fill:.1},
 'hdri-sunset':{skyRotation:131,sourceAzimuth:49,hdriBrightness:.75,hdriLight:.7,ambientColor:'#e6efff',ground:'#9299a4',fill:.1},
 'hdri-twilight':{skyRotation:129,sourceAzimuth:52,hdriBrightness:.65,hdriLight:.4,ambientColor:'#a2acd9',ground:'#5b617e',fill:.03},
 'hdri-night':{skyRotation:-69,sourceAzimuth:56,hdriBrightness:.06,hdriLight:.14,ambientColor:'#8ba3ce',ground:'#303b56',fill:.02},
 'hdri-aurora':{skyRotation:0,sourceAzimuth:0,hdriBrightness:1,hdriLight:.5,ambientColor:'#89b7c5',ground:'#152d36',fill:.02},
 'hdri-predawn':{skyRotation:125,sourceAzimuth:56,hdriBrightness:.12,hdriLight:.18,ambientColor:'#99b5e7',ground:'#576887',fill:.03},
 'hdri-dawn':{skyRotation:127,sourceAzimuth:54,hdriBrightness:.45,hdriLight:.45,ambientColor:'#b3cbeb',ground:'#7e8ca3',fill:.06}
};
export const legacySkyIds={'cloud-day':'hdri-day','cloud-sunset':'hdri-sunset',blue:'hdri-day',sunset:'hdri-sunset',winter:'hdri-winter',twilight:'hdri-twilight',cloudy:'hdri-overcast',rain:'hdri-rain',night:'hdri-night',storm:'hdri-storm',summer:'hdri-summer',autumn:'hdri-autumn',horror:'hdri-horror'};
Object.assign(hdriLooks,{'hdri-summer':{...hdriLooks['hdri-day']},'hdri-winter':{...hdriLooks['hdri-day'],skyRotation:0,hdriBrightness:.9,hdriLight:.7},'hdri-overcast':{...hdriLooks['hdri-day'],skyRotation:0,hdriBrightness:.8,hdriLight:.65},'hdri-rain':{...hdriLooks['hdri-day'],skyRotation:0,hdriBrightness:.6,hdriLight:.45},'hdri-storm':{...hdriLooks['hdri-day'],skyRotation:0,hdriBrightness:.45,hdriLight:.25},'hdri-autumn':{...hdriLooks['hdri-sunset']},'hdri-horror':{...hdriLooks['hdri-night'],hdriBrightness:.045,hdriLight:.1}});
export function hdriAzimuth(id,rotation){return (((hdriLooks[id]?.sourceAzimuth??56)+rotation+540)%360)-180;}
export function hdriLook(id){const look=hdriLooks[id];if(!look)return null;const {sourceAzimuth,...settings}=look;return {...settings,azimuth:hdriAzimuth(id,look.skyRotation),rim:0};}
export class SkyPresets{
 constructor(renderer,onReady){this.key=null;this.texture=null;this.cloud=new CloudSky(renderer);this.painted=new PaintedSky();this.hdri=new HDRISky(renderer);this.onReady=onReady;this.pending=false;this.ready=Promise.resolve();}
 releaseTexture(){if(this.texture!==this.cloud.target?.texture&&this.texture!==this.painted.texture&&this.texture!==this.hdri.texture)this.texture?.dispose();this.texture=null;this.cloud.dispose();this.painted.dispose();this.hdri.dispose();}
 dispose(){this.key=null;this.releaseTexture();this.pending=false;}
 hdriTexture(id){
  if(this.key===id)return this.texture;
  this.releaseTexture();this.key=id;this.pending=true;this.error=null;
  this.ready=this.hdri.load(id).then(texture=>{if(this.key!==id||!texture)return;this.texture=texture;this.pending=false;this.onReady?.(null,this.hdri.metrics);}).catch(error=>{if(this.key!==id||error.name==='AbortError')return;this.pending=false;this.error=error.message;this.onReady?.(error);});
  return this.texture;
 }
 paintedTexture(id){
  if(this.key===id)return this.texture;
  this.releaseTexture();this.key=id;this.pending=true;this.error=null;
  this.ready=this.painted.load().then(texture=>{if(this.key!==id||!texture)return;this.texture=texture;this.pending=false;this.onReady?.(null,this.painted.metrics);}).catch(error=>{if(this.key!==id||error.name==='AbortError')return;this.pending=false;this.error=error.message;this.onReady?.(error);});
  return this.texture;
 }
 cloudTexture(id,settings){
  const key=JSON.stringify([id,settings.cloudCoverage??.55,settings.cloudSeed??0,settings.azimuth,settings.altitude,settings.lightColor]);
  if(this.key===key)return this.texture;
  const previous=this.texture,cloudOwned=previous===this.cloud.target?.texture;
  if(!cloudOwned)this.releaseTexture();
  this.key=key;this.pending=true;this.error=null;
  const preset=skyPresets.find(p=>p[0]===id);
  this.ready=this.cloud.build(settings,preset).then(texture=>{
   if(this.key!==key||!texture)return;
   this.texture=texture;this.pending=false;this.onReady?.(null,this.cloud.metrics);
  }).catch(error=>{if(this.key!==key||error.name==='AbortError')return;this.pending=false;this.error=error.message;this.onReady?.(error);});
  return this.texture;
 }

 get(id,settings={}){if(id?.startsWith('hdri-'))return this.hdriTexture(id);if(id==='anime-sky')return this.paintedTexture(id);if(id?.startsWith('cloud-'))return this.cloudTexture(id,settings);if(this.key===id)return this.texture;this.releaseTexture();this.pending=false;this.key=id;const p=skyPresets.find(p=>p[0]===id);if(!p)return null;
  const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const cx=cv.getContext('2d'),g=cx.createLinearGradient(0,0,0,512);g.addColorStop(0,p[2]);g.addColorStop(.5,p[3]);g.addColorStop(1,p[3]);cx.fillStyle=g;cx.fillRect(0,0,1024,512);let seed=73;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<Math.round(16+p[5]*42);i++){const x=rand()*1024,y=70+rand()*180,rx=25+rand()*95,ry=5+rand()*18;cx.globalAlpha=.08+p[5]*.22;cx.fillStyle=p[4];cx.beginPath();cx.ellipse(x,y,rx,ry,0,0,Math.PI*2);cx.fill();}cx.globalAlpha=1;
  if(id==='night'||id==='twilight'){cx.fillStyle='#dce7ff';for(let i=0;i<120;i++){cx.globalAlpha=.25+rand()*.7;cx.fillRect(rand()*1024,rand()*220,1,1);}cx.globalAlpha=1;cx.beginPath();cx.arc(740,160,id==='night'?10:5,0,Math.PI*2);cx.fill();}
  else if(!['cloudy','rain','storm','horror'].includes(id)){const sun=cx.createRadialGradient(740,220,2,740,220,45);sun.addColorStop(0,'#fff6cf');sun.addColorStop(.2,'#fff0bc99');sun.addColorStop(1,'#fff0bc00');cx.fillStyle=sun;cx.fillRect(690,170,100,100);}
  this.texture=new T.CanvasTexture(cv);this.texture.mapping=T.EquirectangularReflectionMapping;this.texture.colorSpace=T.SRGBColorSpace;this.texture.generateMipmaps=false;this.texture.minFilter=T.LinearFilter;return this.texture;
 }
}
