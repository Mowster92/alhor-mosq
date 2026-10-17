import {LiveSession,micError,messageForCode} from './live.js';
import {OperatorSession} from './operator.js';
const $=id=>document.getElementById(id);
let operator,config=null,meterStream=null,meterContext=null,meterFrame=null,meterRun=0,meterActive=false,choosing=false;
const live=new LiveSession({media:navigator.mediaDevices,sdk:window.SpeechSDK,token:()=>operator.token(),emit:event=>operator.onLiveEvent(event)});
operator=new OperatorSession({live,onChange:render});

function render(state=operator.state){
  const active=state.active;
  $('connection').dataset.phase=state.phase;$('status').textContent=state.status;
  $('error-panel').hidden=state.phase!=='error';
  $('error-message').textContent=state.phase==='error'?state.status:'';
  $('error-code').textContent=state.errorCode||'';
  $('dutch').textContent=state.dutch||'Hier verschijnt de vertaling zodra je spreekt.';
  $('dutch').classList.toggle('placeholder',!state.dutch);
  $('arabic').textContent=state.arabic||'—';
  $('caption-kind').textContent=state.dutch?(state.partial?'Wordt aangevuld':'Ontvangen'):'';
  for(const id of ['device','language','list-mics','test-mic'])$(id).disabled=active||choosing;
  $('live-start').disabled=active||choosing||!config?.configured;
  $('live-start').textContent=state.phase==='error'?'Opnieuw starten':'Start vertaling';
  $('stop').disabled=!active&&!meterActive&&!choosing;
  $('test-mic').textContent=meterActive?'Stop microfoontest':'Test microfoon';
  $('azure-state').textContent=config?.configured?`Azure ingesteld (${config.region})`:config?'Azure niet ingesteld. Voor live spraak: open START-VRIJDAGPREEK.cmd in de repository-root. De Docker-proef configureert geen Azure.':'Lokale app controleren…';
}
function stopMeter(){
  meterRun++;meterActive=false;cancelAnimationFrame(meterFrame);
  meterStream?.getTracks().forEach(track=>track.stop());meterStream=null;
  meterContext?.close().catch(()=>{});meterContext=null;
  $('level').value=0;$('meter-panel').hidden=true;
}
async function chooseMicrophone(){
  if(choosing||operator.state.active)return;
  stopMeter();choosing=true;render();const run=meterRun;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});stream.getTracks().forEach(track=>track.stop());
    if(run!==meterRun)return;
    const previous=$('device').value;
    const devices=(await navigator.mediaDevices.enumerateDevices()).filter(device=>device.kind==='audioinput');
    $('device').replaceChildren(...devices.map((device,index)=>new Option(device.label||`Microfoon ${index+1}`,device.deviceId)));
    if(devices.some(device=>device.deviceId===previous))$('device').value=previous;
    $('list-mics').textContent='Lijst vernieuwen';
    if(!devices.length)operator.fail('MIC_MISSING');
  }catch(error){operator.fail(({NotAllowedError:'MIC_PERMISSION',NotFoundError:'MIC_MISSING'})[error.name]||'MIC_FAILED');}
  finally{choosing=false;render();}
}
async function testMicrophone(){
  if(meterActive){stopMeter();render();return;}
  if(!$('device').value){operator.fail('MIC_NOT_SELECTED');return;}
  const run=++meterRun;choosing=true;render();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:$('device').value}},video:false});
    if(run!==meterRun){stream.getTracks().forEach(track=>track.stop());return;}
    meterStream=stream;meterContext=new AudioContext();await meterContext.resume();
    if(run!==meterRun)return;
    const source=meterContext.createMediaStreamSource(stream),analyser=meterContext.createAnalyser();
    analyser.fftSize=1024;source.connect(analyser);const samples=new Float32Array(analyser.fftSize);
    meterActive=true;$('meter-panel').hidden=false;
    const draw=()=>{if(run!==meterRun)return;analyser.getFloatTimeDomainData(samples);$('level').value=Math.min(100,Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length)*350);meterFrame=requestAnimationFrame(draw);};draw();
  }catch(error){stopMeter();$('mic-status').textContent=micError(error);operator.fail(({NotAllowedError:'MIC_PERMISSION',NotFoundError:'MIC_MISSING'})[error.name]||'MIC_FAILED');}
  finally{choosing=false;render();}
}
$('list-mics').onclick=chooseMicrophone;$('test-mic').onclick=testMicrophone;
$('live-start').onclick=()=>{
  if(!$('consent').checked){operator.fail('CONSENT_REQUIRED');return;}
  stopMeter();void operator.start($('device').value,$('language').value);
};
$('stop').onclick=()=>{stopMeter();void operator.stop();};
$('clear').onclick=()=>operator.clear();
$('open-display').onclick=()=>{
  const audience=window.open('/display.html','vrijdagpreek-display','popup,width=1280,height=720');
  if(!audience)$('open-display').textContent='Sta pop-ups toe om het publiekscherm te openen';
};
navigator.mediaDevices?.addEventListener('devicechange',()=>{if(!operator.state.active)$('list-mics').textContent='Microfoons gewijzigd · vernieuw lijst';});
window.addEventListener('pagehide',()=>{stopMeter();void operator.stop();});
fetch('/api/identity').then(response=>response.json()).then(identity=>{
  $('candidate-status').textContent=identity.state==='identified'?`Versie: ${identity.version}`:'Lokale ontwikkelversie';
}).catch(()=>{$('candidate-status').textContent='Versie niet bereikbaar';});
config=await operator.initialize();render();
