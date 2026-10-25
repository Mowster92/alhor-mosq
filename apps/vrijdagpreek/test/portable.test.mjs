import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('portable Windows entry checks prerequisites and uses ensure-home without configuration',{skip:process.platform!=='win32'},()=>{
 const result=spawnSync('pwsh',['-NoProfile','-File',fileURLToPath(new URL('../../../dev/vrijdagpreek/portable.test.ps1',import.meta.url))],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
 assert.match(result.stdout,/PASS: portable/);
 const source=spawnSync('pwsh',['-NoProfile','-File',fileURLToPath(new URL('../../../dev/vrijdagpreek/portable-source.test.ps1',import.meta.url))],{encoding:'utf8'});
 assert.equal(source.status,0,source.stdout+'\n'+source.stderr);
});
