/* 未尽 · 界面语言 (2026-10-31)
 * Loaded synchronously in <head> on every page. Picks the interface language (site settings, else the
 * browser language), and in English:
 *  - Chinese resource pages (courses/N, info/N) forward to the English written lesson;
 *  - hub pages (home, catalogs, my learning, quiz, figures) get their interface text swapped for English
 *    from assets/i18n/en.js, and every lesson link points to the English lesson.
 * Lesson pages keep their own language (learn/N-zh / learn/N-en); Chinese content is never changed.
 * Choosing 中文 / English in a lesson's language switch also updates the site setting. */
(function () {
  'use strict';
  if (window.UNF_LANG) return;
  var SKEY = 'unfinished.settings.v1';
  function settings() { try { var s = JSON.parse(localStorage.getItem(SKEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch (e) { return {}; } }
  function setLang(l) { var s = settings(); s.lang = l; try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} }
  var lang = settings().lang;
  if (lang !== 'en' && lang !== 'zh') { var nl = (navigator.languages && navigator.languages[0]) || navigator.language || 'zh'; lang = /^zh/i.test(nl) ? 'zh' : 'en'; }
  window.UNF_LANG = lang;
  window.UNF_SET_LANG = setLang;

  var me = document.currentScript, src = me ? me.src : '';
  var ASSETS = src.replace(/i18n\/i18n\.js.*$/, ''), ROOT = ASSETS.replace(/assets\/$/, '');
  var path = location.pathname;
  var lessonM = path.match(/\/(info\/)?learn\/(\d+)-(zh|en)\.html$/);

  // a lesson's own 中文 / English switch also sets the site language
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.lesson-header nav a[href]'); if (!a) return;
    var m = a.getAttribute('href').match(/-(zh|en)\.html$/); if (m) setLang(m[1]);
  }, true);

  if (lang !== 'en') return;

  var m;
  if ((m = path.match(/\/courses\/(\d+)\.html$/))) { location.replace(ROOT + 'learn/' + m[1] + '-en.html'); return; }
  if ((m = path.match(/\/info\/(\d+)\.html$/))) { location.replace(ROOT + 'info/learn/' + m[1] + '-en.html'); return; }

  function fixLinks(scope) {
    (scope || document).querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href'), n = h;
      if (lessonM && (a.matches('.lesson-header > a:first-child') || a.closest('.lesson-footer')) && /(courses|info)\/\d+\.html|^\.\.\/\d+\.html/.test(h)) {
        n = ROOT + (lessonM[1] ? 'information.html' : 'technical.html');
      } else {
        n = h.replace(/(^|\/)learn\/(\d+)-zh\.html/, '$1learn/$2-en.html')
             .replace(/(^|\/)courses\/(\d+)\.html/, '$1learn/$2-en.html')
             .replace(/(^|\/)info\/(\d+)\.html/, '$1info/learn/$2-en.html');
      }
      if (n !== h) a.setAttribute('href', n);
    });
  }
  if (lessonM) { document.addEventListener('DOMContentLoaded', function () { fixLinks(); }); return; }

  /* ---------- English interface for hub pages ---------- */
  var html = document.documentElement;
  html.lang = 'en'; html.classList.add('i18n-en', 'i18n-pending');
  document.write('<style>html.i18n-pending body{visibility:hidden}html.i18n-en .night-hero-copy h1{font-size:clamp(34px,3.8vw,62px);white-space:normal}html.i18n-en .folio-section-label{font-size:13px;letter-spacing:.03em}html.i18n-en .folio-introduction{grid-template-columns:76px minmax(0,1fr)}html.i18n-en .folio-origin{grid-template-columns:76px minmax(0,1fr) auto}.i18n-note{margin:12px 0;padding:10px 14px;border:1px solid rgba(200,159,96,.45);border-radius:12px;background:rgba(200,159,96,.08);color:#e2c48f;font-size:14px}</style><script src="' + ASSETS + 'i18n/en.js?v=2"><\/script>');

  function E() { return window.UNF_EN || { dict: {}, folio: {}, names: {} }; }
  function hook(name, fn) { var v; try { Object.defineProperty(window, name, { configurable: true, get: function () { return v; }, set: function (x) { v = fn(x); } }); } catch (e) {} }
  hook('FOLIO_DATA', function (d) {
    if (!d) return d; var F = E().folio;
    ['technical', 'information'].forEach(function (k) { (d[k] || []).forEach(function (t) { var o = F[t.key]; if (o) for (var f in o) t[f] = o[f]; }); });
    return d;
  });
  hook('STUDY_CATALOG', function (c) {
    var N = E().names; (Array.isArray(c) ? c : []).forEach(function (t) {
      if (N[t.key]) t.title = N[t.key];
      if (t.path) t.path = t.path.replace(/-zh\.html$/, '-en.html');
      if (t.hub) t.hub = t.hub.replace(/^courses\/(\d+)\.html$/, 'learn/$1-en.html').replace(/^info\/(\d+)\.html$/, 'info/learn/$1-en.html');
    });
    return c;
  });

  var CJK = /[㐀-鿿]/;
  function D(k) { return E().dict[k]; }
  var LV = { '入门': 'Beginner', '进阶': 'Advanced', '中级': 'Intermediate' };
  var P = [
    [/^(.+?)（(\d+)）$/, function (m) { var a = D(m[1]); return a ? a + ' (' + m[2] + ')' : null; }],
    [/^(\d+) 个主题$/, function (m) { return m[1] + ' topics'; }],
    [/^返回全部 (\d+) 个条目$/, function (m) { return 'Back to all ' + m[1] + ' topics'; }],
    [/^已读 (\d+)\/(\d+) 课$/, function (m) { return m[1] + '/' + m[2] + ' lessons read'; }],
    [/^已标记学过 (\d+) \/ (\d+) 项；收藏 (\d+) 项。$/, function (m) { return 'Marked as read: ' + m[1] + ' / ' + m[2] + ' · Saved: ' + m[3] + '.'; }],
    [/^(.+) · (\d+) 项$/, function (m) { return { '数据是什么，市场为什么会有反应': 'What the data is and why markets react', '从图表读懂变化，用练习检验理解': 'Read change on charts, test it with practice' }[m[1]] ? { '数据是什么，市场为什么会有反应': 'What the data is and why markets react', '从图表读懂变化，用练习检验理解': 'Read change on charts, test it with practice' }[m[1]] + ' · ' + m[2] + ' topics' : null; }],
    [/^已选择：(.+)。简介已更新。$/, function (m) { return 'Selected: ' + (D(m[1]) || m[1]) + '. Overview updated.'; }],
    [/^(.+) · (.+) · 第 (\d+) 题$/, function (m) { return (D(m[1]) || m[1]) + ' · ' + (LV[m[2]] || m[2]) + ' · Question ' + m[3]; }],
    [/^已答 (\d+) \/ (\d+)$/, function (m) { return 'Answered ' + m[1] + ' / ' + m[2]; }],
    [/^第(\d+)题，(.+)$/, function (m) { return 'Question ' + m[1] + ', ' + (m[2] === '未答' ? 'unanswered' : 'answered'); }],
    [/^本次答对 (\d+) \/ (\d+) 题$/, function (m) { return 'You got ' + m[1] + ' / ' + m[2] + ' right'; }],
    [/^(.+) · (.+)。先看判断理由，再回到相关课程复习。$/, function (m) { return (D(m[1]) || m[1]) + ' · ' + (LV[m[2]] || m[2]) + '. Read the reasoning first, then review the related lessons.'; }],
    [/^第 (\d+) 题 · (.+)$/, function (m) { return 'Question ' + m[1] + ' · ' + ({ '答对': 'Correct', '正确': 'Correct', '需要复习': 'Needs review', '答错': 'Wrong' }[m[2]] || D(m[2]) || m[2]); }],
    [/^复习相关课程 (\S+)$/, function (m) { return 'Review lesson ' + m[1]; }],
    [/^复习信息课程 (\S+)$/, function (m) { return 'Review information lesson ' + m[1]; }],
    [/^这台设备上次成绩：(.+) · (.+)，(\d+)\/(\d+)。$/, function (m) { return 'Last score on this device: ' + (D(m[1]) || m[1]) + ' · ' + (LV[m[2]] || m[2]) + ', ' + m[3] + '/' + m[4] + '.'; }],
    [/^上次选择：(.*)$/, function (m) { return 'Last choice: ' + (D(m[1]) || m[1]); }],
    [/^([A-D])\. (.+)$/, function (m) { var a = D(m[2]); return a ? m[1] + '. ' + a : null; }],
    [/^继续学习：(.+)$/, function (m) { return 'Continue learning: ' + (D(m[1]) || m[1]); }],
    [/^(.+) \| 未尽 UNFINISHED$/, function (m) { var a = D(m[1]) || TITLES[m[1]]; return a ? a + ' | 未尽 UNFINISHED' : null; }]
  ];
  var TITLES = { '主题学习': 'Topics', '信息面': 'Information', '技术面': 'Technical', '我的学习': 'My learning', '成果检测': 'Check your understanding', '学习路线': 'Learning paths', '读图图解': 'Chart walkthroughs' };
  function tr(raw) {
    var k = raw.replace(/\s+/g, ' ').trim(); if (!k || !CJK.test(k)) return null;
    var out = D(k);
    if (out == null) for (var i = 0; i < P.length && out == null; i++) { var mm = k.match(P[i][0]); if (mm) out = P[i][1](mm); }
    if (out == null) return null;
    var lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
    return (lead ? ' ' : '') + out + (tail ? ' ' : '');
  }
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var SKIP = 'script,style,.uai,.ucp,.ucp-dialog';
  function walk(node) {
    if (node.nodeType === 3) { var p = node.parentElement; if (p && !p.closest(SKIP)) { var t = tr(node.nodeValue); if (t != null && t !== node.nodeValue) node.nodeValue = t; } return; }
    if (node.nodeType !== 1 || node.closest(SKIP)) return;
    ATTRS.forEach(function (a) { var v = node.getAttribute(a); if (v && CJK.test(v)) { var t = tr(v); if (t != null) node.setAttribute(a, t.trim()); } });
    if (node.tagName === 'A') fixLinks(node.parentNode || node);
    var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { var pe = n.parentElement; if (pe && !pe.closest(SKIP)) { var x = tr(n.nodeValue); if (x != null && x !== n.nodeValue) n.nodeValue = x; } }
      else if (!n.closest(SKIP)) ATTRS.forEach(function (a) { var v = n.getAttribute(a); if (v && CJK.test(v)) { var t = tr(v); if (t != null) n.setAttribute(a, t.trim()); } });
    }
  }
  function notice(text) {
    var main = document.querySelector('main'); if (!main) return;
    var p = document.createElement('p'); p.className = 'i18n-note'; p.textContent = text;
    var h = main.querySelector('h1'); if (h && h.parentNode) h.parentNode.insertBefore(p, h.nextSibling); else main.insertBefore(p, main.firstChild);
  }
  function run() {
    var t = tr(document.title); if (t) document.title = t.trim();
    if (/assessment\.html$/.test(path)) notice('Quiz questions are currently available in Chinese only.');
    if (/figures\.html$/.test(path)) notice('These chart walkthroughs are currently in Chinese only. Each English lesson includes its own annotated chart.');
    walk(document.body); fixLinks();
    new MutationObserver(function (list) {
      list.forEach(function (r) {
        if (r.type === 'characterData') walk(r.target);
        else if (r.type === 'attributes') walk(r.target);
        else r.addedNodes.forEach(walk);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['href']) });
    html.classList.remove('i18n-pending');
  }
  document.addEventListener('DOMContentLoaded', run);
  setTimeout(function () { html.classList.remove('i18n-pending'); }, 2500);
})();
