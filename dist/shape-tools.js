export const shapeTools=['line','curve','rect','ellipse'];
export function curvePoints(a,b,width,height,bend=.4){
 const dx=(b[0]-a[0])*width,dy=(b[1]-a[1])*height;
 const control=[(a[0]+b[0])/2-dy*bend/width,(a[1]+b[1])/2+dx*bend/height];
 return Array.from({length:65},(_,i)=>{const t=i/64,u=1-t;return [u*u*a[0]+2*u*t*control[0]+t*t*b[0],u*u*a[1]+2*u*t*control[1]+t*t*b[1],1];});
}
