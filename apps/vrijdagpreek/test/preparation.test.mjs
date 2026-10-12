import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import * as preparationModule from '../preparation.mjs';
const {normalizePreparation,loadPreparation,savePreparation,loadPreparationLibrary,saveLibraryPreparation}=preparationModule;
import {createApp} from '../server.mjs';

test('prepared captions validate before replacing useful saved work and reopen exactly',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mosque-preparation-')),file=join(dir,'preparation.json');
 try{
  assert.deepEqual((await loadPreparation(file)).lines,[]);
  const deck={title:'Samen zorgen',lines:[{arabic:'السلام',dutch:'Vrede voor iedereen.'},{arabic:'',dutch:'Help elkaar vandaag.'}]};
  await savePreparation(file,deck);assert.deepEqual(await loadPreparation(file),deck);
  const bytes=await readFile(file,'utf8');
  await assert.rejects(savePreparation(file,{...deck,title:'Stale'},()=>false));
  assert.equal(await readFile(file,'utf8'),bytes,'Expired save cannot replace useful preparation');
  for(const bad of [{...deck,title:''},{...deck,lines:[]},{...deck,lines:Array(11).fill(deck.lines[0])},{...deck,lines:[{arabic:'',dutch:''}]},{...deck,lines:[{arabic:'',dutch:'x'.repeat(601)}]}]){
   await assert.rejects(savePreparation(file,bad));assert.equal(await readFile(file,'utf8'),bytes);
  }
  await writeFile(file,'not-json');await assert.rejects(loadPreparation(file));
 }finally{await rm(dir,{recursive:true});}
});
test('prepared text stays plain text with only the allowed fields',()=>{
 assert.deepEqual(normalizePreparation({title:' T ',lines:[{arabic:'',dutch:'<script>not executed</script>',command:'ignored'}],secret:'ignored'}),{title:'T',lines:[{arabic:'',dutch:'<script>not executed</script>'}]});
});
test('an existing preparation is retained when a second sermon is created and both reopen',async()=>{
 assert.equal(typeof loadPreparationLibrary,'function','the library must reopen saved sermons');
 const dir=await mkdtemp(join(tmpdir(),'mosque-library-')),file=join(dir,'preparation.json');
 const first={title:'Bestaande preek',lines:[{arabic:'سلام',dutch:'Vrede'}]};
 const second={title:'Tweede preek',lines:[{arabic:'رحمة',dutch:'Barmhartigheid'}]};
 try{
  await savePreparation(file,first);
  const original=await readFile(file,'utf8');
  const before=await loadPreparationLibrary(file);
  assert.equal(before.selectedId,'legacy');
  assert.deepEqual(before.preparations.map(({revision,...item})=>item),[{id:'legacy',...first}]);
  assert.match(before.preparations[0].revision,/^[a-f0-9]{64}$/);
  const created=await saveLibraryPreparation(file,second,{create:true});
  assert.notEqual(created.selectedId,'legacy');
  assert.deepEqual(created.preparations.map(item=>item.title),[first.title,second.title]);
  assert.equal(await readFile(file,'utf8'),original,'the old single-preparation file remains recoverable');
  const revised={...first,title:'Bestaande preek aangepast'};
  await saveLibraryPreparation(file,revised,{id:'legacy',expectedRevision:before.preparations[0].revision});
  const reopened=await loadPreparationLibrary(file);
  assert.deepEqual((({revision,...item})=>item)(reopened.preparations.find(item=>item.id==='legacy')),{id:'legacy',...revised});
  assert.deepEqual((({revision,...item})=>item)(reopened.preparations.find(item=>item.id===created.selectedId)),{id:created.selectedId,...second});
  assert.equal(await readFile(file,'utf8'),original);
 }finally{await rm(dir,{recursive:true});}
});
test('invalid, unknown and stale library saves preserve all existing sermons',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mosque-library-invalid-')),file=join(dir,'preparation.json');
 const deck={title:'Eerste',lines:[{arabic:'',dutch:'Eerste regel'}]};
 try{
  const first=await saveLibraryPreparation(file,deck,{create:true});
  const libraryFile=join(dir,'preparations.json'),bytes=await readFile(libraryFile,'utf8');
  await assert.rejects(saveLibraryPreparation(file,{...deck,title:''},{create:true}));
  await assert.rejects(saveLibraryPreparation(file,deck,{id:'missing'}));
  await assert.rejects(saveLibraryPreparation(file,deck,{id:first.selectedId,expectedRevision:first.preparations[0].revision,canCommit:()=>false}));
  assert.equal(await readFile(libraryFile,'utf8'),bytes);
 }finally{await rm(dir,{recursive:true});}
});
test('saving preparation uses the existing exclusive operator boundary; another server reopens it',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'mosque-api-')),file=join(dir,'preparation.json');
 const server=createApp({env:{},preparationFile:file});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();server.close();await rm(dir,{recursive:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 const bootstrap=()=>fetch(base+'/api/bootstrap',{method:'POST',headers:{Origin:base,'X-Local-App':'1'}}).then(r=>r.json());
 const boot=await bootstrap(),post=(path,data,token=boot.csrf)=>fetch(base+'/api/'+path,{method:'POST',headers:{Origin:base,'X-App-Token':token,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const deck={title:'Voorbereid',lines:[{arabic:'سلام',dutch:'Vrede'}]};
 assert.equal((await post('preparation',{owner:'one',preparation:deck})).status,409);
 const {generation}=await (await post('claim',{owner:'one'})).json();
 assert.equal((await post('preparation',{owner:'two',generation,preparation:deck})).status,409);
 assert.equal((await post('preparation',{owner:'one',generation,preparation:deck},'bad')).status,403);
 const firstSave=await (await post('preparation',{owner:'one',generation,preparation:deck})).json();
 assert.deepEqual((await bootstrap()).preparation,deck);
 const raw=Buffer.from(JSON.stringify({owner:'one',generation,preparation:deck,preparationId:firstSave.selectedId,expectedRevision:firstSave.preparations[0].revision})),split=raw.indexOf(Buffer.from('سلام'))+1;
 await new Promise((resolve,reject)=>{
  const req=request(base+'/api/preparation',{method:'POST',headers:{Origin:base,'X-App-Token':boot.csrf,'Content-Type':'application/json'}},res=>{res.resume();res.on('end',()=>{assert.equal(res.statusCode,200);resolve();});});
  req.on('error',reject);req.write(raw.subarray(0,split));setTimeout(()=>req.end(raw.subarray(split)),30);
 });
 assert.deepEqual((await bootstrap()).preparation,deck,'Arabic survives a multibyte character split across request chunks');
 assert.equal((await post('state',{owner:'one',generation,mode:'prepared',active:true,status:'Handmatig',...deck.lines[0]})).status,200);
 assert.equal((await fetch(base+'/data/preparation.json')).status,404);
 const second=createApp({env:{},preparationFile:file});await new Promise(r=>second.listen(0,'127.0.0.1',r));
 try{const next=`http://127.0.0.1:${second.address().port}`;assert.deepEqual((await fetch(next+'/api/bootstrap',{method:'POST',headers:{Origin:next,'X-Local-App':'1'}}).then(r=>r.json())).preparation,deck);}
 finally{second.closeAllConnections();second.close();}
});
test('the operator can create a second sermon through the API without replacing the first',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'mosque-library-api-')),file=join(dir,'preparation.json');
 const first={title:'Eerste preek',lines:[{arabic:'سلام',dutch:'Vrede'}]};
 const second={title:'Tweede preek',lines:[{arabic:'رحمة',dutch:'Barmhartigheid'}]};
 await savePreparation(file,first);
 const original=await readFile(file,'utf8');
 const server=createApp({env:{},preparationFile:file});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();server.close();await rm(dir,{recursive:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 const bootstrap=()=>fetch(base+'/api/bootstrap',{method:'POST',headers:{Origin:base,'X-Local-App':'1'}}).then(r=>r.json());
 const boot=await bootstrap();
 assert.deepEqual(boot.preparation,first);
 assert.equal(boot.selectedId,'legacy');
 assert.deepEqual(boot.preparations.map(item=>item.title),[first.title]);
 const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{Origin:base,'X-App-Token':boot.csrf,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const {generation}=await (await post('claim',{owner:'one'})).json();
 assert.equal((await post('preparation',{owner:'two',generation,preparation:second,create:true})).status,409);
 const created=await post('preparation',{owner:'one',generation,preparation:second,create:true});
 assert.equal(created.status,200);
 const saved=await created.json();
 assert.notEqual(saved.selectedId,'legacy');
 assert.deepEqual(saved.preparations.map(item=>item.title),[first.title,second.title]);
 assert.equal(await readFile(file,'utf8'),original);
 const unknown=await post('preparation',{owner:'one',generation,preparation:first,preparationId:'missing'});
 assert.equal(unknown.status,400);
 assert.deepEqual((await bootstrap()).preparations.map(item=>item.title),[first.title,second.title]);
 assert.equal((await fetch(base+'/data/preparations.json')).status,404);
});
test('a tab with an older sermon revision cannot erase a later saved edit',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'mosque-library-stale-')),file=join(dir,'preparation.json');
 await savePreparation(file,{title:'Bewaarde preek',lines:[{arabic:'',dutch:'Origineel'}]});
 const server=createApp({env:{},preparationFile:file});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();server.close();await rm(dir,{recursive:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 const bootstrap=()=>fetch(base+'/api/bootstrap',{method:'POST',headers:{Origin:base,'X-Local-App':'1'}}).then(r=>r.json());
 const a=await bootstrap(),b=await bootstrap();
 assert.equal(a.preparations[0].revision,b.preparations[0].revision);
 const post=(path,data)=>fetch(base+'/api/'+path,{method:'POST',headers:{Origin:base,'X-App-Token':a.csrf,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const claimA=await (await post('claim',{owner:'a'})).json();
 const changedA={title:'Bewaarde preek',lines:[{arabic:'',dutch:'Nieuw van A'}]};
 assert.equal((await post('preparation',{owner:'a',generation:claimA.generation,preparationId:'legacy',expectedRevision:a.preparations[0].revision,preparation:changedA})).status,200);
 assert.equal((await post('release',{owner:'a',generation:claimA.generation})).status,200);
 const savedBytes=await readFile(join(dir,'preparations.json'),'utf8');
 const claimB=await (await post('claim',{owner:'b'})).json();
 const stale=await post('preparation',{owner:'b',generation:claimB.generation,preparationId:'legacy',expectedRevision:b.preparations[0].revision,preparation:{...changedA,lines:[{arabic:'',dutch:'Oud van B'}]}});
 assert.equal(stale.status,409);
 assert.match((await stale.json()).error,/gewijzigd/);
 assert.equal(await readFile(join(dir,'preparations.json'),'utf8'),savedBytes);
 assert.deepEqual((await bootstrap()).preparation,changedA);
});
