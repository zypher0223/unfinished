const data = window.ATLAS_DATA || [];
const learning = window.ATLAS_LESSONS || {};
const courses=window.ATLAS_COURSES||{};
const hasVideo=(id,lane)=>Boolean(courses[id]?.[lane]?.course?.length);
const state = {type:'all', difficulty:'all', language:'all', query:'', limit:16};
const openIds=new Set();
const $ = selector => document.querySelector(selector);

const typeLabel = {indicator:'可计算指标',tool:'图表与数据',method:'技术分析方法'};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const lessonUrl = (id, lang='zh') => `learn/${id}-${lang}.html`;
const difficultyTags = value => ['入门','中级','进阶'].filter(tag => value.includes(tag));
const difficultyLabel = value => value==='入门'?'初级':value==='进阶'?'高级':value;
function splitName(name) {
  const at = name.search(/[\u3400-\u9fff]/);
  return at>0 ? {main:name.slice(0,at).trim(),sub:name.slice(at)} : {main:name,sub:''};
}
function filtered() {
  const query = state.query.trim().toLowerCase();
  return data.filter(item => (state.type==='all'||item.type===state.type)
    && (state.difficulty==='all'||difficultyTags(item.difficulty).includes(state.difficulty))
    && (state.language==='all'||state.language==='text'||hasVideo(item.id,state.language))
    && (!query||`${item.name} ${learning[item.id]?.origin.name||''}`.toLowerCase().includes(query)));
}
function difficulty(item) {
  const count=item.difficulty.includes('进阶')?3:item.difficulty.includes('中级')?2:1;
  return `<span class="dots" aria-label="难度：${esc(item.difficulty)}">${[1,2,3].map(n=>`<i class="${n<=count?'on':''}"></i>`).join('')}<small>${esc(difficultyLabel(item.difficulty))}</small></span>`;
}
function introduction(item) {
  const lesson=learning[item.id];
  if(!lesson)return '';
  return `<div class="intro-grid"><section><h3>先用一句话讲清楚</h3><p>${esc(lesson.intro)}</p><h3>用生活里的例子理解</h3><p>${esc(lesson.analogy)}</p></section><section><h3>提出者与来源</h3><p class="creator-name">${esc(lesson.origin.name)}</p><p>${esc(lesson.origin.detail)}</p><p class="origin-note">这里区分首创、推广与历史来源；找不到可靠首创记录时不指定某一人。</p></section></div>`;
}
function row(item) {
  const name=splitName(item.name);
  const intro=learning[item.id]?.intro||'';
  return `<details class="entry" data-id="${item.id}" id="topic-${item.id}" ${openIds.has(item.id)?'open':''}><summary class="entry-row"><span class="number">${String(item.id).padStart(3,'0')}</span><span class="entry-name"><b>${esc(name.main)}</b>${name.sub?`<small>${esc(name.sub)}</small>`:''}</span><span class="entry-desc">${esc(intro)}</span><span class="tag">${typeLabel[item.type]}</span>${difficulty(item)}<a class="course-arrow" href="courses/${item.id}.html" aria-label="查看${esc(item.name)}的推荐教程"><span>推荐教程</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg></a></summary><div class="entry-detail">${introduction(item)}</div></details>`;
}
function render() {
  const found=filtered();
  $('#results').innerHTML=found.slice(0,state.limit).map(row).join('');
  $('#results').querySelectorAll('details.entry').forEach(entry=>entry.addEventListener('toggle',()=>{if(entry.open)openIds.add(Number(entry.dataset.id));else openIds.delete(Number(entry.dataset.id));}));
  $('#results').querySelectorAll('.course-arrow').forEach(link=>link.addEventListener('click',event=>event.stopPropagation()));
  $('#result-count').textContent=found.length;
  $('#ranked-count').textContent=found.filter(item=>learning[item.id]).length;
  $('#pending-count').textContent=found.filter(item=>['bili','ytzh','yten'].some(lane=>hasVideo(item.id,lane))).length;
  $('#empty').hidden=found.length>0;
  $('#load-more').hidden=state.limit>=found.length;
  document.querySelectorAll('[data-rail]').forEach(button=>{
    const selected=button.dataset.rail===state.type;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });

}
function bind(selector,key) {
  document.querySelectorAll(selector).forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll(selector).forEach(other=>{
      const selected=other===button;
      other.classList.toggle('active',selected);other.setAttribute('aria-pressed',String(selected));
    });
    state[key]=button.dataset[key];state.limit=16;render();
  }));
}
bind('[data-type]','type');bind('[data-difficulty]','difficulty');bind('[data-language]','language');
document.querySelectorAll('[data-rail]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelector(`[data-type="${button.dataset.rail}"]`).click();$('#catalog').scrollIntoView();
}));
$('#query').addEventListener('input',event=>{state.query=event.target.value;state.limit=16;render();});
$('#search-form').addEventListener('submit',event=>{event.preventDefault();$('#catalog').scrollIntoView();});
$('#load-more').addEventListener('click',()=>{state.limit+=16;render();});
$('#reset').addEventListener('click',()=>{location.href='technical.html';});
render();

const returnId=Number(location.hash.match(/^#topic-(\d+)$/)?.[1]);
if(returnId){state.limit=Math.max(16,data.findIndex(item=>item.id===returnId)+1);render();document.getElementById(`topic-${returnId}`)?.scrollIntoView();}
