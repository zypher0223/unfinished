/* 路线完成小结（2026-11-14，用户选定方案 C：卡通月亮 + 月未央）。
 * “学习路线”里每条路线读完全部课程后，可以生成一张 1200×1500 的图片并保存。图片在本页用 canvas 画出，不上传。
 * 数字全部来自本机学习记录：已读课数、这条路线课后小测的答对题数、这些课程的学习时长。只作学习记录，不是证书或能力证明。 */
(function () {
  'use strict';
  var routes = window.STUDY_ROUTES || [], bank = window.MARKET_QUESTIONS || [];
  if (!routes.length || !window.LearningStore || !document.querySelector('details.route')) return;
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    make: 'Make my route summary', notYet: 'Finish every lesson on this route to make a summary picture ({a}/{b} read).', save: 'Save picture', close: 'Close', alt: 'Route summary picture: {name}. {a} of {b} lessons read; lesson quizzes {r} of {q} correct; study time {t}.',
    note: 'Made in your browser from this device’s learning record; nothing is uploaded. It is a keepsake of your study, not a certificate or proof of ability.',
    title: 'Route complete!', says: ['You really finished this route!', 'N-not that I was waiting', 'to praise you or anything.'], by: '— Yue Weiyang', read: 'lessons read', quiz: 'lesson quiz correct', time: 'study time on these lessons', foot: 'Learning has no finish line.', h: ' h ', m: ' min', fail: 'The picture could not be made. Refresh the page and try again.'
  } : {
    make: '生成完成小结', notYet: '读完这条路线的全部课程后，可以生成一张完成小结图片（已读 {a}/{b}）。', save: '保存图片', close: '收起', alt: '路线完成小结图片：{name}。已读 {a} / {b} 课；课后小测答对 {r} / {q} 题；学习时长 {t}。',
    note: '图片在你的浏览器里按本机学习记录生成，不上传。它是学习的纪念，不是证书，也不代表能力评定。',
    title: '路线完成！', says: ['这条路线你真的走完了！', '才、才不是特意等着夸你的。'], by: '—— 月未央', read: '课已读', quiz: '课后小测答对', time: '这些课的学习时长', foot: '学习没有终点。', h: ' 小时 ', m: ' 分', fail: '图片没能生成，请刷新页面再试。'
  };
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); }
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  var byQ = {}; bank.forEach(function (q) { byQ[q.id] = q; });
  var base = ((document.querySelector('script[src*="assets/finish/finish.js"]') || {}).src || '').replace(/finish\/finish\.js.*$/, '');

  // 纯计算：一条路线的统计。study 是 unfinished.study.v1 读出的对象（可能为 null）。
  function stats(route, s, study) {
    var keys = route.steps.reduce(function (a, x) { return a.concat(x[2]); }, []), done = 0, right = 0, total = 0, secs = 0;
    keys.forEach(function (k) {
      if (s.courses[k] && s.courses[k].done) done++;
      var pr = s.practice && s.practice[k]; total += 3;
      if (pr && typeof pr === 'object') Object.keys(pr).forEach(function (id) { var q = byQ[id]; if (q && pr[id] && pr[id].answer === q.answer) right++; });
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

  routes.forEach(function (route) {
    var host = document.getElementById('route-' + route.id); if (!host) return;
    var box = el('div', { class: 'route-finish', 'data-route-finish': route.id }), hint = el('p', { class: 'practice-note' }), btn = el('button', { type: 'button', class: 'practice-check', text: T.make }), stage = el('div', { class: 'route-finish-stage', hidden: '' });
    box.appendChild(hint); box.appendChild(btn); box.appendChild(stage); host.appendChild(box);
    function name() { var s = host.querySelector('summary'); return (s && s.firstChild && s.firstChild.nodeValue || route.name).trim(); }
    function refresh() { var st = stats(route, LearningStore.read(), null), ok = st.keys > 0 && st.done === st.keys; btn.hidden = !ok; hint.hidden = ok; hint.textContent = fill(T.notYet, { a: st.done, b: st.keys }); if (!ok) { stage.hidden = true; } }
    btn.addEventListener('click', function () {
      var st = stats(route, LearningStore.read(), readStudy()), n = name(), now = new Date(), date = EN ? now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';
      while (stage.firstChild) stage.removeChild(stage.firstChild); stage.hidden = false;
      var canvas = el('canvas', { class: 'route-finish-canvas', role: 'img', 'aria-label': fill(T.alt, { name: n, a: st.done, b: st.keys, r: st.right, q: st.total, t: duration(st.secs) }) });
      Promise.all([loadImage(base + 'mascot/happy.webp'), fonts([n, T.title, T.foot, T.read, T.quiz, T.time, T.by, date].concat(T.says))]).then(function (r) {
        try { draw(canvas, n, st, r[0], date); } catch (e) { stage.appendChild(el('p', { text: T.fail })); return; }
        var save = el('button', { type: 'button', class: 'practice-check', text: T.save }), close = el('button', { type: 'button', class: 'practice-reset', text: T.close });
        save.addEventListener('click', function () { canvas.toBlob(function (b) { if (!b) return; var a = el('a', { href: URL.createObjectURL(b), download: 'unfinished-route-' + route.id + '.png' }); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }, 'image/png'); });
        close.addEventListener('click', function () { stage.hidden = true; btn.focus(); });
        stage.appendChild(canvas); stage.appendChild(el('div', { class: 'due-actions' }, [save, close])); stage.appendChild(el('p', { class: 'lesson-note', text: T.note }));
        canvas.scrollIntoView({ block: 'nearest' });
      });
    });
    refresh(); window.addEventListener('learning-change', refresh); window.addEventListener('storage', refresh);
  });
})();
