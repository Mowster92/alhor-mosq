const form=document.getElementById('feedback-form');
const text=document.getElementById('feedback-text');
const status=document.getElementById('feedback-status');
const receipt=document.getElementById('feedback-receipt');
const details=document.getElementById('operator-feedback');
let token=null,submissionKey=crypto.randomUUID();

async function bootstrap(){
  if(token)return token;
  const response=await fetch('/api/bootstrap',{method:'POST',headers:{'X-Local-App':'1'}});
  if(!response.ok)throw new Error('Lokale app niet bereikbaar.');
  token=(await response.json()).csrf;
  return token;
}

function showReceipt(item){
  form.hidden=true;
  receipt.hidden=false;
  receipt.querySelector('[data-feedback-reference]').textContent=item.id;
  receipt.querySelector('[data-feedback-body]').textContent=item.body;
  const url=new URL(location.href);url.searchParams.set('feedback',item.id);
  receipt.querySelector('[data-feedback-link]').href=url.href;
  details.open=true;
  status.textContent='Melding bewaard.';
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  const body=text.value.trim();
  if(!body||body.length>800){status.textContent='Schrijf een korte melding van maximaal 800 tekens.';return;}
  form.querySelector('button').disabled=true;
  status.textContent='Melding bewaren…';
  try{
    const csrf=await bootstrap();
    const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json','X-App-Token':csrf},
      body:JSON.stringify({body,submissionKey})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Melding niet bewaard.');
    showReceipt(result);
    const url=new URL(location.href);url.searchParams.set('feedback',result.id);
    history.replaceState(null,'',url);
  }catch(error){status.textContent=error.message||'Melding niet bewaard. Probeer het opnieuw.';}
  finally{form.querySelector('button').disabled=false;}
});

const savedId=new URL(location.href).searchParams.get('feedback');
if(savedId&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(savedId)){
  details.open=true;
  status.textContent='Bewaarde melding ophalen…';
  try{
    const csrf=await bootstrap();
    const response=await fetch(`/api/feedback/${savedId}`,{headers:{'X-App-Token':csrf}});
    const item=await response.json();
    if(!response.ok)throw new Error(item.error||'Melding niet gevonden.');
    showReceipt(item);
  }catch(error){status.textContent=error.message||'Melding niet beschikbaar.';}
}
