import {detectPanels} from './panel-detection.js?v=20261025-release1';
self.onmessage=({data:d})=>{try{self.postMessage({candidates:detectPanels(new Uint8ClampedArray(d.bytes),d.w,d.h,d.options)});}catch(e){self.postMessage({error:e.message});}};

