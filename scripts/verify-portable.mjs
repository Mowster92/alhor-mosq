import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readCandidate} from '../apps/vrijdagpreek/candidate.mjs';
export const appFiles=['Inter-OFL.txt','InterVariable.woff2','alhor-p1.svg','app.js','candidate.mjs','display.html','display.js','feedback-store.mjs','feedback.js','index.html','live.js','module-store.mjs','mosque-home.js','mosque.html','operator.js','package-lock.json','package.json','server.mjs','styles.css'];
export const releaseFiles=['START-MOSQUE.cmd','README.md','dev/vrijdagpreek/ONBOARDING.md','dev/vrijdagpreek/start-mosque.ps1','dev/vrijdagpreek/windows-app.ps1','dev/vrijdagpreek/windows-child.mjs','scripts/verify-portable.mjs',...appFiles.map(p=>'apps/vrijdagpreek/'+p),'apps/vrijdagpreek/candidate.json'].sort();
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyPortable(root){
 const receipt=JSON.parse(readFileSync(resolve(root,'portable-release.json'),'utf8'));
 if(receipt.schema!=='alhor-mosque-portable/v1'||!/^[a-f0-9]{40}$/.test(receipt.commit)||JSON.stringify(Object.keys(receipt.files).sort())!==JSON.stringify(releaseFiles))throw Error('Portable bronlijst ongeldig. Pak de originele ZIP opnieuw uit.');
 for(const name of releaseFiles)if(sha(readFileSync(resolve(root,name)))!==receipt.files[name])throw Error('Portable bron gewijzigd: '+name+'. Pak de originele ZIP opnieuw uit.');
 const candidate=readCandidate(resolve(root,'apps/vrijdagpreek'));
 if(candidate.state!=='identified')throw Error('Portable bronidentiteit ongeldig.');
 return candidate;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(verifyPortable(resolve(fileURLToPath(new URL('../',import.meta.url))))));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
