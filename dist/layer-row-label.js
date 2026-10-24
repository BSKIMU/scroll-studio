import {blendModes} from './blend-modes.js?v=20261025-release1';
export const lockIcon=locked=>`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="2"/><path d="${locked?'M6 9V6a4 4 0 018 0v3':'M6 9V6a4 4 0 018 0'}"/><path d="M10 12v3"/></svg>`;
export function layerCaption(button,model,label){
 const caption=document.createElement('span'),meta=document.createElement('span'),name=document.createElement('span');caption.className='layer-caption';meta.className='layer-meta';name.className='layer-title';name.textContent=label;caption.append(meta,name);button.replaceChildren(caption);
 const update=()=>meta.textContent=`${model.opacity??100}% ${blendModes[model.blendMode]||'표준'}`;update();return update;
}
