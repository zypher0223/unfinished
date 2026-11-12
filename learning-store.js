(()=>{const key='market-learning-v1';let memory={courses:{},wrong:{},cases:{},last:null};let unavailable=false;
function read(){try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&typeof d==='object'&&!Array.isArray(d))return {...memory,...d,courses:d.courses&&typeof d.courses==='object'?d.courses:{},wrong:d.wrong&&typeof d.wrong==='object'?d.wrong:{},cases:d.cases&&typeof d.cases==='object'?d.cases:{}};}catch{unavailable=true;}return memory;}
function write(fn){let s=read();fn(s);memory=s;try{localStorage.setItem(key,JSON.stringify(s));}catch{unavailable=true;}window.dispatchEvent(new Event('learning-change'));return s;}
// 统一的作答入口：更新错题本，并记一条成长事件（只存题号、结果、来源、时间、轮次，不存题干或选项文字）。
// 结果：right 答对；wrong 答错；fix 这道题此前在错题本里、这次答对。同一来源同一轮同一题只记一次事件。
function answer(s,e){const was=Object.prototype.hasOwnProperty.call(s.wrong,e.q),at=e.date||new Date().toISOString();
 if(e.correct)delete s.wrong[e.q];else s.wrong[e.q]={answer:e.answer,kind:e.kind||'question',date:at};
 const result=e.correct?(was?'fix':'right'):'wrong';
 if(!s.growth||typeof s.growth!=='object'||Array.isArray(s.growth))s.growth={v:1,events:[]};if(!Array.isArray(s.growth.events))s.growth.events=[];
 const id=[e.src||'other',e.run||'0',e.q].join(':');
 if(s.growth.events.some(x=>x&&x.id===id))return {result,recorded:false};
 s.growth.events.push({id,t:at,q:e.q,r:result,src:e.src||'other',...(e.topic?{topic:e.topic}:{})});
 if(s.growth.events.length>400)s.growth.events=s.growth.events.slice(-400);
 return {result,recorded:true};}
window.LearningStore={read,write,answer,available:()=>!unavailable};})();
