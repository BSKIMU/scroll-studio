// Shared 24-frame animation timebase. A playhead is elapsed time (00+00);
// the first drawing/pose cell is position 00+01.
export const FPS=24;

// SS+FF (seconds zero-padded to two digits, frames within the second).
export function framesToTc(frame,fps=FPS){
  const n=Math.max(0,Math.floor(frame));
  return `${String(Math.floor(n/fps)).padStart(2,'0')}+${String(n%fps).padStart(2,'0')}`;
}
// "2+20", "02+20", "2:20" or a plain frame count → frames; NaN when unreadable.
export function tcToFrames(text,fps=FPS){
  const t=String(text).trim(),m=t.match(/^(\d+)\s*[+:]\s*(\d{1,2})$/);
  if(m)return Number(m[1])*fps+Number(m[2]);
  return /^\d+$/.test(t)?Number(t):NaN;
}

export function frameToCellTc(frame,fps=FPS){return framesToTc(Math.max(0,Math.floor(frame))+1,fps);}

export function setFrameKey(keys,frame,pose){
  const f=Math.max(0,Math.round(frame)),index=keys.findIndex(k=>k.frame===f),key={frame:f,pose};
  if(index<0)keys.push(key);else keys[index]=key;
  keys.sort((a,b)=>a.frame-b.frame);
  return key;
}
