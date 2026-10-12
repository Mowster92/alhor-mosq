import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readCandidate} from '../candidate.mjs';
import {createApp} from '../server.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'vrijdagpreek-candidate-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const manifest = {'index.html':sha('page'), 'server.mjs':sha('server')};
  for (const [name, content] of [['index.html','page'],['server.mjs','server']]) writeFileSync(join(root,name),content);
  const descriptor = {schema:'alhor-app-candidate/v1', app_key:'vrijdagpreek',
    version:'vrijdagpreek-mvp2-test', source_manifest:manifest,
    source_digest:sha(JSON.stringify(manifest))};
  const save = () => writeFileSync(join(root,'candidate.json'), JSON.stringify(descriptor));
  save(); return {root, descriptor, save};
}
test('candidate identifies exact bytes; missing, changed and unsafe source are unknown', t => {
  const {root,descriptor,save} = fixture(t);
  assert.equal(readCandidate(root).version,descriptor.version);
  writeFileSync(join(root,'index.html'),'different page');
  assert.equal(readCandidate(root).state,'unknown');
  writeFileSync(join(root,'index.html'),'page');
  descriptor.source_manifest['../outside']=sha('anything'); save();
  assert.equal(readCandidate(root).state,'unknown');
  rmSync(join(root,'candidate.json'));
  assert.equal(readCandidate(root).state,'unknown');
});
test('running app identifies its boot source, never a replacement descriptor or changed disk', async t => {
  const {root,descriptor,save} = fixture(t);
  const server=createApp({env:{},candidateRoot:root});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const original=await fetch(base+'/api/identity');
  assert.equal(original.headers.get('X-ALHOR-Candidate'),descriptor.version);
  const identity=await original.json();
  assert.equal(identity.source_digest,descriptor.source_digest);
  assert.deepEqual(Object.keys(identity).sort(),['app_key','schema','source_digest','state','version']);
  descriptor.version='replacement-not-booted'; save();
  const replaced=await fetch(base+'/api/identity');
  assert.equal(replaced.headers.get('X-ALHOR-Candidate'),null);
  assert.equal((await replaced.json()).state,'unknown');
  descriptor.version='vrijdagpreek-mvp2-test';save();
  writeFileSync(join(root,'server.mjs'),'changed server');
  assert.equal((await fetch(base+'/api/identity')).headers.get('X-ALHOR-Candidate'),null);
  assert.equal((await fetch(base+'/api/identity',{headers:{Origin:'https://foreign.example'}})).status,403);
});
