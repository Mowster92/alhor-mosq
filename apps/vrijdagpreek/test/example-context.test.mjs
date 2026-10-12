import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pausedExample} from '../example-context.js';
const lines=[{arabic:'fixed Arabic',dutch:'fixed Dutch'}];
test('return restores only a stopped known example, never private/live content',()=>{
 assert.deepEqual(pausedExample({mode:'demo',active:false,...lines[0]},lines),lines[0]);
 for(const state of [null,{mode:'live',active:false,...lines[0]},
  {mode:'demo',active:true,...lines[0]},{mode:'demo',active:false,arabic:'private',dutch:'transcript'}])
  assert.equal(pausedExample(state,lines),null);
});
