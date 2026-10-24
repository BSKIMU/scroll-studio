// Resolve bundled motion assets from this module, including project-site subpaths.
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
const base=new URL('../assets/pose-lab/',import.meta.url).href;
export const MOTION_URLS={walk:base+'walk-reference.fbx',jump:base+'jump-reference.glb'};
export const pickMotion=(object,url)=>object.animations.find(c=>c.duration>0&&c.tracks.length)||(()=>{throw Error('모션을 읽지 못했습니다: '+url);})();
let source;
export function loadMixamoSource(){source??=new FBXLoader().loadAsync(MOTION_URLS.walk).catch(error=>{source=null;throw error;});return source;}
export async function loadMixamoBody(){const original=await loadMixamoSource();return clone(original);}
export async function loadMotionClips(ids){return Object.fromEntries(await Promise.all(ids.map(async id=>{const response=await fetch(base+'motion-clips/'+id+'.json');if(!response.ok)throw Error('모션 파일을 읽지 못했습니다: '+id);return [id,T.AnimationClip.parse(await response.json())];})));}
