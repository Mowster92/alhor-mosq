import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('Windows ensure-home controller keeps shell startup separate from legacy speech configuration',{skip:process.platform!=='win32'},()=>{
  const result=spawnSync('pwsh',['-NoProfile','-File',fileURLToPath(new URL('../../../dev/vrijdagpreek/windows-home.test.ps1',import.meta.url))],{encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stdout,/PASS: ensure-home/);
});
