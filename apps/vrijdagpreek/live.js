// Capture ownership stays here so every stop/error/late callback has one cleanup path.
export class LiveSession {
  constructor({media, sdk, token, emit, timers=globalThis}) {
    Object.assign(this,{media,sdk,token,emit,timers}); this.generation=0;
  }
  stop() {
    this.generation++;
    this.timers.clearInterval(this.refresh);
    this.stream?.getTracks().forEach(t=>t.stop()); this.stream=null;
    const recognizer=this.recognizer; this.recognizer=null;
    if (recognizer) { try { recognizer.close(); } catch {} }
    try { this.audio?.close(); } catch {} this.audio=null;
  }
  async capture(deviceId) {
    if (!deviceId) throw new Error('Kies eerst een zichtbare microfoon.');
    const epoch=this.generation;
    const stream=await this.media.getUserMedia({audio:{deviceId:{exact:deviceId},echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    if (epoch !== this.generation) { stream.getTracks().forEach(t=>t.stop()); return null; }
    this.stream=stream;
    for (const track of stream.getTracks()) track.onended=()=>{ if(epoch===this.generation) this.fail('Microfoon losgekoppeld of toestemming ingetrokken.'); };
    return stream;
  }
  fail(message) { this.stop(); this.emit({error:message}); }
  async start(deviceId,language) {
    this.stop(); const epoch=this.generation;
    try {
      const stream=await this.capture(deviceId); if (!stream) return;
      const auth=await this.token(); if(epoch!==this.generation)return;
      const SDK=this.sdk;
      SDK.Recognizer.enableTelemetry(false);
      const config=SDK.SpeechTranslationConfig.fromAuthorizationToken(auth.token,auth.region);
      config.speechRecognitionLanguage=language; config.addTargetLanguage('nl');
      this.audio=SDK.AudioConfig.fromStreamInput(stream);
      this.audio.setProperty('MICROPHONE-WorkletSourceUrl', '/speech-processor.js');
      const recognizer=new SDK.TranslationRecognizer(config,this.audio); this.recognizer=recognizer;
      const result=(_,event)=>{
        if(epoch!==this.generation)return;
        if(event.result.reason===SDK.ResultReason.TranslatedSpeech || event.result.reason===SDK.ResultReason.TranslatingSpeech) {
          const dutch=event.result.translations.get('nl');
          if(dutch)this.emit({arabic:event.result.text,dutch,partial:event.result.reason===SDK.ResultReason.TranslatingSpeech});
        } else if(event.result.reason===SDK.ResultReason.NoMatch) this.emit({notice:'Geen spraak herkend. Controleer niveau/taal.'});
      };
      recognizer.recognizing=result; recognizer.recognized=result;
      recognizer.canceled=()=>{ if(epoch===this.generation)this.fail('Azure onderbroken: controleer netwerk, regio, sleutel of quota. Start handmatig opnieuw.'); };
      recognizer.sessionStopped=()=>{ if(epoch===this.generation)this.fail('Azure-sessie beëindigd. Start handmatig opnieuw.'); };
      await new Promise((resolve,reject)=>recognizer.startContinuousRecognitionAsync(resolve,reject));
      if(epoch!==this.generation)return;
      this.emit({notice:'Live · audio gaat naar Azure'});
      this.refresh=this.timers.setInterval(async()=>{
        try { const next=await this.token(); if(epoch===this.generation)recognizer.authorizationToken=next.token; }
        catch { if(epoch===this.generation)this.fail('Tokenvernieuwing mislukt — audio gestopt.'); }
      }, 8*60*1000);
    } catch(error) {
      if(epoch===this.generation)this.fail(micError(error));
    }
  }
}
export function micError(error) {
  return ({NotAllowedError:'Microfoontoestemming geweigerd. Controleer Windows en browser.',NotFoundError:'Geen microfoon beschikbaar.',OverconstrainedError:'Gekozen microfoon niet beschikbaar. Vernieuw de apparatenlijst.',NotReadableError:'Microfoon bezet of driver niet beschikbaar.'})[error?.name] || 'Start mislukt. Controleer microfoon, SDK-installatie, Azure en netwerk.';
}
