// These are app presets inspired by the documented tools, not CSP's proprietary values.
export const presetTool=p=>p.erase?'erase':p.family|| (p.brush==='airbrush'?'airbrush':'draw');
const air=(name,size,hardness,settings)=>({name,family:'airbrush',brush:'airbrush',size,hardness,opacity:65,smoothing:0,pressure:true,brushSettings:{sprayFootprint:true,minSize:100,opacityPressure:true,continuousSpray:true,sprayRate:20,spacing:12,density:18,...settings}});
export const airbrushPresets=[
 air('부드러움',160,0,{density:12,spacing:8}),
 air('스프레이',160,85,{particleSize:5,particles:24,scatter:100,sizeJitter:65,density:65,spacing:12}),
 air('물보라',220,95,{particleSize:17,particles:7,scatter:100,sizeJitter:85,density:85,spacing:25}),
 air('노이즈',150,100,{particleSize:2,particles:32,scatter:100,sizeJitter:30,density:60,spacing:5}),
 air('번짐 스프레이',200,15,{particleSize:28,particles:9,scatter:100,sizeJitter:75,roundness:65,angleJitter:180,density:30,spacing:18,texture:'paper',textureDepth:65,textureScale:3})
];
const water=(name,size,settings)=>({name,family:'brush',size,opacity:55,hardness:85,smoothing:18,pressure:true,brushSettings:{minSize:35,spacing:10,density:16,opacityPressure:true,texture:'paper',textureDepth:30,textureScale:3,...settings}});
export const watercolorPresets=[
 {...water('투명 수채',55,{density:10}),hardness:70},
 water('진한 수채',65,{density:30,edge:5,edgeDarkness:20}),
 water('수채 둥근 붓',80,{minSize:60,density:18,edge:3,edgeDarkness:15}),
 water('마른 붓',45,{tip:'square',roundness:25,followDirection:true,textureDepth:90,spacing:5,density:45,sizeJitter:18})
];
