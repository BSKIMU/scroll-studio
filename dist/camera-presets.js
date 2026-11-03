export const presetAngles=[['정면',0],['왼쪽',-90],['오른쪽',90],['왼 사선',-45],['오른 사선',45],['뒤',180]];
export const presetFrames=[
 {id:'full',label:'전신',center:.5,span:1.1,pitch:0},
 {id:'bust',label:'상반신',center:.76,span:.55,pitch:0},
 {id:'face',label:'얼굴',center:.91,span:.27,pitch:0},
 {id:'high',label:'위에서 · 전신',center:.5,span:1.1,pitch:35},
 {id:'low',label:'아래에서 · 전신',center:.5,span:1.1,pitch:-25}
];
export function presetOffset(yaw,pitch,distance){
 const a=yaw*Math.PI/180,b=pitch*Math.PI/180;
 return [Math.sin(a)*Math.cos(b)*distance,Math.sin(b)*distance,Math.cos(a)*Math.cos(b)*distance];
}
export function presetDistance(height,span,fov,aspect){
 const half=Math.max(.1,height*span/2),tan=Math.tan(fov*Math.PI/360);
 const width=height*Math.min(span,.44)/2;
 return Math.max(half/Math.max(.01,tan),width/Math.max(.01,tan*aspect))+.05*height;
}
// One generated raster atlas, shared by all 30 buttons. Row bounds follow the
// artwork's framing; SVG only crops it, without another renderer or animation.
const atlasUrl=new URL('./assets/ui/camera-presets-balanced.png',import.meta.url).href;
const atlasRows=[0,230,457,677,870,1145];
export function presetThumbnail(yaw,frame){
 const column=presetAngles.findIndex(([,angle])=>angle===yaw),row=presetFrames.findIndex(f=>f.id===frame.id);
 const x=column*229+3,y=atlasRows[row]+3,height=atlasRows[row+1]-atlasRows[row]-6;
 const clipId=`camera-preset-crop-${row}-${column}`;
 return `<svg viewBox="${x} ${y} 223 ${height}" aria-hidden="true" focusable="false"><defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="223" height="${height}"/></clipPath></defs><image href="${atlasUrl}" width="1374" height="1145" clip-path="url(#${clipId})"/></svg>`;
}
