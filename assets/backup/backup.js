/* 未尽 · 学习记录导出／恢复（2026-11-12）
 * 只在本机运行：导出是浏览器下载一个 JSON 文件，恢复是读取读者自己选的文件。不联网、不上传。
 * 只处理下面列明的字段（白名单）。不读取、不导出 AI 设置（unfinished.ai.v1）里的任何内容，
 * 也不打包整份 localStorage。恢复默认合并：不清空本机记录，重复导入同一份文件结果不变。 */
(function () {
  'use strict';
  var FORMAT = 'unfinished-learning-backup', VERSION = 3, // 2：增加作答小结（growth）、已学时间（doneAt）、提醒频率；3：作答小结按日期保留（不再只留 400 条），增加最早记录时间 since。版本 1、2 的文件照常可读
       MAX_BYTES = 8 * 1024 * 1024, KEEP_DAYS = 10; // KEEP_DAYS 与 learning-store.js 一致
  var KEYS = { learning: 'market-learning-v1', study: 'unfinished.study.v1', checks: 'unfinished.companion.progress.v1', lastTest: 'market-last-assessment', settings: 'unfinished.settings.v1' };
  var SCOPES = ['indicator', 'tool', 'method', 'all', 'information', 'market', 'basics', 'crypto', 'options', 'frontier', 'career', 'ecosystem'];
  var LEVELS = ['beginner', 'advanced'], DAY_FLAGS = ['d30', 'd60', 'd120'];
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isDate(v) { return typeof v === 'string' && v.length <= 40 && !isNaN(Date.parse(v)); }
  function isInt(v, lo, hi) { return Number.isInteger(v) && v >= lo && v <= hi; }
  function isNum(v, lo, hi) { return typeof v === 'number' && isFinite(v) && v >= lo && v <= hi; }
  function newer(a, b) { return isDate(a) && isDate(b) ? Date.parse(a) > Date.parse(b) : false; }
  /* 作答小结保留范围的起点：今天往前共 KEEP_DAYS 个自然日（与 learning-store.js 的规则相同）。 */
  function cutoff(now) { var n = now ? new Date(now) : new Date(); if (isNaN(n.getTime())) n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() - KEEP_DAYS + 1).getTime(); }
  function earliest(a, b) { if (!isDate(a)) return isDate(b) ? b : null; if (!isDate(b)) return a; return Date.parse(b) < Date.parse(a) ? b : a; }
  function fail(code, where) { var e = new Error(code); e.code = code; e.where = where || ''; throw e; }

  /* 把一份数据整理成只含白名单字段的形状。strict=true（导入）时类型不对就报错；
   * strict=false（导出）时悄悄丢掉不合规的条目。课程、题目已不存在的条目计入 skipped。 */
  function sanitize(src, ctx, strict) {
    var skipped = 0, out = { learning: { courses: {}, wrong: {}, cases: {}, practice: {}, positions: {}, growth: [], growthSince: null, last: null }, study: { d: {}, total: 0, k: {}, f: {} }, selfChecks: {}, lastAssessment: null, preferences: {} };
    function bad(where) { if (strict) fail('bad-entry', where); return false; }
    function section(parent, name, where) { var v = parent[name]; if (v == null) return {}; if (!isObj(v)) { if (strict) fail('bad-section', where); return {}; } return v; }
    var L = section(src, 'learning', 'learning'), k, v, o;
    var courses = section(L, 'courses', 'learning.courses');
    for (k in courses) if (own(courses, k)) {
      v = courses[k];
      if (!ctx.courseKeys[k]) { skipped++; continue; }
      if (!isObj(v) || (v.done != null && typeof v.done !== 'boolean') || (v.saved != null && typeof v.saved !== 'boolean') || (v.lastVisited != null && !isDate(v.lastVisited)) || (v.doneAt != null && !isDate(v.doneAt))) { bad('learning.courses'); continue; }
      o = {}; if (v.done) o.done = true; if (v.saved) o.saved = true; if (v.lastVisited) o.lastVisited = v.lastVisited; if (v.done && v.doneAt) o.doneAt = v.doneAt;
      if (o.done || o.saved || o.lastVisited) out.learning.courses[k] = o;
    }
    function answerRecord(id, v, where, needKind) {
      var max = own(ctx.questionIds, id) ? 3 : own(ctx.caseOptions, id) ? ctx.caseOptions[id] - 1 : -1;
      if (max < 0) { skipped++; return null; }
      if (!isObj(v) || !isInt(v.answer, 0, max) || (v.date != null && !isDate(v.date))) { bad(where); return null; }
      var r = { answer: v.answer }; if (needKind) r.kind = own(ctx.questionIds, id) ? 'question' : 'case'; if (v.date) r.date = v.date; return r;
    }
    var wrong = section(L, 'wrong', 'learning.wrong');
    for (k in wrong) if (own(wrong, k)) { o = answerRecord(k, wrong[k], 'learning.wrong', true); if (o) out.learning.wrong[k] = o; }
    var cases = section(L, 'cases', 'learning.cases');
    for (k in cases) if (own(cases, k)) { if (!own(ctx.caseOptions, k)) { skipped++; continue; } o = answerRecord(k, cases[k], 'learning.cases', false); if (o) out.learning.cases[k] = o; }
    var practice = section(L, 'practice', 'learning.practice');
    for (k in practice) if (own(practice, k)) {
      if (!ctx.courseKeys[k]) { skipped++; continue; }
      if (!isObj(practice[k])) { bad('learning.practice'); continue; }
      var set = {}, any = false, q;
      for (q in practice[k]) if (own(practice[k], q)) { if (!own(ctx.questionIds, q)) { skipped++; continue; } o = answerRecord(q, practice[k][q], 'learning.practice', false); if (o) { set[q] = o; any = true; } }
      if (any) out.learning.practice[k] = set;
    }
    var positions = section(L, 'positions', 'learning.positions');
    for (k in positions) if (own(positions, k)) {
      v = positions[k];
      if (!ctx.courseKeys[k]) { skipped++; continue; }
      if (!isObj(v) || typeof v.section !== 'string' || !/^[A-Za-z][\w-]{0,59}$/.test(v.section) || !isDate(v.date)) { bad('learning.positions'); continue; }
      out.learning.positions[k] = { section: v.section, date: v.date };
    }
    // 作答小结事件：只有题号、结果、来源、时间；题目已不存在的跳过。
    var G = L.growth == null ? {} : L.growth, ev = Array.isArray(G) ? G : (isObj(G) ? G.events : null), seen = {};
    if (L.growth != null && !isObj(G) && !Array.isArray(G)) bad('learning.growth');
    if (ev != null && !Array.isArray(ev)) bad('learning.growth'); else (ev || []).forEach(function (e) {
      if (!isObj(e) || typeof e.id !== 'string' || e.id.length > 160 || typeof e.q !== 'string' || ['right', 'wrong', 'fix'].indexOf(e.r) < 0 || ['lesson', 'review', 'test', 'case', 'other'].indexOf(e.src) < 0 || !isDate(e.t) || (e.topic != null && typeof e.topic !== 'string')) { bad('learning.growth'); return; }
      if (!own(ctx.questionIds, e.q) && !own(ctx.caseOptions, e.q)) { skipped++; return; }
      if (seen[e.id]) return; seen[e.id] = true;
      var item = { id: e.id, t: e.t, q: e.q, r: e.r, src: e.src }; if (e.topic && ctx.courseKeys[e.topic]) item.topic = e.topic; out.learning.growth.push(item);
    });
    if (isObj(G) && G.since != null) { if (isDate(G.since)) out.learning.growthSince = G.since; else bad('learning.growth.since'); }
    out.learning.growth.forEach(function (e) { out.learning.growthSince = earliest(out.learning.growthSince, e.t); });
    if (L.last != null) { if (typeof L.last !== 'string') bad('learning.last'); else if (ctx.courseKeys[L.last]) out.learning.last = L.last; else skipped++; }

    var S = section(src, 'study', 'study'), days = section(S, 'd', 'study.d'), per = section(S, 'k', 'study.k'), flags = section(S, 'f', 'study.f');
    for (k in days) if (own(days, k)) { if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !isNum(days[k], 0, 86400)) { bad('study.d'); continue; } out.study.d[k] = Math.floor(days[k]); }
    for (k in per) if (own(per, k)) { if (!ctx.courseKeys[k]) { skipped++; continue; } if (!isNum(per[k], 0, 1e9)) { bad('study.k'); continue; } out.study.k[k] = Math.floor(per[k]); }
    for (k in flags) if (own(flags, k)) { if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(flags[k])) { bad('study.f'); continue; } o = flags[k].filter(function (x) { return DAY_FLAGS.indexOf(x) >= 0; }); if (o.length) out.study.f[k] = o; }
    if (S.total != null) { if (!isNum(S.total, 0, 1e9)) bad('study.total'); else out.study.total = Math.floor(S.total); }

    var C = section(src, 'selfChecks', 'selfChecks'), paths = 0;
    for (k in C) if (own(C, k)) {
      if (!/^\/[\w\-./%]{1,200}$/.test(k) || !isObj(C[k]) || (C[k].checks != null && !isObj(C[k].checks)) || ++paths > 2000) { bad('selfChecks'); continue; }
      var marks = {}, has = false, i; for (i in (C[k].checks || {})) if (own(C[k].checks, i) && /^\d{1,3}$/.test(i) && C[k].checks[i] === true) { marks[i] = true; has = true; }
      if (has) out.selfChecks[k] = { checks: marks };
    }
    var A = src.lastAssessment;
    if (A != null) {
      if (!isObj(A) || SCOPES.indexOf(A.scope) < 0 || LEVELS.indexOf(A.level) < 0 || !isInt(A.total, 1, 100) || !isInt(A.right, 0, A.total) || !isDate(A.date)) bad('lastAssessment');
      else out.lastAssessment = { scope: A.scope, level: A.level, right: A.right, total: A.total, date: A.date };
    }
    var P = section(src, 'preferences', 'preferences');
    if (P.lang === 'zh' || P.lang === 'en') out.preferences.lang = P.lang; else if (P.lang != null) bad('preferences');
    if (P.paper === 'book' || P.paper === 'white') out.preferences.paper = P.paper; else if (P.paper != null) bad('preferences');
    if (typeof P.companion === 'boolean') out.preferences.companion = P.companion; else if (P.companion != null) bad('preferences');
    if (typeof P.companionSleep === 'boolean') out.preferences.companionSleep = P.companionSleep; else if (P.companionSleep != null) bad('preferences');
    if (['quiet', 'normal', 'lively'].indexOf(P.companionPace) >= 0) out.preferences.companionPace = P.companionPace; else if (P.companionPace != null) bad('preferences');
    return { data: out, skipped: skipped };
  }

  /* raw = 本机各个键读出来的对象（可能为 null）。返回要写进文件的对象。 */
  function collect(raw, ctx, now) {
    var settings = isObj(raw.settings) ? raw.settings : {};
    var clean = sanitize({ learning: raw.learning || {}, study: raw.study || {}, selfChecks: raw.checks || {}, lastAssessment: raw.lastTest, preferences: { lang: settings.lang, paper: settings.paper, companion: settings.companion, companionSleep: settings.companionSleep, companionPace: settings.companionPace } }, ctx, false).data;
    var cut = cutoff(now), growth = { events: clean.learning.growth.filter(function (e) { return Date.parse(e.t) >= cut; }) }; if (clean.learning.growthSince) growth.since = clean.learning.growthSince;
    delete clean.learning.growthSince;
    return { format: FORMAT, version: VERSION, exportedAt: now, site: '未尽 UNFINISHED', learning: Object.assign({}, clean.learning, { growth: growth }), study: clean.study, selfChecks: clean.selfChecks, lastAssessment: clean.lastAssessment, preferences: clean.preferences };
  }
  /* 读文件文字 → 校验后的数据。出错时抛出带 code 的 Error，不改任何记录。 */
  function parse(text, ctx) {
    if (typeof text !== 'string' || !text.trim()) fail('empty');
    if (text.length > MAX_BYTES) fail('too-big');
    var obj; try { obj = JSON.parse(text); } catch (e) { fail('not-json'); }
    if (!isObj(obj) || obj.format !== FORMAT) fail('not-backup');
    if (!isInt(obj.version, 1, 1e6)) fail('not-backup');
    if (obj.version > VERSION) fail('newer-version');
    if (obj.exportedAt != null && !isDate(obj.exportedAt)) fail('bad-entry', 'exportedAt');
    var r = sanitize(obj, ctx, true);
    return { data: r.data, skipped: r.skipped, exportedAt: obj.exportedAt || null };
  }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  /* 合并规则（重复导入结果不变）：
   * - 已学／收藏：没有更新时间，无法判断谁新；本机已有的标记保留，备份里有而本机没有的补上。
   * - 错题、案例、小测：两边都有日期时取较新的；否则保留本机。本机没有的才新增。
   * - 学习时长：同一天、同一课取较大值，不相加。 */
  function merge(raw, data, opt) {
    var L = isObj(raw.learning) ? copy(raw.learning) : {}, S = isObj(raw.study) ? copy(raw.study) : {}, C = isObj(raw.checks) ? copy(raw.checks) : {}, k, q;
    ['courses', 'wrong', 'cases', 'practice', 'positions'].forEach(function (n) { if (!isObj(L[n])) L[n] = {}; });
    ['d', 'k', 'f'].forEach(function (n) { if (!isObj(S[n])) S[n] = {}; });
    var sum = { growth: 0, done: 0, saved: 0, wrongNew: [], wrongUpdated: 0, cases: 0, practice: 0, positions: 0, days: 0, seconds: 0, checks: 0, lastTest: false, prefs: [], kept: 0 };
    for (k in data.learning.courses) {
      var b = data.learning.courses[k], a = isObj(L.courses[k]) ? L.courses[k] : (L.courses[k] = {});
      if (b.done && !a.done) { a.done = true; sum.done++; }
      if (b.saved && !a.saved) { a.saved = true; sum.saved++; }
      if (b.lastVisited && (!isDate(a.lastVisited) || newer(b.lastVisited, a.lastVisited))) a.lastVisited = b.lastVisited;
      if (b.doneAt && a.done && !isDate(a.doneAt)) a.doneAt = b.doneAt; // 只补缺，不改本机已有的时间
    }
    for (k in data.learning.wrong) {
      if (!own(L.wrong, k)) { sum.wrongNew.push(k); if (opt.wrongNew) L.wrong[k] = data.learning.wrong[k]; }
      else if (newer(data.learning.wrong[k].date, L.wrong[k] && L.wrong[k].date)) { L.wrong[k] = data.learning.wrong[k]; sum.wrongUpdated++; }
      else if (JSON.stringify(L.wrong[k]) !== JSON.stringify(data.learning.wrong[k])) sum.kept++;
    }
    for (k in data.learning.cases) {
      if (!own(L.cases, k)) { L.cases[k] = data.learning.cases[k]; sum.cases++; }
      else if (newer(data.learning.cases[k].date, L.cases[k] && L.cases[k].date)) { L.cases[k] = data.learning.cases[k]; sum.cases++; }
      else if (JSON.stringify(L.cases[k]) !== JSON.stringify(data.learning.cases[k])) sum.kept++;
    }
    for (k in data.learning.practice) {
      if (!isObj(L.practice[k])) L.practice[k] = {};
      for (q in data.learning.practice[k]) {
        var mine = L.practice[k][q], theirs = data.learning.practice[k][q];
        if (!isObj(mine) || newer(theirs.date, mine.date)) { L.practice[k][q] = theirs; sum.practice++; }
        else if (JSON.stringify(mine) !== JSON.stringify(theirs)) sum.kept++;
      }
    }
    for (k in data.learning.positions) { if (!isObj(L.positions[k]) || newer(data.learning.positions[k].date, L.positions[k].date)) { L.positions[k] = data.learning.positions[k]; sum.positions++; } }
    // 作答小结：按事件编号合并，同一事件只留一份；导入不会触发任何鼓励。
    // 只保留统计窗口内的事件（按日期，不按条数）；更早的不导入，但最早记录时间照常合并。重复导入结果不变。
    if (data.learning.growth.length || data.learning.growthSince) {
      if (!isObj(L.growth)) L.growth = { v: 1, events: [] }; if (!Array.isArray(L.growth.events)) L.growth.events = [];
      var cut = cutoff(opt && opt.now), have = {}, since = earliest(L.growth.since, data.learning.growthSince);
      L.growth.events.forEach(function (e) { if (e && e.id) have[e.id] = true; if (e) since = earliest(since, e.t); });
      data.learning.growth.forEach(function (e) { if (!have[e.id] && Date.parse(e.t) >= cut) { have[e.id] = true; L.growth.events.push(e); sum.growth++; } });
      L.growth.events = L.growth.events.filter(function (e) { return e && isDate(e.t) && Date.parse(e.t) >= cut; });
      L.growth.events.sort(function (x, y) { return Date.parse(x.t) - Date.parse(y.t); });
      if (since) L.growth.since = since;
    }
    if (!L.last && data.learning.last) L.last = data.learning.last;
    var before = typeof S.total === 'number' ? S.total : 0, total = 0;
    for (k in data.study.d) { var have = typeof S.d[k] === 'number' ? S.d[k] : 0; if (!own(S.d, k)) sum.days++; if (data.study.d[k] > have) S.d[k] = data.study.d[k]; }
    for (k in data.study.k) { if (!(typeof S.k[k] === 'number' && S.k[k] >= data.study.k[k])) S.k[k] = data.study.k[k]; }
    for (k in S.d) if (typeof S.d[k] === 'number') total += S.d[k];
    S.total = Math.max(before, data.study.total, total); sum.seconds = S.total - before;
    // 已经达到当天时长里程碑的不再重复鼓励：把对应标记补上。
    for (k in S.d) { var fl = Array.isArray(S.f[k]) ? S.f[k] : [], theirF = data.study.f[k] || [], mins = Math.floor((S.d[k] || 0) / 60); [[30, 'd30'], [60, 'd60'], [120, 'd120']].forEach(function (x) { if ((theirF.indexOf(x[1]) >= 0 || (own(data.study.d, k) && mins >= x[0])) && fl.indexOf(x[1]) < 0) fl.push(x[1]); }); if (fl.length) S.f[k] = fl; }
    for (k in data.selfChecks) {
      if (!isObj(C[k])) C[k] = { checks: {} }; if (!isObj(C[k].checks)) C[k].checks = {};
      for (q in data.selfChecks[k].checks) if (C[k].checks[q] !== true) { C[k].checks[q] = true; sum.checks++; }
    }
    var T = isObj(raw.lastTest) ? raw.lastTest : null;
    if (data.lastAssessment && (!T || newer(data.lastAssessment.date, T.date))) { T = data.lastAssessment; sum.lastTest = true; }
    var settings = null;
    if (opt.prefs) { settings = isObj(raw.settings) ? copy(raw.settings) : {}; for (k in data.preferences) if (settings[k] !== data.preferences[k]) { settings[k] = data.preferences[k]; sum.prefs.push(k); } if (!sum.prefs.length) settings = null; }
    return { stores: { learning: L, study: S, checks: C, lastTest: T, settings: settings }, summary: sum };
  }
  window.UnfinishedBackup = { FORMAT: FORMAT, VERSION: VERSION, KEYS: KEYS, collect: collect, parse: parse, merge: merge };

  /* ---------- 页面 ---------- */
  var host = typeof document !== 'undefined' && document.querySelector('[data-learning-backup]');
  if (!host) return;
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    intro: 'Your learning record lives only in this browser. Export it to a file to keep a copy or move it to another browser. Nothing is uploaded.',
    exportBtn: 'Export learning record', importBtn: 'Restore from a file…', where: 'The file is saved wherever your browser saves downloads (or the place you choose). It contains lesson marks, saved lessons, mistakes, case answers, lesson quiz answers, the answer history behind the study summary, reading positions and study time. It never contains AI keys or settings from the AI panel.',
    exported: 'Exported {file}: {a} lessons marked, {b} mistakes, {c} study days.', exportedEmpty: 'Exported {file}. There is no learning record in this browser yet, so the file is nearly empty.',
    preview: 'What this file will restore', from: 'Backup made on {d}.', none: 'Nothing new: everything in this file is already in this browser.',
    done: '{n} lessons newly marked as read', saved: '{n} lessons newly saved', wrongUpdated: '{n} mistakes updated to the newer record', cases: '{n} case answers', practice: '{n} lesson quiz answers', positions: '{n} reading positions', growth: '{n} answer-history entries for the study summary', days: '{n} new study days', seconds: 'study time grows by {n} min', checks: '{n} self-check marks', lastTest: 'the most recent test score',
    rules: 'How conflicts are handled: this browser’s record is never cleared. “Read” and “saved” marks carry no time, so marks already here are kept and missing ones are added. For mistakes and answers, the newer dated record wins. Study time takes the larger value per day rather than adding, so importing the same file twice changes nothing.',
    wrongNew: 'Also add {n} mistakes that are in the file but not in this browser', wrongNote: 'The file cannot tell whether you already reviewed and removed these here. If you did, untick this box.', wrongList: 'Show these questions',
    prefs: 'Also restore interface preferences (language, reading background, companion on/off, sleep and how often she speaks)', skipped: '{n} entries refer to lessons or questions that no longer exist and were skipped.',
    kept: '{n} entries differ, and this browser’s version is kept.',
    confirm: 'Restore', cancel: 'Cancel', ok: 'Restored. Your progress, mistakes and study time on this page are up to date.', okPrefs: ' Preference changes apply after you reload the page.',
    blocked: 'This browser is blocking storage, so a restore cannot be saved. Allow site data for this site (or leave private mode), then try again. Export still works for what is on this page.',
    writeFail: 'The record could not be saved (storage is full or blocked). Nothing was changed. Free some space or allow site data, then try again.',
    err: { empty: 'The file is empty.', 'too-big': 'The file is larger than 8 MB, which is not a backup from this site.', 'not-json': 'The file is not valid JSON. It may be damaged or not a backup from this site.', 'not-backup': 'This is not a learning-record backup from this site.', 'newer-version': 'This backup was made by a newer version of the site. Reload this page to get the latest version, then try again.', 'bad-entry': 'The file has an entry in an unexpected format ({w}). Nothing was changed.', 'bad-section': 'The file has a section in an unexpected format ({w}). Nothing was changed.', read: 'The file could not be read. Choose it again.' },
    untouched: 'Your current record was not changed.'
  } : {
    intro: '学习记录只保存在当前浏览器。导出成文件可以留一份备份，或搬到另一个浏览器。不会上传到任何地方。',
    exportBtn: '导出学习记录', importBtn: '从文件恢复…', where: '文件保存在浏览器的下载位置（或你选择的位置）。里面有：已学和收藏标记、错题、案例作答、课后小测作答、作答小结记录、阅读位置和学习时长。不包含 AI 面板里的密钥和设置。',
    exported: '已导出 {file}：{a} 课已学标记、{b} 道错题、{c} 天学习时长。', exportedEmpty: '已导出 {file}。当前浏览器还没有学习记录，所以文件几乎是空的。',
    preview: '这份文件将恢复的内容', from: '备份时间：{d}。', none: '没有新内容：文件里的记录本机都已经有了。',
    done: '新增 {n} 课“已学”标记', saved: '新增 {n} 课收藏', wrongUpdated: '{n} 道错题更新为较新的记录', cases: '{n} 个案例作答', practice: '{n} 道课后小测作答', positions: '{n} 个阅读位置', growth: '{n} 条作答小结记录', days: '新增 {n} 天学习时长', seconds: '累计学习时长增加 {n} 分钟', checks: '{n} 个自测完成标记', lastTest: '最近一次测验成绩',
    rules: '冲突怎么处理：本机记录不会被清空。“已学”“收藏”没有记录时间，分不出谁新，所以本机已有的标记保留，缺的补上。错题和作答两边都有日期时取较新的。学习时长同一天取较大值、不相加，所以同一份文件导入两次结果不变。',
    wrongNew: '同时加入 {n} 道“文件里有、本机没有”的错题', wrongNote: '文件无法判断这些题你是不是已经在本机复习并移出了。如果是，请取消勾选。', wrongList: '查看这些题目',
    prefs: '同时恢复界面偏好（语言、阅读背景、伴学开关、睡眠与提醒频率）', skipped: '有 {n} 条记录对应的课程或题目已不存在，已跳过。',
    kept: '有 {n} 条记录两边不同，保留本机的。',
    confirm: '确认恢复', cancel: '取消', ok: '已恢复。本页的课程进度、错题和学习时长已更新。', okPrefs: '偏好的改动在刷新页面后生效。',
    blocked: '当前浏览器阻止了存储，恢复的内容无法保存。请允许本站保存数据（或退出无痕模式）后再试。导出仍可用于本页已有的内容。',
    writeFail: '记录没能保存（存储空间已满或被阻止），没有改动任何内容。请清理空间或允许本站保存数据后再试。',
    err: { empty: '文件是空的。', 'too-big': '文件超过 8 MB，不是本站导出的备份。', 'not-json': '文件不是有效的 JSON，可能已损坏，或不是本站导出的备份。', 'not-backup': '这不是本站导出的学习记录备份。', 'newer-version': '这份备份来自更新版本的网站。请刷新本页拿到最新版本后再试。', 'bad-entry': '文件里有一条记录格式不对（{w}），没有改动任何内容。', 'bad-section': '文件里有一部分格式不对（{w}），没有改动任何内容。', read: '文件读取失败，请重新选择。' },
    untouched: '当前记录没有改动。'
  };
  function h(tag, attrs, kids) { var el = document.createElement(tag), k; for (k in (attrs || {})) { if (k === 'text') el.textContent = attrs[k]; else if (attrs[k] === true) el.setAttribute(k, ''); else if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k]); } (kids || []).forEach(function (c) { if (c) el.appendChild(c); }); return el; }
  function fill(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k]; }); }
  function context() {
    var courseKeys = {}, questionIds = {}, caseOptions = {};
    (window.STUDY_CATALOG || []).forEach(function (t) { courseKeys[t.key] = true; });
    (window.MARKET_QUESTIONS || []).forEach(function (q) { questionIds[q.id] = true; });
    (window.MARKET_CASES || []).forEach(function (c) { caseOptions[c.id] = c.options.length; });
    return { courseKeys: courseKeys, questionIds: questionIds, caseOptions: caseOptions };
  }
  function readKey(k) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return isObj(v) ? v : null; } catch (e) { return null; } }
  function readAll() { var learning = window.LearningStore ? LearningStore.read() : readKey(KEYS.learning); return { learning: learning, study: readKey(KEYS.study), checks: readKey(KEYS.checks), lastTest: readKey(KEYS.lastTest), settings: readKey(KEYS.settings) }; }
  function storageWorks() { try { localStorage.setItem('unfinished.backup.probe', '1'); localStorage.removeItem('unfinished.backup.probe'); return true; } catch (e) { return false; } }

  var status = h('p', { class: 'backup-status', role: 'status', 'aria-live': 'polite' }), panel = h('div', { class: 'backup-preview', hidden: true });
  var file = h('input', { type: 'file', accept: '.json,application/json', id: 'backup-file', class: 'backup-file' });
  var exportBtn = h('button', { type: 'button', class: 'practice-check', id: 'backup-export', text: T.exportBtn });
  var importBtn = h('button', { type: 'button', class: 'practice-reset', id: 'backup-import', text: T.importBtn });
  importBtn.addEventListener('click', function () { file.value = ''; file.click(); });
  host.appendChild(h('p', { text: T.intro }));
  host.appendChild(h('div', { class: 'backup-actions' }, [exportBtn, importBtn, file]));
  host.appendChild(h('p', { class: 'practice-note', text: T.where }));
  host.appendChild(status); host.appendChild(panel);
  function say(text, error) { status.textContent = text; status.classList.toggle('is-error', !!error); }
  function closePanel() { panel.hidden = true; while (panel.firstChild) panel.removeChild(panel.firstChild); }

  exportBtn.addEventListener('click', function () {
    closePanel();
    var now = new Date(), data = collect(readAll(), context(), now.toISOString());
    var name = 'unfinished-learning-' + now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2) + '.json';
    var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })), a = h('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    var done = Object.keys(data.learning.courses).filter(function (k) { return data.learning.courses[k].done; }).length, wrong = Object.keys(data.learning.wrong).length, days = Object.keys(data.study.d).length;
    var empty = !Object.keys(data.learning.courses).length && !wrong && !days && !Object.keys(data.learning.cases).length && !Object.keys(data.learning.practice).length;
    say(empty ? fill(T.exportedEmpty, { file: name }) : fill(T.exported, { file: name, a: done, b: wrong, c: days }));
  });

  function questionTitle(id) { var q = (window.MARKET_QUESTIONS || []).filter(function (x) { return x.id === id; })[0], c = (window.MARKET_CASES || []).filter(function (x) { return x.id === id; })[0]; return q ? q.stem : c ? c.question : id; }
  function showPreview(parsed) {
    closePanel();
    var wrongBox = h('input', { type: 'checkbox', id: 'backup-wrong', checked: true }), prefsBox = h('input', { type: 'checkbox', id: 'backup-prefs' });
    var list = h('ul', { class: 'backup-list' }), extra = h('div');
    function plan() { return merge(readAll(), parsed.data, { wrongNew: wrongBox.checked, prefs: prefsBox.checked }); }
    function draw() {
      var s = plan().summary; while (list.firstChild) list.removeChild(list.firstChild);
      var lines = [];
      if (s.done) lines.push(fill(T.done, { n: s.done })); if (s.saved) lines.push(fill(T.saved, { n: s.saved }));
      if (s.wrongUpdated) lines.push(fill(T.wrongUpdated, { n: s.wrongUpdated })); if (s.cases) lines.push(fill(T.cases, { n: s.cases }));
      if (s.practice) lines.push(fill(T.practice, { n: s.practice })); if (s.positions) lines.push(fill(T.positions, { n: s.positions })); if (s.growth) lines.push(fill(T.growth, { n: s.growth }));
      if (s.days) lines.push(fill(T.days, { n: s.days })); if (s.seconds >= 60) lines.push(fill(T.seconds, { n: Math.floor(s.seconds / 60) }));
      if (s.checks) lines.push(fill(T.checks, { n: s.checks })); if (s.lastTest) lines.push(T.lastTest);
      if (!lines.length && !(wrongBox.checked && s.wrongNew.length) && !s.prefs.length) lines.push(T.none);
      lines.forEach(function (t) { list.appendChild(h('li', { text: t })); });
      if (s.kept) list.appendChild(h('li', { text: fill(T.kept, { n: s.kept }) }));
    }
    var first = plan().summary;
    panel.appendChild(h('h3', { text: T.preview, tabindex: '-1' }));
    if (parsed.exportedAt) panel.appendChild(h('p', { text: fill(T.from, { d: new Date(parsed.exportedAt).toLocaleString(EN ? 'en' : 'zh-CN') }) }));
    panel.appendChild(list);
    if (first.wrongNew.length) {
      extra.appendChild(h('label', { class: 'backup-choice' }, [wrongBox, h('span', { text: fill(T.wrongNew, { n: first.wrongNew.length }) })]));
      extra.appendChild(h('p', { class: 'practice-note', text: T.wrongNote }));
      var ol = h('ol'); first.wrongNew.forEach(function (id) { ol.appendChild(h('li', { text: questionTitle(id) })); });
      extra.appendChild(h('details', {}, [h('summary', { text: T.wrongList }), ol]));
    }
    if (Object.keys(parsed.data.preferences).length) extra.appendChild(h('label', { class: 'backup-choice' }, [prefsBox, h('span', { text: T.prefs })]));
    panel.appendChild(extra);
    if (parsed.skipped) panel.appendChild(h('p', { class: 'practice-note', text: fill(T.skipped, { n: parsed.skipped }) }));
    panel.appendChild(h('p', { class: 'practice-note', text: T.rules }));
    var ok = h('button', { type: 'button', class: 'practice-check', id: 'backup-confirm', text: T.confirm }), no = h('button', { type: 'button', class: 'practice-reset', id: 'backup-cancel', text: T.cancel });
    panel.appendChild(h('div', { class: 'backup-actions' }, [ok, no]));
    wrongBox.addEventListener('change', draw); prefsBox.addEventListener('change', draw); draw();
    no.addEventListener('click', function () { closePanel(); say(T.untouched); importBtn.focus(); });
    ok.addEventListener('click', function () {
      if (!storageWorks()) { say(T.blocked, true); return; }
      var result = plan(), st = result.stores, writes = [[KEYS.learning, st.learning], [KEYS.study, st.study], [KEYS.checks, st.checks]], old = {}, i;
      if (st.lastTest) writes.push([KEYS.lastTest, st.lastTest]); if (st.settings) writes.push([KEYS.settings, st.settings]);
      try {
        for (i = 0; i < writes.length; i++) { old[writes[i][0]] = localStorage.getItem(writes[i][0]); localStorage.setItem(writes[i][0], JSON.stringify(writes[i][1])); }
      } catch (e) {
        Object.keys(old).forEach(function (k) { try { if (old[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, old[k]); } catch (x) {} });
        say(T.writeFail, true); return;
      }
      closePanel();
      if (window.LearningStore) LearningStore.write(function () {}); // 通知本页各处重新读取
      window.dispatchEvent(new Event('storage'));
      say(T.ok + (result.summary.prefs.length ? T.okPrefs : '')); status.setAttribute('tabindex', '-1'); status.focus();
    });
    panel.hidden = false; panel.querySelector('h3').focus();
  }
  file.addEventListener('change', function () {
    var f = file.files && file.files[0]; if (!f) return;
    closePanel();
    if (f.size > MAX_BYTES) { say(T.err['too-big'] + ' ' + T.untouched, true); return; }
    var reader = new FileReader();
    reader.onerror = function () { say(T.err.read, true); };
    reader.onload = function () {
      var parsed; try { parsed = parse(String(reader.result), context()); } catch (e) { say(fill(T.err[e.code] || T.err['not-backup'], { w: e.where || '' }) + ' ' + T.untouched, true); return; }
      say(''); showPreview(parsed);
    };
    reader.readAsText(f);
  });
  if (!storageWorks()) say(T.blocked, true);
})();
