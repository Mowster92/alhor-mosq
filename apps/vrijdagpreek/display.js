const events=new EventSource('/api/events');
events.onmessage=({data})=>{
  const state=JSON.parse(data);
  document.body.dataset.phase=state.phase||'idle';
  document.getElementById('audience-dutch').textContent=state.dutch||'Wachten op de vertaling…';
  document.getElementById('audience-progress').textContent=state.status;
  document.getElementById('audience-kind').textContent=state.partial?'Wordt aangevuld':'Nederlandse ondertiteling';
};
events.onerror=()=>{
  document.body.dataset.phase='error';
  document.getElementById('audience-progress').textContent='Verbinding verloren · laatste tekst kan verouderd zijn';
};
