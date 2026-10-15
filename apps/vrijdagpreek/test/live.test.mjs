import {test} from 'node:test';import assert from 'node:assert/strict';
import {LiveSession} from '../live.js';
function setup({capture,token,sdkFailure=false}={}){
 let stopped=0,closed=0,recognizer,deadline,renewal;const events=[];
 const stream={getTracks:()=>[{stop(){stopped++;}}]};
 const sdk={Recognizer:{enableTelemetry(value){assert.equal(value,false);}},
  SpeechTranslationConfig:{fromAuthorizationToken:()=>({addTargetLanguage(value){assert.equal(value,'nl');}})},
  AudioConfig:{fromStreamInput(value){assert.equal(value,stream);if(sdkFailure)throw Error('secret SDK detail');return {close(){},setProperty(){}};}},
  CancellationErrorCode:{AuthenticationFailure:1,TooManyRequests:3,ServiceTimeout:5,Forbidden:8,ServiceUnavailable:9},
  ResultReason:{TranslatedSpeech:1,TranslatingSpeech:2,NoMatch:3},
  TranslationRecognizer:class {constructor(){recognizer=this;}startContinuousRecognitionAsync(ok){ok();}close(){closed++;}}};
 const session=new LiveSession({media:{getUserMedia:capture||async function(options){assert.equal(options.audio.deviceId.exact,'mic');return stream;}},sdk,
  token:token||(async()=>({token:'synthetic-token',region:'northeurope'})),emit:event=>events.push(event),
  timers:{setTimeout(fn){deadline=fn;return 1;},clearTimeout(){deadline=null;},setInterval(fn,ms){assert.equal(ms,480000);renewal=fn;return 2;},clearInterval(){renewal=null;}}});
 return {session,events,stream,get recognizer(){return recognizer;},get stopped(){return stopped;},get closed(){return closed;},get deadline(){return deadline;},get renewal(){return renewal;}};
}
test('a token alone is not connected; sessionStarted and real results drive the status',async()=>{
 const h=setup();await h.session.start('mic','ar-SA');assert.equal(h.events.at(-1).phase,'starting');
 h.recognizer.sessionStarted();assert.equal(h.events.at(-1).phase,'listening');assert.equal(h.deadline,null);
 h.recognizer.recognizing(null,{result:{reason:2,text:'نص',translations:{get:()=> 'Voorlopig'}}});assert.equal(h.events.at(-1).partial,true);
 h.recognizer.recognized(null,{result:{reason:1,text:'نص',translations:{get:()=> 'Definitief'}}});assert.equal(h.events.at(-1).dutch,'Definitief');assert.equal(h.events.at(-1).partial,false);
 const late=h.recognizer.recognized;h.session.stop();const count=h.events.length;
 late(null,{result:{reason:1,text:'laat',translations:{get:()=> 'Laat'}}});assert.equal(h.events.length,count);assert.equal(h.stopped,1);assert.equal(h.closed,1);assert.equal(h.renewal,null);
});
test('Stop during microphone permission disposes late capture without requesting Azure',async()=>{
 let resolve,requested=0;const h=setup({capture:()=>new Promise(r=>resolve=r),token:async()=>{requested++;}});
 const pending=h.session.start('mic','ar-SA');h.session.stop();resolve(h.stream);await pending;assert.equal(requested,0);assert.equal(h.stopped,1);
});
test('token errors retain their safe category and dispose capture',async()=>{
 const h=setup({token:async()=>{throw Object.assign(Error('secret upstream response'),{code:'AZURE_AUTH_FAILED'});}});
 await h.session.start('mic','ar-SA');assert.equal(h.events.at(-1).errorCode,'AZURE_AUTH_FAILED');assert.equal(h.stopped,1);assert.doesNotMatch(JSON.stringify(h.events),/secret|upstream/);
});
test('SDK errors remain visible and safe, distinct from authentication errors',async()=>{
 const h=setup({sdkFailure:true});await h.session.start('mic','ar-SA');assert.equal(h.events.at(-1).errorCode,'SDK_FAILED');assert.equal(h.stopped,1);assert.doesNotMatch(JSON.stringify(h.events),/secret/);
});
test('connection timeout and provider cancellation stop capture without automatic retries',async()=>{
 const h=setup();await h.session.start('mic','ar-SA');h.deadline();assert.equal(h.events.at(-1).errorCode,'AZURE_TIMEOUT');assert.equal(h.stopped,1);
 const h2=setup();await h2.session.start('mic','ar-SA');h2.recognizer.canceled(null,{errorCode:3,errorDetails:'not exposed'});assert.equal(h2.events.at(-1).errorCode,'AZURE_QUOTA');assert.equal(h2.closed,1);assert.doesNotMatch(JSON.stringify(h2.events),/not exposed/);
});
test('token renewal failure stops the existing session and never starts new capture',async()=>{
 let calls=0;const h=setup({token:async()=>{if(calls++)throw Object.assign(Error(),{code:'AZURE_AUTH_FAILED'});return {token:'fake',region:'northeurope'};}});
 await h.session.start('mic','ar-SA');await h.renewal();assert.equal(h.events.at(-1).errorCode,'AZURE_AUTH_FAILED');assert.equal(h.stopped,1);assert.equal(calls,2);
});
test('a queued renewal callback from before Stop never requests another token',async()=>{
 let calls=0;const h=setup({token:async()=>{calls++;return {token:'fake',region:'northeurope'};}});
 await h.session.start('mic','ar-SA');const oldRenewal=h.renewal;h.session.stop();await oldRenewal();assert.equal(calls,1);
});
