(()=>{const key='market-learning-v1';
const empty=()=>({courses:{},wrong:{},cases:{},last:null});
let memory=empty(),unavailable=false,lastSaved=true,pendingBase=null,conflicts=0;
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function disk(){const d=JSON.parse(localStorage.getItem(key)||'null');return object(d)?{...empty(),...d,courses:object(d.courses)?d.courses:{},wrong:object(d.wrong)?d.wrong:{},cases:object(d.cases)?d.cases:{}}:empty();}
function read(){if(!lastSaved)return memory;try{return disk();}catch{unavailable=true;return memory;}}
// Three-way merge: replay only this page's changes onto the latest persisted record.
// Unchanged fields follow the other window, including deliberate deletions. Conflicting
// records keep the already-persisted version; answer history merges by unique event id.
function merge(base,local,remote,path=[]){
 if(same(local,base))return clone(remote);
 if(same(remote,base)||same(local,remote))return clone(local);
 if(path.join('.')==='growth.events'){
  const map=a=>Object.fromEntries((a||[]).map(e=>[e.id,e]));
  const out=merge(map(base),map(local),map(remote),['eventsById']);
  return Object.values(out).sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));
 }
 const atomic=(['wrong','review','cases','eventsById'].includes(path[0])&&path.length===2)||(path[0]==='practice'&&path.length===3);
 if(!atomic&&object(local)&&object(remote)&&(base===undefined||object(base))){
  const out={};for(const k of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){
   const v=merge(base&&base[k],local[k],remote[k],path.concat(k));if(v!==undefined)out[k]=v;
  }return out;
 }
 conflicts++;return clone(remote);
}
// Failed writes keep a local draft. Each retry (and each subsequent write) merges
// against disk again, so another window's saved quiz is never replaced by a stale snapshot.
function write(fn){const before=clone(read()),s=clone(before);fn(s);conflicts=0;
 let base=pendingBase||before,latest;try{latest=disk();}catch{latest=clone(base);}
 memory=merge(base,s,latest);pendingBase=clone(latest);
 try{localStorage.setItem(key,JSON.stringify(memory));lastSaved=true;unavailable=false;pendingBase=null;}
 catch{unavailable=true;lastSaved=false;}
 window.dispatchEvent(new Event('learning-change'));return memory;}
function retry(){write(()=>{});return lastSaved;}
// 作答事件按日期保留，不按条数截断：保留“今天往前共 KEEP_DAYS 个自然日”内的全部事件（小结只显示今天和近 7 天，多留几天是为了跨时区和时钟误差）。
// 更早的事件删除前，把最早一条的时间记到 growth.since，供“作答从某天起记录”这句说明使用。
const KEEP_DAYS=10;
function growthCutoff(now){const n=now&&typeof now.getTime==='function'&&!isNaN(now.getTime())?now:new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate()-KEEP_DAYS+1).getTime();}
function pruneGrowth(g,now){const cut=growthCutoff(now),ok=x=>x&&typeof x.t==='string'&&!isNaN(Date.parse(x.t));
 let first=typeof g.since==='string'&&!isNaN(Date.parse(g.since))?g.since:null;
 g.events.forEach(x=>{if(ok(x)&&(!first||Date.parse(x.t)<Date.parse(first)))first=x.t;});
 if(first)g.since=first;else delete g.since;
 g.events=g.events.filter(x=>ok(x)&&Date.parse(x.t)>=cut);}
// 到期复习（2026-11-13）：s.review 记录 { 'q:题号' | 'l:课程key' : {n:第几轮, at:上次复习时间} }，间隔 REVIEW_DAYS 个自然日（按本机日期，到那天零点起算到期）。
// 题目：错题这次答对后进入第 0 轮（1 天后回头再测）；到期后再答对进入下一轮，全部轮次答对后移出；任何一次答错都回到错题本并删掉复习进度。
// 没到期时答对不推进轮次。课程的轮次由“我的学习 → 今天该复习”里的按钮推进（assets/review/review.js）。
const REVIEW_DAYS=[1,3,7,14,30];
function reviewOk(r){return r&&typeof r==='object'&&Number.isInteger(r.n)&&r.n>=0&&r.n<=REVIEW_DAYS.length&&typeof r.at==='string'&&!isNaN(Date.parse(r.at));}
function reviewDue(r,now){if(!reviewOk(r)||r.n>=REVIEW_DAYS.length)return false;const t=now&&typeof now.getTime==='function'?now.getTime():typeof now==='number'?now:Date.now();const a=new Date(r.at);return new Date(a.getFullYear(),a.getMonth(),a.getDate()+REVIEW_DAYS[r.n]).getTime()<=t;}
function scheduleQuestion(s,q,correct,was,at){if(!s.review||typeof s.review!=='object'||Array.isArray(s.review))s.review={};const k='q:'+q,prev=s.review[k];
 if(!correct){delete s.review[k];return;}
 if(was){s.review[k]={n:0,at};return;}
 if(reviewOk(prev)&&reviewDue(prev,Date.parse(at))){const n=prev.n+1;if(n>=REVIEW_DAYS.length)delete s.review[k];else s.review[k]={n,at};}}
// 统一的作答入口：更新错题本，并记一条成长事件（只存题号、结果、来源、时间、轮次，不存题干或选项文字）。
// 结果：right 答对；wrong 答错；fix 这道题此前在错题本里、这次答对。同一来源同一轮同一题只记一次事件。e.now（可选，Date）只供校验脚本固定“现在”。
function answer(s,e){const was=Object.prototype.hasOwnProperty.call(s.wrong,e.q),at=e.date||new Date().toISOString();
 if(e.correct)delete s.wrong[e.q];else s.wrong[e.q]={answer:e.answer,kind:e.kind||'question',date:at};
 const result=e.correct?(was?'fix':'right'):'wrong';
 scheduleQuestion(s,e.q,e.correct,was,at);
 if(!s.growth||typeof s.growth!=='object'||Array.isArray(s.growth))s.growth={v:1,events:[]};if(!Array.isArray(s.growth.events))s.growth.events=[];
 const id=[e.src||'other',e.run||'0',e.q].join(':');
 if(s.growth.events.some(x=>x&&x.id===id))return {result,recorded:false};
 s.growth.events.push({id,t:at,q:e.q,r:result,src:e.src||'other',...(e.topic?{topic:e.topic}:{})});
 pruneGrowth(s.growth,e.now);
 return {result,recorded:true};}
window.LearningStore={read,write,answer,pruneGrowth,KEEP_DAYS,REVIEW_DAYS,reviewOk,reviewDue,available:()=>!unavailable,saved:()=>lastSaved,conflicts:()=>conflicts,retry};})();
