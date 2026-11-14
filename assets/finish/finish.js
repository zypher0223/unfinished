/* 路线完成小结（2026-11-14，用户选定方案 C：卡通月亮 + 月未央）。
 * 在课程页点“标记已学”读完一条路线的最后一课时，由伴学（月未央）自动弹出一张 1200×1500 的小结图片，可保存。
 * 伴学关闭、手动睡眠或本页隐藏时不弹（伴学说了话才打开，见 companion.js 的 unfinished:route-finished）；
 * 那次记为待弹（finishPending），以后在课程页伴学醒着时补弹一次。弹过的记在 market-learning-v1 的 finished，每条路线只自动弹一次；
 * 之后可在“学习路线”里已读完的路线下方点“查看完成小结”再看。
 * 图片在本页用 canvas 画出，不上传。路线与课程对应表、题目答案表由 build-extras.mjs 生成（route-keys.js、answers.js）。
 * 数字全部来自本机学习记录：已读课数、这条路线课后小测的答对题数、这些课程的学习时长。只作学习记录，不是证书或能力证明。 */
(function () {
  'use strict';
  var routes = window.UNF_ROUTE_KEYS || [];
  if (!routes.length || !window.LearningStore) return;
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    make: 'View route summary', notYet: 'When you finish every lesson on this route, Yue will bring you a summary picture ({a}/{b} read).', dialog: 'Route summary', save: 'Save picture', close: 'Close', alt: 'Route summary picture: {name}. {a} of {b} lessons read; lesson quizzes {r} of {q} correct; study time {t}.',
    note: 'Made in your browser from this device’s learning record; nothing is uploaded. It is a keepsake of your study, not a certificate or proof of ability.',
    title: 'Route complete!', says: ['You really finished this route!', 'N-not that I was waiting', 'to praise you or anything.'], by: '— Yue Weiyang', read: 'lessons read', quiz: 'lesson quiz correct', time: 'study time on these lessons', foot: 'Learning has no finish line.', h: ' h ', m: ' min', fail: 'The picture could not be made. Refresh the page and try again.'
  } : {
    make: '查看完成小结', notYet: '读完这条路线的全部课程后，月未央会把完成小结送到你面前（已读 {a}/{b}）。', dialog: '路线完成小结', save: '保存图片', close: '收起', alt: '路线完成小结图片：{name}。已读 {a} / {b} 课；课后小测答对 {r} / {q} 题；学习时长 {t}。',
    note: '图片在你的浏览器里按本机学习记录生成，不上传。它是学习的纪念，不是证书，也不代表能力评定。',
    title: '路线完成！', says: ['这条路线你真的走完了！', '才、才不是特意等着夸你的。'], by: '—— 月未央', read: '课已读', quiz: '课后小测答对', time: '这些课的学习时长', foot: '学习没有终点。', h: ' 小时 ', m: ' 分', fail: '图片没能生成，请刷新页面再试。'
  };
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); }
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  var base = ((document.querySelector('script[src*="assets/finish/finish.js"]') || {}).src || '').replace(/finish\/finish\.js.*$/, '');

  // 纯计算：一条路线的统计。study 是 unfinished.study.v1 读出的对象（可能为 null）。
  function stats(route, s, study, answers) {
    var keys = route.keys, done = 0, right = 0, total = 0, secs = 0; answers = answers || {};
    keys.forEach(function (k) {
      if (s.courses[k] && s.courses[k].done) done++;
      var pr = s.practice && s.practice[k]; total += 3;
      if (pr && typeof pr === 'object') Object.keys(pr).forEach(function (id) { if (Object.prototype.hasOwnProperty.call(answers, id) && pr[id] && pr[id].answer === answers[id]) right++; });
      var t = study && study.k && study.k[k]; if (typeof t === 'number' && t > 0) secs += t;
    });
    return { keys: keys.length, done: done, right: Math.min(right, total), total: total, secs: Math.floor(secs) };
  }
  function duration(secs) { var m = Math.round(secs / 60), h = Math.floor(m / 60); return h ? h + T.h + (m % 60) + T.m : m + T.m; }
  window.UnfinishedFinish = { stats: stats };
  function readStudy() { try { var v = JSON.parse(localStorage.getItem('unfinished.study.v1') || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }

  var SERIF = '"Noto Serif SC", "Songti SC", serif', SANS = '"Noto Sans SC", "PingFang SC", sans-serif';
  function wrap(ctx, text, max) { // 中文逐字、英文按词折行
    var units = /[㐀-鿿]/.test(text) ? text.split('') : text.split(/(\s+)/), lines = [], line = '';
    units.forEach(function (u) { if (ctx.measureText(line + u).width > max && line.trim()) { lines.push(line.trim()); line = u.trim() ? u : ''; } else line += u; });
    if (line.trim()) lines.push(line.trim()); return lines;
  }
  function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function star(ctx, x, y, r) { ctx.beginPath(); for (var i = 0; i < 8; i++) { var a = Math.PI / 4 * i - Math.PI / 2, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  function draw(canvas, name, st, img, date) {
    var W = 1200, H = 1500, c = canvas.getContext('2d'); canvas.width = W; canvas.height = H;
    c.fillStyle = '#F4EEE2'; c.fillRect(0, 0, W, H);
    // 夜空（下缘是一道弧）
    var g = c.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, '#2a2f55'); g.addColorStop(0.6, '#4a4f86'); g.addColorStop(1, '#8a7fb5');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, 620); c.quadraticCurveTo(W / 2, 820, 0, 620); c.closePath(); c.fill();
    for (var i = 0; i < 16; i++) { c.globalAlpha = 0.5 + (i % 3) * 0.2; c.fillStyle = '#E0B94A'; star(c, (i * 173 + 60) % 1100 + 50, (i * 257 + 80) % 480 + 50, 12 + (i % 3) * 7); } c.globalAlpha = 1;
    // 卡通月牙
    c.save(); c.translate(800, 90); c.fillStyle = '#FFE08A'; c.strokeStyle = '#2B2721'; c.lineWidth = 6; c.lineJoin = 'round';
    var moon = new Path2D('M190 20a170 170 0 1 0 110 300A200 200 0 0 1 190 20z'); c.fill(moon); c.stroke(moon);
    c.globalAlpha = 0.8; c.fillStyle = '#F7A8A8'; c.beginPath(); c.arc(150, 230, 16, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    c.lineCap = 'round'; c.stroke(new Path2D('M120 180q14 14 28 0')); c.stroke(new Path2D('M135 255q22 18 44 2')); c.restore();
    c.fillStyle = '#EDE7F7'; c.font = '400 26px ' + SANS; c.textBaseline = 'alphabetic'; c.fillText(EN ? 'UNFINISHED' : '未尽 · UNFINISHED', 80, 100);
    // 月未央头像
    c.save(); c.shadowColor = 'rgba(43,39,33,.25)'; c.shadowBlur = 40; c.shadowOffsetY = 14; c.fillStyle = '#F4EEE2'; c.beginPath(); c.arc(300, 620, 200, 0, Math.PI * 2); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(300, 620, 190, 0, Math.PI * 2); c.clip(); c.fillStyle = '#fff'; c.fillRect(110, 430, 380, 380); if (img) c.drawImage(img, 110, 430, 380, 380); c.restore();
    // 气泡
    c.font = '400 ' + (EN ? 30 : 34) + 'px ' + SANS; var lines = T.says, bh = 60 + lines.length * 54 + 44;
    c.fillStyle = '#2B2721'; c.beginPath(); c.moveTo(498, 574); c.lineTo(524, 556); c.lineTo(524, 592); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.strokeStyle = '#2B2721'; c.lineWidth = 3; rounded(c, 520, 500, 600, bh, 36); c.fill(); c.stroke();
    c.fillStyle = '#2B2721'; lines.forEach(function (l, n) { c.fillText(l, 556, 562 + n * 54); });
    c.fillStyle = '#7a7266'; c.font = '400 22px ' + SANS; c.fillText(T.by, 556, 562 + lines.length * 54);
    // 标题与路线名
    c.fillStyle = '#2B2721'; c.font = '700 76px ' + SERIF; c.fillText(T.title, 80, 935);
    c.fillStyle = '#94702A'; c.font = '500 36px ' + SERIF; var nl = wrap(c, name, 1040).slice(0, 2); nl.forEach(function (l, n) { c.fillText(l, 80, 1010 + n * 50); });
    // 三张成绩卡
    var top = 1040 + nl.length * 50, cards = [[st.done + ' / ' + st.keys, T.read], [st.right + ' / ' + st.total, T.quiz], [duration(st.secs), T.time]];
    cards.forEach(function (x, n) {
      var cx = 80 + n * 356, w = 328, h = 178;
      c.fillStyle = '#E0B94A'; rounded(c, cx + 6, top + 6, w, h, 28); c.fill();
      c.fillStyle = '#fff'; c.strokeStyle = '#2B2721'; c.lineWidth = 3; rounded(c, cx, top, w, h, 28); c.fill(); c.stroke();
      c.fillStyle = '#2B2721'; var size = 56; c.font = '700 ' + size + 'px ' + SANS; while (c.measureText(x[0]).width > w - 56 && size > 28) { size -= 2; c.font = '700 ' + size + 'px ' + SANS; } c.fillText(x[0], cx + 30, top + 88);
      c.fillStyle = '#5F584D'; var ls = 24; c.font = '400 ' + ls + 'px ' + SANS; while (c.measureText(x[1]).width > w - 56 && ls > 15) { ls -= 1; c.font = '400 ' + ls + 'px ' + SANS; } c.fillText(x[1], cx + 30, top + 138);
    });
    c.fillStyle = '#5F584D'; c.font = '400 26px ' + SANS; c.fillText(date + ' · ' + T.foot, 80, H - 80);
  }
  function loadImage(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function fonts(texts) { if (!document.fonts || !document.fonts.load) return Promise.resolve(); var all = texts.join(''); return Promise.all([document.fonts.load('700 76px "Noto Serif SC"', all), document.fonts.load('500 36px "Noto Serif SC"', all), document.fonts.load('400 34px "Noto Sans SC"', all), document.fonts.load('700 56px "Noto Sans SC"', all)]).catch(function () {}); }

  function loadAnswers() { return new Promise(function (ok) { if (window.UNF_ANSWERS) return ok(window.UNF_ANSWERS); var sc = document.createElement('script'); sc.src = base + 'finish/answers.js'; sc.onload = function () { ok(window.UNF_ANSWERS || {}); }; sc.onerror = function () { ok({}); }; document.head.appendChild(sc); }); }
  function complete(route, s) { return route.keys.length > 0 && route.keys.every(function (k) { return s.courses[k] && s.courses[k].done; }); }

  // 弹出层：贴在伴学上方，不抢焦点，不遮住整页；Esc 或“收起”关闭。
  var pop = null;
  function open(route) {
    if (pop) { pop.remove(); pop = null; }
    var n = EN ? route.nameEn || route.name : route.name, now = new Date(), date = EN ? now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';
    var panel = pop = el('section', { class: 'route-finish-pop', role: 'dialog', 'aria-label': T.dialog + (EN ? ': ' : '：') + n, 'data-route-finish-pop': route.id });
    document.body.appendChild(panel);
    function close() { if (pop === panel) pop = null; panel.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    Promise.all([loadImage(base + 'mascot/happy.webp'), loadAnswers(), fonts([n, T.title, T.foot, T.read, T.quiz, T.time, T.by, date].concat(T.says))]).then(function (r) {
      if (pop !== panel) return;
      var st = stats(route, LearningStore.read(), readStudy(), r[1]);
      var canvas = el('canvas', { class: 'route-finish-canvas', role: 'img', 'aria-label': fill(T.alt, { name: n, a: st.done, b: st.keys, r: st.right, q: st.total, t: duration(st.secs) }) });
      try { draw(canvas, n, st, r[0], date); } catch (e) { panel.appendChild(el('p', { text: T.fail })); }
      var save = el('button', { type: 'button', class: 'practice-check', text: T.save }), shut = el('button', { type: 'button', class: 'practice-reset', text: T.close });
      save.addEventListener('click', function () { canvas.toBlob(function (b) { if (!b) return; var a = el('a', { href: URL.createObjectURL(b), download: 'unfinished-route-' + route.id + '.png' }); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }, 'image/png'); });
      shut.addEventListener('click', close);
      if (canvas.width === 1200) panel.appendChild(canvas);
      panel.appendChild(el('div', { class: 'due-actions' }, [save, shut])); panel.appendChild(el('p', { class: 'lesson-note', text: T.note }));
    });
  }
  window.UnfinishedFinish.open = function (id) { var r = routes.filter(function (x) { return x.id === id; })[0]; if (r) open(r); };

  // 自动弹出：本页上某条路线从“没读完”变成“读完”，且以前没弹过。
  // 伴学真的开口了才打开并记为“已弹过”（finished）；伴学关闭、睡眠或页面在后台时记为“待弹”（finishPending），
  // 以后打开任意课程页、伴学醒着时补弹一次。
  var was = {}, s0 = LearningStore.read(), busy = false;
  routes.forEach(function (r) { was[r.id] = complete(r, s0); });
  function celebrate(r) {
    var accepted = false;
    document.dispatchEvent(new CustomEvent('unfinished:route-finished', { detail: { name: EN ? r.nameEn || r.name : r.name, accept: function () { accepted = true; open(r); } } }));
    busy = true;
    LearningStore.write(function (x) {
      ['finished', 'finishPending'].forEach(function (k) { if (!x[k] || typeof x[k] !== 'object' || Array.isArray(x[k])) x[k] = {}; });
      if (accepted) { x.finished[r.id] = new Date().toISOString(); delete x.finishPending[r.id]; } else x.finishPending[r.id] = true;
    });
    busy = false;
    return accepted;
  }
  window.addEventListener('learning-change', function () {
    if (busy) return; var s = LearningStore.read(), fresh = null;
    routes.forEach(function (r) { var now = complete(r, s); if (now && !was[r.id] && !(s.finished && s.finished[r.id]) && !fresh) fresh = r; was[r.id] = now; });
    if (fresh) celebrate(fresh);
  });
  function pending() {
    var s = LearningStore.read(), p = s.finishPending && typeof s.finishPending === 'object' ? s.finishPending : {};
    var r = routes.filter(function (x) { return p[x.id] === true && complete(x, s) && !(s.finished && s.finished[x.id]); })[0];
    if (r) celebrate(r);
  }
  window.UnfinishedFinish.pending = pending;
  if (document.querySelector('[data-learning-key]')) setTimeout(pending, 4000); // 只在课程页补弹，等伴学先就位

  // “学习路线”页：已读完的路线下方留一个再看一次的入口；没读完的写明进度。
  routes.forEach(function (route) {
    var host = document.getElementById('route-' + route.id); if (!host || !host.classList || !host.classList.contains('route')) return;
    var box = el('div', { class: 'route-finish', 'data-route-finish': route.id }), hint = el('p', { class: 'practice-note' }), btn = el('button', { type: 'button', class: 'practice-reset', text: T.make });
    box.appendChild(hint); box.appendChild(btn); host.appendChild(box);
    function refresh() { var st = stats(route, LearningStore.read(), null), ok = st.keys > 0 && st.done === st.keys; btn.hidden = !ok; hint.hidden = ok; hint.textContent = fill(T.notYet, { a: st.done, b: st.keys }); }
    btn.addEventListener('click', function () { open(route); });
    refresh(); window.addEventListener('learning-change', refresh); window.addEventListener('storage', refresh);
  });
})();
