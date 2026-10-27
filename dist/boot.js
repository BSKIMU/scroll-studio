// The start dialog is already in the HTML; never expose the unfinished editor.
const welcome=document.getElementById('welcome'),status=document.getElementById('bootStatus');
try{
 await import('./app.js?v=20261027-pose-camera1');
 welcome.inert=false;status.hidden=true;document.documentElement.classList.remove('app-starting');
}catch(error){
 console.error('Studio startup failed:',error);
 welcome.inert=false;welcome.querySelectorAll('button').forEach(button=>button.disabled=true);
 status.textContent='작업 환경을 준비하지 못했습니다. 로컬 서버 연결을 확인하고 다시 시도해 주세요.';
 const retry=document.createElement('button');retry.textContent='다시 불러오기';retry.onclick=()=>location.reload();status.append(retry);
}
