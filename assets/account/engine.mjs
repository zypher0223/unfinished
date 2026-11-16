import {KEYS,readLocal,sanitizeDoc,mergeDoc,stable} from './model.mjs?v=f8867c6e6cd5';
export const SESSION='unfinished.account.session.v1',OWNER='unfinished.account.owner.v1';
const TRANSITION='unfinished.account.transition.v1';
const DRAFT='unfinished.assessment.draft.v1',DONE='unfinished.assessment.done.v1';
export class Vault{
 constructor(indexedDB){this.idb=indexedDB;}
 async db(){if(!this.promise)this.promise=new Promise((ok,no)=>{const r=this.idb.open('unfinished-account-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(Error('local_cache_unavailable'));r.onblocked=()=>no(Error('local_cache_unavailable'));});return this.promise;}
 async withLock(name,fn){
  const db=await this.db(),owner=crypto.randomUUID(),key='lock:'+name;
  const claim=await new Promise((ok,no)=>{const t=db.transaction('records','readwrite'),s=t.objectStore('records'),r=s.get(key);let acquired=false;r.onsuccess=()=>{if(!r.result||r.result.until<Date.now()){s.put({owner,until:Date.now()+180000},key);acquired=true;}};t.oncomplete=()=>ok(acquired);t.onerror=t.onabort=()=>no(Error('local_cache_unavailable'));});
  if(!claim)throw Error('sync_busy');
  try{return await fn();}finally{await new Promise((ok,no)=>{const t=db.transaction('records','readwrite'),s=t.objectStore('records'),r=s.get(key);r.onsuccess=()=>{if(r.result?.owner===owner)s.delete(key);};t.oncomplete=()=>ok();t.onerror=t.onabort=()=>no(Error('local_cache_unavailable'));});}
 }
 async remove(key){const db=await this.db();return new Promise((ok,no)=>{const t=db.transaction('records','readwrite');t.objectStore('records').delete(key);t.oncomplete=()=>ok();t.onerror=t.onabort=()=>no(Error('local_cache_unavailable'));});}
 async get(key){const db=await this.db();return new Promise((ok,no)=>{const t=db.transaction('records'),r=t.objectStore('records').get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(Error('local_cache_unavailable'));});}
 async put(key,value){const db=await this.db();return new Promise((ok,no)=>{const t=db.transaction('records','readwrite');t.objectStore('records').put(value,key);t.oncomplete=()=>ok();t.onerror=t.onabort=()=>no(Error('local_cache_unavailable'));});}
}
export class CloudSync{
 constructor({storage,vault,api,learning,apply,onStatus=()=>{},uuid=()=>crypto.randomUUID(),withWrites=fn=>fn()}){Object.assign(this,{storage,vault,api,learning,apply,onStatus,uuid,withWrites});this.session=this.loadSession();this.owner=storage.getItem(OWNER)||'';}
 loadSession(){try{const s=JSON.parse(this.storage.getItem(SESSION)||'null');return s&&s.user?.id&&s.token?s:null;}catch{return null;}}
 local(){return readLocal(this.storage,this.learning?.read());}
 pack(){return {document:this.local(),draft:this.storage.getItem(DRAFT),done:this.storage.getItem(DONE)};}
 async resumeTransition(){if(this.storage.getItem(TRANSITION)==='guest'){const guest=await this.vault.get('guest')||{document:sanitizeDoc({}),draft:null,done:null};this.apply(guest.document,{switching:true});this.withWrites(()=>{for(const[k,v]of [[DRAFT,guest.draft],[DONE,guest.done]])v===null?this.storage.removeItem(k):this.storage.setItem(k,v);});this.storage.removeItem(SESSION);this.storage.removeItem(OWNER);this.storage.removeItem(TRANSITION);this.session=null;this.owner='';}}
 async metadata(){return await this.vault.get('user:'+this.owner);}
 async persist(state){await this.vault.put('user:'+this.owner,state);}
 valid(session){return this.owner===session.user.id&&this.storage.getItem(OWNER)===this.owner&&this.session?.token===session.token;}
 async install(state,document){
  if(!state.install){state.install={from:this.local(),to:document};await this.persist(state);}
  const value=mergeDoc(state.install.from,this.local(),state.install.to);
  this.apply(value);delete state.install;await this.persist(state);
 }
 async activate(session,remote,mergeGuest){
  const owner=this.storage.getItem(OWNER)||'';
  if(owner&&owner!==session.user.id)throw Error('account_switch_required');
  if(owner===session.user.id){this.session=session;this.owner=owner;this.storage.setItem(SESSION,JSON.stringify(session));return;}
  await this.vault.put('guest',this.pack());
  const previous=await this.vault.get('user:'+session.user.id);
  const base=sanitizeDoc(remote.document||{}),guest=this.local();
  const document=mergeGuest?mergeDoc(sanitizeDoc({}),guest,base,{initial:true}):base;
  const state=previous||{deviceId:this.uuid(),seq:1,base,revision:remote.revision||0};
  // A pending operation from a previous login must be replayed before making a new one.
  const target=previous?.local?.document||document;
  state.switchPack={document:target,draft:previous?.local?.draft||null,done:previous?.local?.done||null};
  await this.vault.put('user:'+session.user.id,state);
  this.session=session;this.owner=session.user.id;
  this.storage.setItem(TRANSITION,this.owner);this.storage.setItem(OWNER,this.owner);this.storage.setItem(SESSION,JSON.stringify(session));
  this.apply(target,{switching:true});
  this.withWrites(()=>{for(const[k,value]of [[DRAFT,state.switchPack.draft],[DONE,state.switchPack.done]])value===null?this.storage.removeItem(k):this.storage.setItem(k,value);});
  delete state.switchPack;await this.persist(state);this.storage.removeItem(TRANSITION);
 }
 async sync(){
  if(!this.session||this.running)return;const session=this.session;if(!this.valid(session))throw Error('account_switched');
  this.running=true;this.onStatus('syncing');
  try{
   if(this.learning&&!this.learning.saved())throw Error('unsaved_local');
   let state=await this.metadata();if(!state)throw Error('local_cache_unavailable');
   if(state.switchPack){this.apply(state.switchPack.document,{switching:true});this.withWrites(()=>{for(const[k,v]of [[DRAFT,state.switchPack.draft],[DONE,state.switchPack.done]])v===null?this.storage.removeItem(k):this.storage.setItem(k,v);});delete state.switchPack;await this.persist(state);this.storage.removeItem(TRANSITION);}
   if(state.install)await this.install(state,state.install.to);
   for(let tries=0;tries<4;tries++){
    if(!this.valid(session))throw Error('account_switched');
    if(!state.pending){
     const remote=await this.api('pull',{},session);if(!this.valid(session))throw Error('account_switched');
     const snapshot=this.local(),document=mergeDoc(state.base,snapshot,sanitizeDoc(remote.document||{}));
     if(stable(document)===stable(sanitizeDoc(remote.document||{}))){state.base=sanitizeDoc(remote.document||{});state.revision=remote.revision;await this.install(state,document);this.onStatus('synced');return;}
     state.pending={deviceId:state.deviceId,seq:state.seq,revision:remote.revision,document,source:snapshot};await this.persist(state);
    }
    const p=state.pending,result=await this.api('push',{deviceId:p.deviceId,seq:p.seq,revision:p.revision,document:p.document},session);
    if(!this.valid(session))throw Error('account_switched');
    if(result.conflict){const snapshot=this.local();state.pending={deviceId:state.deviceId,seq:state.seq,revision:result.revision,source:snapshot,document:mergeDoc(state.base,snapshot,sanitizeDoc(result.document||{}))};await this.persist(state);continue;}
    const remote=sanitizeDoc(result.document||{}),document=mergeDoc(p.source,this.local(),remote);
    state.seq++;state.revision=result.revision;state.base=remote;delete state.pending;
    await this.install(state,document);this.onStatus('synced');return;
   }
   throw Error('sync_busy');
  }catch(e){this.onStatus(e.message||'offline');throw e;}finally{this.running=false;}
 }
 async logout({deleted=false}={}){
  if(!this.session)return;const session=this.session;
  if(this.running)throw Error('sync_busy');
  const state=await this.metadata();if(state&&!deleted){state.local=this.pack();await this.persist(state);}
  const guest=await this.vault.get('guest')||{document:sanitizeDoc({}),draft:null,done:null};
  if(!deleted)await this.api('logout',{},session).catch(()=>{});
  this.storage.setItem(TRANSITION,'guest');this.apply(guest.document,{switching:true});
  this.withWrites(()=>{for(const[k,v]of [[DRAFT,guest.draft],[DONE,guest.done]])v===null?this.storage.removeItem(k):this.storage.setItem(k,v);});
  if(deleted)await this.vault.remove('user:'+this.owner);this.storage.removeItem(SESSION);this.storage.removeItem(OWNER);this.session=null;this.owner='';this.storage.removeItem(TRANSITION);
 }
}
