(()=>{const key='market-learning-v1';let memory={courses:{},wrong:{},cases:{},last:null};let unavailable=false;
function read(){try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&typeof d==='object'&&!Array.isArray(d))return {...memory,...d,courses:d.courses&&typeof d.courses==='object'?d.courses:{},wrong:d.wrong&&typeof d.wrong==='object'?d.wrong:{},cases:d.cases&&typeof d.cases==='object'?d.cases:{}};}catch{unavailable=true;}return memory;}
// lastSaved：最近一次 write 是否真的写进了 localStorage。写入失败（例如存储空间不足）时记录只留在本页内存里，刷新就没了，
// 调用方需要“确认已保存”时用 LearningStore.saved() 判断，不能只看 write 有没有返回。
let lastSaved=true;
function write(fn){let s=read();fn(s);memory=s;try{localStorage.setItem(key,JSON.stringify(s));lastSaved=true;}catch{unavailable=true;lastSaved=false;}window.dispatchEvent(new Event('learning-change'));return s;}
// 作答事件按日期保留，不按条数截断：保留“今天往前共 KEEP_DAYS 个自然日”内的全部事件（小结只显示今天和近 7 天，多留几天是为了跨时区和时钟误差）。
// 更早的事件删除前，把最早一条的时间记到 growth.since，供“作答从某天起记录”这句说明使用。
const KEEP_DAYS=10;
function growthCutoff(now){const n=now&&typeof now.getTime==='function'&&!isNaN(now.getTime())?now:new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate()-KEEP_DAYS+1).getTime();}
function pruneGrowth(g,now){const cut=growthCutoff(now),ok=x=>x&&typeof x.t==='string'&&!isNaN(Date.parse(x.t));
 let first=typeof g.since==='string'&&!isNaN(Date.parse(g.since))?g.since:null;
 g.events.forEach(x=>{if(ok(x)&&(!first||Date.parse(x.t)<Date.parse(first)))first=x.t;});
 if(first)g.since=first;else delete g.since;
 g.events=g.events.filter(x=>ok(x)&&Date.parse(x.t)>=cut);}
// 统一的作答入口：更新错题本，并记一条成长事件（只存题号、结果、来源、时间、轮次，不存题干或选项文字）。
// 结果：right 答对；wrong 答错；fix 这道题此前在错题本里、这次答对。同一来源同一轮同一题只记一次事件。e.now（可选，Date）只供校验脚本固定“现在”。
function answer(s,e){const was=Object.prototype.hasOwnProperty.call(s.wrong,e.q),at=e.date||new Date().toISOString();
 if(e.correct)delete s.wrong[e.q];else s.wrong[e.q]={answer:e.answer,kind:e.kind||'question',date:at};
 const result=e.correct?(was?'fix':'right'):'wrong';
 if(!s.growth||typeof s.growth!=='object'||Array.isArray(s.growth))s.growth={v:1,events:[]};if(!Array.isArray(s.growth.events))s.growth.events=[];
 const id=[e.src||'other',e.run||'0',e.q].join(':');
 if(s.growth.events.some(x=>x&&x.id===id))return {result,recorded:false};
 s.growth.events.push({id,t:at,q:e.q,r:result,src:e.src||'other',...(e.topic?{topic:e.topic}:{})});
 pruneGrowth(s.growth,e.now);
 return {result,recorded:true};}
window.LearningStore={read,write,answer,pruneGrowth,KEEP_DAYS,available:()=>!unavailable,saved:()=>lastSaved};})();
