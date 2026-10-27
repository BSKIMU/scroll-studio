import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const root=new URL('../dist/',import.meta.url),{skyPresets,hdriLook}=await import('../dist/sky-presets.js'),{hdriFiles}=await import('../dist/hdri-sky.js');
let checked=0;
function file(path){const url=new URL(path,root);assert(url.href.startsWith(root.href)&&!path.includes('local-skies'),'Published assets stay in the release');assert(existsSync(url),'Missing release asset: '+path);const bytes=readFileSync(url);assert(bytes.length>0);checked++;return bytes;}
for(const name of ['bodychan','bodykun','mixamo']){assert.equal(file('assets/'+name+'.glb').readUInt32LE(0),0x46546c67);file('assets/portraits/'+name+'.png');}
for(const p of skyPresets){
 file(p[9]||'assets/sky-previews/'+p[0]+'.webp');
 if(p[0].startsWith('hdri-')){assert(hdriLook(p[0]));assert(file('assets/hdri/'+hdriFiles[p[0]]).subarray(0,10).toString().startsWith('#?'));}
}
file('assets/skies/anime-sky.webp');file('assets/sky-previews/none.webp');
for(const id of ['idle','stop','run','leap','leapMirror']){const clip=JSON.parse(file('assets/pose-lab/motion-clips/'+id+'.json'));assert(clip.tracks?.length>0&&clip.duration>0);}
file('assets/pose-lab/walk-reference.fbx');file('assets/pose-lab/jump-reference.glb');file('assets/interaction-clips.json');
for(const name of ['shape','detail'])file('assets/clouds/'+name+'.bin');
console.log(`PASS: ${checked} model, portrait, sky/thumbnail and motion references exist in publishable paths`);
