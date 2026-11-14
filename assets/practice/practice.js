/* Local-only lesson checks and wrong-answer practice. Shares LearningStore with the existing notebook. */
(function () {
  'use strict';
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    check:'Check answer',choose:'Choose an answer first.',right:'Correct — check the reasoning too.',wrong:'Not quite — compare the explanations below.',correct:'Correct answer',yours:'Your answer',retry:'Try these questions again',
    progress:'Answered {n} / {total}',score:'Correct {n} / {total}',saved:'Answers and review notes stay in this browser.',blocked:'Browser storage is unavailable. Your work lasts only on this page.',fallback:'This question is currently available in Chinese only.',
    title:'Practise your mistakes',intro:'Answer again before viewing the explanations. A correct answer removes that question from the review list.',start:'Practise all mistakes',empty:'No question-bank mistakes to practise. Case-study mistakes can be retried in their original case.',remaining:'Questions to review: {n}',batch:'Up to 12 questions per round. Remaining mistakes stay in your notebook.',next:'Start another review round',stale:'This question is no longer in your review list.',allDone:'All questions in this round have been answered. Check the reasoning, then continue with any remaining mistakes.',unsavedTitle:'This answer has not been saved yet',unsaved:'The browser could not write it to this device (storage may be full). It is kept on this page only: free up some browser storage, then save again before you leave or refresh.',saveAgain:'Save again',savedNow:'Saved to this device.',stillUnsaved:'Still not saved. Free up browser storage first, then press the button again.'
  } : {
    check:'检查答案',choose:'先选择一个答案，再检查。',right:'答对啦，再核对一下判断理由。',wrong:'这题还需复习，对照下面的解析看看。',correct:'正确答案',yours:'你的选择',retry:'重新练习这组题',
    progress:'已作答 {n} / {total}',score:'答对 {n} / {total}',saved:'作答和错题记录只保存在当前浏览器。',blocked:'当前浏览器无法保存记录，本次作答仅在当前页面有效。',fallback:'这道题目前只有中文版本。',
    title:'错题专练',intro:'先重新作答，再查看解析。答对后，这道题会从待复习列表移出。',start:'练习全部错题',empty:'目前没有题库错题可练；综合案例错题可以回到原案例重做。',remaining:'待复习题目：{n}',batch:'每轮最多 12 题，其余错题继续保留在错题本。',next:'继续下一轮错题',stale:'这道题已不在待复习列表中。',allDone:'这组题都已作答，先核对判断理由，再继续复习剩下的错题。',unsavedTitle:'这次作答还没有保存',unsaved:'浏览器没能把它写进本机（可能是存储空间不足）。它目前只留在这个页面里：请先清理一些浏览器存储空间，再点“重新保存”，然后再离开或刷新。',saveAgain:'重新保存',savedNow:'已保存到本机。',stillUnsaved:'还是没能保存。请先清理浏览器存储空间，再点一次。'
  };
  function h(tag,attrs,kids){var el=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){if(k==='text')el.textContent=attrs[k];else el.setAttribute(k,attrs[k]);});(kids||[]).forEach(function(c){el.appendChild(c);});return el;}
  function fill(s,n,total){return s.replace('{n}',n).replace('{total}',total);}
  function storedChoice(value){return value&&Number.isInteger(value.answer)&&value.answer>=0&&value.answer<4?value.answer:null;}
  function recordAnswer(key,q,answer,run){
    if(!window.LearningStore)return;
    var out=null;
    LearningStore.write(function(s){
      s.practice=s.practice&&typeof s.practice==='object'?s.practice:{};
      if(key){s.practice[key]=s.practice[key]&&typeof s.practice[key]==='object'?s.practice[key]:{};s.practice[key][q.id]={answer:answer,date:new Date().toISOString()};}
      out=LearningStore.answer(s,{q:q.id,answer:answer,correct:answer===q.answer,src:key?'lesson':'review',run:run,topic:key||null});
    });
    return out;
  }
  function normalQuestion(q){var translated=EN&&q.stemEn&&q.optionsEn&&q.optionExplanationsEn;return {id:q.id,stem:translated?q.stemEn:q.stem,options:translated?q.optionsEn:q.options,answer:q.answer,explanation:translated?q.explanationEn:q.explanation,optionExplanations:translated?q.optionExplanationsEn:q.optionExplanations,lang:translated?'en':'zh'};}
  // 保存失败提示（课后小测、错题专练、到期复习、综合案例共用）：写入没成功时在 host 里放一块提示和“重新保存”按钮。
  // LearningStore 在补存成功前一直保留本页内存里的记录，所以重试就是把这份再写一次；成功后提示换成“已保存”。
  function saveNotice(host){
    if(!window.LearningStore||!host)return null;
    var old=host.querySelector('[data-save-warning]');
    if(LearningStore.saved()){if(old)old.parentNode.removeChild(old);return null;}
    if(old)return old;
    var box=h('div',{class:'result-unsaved','data-save-warning':'',role:'alert'}),msg=h('p',{text:T.unsaved}),btn=h('button',{type:'button',class:'practice-check','data-save-retry':'',text:T.saveAgain});
    box.appendChild(h('p',{class:'result-unsaved-title',text:T.unsavedTitle}));box.appendChild(msg);box.appendChild(btn);
    btn.addEventListener('click',function(){var parent=box.parentNode;if(LearningStore.retry()){var ok=h('p',{class:'result-saved','data-save-ok':'',role:'status',text:T.savedNow});/* 补存成功时提示框可能已被 learning-change 撤掉，这时把“已保存”直接放回原处 */if(box.parentNode)box.parentNode.replaceChild(ok,box);else if(parent)parent.appendChild(ok);}else msg.textContent=T.stillUnsaved;});
    host.appendChild(box);return box;
  }
  var serial=0;
  function renderRound(host,questions,key,onFinish){
    while(host.firstChild)host.removeChild(host.firstChild);
    var run=String(Date.now())+'-'+(++serial),answers={},finished=false;
    var state=window.LearningStore?LearningStore.read():{},previous=key&&state.practice&&state.practice[key]||{};
    var progress=h('p',{class:'practice-progress',role:'status','aria-live':'polite'}),summary=h('p',{class:'practice-summary',hidden:''}),storageNote=h('p',{class:'practice-note'});
    host.appendChild(progress);
    function publish(initial,reset){
      var completed=Object.keys(answers).length,right=questions.filter(function(q){return answers[q.id]===q.answer;}).length;
      progress.textContent=fill(T.progress,completed,questions.length)+(completed?' · '+fill(T.score,right,completed):'');
      storageNote.textContent=window.LearningStore&&LearningStore.available()?T.saved:T.blocked;
      if(key){var parent=host.closest('[data-lesson-practice]');parent.setAttribute('data-practice-completed',completed);document.dispatchEvent(new CustomEvent('unfinished:exercise-progress',{detail:{kind:'lesson',runId:run,completed:completed,total:questions.length,initial:!!initial,reset:!!reset}}));}
      if(completed===questions.length){summary.hidden=false;summary.textContent=T.allDone;if(!finished&&!initial){finished=true;if(onFinish)onFinish();}}
    }
    questions.forEach(function(q,index){
      var field=h('fieldset',{class:'practice-question',lang:q.lang}),legend=h('legend',{text:(index+1)+'. '+q.stem}),options=h('div',{class:'practice-options'}),selected=null,radios=[];
      field.appendChild(legend);
      if(EN&&q.lang==='zh')field.appendChild(h('p',{class:'practice-note',lang:'en',text:T.fallback}));
      q.options.forEach(function(text,i){
        var input=h('input',{type:'radio',name:'practice-'+run+'-'+index,value:i}),label=h('label',{class:'practice-option'},[input,h('span',{text:String.fromCharCode(65+i)+'. '+text})]);
        input.addEventListener('change',function(){selected=i;check.disabled=false;});radios.push(input);options.appendChild(label);
      });
      var check=h('button',{type:'button',class:'practice-check',text:T.check}),result=h('div',{class:'practice-result',hidden:''});check.disabled=true;
      function reveal(answer){
        answers[q.id]=answer;radios.forEach(function(r,i){r.checked=i===answer;r.disabled=true;});check.hidden=true;result.hidden=false;
        result.appendChild(h('p',{class:'practice-outcome',text:answer===q.answer?T.right:T.wrong,lang:EN?'en':'zh'}));
        result.appendChild(h('p',{text:q.explanation}));
        var list=h('ol',{class:'practice-explanations'});q.options.forEach(function(o,i){var item=h('li',{});item.appendChild(h('strong',{text:String.fromCharCode(65+i)+'. '+o}));if(i===q.answer)item.appendChild(h('span',{class:'practice-answer-mark',text:' · '+T.correct,lang:EN?'en':'zh'}));if(i===answer)item.appendChild(h('span',{class:'practice-answer-mark',text:' · '+T.yours,lang:EN?'en':'zh'}));item.appendChild(h('p',{text:q.optionExplanations[i]}));list.appendChild(item);});result.appendChild(list);
      }
      check.addEventListener('click',function(){if(selected===null)return;var out=recordAnswer(key,q,selected,run);reveal(selected);publish(false,false);saveNotice(host);
        // 以前答错、这次答对：进度先报，再告诉伴学（只带数量和来源，不带题目内容）。
        if(out&&out.recorded&&out.result==='fix')document.dispatchEvent(new CustomEvent('unfinished:growth',{detail:{kind:'fix',count:1,src:key?'lesson':'review'}}));});
      field.appendChild(options);field.appendChild(check);field.appendChild(result);host.appendChild(field);
      var restored=storedChoice(previous[q.id]);if(restored!==null)reveal(restored);
    });
    host.appendChild(summary);
    host.appendChild(storageNote);
    if(key){var retry=h('button',{type:'button',class:'practice-reset',text:T.retry});retry.addEventListener('click',function(){if(window.LearningStore)LearningStore.write(function(s){if(s.practice)delete s.practice[key];});renderRound(host,questions,key,onFinish);document.dispatchEvent(new CustomEvent('unfinished:exercise-progress',{detail:{kind:'lesson',reset:true,completed:0,total:questions.length,runId:run}}));host.querySelector('input').focus();});host.appendChild(retry);}
    publish(true,false);
  }
  // 供“今天该复习”（assets/review/review.js）复用同一套作答界面与记录方式。
  window.UnfinishedPractice={renderRound:renderRound,normalQuestion:normalQuestion,saveNotice:saveNotice};
  // 别处补存成功（或另一处写入成功）后，页面上残留的提示一并撤掉。
  if(window.addEventListener)window.addEventListener('learning-change',function(){if(window.LearningStore&&LearningStore.saved())Array.prototype.forEach.call(document.querySelectorAll('[data-save-warning]'),function(n){n.parentNode.removeChild(n);});});
  var lesson=document.querySelector('[data-lesson-practice]');
  if(lesson){try{var data=JSON.parse(lesson.querySelector('[data-practice-data]').textContent);renderRound(lesson.querySelector('[data-practice-stage]'),data.questions,data.key);}catch(e){lesson.querySelector('[data-practice-stage]').textContent=EN?'The practice could not load. Refresh this page to try again.':'小测暂时未能加载，请刷新页面重试。';}}
  var review=document.querySelector('[data-wrong-practice]');
  if(review&&window.LearningStore){
    var bank=window.MARKET_QUESTIONS||[],byId={};bank.forEach(function(q){byId[q.id]=q;});
    var title=h('h3',{text:T.title}),intro=h('p',{text:T.intro}),status=h('p',{class:'practice-progress',role:'status'}),start=h('button',{type:'button',class:'practice-check',text:T.start}),stage=h('div',{class:'practice-stage'});
    [title,intro,status,start,h('p',{class:'practice-note',text:T.batch}),stage].forEach(function(n){review.appendChild(n);});
    function pending(){var wrong=LearningStore.read().wrong;return bank.filter(function(q){return Object.prototype.hasOwnProperty.call(wrong,q.id);});}
    function refresh(){var n=pending().length;status.textContent=n?fill(T.remaining,n):T.empty;start.disabled=!n;}
    function begin(only){var list=only?[byId[only]].filter(function(q){return q&&Object.prototype.hasOwnProperty.call(LearningStore.read().wrong,q.id);}):pending().slice(0,12);if(!list.length){status.textContent=T.stale;return;}renderRound(stage,list.map(normalQuestion),null,function(){start.textContent=T.next;refresh();});review.scrollIntoView({block:'start'});stage.querySelector('input').focus({preventScroll:true});}
    start.addEventListener('click',function(){begin();});
    document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-practice-question]');if(a){e.preventDefault();begin(a.getAttribute('data-practice-question'));}});
    window.addEventListener('learning-change',refresh);window.addEventListener('storage',refresh);refresh();
  }
})();
