import {Color} from 'three';
const viewportGray=new Color('#45494f');
import {DemandRenderer} from './demand-renderer.js?v=20261025-release1';

export class ScenePreview{
 constructor(editor){
  this.editor=editor;this.light=true;this.frames=0;
  try{this.light=localStorage.getItem('scroll-light-preview')!=='off';}catch{}
  const panel=document.createElement('details');panel.className='preview-settings';
  panel.innerHTML='<summary>미리보기 성능</summary><label class="check"><input id="lightPreview" type="checkbox">가벼운 화면</label><output id="previewStatus" role="status">대기 중 · 자동 절전</output><small>편집 화면만 가볍게 표시합니다. 컷 저장과 PNG 해상도는 유지됩니다.</small>';
  document.getElementById('sceneRenderMode').before(panel);this.status=panel.querySelector('output');
  const input=panel.querySelector('input');input.checked=this.light;input.onchange=()=>{this.light=input.checked;try{localStorage.setItem('scroll-light-preview',this.light?'on':'off');}catch{}this.setQuality();};
  this.loop=new DemandRenderer(time=>this.draw(time));
  editor.gizmo.transform.addEventListener('change',()=>this.request());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){editor.flush();this.stop();}else this.request();});
  this.setQuality();
 }
 setQuality(){const e=this.editor;e.renderer.setPixelRatio(this.light?1:Math.min(devicePixelRatio,1.5));if(e.cut)e.resize();this.request();}
 request(){this.loop.setActive(this.editor.isOpen&&!document.hidden);this.loop.request();}
 stop(){this.loop.setActive(false);this.status.textContent='대기 중 · 자동 절전';}
 paint(){const e=this.editor,background=e.scene.background;try{if(!e.state?.look?.skyPreset)e.scene.background=viewportGray;e.renderer.render(e.scene,e.camera);}finally{e.scene.background=background;}}
 draw(time){
  const e=this.editor;if(!e.isOpen||e.loading||document.hidden)return false;
  // Motion uses elapsed seconds, independent of display refresh or manuscript zoom.
  // Keep the light preview at 30 rendered frames/s, including its expensive skeleton pass.
  if(this.light&&e.movement?.active&&time-(this.lastPaint??-Infinity)<1000/30-.5)return true;
  this.lastPaint=time;
  const start=performance.now();e.renderer.info.autoReset=false;e.renderer.info.reset();
  const moving=e.controls.update();e.advanced?.cameraRoll();e.movement?.tick(time);
  const capture=e.previewDirty&&time-(this.lastPreview??-Infinity)>=Math.max(this.light?160:80,(this.captureMs||0)*3);
  if(capture){const start=performance.now();e.preview();this.captureMs=performance.now()-start;this.lastPreview=time;}
  this.paint();this.frames++;
  const active=!!(moving||e.movement?.active||e.previewDirty);
  this.status.textContent=active?(this.light?'가벼운 화면 · 조작 중':'일반 화면 · 조작 중'):'대기 중 · 자동 절전';
  this.status.dataset.renderCount=String(this.frames);
  this.status.dataset.metrics=JSON.stringify({capture,captureMs:Math.round((this.captureMs||0)*10)/10,geometryBytes:e.geometryBytes||0,frameMs:Math.round((performance.now()-start)*10)/10,calls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles,geometries:e.renderer.info.memory.geometries,textures:e.renderer.info.memory.textures});
  if(capture)this.status.dataset.captureMetrics=this.status.dataset.metrics;
  e.renderer.info.autoReset=true;
  return active;
 }
}
