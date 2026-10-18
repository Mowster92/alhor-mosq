// Disposable UI regression: simulated speech SDK, no Azure or physical microphone.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const artifacts=process.env.ARTIFACTS_DIR||'/artifacts';
const source=process.env.APP_SOURCE||'/source/apps/vrijdagpreek';
const sdkFixture=`window.SpeechSDK={
 ResultReason:{TranslatingSpeech:1,TranslatedSpeech:2,NoMatch:3},
 CancellationErrorCode:{AuthenticationFailure:1,TooManyRequests:2,ServiceTimeout:3,ServiceUnavailable:4},
 Recognizer:{enableTelemetry(){}},SpeechTranslationConfig:{fromAuthorizationToken(){return {addTargetLanguage(){}}}},
 AudioConfig:{fromStreamInput(){return {setProperty(){},close(){}}}},
 TranslationRecognizer:class{constructor(){window.__qaRecognizer=this;}startContinuousRecognitionAsync(ok){ok();this.timer=setTimeout(()=>this.sessionStarted?.(),20);}close(){clearTimeout(this.timer);}}
};`;
let browser,server;
(async()=>{
 fs.mkdirSync(artifacts,{recursive:true});
 const {createApp}=await import(pathToFileURL(path.join(source,'server.mjs')));
 let deny=false,tokenCalls=0;
 server=createApp({env:{AZURE_SPEECH_REGION:'northeurope',AZURE_SPEECH_KEY:'synthetic-ui-fixture'},fetcher:async()=>{tokenCalls++;return new Response(deny?'':'synthetic-short-lived-token',{status:deny?401:200});}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1000,height:800}}),page=await context.newPage();
 const errors=[],checks=[];let externalRequests=0;
 await context.route('**/*',route=>{
  const url=route.request().url();if(url===base+'/sdk.js')return route.fulfill({contentType:'text/javascript',body:sdkFixture});
  if(url.startsWith(base+'/'))return route.continue();externalRequests++;return route.abort();
 });
 page.on('pageerror',()=>errors.push('Unhandled operator browser error'));
 const capture=async(name,target=page)=>target.screenshot({path:path.join(artifacts,name+'.png'),fullPage:true});
 await page.goto(base+'/?portal=docker');await page.waitForFunction(()=>document.querySelector('#azure-state')?.textContent.includes('Azure ingesteld'));
 if(await page.locator('.platform-return').getAttribute('href')!=='http://127.0.0.1:18080/app/operating/?return=vrijdagpreek')throw Error('Docker Portal return changed');
 await capture('operator-idle-1000');
 await page.locator('#open-display').focus();await capture('operator-focus-1000');
 await page.locator('.technical').evaluate(element=>element.open=true);await capture('operator-details-1000');await page.locator('.technical').evaluate(element=>element.open=false);
 await page.locator('#list-mics').click();await page.waitForFunction(()=>document.querySelector('#device').options.length>0);
 await page.locator('#test-mic').click();await page.waitForFunction(()=>!document.querySelector('#meter-panel').hidden);await page.locator('#stop').click();
 if(tokenCalls!==0)throw Error('Local microphone test requested a cloud token');checks.push('Local meter does not request a token');
 const popup=page.waitForEvent('popup');await page.locator('#open-display').click();const audience=await popup;await audience.waitForLoadState();await audience.setViewportSize({width:1280,height:720});
 await page.locator('#consent').check();await page.locator('#live-start').click();await page.waitForFunction(()=>document.querySelector('#connection').dataset.phase==='listening');await capture('operator-listening-1000');
 const emit=async(dutch,partial=false)=>page.evaluate(({dutch,partial})=>window.__qaRecognizer[partial?'recognizing':'recognized'](null,{result:{reason:partial?1:2,text:'نص عربي للاختبار',translations:new Map([['nl',dutch]])}}),{dutch,partial});
 await emit('Vandaag spreken we over',true);await page.waitForFunction(()=>document.querySelector('#caption-kind').textContent==='Wordt aangevuld');await capture('operator-partial-1000');
 const caption='Vandaag spreken we over elkaar helpen, goed luisteren en respect voor onze buren. Ook een klein gebaar kan voor iemand veel betekenen. Laten we daar deze week samen aandacht aan geven.';
 await emit(caption);await page.waitForFunction(()=>document.querySelector('#caption-kind').textContent==='Ontvangen');await audience.waitForFunction(()=>document.querySelector('#audience-dutch').textContent.includes('onze buren'));
 await capture('operator-caption-1000');await capture('audience-caption-1280',audience);
 if(await audience.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2))errors.push('Long audience caption requires scrolling at 1280x720');
 if(await audience.locator('#audience-dutch').evaluate(element=>parseFloat(getComputedStyle(element).fontSize)<36))errors.push('Long audience caption is too small to read');
 checks.push('Partial/final text reaches operator and audience');
 await page.locator('#stop').click();await page.waitForFunction(()=>!document.querySelector('#live-start').disabled);
 await page.locator('#live-start').click();await page.waitForFunction(()=>document.querySelector('#connection').dataset.phase==='listening');await emit('Een nieuwe sessie werkt.');
 await page.waitForFunction(()=>document.querySelector('#dutch').textContent==='Een nieuwe sessie werkt.');await page.locator('#stop').click();
 await page.locator('#clear').click();await audience.waitForFunction(()=>document.querySelector('#audience-dutch').textContent==='Wachten op de vertaling…');checks.push('Stop, restart and Clear reach audience');
 deny=true;await page.locator('#live-start').click();await page.waitForFunction(()=>!document.querySelector('#error-panel').hidden);await page.waitForTimeout(1500);
 if(await page.locator('#error-code').textContent()!=='AZURE_AUTH_FAILED')throw Error('Failure category did not remain visible');await capture('operator-error-1000');checks.push('Failure stays visible with safe code');
 for(const width of [390,1000]){
  await page.setViewportSize({width,height:width===390?844:800});await capture('operator-error-'+width);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))errors.push('Horizontal overflow at '+width);
 }
 if(externalRequests)errors.push('UI requested an external asset or service');
 const report={passed:!errors.length,checks,errors,tokenCalls,externalRequests,provider:'simulated',physicalMicrophone:false,azureAudio:false};
 fs.writeFileSync(path.join(artifacts,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(errors.length)process.exitCode=1;
})().catch(error=>{console.error(JSON.stringify({passed:false,error:error.message}));process.exitCode=1;}).finally(async()=>{await browser?.close();server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));});
