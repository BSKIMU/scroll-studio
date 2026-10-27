import {SceneShading} from './scene-shading.js?v=20261027-sky-times1';
import {DemandRenderer} from './demand-renderer.js?v=20261025-release1';
import {SelectionOutline} from './selection-outline.js?v=20261027-studio4';

export class ScenePreview{
 constructor(editor){
  this.editor=editor;this.shading=new SceneShading(editor);this.outline=new SelectionOutline(editor);this.light=true;this.frames=0;this.timings=[];
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
 stop(){this.loop.setActive(false);this.lastFrame=null;this.outline.release();this.status.textContent='대기 중 · 자동 절전';}
 paint(){this.shading.paint();this.outline.paint();}
 draw(time){
  const e=this.editor;if(!e.isOpen||e.loading||document.hidden)return false;
  const start=performance.now();e.renderer.info.autoReset=false;e.renderer.info.reset();
  const moving=e.fly?.active?false:e.controls.update();e.fly?.tick(time);e.advanced?.cameraRoll();e.movement?.tick(time);
  const motionMs=performance.now()-start;
  // Only the dock has a visible manuscript consumer. Keep dirty state while it
  // is covered; stop/restore/save flush the final pose at the original resolution.
  const manuscriptVisible=!document.body.classList.contains('scene-maximized')&&!document.fullscreenElement?.contains(e.renderer.domElement);
  const previewPending=manuscriptVisible&&e.previewDirty&&!e.advanced.skies.pending;
  const capture=previewPending&&time-(this.lastPreview??-Infinity)>=Math.max(this.light?160:80,(this.captureMs||0)*3);
  if(capture){const captureStart=performance.now();e.preview();this.captureMs=performance.now()-captureStart;this.lastPreview=time;}
  const paintStart=performance.now();
  this.paint();this.frames++;
  const active=!!(moving||e.fly?.active||e.movement?.active||previewPending&&e.previewDirty);
  this.measure(time,{start,motionMs,paintMs:performance.now()-paintStart,capture,manuscriptVisible,active});
  e.renderer.info.autoReset=true;
  return active;
 }
 measure(time,{start,motionMs,paintMs,capture,manuscriptVisible,active}){
  const e=this.editor,frameMs=performance.now()-start,key=JSON.stringify([this.shading.mode,e.state?.look?.skyPreset,manuscriptVisible,!!e.movement?.active,!!e.fly?.active]);
  if(this.sampleKey!==key){this.timings=[];this.intervals=[];this.lastFrame=null;this.sampleKey=key;}
  if(this.lastFrame!==null)this.intervals.push(time-this.lastFrame);
  this.lastFrame=active?time:null;
  this.timings.push(frameMs);if(this.timings.length>120)this.timings.shift();if(this.intervals.length>120)this.intervals.shift();
  this.status.dataset.renderCount=String(this.frames);
  // Publish diagnostics at 5 Hz, not by sorting and rewriting DOM every frame.
  if(active&&!capture&&time-(this.lastMetrics??-Infinity)<200)return;
  this.lastMetrics=time;
  const samples=[...this.timings].sort((a,b)=>a-b),intervals=[...this.intervals].sort((a,b)=>a-b),round=n=>Math.round(n*100)/100;
  const fps=intervals.length?1000*intervals.length/intervals.reduce((a,b)=>a+b,0):0;
  this.status.textContent=active?`${this.light?'가벼운 화면':'일반 화면'} · ${Math.round(fps)} fps`:'대기 중 · 자동 절전';
  this.status.dataset.metrics=JSON.stringify({shading:this.shading.mode,samples:samples.length,medianMs:round(samples[Math.floor(samples.length*.5)]),p95Ms:round(samples[Math.floor(samples.length*.95)]),fps:round(fps),frameP95Ms:round(intervals[Math.floor(intervals.length*.95)]||0),motionMs:round(motionMs),paintMs:round(paintMs),manuscriptVisible,capture,captureMs:capture?round(this.captureMs):0,geometryBytes:e.geometryBytes||0,frameMs:round(frameMs),calls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles,geometries:e.renderer.info.memory.geometries,textures:e.renderer.info.memory.textures});
  if(capture)this.status.dataset.captureMetrics=this.status.dataset.metrics;
 }
}
