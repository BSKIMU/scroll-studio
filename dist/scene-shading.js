import {Color,MeshMatcapMaterial,DoubleSide} from 'three';
const gray=new Color('#45494f');
const icons={
 sky:'<circle cx="17.5" cy="6" r="2.5"/><path d="M2 20 9 7l5 9 3-5 5 9H2Zm4-7 3 2 2-2"/>',
 light:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>',
 solid:'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12 3 7m9 5v10"/>'
};
export class SceneShading{
 constructor(editor){
  this.e=editor;this.mode='sky';this.material=new MeshMatcapMaterial({color:'#c4c9ce',side:DoubleSide});
  try{const stored=localStorage.getItem('scroll-viewport-shading');if(icons[stored])this.mode=stored;}catch{}
  const group=document.createElement('div');group.className='scene-shading';group.setAttribute('role','group');group.setAttribute('aria-label','3D 화면 표시 모드');this.buttons=[];
  for(const [mode,name]of [['sky','하늘 + 조명'],['light','조명만'],['solid','모델링만']]){
   const button=document.createElement('button');button.title=name+' · 편집 화면';button.setAttribute('aria-label',name);button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[mode]}</svg>`;button.dataset.shading=mode;
   button.onclick=()=>{editor.fly?.finish(true);this.mode=mode;if(mode==='sky'&&!editor.state?.look?.skyPreset){const sky=document.getElementById('skyPreset');sky.value='hdri-day';sky.onchange();}try{localStorage.setItem('scroll-viewport-shading',mode);}catch{}this.sync();editor.invalidate();};group.append(button);this.buttons.push(button);
  }
  document.getElementById('sceneView').append(group);this.sync();
 }
 sync(){for(const b of this.buttons)b.setAttribute('aria-pressed',String(b.dataset.shading===this.mode));}
 paint(){
  const e=this.e,r=e.renderer,background=e.scene.background,dome=e.skyDome?.visible,shadow=r.shadowMap.autoUpdate,materials=[],hidden=[];
  r.domElement.style.filter=this.mode==='solid'?'none':e.advanced.filter();
  try{
   if(this.mode!=='sky'||!e.state?.look?.skyPreset)e.scene.background=gray;
   if(e.skyDome&&this.mode!=='sky')e.skyDome.visible=false;
   if(this.mode==='solid'){
    r.shadowMap.autoUpdate=false;r.domElement.style.filter='none';
    for(const root of [e.environment,e.figures])root.traverse(o=>{if(o.isMesh&&!o.userData.poseMarker){materials.push([o,o.material]);o.material=this.material;}if(o.userData.contiEdge){hidden.push([o,o.visible]);o.visible=false;}});
   }
   r.render(e.scene,e.camera);if(this.mode!=='solid')e.tone.paint();
  }finally{for(const [o,m]of materials)o.material=m;for(const [o,v]of hidden)o.visible=v;e.scene.background=background;if(e.skyDome)e.skyDome.visible=dome;r.shadowMap.autoUpdate=shadow;}
 }
}
