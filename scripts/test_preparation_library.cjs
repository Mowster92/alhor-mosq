const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.resolve(__dirname,'../../../projects/alhor-portal/dev/node_modules/playwright'));

const appRoot=path.resolve(__dirname,'../apps/vrijdagpreek');
const proofDir=path.resolve(__dirname,'../results/preparation-library-20261012');

(async()=>{
 const {createApp}=await import(pathToFileURL(path.join(appRoot,'server.mjs')));
 const {savePreparation}=await import(pathToFileURL(path.join(appRoot,'preparation.mjs')));
 const browser=await chromium.launch();
 const checks=[];
 try{
  await fs.mkdir(proofDir,{recursive:true});
  for(const width of [1440,390]){
   const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mosque-library-browser-'));
   const file=path.join(dir,'preparation.json');
   const legacy={title:'Bewaarde preek',lines:[{arabic:'سلام',dutch:'Eerste tekst blijft bewaard.'}]};
   await savePreparation(file,legacy);
   const original=await fs.readFile(file,'utf8');
   const server=createApp({env:{},preparationFile:file});
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   const base=`http://127.0.0.1:${server.address().port}`;
   const context=await browser.newContext({viewport:{width,height:950}});
   const page=await context.newPage(),errors=[],providerCalls=[];
   page.on('pageerror',error=>errors.push(error.message));
   await context.route(/speech\.microsoft\.com|cognitive\.microsoft\.com|\/api\/token(?:\?|$)/,route=>{providerCalls.push(route.request().url());return route.abort();});
   await context.addInitScript(()=>{window.__mic=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__mic++;throw Error('Mic forbidden in QA');};});
   try{
    await page.goto(base+'/');await page.waitForLoadState('networkidle');
    await page.waitForFunction(()=>document.getElementById('azure-state').textContent.length>0);
    assert.equal(await page.getByLabel('Titel',{exact:true}).inputValue(),legacy.title);
    await page.getByRole('button',{name:'Nieuwe voorbereiding met voorbeeld',exact:true}).click();
    assert.equal(await page.getByLabel('Titel',{exact:true}).inputValue(),'Voorbeeldpreek: vrede en barmhartigheid');
    assert.equal(await page.getByLabel('Nederlands',{exact:true}).inputValue(),'Alle lof komt toe aan God, Heer van de werelden.');
    assert.equal((await fs.readFile(file,'utf8')),original,'loading an unsaved sample never changes the old sermon');
    await page.getByRole('button',{name:'Voorbereiding opslaan',exact:true}).click();
    await page.getByText('Opgeslagen op deze pc. Geen tekst naar ALHOR of cloud.',{exact:true}).waitFor();
    const savedSelect=page.getByLabel('Bewaarde voorbereidingen',{exact:true});
    assert.equal(await savedSelect.locator('option').count(),3,JSON.stringify({html:await savedSelect.evaluate(el=>el.outerHTML),errors}));
    await page.getByLabel('Titel',{exact:true}).fill('Niet-opgeslagen titel');
    page.once('dialog',dialog=>dialog.dismiss());
    await savedSelect.selectOption('legacy');
    assert.equal(await page.getByLabel('Titel',{exact:true}).inputValue(),'Niet-opgeslagen titel','cancel retains the unsaved editor');
    await page.getByLabel('Titel',{exact:true}).fill('Voorbeeldpreek: vrede en barmhartigheid');
    await page.getByRole('button',{name:'Voorbereiding opslaan',exact:true}).click();
    await page.getByText('Opgeslagen op deze pc. Geen tekst naar ALHOR of cloud.',{exact:true}).waitFor();
    const displayPromise=page.waitForEvent('popup');
    await page.getByRole('button',{name:'Open publiekscherm',exact:true}).click();
    const display=await displayPromise;
    await page.getByRole('button',{name:'Opslaan en presenteren',exact:true}).click();
    await display.waitForFunction(()=>document.getElementById('audience-dutch').textContent==='Alle lof komt toe aan God, Heer van de werelden.');
    await page.getByRole('button',{name:'Volgende',exact:true}).click();
    await display.waitForFunction(()=>document.getElementById('audience-dutch').textContent==='Vandaag komen we samen met rustige harten en goede intenties.');
    await page.getByRole('button',{name:'Stop / pauze alle audio',exact:true}).click();
    await savedSelect.selectOption('legacy');
    assert.equal(await page.getByLabel('Titel',{exact:true}).inputValue(),legacy.title);
    await page.getByRole('button',{name:'Opslaan en presenteren',exact:true}).click();
    await display.waitForFunction(()=>document.getElementById('audience-dutch').textContent=== 'Eerste tekst blijft bewaard.');
    await page.getByRole('button',{name:'Stop / pauze alle audio',exact:true}).click();
    await page.reload();await page.waitForLoadState('networkidle');
    await page.waitForFunction(()=>document.getElementById('azure-state').textContent.length>0);
    assert.equal(await page.getByLabel('Titel',{exact:true}).inputValue(),legacy.title);
    assert.equal(await page.getByLabel('Bewaarde voorbereidingen',{exact:true}).locator('option').count(),3);
    assert.equal(await page.getByRole('button',{name:'Start demo',exact:true}).isEnabled(),true);
    const library=JSON.parse(await fs.readFile(path.join(dir,'preparations.json'),'utf8'));
    assert.deepEqual(library.preparations.map(item=>item.title),[legacy.title,'Voorbeeldpreek: vrede en barmhartigheid']);
    await page.getByLabel('Bewaarde voorbereidingen',{exact:true}).selectOption(library.preparations[1].id);
    assert.equal(await page.getByLabel('Nederlands',{exact:true}).inputValue(),'Alle lof komt toe aan God, Heer van de werelden.');
    assert.equal(await fs.readFile(file,'utf8'),original);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.evaluate(()=>window.__mic),0);
    assert.deepEqual(errors,[]);assert.deepEqual(providerCalls,[]);
    await page.screenshot({path:path.join(proofDir,`operator-${width}.png`),fullPage:true});
    await display.screenshot({path:path.join(proofDir,`audience-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Nieuwe voorbereiding',exact:true}).click();
    await page.getByLabel('Titel',{exact:true}).fill('Onvolledige preek');
    await page.getByRole('button',{name:'Voorbereiding opslaan',exact:true}).click();
    assert.match(await page.locator('#preparation-progress').textContent(),/invoer blijft staan/);
    assert.equal(JSON.parse(await fs.readFile(path.join(dir,'preparations.json'),'utf8')).preparations.length,2);
    checks.push(`${width}px existing sermon retained; example created as second; chosen pair reaches audience; switch/reopen both; no mic/provider or overflow`);
   }finally{
    await context.close();
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    await fs.rm(dir,{recursive:true,force:true});
   }
  }
  await fs.writeFile(path.join(proofDir,'browser-proof.json'),JSON.stringify({passed:true,checks,isolated_data:true,microphone_calls:false,provider_calls:false},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
