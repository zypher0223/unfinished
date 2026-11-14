/* 今天该复习（2026-11-13）：把“标记学过的课程”和“答对过的错题”按 1、3、7、14、30 个自然日的间隔排进“我的学习”。
 * 题目的轮次在 LearningStore.answer() 里推进（任何地方答对到期的题都算）；课程的轮次由这里的“记得”“有点忘了”推进。
 * 记录只在 market-learning-v1 的 review 字段里，随学习记录一起导出／恢复，不联网。课程要点卡按需加载 assets/review/cards-<语言>.js。 */
(function () {
  'use strict';
  var host = document.querySelector('[data-due-review]');
  if (!host || !window.LearningStore || !LearningStore.REVIEW_DAYS) return;
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    title: 'Due for review today', intro: 'Lessons you marked as read and mistakes you later got right come back after 1, 3, 7, 14 and 30 days. Recall first, then check.',
    qHead: 'Questions to check again', qSome: '{n} question(s) you once got wrong are due for another try.', qStart: 'Start this check', qNone: 'No questions are due today.', caseDue: 'Case “{t}” is due: open it, press “Practise again” and decide again.',
    lHead: 'Lessons to recall', lNone: 'No lessons are due today.', round: 'Round {k} of {all}', recall: 'Say the main idea to yourself first, then open the key points', remember: 'I remember it', forgot: 'A bit fuzzy, reread', more: '{n} more lesson(s) are due; they will show after you finish these.',
    soon: 'Coming up in the next 7 days: {n}.', empty: 'Nothing is due today. Lessons you mark as read and mistakes you later answer correctly will appear here on schedule.', done: 'Recorded. Next review in {d} day(s).', mastered: 'Recorded. This lesson has finished all review rounds.', cards: 'The key points could not load. Open the lesson to review.', blocked: 'Browser storage is unavailable, so review progress lasts only on this page.'
  } : {
    title: '今天该复习', intro: '标记学过的课程、答错后又答对的题，会在 1、3、7、14、30 天后回来找你。先回忆，再核对。',
    qHead: '回头再测的题', qSome: '有 {n} 道以前答错、后来答对的题到了再测一次的时间。', qStart: '开始再测', qNone: '今天没有要再测的题。', caseDue: '案例“{t}”到期了：回到案例，点“重新练习并隐藏后续”再判断一次。',
    lHead: '要回忆的课程', lNone: '今天没有要回忆的课程。', round: '第 {k} / {all} 轮', recall: '先用自己的话说出这课讲了什么，再展开要点核对', remember: '记得', forgot: '有点忘了，重读', more: '还有 {n} 课到期，复习完这些后会接着出现。',
    soon: '之后 7 天内还有 {n} 项到期。', empty: '今天没有到期的复习。标记学过的课程、答错后又答对的题，会按间隔出现在这里。', done: '已记录，{d} 天后再复习。', mastered: '已记录，这课的复习轮次已全部完成。', cards: '要点没能加载，可以直接打开课程复习。', blocked: '当前浏览器无法保存记录，复习进度只在本页有效。'
  };
  var DAYS = LearningStore.REVIEW_DAYS, catalog = window.STUDY_CATALOG || [], bank = window.MARKET_QUESTIONS || [], cases = window.MARKET_CASES || [];
  var byKey = {}, byQ = {}, byCase = {};
  catalog.forEach(function (t) { byKey[t.key] = t; });
  bank.forEach(function (q) { byQ[q.id] = q; });
  cases.forEach(function (c) { byCase[c.id] = c; });
  var cards = null, cardsTried = false, SHOW = 5;
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); }
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  function lessonPath(t) { return EN ? t.path.replace(/-zh\.html$/, '-en.html') : t.path; }
  function isDate(s) { return typeof s === 'string' && !isNaN(Date.parse(s)); }

  // 课程的复习记录：没有记录时以“标记学过”的时间为第 0 轮起点；很早以前标记、没有时间的，视为今天到期。
  function lessonEntry(s, key) {
    var r = s.review && s.review['l:' + key];
    if (LearningStore.reviewOk(r)) return r;
    var c = s.courses[key] || {}, at = isDate(c.doneAt) ? c.doneAt : isDate(c.lastVisited) ? c.lastVisited : null;
    return at ? { n: 0, at: at } : { n: 0, at: '1970-01-01T00:00:00.000Z' };
  }
  function collect(now) {
    var s = LearningStore.read(), review = s.review && typeof s.review === 'object' ? s.review : {}, soonLimit = now + 7 * 864e5;
    var dueQ = [], dueCases = [], dueL = [], soon = 0;
    Object.keys(review).forEach(function (k) {
      if (k.indexOf('q:') !== 0) return;
      var id = k.slice(2), r = review[k];
      if (!LearningStore.reviewOk(r) || (!byQ[id] && !byCase[id]) || Object.prototype.hasOwnProperty.call(s.wrong, id)) return;
      if (LearningStore.reviewDue(r, now)) (byQ[id] ? dueQ : dueCases).push(id);
      else if (LearningStore.reviewDue(r, soonLimit)) soon++;
    });
    catalog.forEach(function (t) {
      if (!(s.courses[t.key] && s.courses[t.key].done)) return;
      var r = lessonEntry(s, t.key);
      if (LearningStore.reviewDue(r, now)) dueL.push({ t: t, r: r });
      else if (LearningStore.reviewDue(r, soonLimit)) soon++;
    });
    dueL.sort(function (a, b) { return Date.parse(a.r.at) - Date.parse(b.r.at); });
    return { dueQ: dueQ, dueCases: dueCases, dueL: dueL, soon: soon };
  }
  function loadCards(then) {
    if (cards || cardsTried) return then();
    cardsTried = true;
    var src = (document.querySelector('script[src*="assets/review/review.js"]') || {}).src || '';
    var sc = document.createElement('script');
    sc.src = src.replace(/review\.js(\?.*)?$/, 'cards-' + (EN ? 'en' : 'zh') + '.js$1');
    sc.onload = function () { cards = window.UNF_REVIEW_CARDS || null; then(); };
    sc.onerror = function () { then(); };
    document.head.appendChild(sc);
  }
  function cardNode(key) {
    var c = cards && cards[key];
    if (!c) return el('p', { class: 'practice-note', text: T.cards });
    var box = el('div', { class: 'due-card' }, [el('p', { class: 'summary-line', text: c.line })]);
    var ul = el('ul', { class: 'summary-points' });
    c.points.forEach(function (p) { ul.appendChild(el('li', {}, [el('b', { text: p[0] }), document.createTextNode(p[1])])); });
    box.appendChild(ul);
    return box;
  }
  function stamp(key, n) {
    var at = new Date().toISOString();
    LearningStore.write(function (s) { if (!s.review || typeof s.review !== 'object' || Array.isArray(s.review)) s.review = {}; s.review['l:' + key] = { n: n, at: at }; });
  }

  var status = el('p', { class: 'practice-progress', role: 'status', 'aria-live': 'polite' });
  var stage = el('div', { class: 'practice-stage' });
  function render() {
    var now = Date.now(), d = collect(now);
    while (host.firstChild) host.removeChild(host.firstChild);
    host.appendChild(el('h3', { id: 'due-review-title', text: T.title }));
    host.appendChild(el('p', { text: T.intro }));
    var nothing = !d.dueQ.length && !d.dueCases.length && !d.dueL.length;
    if (nothing) host.appendChild(el('p', { class: 'due-empty', text: T.empty }));
    if (d.dueQ.length || d.dueCases.length) {
      var qs = el('div', { class: 'due-block' }, [el('h4', { text: T.qHead })]);
      if (d.dueQ.length) {
        qs.appendChild(el('p', { text: fill(T.qSome, { n: d.dueQ.length }) }));
        var go = el('button', { type: 'button', class: 'practice-check', text: T.qStart });
        go.addEventListener('click', function () {
          var list = collect(Date.now()).dueQ.slice(0, 12).map(function (id) { return window.UnfinishedPractice.normalQuestion(byQ[id]); });
          if (!list.length || !window.UnfinishedPractice) return;
          window.UnfinishedPractice.renderRound(stage, list, null, function () { render(); });
          stage.scrollIntoView({ block: 'start' });
          var first = stage.querySelector('input'); if (first) first.focus({ preventScroll: true });
        });
        qs.appendChild(go);
      }
      d.dueCases.forEach(function (id) { qs.appendChild(el('p', {}, [el('a', { href: '#' + id, text: fill(T.caseDue, { t: byCase[id].title }) })])); });
      host.appendChild(qs);
    }
    host.appendChild(stage);
    if (d.dueL.length) {
      var ls = el('div', { class: 'due-block' }, [el('h4', { text: T.lHead })]);
      d.dueL.slice(0, SHOW).forEach(function (x) {
        var t = x.t, item = el('article', { class: 'due-lesson', 'data-due-lesson': t.key });
        var title = cards && cards[t.key] && cards[t.key].title || t.title;
        item.appendChild(el('h5', {}, [el('a', { href: lessonPath(t), text: title })]));
        item.appendChild(el('p', { class: 'practice-note', text: fill(T.round, { k: Math.min(x.r.n + 1, DAYS.length), all: DAYS.length }) }));
        var det = el('details', {}, [el('summary', { text: T.recall })]);
        det.addEventListener('toggle', function () { if (det.open && det.children.length === 1) loadCards(function () { det.appendChild(cardNode(t.key)); }); });
        item.appendChild(det);
        var yes = el('button', { type: 'button', class: 'practice-check', 'data-review-remember': t.key, text: T.remember });
        var no = el('a', { class: 'practice-reset due-reread', href: lessonPath(t), 'data-review-forgot': t.key, text: T.forgot });
        yes.addEventListener('click', function () { var n = x.r.n + 1; stamp(t.key, n); status.textContent = n >= DAYS.length ? T.mastered : fill(T.done, { d: DAYS[n] }); render(); if (window.UnfinishedPractice) window.UnfinishedPractice.saveNotice(host); });
        no.addEventListener('click', function () { stamp(t.key, 0); });
        item.appendChild(el('div', { class: 'due-actions' }, [yes, no]));
        ls.appendChild(item);
      });
      if (d.dueL.length > SHOW) ls.appendChild(el('p', { class: 'practice-note', text: fill(T.more, { n: d.dueL.length - SHOW }) }));
      host.appendChild(ls);
    }
    if (d.soon) host.appendChild(el('p', { class: 'practice-note', text: fill(T.soon, { n: d.soon }) }));
    if (!LearningStore.available()) host.appendChild(el('p', { class: 'practice-note', text: T.blocked }));
    host.appendChild(status);
  }
  // 作答过程中不重画（会打断正在做的这一轮），等这一轮结束的回调再刷新。
  window.addEventListener('learning-change', function () { if (!stage.firstChild) render(); });
  window.addEventListener('storage', function () { if (!stage.firstChild) render(); });
  render();
  window.UnfinishedReview = { collect: collect, render: render };
})();
