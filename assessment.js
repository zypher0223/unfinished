const questionBank=window.MARKET_QUESTIONS||[];
const testNames={indicator:'可计算指标',tool:'图表与数据',method:'技术分析方法',all:'技术面混合',information:'信息面',market:'信息与技术综合',basics:'小白基础',crypto:'加密进阶',options:'期权进阶',frontier:'加密前沿',career:'Web3 行业与岗位',ecosystem:'生态赛道'};
const levelNames={beginner:'入门',advanced:'进阶'};
const testEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let attempt=null;let companionAttempt=0;
// 未交卷的测验保存在本机，刷新或离开后可以继续；题目和选项顺序原样保留，不重新洗牌。
const DRAFT_KEY='unfinished.assessment.draft.v1';
function questionSignature(q){const text=[q.stem,...q.options,q.answer].join('\u0001');let h=5381;for(let i=0;i<text.length;i++)h=((h<<5)+h+text.charCodeAt(i))|0;return (h>>>0).toString(36);}
function saveDraft(){if(!attempt)return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify({v:1,runId:attempt.runId,scope:attempt.scope,level:attempt.level,index:attempt.index,items:attempt.questions.map(q=>({id:q.id,order:q.order,sig:questionSignature(q)})),answers:attempt.answers,savedAt:new Date().toISOString()}));}catch{}}
function clearDraft(){try{localStorage.removeItem(DRAFT_KEY);}catch{}}
// 返回 none（没有）、ok（可继续）、changed（题库变了）、broken（记录损坏）。任何一题对不上都整份不恢复，避免把旧选择套到新选项上。
function readDraft(){let raw=null;try{raw=localStorage.getItem(DRAFT_KEY);}catch{return {state:'none'};}if(!raw)return {state:'none'};
 try{const d=JSON.parse(raw),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  if(!d||d.v!==1||typeof d.runId!=='string'||!own(testNames,d.scope)||!own(levelNames,d.level)||!Array.isArray(d.items)||d.items.length!==12||!Array.isArray(d.answers)||d.answers.length!==12||!Number.isInteger(d.index)||d.index<0||d.index>11)return {state:'broken'};
  if(d.answers.some(a=>a!==null&&!(Number.isInteger(a)&&a>=0&&a<=3)))return {state:'broken'};
  if(new Set(d.items.map(x=>x&&x.id)).size!==12)return {state:'broken'};
  const questions=[];for(const item of d.items){if(!item||!Array.isArray(item.order)||item.order.length!==4||[0,1,2,3].some(n=>!item.order.includes(n)))return {state:'broken'};const q=questionBank.find(q=>q.id===item.id);if(!q||q.level!==d.level||questionSignature(q)!==item.sig)return {state:'changed'};questions.push({...q,order:item.order.slice()});}
  return {state:'ok',draft:d,questions};}catch{return {state:'broken'};}}
