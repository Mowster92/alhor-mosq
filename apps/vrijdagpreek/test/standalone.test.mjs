import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';

test('standalone context has no unavailable Portal return and preserves home/operator roundtrip',async t=>{
  let calls=0;
  const server=createApp({env:{},fetcher:async()=>{calls++;throw Error('No provider');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const [path,link] of [['/mosque','class="module-open" href="/?portal=standalone"'],['/','class="mosque-return" href="/mosque?portal=standalone"']]){
    const html=await fetch(base+path+'?portal=standalone').then(r=>r.text());
    assert.doesNotMatch(html,/class="platform-return"/);
    assert.match(html,/Zelfstandig geopend/);
    assert.ok(html.includes(link));
  }
  for(const [context,port] of [['local','18180'],['docker','18080']]){
    const html=await fetch(base+'/mosque?portal='+context).then(r=>r.text());
    assert.ok(html.includes(`class="platform-return" href="http://127.0.0.1:${port}/app/operating/?return=vrijdagpreek"`));
  }
  const html=await fetch(base+'/mosque?portal=https://evil.example').then(r=>r.text());
  assert.ok(html.includes('class="platform-return" href="http://127.0.0.1:19818/"'));
  assert.equal(calls,0);
});
