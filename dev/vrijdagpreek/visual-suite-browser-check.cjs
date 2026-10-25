// Isolated visual/readability regression: no microphone, speech SDK use or provider.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
(async()=>{
 const {createApp}=await import(pathToFileURL(path.resolve(__dirname,'../../apps/vrijdagpreek/server.mjs')));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mosque-visual-'));
 const artifacts=process.env.ARTIFACTS_DIR||dir;fs.mkdirSync(artifacts,{recursive:true});
 const modules=path.join(dir,'modules.json');
 const server=createApp({env:{ALHOR_MODULES_FILE:modules,ALHOR_FEEDBACK_FILE:path.join(dir,'feedback.json')},fetcher:()=>{throw Error('Provider forbidden');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const requests=[],errors=[];
  await context.route('**/*',route=>{const url=route.request().url();assert.ok(url.startsWith(base+'/'),'External request');requests.push(new URL(url).pathname);return route.continue();});
  context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
  const page=await context.newPage();
  await page.goto(base+'/?portal=standalone');
  await page.waitForFunction(()=>!document.querySelector('#apply-presentation').disabled);
  assert.equal(await page.locator('.caption-preview').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(247, 248, 246)');
  assert.ok(await page.locator('.caption-preview').evaluate(el=>el.getBoundingClientRect().top)<await page.locator('.presentation-panel').evaluate(el=>el.getBoundingClientRect().top));
  await page.screenshot({path:path.join(artifacts,'mosque-operator-desktop.png'),fullPage:true});
  const popup=page.waitForEvent('popup');await page.locator('#open-display').click();const audience=await popup;
  await audience.waitForLoadState();await audience.setViewportSize({width:1440,height:900});
  assert.equal(await audience.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await audience.locator('#audience-dutch').evaluate(el=>getComputedStyle(el).color),'rgb(17, 17, 17)');
  await audience.screenshot({path:path.join(artifacts,'mosque-audience-light.png'),fullPage:true});
  await page.locator('#audience-theme').selectOption('dark');await page.locator('#audience-size').selectOption('extra-large');await page.locator('#apply-presentation').click();
  await audience.waitForFunction(()=>document.body.dataset.theme==='dark'&&document.body.dataset.textSize==='extra-large');
  assert.equal(await audience.locator('#audience-dutch').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#audience-theme').value==='dark');
  await audience.screenshot({path:path.join(artifacts,'mosque-audience-dark.png'),fullPage:true});
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Operator overflow ${width}`);
   assert.ok(await page.evaluate(()=>{const a=document.querySelector('.brand-app').getBoundingClientRect(),b=document.querySelector('.standalone-context').getBoundingClientRect();return a.right<=b.left||a.bottom<=b.top;}),`Brand text overlaps ${width}`);
   await page.screenshot({path:path.join(artifacts,`mosque-operator-mobile-${width}.png`),fullPage:true});
  }
  assert.equal(fs.existsSync(modules),false,'Presentation must not write module choices');
  for(const forbidden of ['/api/claim','/api/heartbeat','/api/release','/api/token','/api/state'])assert.equal(requests.includes(forbidden),false,forbidden);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',checks:['operator desktop/mobile 390/320','caption-first reading/visual order','soft operator surface','audience light/dark high contrast','extra-large selection persists on operator reload','no module write','no speech lifecycle/provider calls','no browser errors'],artifacts},null,2));
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
