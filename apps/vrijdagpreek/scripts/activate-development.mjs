import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,unlinkSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {readCandidate} from '../candidate.mjs';

const appRoot=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// Same app-source selection as operating_release.py; private/runtime files stay out.
const excluded=new Set(['private','results','node_modules','.venv','__pycache__','.git','.runtime','recovery','data','backups','exports','uploads','logs','staticfiles','docs','deploy','.superpowers','private-media']);
const privateSuffix=/\.(?:sqlite3?|db|pyc|log|key|pem|pfx|p12|wav|mp3|m4a|mp4|ogg|webm|flac|aac)$/i;

function selected(name){
  const parts=name.split('/'),base=parts.at(-1);
  return Boolean(name)&&name!=='candidate.json'&&!parts.some(part=>excluded.has(part)||part==='..'||(part.startsWith('.')&&part!=='.gitignore'))
    &&!base.startsWith('.env')&&!privateSuffix.test(base)&&(!base.endsWith('.md')||base==='README.md');
}
function git(run,root,args){
  const result=run('git',args,{cwd:root,encoding:'utf8'});
  if(result.error||result.status!==0)throw Error('De Git-bron is niet leesbaar; de bestaande app blijft ongewijzigd.');
  return result.stdout;
}
export function sourceManifest(root,run=spawnSync){
  const names=git(run,root,['ls-files','-co','--exclude-standard','-z','--','.']).split('\0');
  const canonicalRoot=realpathSync(root),manifest={};
  for(const name of [...new Set(names)].filter(selected).sort()){
    if(!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(name))throw Error('Een bronbestandsnaam past niet in de bestaande bronidentiteit.');
    const file=resolve(root,name);let stat;
    try{stat=lstatSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    if(!stat.isFile()||!realpathSync(file).startsWith(canonicalRoot+sep))throw Error('Een bronbestand valt buiten de eigen appmap.');
    manifest[name]=sha(readFileSync(file));
  }
  if(!manifest['server.mjs'])throw Error('De appbron mist server.mjs.');
  return manifest;
}

export function activateDevelopment({root=appRoot,run=spawnSync,log=console.log}={}){
  root=resolve(root);
  const candidateFile=resolve(root,'candidate.json'),manifest=sourceManifest(root,run),digest=sha(JSON.stringify(manifest));
  let previous;
  try{previous=JSON.parse(readFileSync(candidateFile,'utf8'));}catch{}
  const same=previous?.source_digest===digest;
  if(same&&readCandidate(root).state==='identified'){
    log(`Bron ongewijzigd: ${previous.version}.`);return {changed:false,candidate:previous};
  }
  const commit=git(run,root,['rev-parse','--verify','HEAD^{commit}']).trim();
  if(!/^[a-f0-9]{40}$/.test(commit))throw Error('De Git-basis is niet herkenbaar.');
  log('Gewijzigde ontwikkelbron controleren…');
  for(const args of [['test'],['run','check']]){
    const result=run(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
    if(result.error||result.status!==0)throw Error('De broncontrole slaagt niet; kandidaat en draaiende app blijven ongewijzigd.');
  }
  if(JSON.stringify(sourceManifest(root,run))!==JSON.stringify(manifest)
    ||git(run,root,['rev-parse','--verify','HEAD^{commit}']).trim()!==commit)
    throw Error('De bron veranderde tijdens de controle. Start opnieuw om die wijziging te controleren.');
  const candidate={schema:'alhor-app-candidate/v1',app_key:'vrijdagpreek',version:`dev-${digest.slice(0,12)}`,
    source_kind:'working-tree',base_commit:commit,source_digest:digest,source_manifest:manifest,prepared_at:new Date().toISOString()};
  const temporary=resolve(root,`.candidate-development-${process.pid}.tmp`);
  try{writeFileSync(temporary,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});renameSync(temporary,candidateFile);}
  finally{try{unlinkSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}}
  log(`Ontwikkelbron gecontroleerd: ${candidate.version}. Geen commit of herstart uitgevoerd.`);
  return {changed:true,candidate};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{activateDevelopment();}catch(error){console.error(error.message);process.exitCode=1;}
}
