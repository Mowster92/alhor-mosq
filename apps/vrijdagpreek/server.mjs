import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readCandidate} from './candidate.mjs';

export const REGIONS=['westeurope','northeurope','eastus','westus','eastus2','westus2','uksouth','francecentral','germanywestcentral','swedencentral'];
const root=new URL('./',import.meta.url);
const files=new Map(['index.html','display.html','app.js','operator.js','live.js','display.js','styles.css','alhor-p1.svg','InterVariable.woff2','Inter-OFL.txt'].map(name=>['/'+name,name]));
files.set('/','index.html');
files.set('/sdk.js','node_modules/microsoft-cognitiveservices-speech-sdk/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js');
files.set('/speech-processor.js','node_modules/microsoft-cognitiveservices-speech-sdk/distrib/browser/speech-processor.js');
const phases=new Set(['idle','starting','listening','translating','stopped','error']);
const runningPhases=new Set(['starting','listening','translating']);
const messages={
  INVALID_REQUEST:'Ongeldige lokale aanvraag.',
  OPERATOR_BUSY:'Een andere operator is actief. Stop daar of wacht tot de sessie verloopt.',
  SESSION_EXPIRED:'Sessie verlopen. Start opnieuw.',
  AZURE_NOT_CONFIGURED:'Azure Speech is niet ingesteld op deze pc.',
  CONSENT_REQUIRED:'Geef eerst toestemming voor audio naar Azure.',
  AZURE_AUTH_FAILED:'Azure weigert de aanmelding. Controleer sleutel en regio lokaal.',
  AZURE_QUOTA:'Azure heeft een limiet bereikt. Controleer quota en kosten voordat je opnieuw start.',
  AZURE_TIMEOUT:'Azure reageert niet op tijd. Audio is niet automatisch opnieuw gestart.',
  AZURE_UNAVAILABLE:'Azure is niet bereikbaar. Controleer netwerk en regio en start handmatig opnieuw.'
};

