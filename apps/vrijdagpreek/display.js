const subtitle=document.getElementById('audience-dutch');
const progress=document.getElementById('audience-progress');
const events=new EventSource('/api/events');
events.onmessage=({data})=>{const state=JSON.parse(data);subtitle.textContent=state.dutch;progress.textContent=`${state.mode==='prepared'?'VOORBEREID · HANDMATIG':state.mode.toUpperCase()} · ${state.status}`;document.getElementById('audience-kind').textContent=state.mode==='prepared'?'Voorbereide tekst · geen automatische vertaling':state.mode==='live'?'Automatische tekst · fouten mogelijk':state.mode==='demo'?'Vaste voorbeelden':'Lokale microfoontest';};
events.onerror=()=>{progress.textContent='VERBINDING VERLOREN · laatste tekst kan verouderd zijn · opnieuw verbinden…';};
