import {layerMaskCanvas} from './paint-layer-render.js?v=20261028-guide3';
export function layerDecorations(c,target){
 const wrap=target.parentElement;if(!target.isConnected||!wrap)return;
 for(const old of wrap.querySelectorAll('.pixel-selection-preview,.layer-ruler-preview'))old.remove();
 const layer=c.paintLayers?.find(l=>l.id===c.activeLayer);
 if(c.pixelSelection?.bitmap){const img=document.createElement('img');img.src=c.pixelSelection.bitmap;img.className='pixel-selection-preview';img.alt='';Object.assign(img.style,{inset:'0',width:'100%',height:'100%',filter:'sepia(1) saturate(8) hue-rotate(155deg)'});wrap.append(img);}
 if(layer?.mask?.show){const cv=layerMaskCanvas(c,layer,target.width,target.height),ctx=cv.getContext('2d');ctx.globalCompositeOperation='source-in';ctx.fillStyle='#3a82ff';ctx.fillRect(0,0,cv.width,cv.height);cv.className='pixel-selection-preview';Object.assign(cv.style,{inset:'0',width:'100%',height:'100%'});wrap.append(cv);}
 if(layer?.ruler?.visible){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),line=document.createElementNS(ns,'line'),a=layer.ruler.angle*Math.PI/180,w=target.width,h=target.height,d=Math.hypot(w,h);svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.classList.add('layer-ruler-preview');for(const [k,v]of Object.entries({x1:w/2-Math.cos(a)*d,y1:h/2-Math.sin(a)*d,x2:w/2+Math.cos(a)*d,y2:h/2+Math.sin(a)*d,stroke:'#8d82ff','stroke-width':1.5*w/target.clientWidth,'stroke-dasharray':'8 5'}))line.setAttribute(k,String(v));svg.append(line);wrap.append(svg);}
}
