/* 未尽 · 学习小结（2026-11-13）
 * 只读本机记录，不联网：今天和近 7 天里标记已学了几课、作答了几题、答对几题、把几道旧错题答对了、有效学习多少分钟。
 * 数据来源：market-learning-v1 的 growth.events（作答事件）和 courses[].doneAt；unfinished.study.v1 的每天秒数。
 * 这些记录从本功能上线后才开始积累，不回填以前的学习，也不做“比上周进步多少”这类没有依据的比较。 */
(function () {
  'use strict';
  function dayKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  /* 纯计算，供页面和校验共用。learning、study 是读出来的对象（可为空），now 是 Date。 */
  function summarize(learning, study, now) {
    var today = dayKey(now), days = {}, i, d;
    for (i = 0; i < 7; i++) { d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); days[dayKey(d)] = true; }
    var out = { today: { read: 0, answered: 0, right: 0, fixed: 0, minutes: 0 }, week: { read: 0, answered: 0, right: 0, fixed: 0, minutes: 0 }, firstEvent: null, events: 0 };
    function add(key, field, n) { if (key === today) out.today[field] += n; if (days[key]) out.week[field] += n; }
    var events = learning && learning.growth && Array.isArray(learning.growth.events) ? learning.growth.events : [];
    events.forEach(function (e) {
      if (!e || typeof e.t !== 'string' || isNaN(Date.parse(e.t)) || ['right', 'wrong', 'fix'].indexOf(e.r) < 0) return;
      var k = dayKey(new Date(e.t)); out.events++;
      if (!out.firstEvent || e.t < out.firstEvent) out.firstEvent = e.t;
      add(k, 'answered', 1); if (e.r !== 'wrong') add(k, 'right', 1); if (e.r === 'fix') add(k, 'fixed', 1);
    });
    var courses = learning && learning.courses && typeof learning.courses === 'object' ? learning.courses : {};
    Object.keys(courses).forEach(function (key) { var c = courses[key]; if (c && c.done && typeof c.doneAt === 'string' && !isNaN(Date.parse(c.doneAt))) add(dayKey(new Date(c.doneAt)), 'read', 1); });
    var secs = study && study.d && typeof study.d === 'object' ? study.d : {};
    Object.keys(secs).forEach(function (key) { if (typeof secs[key] === 'number' && secs[key] > 0) { if (key === today) out.today.minutes += Math.floor(secs[key] / 60); if (days[key]) out.week.minutes += secs[key] / 60; } });
    out.week.minutes = Math.floor(out.week.minutes);
    out.empty = !out.week.read && !out.week.answered && !out.week.minutes;
    return out;
  }
  window.UnfinishedGrowth = { summarize: summarize };

  var host = typeof document !== 'undefined' && document.querySelector('[data-growth-summary]');
  if (!host) return;
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    title: 'Study summary', caption: 'Counts from this browser only', what: '', today: 'Today', week: 'Last 7 days',
    rows: ['Lessons marked as read', 'Questions answered', 'Answered correctly', 'Past mistakes now right', 'Active study time'], min: ' min',
    empty: 'Nothing recorded in the last 7 days yet. Mark a lesson as read or answer a question and it will show up here.',
    since: 'Answers have been recorded here since {d}. Earlier study was not logged day by day, so it is not back-filled.',
    sinceNone: 'This summary starts counting from now. Earlier study was not logged day by day, so it is not back-filled.',
    note: '“Answered” and “answered correctly” are counted separately; time spent reading is not treated as mastery.',
    clear: 'Clear answer history', sure: 'Click again to clear', cleared: 'Answer history cleared. Your mistake list, lesson marks and study time were not changed.',
    blocked: 'Browser storage is unavailable, so this summary cannot be kept.'
  } : {
    title: '学习小结', caption: '只统计当前浏览器里的记录', today: '今天', week: '近 7 天',
    rows: ['标记已学的课程', '作答题数', '其中答对', '旧错题这次答对', '有效学习时长'], min: ' 分钟',
    empty: '近 7 天还没有记录。标记一课已学或作答一题后，这里就会出现。',
    since: '作答从 {d} 起记录在这里。更早的学习没有逐日记录，所以不回填。',
    sinceNone: '小结从现在开始统计。更早的学习没有逐日记录，所以不回填。',
    note: '“作答”和“答对”分开统计；阅读停留的时间不等于掌握。',
    clear: '清空作答小结记录', sure: '再点一次确认清空', cleared: '作答小结记录已清空。错题本、已学标记和学习时长没有改动。',
    blocked: '当前浏览器无法保存记录，小结无法保留。'
  };
  function h(tag, attrs, kids) { var el = document.createElement(tag), k; for (k in (attrs || {})) { if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); } (kids || []).forEach(function (c) { if (c) el.appendChild(c); }); return el; }
  function readStudy() { try { var v = JSON.parse(localStorage.getItem('unfinished.study.v1') || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
  var status = h('p', { class: 'growth-status', role: 'status', 'aria-live': 'polite' }), armed = false;
  function render() {
    var keepStatus = status.textContent;
    while (host.firstChild) host.removeChild(host.firstChild);
    var learning = window.LearningStore ? LearningStore.read() : null, s = summarize(learning, readStudy(), new Date());
    host.appendChild(h('h3', { text: T.title }));
    if (s.empty) host.appendChild(h('p', { class: 'growth-empty', text: T.empty }));
    else {
      var vals = function (x) { return [x.read, x.answered, x.right, x.fixed, x.minutes + T.min]; }, a = vals(s.today), b = vals(s.week);
      var body = h('tbody'); T.rows.forEach(function (label, i) { body.appendChild(h('tr', {}, [h('th', { scope: 'row', text: label }), h('td', { text: String(a[i]) }), h('td', { text: String(b[i]) })])); });
      host.appendChild(h('table', { class: 'growth-table' }, [h('caption', { text: T.caption }), h('thead', {}, [h('tr', {}, [h('td', {}), h('th', { scope: 'col', text: T.today }), h('th', { scope: 'col', text: T.week })])]), body]));
      host.appendChild(h('p', { class: 'practice-note', text: T.note }));
    }
    host.appendChild(h('p', { class: 'practice-note', text: s.firstEvent ? T.since.replace('{d}', new Date(s.firstEvent).toLocaleDateString(EN ? 'en' : 'zh-CN')) : T.sinceNone }));
    if (s.events) {
      var btn = h('button', { type: 'button', class: 'practice-reset', id: 'growth-clear', text: armed ? T.sure : T.clear });
      btn.addEventListener('click', function () {
        if (!armed) { armed = true; btn.textContent = T.sure; return; }
        armed = false; status.textContent = window.LearningStore && LearningStore.available() ? T.cleared : T.blocked;
        LearningStore.write(function (st) { if (st.growth && typeof st.growth === 'object') st.growth.events = []; });
      });
      host.appendChild(btn);
    }
    status.textContent = keepStatus; host.appendChild(status);
    if (window.LearningStore && !LearningStore.available() && !status.textContent) status.textContent = T.blocked;
  }
  render();
  window.addEventListener('learning-change', render); window.addEventListener('storage', render);
})();
