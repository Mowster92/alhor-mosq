import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {createApp} from '../server.mjs';
async function setup(t,env={}){
  const calls=[];const server=createApp({env,fetcher:async(...args)=>{calls.push(args);return new Response('temporary-token');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const boot=await fetch(base+'/api/bootstrap',{method:'POST',headers:{Origin:base,'X-Local-App':'1'}}).then(r=>r.json());
  const post=(path,data={},headers={})=>fetch(base+'/api/'+path,{method:'POST',headers:{Origin:base,'X-App-Token':boot.csrf,'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
  return {base,boot,post,calls};
}
test('loopback API: origins, secrets, tokens, ownership, generation and SSE snapshot',async t=>{
 const {base,boot,post,calls}=await setup(t,{AZURE_SPEECH_KEY:'server-secret',AZURE_SPEECH_REGION:'westeurope'});
 assert.equal(boot.configured,true);assert.ok(!JSON.stringify(boot).includes('server-secret'));
 assert.equal((await post('claim',{owner:'a'},{Origin:'https://evil.example'})).status,403);
 assert.equal((await post('claim',{owner:'a'},{'X-App-Token':'bad'})).status,403);
 assert.equal((await fetch(base+'/.env')).status,404);
 assert.equal((await fetch(base+'/server.mjs')).status,404);
 assert.equal((await fetch(base+'/api/bootstrap')).status,404);
 const {generation}=await post('claim',{owner:'a'}).then(r=>r.json());const session={owner:'a',generation};
 assert.equal((await post('claim',{owner:'b'})).status,409);
 assert.equal((await post('token',session)).status,400);assert.equal(calls.length,0);
 const token=await post('token',{...session,consent:true}).then(r=>r.json());assert.equal(token.token,'temporary-token');assert.equal(calls.length,1);
 assert.equal(calls[0][0],'https://westeurope.api.cognitive.microsoft.com/sts/v1.0/issueToken');
 const state={...session,dutch:'Nederlandse tekst',arabic:'نص',mode:'live',status:'Live',active:true};
 assert.equal((await post('state',state)).status,200);
 const abort=new AbortController();const stream=await fetch(base+'/api/events',{signal:abort.signal});
 const reader=stream.body.getReader();const first=new TextDecoder().decode((await reader.read()).value);assert.match(first,/Nederlandse tekst/);assert.doesNotMatch(first,/token|server-secret/);abort.abort();
 await post('release',session);assert.equal((await post('state',state)).status,409);
});
test('invalid region cannot construct an arbitrary endpoint; demo needs no credentials',async t=>{
 const {post,boot,calls}=await setup(t,{AZURE_SPEECH_KEY:'secret',AZURE_SPEECH_REGION:'evil.example/path'});
 assert.equal(boot.configured,false);const {generation}=await post('claim',{owner:'a'}).then(r=>r.json());
 assert.equal((await post('token',{owner:'a',generation,consent:true})).status,400);assert.equal(calls.length,0);
});

test('ALHOR can open a page through a user click without opening the API boundary',async t=>{
 const {base}=await setup(t);
 // Fetch rewrites Sec-Fetch-Mode to cors; use HTTP to reproduce browser navigation headers.
 const navigate=(path,headers,method='GET')=>new Promise((resolve,reject)=>{
   const req=request(base+path,{method,headers},res=>{
     res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers}));
   });req.on('error',reject);req.end();
 });
 const navigation={'Sec-Fetch-Site':'same-site','Sec-Fetch-Mode':'navigate',
   'Sec-Fetch-Dest':'document','Sec-Fetch-User':'?1','Referer':'http://127.0.0.1:19818/'};
 for(const path of ['/','/display.html']) {
   const response=await navigate(path,navigation);
   assert.equal(response.status,200,path);
   assert.match(response.headers['content-type'],/text\/html/);
 }
 for(const path of ['/api/events','/sdk.js'])
   assert.equal((await navigate(path,navigation)).status,403,path);
 for(const changed of [{'Sec-Fetch-Dest':'iframe'},{'Sec-Fetch-Mode':'cors'},
   {'Sec-Fetch-User':''},{'Referer':'http://127.0.0.1:19819/'},
   {'Sec-Fetch-Site':'cross-site'},{Origin:'https://evil.example'}])
   assert.equal((await navigate('/',{...navigation,...changed})).status,403);
 assert.equal((await navigate('/api/bootstrap',
   {...navigation,Origin:base,'X-Local-App':'1'},'POST')).status,403);
});
