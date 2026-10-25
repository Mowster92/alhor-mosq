// Maintainer-only: read explicit Git objects, never copy the working tree or local state.
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {appFiles,releaseFiles,sha,verifyPortable} from './verify-portable.mjs';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
function git(args){const r=spawnSync('git',args,{cwd:root,maxBuffer:20*1024*1024});if(r.status!==0)throw Error('Git-bron niet leesbaar: '+args.join(' '));return r.stdout;}
try{
 const [checkpoint,output]=process.argv.slice(2);
 if(!checkpoint||!output)throw Error('Expliciete Git-checkpoint en uitvoerpad vereist: node scripts/build-portable.mjs <commit> <bestand.zip>');
 const commit=git(['rev-parse','--verify',checkpoint+'^{commit}']).toString().trim();
 const archive=resolve(output);
 if(!archive.endsWith('.zip')||existsSync(archive))throw Error('Kies een nieuwe .zip; bestaande bestanden worden niet overschreven.');
 const stage=archive+'.source',extracted=archive+'.verified';
 if(existsSync(stage)||existsSync(extracted))throw Error('Uitvoermap bestaat al; kies een nieuw uitvoerpad.');
 const tracked=new Set(git(['ls-tree','-r','--name-only',commit]).toString().trim().split('\n'));
 const contents=new Map();
 for(const name of releaseFiles.filter(n=>!n.endsWith('/candidate.json'))){
  if(!tracked.has(name))throw Error('Checkpoint mist '+name);
  const mode=git(['ls-tree',commit,'--',name]).toString();
  if(!mode.startsWith('100644 ')&&!mode.startsWith('100755 '))throw Error('Geen gewoon bronbestand: '+name);
  contents.set(name,git(['show',commit+':'+name]));
 }
 const manifest=Object.fromEntries(appFiles.slice().sort().map(n=>[n,sha(contents.get('apps/vrijdagpreek/'+n))]));
 const digest=sha(JSON.stringify(manifest));
 contents.set('apps/vrijdagpreek/candidate.json',Buffer.from(JSON.stringify({schema:'alhor-app-candidate/v1',app_key:'vrijdagpreek',version:'portable-'+commit.slice(0,12),source_kind:'git-checkpoint',base_commit:commit,source_digest:digest,source_manifest:manifest},null,2)+'\n'));
 const files=Object.fromEntries([...contents].sort(([a],[b])=>a.localeCompare(b)).map(([n,b])=>[n,sha(b)]));
 contents.set('portable-release.json',Buffer.from(JSON.stringify({schema:'alhor-mosque-portable/v1',commit,files},null,2)+'\n'));
 for(const [name,bytes] of contents){const dest=join(stage,name);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes,{flag:'wx'});}
 verifyPortable(stage);
 const command=`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:MOSQUE_STAGE,$env:MOSQUE_ZIP); [IO.Compression.ZipFile]::ExtractToDirectory($env:MOSQUE_ZIP,$env:MOSQUE_EXTRACT); $z=[IO.Compression.ZipFile]::OpenRead($env:MOSQUE_ZIP); try { @($z.Entries | ForEach-Object {$_.FullName.Replace('\\','/')}) | ConvertTo-Json -Compress } finally {$z.Dispose()}`;
 const r=spawnSync('pwsh',['-NoProfile','-Command',command],{encoding:'utf8',env:{...process.env,MOSQUE_STAGE:stage,MOSQUE_ZIP:archive,MOSQUE_EXTRACT:extracted}});
 if(r.status!==0)throw Error('ZIP-controle mislukt: '+r.stderr);
 const names=JSON.parse(r.stdout).sort(),expected=[...contents.keys()].sort();
 if(JSON.stringify(names)!==JSON.stringify(expected))throw Error('ZIP-bestandslijst wijkt af van exacte allowlist.');
 verifyPortable(extracted);
 console.log(JSON.stringify({archive,commit,count:names.length,verified:true,extracted},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
