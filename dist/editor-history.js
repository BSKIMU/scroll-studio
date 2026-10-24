// Whole-document snapshots keep page settings, fonts and layers in the same undo step.
// Data URLs are immutable strings: copy containers, retain the large string values.
export function copyDocument(value){
 if(Array.isArray(value))return value.map(copyDocument);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copyDocument(v)]));
 return value;
}
export function sameDocument(a,b){
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 const ak=Object.keys(a),bk=Object.keys(b);
 return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&sameDocument(a[k],b[k]));
}
export class EditorHistory{
 constructor(limit=25){this.limit=limit;this.clear();}
 clear(){this.past=[];this.future=[];}
 capture(project,selected){return {project:copyDocument(project),selected};}
 checkpoint(project,selected){this.past.push(this.capture(project,selected));if(this.past.length>this.limit)this.past.shift();this.future=[];}
 travel(from,to,project,selected){
  while(from.length){const next=from.pop();if(sameDocument(next.project,project))continue;to.push(this.capture(project,selected));return next;}
  return null;
 }
 undo(project,selected){return this.travel(this.past,this.future,project,selected);}
 redo(project,selected){return this.travel(this.future,this.past,project,selected);}
}
export function typingTarget(target){return !!(target?.isContentEditable||target?.closest?.('textarea,input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=button]):not([type=submit])'));}
export function editorShortcut(e){
 if(e.defaultPrevented||e.isComposing||e.keyCode===229||typingTarget(e.target))return null;
 const key=e.code||e.key;
 if(e.ctrlKey||e.metaKey){if(key==='KeyZ'||e.key.toLowerCase()==='z')return e.shiftKey?'redo':'undo';if(key==='KeyY'||e.key.toLowerCase()==='y')return 'redo';return null;}
 if(['Delete','Backspace'].includes(e.key)&&e.target?.tagName!=='SELECT')return 'delete';
 return null;
}