function resumeTest(){const r=readDraft();if(r.state!=='ok'){showResume();return;}
 attempt={runId:r.draft.runId,scope:r.draft.scope,level:r.draft.level,index:r.draft.index,questions:r.questions,answers:r.draft.answers.slice(),restored:true};
 document.getElementById('test-setup').hidden=true;document.getElementById('test-results').hidden=true;document.getElementById('test-running').hidden=false;
 renderQuestion();document.getElementById('test-running').scrollIntoView({block:'start'});
}
function showResume(){let box=document.getElementById('test-resume');if(!box){box=document.createElement('div');box.id='test-resume';box.className='test-resume';const form=document.getElementById('test-form');form.parentNode.insertBefore(box,form);}
 const r=readDraft();box.textContent='';box.hidden=r.state==='none';if(r.state==='none')return;
 const add=(tag,text,cls)=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;box.appendChild(el);return el;};
 if(r.state==='ok'){const done=r.draft.answers.filter(x=>x!==null).length;
  add('h2','你有一份未完成的测验');add('p',`${testNames[r.draft.scope]} · ${levelNames[r.draft.level]}，已答 ${done} / 12，停在第 ${r.draft.index+1} 题。`);add('p','题目和选项顺序与离开时相同。继续不会交卷，也不会提前显示答案。');
  const row=add('div','','result-actions');const go=document.createElement('button');go.type='button';go.className='test-primary';go.id='test-resume-go';go.textContent='继续未完成测验';go.addEventListener('click',resumeTest);row.appendChild(go);
  const drop=document.createElement('button');drop.type='button';drop.id='test-resume-drop';drop.textContent='放弃这份，重新开始';drop.addEventListener('click',()=>{clearDraft();showResume();document.querySelector('input[name=scope]:checked').focus({preventScroll:true});});row.appendChild(drop);
 }else{add('h2','上次未完成的测验不能继续');add('p',r.state==='changed'?'题库在你离开后更新过：有题目被修改或移除。为避免把旧选择套到新选项上造成错判，这份作答不恢复，请重新开始。':'保存的作答记录已损坏，无法确认题目和选项顺序，请重新开始。');clearDraft();}
}
const DONE_KEY='unfinished.assessment.done.v1';
function submittedRuns(){try{const v=JSON.parse(localStorage.getItem(DONE_KEY)||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(-20):[];}catch{return [];}}
function markSubmitted(id){try{localStorage.setItem(DONE_KEY,JSON.stringify([...submittedRuns().filter(x=>x!==id),id].slice(-20)));}catch{}}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const v=new Uint32Array(1);crypto.getRandomValues(v);const j=v[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function startTest(scope,level){
 let types=scope==='market'?['indicator','tool','method','information']:['indicator','tool','method'];
 let selected=['all','market'].includes(scope)?shuffle(types.flatMap(type=>shuffle(questionBank.filter(q=>q.type===type&&q.level===level)).slice(0,12/types.length))):shuffle(questionBank.filter(q=>q.type===scope&&q.level===level)).slice(0,12);
 if(selected.length!==12){document.querySelector('.test-history').textContent='题库暂未加载完整，请刷新后重试。';return;}
 attempt={runId:String(Date.now())+'-'+(++companionAttempt),scope,level,index:0,questions:selected.map(q=>({...q,order:shuffle([0,1,2,3])})),answers:Array(selected.length).fill(null)};
 document.getElementById('test-setup').hidden=true;document.getElementById('test-results').hidden=true;document.getElementById('test-running').hidden=false;
 renderQuestion();document.getElementById('test-running').scrollIntoView({block:'start'});
}
function updateProgress(){const answered=attempt.answers.filter(x=>x!==null).length;document.getElementById('answered-count').textContent=`已答 ${answered} / ${attempt.questions.length}`;document.getElementById('question-map').innerHTML=attempt.questions.map((q,i)=>`<button type="button" data-question="${i}" class="${attempt.answers[i]!==null?'is-answered':''}" ${i===attempt.index?'aria-current="step"':''} aria-label="第${i+1}题，${attempt.answers[i]!==null?'已答':'未答'}">${i+1}</button>`).join('');document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{attempt.index=Number(button.dataset.question);renderQuestion();}));document.dispatchEvent(new CustomEvent('unfinished:exercise-progress',{detail:{kind:'assessment',runId:attempt.runId,completed:answered,total:attempt.questions.length,...(attempt.restored?{initial:true}:{})}}));attempt.restored=false;}
function renderQuestion(){const q=attempt.questions[attempt.index];document.getElementById('test-label').textContent=`${testNames[attempt.scope]} · ${levelNames[attempt.level]} · 第 ${attempt.index+1} 题`;
 document.getElementById('question-stage').innerHTML=`<fieldset class="question-fieldset"><legend tabindex="-1">${testEsc(q.stem)}</legend><div class="answer-options">${q.order.map((original,i)=>`<label class="answer-option"><input type="radio" name="answer" value="${original}" ${attempt.answers[attempt.index]===original?'checked':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${testEsc(q.options[original])}</span></label>`).join('')}</div></fieldset>`;
 document.querySelectorAll('input[name=answer]').forEach(input=>input.addEventListener('change',()=>{attempt.answers[attempt.index]=Number(input.value);document.getElementById('test-message').textContent='';updateProgress();saveDraft();}));
 document.getElementById('question-prev').disabled=attempt.index===0;document.getElementById('question-next').disabled=attempt.index===11;document.getElementById('test-message').textContent='';updateProgress();saveDraft();document.querySelector('.question-fieldset legend').focus({preventScroll:true});
}
// 同一轮测验只让一个窗口交卷成功。localStorage 的“先读再写”在两个窗口之间不是原子的（实测会两边都记分），
// 所以用 IndexedDB 的主键唯一约束来占位：谁先写入这一轮的编号谁交卷，另一个窗口会收到 ConstraintError。
// IndexedDB 不可用时退回 localStorage 标记（单窗口、先后交卷仍然有效）。
function claimRun(id){return new Promise(resolve=>{let settled=false;const done=v=>{if(settled)return;settled=true;resolve(v);};
 const fallback=()=>{if(settled)return;if(submittedRuns().includes(id))done(false);else{markSubmitted(id);done(true);}};
 if(submittedRuns().includes(id)){done(false);return;}
 try{const open=indexedDB.open('unfinished-assessment',1);open.onupgradeneeded=()=>{open.result.createObjectStore('submitted',{keyPath:'id'});};open.onerror=fallback;open.onblocked=fallback;
  open.onsuccess=()=>{const db=open.result;try{const tx=db.transaction('submitted','readwrite'),store=tx.objectStore('submitted');let duplicate=false;const add=store.add({id,at:Date.now()});add.onerror=()=>{duplicate=!!add.error&&add.error.name==='ConstraintError';};
    tx.oncomplete=()=>{db.close();markSubmitted(id);done(true);};tx.onabort=()=>{db.close();if(duplicate)done(false);else fallback();};}catch{db.close();fallback();}};
 }catch{fallback();}
 setTimeout(fallback,4000);});}
function finishTest(){const missing=attempt.answers.findIndex(x=>x===null);if(missing!==-1){attempt.index=missing;renderQuestion();document.getElementById('test-message').textContent='还有未作答的题目，已跳到第一道未答题。完成后再交卷。';return;}
 const run=attempt;if(run.submitting)return;run.submitting=true;const button=document.getElementById('test-submit');button.disabled=true;
 claimRun(run.runId).then(first=>{run.submitting=false;button.disabled=false;if(attempt!==run)return;
  if(!first){clearDraft();showSetup();document.getElementById('test-history').textContent='这份测验已经在另一个窗口交过卷，没有重复记分。';return;}
  scoreTest();});
}
function scoreTest(){
 const right=attempt.questions.filter((q,i)=>q.answer===attempt.answers[i]).length;clearDraft();
 let fixed=0;if(window.LearningStore)LearningStore.write(s=>{attempt.questions.forEach((q,i)=>{const out=LearningStore.answer(s,{q:q.id,answer:attempt.answers[i],correct:q.answer===attempt.answers[i],src:'test',run:attempt.runId});if(out.recorded&&out.result==='fix')fixed++;});});
 const breakdown=['indicator','tool','method','information','basics','crypto','options','frontier','ecosystem','career'].map(type=>{const positions=attempt.questions.map((q,i)=>q.type===type?i:-1).filter(i=>i>=0);return positions.length?`<span>${testNames[type]}：${positions.filter(i=>attempt.questions[i].answer===attempt.answers[i]).length} / ${positions.length}</span>`:'';}).join('');
 document.getElementById('test-running').hidden=true;const results=document.getElementById('test-results');results.hidden=false;
 results.innerHTML=`<div class="result-heading"><h2 tabindex="-1">本次答对 ${right} / ${attempt.questions.length} 题</h2><p>${testNames[attempt.scope]} · ${levelNames[attempt.level]}。先看判断理由，再回到相关课程复习。</p>${fixed?`<p class="result-fixed">其中 ${fixed} 道是错题本里的旧题，这次答对了，已移出待复习。</p>`:''}<div class="result-breakdown">${breakdown}</div></div><div class="result-actions"><a href="study.html#notebook">到错题本复习</a><button type="button" class="test-primary" id="test-again">同范围再测一次</button><button type="button" id="test-new-settings">选择其他类型或难度</button></div>${attempt.questions.map((q,i)=>`<article class="question-review"><p class="review-outcome">第 ${i+1} 题 · ${attempt.answers[i]===q.answer?'回答正确':'需要复习'} · ${testNames[q.type]}</p><h3>${testEsc(q.stem)}</h3><ol class="review-options">${q.order.map((original,n)=>`<li class="${original===q.answer?'correct-option':''}"><b>${String.fromCharCode(65+n)}. ${testEsc(q.options[original])}</b>${original===q.answer?'<span class="review-mark">正确答案</span>':''}${original===attempt.answers[i]?'<span class="review-mark">你的选择</span>':''}<p>${testEsc(q.optionExplanations[original])}</p></li>`).join('')}</ol><p class="review-explanation">${testEsc(q.explanation)}</p><div class="review-lessons">${(q.topicIds||[]).map(id=>`<a href="courses/${id}.html" target="_blank" rel="noopener">复习相关课程 ${String(id).padStart(3,'0')}</a>`).join('')}${(q.infoIds||[]).map(id=>`<a href="info/${id}.html" target="_blank" rel="noopener">复习信息课程 ${String(id).padStart(3,'0')}</a>`).join('')}</div></article>`).join('')}`;
 document.getElementById('test-again').addEventListener('click',()=>startTest(attempt.scope,attempt.level));document.getElementById('test-new-settings').addEventListener('click',showSetup);
 try{localStorage.setItem('market-last-assessment',JSON.stringify({scope:attempt.scope,level:attempt.level,right,total:attempt.questions.length,date:new Date().toISOString()}));}catch{}
 results.scrollIntoView({block:'start'});results.querySelector('h2').focus({preventScroll:true});
 // 交卷已确定成功：通知匿名统计等监听方。只带轮次编号，不带作答。
 document.dispatchEvent(new CustomEvent('unfinished:assessment-submitted',{detail:{runId:attempt.runId}}));
 if(fixed)document.dispatchEvent(new CustomEvent('unfinished:growth',{detail:{kind:'fix',count:fixed,src:'test'}}));
}
function showSetup(){attempt=null;document.getElementById('test-running').hidden=true;document.getElementById('test-results').hidden=true;document.getElementById('test-setup').hidden=false;showHistory();showResume();document.getElementById('test-setup').scrollIntoView({block:'start'});document.querySelector('input[name=scope]:checked').focus({preventScroll:true});}
function showHistory(){try{const previous=JSON.parse(localStorage.getItem('market-last-assessment')||'null');document.getElementById('test-history').textContent=previous?`这台设备上次成绩：${testNames[previous.scope]} · ${levelNames[previous.level]}，${previous.right}/${previous.total}。`:'成绩只保存在当前设备。';}catch{document.getElementById('test-history').textContent='';}}
document.getElementById('test-form').addEventListener('submit',event=>{event.preventDefault();const values=new FormData(event.currentTarget);startTest(values.get('scope'),values.get('level'));});
document.getElementById('question-prev').addEventListener('click',()=>{if(attempt.index>0){attempt.index--;renderQuestion();}});document.getElementById('question-next').addEventListener('click',()=>{if(attempt.index<11){attempt.index++;renderQuestion();}});
document.getElementById('test-submit').addEventListener('click',finishTest);document.getElementById('test-exit').addEventListener('click',showSetup);showHistory();showResume();window.addEventListener('storage',e=>{if(e.key===DRAFT_KEY&&!attempt)showResume();});

const requestedScope=new URLSearchParams(location.search).get('scope');if(Object.prototype.hasOwnProperty.call(testNames,requestedScope)){document.querySelector(`input[name=scope][value=${requestedScope}]`).checked=true;}
