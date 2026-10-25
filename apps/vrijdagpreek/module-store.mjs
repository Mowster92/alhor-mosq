import {mkdir,readFile,rename,unlink,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export function validModules(data){
  return data?.version===1&&Object.keys(data).sort().join(',')==='modules,version'
    &&data.modules&&Object.keys(data.modules).join(',')==='vrijdagpreek'
    &&data.modules.vrijdagpreek&&Object.keys(data.modules.vrijdagpreek).sort().join(',')==='favourite,visible'
    &&typeof data.modules.vrijdagpreek.visible==='boolean'&&typeof data.modules.vrijdagpreek.favourite==='boolean';
}
export class ModuleStore{
  constructor(file=join(dirname(fileURLToPath(import.meta.url)),'data','modules.json')){this.file=file;this.queue=Promise.resolve();}
  async get(){
    let bytes;
    try{bytes=await readFile(this.file,'utf8');}catch(error){if(error.code==='ENOENT')return {version:1,modules:{vrijdagpreek:{visible:true,favourite:false}}};throw error;}
    const data=JSON.parse(bytes);if(!validModules(data))throw new Error('Invalid module preferences');return data;
  }
  save(data){
    if(!validModules(data))throw new Error('Invalid module preferences');
    const bytes=JSON.stringify(data)+'\n';
    const result=this.queue.then(async()=>{
      // Refuse to overwrite damaged settings silently.
      await this.get();
      await mkdir(dirname(this.file),{recursive:true});
      const temporary=this.file+'.'+randomUUID()+'.tmp';
      try{await writeFile(temporary,bytes,{flag:'wx',mode:0o600});await rename(temporary,this.file);}
      finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
      return JSON.parse(bytes);
    });
    this.queue=result.catch(()=>{});return result;
  }
}
