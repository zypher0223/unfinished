/* 未尽 · 月未央学习陪伴 + 网站设置 (2026-10-31)
 * - Adds a 设置 button to the site header. The settings dialog switches the companion on or off.
 * - On lesson / course pages, 月未央 sits in the bottom-left corner, counts active study time
 *   (tab visible and the reader active in the last 2 minutes) and cheers or nudges at sensible moments.
 * Everything is stored only in this browser (localStorage); nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.__ucpLoaded) return; window.__ucpLoaded = true;

  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var SKEY = 'unfinished.settings.v1', DKEY = 'unfinished.study.v1';
  var ASSETS = (function () { var sc = document.currentScript || document.querySelector('script[src*="companion.js"]'); var src = sc ? sc.src : ''; return src ? src.replace(/companion\/companion\.js.*$/, '') : 'assets/'; })();
  function art(k) { return ASSETS + 'mascot/' + k + '.webp'; }

  var T = EN ? {
    settings: 'Settings', settingsTitle: 'Site settings', close: 'Close',
    compTitle: 'Study buddy', compToggle: 'Show Yue Weiyang on lesson pages',
    compHelp: 'She keeps track of how long you study on this device, reminds you to take breaks and cheers you on. The record stays in this browser only.',
    clear: 'Clear study-time record', clearSure: 'Click again to clear', cleared: 'Cleared.',
    today: 'Today', session: 'This visit', streak: 'Streak', total: 'All time', min: ' min', hr: ' h', days: ' days',
    name: 'Yue Weiyang', role: 'studying with you', hide: 'Hide on this page', openSettings: 'Settings',
    meLabel: function (m) { return 'Yue Weiyang, study buddy. ' + m + ' min studied today. Open details.'; },
    noData: 'No study time yet. It starts counting as you read.'
  } : {
    settings: '设置', settingsTitle: '网站设置', close: '关闭',
    compTitle: '学习陪伴', compToggle: '在课程页显示月未央',
    compHelp: '她会记录你在这台设备上的学习时长，适时提醒休息、给你打气。记录只保存在这个浏览器里。',
    clear: '清除学习时长记录', clearSure: '再点一次确认清除', cleared: '已清除。',
    today: '今天', session: '本次', streak: '连续', total: '累计', min: ' 分钟', hr: ' 小时', days: ' 天',
    name: '月未央', role: '正在陪你学习', hide: '本页先藏起来', openSettings: '设置',
    meLabel: function (m) { return '月未央 学习陪伴，今天已学 ' + m + ' 分钟，点开查看'; },
    noData: '还没有记录。开始阅读就会自动计时。'
  };
  // [mood, text]; {n} is filled in
  var L = EN ? {
    hiNight: ['happy', 'Night shift starts! Which lesson tonight?'],
    hiDay: ['sleepy', 'Daytime… let me wake up. Okay. Let’s go.'],
    hiLate: ['sleepy', 'Studying this late? I’ll keep you company — but not for long.'],
    hiStreak: ['happy', 'Day {n} in a row! My moonlight got a little brighter.'],
    m10: ['explain', 'Ten focused minutes. I’ll log that as tuition — in moonlight.'],
    m25: ['think', '25 minutes. Stand up, drink some water? The market isn’t going anywhere.'],
    m50: ['sleepy', '50 minutes! Even I’m sleepy. Take five, please.'],
    again: ['sleepy', 'Another half hour. Break time — eyes off the screen for a bit.'],
    late: ['sleepy', 'The market will be here tomorrow, and so will the moon. Go to sleep.'],
    d30: ['happy', '30 minutes today. More careful than I ever was with candles.'],
    d60: ['happy', 'A full hour today! I’m impressed. Truly.'],
    d120: ['pout', 'Two hours today… that’s great, but please rest your eyes.'],
    done: ['happy', 'Another lesson done! That pays off 0.3 g of my moonlight… I mean: well done!'],
    back: ['think', 'You’re back! Want to reread the last bit?'],
    nap: 'dozing off…'
  } : {
    hiNight: ['happy', '夜班开始！今晚学哪一课？'],
    hiDay: ['sleepy', '白天……我先醒醒。好了，开始吧。'],
    hiLate: ['sleepy', '这么晚还来学？我陪你，但别太久哦。'],
    hiStreak: ['happy', '连续第 {n} 天了！我的月光都亮了一点。'],
    m10: ['explain', '专心学了 10 分钟，课时费我先用月光替你记上。'],
    m25: ['think', '25 分钟啦，站起来喝口水？行情不会跑。'],
    m50: ['sleepy', '50 分钟了！我都犯困了，你休息 5 分钟好不好。'],
    again: ['sleepy', '又过了半小时，让眼睛离开屏幕歇一会儿～'],
    late: ['sleepy', '行情明天还在，月亮也还在，先睡吧。'],
    d30: ['happy', '今天累计 30 分钟，比我当年看K线认真多了。'],
    d60: ['happy', '今天学满 1 小时！我是真的佩服。'],
    d120: ['pout', '今天 2 小时了……很棒，但眼睛要休息！'],
    done: ['happy', '又学完一课！还了 0.3 克月光……我是说，你真棒！'],
    back: ['think', '回来啦？刚才那段要不要再看一遍？'],
    nap: '打瞌睡中……'
  };

  /* ---------- storage (never throws) ---------- */
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function settings() { var s = load(SKEY, {}); if (typeof s.companion !== 'boolean') s.companion = true; return s; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function data() { var s = load(DKEY, null); if (!s || !s.d) s = { d: {}, total: 0, k: {}, f: {} }; s.k = s.k || {}; s.f = s.f || {}; return s; }
  function streak(s) {
    var n = 0, d = new Date(); if (!((s.d[dayKey(d)] || 0) >= 60)) d.setDate(d.getDate() - 1);
    while ((s.d[dayKey(d)] || 0) >= 60) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function mins(sec) { return Math.floor((sec || 0) / 60); }
  function fmtTotal(sec) { var m = mins(sec); return m < 60 ? m + T.min : (Math.round(m / 6) / 10) + T.hr; }

  /* ---------- DOM helper ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag), k;
    if (attrs) for (k in attrs) {
      var v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  var GEAR = 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z';
  function gearIcon() {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('d', GEAR); s.appendChild(p); return s;
  }

  /* ---------- settings dialog ---------- */
  var dlg, toggle, statsLine, clearBtn, clearArmed = false;
  function buildSettings() {
    toggle = h('input', { type: 'checkbox', id: 'ucp-toggle', onchange: function () { var s = settings(); s.companion = toggle.checked; save(SKEY, s); applyCompanion(); } });
    statsLine = h('p', { class: 'ucp-stats-line' });
    clearBtn = h('button', { type: 'button', class: 'ucp-ghost', text: T.clear, onclick: function () {
      if (!clearArmed) { clearArmed = true; clearBtn.textContent = T.clearSure; setTimeout(function () { clearArmed = false; clearBtn.textContent = T.clear; }, 4000); return; }
      try { localStorage.removeItem(DKEY); } catch (e) {} sessionSec = 0; clearArmed = false; clearBtn.textContent = T.cleared; fillSettings(); refreshMe();
    } });
    dlg = h('dialog', { class: 'ucp-dialog', 'aria-labelledby': 'ucp-dlg-title' }, [
      h('div', { class: 'ucp-dlg-head' }, [h('h2', { id: 'ucp-dlg-title', text: T.settingsTitle }), h('button', { type: 'button', class: 'ucp-x', 'aria-label': T.close, title: T.close, text: '×', onclick: function () { dlg.close(); } })]),
      h('section', { class: 'ucp-sec' }, [
        h('div', { class: 'ucp-sec-row' }, [h('img', { src: art('avatar'), alt: '', width: '48', height: '48', class: 'ucp-sec-av' }), h('div', null, [h('h3', { text: T.compTitle }), h('label', { class: 'ucp-switch', for: 'ucp-toggle' }, [toggle, h('span', { class: 'ucp-track', 'aria-hidden': 'true' }), h('span', { text: T.compToggle })])])]),
        h('p', { class: 'ucp-help', text: T.compHelp }), statsLine, clearBtn
      ])
    ]);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
  }
  function fillSettings() {
    toggle.checked = settings().companion;
    var s = data(), t = s.d[dayKey()] || 0;
    statsLine.textContent = s.total ? T.today + ' ' + mins(t) + T.min + ' · ' + T.streak + ' ' + streak(s) + T.days + ' · ' + T.total + ' ' + fmtTotal(s.total) : T.noData;
  }
  function openSettings() { if (!dlg) buildSettings(); fillSettings(); clearBtn.textContent = T.clear; clearArmed = false; if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  function addGear() {
    var header = document.querySelector('.folio-header, .lesson-header'); if (!header || header.querySelector('.ucp-gear')) return;
    var b = h('button', { type: 'button', class: 'ucp-gear', 'aria-label': T.settingsTitle, title: T.settingsTitle, onclick: openSettings }, [gearIcon(), h('span', { text: T.settings })]);
    var mark = header.querySelector('.night-mark'); if (mark) header.insertBefore(b, mark); else header.appendChild(b);
  }

  /* ---------- companion ---------- */
  var IS_STUDY = !!document.querySelector('[data-learning-key]');
  var LKEY = (document.querySelector('[data-learning-key]') || {}).getAttribute ? document.querySelector('[data-learning-key]').getAttribute('data-learning-key') : '';
  var box, me, img, badge, bubble, card, cardStats, timer = null, bubbleTimer = null, hiddenForPage = false;
  var sessionSec = 0, lastActive = Date.now(), idle = false, fired = {}, lastBubble = 0, mood = 'think';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setMood(k) { mood = k; if (img) img.src = art(k); }
  function say(line, n, force) {
    if (!box || box.hidden) return;
    var now = Date.now(); if (!force && now - lastBubble < 90000) return; lastBubble = now;
    bubble.textContent = line[1].replace('{n}', n); bubble.hidden = false; setMood(line[0]);
    box.classList.remove('is-pop'); void box.offsetWidth; box.classList.add('is-pop');
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(function () { bubble.hidden = true; setMood(idle ? 'sleepy' : 'think'); }, 7000);
  }
  function refreshMe() {
    if (!me) return; var s = data(), t = mins(s.d[dayKey()] || 0);
    badge.textContent = mins(sessionSec) + '′';
    me.setAttribute('aria-label', T.meLabel(t)); me.title = T.name + ' · ' + T.role;
    if (!card.hidden) cardStats.forEach(function (row) { row[1].textContent = row[2](s); });
  }
  function buildCompanion() {
    img = h('img', { class: 'ucp-img', src: art('think'), alt: '', width: '96', height: '96', decoding: 'async' });
    badge = h('span', { class: 'ucp-badge', 'aria-hidden': 'true', text: '0′' });
    me = h('button', { type: 'button', class: 'ucp-me', 'aria-expanded': 'false', onclick: function () { card.hidden = !card.hidden; me.setAttribute('aria-expanded', String(!card.hidden)); if (!card.hidden) { bubble.hidden = true; refreshMe(); } } }, [img, badge]);
    bubble = h('p', { class: 'ucp-bubble', role: 'status', 'aria-live': 'polite', hidden: true });
    cardStats = [
      [T.session, h('b'), function () { return mins(sessionSec) + T.min; }],
      [T.today, h('b'), function (s) { return mins(s.d[dayKey()] || 0) + T.min; }],
      [T.streak, h('b'), function (s) { return streak(s) + T.days; }],
      [T.total, h('b'), function (s) { return fmtTotal(s.total); }]
    ];
    card = h('div', { class: 'ucp-card', hidden: true }, [
      h('div', { class: 'ucp-card-head' }, [h('strong', { text: T.name }), h('span', { text: T.role })]),
      h('dl', { class: 'ucp-grid' }, cardStats.map(function (r) { return h('div', null, [h('dt', { text: r[0] }), h('dd', null, [r[1]])]); })),
      h('div', { class: 'ucp-actions' }, [
        h('button', { type: 'button', class: 'ucp-ghost', text: T.hide, onclick: function () { hiddenForPage = true; applyCompanion(); } }),
        h('button', { type: 'button', class: 'ucp-ghost', text: T.openSettings, onclick: function () { card.hidden = true; me.setAttribute('aria-expanded', 'false'); openSettings(); } })
      ])
    ]);
    box = h('aside', { class: 'ucp' + (REDUCED ? ' is-still' : ''), 'aria-label': T.name + ' · ' + T.compTitle }, [bubble, card, me]);
    document.body.appendChild(box);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && card && !card.hidden) { card.hidden = true; me.setAttribute('aria-expanded', 'false'); } });
    // cheer when the reader marks the lesson as learned
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-mark-done]'); if (!b) return;
      setTimeout(function () { if (b.getAttribute('aria-pressed') === 'true') say(L.done, 0, true); }, 60);
    });
  }
  function greet() {
    var hr = new Date().getHours(), s = data(), st = streak(s);
    var line = hr < 5 ? L.hiLate : (hr >= 18 || hr < 5) ? L.hiNight : L.hiDay;
    if (st >= 2 && hr >= 5) { say(L.hiStreak, st + ((s.d[dayKey()] || 0) >= 60 ? 0 : 1), true); return; }
    say(line, 0, true);
  }
  function tick() {
    var now = Date.now(), active = document.visibilityState === 'visible' && now - lastActive < 120000;
    if (!active) { if (!idle && document.visibilityState === 'visible') { idle = true; if (bubble.hidden) setMood('sleepy'); badge.textContent = L.nap; } return; }
    var STEP = 5; sessionSec += STEP;
    var s = data(), d = dayKey(); s.d[d] = (s.d[d] || 0) + STEP; s.total = (s.total || 0) + STEP; if (LKEY) s.k[LKEY] = (s.k[LKEY] || 0) + STEP;
    var keys = Object.keys(s.d).sort(); while (keys.length > 120) delete s.d[keys.shift()];
    Object.keys(s.f).forEach(function (k) { if (k !== d) delete s.f[k]; }); var df = s.f[d] = s.f[d] || [];
    save(DKEY, s);
    var m = mins(sessionSec), dm = mins(s.d[d]), hr = new Date().getHours();
    if (m >= 10 && !fired.m10) { fired.m10 = 1; say(L.m10); }
    if (m >= 25 && !fired.m25) { fired.m25 = 1; say(L.m25, 0, true); }
    if (m >= 50 && !fired.m50) { fired.m50 = 1; say(L.m50, 0, true); }
    if (m >= 80 && (m - 50) % 30 === 0 && fired.again !== m) { fired.again = m; say(L.again, 0, true); }
    if (hr < 5 && m >= 15 && !fired.late) { fired.late = 1; say(L.late, 0, true); }
    [[30, 'd30'], [60, 'd60'], [120, 'd120']].forEach(function (x) { if (dm >= x[0] && df.indexOf(x[1]) < 0) { df.push(x[1]); save(DKEY, s); say(L[x[1]], 0, x[0] >= 60); } });
    refreshMe();
  }
  function activity() {
    var wasIdle = idle; lastActive = Date.now();
    if (wasIdle) { idle = false; if (box && !box.hidden) { setMood('think'); refreshMe(); say(L.back); } }
  }
  ['scroll', 'pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'selectionchange'].forEach(function (ev) { (ev === 'scroll' ? window : document).addEventListener(ev, activity, { passive: true }); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') activity(); });

  function applyCompanion() {
    var on = IS_STUDY && settings().companion && !hiddenForPage;
    if (on && !box) { buildCompanion(); setTimeout(greet, 2500); }
    if (box) box.hidden = !on;
    document.body.classList.toggle('ucp-on', !!on);
    if (on && !timer) timer = setInterval(tick, 5000);
    if (!on && timer) { clearInterval(timer); timer = null; }
    if (on) refreshMe();
  }

  function mount() { addGear(); applyCompanion(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
