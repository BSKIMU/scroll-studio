import {buildInstancedScene,toInstancedGLB} from './vendor/formats.js';
self.onmessage=e=>{try{const scene=buildInstancedScene(e.data);if(!scene.meshResources.length)throw Error('모델에서 형상을 찾지 못했습니다.');const bytes=toInstancedGLB(scene,{textures:true});self.postMessage({bytes},[bytes.buffer]);}catch(err){self.postMessage({error:err.message});}};