export function createApp({env=process.env,fetcher=fetch,candidateRoot,now=Date.now,timers=globalThis,leaseMs=15000}={}){
  const bootCandidate=readCandidate(candidateRoot),csrf=randomBytes(32).toString('hex'),clients=new Set();
  const portalPort=String(env.ALHOR_PORTAL_PORT||'18080');
  if(!/^\d+$/.test(portalPort)||Number(portalPort)<1||Number(portalPort)>65535)throw new Error('Ongeldige lokale Portal-poort.');
  const portalHome=`http://127.0.0.1:${Number(portalPort)}/`;
  const portalContexts={docker:'http://127.0.0.1:18080/',local:'http://127.0.0.1:18180/'};
  const portalEntries=['http://127.0.0.1:19818/',...Object.values(portalContexts),portalHome];
  let state={dutch:'',arabic:'',mode:'live',phase:'idle',status:'Gereed voor een live proef.',active:false,partial:false,errorCode:null};
  let owner=null,seen=0,generation=0;
  const region=env.AZURE_SPEECH_REGION||'westeurope';
  const configured=Boolean(env.AZURE_SPEECH_KEY&&REGIONS.includes(region));
  const broadcast=()=>{for(const res of clients)res.write(`data: ${JSON.stringify(state)}\n\n`);};
  const expire=()=>{
    if(owner&&now()-seen>leaseMs){
      owner=null;generation++;
      state={...state,active:false,phase:'error',partial:false,status:'Operatorverbinding verloren — gestopt',errorCode:'SESSION_EXPIRED'};
      broadcast();
    }
  };
  const watchdog=timers.setInterval(()=>{expire();for(const res of clients)res.write(': heartbeat\n\n');},3000);
  watchdog?.unref?.();
  const server=http.createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${server.address().port}`;
    const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    const error=(status,errorCode)=>reply(status,{error:messages[errorCode],errorCode});
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://*.speech.microsoft.com wss://*.speech.microsoft.com; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    const path=req.url?.split('?')[0];
    const platformPageEntry=req.method==='GET'&&['/','/index.html','/display.html'].includes(path)
      &&['same-site','cross-site'].includes(req.headers['sec-fetch-site'])
      &&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document'
      &&req.headers['sec-fetch-user']==='?1'
      &&portalEntries.includes(req.headers.referer);
    if(req.headers.host!==`127.0.0.1:${server.address().port}`||(req.headers.origin&&req.headers.origin!==origin)
      ||(['cross-site','same-site'].includes(req.headers['sec-fetch-site'])&&!platformPageEntry))
      return error(403,'INVALID_REQUEST');
    expire();
    try{
      if(req.method==='GET'&&path==='/api/identity'){
        const current=readCandidate(candidateRoot);
        const identified=bootCandidate.state==='identified'&&current.state==='identified'
          &&current.version===bootCandidate.version&&current.source_digest===bootCandidate.source_digest;
        if(identified){res.setHeader('X-ALHOR-App','vrijdagpreek');res.setHeader('X-ALHOR-Candidate',bootCandidate.version);res.setHeader('X-ALHOR-Source-Digest',bootCandidate.source_digest);}
        return reply(200,identified?bootCandidate:{schema:'alhor-app-candidate/v1',app_key:'vrijdagpreek',state:'unknown',version:null,source_digest:null});
      }
      if(req.method==='GET'&&path==='/api/events'){
        res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});
        clients.add(res);res.write(`data: ${JSON.stringify(state)}\n\n`);req.on('close',()=>clients.delete(res));return;
      }
      if(req.method==='POST'&&path==='/api/bootstrap'){
        if(req.headers.origin!==origin||req.headers['x-local-app']!=='1')return error(403,'INVALID_REQUEST');
        return reply(200,{csrf,configured,region:REGIONS.includes(region)?region:null});
      }
      if(path?.startsWith('/api/')&&req.method==='POST'){
        if(req.headers.origin!==origin||req.headers['x-app-token']!==csrf||req.headers['content-type']!=='application/json')return error(403,'INVALID_REQUEST');
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>16000)return error(413,'INVALID_REQUEST');chunks.push(chunk);}
        let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{return error(400,'INVALID_REQUEST');}
        if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.owner!=='string'||!data.owner||data.owner.length>80)return error(400,'INVALID_REQUEST');
        if(owner&&owner!==data.owner)return error(409,'OPERATOR_BUSY');
        if(path==='/api/claim'){owner=data.owner;seen=now();generation++;return reply(200,{generation});}
        if(owner!==data.owner||data.generation!==generation)return error(409,'SESSION_EXPIRED');
        seen=now();
        if(path==='/api/heartbeat')return reply(200,{ok:true});
        if(path==='/api/state'){
          const {dutch,arabic,status,phase,active}=data,partial=data.partial??false,errorCode=data.errorCode??null;
          if(typeof dutch!=='string'||typeof arabic!=='string'||typeof status!=='string'||data.mode!=='live'
            ||!phases.has(phase)||typeof active!=='boolean'||active!==runningPhases.has(phase)
            ||typeof partial!=='boolean'||(errorCode!==null&&(typeof errorCode!=='string'||!/^[A-Z][A-Z0-9_]{1,63}$/.test(errorCode))))
            return error(400,'INVALID_REQUEST');
          state={dutch:dutch.slice(0,3000),arabic:arabic.slice(0,3000),status:status.slice(0,180),mode:'live',phase,active,partial,errorCode};
          broadcast();return reply(200,{ok:true});
        }
        if(path==='/api/release'){
          owner=null;generation++;
          state=state.phase==='error'?{...state,active:false,partial:false}
            :{...state,active:false,phase:'stopped',partial:false,status:'Gestopt — laatste ondertitel blijft staan',errorCode:null};
          broadcast();return reply(200,{ok:true});
        }
        if(path==='/api/token'){
          if(!configured)return error(400,'AZURE_NOT_CONFIGURED');
          if(data.consent!==true)return error(400,'CONSENT_REQUIRED');
          let response;
          try{
            response=await fetcher(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':env.AZURE_SPEECH_KEY},signal:AbortSignal.timeout(10000),redirect:'error'});
          }catch(cause){return error(cause?.name==='TimeoutError'||cause?.name==='AbortError'?504:502,cause?.name==='TimeoutError'||cause?.name==='AbortError'?'AZURE_TIMEOUT':'AZURE_UNAVAILABLE');}
          if(response.status===401||response.status===403)return error(502,'AZURE_AUTH_FAILED');
          if(response.status===429)return error(503,'AZURE_QUOTA');
          if(!response.ok)return error(502,'AZURE_UNAVAILABLE');
          let token;
          try{token=await response.text();}
          catch(cause){return error(cause?.name==='TimeoutError'||cause?.name==='AbortError'?504:502,cause?.name==='TimeoutError'||cause?.name==='AbortError'?'AZURE_TIMEOUT':'AZURE_UNAVAILABLE');}
          expire();
          if(owner!==data.owner||data.generation!==generation)return error(409,'SESSION_EXPIRED');
          if(!token)return error(502,'AZURE_UNAVAILABLE');
          return reply(200,{token,region});
        }
        return reply(404,{error:'Onbekend API-pad.',errorCode:'INVALID_REQUEST'});
      }
      if(req.method!=='GET'||!files.has(path))return reply(404,{error:'Niet gevonden.',errorCode:'INVALID_REQUEST'});
      const filename=files.get(path),mime=filename.endsWith('.html')?'text/html; charset=utf-8'
        :filename.endsWith('.css')?'text/css':filename.endsWith('.svg')?'image/svg+xml'
        :filename.endsWith('.woff2')?'font/woff2':filename.endsWith('.txt')?'text/plain; charset=utf-8':'text/javascript';
      let bytes=await readFile(new URL(filename,root));
      if(filename==='index.html'){
        // Only named local entrances may select a return target; never accept a URL.
        const context=new URL(req.url,origin).searchParams.get('portal');
        const selectedHome=Object.hasOwn(portalContexts,context)?portalContexts[context]:null;
        const returnHome=selectedHome?`${selectedHome}app/operating/?return=vrijdagpreek`:(env.ALHOR_PORTAL_PORT?portalHome:null);
        if(returnHome)bytes=Buffer.from(bytes.toString('utf8').replace('class="platform-return" href="http://127.0.0.1:19818/"',`class="platform-return" href="${returnHome}"`));
        bytes=Buffer.from(bytes.toString('utf8').replace('class="improvement-link" href="http://127.0.0.1:18080/app/operating/feedback/new/?app=vrijdagpreek"',`class="improvement-link" href="${selectedHome||portalHome}app/operating/feedback/new/?app=vrijdagpreek"`));
      }
      res.writeHead(200,{'Content-Type':mime});res.end(bytes);
    }catch{if(!res.headersSent)error(500,'INVALID_REQUEST');else res.end();}
  });
  server.on('close',()=>timers.clearInterval(watchdog));
  return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const server=createApp();
  server.on('error',()=>{console.error('Start mislukt: poort 8080 bezet of toegang geweigerd.');process.exitCode=1;});
  const port=Number(process.env.PORT||8080),host=process.env.LISTEN_HOST||'127.0.0.1';
  server.listen(port,host,()=>console.log(`Open http://127.0.0.1:${port} — geen audio of cloud tot expliciete live-start.`));
}
