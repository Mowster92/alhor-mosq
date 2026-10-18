import {mkdir,readFile,rename,unlink,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const defaultFeedbackFile=join(dirname(fileURLToPath(import.meta.url)),'data','feedback.json');

export class FeedbackStore{
  constructor(file=defaultFeedbackFile){this.file=file;this.queue=Promise.resolve();}

  async all(){
    let bytes;
    try{bytes=await readFile(this.file,'utf8');}
    catch(error){if(error.code==='ENOENT')return [];throw error;}
    const data=JSON.parse(bytes);
    if(data?.version!==1||!Array.isArray(data.reports))throw new Error('Invalid feedback store');
    return data.reports;
  }

  async get(id){return (await this.all()).find(item=>item.id===id)||null;}

  save(submissionKey,body){
    const result=this.queue.then(async()=>{
      const reports=await this.all();
      const existing=reports.find(item=>item.submissionKey===submissionKey);
      if(existing)return existing;
      if(reports.length>=500){const error=new Error('Feedback store full');error.code='FEEDBACK_FULL';throw error;}
      const item={id:randomUUID(),submissionKey,body,createdAt:new Date().toISOString()};
      const folder=dirname(this.file),temporary=join(folder,`feedback-${randomUUID()}.tmp`);
      await mkdir(folder,{recursive:true});
      try{
        await writeFile(temporary,JSON.stringify({version:1,reports:[...reports,item]})+'\n',{flag:'wx',mode:0o600});
        await rename(temporary,this.file);
      }finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
      return item;
    });
    this.queue=result.catch(()=>{});
    return result;
  }
}
