const $=id=>document.getElementById(id);
let saved,csrf;
function fields(){const item=saved.modules.vrijdagpreek;$('module-visible').checked=item.visible;$('module-favourite').checked=item.favourite;}
function render(){
  const item=saved.modules.vrijdagpreek;
  $('vrijdagpreek-card').hidden=!item.visible;
  $('modules-empty').hidden=item.visible;
  $('favourite-badge').hidden=!item.favourite;
  $('module-count').textContent=item.visible?'1 module beschikbaar':'0 zichtbaar · 1 beschikbaar';
  fields();
}
async function load(){
  $('module-fields').disabled=true;$('module-retry').hidden=true;
  $('module-settings-status').textContent='Lokale modulekeuzes laden…';
  try{
    const response=await fetch('/api/modules');if(!response.ok)throw new Error();
    saved=await response.json();render();$('module-fields').disabled=false;
    $('module-settings-status').textContent='Kies wat je op de startpagina ziet. Alleen Opslaan bewaart je keuzes.';
  }catch{$('module-settings-status').textContent='Modulekeuzes niet geladen. De ingangen blijven beschikbaar; probeer opnieuw.';$('module-retry').hidden=false;}
}
$('module-retry').addEventListener('click',load);
$('module-cancel').addEventListener('click',()=>{fields();$('module-settings-status').textContent='Wijzigingen geannuleerd. Je bewaarde keuzes zijn ongewijzigd.';});
$('module-settings').addEventListener('change',()=>{$('module-settings-status').textContent='Niet opgeslagen. Kies Opslaan om deze keuzes te bewaren.';});
$('module-settings').addEventListener('submit',async event=>{
  event.preventDefault();
  const data={version:1,modules:{vrijdagpreek:{visible:$('module-visible').checked,favourite:$('module-favourite').checked}}};
  $('module-fields').disabled=true;$('module-settings-status').textContent='Keuzes opslaan…';
  try{
    // Bootstrap only on explicit submission; no claim, token, microphone or speech imports.
    const boot=await fetch('/api/bootstrap',{method:'POST',headers:{'X-Local-App':'1'}});
    if(!boot.ok)throw new Error();csrf=(await boot.json()).csrf;
    const response=await fetch('/api/modules',{method:'POST',headers:{'Content-Type':'application/json','X-App-Token':csrf},body:JSON.stringify(data)});
    if(!response.ok)throw new Error();
    const confirmed=await fetch('/api/modules');if(!confirmed.ok)throw new Error();
    const value=await confirmed.json();
    if(JSON.stringify(value)!==JSON.stringify(data))throw new Error();
    saved=value;render();$('module-settings-status').textContent='Opgeslagen op deze installatie. Audio en vertaling zijn niet gewijzigd.';
  }catch{$('module-settings-status').textContent='Opslaan niet bevestigd. Je keuzes blijven staan; probeer opnieuw.';}
  finally{$('module-fields').disabled=false;}
});
load();
