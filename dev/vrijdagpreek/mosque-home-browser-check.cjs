// Isolated real-browser check. No canonical runtime, microphone, provider or client data.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
(async()=>{
 const {createApp}=await import(pathToFileURL(path.resolve(__dirname,'../../apps/vrijdagpreek/server.mjs')));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mosque-home-browser-'));
 const artifacts=process.env.ARTIFACTS_DIR||dir;fs.mkdirSync(artifacts,{recursive:true});
 const file=path.join(dir,'modules.json'),server=createApp({env:{ALHOR_MODULES_FILE:file},fetcher:()=>{throw Error('Provider forbidden');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  const requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{const url=route.request().url();requests.push(new URL(url).pathname);if(!url.startsWith(base+'/'))throw Error('External request forbidden');return route.continue();});
  const ready=()=>page.waitForFunction(()=>!document.getElementById('module-fields').disabled);
  const save=async()=>{await page.getByRole('button',{name:'Keuzes opslaan',exact:true}).click();await page.waitForFunction(()=>document.getElementById('module-settings-status').textContent.startsWith('Opgeslagen'));};
  await page.goto(base+'/mosque?portal=local');await ready();
  assert.equal(fs.existsSync(file),false);assert.equal(requests.includes('/api/bootstrap'),false);
  await page.screenshot({path:path.join(artifacts,'mosque-home-desktop.png'),fullPage:true});
  await page.locator('#module-favourite').check();assert.equal(fs.existsSync(file),false);
  await page.getByRole('button',{name:'Wijzigingen annuleren'}).click();assert.equal(await page.locator('#module-favourite').isChecked(),false);
  await page.locator('#module-favourite').check();await save();assert.equal(await page.locator('#favourite-badge').isVisible(),true);
  await page.reload();await ready();assert.equal(await page.locator('#module-favourite').isChecked(),true);
  await page.locator('#module-visible').uncheck();await save();assert.equal(await page.locator('#modules-empty').isVisible(),true);
  await page.reload();await ready();assert.equal(await page.locator('#vrijdagpreek-card').isVisible(),false);
  await page.locator('#module-visible').check();await save();
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);
   await page.screenshot({path:path.join(artifacts,`mosque-home-mobile-${width}.png`),fullPage:true});
  }
  // Save failure keeps the draft and existing saved presentation, then retry succeeds.
  await page.route('**/api/modules',route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:'{}'}):route.continue());
  await page.locator('#module-visible').uncheck();await page.getByRole('button',{name:'Keuzes opslaan',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('module-settings-status').textContent.startsWith('Opslaan niet bevestigd'));
  assert.equal(await page.locator('#module-visible').isChecked(),false);assert.equal(await page.locator('#vrijdagpreek-card').isVisible(),true);
  await page.unroute('**/api/modules');await save();await page.locator('#module-visible').check();await save();
  for(const contextName of ['local','docker','standalone']){
   await page.goto(base+'/mosque?portal='+contextName);await ready();await page.locator('.module-open').click();
   await page.waitForURL(base+'/?portal='+contextName);
   assert.equal(await page.locator('.mosque-return').getAttribute('href'),'/mosque?portal='+contextName);
   await page.locator('.mosque-return').click();await ready();
  }
  const popup=page.waitForEvent('popup');await page.locator('.audience-open').click();const audience=await popup;await audience.waitForLoadState();assert.equal(new URL(audience.url()).pathname,'/display.html');await audience.close();
  assert.equal(errors.length,0,errors.join('\n'));
  for(const forbidden of ['/api/claim','/api/token','/api/state','/api/release'])assert.equal(requests.includes(forbidden),false,forbidden);
  console.log(JSON.stringify({result:'PASS',checks:['desktop 1440','mobile 390 and 320 no overflow','cancel no write','favourite reload','hide and restore','save failure retains draft and retry','local/docker/standalone operator roundtrip','audience popup','no speech lifecycle calls','no browser errors'],artifacts},null,2));
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
