// Isolated entrance/navigation receipt only: no microphone, fake speech, transcripts or provider calls.
const {chromium,firefox}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {pathToFileURL}=require('node:url');
const source=process.env.APP_SOURCE||'/source/apps/vrijdagpreek';
const artifacts=process.env.ARTIFACTS_DIR||'/artifacts';
(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const {createApp}=await import(pathToFileURL(source+'/server.mjs'));
 let providerCalls=0;
 const app=createApp({env:{},fetcher:async()=>{providerCalls++;throw Error('Provider forbidden');}});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.address().port;
 const checks=[];const errors=[];const requests=[];let micCalls=0;
 const portals=[];
 try{
  for(const [context,port] of [['local',18180],['docker',18080]]){
   const portal=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<a href="${base}/mosque?portal=${context}">Open Mosque</a>`);});
   await new Promise(r=>portal.listen(port,'127.0.0.1',r));portals.push(portal);
  }
  for(const [name,engine] of [['chromium',chromium],['firefox',firefox]]){
   const browser=await engine.launch({headless:true});
   try{
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    await context.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>{window.__micCalls=(window.__micCalls||0)+1;return Promise.reject(Error('Microphone forbidden'));};});
    await context.route('**/*',route=>{const url=route.request().url();requests.push(url);if(url.startsWith(base+'/')||/^http:\/\/127\.0\.0\.1:(18180|18080)\//.test(url))return route.continue();errors.push('External request '+url);return route.abort();});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    const navigations=[];
    page.on('request',r=>{if(r.isNavigationRequest()&&r.url().startsWith(base))navigations.push({url:r.url(),referer:r.headers().referer||null,site:r.headers()['sec-fetch-site']||null});});
    for(const [entrance,port] of [['local',18180],['docker',18080]]){
     await page.goto('http://127.0.0.1:'+port+'/');
     const entered=page.waitForResponse(r=>r.url()===base+'/mosque?portal='+entrance);
     await page.getByRole('link',{name:'Open Mosque',exact:true}).click();assert.equal((await entered).status(),200);
     assert.equal(await page.locator('.platform-return').getAttribute('href'),`http://127.0.0.1:${port}/app/operating/?return=vrijdagpreek`);
     assert.equal(await page.locator('.module-open').count(),1);assert.equal(await page.locator('script').count(),0);
     await page.getByRole('link',{name:'Open Vrijdagpreek'}).click();
     await page.waitForURL(base+'/?portal='+entrance);
     await page.waitForFunction(()=>document.querySelector('#azure-state')?.textContent.includes('niet ingesteld'));
     assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.locator('#stop').isDisabled(),true);
     micCalls+=await page.evaluate(()=>window.__micCalls||0);
     if(entrance==='local')await page.screenshot({path:artifacts+'/'+name+'-operator.png',fullPage:true});
     await page.getByRole('link',{name:'Mosque home',exact:true}).click();await page.waitForURL(base+'/mosque?portal='+entrance);
     await page.reload();assert.equal(await page.locator('.platform-return').getAttribute('href'),`http://127.0.0.1:${port}/app/operating/?return=vrijdagpreek`);
     checks.push(name+': '+entrance+' Portal click → Mosque → operator → Mosque → reload');
    }
    for(const width of [1280,390]){
     await page.setViewportSize({width,height:900});
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
     assert.equal(await page.locator('.mosque-module').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
     assert.equal(await page.locator('.home-card').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
     await page.screenshot({path:artifacts+'/'+name+'-mosque-'+width+'.png',fullPage:true});
     checks.push(name+': '+width+'px no overflow, white cards, local assets');
    }
    const audience=await context.newPage();assert.equal((await audience.goto(base+'/display.html')).status(),200);await audience.close();
    assert.ok(navigations.some(n=>n.url===base+'/?portal=local'&&n.referer===null),'home→module respects no-referrer');
    assert.ok(navigations.some(n=>n.url===base+'/mosque?portal=local'&&n.referer===null),'module→home respects no-referrer');
   }finally{await browser.close();}
  }
  assert.equal(providerCalls,0);assert.equal(micCalls,0);assert.equal(requests.filter(u=>/\/api\/(token|claim|state|feedback)(?:\?|$)/.test(u)).length,0);assert.deepEqual(errors,[]);
  const receipt={passed:true,checks,providerCalls,microphoneCalls:micCalls,liveSpeech:false,personalData:false,errors};
  fs.writeFileSync(artifacts+'/mosque-browser-report.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
 }finally{app.closeAllConnections();await new Promise(r=>app.close(r));for(const p of portals)await new Promise(r=>p.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
