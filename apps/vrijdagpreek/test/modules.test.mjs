import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApp} from '../server.mjs';

async function setup(t,file){
  const server=createApp({env:{ALHOR_MODULES_FILE:file},fetcher:()=>{throw new Error('Provider forbidden');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const boot=await fetch(base+'/api/bootstrap',{method:'POST',headers:{Origin:base,'X-Local-App':'1'}}).then(r=>r.json());
  return {base,get:()=>fetch(base+'/api/modules'),post:(data,headers={})=>fetch(base+'/api/modules',{method:'POST',headers:{Origin:base,'X-App-Token':boot.csrf,'Content-Type':'application/json',...headers},body:JSON.stringify(data)})};
}
const defaults={version:1,modules:{vrijdagpreek:{visible:true,favourite:false}}};
test('module preferences default without disk writes and persist only explicit submission across servers',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'mosque-modules-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const file=join(dir,'modules.json'),h=await setup(t,file);
  assert.deepEqual(await h.get().then(r=>r.json()),defaults);
  await assert.rejects(readFile(file),{code:'ENOENT'});
  const selected={version:1,modules:{vrijdagpreek:{visible:false,favourite:true}}};
  assert.equal((await h.post(selected)).status,200);
  assert.deepEqual(JSON.parse(await readFile(file,'utf8')),selected);
  assert.deepEqual(await (await setup(t,file)).get().then(r=>r.json()),selected);
});

test('module settings reject unknown modules and CSRF without touching disk or the active operator',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'mosque-modules-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const file=join(dir,'modules.json'),h=await setup(t,file);
  for(const invalid of [null,[],{}, {...defaults,owner:'intruder'}, {version:1,modules:{members:{visible:true,favourite:true}}}, {version:1,modules:{vrijdagpreek:{visible:'yes',favourite:false}}}, {version:1,modules:{vrijdagpreek:{visible:true,favourite:false,url:'https://evil.example'}}}])assert.equal((await h.post(invalid)).status,400);
  for(const headers of [{Origin:'https://evil.example'},{Origin:''},{'X-App-Token':'wrong'},{'Content-Type':'text/plain'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await h.post(defaults,headers)).status,403);
  await assert.rejects(readFile(file),{code:'ENOENT'});
  await writeFile(file,'damaged synthetic settings');
  assert.equal((await h.get()).status,503);assert.equal((await h.post(defaults)).status,503);
  assert.equal(await readFile(file,'utf8'),'damaged synthetic settings');
  for(const path of ['/data/modules.json','/module-store.mjs'])assert.equal((await fetch(h.base+path)).status,404);
});

test('home offers distinct operator and audience entrances plus honest bounded local organisation',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'mosque-modules-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const h=await setup(t,join(dir,'modules.json'));
  for(const context of ['local','docker','standalone']){
    const html=await fetch(h.base+'/mosque?portal='+context).then(r=>r.text());
    assert.ok(html.includes(`class="module-open" href="/?portal=${context}"`));
    assert.match(html,/class="audience-open" href="\/display.html"/);
    for(const text of ['Modulebeheer','Vertrouwde lokale instellingen','Nog niet gebouwd','id="module-settings"','id="module-visible"','id="module-favourite"','/mosque-home.js'])assert.ok(html.includes(text),text);
  }
  assert.equal((await fetch(h.base+'/mosque-home.js')).status,200);
});
