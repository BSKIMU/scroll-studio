const directions=new Set(['KeyW','KeyA','KeyS','KeyD']);
// A second physical press (not OS key repeat) starts running until movement stops.
export class RunInput{
 constructor(){this.reset();}
 reset(){this.last=new Map();this.held=new Set();this.running=false;}
 down(code,time,repeat=false){if(!directions.has(code)||repeat||this.held.has(code))return;const last=this.last.get(code);if(last!==undefined&&time-last<=300)this.running=true;this.last.set(code,time);this.held.add(code);}
 up(code){this.held.delete(code);if(!this.held.size)this.running=false;}
}
