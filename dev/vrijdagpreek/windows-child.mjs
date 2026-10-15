// A short-lived Windows launcher. Only file paths and the child PID cross stdout.
// Azure configuration is inherited in memory; the long-lived server owns its log handles.
import {openSync,closeSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {spawn} from 'node:child_process';
const [server,outFile,errorFile]=process.argv.slice(2).map(value=>resolve(value));
if(!server||!outFile||!errorFile)throw new Error('Expected server and two log paths');
const out=openSync(outFile,'a'),error=openSync(errorFile,'a');
try {
  const child=spawn(process.execPath,[server],{
    cwd:dirname(server),env:process.env,detached:true,windowsHide:true,stdio:['ignore',out,error]
  });
  child.once('error',()=>{process.stderr.write('Local child start failed.\n');process.exitCode=1;});
  child.once('spawn',()=>{process.stdout.write(JSON.stringify({pid:child.pid})+'\n');child.unref();});
} finally {
  delete process.env.AZURE_SPEECH_KEY;
  closeSync(out);closeSync(error);
}
