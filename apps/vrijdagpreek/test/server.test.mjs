import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createApp} from '../server.mjs';

const response=(status=200,body='short-lived-test-token')=>new Response(body,{status});
async function setup(t,{env={AZURE_SPEECH_REGION:'northeurope',AZURE_SPEECH_KEY:'synthetic-secret'},fetcher=async()=>response()}={}){
  let clock=0,watchdog;const calls=[];
  const server=createApp({env,now:()=>clock,timers:{setInterval(fn){watchdog=fn;return {unref(){}};},clearInterval(){}},
    fetcher:async(...args)=>{calls.push(args);return fetcher(...args);}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const boot=await fetch(base+'/api/bootstrap',{method:'POST',headers:{Origin:base,'X-Local-App':'1'}}).then(r=>r.json());
  const post=(path,data={},headers={})=>fetch(base+'/api/'+path,{method:'POST',headers:{Origin:base,'X-App-Token':boot.csrf,'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
  const claim=async(owner='operator')=>({owner,...await post('claim',{owner}).then(r=>r.json())});
  const snapshot=async()=>{
    const controller=new AbortController();const result=await fetch(base+'/api/events',{signal:controller.signal});
    const value=await result.body.getReader().read();controller.abort();return JSON.parse(new TextDecoder().decode(value.value).split('data: ')[1].trim());
  };
  return {base,boot,post,claim,snapshot,calls,advance(ms){clock+=ms;watchdog();}};
}
const caption=(session,changes={})=>({...session,arabic:'كلمات اختبار',dutch:'Nederlandse proeftekst',mode:'live',phase:'translating',active:true,partial:false,status:'Live — vertaling',...changes});

test('bootstrap exposes only nonsecret configuration and makes no provider request',async t=>{
  const h=await setup(t);assert.deepEqual(Object.keys(h.boot).sort(),['configured','csrf','region']);
  assert.equal(h.boot.configured,true);assert.equal(h.boot.region,'northeurope');assert.equal(h.calls.length,0);
  assert.doesNotMatch(JSON.stringify(h.boot),/synthetic-secret|preparation/);
  assert.deepEqual(await h.snapshot(),{dutch:'',arabic:'',mode:'live',phase:'idle',status:'Gereed voor een live proef.',active:false,partial:false,errorCode:null});
});
test('exclusive owners, generation rotation, release and expiry cannot accept stale writes',async t=>{
  const h=await setup(t),first=await h.claim('a');
  const busy=await h.post('claim',{owner:'b'});assert.equal(busy.status,409);assert.equal((await busy.json()).errorCode,'OPERATOR_BUSY');
  assert.equal((await h.post('state',caption(first,{partial:true}))).status,200);assert.equal((await h.snapshot()).partial,true);
  const next=await h.claim('a');assert.notEqual(next.generation,first.generation);
  assert.equal((await h.post('state',caption(first))).status,409);
  assert.equal((await h.post('release',first)).status,409);
  assert.equal((await h.post('heartbeat',next)).status,200);
  assert.equal((await h.post('release',next)).status,200);
  let stopped=await h.snapshot();assert.equal(stopped.active,false);assert.equal(stopped.phase,'stopped');assert.equal(stopped.dutch,'Nederlandse proeftekst');
  const third=await h.claim('b');h.advance(15001);
  const expired=await h.post('state',caption(third));assert.equal(expired.status,409);assert.equal((await expired.json()).errorCode,'SESSION_EXPIRED');
  stopped=await h.snapshot();assert.equal(stopped.phase,'error');assert.equal(stopped.errorCode,'SESSION_EXPIRED');assert.equal(stopped.active,false);
  const fourth=await h.claim('c');assert.equal((await h.post('state',caption(fourth))).status,200);
});
test('heartbeat keeps only its current lease alive, and malformed state is rejected',async t=>{
  const h=await setup(t),session=await h.claim();h.advance(10000);assert.equal((await h.post('heartbeat',session)).status,200);h.advance(10000);
  assert.equal((await h.post('state',caption(session))).status,200);
  for(const changes of [{phase:'demo'},{mode:'demo'},{phase:'stopped',active:true},{active:false},{partial:'yes'},{errorCode:'arbitrary secret text'}])
    assert.equal((await h.post('state',caption(session,changes))).status,400);
  assert.equal((await h.post('state',caption(session,{phase:'error',active:false,errorCode:'MIC_PERMISSION_DENIED'}))).status,200);
  assert.equal((await h.post('release',session)).status,200);
  assert.equal((await h.snapshot()).errorCode,'MIC_PERMISSION_DENIED','Releasing a failed session must leave the failure visible to the audience');
});
test('Origin, CSRF, content type, local Host and private-file boundaries stay guarded',async t=>{
  const h=await setup(t),session=await h.claim();
  for(const headers of [{Origin:'https://evil.example'},{'X-App-Token':'wrong'},{'Content-Type':'text/plain'}])
    assert.equal((await h.post('state',caption(session),headers)).status,403,JSON.stringify(headers));
  const wrongHost=await new Promise((resolve,reject)=>{const req=request(h.base+'/',{headers:{Host:'localhost'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
  assert.equal(wrongHost,403);
  for(const path of ['/.env','/server.mjs','/data/preparations.json','/preparation.mjs','/example-context.js'])assert.equal((await fetch(h.base+path)).status,404);
  assert.equal((await fetch(h.base+'/api/bootstrap')).status,404);
  const operator=await fetch(h.base+'/operator.js');assert.equal(operator.status,200);assert.match(operator.headers.get('Content-Type'),/javascript/);
  const bad=await fetch(h.base+'/api/state',{method:'POST',headers:{Origin:h.base,'X-App-Token':h.boot.csrf,'Content-Type':'application/json'},body:'{'});
  assert.equal(bad.status,400);assert.equal((await bad.json()).errorCode,'INVALID_REQUEST');
});
test('provider token requires configuration, consent and an exclusive live lease',async t=>{
  const h=await setup(t),session=await h.claim();
  assert.equal((await h.post('token',session)).status,400);assert.equal(h.calls.length,0);
  const auth=await h.post('token',{...session,consent:true}).then(r=>r.json());assert.equal(auth.token,'short-lived-test-token');assert.equal(auth.region,'northeurope');
  assert.equal(h.calls[0][0],'https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issueToken');
  assert.equal(h.calls[0][1].redirect,'error');assert.equal(h.calls[0][1].headers['Ocp-Apim-Subscription-Key'],'synthetic-secret');
  assert.doesNotMatch(JSON.stringify(await h.snapshot()),/token|synthetic-secret/);
  const invalid=await setup(t,{env:{AZURE_SPEECH_REGION:'evil.example/path',AZURE_SPEECH_KEY:'synthetic-secret'}}),other=await invalid.claim();
  assert.equal(invalid.boot.configured,false);const refusal=await invalid.post('token',{...other,consent:true});
  assert.equal((await refusal.json()).errorCode,'AZURE_NOT_CONFIGURED');assert.equal(invalid.calls.length,0);
});
test('provider errors use fixed categories without propagating response bodies or secret exceptions',async t=>{
  for(const [status,code] of [[401,'AZURE_AUTH_FAILED'],[403,'AZURE_AUTH_FAILED'],[429,'AZURE_QUOTA'],[500,'AZURE_UNAVAILABLE']]){
    const h=await setup(t,{fetcher:async()=>response(status,'private upstream details')}),session=await h.claim();
    const result=await h.post('token',{...session,consent:true}).then(r=>r.json());assert.equal(result.errorCode,code);assert.doesNotMatch(JSON.stringify(result),/private|synthetic-secret/);
  }
  for(const [name,code] of [['TimeoutError','AZURE_TIMEOUT'],['AbortError','AZURE_TIMEOUT'],['Error','AZURE_UNAVAILABLE']]){
    const h=await setup(t,{fetcher:async()=>{const e=Error('private network secret');e.name=name;throw e;}}),session=await h.claim();
    const result=await h.post('token',{...session,consent:true}).then(r=>r.json());assert.equal(result.errorCode,code);assert.doesNotMatch(JSON.stringify(result),/private|secret/);
  }
});
test('a token completing after stop is discarded and cannot revive the session',async t=>{
  let finish;const h=await setup(t,{fetcher:()=>new Promise(resolve=>finish=resolve)}),session=await h.claim();
  const pending=h.post('token',{...session,consent:true});while(!finish)await new Promise(resolve=>setImmediate(resolve));
  await h.post('release',session);finish(response());const result=await pending;assert.equal(result.status,409);assert.equal((await result.json()).errorCode,'SESSION_EXPIRED');
  assert.equal((await h.snapshot()).active,false);
});
test('clicked Portal entry works for Firefox/Chromium without permitting cross-site API access',async t=>{
  const h=await setup(t);
  const navigate=(path,headers,method='GET')=>new Promise((resolve,reject)=>{const req=request(h.base+path,{method,headers},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
  for(const referer of ['http://127.0.0.1:19818/','http://127.0.0.1:18080/'])for(const site of ['same-site','cross-site']){
    const headers={'Sec-Fetch-Site':site,'Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document','Sec-Fetch-User':'?1',Referer:referer};
    for(const path of ['/','/display.html'])assert.equal(await navigate(path,headers),200);
    for(const path of ['/api/events','/sdk.js'])assert.equal(await navigate(path,headers),403);
    for(const changes of [{'Sec-Fetch-User':''},{'Sec-Fetch-Mode':'cors'},{'Sec-Fetch-Dest':'iframe'},{Referer:'http://127.0.0.1:18081/'},{Origin:'https://evil.example'}])assert.equal(await navigate('/',{...headers,...changes}),403);
  }
});
test('Docker context preserves only the fixed Docker Portal home target',async t=>{
  const h=await setup(t);
  for(const [query,target] of [['?portal=docker','http://127.0.0.1:18080/'],['','http://127.0.0.1:19818/'],['?portal=https://evil.example','http://127.0.0.1:19818/']]){
    const html=await fetch(h.base+'/'+query).then(r=>r.text());assert.ok(html.includes(`class="platform-return" href="${target}"`));
  }
});
