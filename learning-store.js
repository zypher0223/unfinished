(()=>{const key='market-learning-v1';let memory={courses:{},wrong:{},cases:{},last:null};let unavailable=false;
function read(){try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&typeof d==='object'&&!Array.isArray(d))return {...memory,...d,courses:d.courses&&typeof d.courses==='object'?d.courses:{},wrong:d.wrong&&typeof d.wrong==='object'?d.wrong:{},cases:d.cases&&typeof d.cases==='object'?d.cases:{}};}catch{unavailable=true;}return memory;}
function write(fn){let s=read();fn(s);memory=s;try{localStorage.setItem(key,JSON.stringify(s));}catch{unavailable=true;}window.dispatchEvent(new Event('learning-change'));return s;}
window.LearningStore={read,write,available:()=>!unavailable};})();
