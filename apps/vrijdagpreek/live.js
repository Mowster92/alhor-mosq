const messages={
  MIC_NOT_SELECTED:'Kies eerst een microfoon.',
  MIC_PERMISSION:'Microfoontoegang is geweigerd. Sta toegang toe in je browser.',
  MIC_MISSING:'Deze microfoon is niet meer beschikbaar. Vernieuw de lijst.',
  MIC_BUSY:'De microfoon kan niet worden geopend. Controleer of een andere app hem gebruikt.',
  MIC_DISCONNECTED:'De microfoon is losgekoppeld. Kies een ingang en start opnieuw.',
  MIC_FAILED:'De microfoon kon niet worden gestart.',
  SDK_UNAVAILABLE:'De spraakmodule is niet geladen. Vernieuw deze pagina.',
  SDK_FAILED:'De spraakmodule kon de audiostream niet starten.',
  AZURE_NOT_CONFIGURED:'Azure is niet ingesteld. Gebruik voor live spraak START-VRIJDAGPREEK.cmd in de repository-root.',
  CONSENT_REQUIRED:'Geef eerst toestemming om de audio naar Azure te sturen.',
  AZURE_AUTH_FAILED:'Azure weigert de aanmelding. Controleer de sleutel en de bijbehorende regio.',
  AZURE_QUOTA:'Azure weigert nieuwe audio wegens het gebruikslimiet. Controleer het F0-tegoed.',
  AZURE_TIMEOUT:'Azure antwoordt niet op tijd. Controleer je verbinding en probeer opnieuw.',
  AZURE_UNAVAILABLE:'Azure is niet bereikbaar. Controleer je internetverbinding.',
  AZURE_CONNECTION:'De verbinding met Azure is verbroken. De microfoon is gestopt.',
  OPERATOR_BUSY:'Er is al een andere bediening actief. Stop die sessie eerst.',
  SESSION_EXPIRED:'De lokale sessie is verlopen. Klik op Start vertaling voor een nieuwe sessie.',
  LOCAL_CONNECTION:'De verbinding met de lokale app is weggevallen. De microfoon is gestopt.',
  LIVE_START_FAILED:'De vertaling kon niet starten. Bekijk de foutcode en probeer opnieuw.'
};
export function messageForCode(code){return messages[code]||messages.LIVE_START_FAILED;}
export function microphoneCode(error){
  return ({NotAllowedError:'MIC_PERMISSION',NotFoundError:'MIC_MISSING',OverconstrainedError:'MIC_MISSING',NotReadableError:'MIC_BUSY'})[error?.name]||'MIC_FAILED';
}
export function micError(error){return messageForCode(microphoneCode(error));}

// Capture belongs here. Stop invalidates callbacks before disposing the resources.
export class LiveSession {
  constructor({media,sdk,token,emit,timers=globalThis}){Object.assign(this,{media,sdk,token,emit,timers});this.run=0;}
  stop(){
    this.run++;
    this.timers.clearTimeout(this.deadline);this.timers.clearInterval(this.renewal);
    this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;
    const recognizer=this.recognizer;this.recognizer=null;
    try{recognizer?.close();}catch{}
    try{this.audio?.close();}catch{}this.audio=null;
  }
  fail(code){this.stop();this.emit({phase:'error',errorCode:code,status:messageForCode(code),active:false});}
  async start(deviceId,language){
    this.stop();const run=this.run;let stage='microphone';
    if(!deviceId){this.fail('MIC_NOT_SELECTED');return;}
    try{
      this.emit({phase:'starting',status:'Microfoon openen…'});
      const stream=await this.media.getUserMedia({audio:{deviceId:{exact:deviceId}},video:false});
      if(run!==this.run){stream.getTracks().forEach(track=>track.stop());return;}
      this.stream=stream;
      for(const track of stream.getTracks())track.onended=()=>{if(run===this.run)this.fail('MIC_DISCONNECTED');};
      stage='authorization';this.emit({phase:'starting',status:'Aanmelden bij Azure…'});
      const auth=await this.token();if(run!==this.run)return;
      stage='sdk';const SDK=this.sdk;
      if(!SDK?.TranslationRecognizer){this.fail('SDK_UNAVAILABLE');return;}
      SDK.Recognizer.enableTelemetry(false);
      const config=SDK.SpeechTranslationConfig.fromAuthorizationToken(auth.token,auth.region);
      config.speechRecognitionLanguage=language;config.addTargetLanguage('nl');
      this.audio=SDK.AudioConfig.fromStreamInput(stream);
      this.audio.setProperty('MICROPHONE-WorkletSourceUrl','/speech-processor.js');
      const recognizer=new SDK.TranslationRecognizer(config,this.audio);this.recognizer=recognizer;
      this.emit({phase:'starting',status:'Verbinding maken…'});
      this.deadline=this.timers.setTimeout(()=>{if(run===this.run)this.fail('AZURE_TIMEOUT');},20000);
      recognizer.sessionStarted=()=>{
        if(run!==this.run)return;this.timers.clearTimeout(this.deadline);
        this.emit({phase:'listening',status:'Luistert naar Arabische spraak',active:true});
      };
      const result=(_,event)=>{
        if(run!==this.run)return;
        if([SDK.ResultReason.TranslatedSpeech,SDK.ResultReason.TranslatingSpeech].includes(event.result.reason)){
          const dutch=event.result.translations.get('nl');
          if(dutch){this.timers.clearTimeout(this.deadline);const partial=event.result.reason===SDK.ResultReason.TranslatingSpeech;
            this.emit({phase:'translating',arabic:event.result.text,dutch,partial,status:partial?'Vertaling wordt aangevuld':'Ondertiteling ontvangen',active:true});}
        }else if(event.result.reason===SDK.ResultReason.NoMatch)this.emit({phase:'listening',status:'Geen spraak herkend. Controleer de microfoon en spreektaal.'});
      };
      recognizer.recognizing=result;recognizer.recognized=result;
      recognizer.canceled=(_,event={})=>{
        if(run!==this.run)return;
        const codes=SDK.CancellationErrorCode||{};let code='AZURE_CONNECTION';
        if(event.errorCode!==undefined){
          if([codes.AuthenticationFailure,codes.Forbidden].includes(event.errorCode))code='AZURE_AUTH_FAILED';
          else if(event.errorCode===codes.TooManyRequests)code='AZURE_QUOTA';
          else if(event.errorCode===codes.ServiceTimeout)code='AZURE_TIMEOUT';
          else if(event.errorCode===codes.ServiceUnavailable)code='AZURE_UNAVAILABLE';
        }
        this.fail(code);
      };
      recognizer.sessionStopped=()=>{if(run===this.run)this.fail('AZURE_CONNECTION');};
      await new Promise((resolve,reject)=>recognizer.startContinuousRecognitionAsync(resolve,reject));
      if(run!==this.run)return;
      this.renewal=this.timers.setInterval(async()=>{
        if(run!==this.run)return;
        try{const next=await this.token();if(run===this.run)recognizer.authorizationToken=next.token;}
        catch(error){if(run===this.run)this.fail(error.code||'AZURE_AUTH_FAILED');}
      },8*60*1000);
    }catch(error){
      if(run!==this.run)return;
      const code=stage==='microphone'?microphoneCode(error):stage==='authorization'?(error.code||'AZURE_AUTH_FAILED'):'SDK_FAILED';
      this.fail(code);
    }
  }
}
