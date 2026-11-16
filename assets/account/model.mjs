// Shared allowlist and three-way sync merge. Never read or transmit an entire storage object.
export const KEYS={learning:'market-learning-v1',study:'unfinished.study.v1',checks:'unfinished.companion.progress.v1',lastTest:'market-last-assessment'};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const safe=k=>typeof k==='string'&&k.length<=220&&!['__proto__','prototype','constructor'].includes(k);
const course=k=>/^[ti]-\d{1,4}$/.test(k);
const date=x=>typeof x==='string'&&x.length<=40&&Number.isFinite(Date.parse(x));
const number=(x,max=1e9)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
export function stable(x){if(Array.isArray(x))return '['+x.map(stable).join(',')+']';if(obj(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';return JSON.stringify(x);}
function map(input,valid,clean,max=5000){const out={};for(const [k,v]of Object.entries(obj(input)?input:{})){if(Object.keys(out).length>=max)throw Error('record_limit');if(safe(k)&&valid(k)){const x=clean(v,k);if(x!==undefined)out[k]=x;}}return out;}
function answer(v){if(!obj(v)||!Number.isInteger(v.answer)||v.answer<0||v.answer>9)return;return {answer:v.answer,...(date(v.date)?{date:v.date}:{}),...(v.kind==='case'||v.kind==='question'?{kind:v.kind}:{})};}
export function sanitizeDoc(input={},now=Date.now()){
 if(!obj(input))throw Error('invalid_record');const l=obj(input.learning)?input.learning:{};
 const learning={courses:map(l.courses,course,v=>{if(!obj(v))return;const o={};for(const k of ['done','saved'])if(typeof v[k]==='boolean')o[k]=v[k];for(const k of ['doneAt','lastVisited'])if(date(v[k]))o[k]=v[k];return o;}),wrong:map(l.wrong,safe,answer),cases:map(l.cases,safe,answer),practice:map(l.practice,course,v=>map(v,safe,answer)),positions:map(l.positions,course,v=>obj(v)&&typeof v.section==='string'&&/^[A-Za-z][\w-]{0,59}$/.test(v.section)&&date(v.date)?{section:v.section,date:v.date}:undefined),review:map(l.review,k=>/^[ql]:/.test(k),v=>obj(v)&&Number.isInteger(v.n)&&v.n>=0&&v.n<=5&&date(v.at)?{n:v.n,at:v.at}:undefined),last:course(l.last)?l.last:null,finished:map(l.finished,k=>/^[\w-]{1,80}$/.test(k),v=>date(v)?v:undefined)};
 const events=Array.isArray(l.growth?.events)?l.growth.events:[];if(events.length>20000)throw Error('record_limit');const seen=new Set();
 learning.growth={events:events.filter(e=>obj(e)&&safe(e.id)&&safe(e.q)&&date(e.t)&&Date.parse(e.t)>=now-10*864e5&&['right','wrong','fix'].includes(e.r)&&['lesson','review','test','case','other'].includes(e.src)&&!seen.has(e.id)&&seen.add(e.id)).map(e=>({id:e.id,q:e.q,t:e.t,r:e.r,src:e.src,...(course(e.topic)?{topic:e.topic}:{})})).sort((a,b)=>a.t.localeCompare(b.t)||a.id.localeCompare(b.id)),...(date(l.growth?.since)?{since:l.growth.since}:{})};
 const s=obj(input.study)?input.study:{};const study={d:map(s.d,k=>/^\d{4}-\d{2}-\d{2}$/.test(k),v=>number(v,86400)?Math.floor(v):undefined,20000),k:map(s.k,course,v=>number(v)?Math.floor(v):undefined),f:map(s.f,k=>/^\d{4}-\d{2}-\d{2}$/.test(k),v=>Array.isArray(v)?[...new Set(v.filter(x=>['d30','d60','d120'].includes(x)))]:undefined,20000),total:number(s.total)?Math.floor(s.total):0};
 for(const [d,n] of Object.entries(study.d)){const flags=study.f[d]||[];for(const [seconds,name]of [[1800,'d30'],[3600,'d60'],[7200,'d120']])if(n>=seconds&&!flags.includes(name))flags.push(name);if(flags.length)study.f[d]=flags;}
 const checks=map(input.checks,k=>/^\/[\w\-./%]{1,200}$/.test(k),v=>obj(v)?{checks:map(v.checks,k=>/^\d{1,3}$/.test(k),v=>typeof v==='boolean'?v:undefined,1000)}:undefined,2000);
 const a=input.lastTest;const scopes=['indicator','tool','method','all','information','market','basics','crypto','options','frontier','career','ecosystem'];
 const lastTest=obj(a)&&scopes.includes(a.scope)&&['beginner','advanced'].includes(a.level)&&Number.isInteger(a.total)&&a.total>0&&a.total<=100&&Number.isInteger(a.right)&&a.right>=0&&a.right<=a.total&&date(a.date)?{scope:a.scope,level:a.level,total:a.total,right:a.right,date:a.date}:null;
 return {learning,study,checks,lastTest};
}
export function readLocal(storage,learning){const raw={};for(const[k,name]of Object.entries(KEYS)){try{raw[k]=JSON.parse(storage.getItem(name)||'null');}catch{raw[k]=null;}}if(learning)raw.learning=learning;return sanitizeDoc(raw);}
export function mergeDoc(base,local,remote,{initial=false}={}){
 const eq=(a,b)=>stable(a)===stable(b);
 function merge(b,l,r,path=[]){
  if(eq(l,b))return copy(r);if(eq(r,b)||eq(l,r))return copy(l);
  if(path.join('.')==='learning.growth.events'){const index=a=>Object.fromEntries((a||[]).map(e=>[e.id,e]));return Object.values(merge(index(b),index(l),index(r),['events'])).sort((a,b)=>a.t.localeCompare(b.t)||a.id.localeCompare(b.id));}
  if(path[0]==='study'&&(path[1]==='d'||path[1]==='k')&&path.length===3||path.join('.')==='study.total'){
   if(typeof l==='number'&&typeof r==='number'){if(initial)return Math.max(l,r);return Math.min(path[1]==='d'?86400:1e9,r+Math.max(0,l-(typeof b==='number'?b:0)));}
  }
  const atomic=(['wrong','cases','positions','review'].includes(path[1])&&path.length===3)||(path[1]==='practice'&&path.length===4)||path[0]==='lastTest';
  if(!atomic&&obj(l)&&obj(r)&&(b===undefined||obj(b))){const o={};for(const k of new Set([...Object.keys(b||{}),...Object.keys(l),...Object.keys(r)])){const v=merge(b?.[k],l[k],r[k],path.concat(k));if(v!==undefined)o[k]=v;}return o;}
  if(initial&&r===undefined)return copy(l);
  if(obj(l)&&obj(r)){const lt=l.date||l.at,rt=r.date||r.at;if(date(lt)&&date(rt)&&Date.parse(lt)>Date.parse(rt))return copy(l);}
  return copy(r);
 }
 return sanitizeDoc(merge(base,local,remote));
}
export function recordCount(d){return Object.values(d.learning.courses).filter(v=>v.done||v.saved).length+Object.keys(d.learning.wrong).length+Object.values(d.learning.practice).reduce((n,v)=>n+Object.keys(v).length,0)+d.learning.growth.events.length+Object.keys(d.learning.review).length+Object.keys(d.learning.cases).length+Object.keys(d.learning.positions).length+Object.keys(d.checks).length+Object.keys(d.study.d).length+(d.lastTest?1:0);}
