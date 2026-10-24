import * as T from 'three';
export const skyPresets=[
 ['blue','푸른 하늘','#2585cf','#c9e7f6','#f9f8ef',.24,4,1.35,48],
 ['sunset','노을','#3e467f','#ff9c6b','#ffc1a2',.35,3.3,.85,12],
 ['winter','겨울 하늘','#8aaec8','#e4edf1','#fff',.28,2.5,1.6,27],
 ['twilight','맑은 황혼','#292b66','#d4a0ba','#d7bfd7',.12,1,.75,8],
 ['cloudy','흐린 날','#707d8c','#c4cbd2','#d2d6db',.85,.8,2,38],
 ['rain','비오는 날','#344658','#8b9fae','#909eaa',.93,.4,1.4,25],
 ['night','깊은 밤','#080f28','#263858','#667da4',.06,.35,.4,40],
 ['storm','폭풍우','#1c2635','#687680','#505e6d',1,.3,.8,20],
 ['summer','여름','#167cc1','#b9e9ed','#fff',.45,4.5,1.4,70],
 ['autumn','가을','#3d7eb8','#e6d8b3','#f5e7d2',.18,3.4,1.1,32],
 ['horror','공포','#171e29','#637660','#657468',.7,.35,.55,10]
];
export class SkyPresets{
 constructor(){this.key=null;this.texture=null;}
 get(id){if(this.key===id)return this.texture;this.texture?.dispose();this.texture=null;this.key=id;const p=skyPresets.find(p=>p[0]===id);if(!p)return null;
  const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const cx=cv.getContext('2d'),g=cx.createLinearGradient(0,0,0,512);g.addColorStop(0,p[2]);g.addColorStop(.5,p[3]);g.addColorStop(1,p[3]);cx.fillStyle=g;cx.fillRect(0,0,1024,512);let seed=73;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<Math.round(16+p[5]*42);i++){const x=rand()*1024,y=70+rand()*180,rx=25+rand()*95,ry=5+rand()*18;cx.globalAlpha=.08+p[5]*.22;cx.fillStyle=p[4];cx.beginPath();cx.ellipse(x,y,rx,ry,0,0,Math.PI*2);cx.fill();}cx.globalAlpha=1;
  if(id==='night'||id==='twilight'){cx.fillStyle='#dce7ff';for(let i=0;i<120;i++){cx.globalAlpha=.25+rand()*.7;cx.fillRect(rand()*1024,rand()*220,1,1);}cx.globalAlpha=1;cx.beginPath();cx.arc(740,160,id==='night'?10:5,0,Math.PI*2);cx.fill();}
  else if(!['cloudy','rain','storm','horror'].includes(id)){const sun=cx.createRadialGradient(740,220,2,740,220,45);sun.addColorStop(0,'#fff6cf');sun.addColorStop(.2,'#fff0bc99');sun.addColorStop(1,'#fff0bc00');cx.fillStyle=sun;cx.fillRect(690,170,100,100);}
  this.texture=new T.CanvasTexture(cv);this.texture.mapping=T.EquirectangularReflectionMapping;this.texture.colorSpace=T.SRGBColorSpace;this.texture.generateMipmaps=false;this.texture.minFilter=T.LinearFilter;return this.texture;
 }
}
