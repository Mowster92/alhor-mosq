// Restore only known, paused fixtures inside the app. No live/private text or auto-start.
export function pausedExample(snapshot,lines){
 if(!snapshot || snapshot.mode!=='demo' || snapshot.active!==false)return null;
 const line=lines.find(line=>line.arabic===snapshot.arabic && line.dutch===snapshot.dutch);
 return line?{arabic:line.arabic,dutch:line.dutch}:null;
}
