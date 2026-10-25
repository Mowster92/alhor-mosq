// INTERNAL TEST ONLY: isolated SSE captions; no physical microphone, audio or provider.
const {chromium,firefox}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const source=process.env.APP_SOURCE||'/source/apps/vrijdagpreek';
const artifacts=process.env.ARTIFACTS_DIR||'/artifacts';
(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const {createApp}=await import(pathToFileURL(source+'/server.mjs'));
 let providerCalls=0,micCalls=0;
 const app=createApp({env:{},fetcher:async()=>{providerCalls++;throw Error('Provider forbidden');}});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.address().port,checks=[],errors=[];
 try{
  for(const [name,engine] of [['chromium',chromium],['firefox',firefox]]){
   const browser=await engine.launch({headless:true});
   try{
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    await context.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>{window.__micCalls=(window.__micCalls||0)+1;return Promise.reject(Error('Microphone forbidden'));};});
    await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():(errors.push('External request'),route.abort()));
    const operator=await context.newPage(),audience=await context.newPage();
    for(const page of [operator,audience])page.on('pageerror',e=>errors.push(name+': '+e.message));
    await operator.goto(base+'/');await audience.goto(base+'/display.html');
    await operator.waitForFunction(()=>document.querySelector('#azure-state').textContent.includes('niet ingesteld'));
    assert.equal(await operator.locator('#audience-size').count(),1,'Explicit audience size control is missing');
    const post=(path,data)=>operator.evaluate(async({path,data})=>{
     const boot=await fetch('/api/bootstrap',{method:'POST',headers:{'X-Local-App':'1'}}).then(r=>r.json());
     const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-App-Token':boot.csrf},body:JSON.stringify(data)});
     return {status:r.status,body:await r.json()};
    },{path,data});
    const phaseBefore=await audience.locator('body').getAttribute('data-phase');
    await operator.locator('#audience-size').selectOption('large');await operator.locator('#audience-theme').selectOption('dark');
    await operator.getByRole('button',{name:'Weergave toepassen'}).click();
    await audience.waitForFunction(()=>document.body.dataset.textSize==='large'&&document.body.dataset.theme==='dark');
    await operator.waitForFunction(()=>document.querySelector('#presentation-status').textContent.includes('Toegepast'));
    assert.equal(await operator.locator('#consent').isChecked(),false);
    assert.equal(await audience.locator('body').getAttribute('data-phase'),phaseBefore);
    await operator.reload();await operator.waitForFunction(()=>document.querySelector('#audience-size').value==='large');
    assert.equal(await operator.locator('#audience-theme').inputValue(),'dark');
    await audience.reload();await audience.waitForFunction(()=>document.body.dataset.theme==='dark');
    checks.push(name+': two-page SSE settings and reload, idle and no consent/audio');
    // Internal caption injection through the real protected lease/state API; not a product demo mode.
    const session={owner:'internal-presentation-test-'+name,...(await post('claim',{owner:'internal-presentation-test-'+name})).body};
    const caption='Interne leestest — Vandaag spreken we over elkaar helpen, goed luisteren en respect voor onze buren. Ook een klein gebaar kan voor iemand veel betekenen. Laten we daar deze week samen aandacht aan geven.';
    assert.equal((await post('state',{...session,mode:'live',phase:'stopped',active:false,status:'Interne browserproef · geen live spraak',dutch:caption,arabic:'',partial:false})).status,200);
    await audience.waitForFunction(()=>document.querySelector('#audience-dutch').textContent.startsWith('Interne leestest'));
    // An incoming caption must not overwrite choices the operator is still editing.
    await operator.locator('#audience-size').selectOption('extra-large');
    await post('state',{...session,mode:'live',phase:'stopped',active:false,status:'Interne browserproef',dutch:caption,arabic:''});
    await operator.waitForTimeout(150);
    assert.equal(await operator.locator('#audience-size').inputValue(),'extra-large','Caption SSE overwrote an unsaved presentation choice');
    // Another tab cannot change the active lease or cause a start by applying presentation.
    await operator.locator('#audience-size').selectOption('extra-large');await operator.getByRole('button',{name:'Weergave toepassen'}).click();
    await operator.waitForFunction(()=>document.querySelector('#presentation-status').textContent.includes('andere operator'));
    assert.equal(await audience.locator('body').getAttribute('data-text-size'),'large');
    await post('release',session);
    for(const theme of ['light','dark'])for(const size of ['standard','large','extra-large']){
     await operator.locator('#audience-theme').selectOption(theme);await operator.locator('#audience-size').selectOption(size);
     await operator.getByRole('button',{name:'Weergave toepassen'}).click();
     await audience.waitForFunction(({theme,size})=>document.body.dataset.theme===theme&&document.body.dataset.textSize===size,{theme,size});
     for(const width of [390,1280,1920]){
      await audience.setViewportSize({width,height:width===390?844:width===1280?720:1080});
      assert.equal(await audience.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Audience horizontal overflow '+width);
      assert.equal(await audience.locator('#audience-dutch').textContent(),caption);
      assert.ok(await audience.locator('#audience-dutch').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=28));
      assert.equal(await audience.locator('#audience-dutch').evaluate(e=>e.scrollHeight>e.clientHeight+1),false,'Caption clipped '+width);
      if(size==='large')await audience.screenshot({path:artifacts+'/'+name+'-audience-'+theme+'-'+width+'.png',fullPage:true});
     }
    }
    // Maximum server caption remains readable/reachable, never silently clipped at the largest preset.
    await post('claim',{owner:session.owner}).then(r=>Object.assign(session,r.body));
    const maximum=(caption+' ').repeat(16).slice(0,3000);
    await post('state',{...session,mode:'live',phase:'stopped',active:false,status:'Interne leestest',dutch:maximum,arabic:''});await post('release',session);
    await audience.waitForFunction(text=>document.querySelector('#audience-dutch').textContent===text,maximum);
    for(const width of [390,1280,1920]){
     await audience.setViewportSize({width,height:900});
     assert.equal(await audience.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
     assert.equal(await audience.locator('#audience-dutch').evaluate(e=>e.scrollHeight>e.clientHeight+1),false);
    }
    for(const width of [390,1280,1920]){
     await operator.setViewportSize({width,height:900});assert.equal(await operator.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
     if(width===390)assert.ok(await operator.locator('#audience-theme').evaluate(e=>e.clientWidth>=250),'Mobile contrast choice is too narrow to read');
     await operator.screenshot({path:artifacts+'/'+name+'-operator-presentation-'+width+'.png',fullPage:true});
    }
    const fullscreen=audience.getByRole('button',{name:'Volledig scherm',exact:true});
    assert.equal(await fullscreen.count(),1,'Explicit fullscreen control is missing');
    await audience.evaluate(()=>Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:undefined}));
    await fullscreen.focus();await audience.keyboard.press('Enter');
    await audience.waitForFunction(()=>document.querySelector('#fullscreen-status').textContent.includes('ondersteunt'));
    assert.equal(await audience.evaluate(()=>Boolean(document.fullscreenElement)),false);
    await audience.evaluate(()=>Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:()=>Promise.reject(Error('denied'))}));
    await fullscreen.click();await audience.waitForFunction(()=>document.querySelector('#fullscreen-status').textContent.includes('niet gelukt'));
    assert.equal(await fullscreen.textContent(),'Volledig scherm');
    await audience.reload();await audience.waitForFunction(()=>document.querySelector('#fullscreen'));
    if(await audience.evaluate(()=>document.fullscreenEnabled)){
     await audience.locator('#fullscreen').click();await audience.waitForFunction(()=>Boolean(document.fullscreenElement));
     assert.equal(await audience.locator('#fullscreen').textContent(),'Volledig scherm verlaten');
     await audience.locator('#fullscreen').click();await audience.waitForFunction(()=>!document.fullscreenElement);
    }
    checks.push(name+': fullscreen keyboard, unsupported, rejection and actual enter/exit where supported');
    micCalls+=await operator.evaluate(()=>window.__micCalls||0)+await audience.evaluate(()=>window.__micCalls||0);
    checks.push(name+': lease rejection; 3 sizes × 2 themes × 3 widths, complete captions and no horizontal overflow');
   }finally{await browser.close();}
  }
  assert.equal(providerCalls,0);assert.equal(micCalls,0);assert.deepEqual(errors,[]);
  const report={passed:true,checks,providerCalls,microphoneCalls:micCalls,internalSimulatedCaptions:true,liveSpeech:false,errors};
  fs.writeFileSync(artifacts+'/presentation-browser-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{app.closeAllConnections();await new Promise(r=>app.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
