const fullscreen=document.getElementById('fullscreen'),fullscreenStatus=document.getElementById('fullscreen-status');
function reflectFullscreen(){
  fullscreen.textContent=document.fullscreenElement?'Volledig scherm verlaten':'Volledig scherm';
  fullscreenStatus.textContent=document.fullscreenElement?'Volledig scherm actief. Esc verlaat volledig scherm.':'Vensterweergave. Klik of druk op Enter voor volledig scherm.';
}
fullscreen.onclick=async()=>{
  try{
    if(document.fullscreenElement){
      if(typeof document.exitFullscreen!=='function')throw Error();
      await document.exitFullscreen();
    }else{
      if(typeof document.documentElement.requestFullscreen!=='function'){
        fullscreenStatus.textContent='Deze browser ondersteunt volledig scherm hier niet. Gebruik de vensterbediening van de browser.';return;
      }
      await document.documentElement.requestFullscreen();
      if(!document.fullscreenElement)throw Error();
    }
    reflectFullscreen();
  }catch{fullscreenStatus.textContent='Volledig scherm is niet gelukt. Probeer opnieuw of gebruik de vensterbediening van de browser.';}
};
document.addEventListener('fullscreenchange',reflectFullscreen);
document.addEventListener('fullscreenerror',()=>{fullscreenStatus.textContent='Volledig scherm is niet gelukt. Gebruik de vensterbediening van de browser.';});
const events=new EventSource('/api/events');
events.onmessage=({data})=>{
  const state=JSON.parse(data);
  document.body.dataset.phase=state.phase||'idle';
  document.body.dataset.textSize=['standard','large','extra-large'].includes(state.presentation?.textSize)?state.presentation.textSize:'standard';
  document.body.dataset.theme=state.presentation?.theme==='dark'?'dark':'light';
  document.getElementById('audience-dutch').textContent=state.dutch||'Wachten op de vertaling…';
  document.getElementById('audience-progress').textContent=state.status;
  document.getElementById('audience-kind').textContent=state.partial?'Wordt aangevuld':'Nederlandse ondertiteling';
};
events.onerror=()=>{
  document.body.dataset.phase='error';
  document.getElementById('audience-progress').textContent='Verbinding verloren · laatste tekst kan verouderd zijn';
};
