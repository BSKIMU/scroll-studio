import {blendModes} from './blend-modes.js?v=20261025-release1';
const image=value=>{if(value!=null&&(typeof value!=='string'||!/^data:image\/(png|jpeg|webp|gif|bmp);base64,/i.test(value)))throw Error('지원하지 않는 레이어 이미지입니다.');};
export function validateLayerData(project){
 for(const c of project.cuts){if(c.paintLayers&&!Array.isArray(c.paintLayers))throw Error('레이어 목록이 올바르지 않습니다.');const ids=new Set();for(const l of c.paintLayers||[]){if(!l.id||ids.has(l.id))throw Error('중복된 레이어 ID입니다.');ids.add(l.id);image(l.bitmap);image(l.mask?.bitmap);image(l.file?.source);if(l.blendMode&&!blendModes[l.blendMode])throw Error('지원하지 않는 합성 모드입니다.');for(const v of Object.values(l.transform||{}))if(!Number.isFinite(v))throw Error('레이어 변형 값이 올바르지 않습니다.');if(l.mask?.feather!=null&&(!Number.isFinite(l.mask.feather)||l.mask.feather<0||l.mask.feather>100))throw Error('마스크 흐림 값이 올바르지 않습니다.');}
  image(c.pixelSelection?.bitmap);for(const s of c.strokes||[]){image(s.selectionMask);image(s.brushSettings?.tipImage||null);image(s.brushSettings?.textureImage||null);}
 }
 for(const pg of project.pages||[]){if(pg.layerFolders&&!Array.isArray(pg.layerFolders))throw Error('레이어 폴더가 올바르지 않습니다.');for(const f of pg.layerFolders||[]){if(!Array.isArray(f.keys))throw Error('폴더 내용이 올바르지 않습니다.');let current=f;const seen=new Set();while(current){if(seen.has(current.id))throw Error('레이어 폴더가 서로를 포함하고 있습니다.');seen.add(current.id);current=pg.layerFolders.find(x=>x.id===current.parent);}}}
 return project;
}
