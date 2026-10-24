export function setupSidebarCollapse(){
 const left=document.querySelector('.workspace>.left'),overview=document.getElementById('pageOverview');
 const controls={};
 for(const [node,key,label,head]of [[left,'story','스토리보드',left.querySelector('.sectionhead')],[overview,'overview','전체 페이지',overview.querySelector('.page-head')]]){
  const button=document.createElement('button');button.className='sidebar-minimize';button.textContent='‹';button.title=label+' 접기';button.setAttribute('aria-label',label+' 접기');head.append(button);
  const rail=document.createElement('button');rail.className='sidebar-restore';rail.textContent='› '+label;rail.title=label+' 펼치기';rail.setAttribute('aria-label',label+' 펼치기');node.append(rail);
  let collapsed=false;try{collapsed=localStorage.getItem('scroll-sidebar-'+key)==='true';}catch{}
  const apply=()=>{node.classList.toggle('side-minimized',collapsed);document.body.classList.toggle('min-'+key,collapsed);button.setAttribute('aria-expanded',String(!collapsed));rail.setAttribute('aria-expanded',String(!collapsed));if(key==='story'){button.textContent=collapsed?'»':'«';button.title=button.ariaLabel='왼쪽 사이드바 '+(collapsed?'펼치기':'접기');}try{localStorage.setItem('scroll-sidebar-'+key,collapsed);}catch{}window.dispatchEvent(new Event('resize'));};
  const setCollapsed=value=>{collapsed=value;apply();};
  button.onclick=()=>setCollapsed(!collapsed);rail.onclick=()=>setCollapsed(false);apply();
  controls[key]={button,setCollapsed,get collapsed(){return collapsed;}};
 }
 return controls;
}
