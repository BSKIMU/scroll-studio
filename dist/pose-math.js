// Two-segment limb solve. Preserve both lengths and the existing bend plane.
export function solveLimb(a,b,c,target){
 const sub=(x,y)=>x.map((v,i)=>v-y[i]),dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0),len=x=>Math.hypot(...x),mul=(x,n)=>x.map(v=>v*n),add=(x,y)=>x.map((v,i)=>v+y[i]);
 const l1=len(sub(b,a)),l2=len(sub(c,b)),raw=sub(target,a);let d=len(raw),direction=d>1e-8?mul(raw,1/d):[0,-1,0];
 d=Math.max(Math.abs(l1-l2)+1e-5,Math.min(l1+l2-1e-5,d));
 let bend=sub(sub(b,a),mul(direction,dot(sub(b,a),direction)));
 if(len(bend)<1e-5){const pole=Math.abs(direction[2])<.9?[0,0,1]:[1,0,0];bend=sub(pole,mul(direction,dot(pole,direction)));}
 bend=mul(bend,1/len(bend));const along=(l1*l1-l2*l2+d*d)/(2*d),across=Math.sqrt(Math.max(0,l1*l1-along*along));
 return [add(add(a,mul(direction,along)),mul(bend,across)),add(a,mul(direction,d))];
}
