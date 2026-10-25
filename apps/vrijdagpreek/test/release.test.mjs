import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {releaseFiles,appFiles,sha,verifyPortable} from '../../../scripts/verify-portable.mjs';

test('portable verifier accepts exact checkpoint bytes and rejects tampering and extra receipt paths',()=>{
 const root=mkdtempSync(join(tmpdir(),'Andere Gebruiker Moskee '));
 const contents=new Map(releaseFiles.map(name=>[name,Buffer.from(name)]));
 const manifest=Object.fromEntries(appFiles.slice().sort().map(n=>[n,sha(contents.get('apps/vrijdagpreek/'+n))]));
 contents.set('apps/vrijdagpreek/candidate.json',Buffer.from(JSON.stringify({schema:'alhor-app-candidate/v1',app_key:'vrijdagpreek',version:'portable-fixture',source_digest:sha(JSON.stringify(manifest)),source_manifest:manifest})));
 const receipt={schema:'alhor-mosque-portable/v1',commit:'a'.repeat(40),files:Object.fromEntries([...contents].map(([n,b])=>[n,sha(b)]))};
 for(const [name,bytes] of contents){const dest=join(root,name);mkdirSync(join(dest,'..'),{recursive:true});writeFileSync(dest,bytes);}
 const receiptPath=join(root,'portable-release.json');writeFileSync(receiptPath,JSON.stringify(receipt));
 assert.equal(verifyPortable(root).state,'identified');
 writeFileSync(join(root,'apps/vrijdagpreek/server.mjs'),'changed');
 assert.throws(()=>verifyPortable(root),/bron gewijzigd/);
 writeFileSync(join(root,'apps/vrijdagpreek/server.mjs'),contents.get('apps/vrijdagpreek/server.mjs'));
 receipt.files['../credentials.json']='a'.repeat(64);writeFileSync(receiptPath,JSON.stringify(receipt));
 assert.throws(()=>verifyPortable(root),/bronlijst ongeldig/);
});

test('portable release builder exists and requires explicit checkpoint',()=>{
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('../../../scripts/build-portable.mjs',import.meta.url))],{encoding:'utf8'});
 assert.match(result.stderr,/Expliciete Git-checkpoint/);
 assert.notEqual(result.status,0);
});
