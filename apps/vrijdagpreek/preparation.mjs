import {readFile,mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

export function normalizePreparation(value){
 if(!value||typeof value.title!=='string'||!value.title.trim()||value.title.trim().length>100
  ||!Array.isArray(value.lines)||value.lines.length<1||value.lines.length>10)
  throw Error('Geef een titel en 1–10 tekstparen.');
 const lines=value.lines.map(line=>{
  if(!line||typeof line.arabic!=='string'||typeof line.dutch!=='string'||!line.dutch.trim()
   ||line.arabic.length>600||line.dutch.length>600)throw Error('Vul Nederlands in; maximaal 600 tekens per taal.');
  return {arabic:line.arabic.trim(),dutch:line.dutch.trim()};
 });
 return {title:value.title.trim(),lines};
}
export async function loadPreparation(file){
 try{return normalizePreparation(JSON.parse(await readFile(file,'utf8')));}
 catch(error){if(error.code==='ENOENT')return {title:'Nieuwe voorbereiding',lines:[]};throw error;}
}
export async function savePreparation(file,value,canCommit=()=>true){
 const deck=normalizePreparation(value),temp=file+'.'+randomUUID()+'.tmp';
 await mkdir(dirname(file),{recursive:true});
 try{
  await writeFile(temp,JSON.stringify(deck,null,2)+'\n',{flag:'wx'});
  if(!canCommit()){const error=Error('Sessie verlopen. Voorbereiding niet vervangen.');error.code='STALE_PREPARATION';throw error;}
  await rename(temp,file);
 }
 finally{await unlink(temp).catch(()=>{});}
 return deck;
}

const LIBRARY_SCHEMA='vrijdagpreek-preparations/v1';
const MAX_PREPARATIONS=20;
const libraryFile=file=>join(dirname(file),'preparations.json');
const revision=deck=>createHash('sha256').update(JSON.stringify(deck)).digest('hex');

function normalizeLibrary(value){
 if(!value||value.schema!==LIBRARY_SCHEMA||!Array.isArray(value.preparations)
   ||value.preparations.length>MAX_PREPARATIONS)throw Error('Bewaarde voorbereidingen zijn niet leesbaar.');
 const ids=new Set();
 const preparations=value.preparations.map(item=>{
  if(!item||typeof item.id!=='string'||!(item.id==='legacy'||/^[a-f0-9-]{36}$/.test(item.id))
    ||ids.has(item.id))throw Error('Bewaarde voorbereidingen zijn niet leesbaar.');
  ids.add(item.id);
  const deck=normalizePreparation(item);
  return {id:item.id,...deck,revision:revision(deck)};
 });
 if(value.selectedId!==null && !ids.has(value.selectedId))throw Error('Bewaarde voorbereiding ontbreekt.');
 return {selectedId:value.selectedId,preparations};
}

export async function loadPreparationLibrary(file){
 try{return normalizeLibrary(JSON.parse(await readFile(libraryFile(file),'utf8')));}
 catch(error){if(error.code!=='ENOENT')throw error;}
 try{
  const legacy=normalizePreparation(JSON.parse(await readFile(file,'utf8')));
  return {selectedId:'legacy',preparations:[{id:'legacy',...legacy,revision:revision(legacy)}]};
 }catch(error){if(error.code==='ENOENT')return {selectedId:null,preparations:[]};throw error;}
}

export async function saveLibraryPreparation(file,value,{id=null,create=false,expectedRevision=null,canCommit=()=>true}={}){
 const deck=normalizePreparation(value);
 const current=await loadPreparationLibrary(file);
 const preparations=current.preparations.map(item=>({...item}));
 if(create&&id)throw Error('Kies een bestaande of een nieuwe voorbereiding.');
 let selectedId=id||current.selectedId;
 if(create||(!selectedId&&!preparations.length)){
  if(preparations.length>=MAX_PREPARATIONS)throw Error('Maximaal 20 voorbereidingen.');
  selectedId=randomUUID();
  preparations.push({id:selectedId,...deck,revision:revision(deck)});
 }else{
  const index=preparations.findIndex(item=>item.id===selectedId);
  if(index<0)throw Error('Deze voorbereiding bestaat niet meer. Kies opnieuw.');
  if(preparations[index].revision!==expectedRevision){
   const error=Error('Deze voorbereiding is elders gewijzigd. Herlaad om de nieuwe tekst te zien.');
   error.code='STALE_CONTENT';throw error;
  }
  preparations[index]={id:selectedId,...deck,revision:revision(deck)};
 }
 const next={schema:LIBRARY_SCHEMA,selectedId,preparations};
 const destination=libraryFile(file),temp=destination+'.'+randomUUID()+'.tmp';
 await mkdir(dirname(destination),{recursive:true});
 try{
  await writeFile(temp,JSON.stringify(next,null,2)+'\n',{flag:'wx'});
  if(!canCommit()){const error=Error('Sessie verlopen. Voorbereiding niet vervangen.');error.code='STALE_PREPARATION';throw error;}
  await rename(temp,destination);
 }finally{await unlink(temp).catch(()=>{});}
 return {selectedId,preparations,preparation:deck};
}
