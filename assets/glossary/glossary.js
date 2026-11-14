/* 术语表（2026-11-13）：汇总课程页的术语旁注和第 128 课起的“定义”，可搜索、按方向筛选，点课程名回到讲它的那一课。
 * 数据由 build-extras.mjs 从构建好的课程页摘出（assets/glossary/terms-zh.js、terms-en.js），不另写解释。 */
(function () {
  'use strict';
  var host = document.querySelector('[data-glossary]'); if (!host) return;
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0, base = host.getAttribute('data-base') || '';
  var T = EN ? { search: 'Search terms', ph: 'e.g. RSI, stablecoin, CPI', all: 'All', market: 'Markets · Technical', info: 'Markets · Information', web3: 'Web3', count: '{n} terms', empty: 'No matching term. Try a shorter word, or search the lesson catalogue.', from: 'Explained in', also: 'Also in', load: 'The glossary could not load. Refresh to try again.', def: 'Lesson definition' }
    : { search: '查找术语', ph: '例如 RSI、稳定币、CPI', all: '全部', market: '市场 · 技术面', info: '市场 · 信息面', web3: 'Web3', count: '共 {n} 条', empty: '没有找到匹配的术语。试试更短的词，或到课程目录里查找。', from: '出自', also: '也出现在', load: '术语表没能加载，请刷新重试。', def: '课程定义' };
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  var src = (document.querySelector('script[src*="assets/glossary/glossary.js"]') || {}).src || '';
  var sc = document.createElement('script');
  sc.src = src.replace(/glossary\.js(\?.*)?$/, 'terms-' + (EN ? 'en' : 'zh') + '.js$1');
  sc.onload = function () { start(window.UNF_GLOSSARY || []); };
  sc.onerror = function () { host.appendChild(el('p', { text: T.load })); };
  document.head.appendChild(sc);

  function start(items) {
    var id = 'glossary-q', input = el('input', { id: id, type: 'search', autocomplete: 'off', placeholder: T.ph }), group = 'all';
    var bar = el('div', { class: 'glossary-tools' }, [el('label', { for: id, class: 'sr-only', text: T.search }), input]);
    var tabs = el('div', { class: 'folio-types glossary-tabs', role: 'group', 'aria-label': T.search });
    [['all', T.all], ['market', T.market], ['info', T.info], ['web3', T.web3]].forEach(function (g) {
      var b = el('button', { type: 'button', 'aria-pressed': String(g[0] === group) }, [el('span', { text: g[1] }), ' ', el('span', { text: String(g[0] === 'all' ? items.length : items.filter(function (x) { return x.g === g[0]; }).length) })]);
      b.addEventListener('click', function () { group = g[0]; Array.prototype.forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); render(); });
      tabs.appendChild(b);
    });
    var count = el('p', { class: 'glossary-count', 'aria-live': 'polite' }), list = el('dl', { class: 'glossary-list' }), empty = el('p', { class: 'glossary-empty', hidden: '', text: T.empty });
    [bar, tabs, count, list, empty].forEach(function (n) { host.appendChild(n); });
    var q0 = ''; try { q0 = new URLSearchParams(location.search).get('q') || ''; } catch (e) {}
    if (q0) input.value = q0;
    function norm(s) { return String(s).toLowerCase().replace(/[\s·・\-_/()（）]/g, ''); }
    function render() {
      var q = norm(input.value), shown = 0;
      while (list.firstChild) list.removeChild(list.firstChild);
      var frag = document.createDocumentFragment(), letter = '';
      // 有搜索词时：术语名里命中的排在前面，只在解释里命中的排在后面。
      var pool = items.filter(function (x) { return (group === 'all' || x.g === group) && (!q || norm(x.term + ' ' + x.name + ' ' + x.def).indexOf(q) >= 0); });
      if (q) pool = pool.filter(function (x) { return norm(x.term + x.name).indexOf(q) >= 0; }).concat(pool.filter(function (x) { return norm(x.term + x.name).indexOf(q) < 0; }));
      pool.forEach(function (x) {
        var L = (x.term[0] || '#').toUpperCase(); L = /[A-Z]/.test(L) ? L : /[0-9]/.test(L) ? '0–9' : (EN ? 'Other' : '中文');
        if (!q && L !== letter) { letter = L; frag.appendChild(el('div', { class: 'glossary-letter', 'aria-hidden': 'true', text: L })); }
        var dt = el('dt', {}, [el('b', { text: x.term }), x.name ? ' ' : '', x.name ? el('span', { text: x.name }) : null]);
        var dd = el('dd', {}, [el('p', { text: x.def })]);
        var meta = el('p', { class: 'glossary-from' }, [(x.isDef ? T.def + ' · ' : '') + T.from + ' ', el('a', { href: base + x.path, text: x.title })]);
        if (x.more && x.more.length) { meta.appendChild(document.createTextNode(' · ' + T.also + ' ')); x.more.forEach(function (m, i) { if (i) meta.appendChild(document.createTextNode(EN ? ', ' : '、')); meta.appendChild(el('a', { href: base + m.path, text: m.title })); }); }
        dd.appendChild(meta); frag.appendChild(dt); frag.appendChild(dd); shown++;
      });
      list.appendChild(frag);
      count.textContent = T.count.replace('{n}', shown); empty.hidden = shown > 0;
    }
    var timer; input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 120); });
    render();
  }
})();
