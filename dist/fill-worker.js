import {floodSpans} from './flood-fill.js?v=20261025-release1';
self.onmessage=({data:d})=>{try{self.postMessage(floodSpans(new Uint8ClampedArray(d.data),d.w,d.h,d.x,d.y,d.tolerance,d.options));}catch(e){self.postMessage({error:e.message});}};
