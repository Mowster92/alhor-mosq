import {messageForCode} from './live.js';
const initial=()=>({mode:'live',phase:'idle',active:false,arabic:'',dutch:'',partial:false,errorCode:null,status:'Klaar om te starten'});

// Serialize ownership changes, while stopping audio immediately on every action.
export class OperatorSession {
  constructor({fetcher=(...args)=>fetch(...args),live,onChange=()=>{},timers=globalThis,ownerId=()=>crypto.randomUUID()}){
    Object.assign(this,{fetcher,live,onChange,timers,ownerId});
    this.state=initial();this.run=0;this.serial=Promise.resolve();this.writes=Promise.resolve();this.session=null;
  }
  update(change){Object.assign(this.state,change);this.onChange({...this.state});}
  async initialize(){
    try{const response=await this.fetcher('/api/bootstrap',{method:'POST',headers:{'X-Local-App':'1'},signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw Error();this.config=await response.json();this.csrf=this.config.csrf;this.update({});return this.config;
    }catch{this.update({phase:'error',errorCode:'LOCAL_CONNECTION',status:messageForCode('LOCAL_CONNECTION')});return null;}
  }
  async api(path,data,session){
    let response,body;
    try{response=await this.fetcher('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-App-Token':this.csrf},
      body:JSON.stringify({...data,owner:session.owner,generation:session.generation}),signal:AbortSignal.timeout(15000),keepalive:path==='release'});body=await response.json();}
    catch{throw Object.assign(Error('Local request failed'),{code:'LOCAL_CONNECTION'});}
    if(!response.ok)throw Object.assign(Error('Request refused'),{code:body.errorCode||(response.status===409?'SESSION_EXPIRED':'LOCAL_CONNECTION')});
    return body;
  }
  clearHeartbeat(){this.timers.clearInterval(this.heartbeat);}
  async release(session){await this.writes;if(session)await this.api('release',{},session).catch(()=>{});}
  publish(){
    const session=this.session,run=this.run,snapshot={...this.state};
    const work=this.writes.then(()=>run===this.run&&session===this.session?this.api('state',snapshot,session):null);
    this.writes=work.catch(error=>{if(run===this.run&&session===this.session)this.fail(error.code);});
    return work;
  }
  start(deviceId,language){
    const run=++this.run,previous=this.session;this.session=null;this.clearHeartbeat();this.live.stop();
    this.update({phase:'starting',active:true,errorCode:null,status:'Sessie starten…',arabic:'',dutch:'',partial:false});
    this.serial=this.serial.then(async()=>{
      await this.release(previous);if(run!==this.run)return;
      if(!this.config?.configured){this.fail('AZURE_NOT_CONFIGURED');return;}
      if(!deviceId){this.fail('MIC_NOT_SELECTED');return;}
      const session={owner:this.ownerId(),generation:null};
      const claim=await this.api('claim',{},session);session.generation=claim.generation;
      if(run!==this.run){await this.release(session);return;}
      this.session=session;
      this.heartbeat=this.timers.setInterval(()=>{
        this.api('heartbeat',{},session).catch(error=>{if(run===this.run&&session===this.session)this.fail(error.code);});
      },4000);
      await this.publish();if(run!==this.run)return;
      void this.live.start(deviceId,language);
    }).catch(error=>{if(run===this.run)this.fail(error.code||'LOCAL_CONNECTION');});
    return this.serial;
  }
  token(){
    if(!this.session)return Promise.reject(Object.assign(Error('No session'),{code:'SESSION_EXPIRED'}));
    return this.api('token',{consent:true},this.session);
  }
  onLiveEvent(event){
    if(!this.session)return;
    if(event.errorCode){this.fail(event.errorCode);return;}
    this.update(event);void this.publish().catch(()=>{});
  }
  stop(){
    this.run++;const previous=this.session;this.session=null;this.clearHeartbeat();this.live.stop();
    this.update({phase:'stopped',active:false,partial:false,status:'Vertaling gestopt'});
    this.serial=this.serial.then(()=>this.release(previous));return this.serial;
  }
  fail(code='LIVE_START_FAILED'){
    if(this.state.phase==='error'&&!this.session)return;
    this.run++;const previous=this.session;this.session=null;this.clearHeartbeat();this.live.stop();
    this.update({phase:'error',active:false,partial:false,errorCode:code,status:messageForCode(code)});
    const failure={...this.state};
    this.serial=this.serial.then(async()=>{
      await this.writes;
      if(previous){await this.api('state',failure,previous).catch(()=>{});await this.api('release',{},previous).catch(()=>{});}
    }).catch(()=>{});
  }
  clear(){
    this.update({arabic:'',dutch:'',partial:false});
    if(this.session)return this.publish().catch(()=>{});
    if(this.state.phase==='starting')return;
    const run=++this.run,snapshot={...this.state,phase:'stopped',active:false,status:'Ondertiteling gewist',errorCode:null};
    this.serial=this.serial.then(async()=>{
      if(run!==this.run)return;const session={owner:this.ownerId(),generation:null};
      session.generation=(await this.api('claim',{},session)).generation;
      try{if(run===this.run)await this.api('state',snapshot,session);}finally{await this.release(session);}
    }).catch(error=>{if(run===this.run)this.fail(error.code);});
    return this.serial;
  }
}
