import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {activateDevelopment} from '../scripts/activate-development.mjs';
import {readCandidate} from '../candidate.mjs';

function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'vrijdagpreek-activation-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  assert.equal(spawnSync('git',['init','--quiet'],{cwd:root}).status,0);
  writeFileSync(join(root,'server.mjs'),'// synthetic server\n');
  writeFileSync(join(root,'app.js'),'// synthetic application\n');
  assert.equal(spawnSync('git',['add','server.mjs','app.js'],{cwd:root}).status,0);
  const checks=[];let fail=null,duringCheck=null;
  const run=(command,args,options)=>{
    if(command==='git'&&args[0]==='rev-parse')return {status:0,stdout:'a'.repeat(40)+'\n'};
    if(command==='npm'||command==='npm.cmd'){
      checks.push(args.join(' '));duringCheck?.(args);
      return {status:fail===args.join(' ')?1:0};
    }
    return spawnSync(command,args,options);
  };
  return {root,checks,run,activate:()=>activateDevelopment({root,run,log(){}}),
    failCheck(name){fail=name;},onCheck(fn){duringCheck=fn;}};
}

test('changed working-tree source gets a tested development identity without committing',t=>{
  const h=fixture(t),result=h.activate();
  assert.equal(result.changed,true);assert.deepEqual(h.checks,['test','run check']);
  assert.equal(result.candidate.source_kind,'working-tree');assert.equal(result.candidate.base_commit,'a'.repeat(40));
  assert.equal('git_commit' in result.candidate,false);assert.match(result.candidate.version,/^dev-[a-f0-9]{12}$/);
  assert.equal(readCandidate(h.root).state,'identified');
  const bytes=readFileSync(join(h.root,'candidate.json'),'utf8');h.checks.length=0;
  assert.equal(h.activate().changed,false);assert.deepEqual(h.checks,[]);assert.equal(readFileSync(join(h.root,'candidate.json'),'utf8'),bytes);
  writeFileSync(join(h.root,'app.js'),'// changed application\n');
  assert.notEqual(h.activate().candidate.source_digest,result.candidate.source_digest);assert.deepEqual(h.checks,['test','run check']);
});
test('new untracked app files enter the manifest, while private data and runtime outputs do not',t=>{
  const h=fixture(t);h.activate();h.checks.length=0;
  mkdirSync(join(h.root,'scripts'));writeFileSync(join(h.root,'operator.js'),'// new untracked operator\n');
  writeFileSync(join(h.root,'scripts','new-helper.mjs'),'// new untracked helper\n');
  writeFileSync(join(h.root,'mosque.html'),'<!doctype html><title>Synthetic Mosque home</title>');
  for(const name of ['data','private','results','node_modules']){
    mkdirSync(join(h.root,name));writeFileSync(join(h.root,name,'not-source.json'),'synthetic private fixture');
  }
  writeFileSync(join(h.root,'.env'),'SYNTHETIC_SECRET=not-a-real-secret');
  writeFileSync(join(h.root,'local.wav'),'synthetic recording');
  writeFileSync(join(h.root,'notes.md'),'operator notes');
  const result=h.activate(),names=Object.keys(result.candidate.source_manifest);
  assert.deepEqual(names,['app.js','mosque.html','operator.js','scripts/new-helper.mjs','server.mjs']);
  assert.deepEqual(h.checks,['test','run check']);h.checks.length=0;
  writeFileSync(join(h.root,'data','not-source.json'),'changed synthetic private fixture');
  assert.equal(h.activate().changed,false);assert.deepEqual(h.checks,[]);
});
test('an existing matching committed identity is preserved without checking or rewriting it',t=>{
  const h=fixture(t),{candidate}=h.activate();
  delete candidate.source_kind;candidate.version='existing-local-version';candidate.git_commit='a'.repeat(40);
  candidate.source_manifest=Object.fromEntries(Object.entries(candidate.source_manifest).reverse());
  const bytes=JSON.stringify(candidate,null,2)+'\n';writeFileSync(join(h.root,'candidate.json'),bytes);h.checks.length=0;
  assert.equal(h.activate().changed,false);assert.deepEqual(h.checks,[]);
  assert.equal(readFileSync(join(h.root,'candidate.json'),'utf8'),bytes);
});
test('a failed test or syntax check leaves the prior descriptor bytes untouched',t=>{
  for(const check of ['test','run check']){
    const h=fixture(t);h.activate();const before=readFileSync(join(h.root,'candidate.json'),'utf8');
    writeFileSync(join(h.root,'app.js'),'// unchecked change\n');h.failCheck(check);
    assert.throws(()=>h.activate(),/broncontrole slaagt niet/);
    assert.equal(readFileSync(join(h.root,'candidate.json'),'utf8'),before);
  }
});
test('source changes during successful checks cannot be issued as checked source',t=>{
  const h=fixture(t);h.activate();const before=readFileSync(join(h.root,'candidate.json'),'utf8');
  writeFileSync(join(h.root,'app.js'),'// candidate change\n');
  h.onCheck(()=>writeFileSync(join(h.root,'app.js'),'// concurrent edit during checks\n'));
  assert.throws(()=>h.activate(),/bron veranderde tijdens/);
  assert.equal(readFileSync(join(h.root,'candidate.json'),'utf8'),before);
});
