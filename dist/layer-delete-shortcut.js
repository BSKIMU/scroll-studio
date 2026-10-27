// Layer rows are rebuilt after selection; their focused button can disappear.
// Keep ownership until the user interacts with another part of the workspace.
export function setupLayerDeleteShortcut(panel,button,root=document){
 let ownsInput=false;
 const track=e=>{if(e.target===root.body)return;ownsInput=panel.contains(e.target);};
 root.addEventListener('pointerdown',track,true);
 root.addEventListener('focusin',track,true);
 return e=>{
  if(!ownsInput&&!panel.contains(e.target))return false;
  e.preventDefault();
  if(!e.repeat&&!button.disabled)button.click();
  return true;
 };
}
