import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
import {pausedExample} from '../example-context.js';
test('operator demo completion/restart/stop/clear and server publication',async()=>{
 const elements=new Map(),intervals=new Map(),states=[];let next=0,generation=0,released=false;
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',disabled:false,checked:false,setAttribute(){},replaceChildren(){}});return elements.get(id);};
 const context={document:{getElementById:element},crypto:{randomUUID:()=> 'operator'},navigator:{mediaDevices:{addEventListener(){}}},window:{addEventListener(){},open(){}},LiveSession:class{stop(){}},micError:()=>'',setInterval:(fn)=>{intervals.set(++next,fn);return next;},clearInterval:id=>intervals.delete(id),cancelAnimationFrame(){},console,
 fetch:async(path,options)=>{const data=JSON.parse(options.body||'{}');if(path==='/api/state')states.push(data);if(path==='/api/release')released=true;return {ok:true,json:async()=>path==='/api/bootstrap'?{csrf:'test',configured:false}:path==='/api/claim'?{generation:++generation}:{ok:true}};}};
 Object.assign(context,{Option:class{constructor(text,value){this.text=text;this.value=value;}},pausedExample,EventSource:class{close(){}},setTimeout:()=>1,clearTimeout(){}});
 const ready=runInNewContext('(async()=>{'+app.replace(/^import .*;\r?\n/gm,'').replace('export const','const')+'})()',context);await ready;
 const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
 element('start').onclick();await flush();assert.equal(element('dutch').textContent,'Alle lof komt toe aan God, Heer van de werelden.');
 const tick=()=>[...intervals.values()].at(-1)();for(let i=0;i<4;i++)tick();await flush();
 assert.equal(intervals.size,0);assert.match(element('status').textContent,/voltooid/);assert.equal(states.at(-1).active,false);
 element('restart').onclick();await flush();assert.equal(intervals.size,2);assert.match(element('dutch').textContent,/Alle lof/);
 element('stop').onclick();await flush();assert.equal(intervals.size,0);element('clear').onclick();await flush();assert.equal(states.at(-1).dutch,'');
 element('restart').onclick();await flush();const caption=element('dutch').textContent;
 element('improve-app').onclick({preventDefault(){throw Error('Example entry should be allowed');}});await flush();
 assert.equal(intervals.size,0);assert.equal(element('dutch').textContent,caption);assert.equal(states.at(-1).active,false);
 assert.equal(released,true,'The improvement handoff releases its paused lease so returning to the app can claim it.');
 assert.equal(typeof element('save-preparation').onclick,'function','Operator can save a prepared presentation');
});
test('audience SSE snapshot/update and reconnect error, no browser storage dependency',async()=>{
 const script=await readFile(new URL('../display.js',import.meta.url),'utf8');const elements=new Map();let events;
 runInNewContext(script,{document:{getElementById:id=>{const el={};elements.set(id,el);return el;}},EventSource:class{constructor(path){assert.equal(path,'/api/events');events=this;}}});
 events.onmessage({data:JSON.stringify({dutch:'Hallo',mode:'live',status:'Live'})});assert.equal(elements.get('audience-dutch').textContent,'Hallo');
 events.onerror();assert.match(elements.get('audience-progress').textContent,/VERBINDING VERLOREN/);
 events.onmessage({data:JSON.stringify({dutch:'Nieuw',mode:'demo',status:'Gereed'})});assert.equal(elements.get('audience-dutch').textContent,'Nieuw');
 assert.doesNotMatch(app+script,/localStorage|BroadcastChannel/);
});
