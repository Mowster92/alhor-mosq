import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {pausedExample} from '../example-context.js';
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
async function harness(handler){
 const elements=new Map(),intervals=new Map(),calls=[];let next=0;
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',disabled:false,checked:false,setAttribute(){},replaceChildren(){}});return elements.get(id);};
 const context={document:{getElementById:element},crypto:{randomUUID:()=> 'operator'},navigator:{mediaDevices:{addEventListener(){}}},window:{addEventListener(){},open(){}},LiveSession:class{stop(){}},micError:()=>'',setInterval:fn=>{intervals.set(++next,fn);return next;},clearInterval:id=>intervals.delete(id),cancelAnimationFrame(){},
 fetch:async(path,options)=>{calls.push(path);const data=JSON.parse(options.body||'{}');const result=await handler(path,data);return result||{ok:true,json:async()=>path==='/api/bootstrap'?{csrf:'test',configured:false}:path==='/api/claim'?{generation:1}:{ok:true}};}};
 Object.assign(context,{Option:class{constructor(text,value){this.text=text;this.value=value;}},pausedExample,EventSource:class{close(){}},setTimeout:()=>1,clearTimeout(){}});
 await runInNewContext('(async()=>{'+app.replace(/^import .*;\r?\n/gm,'').replace('export const','const')+'})()',context);
 return {element,intervals,calls};
}
test('failed state publication stops locally without an endless retry chain',async()=>{
 let failures=0;
 const h=await harness(path=>{if(path==='/api/state'){failures++;if(failures<5)throw Error('offline');}});
 h.element('start').onclick();await flush();
 assert.equal(failures,1);assert.equal(h.intervals.size,0);
 assert.match(h.element('status').textContent,/verbinding verloren/);
});
test('stop during claim releases the late lease and installs no heartbeat',async()=>{
 let resolve;
 const h=await harness(path=>path==='/api/claim'?new Promise(r=>resolve=r):undefined);
 h.element('start').onclick();await flush();h.element('stop').onclick();
 resolve({ok:true,json:async()=>({generation:1})});await flush();
 assert.equal(h.intervals.size,0);assert.ok(h.calls.includes('/api/release'));
 assert.match(h.element('status').textContent,/Gestopt/);
});
