/* 入门定级（2026-11-13）：两道自我介绍 + 8 道题库原题，交卷后推荐从哪条学习路线开始。
 * 题目在构建时从题库固定挑选（build-extras.mjs），解析沿用题库原文。结果只显示在本页：不写错题本、不记成绩、不上传。 */
(function () {
  'use strict';
  var host = document.querySelector('[data-placement]'); if (!host) return;
  var data; try { data = JSON.parse(host.querySelector('[data-placement-data]').textContent); } catch (e) { return; }
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    goal: 'What do you want to learn first?', goals: [['market', 'Markets and trading: stocks, crypto prices, charts and data'], ['web3', 'Web3: how blockchains and crypto apps work, and the industry'], ['both', 'Both / not sure yet']],
    exp: 'How much have you done so far?', exps: [['0', 'Never looked at a price chart'], ['1', 'Looked at charts but do not know the indicators'], ['2', 'Use a few indicators or read some data releases'], ['3', 'Have traded or followed the market for a while']],
    know: 'Eight short questions', knowHint: 'If you do not know, choose “I don’t know yet”; guessing makes the suggestion less useful.', idk: 'I don’t know yet',
    submit: 'See my starting point', missing: 'Answer the two questions about you first.', unanswered: '{n} question(s) left blank count as “don’t know”.',
    score: 'You got {r} of {n} right.', levels: { start: 'Start from the basics.', mid: 'You have the basics; build the main reading skills next.', adv: 'You can go straight to the in-depth routes.' },
    routes: 'Suggested routes', quiz: 'When you finish a route, check yourself with the formal test:', quizLink: 'Open the test', review: 'Questions to look at again', yours: 'Your answer', right: 'Correct answer', none: 'No answer', lesson: 'Lesson:',
    note: 'This is a rough suggestion from 8 questions, not a measure of ability. Nothing here is saved, added to your mistakes or sent anywhere.', again: 'Start over'
  } : {
    goal: '你最想先学什么？', goals: [['market', '市场与交易：股票、币价、K 线图和经济数据'], ['web3', 'Web3：区块链和加密应用怎么运作，以及这个行业'], ['both', '都想看看 / 还没想好']],
    exp: '你现在大概到哪一步？', exps: [['0', '从没看过价格图'], ['1', '看过 K 线，但不懂指标'], ['2', '会用几个指标，或看过一些经济数据'], ['3', '交易过或跟市场有一段时间了']],
    know: '8 道小题', knowHint: '不会就选“还不知道”，硬猜会让推荐不准。', idk: '还不知道',
    submit: '看看我从哪里开始', missing: '先回答上面两道关于你的问题。', unanswered: '还有 {n} 题没选，按“还不知道”计算。',
    score: '8 道题答对 {r} 道。', levels: { start: '建议从基础开始。', mid: '基础已经有了，接下来练主要的读图和读数据能力。', adv: '可以直接进入进阶路线。' },
    routes: '推荐的学习路线', quiz: '学完一条路线，可以用正式测验检查自己：', quizLink: '去做测验', review: '值得再看一眼的题', yours: '你的选择', right: '正确答案', none: '没有作答', lesson: '对应课程：',
    note: '这只是根据 8 道题给的粗略建议，不是能力评定。本页不保存任何记录，不加入错题本，也不上传。', again: '重新开始'
  };
  // 推荐表：目标 × 水平 → 路线 id 与对应测验范围。
  var PLAN = {
    market: { start: [['basics', 'technical'], 'basics'], mid: [['technical', 'information'], 'all'], adv: [['price-action', 'discipline', 'options'], 'method'] },
    web3: { start: [['basics'], 'basics'], mid: [['crypto'], 'crypto'], adv: [['ecosystem', 'frontier', 'career'], 'ecosystem'] },
    both: { start: [['basics'], 'basics'], mid: [['technical', 'crypto'], 'market'], adv: [['discipline', 'ecosystem'], 'market'] }
  };
  function level(right, total, exp) { var lv = right <= Math.floor(total * 0.4) ? 'start' : right <= Math.floor(total * 0.7) ? 'mid' : 'adv'; if (exp === 0 && lv === 'adv') lv = 'mid'; return lv; }
  window.UnfinishedPlacement = { level: level, PLAN: PLAN };
  var C = EN ? ': ' : '：';
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  function q(x) { var tr = EN && x.stemEn && x.optionsEn; return { stem: tr ? x.stemEn : x.stem, options: tr ? x.optionsEn : x.options, explanation: tr ? x.explanationEn : x.explanation, lang: EN && tr ? 'en' : 'zh' }; }
  function radios(name, opts, legend, cls) {
    var fs = el('fieldset', { class: 'practice-question ' + (cls || '') }, [el('legend', { text: legend })]), box = el('div', { class: 'practice-options' });
    opts.forEach(function (o, i) { box.appendChild(el('label', { class: 'practice-option' }, [el('input', { type: 'radio', name: name, value: String(o[0]) }), el('span', { text: o[1] })])); });
    fs.appendChild(box); return fs;
  }
  var form, out = el('div', { class: 'placement-result', tabindex: '-1', 'aria-live': 'polite' }), base = host.getAttribute('data-base') || '';
  function build() {
    while (host.firstChild && host.firstChild.tagName !== 'SCRIPT') host.removeChild(host.firstChild);
    form = el('form', { class: 'placement-form', novalidate: '' });
    form.appendChild(radios('goal', T.goals, T.goal));
    form.appendChild(radios('exp', T.exps, T.exp));
    form.appendChild(el('h2', { text: T.know }));
    form.appendChild(el('p', { class: 'practice-note', text: T.knowHint }));
    data.questions.forEach(function (x, n) { var v = q(x); var opts = v.options.map(function (o, i) { return [i, String.fromCharCode(65 + i) + '. ' + o]; }); opts.push(['-1', T.idk]); var f = radios('q' + n, opts, (n + 1) + '. ' + v.stem); f.setAttribute('lang', v.lang); form.appendChild(f); });
    var msg = el('p', { class: 'practice-note', role: 'status' });
    form.appendChild(el('button', { type: 'submit', class: 'test-primary', text: T.submit })); form.appendChild(msg);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var g = form.querySelector('input[name=goal]:checked'), x = form.querySelector('input[name=exp]:checked');
      if (!g || !x) { msg.textContent = T.missing; (g ? form.querySelector('input[name=exp]') : form.querySelector('input[name=goal]')).focus(); return; }
      var picks = data.questions.map(function (qq, n) { var c = form.querySelector('input[name=q' + n + ']:checked'); return c ? Number(c.value) : null; });
      result(g.value, Number(x.value), picks);
    });
    host.insertBefore(form, host.firstChild); host.insertBefore(out, form.nextSibling);
    while (out.firstChild) out.removeChild(out.firstChild);
  }
  function result(goal, exp, picks) {
    var right = 0, blank = 0; picks.forEach(function (p, n) { if (p === null) blank++; if (p === data.questions[n].answer) right++; });
    var lv = level(right, data.questions.length, exp), plan = PLAN[goal][lv];
    while (out.firstChild) out.removeChild(out.firstChild);
    if (blank) out.appendChild(el('p', { class: 'practice-note', text: fill(T.unanswered, { n: blank }) }));
    out.appendChild(el('h2', { text: fill(T.score, { r: right, n: data.questions.length }) }));
    out.appendChild(el('p', { class: 'placement-level', text: T.levels[lv] }));
    out.appendChild(el('h3', { text: T.routes }));
    var ul = el('ul', { class: 'placement-routes' });
    plan[0].forEach(function (id) { var r = data.routes[id]; if (!r) return; ul.appendChild(el('li', {}, [el('a', { href: base + 'study.html#route-' + id, text: r.name }), el('p', { text: r.description })])); });
    out.appendChild(ul);
    out.appendChild(el('p', {}, [T.quiz + ' ', el('a', { href: base + 'assessment.html?scope=' + plan[1], text: T.quizLink })]));
    var missed = data.questions.map(function (x, n) { return { x: x, p: picks[n] }; }).filter(function (o) { return o.p !== o.x.answer; });
    if (missed.length) {
      out.appendChild(el('h3', { text: T.review }));
      missed.forEach(function (o) {
        var v = q(o.x), art = el('article', { class: 'review-item', lang: v.lang }, [el('h4', { text: v.stem })]);
        art.appendChild(el('p', { text: T.yours + C + (o.p == null || o.p < 0 ? T.none : v.options[o.p]) }));
        art.appendChild(el('p', { text: T.right + C + v.options[o.x.answer] }));
        art.appendChild(el('p', { text: v.explanation }));
        if (o.x.lessons && o.x.lessons.length) { var p = el('p', {}, [T.lesson + ' ']); o.x.lessons.forEach(function (l, i) { if (i) p.appendChild(document.createTextNode(' · ')); p.appendChild(el('a', { href: base + (EN ? l.path.replace(/-zh\.html$/, '-en.html') : l.path), text: l.title })); }); art.appendChild(p); }
        out.appendChild(art);
      });
    }
    out.appendChild(el('p', { class: 'lesson-note', text: T.note }));
    var again = el('button', { type: 'button', class: 'practice-reset', text: T.again }); again.addEventListener('click', function () { build(); window.scrollTo(0, 0); }); out.appendChild(again);
    out.focus({ preventScroll: true }); out.scrollIntoView({ block: 'start' });
  }
  build();
})();
