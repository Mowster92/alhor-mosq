import {LiveSession,micError} from './live.js';
import {pausedExample} from './example-context.js';
export const DEMO_LINES = [
  { arabic: 'الحمد لله رب العالمين.', dutch: 'Alle lof komt toe aan God, Heer van de werelden.' },
  { arabic: 'نلتقي اليوم بقلوبٍ هادئةٍ ونوايا طيبة.', dutch: 'Vandaag komen we samen met rustige harten en goede intenties.' },
  { arabic: 'الرحمة تبدأ بالكلمة الصادقة والعمل الصالح.', dutch: 'Barmhartigheid begint met een oprecht woord en goed handelen.' },
  { arabic: 'نسأل الله السلام لنا ولجميع الناس.', dutch: 'Wij vragen God om vrede voor ons en voor alle mensen.' }
];
const $=id=>document.getElementById(id);
fetch('/api/identity').then(r=>r.json()).then(identity=>{
  $('candidate-status').textContent=identity.state==='identified'
    ? `Lokale versie: ${identity.version}` : 'Lokale versie onbekend — bron gewijzigd of nog niet vastgelegd.';
}).catch(()=>{$('candidate-status').textContent='Lokale versie niet bereikbaar.';});
let csrf,configured=false, lease=null,epoch=0,timer,heartbeat,context,frame,busy=false;
let state={arabic:'',dutch:'Klaar om te beginnen.',mode:'demo',status:'Gereed',active:false};
const owner=crypto.randomUUID();
let queue=Promise.resolve();
let preparation={title:'Nieuwe voorbereiding',lines:[{arabic:'',dutch:''}]},cue=0;
let savedPreparations=[],selectedPreparationId=null,preparationDirty=false;
function captureCue(){preparation.title=$('preparation-title').value;preparation.lines[cue]={arabic:$('preparation-arabic').value,dutch:$('preparation-dutch').value};}
function refreshLibrary(){
 $('saved-preparations').replaceChildren(new Option('Nieuwe voorbereiding',''),
  ...savedPreparations.map(item=>new Option(item.title,item.id)));
 $('saved-preparations').value=selectedPreparationId||'';
}
function discardChanges(){return !preparationDirty||window.confirm('Niet-opgeslagen wijzigingen verlaten? De bewaarde voorbereidingen blijven staan.');}
function choosePreparation(id){
 selectedPreparationId=id||null;
 const chosen=savedPreparations.find(item=>item.id===selectedPreparationId);
 preparation=chosen?{title:chosen.title,lines:chosen.lines.map(line=>({...line}))}:{title:'Nieuwe voorbereiding',lines:[{arabic:'',dutch:''}]};
 cue=0;preparationDirty=false;refreshLibrary();editor();
 $('preparation-progress').textContent=chosen?'Bewaarde voorbereiding geopend. Nog niet aan publiek getoond.':'Nieuwe voorbereiding. Nog niet opgeslagen.';
}
function editor(){
 $('preparation-title').value=preparation.title;
 $('preparation-cue').replaceChildren(...preparation.lines.map((line,i)=>new Option(`${i+1} / ${preparation.lines.length}`,String(i))));
 $('preparation-cue').value=String(cue);$('preparation-arabic').value=preparation.lines[cue].arabic;$('preparation-dutch').value=preparation.lines[cue].dutch;
 render();
}
function showCue(){publish({...preparation.lines[cue],mode:'prepared',active:true,status:`Voorbereid · handmatig · ${cue+1} / ${preparation.lines.length}`});}
async function api(path,data={},session=lease) {
  const response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-App-Token':csrf},body:JSON.stringify({...data,owner,generation:session})});
  const result=await response.json(); if(!response.ok)throw new Error(result.error); return result;
}
function render(){
  $('arabic').textContent=state.arabic||'—'; $('dutch').textContent=state.dutch;
  $('status').textContent=state.status; $('mode-label').textContent=state.mode==='prepared'?'VOORBEREID':state.mode.toUpperCase();
  for(const id of ['start','restart','test-mic','list-mics','live-start','device','language'])$(id).disabled=busy||state.active;
  $('live-start').disabled ||= !configured;
  $('improve-app').disabled=busy||!['demo','prepared'].includes(state.mode);
  const unavailable=busy||(state.active&&state.mode!=='prepared');
  for(const id of ['save-preparation','present-preparation','add-cue','remove-cue','preparation-title','preparation-cue','preparation-arabic','preparation-dutch'])$(id).disabled=unavailable;
  for(const id of ['saved-preparations','new-preparation','example-preparation'])$(id).disabled=busy||state.active;
  $('add-cue').disabled ||= preparation.lines.length>=10;$('remove-cue').disabled ||= preparation.lines.length===1;
  for(const id of ['previous-cue','next-cue','show-cue'])$(id).disabled=busy||state.mode!=='prepared'||!state.active;
  $('previous-cue').disabled ||= cue===0;$('next-cue').disabled ||= cue===preparation.lines.length-1;
}
function publish(change){
  Object.assign(state,change);render();
  const snapshot={...state},session=lease,current=epoch;
  if(session!==null)queue=queue.then(()=>current===epoch?api('state',snapshot,session):null).catch(()=>{if(current===epoch){lease=null;stop('Lokale verbinding verloren — audio gestopt.');}});
}
function stop(message='Gestopt — laatste ondertitel blijft staan'){
  epoch++; busy=false; clearInterval(timer);clearInterval(heartbeat);live.stop();
  cancelAnimationFrame(frame);context?.close().catch(()=>{});context=null;$('level').value=0;
  window.speechSynthesis?.cancel();
  publish({active:false,status:message});
}
async function claim(current){
  const result=await api('claim');
  if(current!==epoch){await api('release',{},result.generation);return;}
  lease=result.generation;
  const session=lease;
  heartbeat=setInterval(()=>api('heartbeat',{},session).catch(()=>{if(current===epoch){lease=null;stop('Operatorverbinding verloren — audio gestopt.');}}),4000);
}
async function begin(mode,action){
  stop(); const current=epoch;busy=true;render();
  try{await queue;if(current!==epoch)return;await claim(current);if(current!==epoch)return;publish({mode,active:true,arabic:'',dutch:'',status:'Starten…'});await action(current);}
  catch(error){if(current===epoch)stop(error.message);}
  finally{if(current===epoch){busy=false;render();}}
}
const live=new LiveSession({media:navigator.mediaDevices,sdk:window.SpeechSDK,token:()=>api('token',{consent:true}),emit:event=>{
  if(event.error)stop(event.error);
  else if(event.notice)publish({status:event.notice});
  else publish({arabic:event.arabic,dutch:event.dutch,status:event.partial?'Live · voorlopige vertaling':'Live · automatische vertaling'});
}});
async function listDevices(){
  busy=true;render();const current=epoch;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});stream.getTracks().forEach(t=>t.stop());
    if(current!==epoch)return;
    const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');
    $('device').replaceChildren(...devices.map((d,i)=>new Option(d.label||`Microfoon ${i+1}`,d.deviceId)));
    state.status=devices.length?'Kies een microfoon en test lokaal. Geen cloud gebruikt.':'Geen microfoon gevonden. Controleer Windows/driver.';
  }catch(error){state.status=micError(error);}finally{busy=false;render();}
}
$('list-mics').onclick=listDevices;
$('test-mic').onclick=()=>begin('test',async current=>{
  const stream=await live.capture($('device').value);if(!stream||current!==epoch)return;
  context=new AudioContext();await context.resume();if(current!==epoch)return;
  const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);
  const samples=new Float32Array(analyser.fftSize);
  const meter=()=>{if(current!==epoch)return;analyser.getFloatTimeDomainData(samples);$('level').value=Math.min(100,Math.sqrt(samples.reduce((s,v)=>s+v*v,0)/samples.length)*300);frame=requestAnimationFrame(meter);};meter();
  publish({status:'Lokale niveautest · geen cloud · geen luidsprekerweergave'});
});
$('live-start').onclick=()=>{
  if(!$('consent').checked){state.status='Geef eerst expliciet toestemming voor audio naar Azure.';render();return;}
  begin('live',()=>live.start($('device').value,$('language').value));
};
function demo(){begin('demo',()=>{
  let index=0;
  const advance=()=>{if(index===DEMO_LINES.length){stop('Demo voltooid · 4 / 4 regels');return;}
    const line=DEMO_LINES[index++];publish({...line,status:`DEMO fixture · ${index} / 4 regels`});
    const voice=window.speechSynthesis?.getVoices().find(v=>v.localService&&v.lang.startsWith('ar'));
    if(voice&&$('demo-audio').checked){window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(line.arabic);utterance.voice=voice;utterance.lang=voice.lang;window.speechSynthesis.speak(utterance);}
  };advance();timer=setInterval(advance,5200);
});}
$('start').onclick=demo;$('restart').onclick=demo;$('stop').onclick=()=>stop();
$('saved-preparations').onchange=()=>{
 const next=$('saved-preparations').value;
 if(!discardChanges()){$('saved-preparations').value=selectedPreparationId||'';return;}
 choosePreparation(next);
};
$('new-preparation').onclick=()=>{if(discardChanges())choosePreparation(null);};
$('example-preparation').onclick=()=>{
 if(!discardChanges())return;
 choosePreparation(null);
 preparation={title:'Voorbeeldpreek: vrede en barmhartigheid',lines:DEMO_LINES.map(line=>({...line}))};
 cue=0;preparationDirty=true;editor();
 $('preparation-progress').textContent='Voorbeeld in bewerker. Nog niet opgeslagen; je bestaande voorbereidingen blijven staan.';
};
$('preparation-cue').onchange=()=>{captureCue();cue=Number($('preparation-cue').value);editor();};
$('add-cue').onclick=()=>{captureCue();if(preparation.lines.length>=10)return;preparation.lines.push({arabic:'',dutch:''});cue=preparation.lines.length-1;preparationDirty=true;editor();$('preparation-progress').textContent='Niet-opgeslagen wijzigingen.';};
$('remove-cue').onclick=()=>{captureCue();if(preparation.lines.length===1)return;preparation.lines.splice(cue,1);cue=Math.min(cue,preparation.lines.length-1);preparationDirty=true;editor();$('preparation-progress').textContent='Niet-opgeslagen wijzigingen.';};
for(const id of ['preparation-title','preparation-arabic','preparation-dutch'])$(id).oninput=()=>{preparationDirty=true;$('preparation-progress').textContent='Niet-opgeslagen wijzigingen.';};
async function savePrepared(present=false){
 captureCue();
 if(!preparation.title.trim()||preparation.lines.some(line=>!line.dutch.trim())){$('preparation-progress').textContent='Vul een titel en Nederlands bij elk tekstpaar in. Je invoer blijft staan.';return;}
 const saved={title:preparation.title,lines:preparation.lines.map(line=>({...line}))};
 busy=true;render();const current=epoch;
 try{
  if(lease===null)await claim(current);if(current!==epoch)return;
  await queue;
  const selected=savedPreparations.find(item=>item.id===selectedPreparationId);
  const result=await api('preparation',{preparation:saved,preparationId:selectedPreparationId,
   expectedRevision:selected?.revision||null,create:selectedPreparationId===null});if(current!==epoch)return;
  preparation=result.preparation;savedPreparations=result.preparations;selectedPreparationId=result.selectedId;preparationDirty=false;refreshLibrary();
  $('preparation-progress').textContent='Opgeslagen op deze pc. Geen tekst naar ALHOR of cloud.';
  if(present){await begin('prepared',()=>showCue());}else editor();
 }catch(error){$('preparation-progress').textContent=error.message+' Je invoer blijft staan.';}
 finally{if(current===epoch){busy=false;render();}}
}
$('save-preparation').onclick=()=>savePrepared();$('present-preparation').onclick=()=>savePrepared(true);
$('show-cue').onclick=()=>{captureCue();if(!preparation.lines[cue].dutch.trim()){$('preparation-progress').textContent='Vul Nederlands in voordat je dit toont.';return;}showCue();};
for(const [id,direction] of [['previous-cue',-1],['next-cue',1]])$(id).onclick=()=>{captureCue();cue=Math.max(0,Math.min(preparation.lines.length-1,cue+direction));editor();if(preparation.lines[cue].dutch.trim())showCue();};
$('improve-app').onclick=event=>{
  if(busy||!['demo','prepared'].includes(state.mode)){event.preventDefault();return;}
  const entryContext=state.mode==='prepared'?'prepared':'demo';
  stop('Voorbeelden gepauzeerd voor een verbetering — laatste tekst blijft staan');
  if(lease!==null){
    const session=lease,pausedEpoch=epoch;
    queue=queue.then(async()=>{
      if(epoch!==pausedEpoch||lease!==session)return;
      await api('release',{},session);
      if(epoch===pausedEpoch&&lease===session)lease=null;
    }).catch(()=>{if(epoch===pausedEpoch)lease=null;});
  }
  window.open('http://127.0.0.1:19818/app/operating/from/vrijdagpreek/'+(entryContext==='prepared'?'?context=prepared':''),'_blank','noopener');
};
$('clear').onclick=()=>publish({arabic:'',dutch:''});
$('open-display').onclick=()=>window.open('/display.html','vrijdagpreek-display','popup,width=1280,height=720');
window.addEventListener('pagehide',()=>{stop();if(lease!==null)fetch('/api/release',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','X-App-Token':csrf},body:JSON.stringify({owner,generation:lease})}).catch(()=>{});});
navigator.mediaDevices?.addEventListener('devicechange',()=>{if(!state.active){state.status='Apparaten gewijzigd. Vernieuw de microfoonlijst.';render();}});
try{
  const response=await fetch('/api/bootstrap',{method:'POST',headers:{'X-Local-App':'1'}});if(!response.ok)throw Error();
  const config=await response.json();csrf=config.csrf;configured=config.configured;
  savedPreparations=config.preparations||[];selectedPreparationId=config.selectedId||null;refreshLibrary();
  if(config.preparation?.lines.length){preparation=config.preparation;$('preparation-progress').textContent='Bewaarde voorbereiding geopend. Nog niet aan publiek getoond.';}
  editor();
  $('azure-state').textContent=configured?`Azure ingesteld (${config.region}); nog niet verbonden.`:'Azure niet ingesteld: demo en lokale microfoontest werken wel.';
}catch{state.status='Start via START-WINDOWS.cmd en open http://127.0.0.1:8080. Lokale server niet beschikbaar.';}
// Existing app stream; read one initial snapshot and close it. Never import this into ALHOR.
const entryEpoch=epoch,entrySnapshot=new EventSource('/api/events');
const entryTimeout=setTimeout(()=>entrySnapshot.close(),3000);
entrySnapshot.onmessage=({data})=>{
  entrySnapshot.close();clearTimeout(entryTimeout);
  try{
    const example=pausedExample(JSON.parse(data),DEMO_LINES);
    if(example&&epoch===entryEpoch&&!state.active&&!busy){
      Object.assign(state,example,{mode:'demo',active:false,status:'Voorbeeld hervat · gepauzeerd'});render();
    }
    const snapshot=JSON.parse(data),index=preparation.lines.findIndex(line=>line.dutch===snapshot.dutch&&line.arabic===snapshot.arabic);
    if(snapshot.mode==='prepared'&&!snapshot.active&&index>=0&&epoch===entryEpoch&&!state.active&&!busy){cue=index;Object.assign(state,{...preparation.lines[cue],mode:'prepared',active:false,status:'Voorbereid · gepauzeerd'});editor();}
  }catch{/* Invalid snapshot never changes the operator state. */}
};
entrySnapshot.onerror=()=>{entrySnapshot.close();clearTimeout(entryTimeout);};
render();
