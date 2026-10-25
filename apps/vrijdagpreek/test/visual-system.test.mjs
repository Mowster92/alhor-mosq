import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('home and operator share the calm ALHOR palette without decorative gradients',()=>{
 const css=source('styles.css');
 for(const [token,value] of Object.entries({canvas:'#e9edf0',surface:'#f7f8f6',ink:'#203630',muted:'#59666b',line:'#ced6d8',brand:'#24574c',accent:'#215d55'}))assert.ok(css.includes(`--${token}:${value}`),token);
 assert.doesNotMatch(css,/(?:radial|linear)-gradient\(/);
});

test('live caption precedes secondary presentation settings in reading and keyboard order',()=>{
 const html=source('index.html');
 assert.ok(html.indexOf('class="caption-preview"')<html.indexOf('class="presentation-panel"'));
});

test('Mosque logo preserves its original paths with quiet accent and ink fills',()=>{
 const svg=source('alhor-p1.svg');
 assert.ok(svg.includes('fill="#215D55"'));
 assert.ok(svg.includes('fill="#203630"'));
 assert.equal((svg.match(/<path /g)||[]).length,7);
});
