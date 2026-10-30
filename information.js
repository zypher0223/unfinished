const infoData=window.MARKET_INFO||[];
const infoState={category:'all',query:''};
const infoEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const infoOpen=new Set();
function renderInformation(){
 const query=infoState.query.trim().toLowerCase();
 const found=infoData.filter(t=>(infoState.category==='all'||t.category===infoState.category)&&(!query||`${t.name} ${t.nameEn} ${t.intro} ${t.publisher}`.toLowerCase().includes(query)));
 document.getElementById('info-count').textContent=found.length;
 document.getElementById('info-empty').hidden=Boolean(found.length);
 document.getElementById('info-results').innerHTML=found.map(t=>`<details class="info-entry" id="info-${t.id}" data-id="${t.id}" ${infoOpen.has(t.id)?'open':''}><summary><span class="info-number">${String(t.id).padStart(2,'0')}</span><span class="info-name">${infoEsc(t.name)}<small lang="en">${infoEsc(t.nameEn)}</small></span><span class="info-frequency">${infoEsc(t.frequency)}</span><a class="info-arrow" href="info/${t.id}.html" aria-label="查看${infoEsc(t.name)}的推荐教程"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg></a></summary><div class="info-introduction"><h3>先用一句话理解</h3><p>${infoEsc(t.intro)}</p><h3>发布机构与历史</h3><p>${infoEsc(t.publisher)}</p><p>${infoEsc(t.history)}</p></div></details>`).join('');
 document.querySelectorAll('.info-entry').forEach(entry=>entry.addEventListener('toggle',()=>{if(entry.open)infoOpen.add(Number(entry.dataset.id));else infoOpen.delete(Number(entry.dataset.id));}));
 document.querySelectorAll('.info-arrow').forEach(link=>link.addEventListener('click',e=>e.stopPropagation()));
}
document.getElementById('info-query').addEventListener('input',e=>{infoState.query=e.target.value;renderInformation();});
document.getElementById('information-search').addEventListener('submit',e=>{e.preventDefault();document.querySelector('.information-catalog').scrollIntoView();});
document.querySelectorAll('[data-info-category]').forEach(button=>button.addEventListener('click',()=>{infoState.category=button.dataset.infoCategory;document.querySelectorAll('[data-info-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderInformation();}));
renderInformation();
if(/^#info-\d+$/.test(location.hash))document.getElementById(location.hash.slice(1))?.scrollIntoView();
