/* 未尽 · 月未央学习陪伴 + 网站设置 (2026-10-31)
 * - Adds a 设置 button to the site header. The settings dialog switches the companion on or off.
 * - On lesson / course pages, 月未央 sits in the bottom-right corner, counts active study time
 *   (tab visible and the reader active in the last 2 minutes) and cheers or nudges at sensible moments.
 * Backstory changes must also update assets/ai/ai-island.js (YUE character card).
 * Everything is stored only in this browser (localStorage); nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.__ucpLoaded) return; window.__ucpLoaded = true;

  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var SKEY = 'unfinished.settings.v1', DKEY = 'unfinished.study.v1';
  var ASSETS = (function () { var sc = document.currentScript || document.querySelector('script[src*="companion.js"]'); var src = sc ? sc.src : ''; return src ? src.replace(/companion\/companion\.js.*$/, '') : 'assets/'; })();
  function art(k) { return ASSETS + 'mascot/' + k + '.webp?v=2'; }

  var T = EN ? {
    paceTitle: 'How often she speaks', paceQuiet: 'Rarely', paceNormal: 'Standard', paceLively: 'More often',
    paceHelp: 'Rarely: she speaks only when you reach the halfway or all-answered point of an exercise, or get a past mistake right. Standard: also greetings and break reminders, at least 90 seconds apart. More often: the gap drops to 45 seconds. Sleep and the on/off switch are separate and always win.',
    sleep: 'Sleep', wake: 'Wake up', sleepLabel: 'Let Yue sleep', wakeLabel: 'Wake Yue up',
    asleep: 'sleeping by your choice', napping: 'having a little nap', awake: 'studying with you',
    selfcheck: 'Mark this exercise complete', selfcheckDone: 'Exercise marked complete',
    selfcheckHelp: 'Mark after trying it yourself. Opening the answer does not mark completion or correctness.',
    exerciseProgress: 'Page exercises completed: {n} / {total}',
    sleepHelp: 'Sleep keeps her quiet until you wake her. During a natural nap, halfway and full exercise milestones can wake her to cheer you on.',
    settings: 'Settings', settingsTitle: 'Site settings', close: 'Close',
    compTitle: 'Study buddy', compToggle: 'Show Yue Weiyang on lesson pages',
    compHelp: 'She keeps track of how long you study on this device, reminds you to take breaks and cheers you on. The record stays in this browser only.',
    clear: 'Clear study-time record', clearSure: 'Click again to clear', cleared: 'Cleared.',
    today: 'Today', session: 'This visit', streak: 'Streak', total: 'All time', min: ' min', hr: ' h', days: ' days',
    name: 'Yue Weiyang', role: 'studying with you', hide: 'Hide on this page', openSettings: 'Settings',
    meLabel: function (m) { return 'Yue Weiyang, study buddy. ' + m + ' min studied today. Open details.'; },
    noData: 'No study time yet. It starts counting as you read.',
    paperTitle: 'Reading background', paperBook: 'Book page', paperWhite: 'Plain white', paperHelp: 'Applies to lessons, catalogs, quizzes and other reading pages. Book page is a soft paper tone that is easier on the eyes over long sessions; the home page stays night-sky.',
    langTitle: 'Language', langHelp: 'Switches the site interface. In English, lessons open in their English written version; Chinese lessons stay as they are. Quiz questions and explanations are shown in English too.'
  } : {
    paceTitle: '提醒频率', paceQuiet: '少量', paceNormal: '标准', paceLively: '较活跃',
    paceHelp: '少量：只在练习做到一半、全部作答、把旧错题答对时说话。标准：另外有问候和休息提醒，两次之间至少隔 90 秒。较活跃：间隔缩短到 45 秒。睡觉和伴学开关单独控制，优先于这里。',
    sleep: '睡觉', wake: '唤醒', sleepLabel: '让月未央睡觉', wakeLabel: '唤醒月未央',
    asleep: '你让我睡觉啦', napping: '正在小憩', awake: '正在陪你学习',
    selfcheck: '标记这题已完成', selfcheckDone: '这题已标记完成',
    selfcheckHelp: '自己想过后再标记；展开答案不计作完成，标记也不代表答对。',
    exerciseProgress: '本页练习已完成 {n} / {total}',
    sleepHelp: '点“睡觉”后，她会安静到你唤醒为止。自然小憩时，完成半数或全部题目会叫醒她来给你鼓劲。',
    settings: '设置', settingsTitle: '网站设置', close: '关闭',
    compTitle: '学习陪伴', compToggle: '在课程页显示月未央',
    compHelp: '她会记录你在这台设备上的学习时长，适时提醒休息、给你打气。记录只保存在这个浏览器里。',
    clear: '清除学习时长记录', clearSure: '再点一次确认清除', cleared: '已清除。',
    today: '今天', session: '本次', streak: '连续', total: '累计', min: ' 分钟', hr: ' 小时', days: ' 天',
    name: '月未央', role: '正在陪你学习', hide: '本页先藏起来', openSettings: '设置',
    meLabel: function (m) { return '月未央 学习陪伴，今天已学 ' + m + ' 分钟，点开查看'; },
    noData: '还没有记录。开始阅读就会自动计时。',
    paperTitle: '阅读背景', paperBook: '书页', paperWhite: '纯白', paperHelp: '用于课程、目录、测验等阅读页面。书页是柔和的纸张底色，长时间阅读更不刺眼；首页保持夜空。',
    langTitle: '界面语言', langHelp: '切换网站界面语言。选 English 后，课程会打开对应的英文文字教学；中文课程内容不受影响。测验题目和解析也会显示英文。'
  };
  // [mood, text]; {n} is filled in
  var L = EN ? {
    wake: ['happy', 'I’m up! Ahem, I was only resting my eyes. Which little step are we on?'],
    readSome: ['happy', 'You’ve spent time with several parts of this lesson. Yay! Little pieces are starting to join up.'],
    readMost: ['happy', 'You’ve worked through most of the sections now. That steady effort deserves a little cheer.'],
    readAll: ['happy', 'You’ve spent time with every section. Nice work staying with it! The self-check is a chance to see what clicked.'],
    m5: ['happy', 'Five minutes together! Thanks for giving this idea some time. Shall we take the next little step?'],
    m20: ['happy', 'Twenty minutes now. Ahem, that patient effort deserves a cheer. A short break is welcome too.'],
    halfWake: ['happy', 'Hmm, I’m up! Half the self-checks are complete? Yay! That calls for a little cheer.'],
    allWake: ['happy', 'Every exercise complete! I can’t give that effort a proper cheer lying down. Up I get! Let’s revisit the explanations.'],
    testHalfWake: ['happy', 'I’m up! You’ve answered {n} questions — halfway already! Yay, that steady effort deserves a cheer.'],
    testAllWake: ['happy', 'All {n} questions answered! Up I get to cheer your persistence. Submit when ready, then revisit the reasoning.'],
    half: ['happy', 'Half the exercises are complete! Yay! Ahem, that little milestone deserves a proper cheer. Let’s take the rest one at a time.'],
    all: ['happy', 'Every exercise on this page is complete! That patience deserves credit. Let’s look back at the explanations.'],
    testHalf: ['happy', 'You’ve answered {n} questions — halfway! Ahem, that steady effort deserves a cheer. Take the rest one at a time.'],
    fix: ['happy', 'You got this one wrong before, and right this time! Hmph, not that I was keeping count… well done.'],
    fixMany: ['happy', '{n} questions you once got wrong are right this time! Ahem, I only happened to notice. Nicely done.'],
    testAll: ['happy', 'All {n} questions answered! Yay! That persistence deserves a cheer. Submit when you’re ready, then check the reasoning.'],
    hiNight: ['happy', 'Night shift starts! Ahem, I prepared a little. Which lesson shall we work through?'],
    hiDay: ['sleepy', 'Daytime… hmm, I’m up! Let’s start with one little idea.'],
    hiLate: ['sleepy', 'Studying this late? I’ll keep you company — but not for long.'],
    hiStreak: ['happy', 'Day {n} in a row! My moonlight got a little brighter.'],
    m10: ['explain', 'Ten minutes of learning! One more little entry in my Moon Palace buyback ledger. Ahem, the credit goes to your effort.'],
    m25: ['think', '25 minutes. Stand up, drink some water? The market isn’t going anywhere.'],
    m50: ['sleepy', '50 minutes! Even I’m sleepy. Take five, please.'],
    again: ['sleepy', 'Another half hour. Break time — eyes off the screen for a bit.'],
    late: ['sleepy', 'The market will be here tomorrow, and so will the moon. Go to sleep.'],
    d30: ['happy', 'Thirty minutes of learning today! That adds up one little step at a time. Yay!'],
    d60: ['happy', 'A full hour of learning today! I’m giving that effort a proper cheer. Ahem, and please give your eyes a break.'],
    d120: ['pout', 'Two hours today… that’s great, but please rest your eyes.'],
    done: ['happy', 'Another lesson marked as read! Yay! My buyback ledger can wait; your study effort deserves the cheer. Try a self-check to see what clicked.'],
    back: ['think', 'You’re back! Want to reread the last bit?'],
    nap: 'dozing off…'
  } : {
    wake: ['happy', '醒啦！咳，我刚才是在养精神。这回咱们学到哪一步了？'],
    readSome: ['happy', '已经陪你看过好几个小节啦，好耶！一点点接起来，这份耐心值得夸一下。'],
    readMost: ['happy', '这页大半的小节你都停下来读过啦。咳，有在一步步往前走呢，我给你鼓鼓劲。'],
    readAll: ['happy', '每个小节都停下来读过啦，好耶！接着试试自测，看看哪些地方已经接上了。'],
    m5: ['happy', '咱们一起学了 5 分钟啦！肯花时间弄懂一件事，这个开头很棒。下一小步也一起走，好不好？'],
    m20: ['happy', '已经学了 20 分钟啦。咳，这份耐心我有看到，给你认真鼓鼓掌！想歇一会儿也可以哦。'],
    halfWake: ['happy', '唔，醒啦！这页自测已经完成一半了？好耶，得起来给你鼓鼓劲。后面咱们慢慢来。'],
    allWake: ['happy', '诶，这页的练习都完成啦！这可不能躺着夸，起来给你的坚持鼓鼓掌。接着回看解析吧。'],
    testHalfWake: ['happy', '唔，醒啦！已经答了 {n} 题，走到一半啦！这个进展得起来夸一下，后面咱们一题一题来。'],
    testAllWake: ['happy', '{n} 题都作答了，好耶！这可不能躺着夸，我起来给你的坚持鼓鼓掌。准备好就交卷，再回头看看判断理由吧。'],
    half: ['happy', '这页的自测已经完成一半啦，好耶！咳，这个小进展得认真夸一下。后面咱们也一题一题来。'],
    all: ['happy', '这页的练习都完成啦，好耶！这份耐心值得好好夸一下，接着回看解析，把还没接上的地方找出来吧。'],
    testHalf: ['happy', '已经答了 {n} 题，走到一半啦！咳，这份耐心值得夸一下，后面也一题一题慢慢来。'],
    fix: ['happy', '这道题上次答错，这次答对啦！哼，才不是特意帮你记着的……做得好。'],
    fixMany: ['happy', '有 {n} 道以前答错的题，这次答对了！咳，我只是刚好数了一下。做得好。'],
    testAll: ['happy', '{n} 题都作答了，好耶！认真走到这里，这份坚持很棒。准备好就交卷，咱们再回头看看判断理由。'],
    hiNight: ['happy', '夜班开始！咳，今天有认真备课的。今晚咱们一起学哪一课？'],
    hiDay: ['sleepy', '白天……唔，我醒啦！先从一个小知识点开始，好不好？'],
    hiLate: ['sleepy', '这么晚还来学？我陪你，但别太久哦。'],
    hiStreak: ['happy', '连续第 {n} 天了！我的月光都亮了一点。'],
    m10: ['explain', '学了 10 分钟啦！赎回月宫的小账本记上一笔。咳，认真往前走的人是你，先夸你。'],
    m25: ['think', '25 分钟啦，站起来喝口水？行情不会跑。'],
    m50: ['sleepy', '50 分钟了！我都犯困了，你休息 5 分钟好不好。'],
    again: ['sleepy', '又过了半小时，让眼睛离开屏幕歇一会儿～'],
    late: ['sleepy', '行情明天还在，月亮也还在，先睡吧。'],
    d30: ['happy', '今天累计学了 30 分钟啦！这些小步真的会积起来，好耶，给你的耐心鼓鼓掌。'],
    d60: ['happy', '今天累计学了 1 小时！我给这份坚持认真鼓掌。咳，也带眼睛去休息一下，好不好？'],
    d120: ['pout', '今天 2 小时了……很棒，但眼睛要休息！'],
    done: ['happy', '又标记读过一课啦，好耶！赎宫账本先放一边，我要先夸你肯花时间学。再挑一道自测看看理解得怎么样吧。'],
    back: ['think', '回来啦？刚才那段要不要再看一遍？'],
    nap: '打瞌睡中……'
  };

  /* ---------- storage (never throws) ---------- */
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  var settingsMem = null;
  function save(k, v) { if (k === SKEY) settingsMem = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function settings() { var s = load(SKEY, settingsMem || {}); if (typeof s.companion !== 'boolean') s.companion = true; return s; }
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
  var dlg, toggle, statsLine, clearBtn, clearArmed = false, paceBtns = [];
  // How often she speaks: 'quiet' | 'normal' | 'lively'. Separate from sleep and the on/off switch.
  function paceNow() { var p = settings().companionPace; return p === 'quiet' || p === 'lively' ? p : 'normal'; }
  function paceBtn(code, label) {
    var b = h('button', { type: 'button', class: 'ucp-segbtn', role: 'radio', 'aria-checked': String(paceNow() === code), text: label, onclick: function () { var s = settings(); s.companionPace = code; save(SKEY, s); paceBtns.forEach(function (x) { x[1].setAttribute('aria-checked', String(x[0] === code)); }); } });
    paceBtns.push([code, b]); return b;
  }
  function buildSettings() {
    toggle = h('input', { type: 'checkbox', id: 'ucp-toggle', onchange: function () { var s = settings(); s.companion = toggle.checked; save(SKEY, s); applyCompanion(); } });
    statsLine = h('p', { class: 'ucp-stats-line' });
    clearBtn = h('button', { type: 'button', class: 'ucp-ghost', text: T.clear, onclick: function () {
      if (!clearArmed) { clearArmed = true; clearBtn.textContent = T.clearSure; setTimeout(function () { clearArmed = false; clearBtn.textContent = T.clear; }, 4000); return; }
      try { localStorage.removeItem(DKEY); } catch (e) {} sessionSec = 0; clearArmed = false; clearBtn.textContent = T.cleared; fillSettings(); refreshMe();
    } });
    var cur = window.UNF_LANG || (EN ? 'en' : 'zh');
    function langBtn(code, label) { return h('button', { type: 'button', class: 'ucp-segbtn', role: 'radio', lang: code === 'en' ? 'en' : 'zh-CN', 'aria-checked': String(cur === code), text: label, onclick: function () { switchLang(code); } }); }
    var paperNow = window.UNF_PAPER || 'book', paperBtns = [];
    function paperBtn(code, label) { var b = h('button', { type: 'button', class: 'ucp-segbtn', role: 'radio', 'aria-checked': String(paperNow === code), text: label, onclick: function () { if (window.UNF_SET_PAPER) window.UNF_SET_PAPER(code); paperBtns.forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); } }); paperBtns.push(b); return b; }
    dlg = h('dialog', { class: 'ucp-dialog', 'aria-labelledby': 'ucp-dlg-title' }, [
      h('div', { class: 'ucp-dlg-head' }, [h('h2', { id: 'ucp-dlg-title', text: T.settingsTitle }), h('button', { type: 'button', class: 'ucp-x', 'aria-label': T.close, title: T.close, text: '×', onclick: function () { dlg.close(); } })]),
      h('section', { class: 'ucp-sec ucp-lang' }, [
        h('h3', { id: 'ucp-lang-title', text: T.langTitle }),
        h('div', { class: 'ucp-seg', role: 'radiogroup', 'aria-labelledby': 'ucp-lang-title' }, [langBtn('zh', '中文'), langBtn('en', 'English')]),
        h('p', { class: 'ucp-help', text: T.langHelp })
      ]),
      h('section', { class: 'ucp-sec ucp-lang' }, [
        h('h3', { id: 'ucp-paper-title', text: T.paperTitle }),
        h('div', { class: 'ucp-seg', role: 'radiogroup', 'aria-labelledby': 'ucp-paper-title' }, [paperBtn('book', T.paperBook), paperBtn('white', T.paperWhite)]),
        h('p', { class: 'ucp-help', text: T.paperHelp })
      ]),
      h('section', { class: 'ucp-sec' }, [
        h('div', { class: 'ucp-sec-row' }, [h('img', { src: art('avatar'), alt: '', width: '48', height: '48', class: 'ucp-sec-av' }), h('div', null, [h('h3', { text: T.compTitle }), h('label', { class: 'ucp-switch', for: 'ucp-toggle' }, [toggle, h('span', { class: 'ucp-track', 'aria-hidden': 'true' }), h('span', { text: T.compToggle })])])]),
        h('p', { class: 'ucp-help', text: T.compHelp }), h('p', { class: 'ucp-help', text: T.sleepHelp }),
        h('h4', { id: 'ucp-pace-title', class: 'ucp-pace-title', text: T.paceTitle }),
        h('div', { class: 'ucp-seg', role: 'radiogroup', 'aria-labelledby': 'ucp-pace-title' }, [paceBtn('quiet', T.paceQuiet), paceBtn('normal', T.paceNormal), paceBtn('lively', T.paceLively)]),
        h('p', { class: 'ucp-help', text: T.paceHelp }), statsLine, clearBtn
      ])
    ]);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
  }
  function switchLang(code) {
    var cur = window.UNF_LANG || (EN ? 'en' : 'zh'); if (cur === code) return;
    if (window.UNF_SET_LANG) window.UNF_SET_LANG(code); else { var s = settings(); s.lang = code; save(SKEY, s); }
    var p = location.pathname;
    if (/\/learn\/\d+-(zh|en)\.html$/.test(p)) location.href = location.href.replace(/-(zh|en)\.html/, '-' + code + '.html');
    else location.reload();
  }
  function fillSettings() {
    toggle.checked = settings().companion;
    paceBtns.forEach(function (x) { x[1].setAttribute('aria-checked', String(x[0] === paceNow())); });
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
  var lessonHost = document.querySelector('[data-learning-key]');
  var IS_ASSESSMENT = !!document.getElementById('test-form');
  var IS_LESSON = /\/learn\//.test(location.pathname);
  var IS_STUDY = !!lessonHost || IS_ASSESSMENT;
  var LKEY = lessonHost ? lessonHost.getAttribute('data-learning-key') : '';
  var box, me, img, badge, bubble, card, cardStats, sleepBtn, stateLine;
  var timer = null, bubbleTimer = null, hiddenForPage = false, queuedTimer = null;
  var sessionSec = 0, lastActive = Date.now(), idle = false, fired = {}, lastBubble = 0, mood = 'think';
  var nextSwap = 0, awakeUntil = 0, readingSections = [], visibleSections = [], sectionSeconds = {}, readSections = {};
  var exerciseRuns = {}, lessonChecks = [], pageProgress = null;
  var dockFrame = null;
  var PROGRESS_KEY = 'unfinished.companion.progress.v1';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function manuallySleeping() { return settings().companionSleep === true; }
  function enabled() { return IS_STUDY && settings().companion && !hiddenForPage; }
  function canSpeak(force) { return enabled() && !manuallySleeping() && document.visibilityState === 'visible' && (force || mood !== 'nap'); }
  function refreshSleepControl() {
    if (!sleepBtn) return;
    var asleep = manuallySleeping() || mood === 'nap';
    sleepBtn.textContent = asleep ? T.wake : T.sleep;
    sleepBtn.setAttribute('aria-label', asleep ? T.wakeLabel : T.sleepLabel);
    stateLine.textContent = manuallySleeping() ? T.asleep : asleep ? T.napping : T.awake;
    if (box) box.classList.toggle('is-sleeping', asleep);
  }
  function setMood(k) { mood = manuallySleeping() ? 'nap' : k; if (img) img.src = art(mood); refreshSleepControl(); }
  function isDay() { var hr = new Date().getHours(); return hr >= 6 && hr < 18; }
  function restMood() {
    if (manuallySleeping() || idle) return 'nap';
    if (Date.now() < awakeUntil) return 'read';
    if (isDay() && Math.random() < 0.25) return 'nap';
    return Math.random() < 0.65 ? 'read' : 'think';
  }
  function toggleSleep() {
    var wake = manuallySleeping() || mood === 'nap', s = settings();
    s.companionSleep = !wake; save(SKEY, s);
    clearTimeout(bubbleTimer); bubble.hidden = true;
    if (wake) { idle = false; lastActive = Date.now(); awakeUntil = Date.now() + 120000; setMood('read'); say(L.wake, 0, true); }
    else setMood('nap');
    refreshMe();
  }
  function dockCompanion() {
    dockFrame = null;
    if (!IS_ASSESSMENT || !box || box.hidden) return;
    box.style.bottom = ''; box.style.maxHeight = ''; box.style.overflowY = '';
    var height = document.documentElement.clientHeight;
    var actions = Array.prototype.slice.call(document.querySelectorAll('#test-running:not([hidden]) .test-navigation, #test-running:not([hidden]) #test-exit, #test-results:not([hidden]) .result-actions'));
    var rects = actions.map(function (el) { return el.getBoundingClientRect(); }).filter(function (r) { return r.bottom > 0 && r.top < height && r.width > 0; });
    if (!rects.length) return;
    var top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
    var bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
    var rect = box.getBoundingClientRect();
    var overlap = rects.some(function (r) { return rect.left < r.right && rect.right > r.left && rect.top < r.bottom && rect.bottom > r.top; });
    if (!overlap) return;
    var above = Math.max(0, top - 12), below = Math.max(0, height - bottom - 12);
    if (above >= rect.height || above >= below) {
      box.style.bottom = (height - top + 12) + 'px';
      if (above < rect.height) { box.style.maxHeight = above + 'px'; box.style.overflowY = 'auto'; }
    } else {
      var visibleHeight = Math.min(rect.height, below);
      box.style.bottom = (height - bottom - 12 - visibleHeight) + 'px';
      if (below < rect.height) { box.style.maxHeight = below + 'px'; box.style.overflowY = 'auto'; }
    }
  }
  function queueDock() {
    if (IS_ASSESSMENT && dockFrame === null) dockFrame = setTimeout(dockCompanion, 0);
  }
  function say(line, n, force) {
    if (!box || box.hidden || !canSpeak(force)) return false;
    var now = Date.now(), pace = paceNow();
    // "Rarely" keeps only milestone and corrected-mistake praise; "more often" shortens the gap between ordinary lines.
    if (!force && (pace === 'quiet' || now - lastBubble < (pace === 'lively' ? 45000 : 90000))) return false;
    lastBubble = now;
    bubble.textContent = line[1].replace('{n}', n); bubble.hidden = false; setMood(line[0]);
    box.classList.remove('is-pop'); void box.offsetWidth; box.classList.add('is-pop');
    clearTimeout(bubbleTimer);
    queueDock();
    bubbleTimer = setTimeout(function () { bubble.hidden = true; setMood(restMood()); nextSwap = Date.now() + 45000 + Math.random() * 45000; queueDock(); }, 10000);
    return true;
  }
  function refreshMe() {
    if (!me) return; var s = data(), t = mins(s.d[dayKey()] || 0);
    badge.textContent = mins(sessionSec) + '′';
    me.setAttribute('aria-label', T.meLabel(t)); me.title = T.name + ' · ' + T.role;
    if (!card.hidden) cardStats.forEach(function (row) { row[1].textContent = row[2](s); });
    refreshSleepControl();
    queueDock();
  }

  // Only crossing a milestone can cheer: rerenders, changed answers and undo/redo do not repeat it.
  function exerciseMilestone(key, completed, total) {
    if (!Number.isInteger(total) || total < 1 || !Number.isInteger(completed) || completed < 0 || completed > total) return null;
    var run = exerciseRuns[key] || (exerciseRuns[key] = { half: false, all: false });
    if (completed >= total && !run.all) { run.all = true; run.half = true; return 'all'; }
    if (total > 1 && completed >= Math.ceil(total / 2) && !run.half) { run.half = true; return 'half'; }
    return null;
  }
  function progressCheer(kind, runId, completed, total) {
    var milestone = exerciseMilestone(kind + ':' + runId, completed, total);
    if (!milestone) return;
    // This bypasses natural-nap and ordinary cooldown, never the reader's sleep/off choice.
    var lineKey = kind === 'assessment' ? (milestone === 'all' ? 'testAll' : 'testHalf') : milestone;
    if (mood === 'nap') lineKey += 'Wake';
    say(L[lineKey], completed, true);
  }
  // A question that was in the mistake list was answered correctly just now (never fired for restored or imported records).
  document.addEventListener('unfinished:growth', function (e) {
    var d = e.detail; if (!d || d.kind !== 'fix' || !Number.isInteger(d.count) || d.count < 1) return;
    // If a milestone bubble has just appeared, let it be read first instead of replacing it at once.
    var wait = bubble && !bubble.hidden ? Math.max(0, 6500 - (Date.now() - lastBubble)) : 0;
    clearTimeout(queuedTimer); queuedTimer = setTimeout(function () { say(d.count > 1 ? L.fixMany : L.fix, d.count, true); }, wait);
  });
  document.addEventListener('unfinished:exercise-progress', function (e) {
    var d = e.detail;
    if (!d) return;
    if (IS_ASSESSMENT && d.kind === 'assessment' && typeof d.runId === 'string') {
      // A quiz restored after a refresh reports where it already stood; that is not a new milestone.
      if (d.initial) exerciseRuns['assessment:' + d.runId] = { half: d.completed >= Math.ceil(d.total / 2), all: d.completed === d.total };
      else progressCheer('assessment', d.runId, d.completed, d.total);
    }
    if (IS_LESSON && d.kind === 'lesson') {
      var counts = lessonProgress();
      if (d.initial || d.reset) exerciseRuns['lesson:' + location.pathname] = { half: counts.completed >= Math.ceil(counts.total / 2), all: counts.completed === counts.total };
      else progressCheer('lesson', location.pathname, counts.completed, counts.total);
      lessonChecks.forEach(function (detail) { if (detail.__ucpRefresh) detail.__ucpRefresh(); });
    }
  });

  function lessonProgress() {
    var quiz = document.querySelector('[data-lesson-practice]');
    var total = quiz ? Number(quiz.getAttribute('data-practice-total')) || 0 : 0;
    var completed = quiz ? Number(quiz.getAttribute('data-practice-completed')) || 0 : 0;
    return { total: lessonChecks.length + total, completed: lessonChecks.filter(function (_, i) { return pageProgress && pageProgress.checks[i] === true; }).length + completed };
  }
  function initLessonChecks() {
    if (!IS_LESSON) return;
    // Self-checks only: raw chart data, platform instructions and book excerpts are not questions.
    lessonChecks = Array.prototype.slice.call(document.querySelectorAll('#practice details, .figure-box > details:not(.candle-data)'));
    if (!lessonChecks.length && !document.querySelector('[data-lesson-practice]')) return;
    var all = load(PROGRESS_KEY, {}); pageProgress = all[location.pathname] || { checks: {} };
    if (!pageProgress.checks || typeof pageProgress.checks !== 'object') pageProgress = { checks: {} };
    function count() { return lessonProgress().completed; }
    var initial = count(), total = lessonProgress().total, key = 'lesson:' + location.pathname;
    exerciseRuns[key] = { half: initial >= Math.ceil(total / 2), all: initial === total };
    lessonChecks.forEach(function (detail, i) {
      var button = h('button', { type: 'button', class: 'ucp-check-button', 'aria-pressed': String(pageProgress.checks[i] === true) });
      var status = h('span', { class: 'ucp-check-progress', role: 'status' });
      function refresh() { button.textContent = pageProgress.checks[i] === true ? T.selfcheckDone : T.selfcheck; button.setAttribute('aria-pressed', String(pageProgress.checks[i] === true)); status.textContent = T.exerciseProgress.replace('{n}', count()).replace('{total}', total); }
      button.addEventListener('click', function () {
        pageProgress.checks[i] = pageProgress.checks[i] !== true;
        var latest = load(PROGRESS_KEY, {}); latest[location.pathname] = pageProgress; save(PROGRESS_KEY, latest);
        lessonChecks.forEach(function (d) { if (d.__ucpRefresh) d.__ucpRefresh(); });
        progressCheer('lesson', location.pathname, count(), total);
      });
      detail.__ucpRefresh = refresh;
      detail.appendChild(h('div', { class: 'ucp-check-actions' }, [button, status, h('p', { class: 'ucp-check-help', text: T.selfcheckHelp })]));
      refresh();
    });
  }
  function initReading() {
    if (!IS_LESSON || !('IntersectionObserver' in window)) return;
    readingSections = Array.prototype.slice.call(document.querySelectorAll('main .lesson-section:not(.lesson-practice):not(#references):not(#platforms):not(#book):not(#origin):not(#history)'));
    if (!readingSections.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var id = readingSections.indexOf(entry.target), enough = entry.isIntersecting && entry.intersectionRect.height >= Math.min(80, entry.boundingClientRect.height * 0.4);
        var at = visibleSections.indexOf(id);
        if (enough && at < 0) visibleSections.push(id);
        else if (!enough && at >= 0) visibleSections.splice(at, 1);
      });
    }, { threshold: [0, 0.1, 0.4, 0.75, 1] });
    readingSections.forEach(function (section) { observer.observe(section); });
  }
  function readingTick() {
    visibleSections.forEach(function (id) { sectionSeconds[id] = (sectionSeconds[id] || 0) + 5; if (sectionSeconds[id] >= 10) readSections[id] = true; });
    var total = readingSections.length, count = Object.keys(readSections).length;
    if (!total || !count) return;
    var stage = count === total ? 'readAll' : count >= Math.ceil(total * 2 / 3) ? 'readMost' : total >= 3 && count >= Math.ceil(total / 3) ? 'readSome' : '';
    if (stage && !fired[stage] && say(L[stage])) {
      fired[stage] = true;
      if (stage === 'readAll') fired.readMost = fired.readSome = true;
      else if (stage === 'readMost') fired.readSome = true;
    }
  }
  function buildCompanion() {
    img = h('img', { class: 'ucp-img', src: art(restMood()), alt: '', width: '96', height: '96', decoding: 'async' });
    badge = h('span', { class: 'ucp-badge', 'aria-hidden': 'true', text: '0′' });
    me = h('button', { type: 'button', class: 'ucp-me', 'aria-expanded': 'false', onclick: function () { card.hidden = !card.hidden; me.setAttribute('aria-expanded', String(!card.hidden)); if (!card.hidden) { bubble.hidden = true; refreshMe(); } } }, [img, badge]);
    bubble = h('p', { class: 'ucp-bubble', role: 'status', 'aria-live': 'polite', hidden: true });
    stateLine = h('span', { class: 'ucp-state' });
    sleepBtn = h('button', { type: 'button', class: 'ucp-ghost ucp-rest', onclick: toggleSleep });
    cardStats = [
      [T.session, h('b'), function () { return mins(sessionSec) + T.min; }],
      [T.today, h('b'), function (s) { return mins(s.d[dayKey()] || 0) + T.min; }],
      [T.streak, h('b'), function (s) { return streak(s) + T.days; }],
      [T.total, h('b'), function (s) { return fmtTotal(s.total); }]
    ];
    card = h('div', { class: 'ucp-card', hidden: true }, [
      h('div', { class: 'ucp-card-head' }, [h('div', { class: 'ucp-card-identity' }, [h('strong', { text: T.name }), stateLine]), sleepBtn]),
      h('p', { class: 'ucp-help', text: T.sleepHelp }),
      h('dl', { class: 'ucp-grid' }, cardStats.map(function (r) { return h('div', null, [h('dt', { text: r[0] }), h('dd', null, [r[1]])]); })),
      h('div', { class: 'ucp-actions' }, [
        h('button', { type: 'button', class: 'ucp-ghost', text: T.hide, onclick: function () { hiddenForPage = true; applyCompanion(); } }),
        h('button', { type: 'button', class: 'ucp-ghost', text: T.openSettings, onclick: function () { card.hidden = true; me.setAttribute('aria-expanded', 'false'); openSettings(); } })
      ])
    ]);
    box = h('aside', { class: 'ucp' + (REDUCED ? ' is-still' : ''), 'aria-label': T.name + ' · ' + T.compTitle }, [bubble, card, h('div', { class: 'ucp-controls' }, [me])]);
    document.body.appendChild(box); setMood(restMood());
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && card && !card.hidden) { card.hidden = true; me.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-mark-done]'); if (!b) return;
      setTimeout(function () { if (b.getAttribute('aria-pressed') === 'true') say(L.done, 0, false); }, 60);
    });
  }
  function greet() {
    var hr = new Date().getHours(), s = data(), st = streak(s);
    var line = hr < 5 ? L.hiLate : hr >= 18 ? L.hiNight : L.hiDay;
    if (st >= 2 && hr >= 5) { say(L.hiStreak, st + ((s.d[dayKey()] || 0) >= 60 ? 0 : 1), false); return; }
    say(line, 0, false);
  }
  function tick() {
    if (!enabled()) return;
    var now = Date.now(), active = document.visibilityState === 'visible' && now - lastActive < 120000;
    if (!active) { if (!idle && document.visibilityState === 'visible') { idle = true; if (bubble.hidden) setMood('nap'); badge.textContent = L.nap; } return; }
    var STEP = 5; sessionSec += STEP;
    var s = data(), d = dayKey(); s.d[d] = (s.d[d] || 0) + STEP; s.total = (s.total || 0) + STEP; if (LKEY) s.k[LKEY] = (s.k[LKEY] || 0) + STEP;
    var keys = Object.keys(s.d).sort(); while (keys.length > 120) delete s.d[keys.shift()];
    Object.keys(s.f).forEach(function (k) { if (k !== d) delete s.f[k]; }); var df = s.f[d] = s.f[d] || [];
    save(DKEY, s);
    readingTick();
    var m = mins(sessionSec), dm = mins(s.d[d]), hr = new Date().getHours();
    var timeSteps = [[5, 'm5'], [10, 'm10'], [20, 'm20'], [25, 'm25'], [50, 'm50']];
    for (var i = timeSteps.length - 1; i >= 0; i--) { var x = timeSteps[i]; if (m >= x[0] && !fired[x[1]]) { if (say(L[x[1]])) timeSteps.slice(0, i + 1).forEach(function (step) { fired[step[1]] = true; }); break; } }
    if (m >= 80 && (m - 50) % 30 === 0 && fired.again !== m && say(L.again)) fired.again = m;
    if (hr < 5 && m >= 15 && !fired.late && say(L.late)) fired.late = true;
    [[30, 'd30'], [60, 'd60'], [120, 'd120']].forEach(function (x) { if (dm >= x[0] && df.indexOf(x[1]) < 0 && say(L[x[1]])) { df.push(x[1]); save(DKEY, s); } });
    if (bubble.hidden && now > nextSwap) { setMood(restMood()); nextSwap = now + 45000 + Math.random() * 45000; }
    refreshMe();
  }
  function activity() {
    var wasIdle = idle; lastActive = Date.now();
    if (wasIdle) { idle = false; if (box && !box.hidden) { setMood(restMood()); refreshMe(); say(L.back); } }
  }
  ['scroll', 'pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'selectionchange'].forEach(function (ev) { (ev === 'scroll' ? window : document).addEventListener(ev, activity, { passive: true }); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') activity(); });
  window.addEventListener('storage', function (e) { if (e.key === SKEY || e.key === null) { settingsMem = null; applyCompanion(); if (box) setMood(restMood()); } });
  window.addEventListener('scroll', queueDock, { passive: true });
  window.addEventListener('resize', queueDock, { passive: true });
  function applyCompanion() {
    var on = enabled();
    if (on && !box) { buildCompanion(); setTimeout(greet, 2500); }
    if (box) { box.hidden = !on; if (!on) { clearTimeout(bubbleTimer); bubble.hidden = true; } }
    document.body.classList.toggle('ucp-on', !!on);
    if (on && !timer) timer = setInterval(tick, 5000);
    if (!on && timer) { clearInterval(timer); timer = null; }
    if (on) refreshMe();
  }
  function mount() { addGear(); initLessonChecks(); initReading(); applyCompanion(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
