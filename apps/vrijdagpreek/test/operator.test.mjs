import {test} from 'node:test';import assert from 'node:assert/strict';
import {OperatorSession} from '../operator.js';
const settle=async op=>{for(let i=0;i<30;i++)await Promise.resolve();await op.serial;for(let i=0;i<30;i++)await Promise.resolve();};
function setup({deferClaim=false,failState=false}={}){
 let generation=0,owner=null,nextOwner=0,started=0,stopped=0,resolveClaim;
 const calls=[],intervals=new Map();let timer=0;
 const respond=(status,body)=>({ok:status<400,status,json:async()=>body});
 const fetcher=async(url,options={})=>{
  const data=JSON.parse(options.body||'{}');calls.push({url,data});
  if(url==='/api/bootstrap')return respond(200,{csrf:'fake',configured:true,region:'northeurope'});
  if(url==='/api/claim'){
   if(owner&&owner!==data.owner)return respond(409,{errorCode:'OPERATOR_BUSY'});
   owner=data.owner;generation++;const response=respond(200,{generation});
   if(deferClaim)return new Promise(resolve=>resolveClaim=()=>resolve(response));return response;
  }
  if(data.owner!==owner||data.generation!==generation)return respond(409,{errorCode:'SESSION_EXPIRED'});
  if(url==='/api/release'){owner=null;generation++;return respond(200,{ok:true});}
  if(url==='/api/state'&&failState)return respond(500,{errorCode:'LOCAL_CONNECTION'});
  if(url==='/api/token')return respond(200,{token:'fake',region:'northeurope'});
  return respond(200,{ok:true});
 };
 const live={stop(){stopped++;},async start(){started++;}};
 const op=new OperatorSession({fetcher,live,ownerId:()=> 'operator-'+(++nextOwner),timers:{setInterval(fn){intervals.set(++timer,fn);return timer;},clearInterval(id){intervals.delete(id);}}});
 return {op,calls,intervals,get started(){return started;},get stopped(){return stopped;},expire(){owner=null;generation++;},otherOperator(){owner='another-person';generation++;},resolveClaim(){resolveClaim();}};
}
test('Start, Stop, idle expiry and one explicit restart acquire a fresh session',async()=>{
 const h=setup();await h.op.initialize();await h.op.start('mic','ar-SA');assert.equal(h.started,1);
 h.op.onLiveEvent({phase:'translating',status:'Ontvangen',active:true,dutch:'Bewaar deze tekst',arabic:'نص',partial:false});
 await h.op.stop();assert.equal(h.op.state.dutch,'Bewaar deze tekst');assert.equal(h.intervals.size,0);assert.equal(h.op.session,null);
 h.expire();const offset=h.calls.length;await h.op.start('mic','ar-SA');assert.equal(h.started,2);assert.equal(h.calls[offset].url,'/api/claim');
 assert.equal(h.calls.filter(call=>call.url==='/api/claim').length,2);assert.equal(h.op.state.phase,'starting');
});
test('expired active lease cannot poison Stop or the next explicit start',async()=>{
 const h=setup();await h.op.initialize();await h.op.start('mic','ar-SA');h.expire();await h.op.stop();await h.op.start('mic','ar-SA');assert.equal(h.started,2);assert.ok(h.op.session);
});
test('a rejected claim leaves a persistent useful error and does not start audio',async()=>{
 const h=setup();await h.op.initialize();h.otherOperator();await h.op.start('mic','ar-SA');await settle(h.op);
 assert.equal(h.op.state.phase,'error');assert.equal(h.op.state.errorCode,'OPERATOR_BUSY');assert.equal(h.started,0);assert.equal(h.intervals.size,0);assert.equal(h.calls.filter(call=>call.url==='/api/state').length,0);
});
test('Stop during a pending claim releases the late lease and installs no heartbeat or audio',async()=>{
 const h=setup({deferClaim:true});await h.op.initialize();const starting=h.op.start('mic','ar-SA');for(let i=0;i<12;i++)await Promise.resolve();
 const stopping=h.op.stop();h.resolveClaim();await starting;await stopping;
 assert.equal(h.started,0);assert.equal(h.intervals.size,0);assert.equal(h.op.session,null);assert.ok(h.calls.some(call=>call.url==='/api/release'));
});
test('publication failure stops once, releases ownership and does not become a retry loop',async()=>{
 const h=setup({failState:true});await h.op.initialize();await h.op.start('mic','ar-SA');await settle(h.op);
 assert.equal(h.op.state.phase,'error');assert.equal(h.started,0);assert.equal(h.intervals.size,0);assert.equal(h.op.session,null);
 assert.ok(h.calls.filter(call=>call.url==='/api/state').length<=2);assert.equal(h.calls.filter(call=>call.url==='/api/claim').length,1);
});
test('an SDK failure is published before release, remains visible and permits a manual retry',async()=>{
 const h=setup();await h.op.initialize();await h.op.start('mic','ar-SA');h.op.onLiveEvent({errorCode:'SDK_FAILED'});await settle(h.op);
 const failureIndex=h.calls.findIndex(call=>call.url==='/api/state'&&call.data.phase==='error');
 const releaseIndex=h.calls.findIndex(call=>call.url==='/api/release');assert.ok(failureIndex>=0&&releaseIndex>failureIndex);
 assert.equal(h.op.state.errorCode,'SDK_FAILED');h.expire();await h.op.start('mic','ar-SA');assert.equal(h.started,2);assert.equal(h.op.state.errorCode,null);
});
test('Stop then Clear also clears the audience through a short exclusive session',async()=>{
 const h=setup();await h.op.initialize();await h.op.start('mic','ar-SA');
 h.op.onLiveEvent({phase:'translating',active:true,status:'Ontvangen',dutch:'Oude ondertitel',arabic:'نص'});await h.op.stop();
 await h.op.clear();const lastState=h.calls.filter(call=>call.url==='/api/state').at(-1);
 assert.equal(lastState.data.dutch,'');assert.equal(lastState.data.active,false);assert.equal(h.op.session,null);
 assert.equal(h.calls.at(-1).url,'/api/release');assert.equal(h.started,1);
});

test('Clear during a pending start leaves that start running and acquires no second lease',async()=>{
 const h=setup({deferClaim:true});await h.op.initialize();
 const starting=h.op.start('mic','ar-SA');for(let i=0;i<12;i++)await Promise.resolve();
 assert.ok(h.calls.some(call=>call.url==='/api/claim'));assert.equal(h.op.session,null);
 h.op.clear();h.resolveClaim();await starting;
 assert.equal(h.started,1);assert.ok(h.op.session);assert.equal(h.intervals.size,1);
 assert.equal(h.calls.filter(call=>call.url==='/api/claim').length,1);
 assert.equal(h.calls.filter(call=>call.url==='/api/release').length,0);
 h.op.onLiveEvent({phase:'translating',active:true,status:'Ontvangen',dutch:'Nieuwe vertaling',arabic:'نص'});
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.equal(h.op.state.dutch,'Nieuwe vertaling');assert.equal(h.op.state.phase,'translating');
});
