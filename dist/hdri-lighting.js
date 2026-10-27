import {DataUtils,Vector3,MathUtils} from 'three';

const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
// Integrate linear HDR radiance with spherical pixel area, not display RGB or
// the brightest single pixel. Three upper-hemisphere lobes keep shadow cost fixed.
export function analyzeHDRLighting({data,width,height}){
 const columns=64,rows=16,cells=Array.from({length:columns*rows},()=>({rgb:[0,0,0]}));
 const pixelAngle=2*Math.PI/width*Math.PI/height;
 for(let y=0;y<height/2;y++){
  const row=Math.min(rows-1,Math.floor(y/(height/2)*rows)),area=Math.sin((y+.5)/height*Math.PI)*pixelAngle;
  for(let x=0;x<width;x++){
   const cell=cells[row*columns+Math.min(columns-1,Math.floor(x/width*columns))],i=(y*width+x)*4;
   for(let c=0;c<3;c++){const value=DataUtils.fromHalfFloat(data[i+c]);if(Number.isFinite(value))cell.rgb[c]+=Math.max(0,value)*area;}
  }
 }
 let total=0;
 cells.forEach((c,i)=>{
  const elevation=Math.PI/2-(Math.floor(i/columns)+.5)/rows*Math.PI/2,phi=((i%columns+.5)/columns-.5)*2*Math.PI;
  c.direction=new Vector3(Math.cos(phi)*Math.cos(elevation),Math.sin(elevation),Math.sin(phi)*Math.cos(elevation));
  c.energy=luminance(c.rgb);total+=c.energy;
 });
 if(total<1e-8)return {mean:0,lobes:[]};
 const strongest=cells.reduce((a,b)=>a.energy>b.energy?a:b),centers=[strongest.direction.clone()];
 while(centers.length<3){
  const next=cells.reduce((a,c)=>{const score=c.energy*Math.min(...centers.map(d=>1-d.dot(c.direction)));return score>a.score?{score,cell:c}:a;},{score:-1});
  centers.push(next.cell.direction.clone());
 }
 const nearest=c=>centers.reduce((best,d,i)=>d.dot(c.direction)>centers[best].dot(c.direction)?i:best,0);
 for(let pass=0;pass<8;pass++){
  const sums=centers.map(()=>new Vector3());
  for(const c of cells)sums[nearest(c)].addScaledVector(c.direction,c.energy);
  sums.forEach((d,i)=>{if(d.lengthSq()>1e-12)centers[i].copy(d).normalize();});
 }
 const colors=centers.map(()=>[0,0,0]);
 for(const c of cells){const i=nearest(c),projection=Math.max(0,centers[i].dot(c.direction));for(let k=0;k<3;k++)colors[i][k]+=c.rgb[k]*projection;}
 const lobes=centers.map((d,i)=>{const intensity=Math.max(...colors[i]);return {direction:d.toArray(),color:colors[i].map(c=>c/Math.max(intensity,1e-8)),intensity};}).sort((a,b)=>b.intensity-a.intensity);
 return {mean:total/(2*Math.PI),lobes};
}

// Same longitude convention as SkyDome: sampling u + rotation moves the source
// in the opposite azimuth direction in world space (Three's +Y rotation).
export function rotatedHDRDirection(direction,degrees){return new Vector3(...direction).applyAxisAngle(new Vector3(0,1,0),MathUtils.degToRad(degrees||0));}
