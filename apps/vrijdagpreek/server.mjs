import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readCandidate } from './candidate.mjs';
import {loadPreparationLibrary,saveLibraryPreparation} from './preparation.mjs';

export const REGIONS = ['westeurope', 'northeurope', 'eastus', 'westus', 'eastus2', 'westus2', 'uksouth', 'francecentral', 'germanywestcentral', 'swedencentral'];
const root = new URL('./', import.meta.url);
const files = new Map(['index.html','display.html','app.js','live.js','display.js','styles.css','example-context.js'].map(x => ['/'+x,x]));
files.set('/', 'index.html');
files.set('/sdk.js','node_modules/microsoft-cognitiveservices-speech-sdk/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js');
files.set('/speech-processor.js','node_modules/microsoft-cognitiveservices-speech-sdk/distrib/browser/speech-processor.js');
export function createApp({env = process.env, fetcher = fetch, candidateRoot, preparationFile = fileURLToPath(new URL('data/preparation.json',root))} = {}) {
  const bootCandidate = readCandidate(candidateRoot);
  const csrf = randomBytes(32).toString('hex');
  const clients = new Set();
  let state = {dutch:'Klaar om te beginnen.',arabic:'',mode:'demo',status:'Gereed',active:false};
  let owner = null, seen = 0, generation = 0;
  let preparationWrites=Promise.resolve();
  const region = env.AZURE_SPEECH_REGION || 'westeurope';
  const configured = Boolean(env.AZURE_SPEECH_KEY && REGIONS.includes(region));
  const broadcast = () => { for (const res of clients) res.write(`data: ${JSON.stringify(state)}\n\n`); };
  const watchdog = setInterval(() => {
    if (owner && Date.now()-seen > 15000) { owner=null; generation++; state={...state, active:false,status:'Operatorverbinding verloren — gestopt'}; broadcast(); }
    for (const res of clients) res.write(': heartbeat\n\n');
  }, 3000);
  watchdog.unref();
  const server = http.createServer(async (req,res) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const reply = (code,data) => { res.writeHead(code,{'Content-Type':'application/json'}); res.end(JSON.stringify(data)); };
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://*.speech.microsoft.com wss://*.speech.microsoft.com; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    const path = req.url?.split('?')[0];
    // A clicked ALHOR page entry is navigation, never permission to use the API.
    const platformPageEntry = req.method === 'GET' && ['/', '/index.html', '/display.html'].includes(path)
      && req.headers['sec-fetch-site'] === 'same-site'
      && req.headers['sec-fetch-mode'] === 'navigate'
      && req.headers['sec-fetch-dest'] === 'document'
      && req.headers['sec-fetch-user'] === '?1'
      && req.headers.referer === 'http://127.0.0.1:19818/';
    if (req.headers.host !== `127.0.0.1:${server.address().port}`
      || (req.headers.origin && req.headers.origin !== origin)
      || (['cross-site','same-site'].includes(req.headers['sec-fetch-site']) && !platformPageEntry))
      return reply(403,{error:'Gebruik het lokale 127.0.0.1-adres.'});
    try {
      if (req.method === 'GET' && path === '/api/identity') {
        const current = readCandidate(candidateRoot);
        const identified = bootCandidate.state === 'identified' && current.state === 'identified'
          && current.version === bootCandidate.version && current.source_digest === bootCandidate.source_digest;
        if (identified) {
          res.setHeader('X-ALHOR-App','vrijdagpreek');
          res.setHeader('X-ALHOR-Candidate',bootCandidate.version);
          res.setHeader('X-ALHOR-Source-Digest',bootCandidate.source_digest);
        }
        return reply(200,identified ? bootCandidate : {
          schema:'alhor-app-candidate/v1',app_key:'vrijdagpreek',state:'unknown',version:null,source_digest:null});
      }
      if (req.method === 'GET' && path === '/api/events') {
        res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});
        clients.add(res); res.write(`data: ${JSON.stringify(state)}\n\n`);
        req.on('close',()=>clients.delete(res)); return;
      }
      if (req.method === 'POST' && path === '/api/bootstrap') {
        if (req.headers.origin !== origin || req.headers['x-local-app'] !== '1') return reply(403,{error:'Ongeldige lokale aanvraag.'});
        const library=await loadPreparationLibrary(preparationFile);
        const selected=library.preparations.find(item=>item.id===library.selectedId);
        return reply(200,{csrf,configured,region:REGIONS.includes(region)?region:null,
          preparation:selected?{title:selected.title,lines:selected.lines}:{title:'Nieuwe voorbereiding',lines:[]},
          selectedId:library.selectedId,preparations:library.preparations});
      }
      if (path?.startsWith('/api/') && req.method === 'POST') {
        if (req.headers.origin !== origin || req.headers['x-app-token'] !== csrf || req.headers['content-type'] !== 'application/json') return reply(403,{error:'Ongeldige operatoraanvraag.'});
        const chunks=[];let size=0;const limit=path==='/api/preparation'?64000:16000;
        for await(const chunk of req){size+=chunk.length;if(size>limit)return reply(413,{error:'Te groot.'});chunks.push(chunk);}
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (typeof data.owner !== 'string' || data.owner.length > 80) return reply(400,{error:'Operator ontbreekt.'});
        if (owner && owner !== data.owner) return reply(409,{error:'Een andere operator is actief. Stop daar of wacht 15 seconden na sluiten.'});
        if (path === '/api/claim') { owner=data.owner; seen=Date.now(); generation++; return reply(200,{generation}); }
        if (owner !== data.owner || data.generation !== generation) return reply(409,{error:'Sessie verlopen. Start opnieuw.'});
        seen=Date.now();
        if (path === '/api/heartbeat') return reply(200,{ok:true});
        if (path === '/api/preparation') {
          const commit=preparationWrites.catch(()=>{}).then(()=>saveLibraryPreparation(preparationFile,data.preparation,{
            id:data.preparationId,create:data.create===true,expectedRevision:data.expectedRevision,
            canCommit:()=>owner===data.owner&&generation===data.generation}));
          preparationWrites=commit;
          try { return reply(200,await commit); }
          catch(error) { const stale=['STALE_PREPARATION','STALE_CONTENT'].includes(error.code);
            return reply(stale?409:400,{error:stale?error.message:error.code?'Voorbereiding niet opgeslagen. Controleer lokale opslag; je invoer blijft staan.':error.message}); }
        }
        if (path === '/api/state') {
          if (typeof data.dutch !== 'string' || typeof data.arabic !== 'string' || typeof data.status !== 'string' || !['demo','prepared','live','test'].includes(data.mode) || typeof data.active !== 'boolean') return reply(400,{error:'Ongeldige ondertitel.'});
          state = {dutch:data.dutch.slice(0,3000),arabic:data.arabic.slice(0,3000),status:data.status.slice(0,180),mode:data.mode,active:data.active}; broadcast(); return reply(200,{ok:true});
        }
        if (path === '/api/release') { owner=null; generation++; state={...state,active:false,status:'Gestopt'}; broadcast(); return reply(200,{ok:true}); }
        if (path === '/api/token') {
          if (!configured || data.consent !== true) return reply(400,{error:'Azure niet ingesteld of toestemming ontbreekt.'});
          const response = await fetcher(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':env.AZURE_SPEECH_KEY},signal:AbortSignal.timeout(10000),redirect:'error'});
          if (!response.ok) return reply(502,{error:'Azure-aanmelding mislukt. Controleer sleutel, regio, netwerk en quota.'});
          const token = await response.text();
          if (owner !== data.owner || data.generation !== generation) return reply(409,{error:'Sessie gestopt.'});
          return reply(200,{token,region});
        }
        return reply(404,{error:'Onbekend API-pad.'});
      }
      if (req.method !== 'GET' || !files.has(path)) return reply(404,{error:'Niet gevonden.'});
      const filename=files.get(path);
      const mime=filename.endsWith('.html')?'text/html; charset=utf-8':filename.endsWith('.css')?'text/css':'text/javascript';
      const bytes=await readFile(new URL(filename,root)); res.writeHead(200,{'Content-Type':mime}); res.end(bytes);
    } catch { if (!res.headersSent) reply(500,{error:'Lokale aanvraag mislukt. Controleer installatie/configuratie.'}); else res.end(); }
  });
  server.on('close',()=>clearInterval(watchdog));
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server=createApp();
  server.on('error',()=>{ console.error('Start mislukt: poort 8080 bezet of toegang geweigerd. Sluit de andere app en probeer opnieuw.'); process.exitCode=1; });
  server.listen(8080,'127.0.0.1',()=>console.log('Open http://127.0.0.1:8080 — Ctrl+C stopt de server. Geen cloudverbinding tot expliciete live-start.'));
}
