import {test} from 'node:test';import assert from 'node:assert/strict';import {LiveSession,micError} from '../live.js';
function harness({capture,token}={}){
 let stopped=0,closed=0,recognizer,refresh;
 const events=[];const stream={getTracks:()=>[{stop:()=>stopped++}]};
 const sdk={Recognizer:{enableTelemetry(value){assert.equal(value,false);}},SpeechTranslationConfig:{fromAuthorizationToken:()=>({addTargetLanguage(l){assert.equal(l,'nl');}})},AudioConfig:{fromStreamInput:s=>{assert.equal(s,stream);return {close(){},setProperty(){}};}},ResultReason:{TranslatedSpeech:1,TranslatingSpeech:2,NoMatch:3},TranslationRecognizer:class{constructor(){recognizer=this;}startContinuousRecognitionAsync(ok){ok();}close(){closed++;}}};
 const session=new LiveSession({media:{getUserMedia:capture||async function(c){assert.deepEqual(c.audio.deviceId,{exact:'mic'});return stream;}},sdk,token:token||async function(){return {token:'short',region:'westeurope'};},emit:e=>events.push(e),timers:{setInterval(fn,ms){assert.equal(ms,480000);refresh=fn;return 1;},clearInterval(){refresh=null;}}});
 return {session,events,stream,get recognizer(){return recognizer;},get stopped(){return stopped;},get closed(){return closed;},get refresh(){return refresh;}};
}
test('start streams selected mic; final/partial results; stop closes capture and ignores late callbacks',async()=>{
 const h=harness();await h.session.start('mic','ar-SA');
 const late=h.recognizer.recognized;late(null,{result:{reason:1,text:'ar',translations:{get:()=> 'nl'}}});assert.equal(h.events.at(-1).dutch,'nl');
 h.session.stop();assert.equal(h.stopped,1);assert.equal(h.closed,1);assert.equal(h.refresh,null);
 const count=h.events.length;late(null,{result:{reason:1,text:'late',translations:{get:()=> 'late'}}});assert.equal(h.events.length,count);
});
test('stop during permission prompt disposes late stream and never requests token',async()=>{
 let resolve,calls=0,stopped=0;const h=harness({capture:()=>new Promise(r=>resolve=r),token:async()=>{calls++;}});
 const work=h.session.start('mic','ar-SA');h.session.stop();resolve({getTracks:()=>[{stop:()=>stopped++}]});await work;assert.equal(stopped,1);assert.equal(calls,0);
});
test('token failure stops mic and emits safe error without upstream secret',async()=>{
 const h=harness({token:async()=>{throw Error('secret');}});await h.session.start('mic','ar-SA');assert.equal(h.stopped,1);assert.ok(h.events.at(-1).error);assert.doesNotMatch(JSON.stringify(h.events),/secret/);
});
test('cancellation and refresh failures terminate resources',async()=>{
 let n=0;const h=harness({token:async()=>{if(n++)throw Error();return {token:'short',region:'westeurope'};}});await h.session.start('mic','ar-SA');await h.refresh();assert.equal(h.stopped,1);assert.equal(h.closed,1);
 const h2=harness();await h2.session.start('mic','ar-MA');h2.recognizer.canceled();assert.equal(h2.stopped,1);
});
test('permission/device errors are readable',()=>{assert.match(micError({name:'NotAllowedError'}),/toestemming/);assert.match(micError({name:'OverconstrainedError'}),/niet beschikbaar/);});
