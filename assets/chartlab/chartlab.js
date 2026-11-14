/* 读图练习（2026-11-13）：在浏览器里生成模拟 K 线，让读者判断趋势、点出支撑位、判断突破是否收盘确认、认出最后一根的形态。
 * 每张图按课程里的口径构造并复核（第 128、131、134、140、141、143、169 课），复核不过就换一张，保证每题只有一个合理答案。
 * 价格是模拟数字，不对应任何真实资产或日期。作答只在本页计数，不写入错题本，不联网。 */
(function () {
  'use strict';
  // ---------- 生成与判定（纯函数，verify-extras.mjs 在 Node 里核对） ----------
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function r2(x) { return Math.round(x * 100) / 100; }
  function bar(o, c, up, down) { return { o: r2(o), c: r2(c), h: r2(Math.max(o, c) + up), l: r2(Math.min(o, c) - down) }; }
  function path(closes, r, start) { var out = [], prev = start; closes.forEach(function (c) { out.push(bar(prev, c, Math.abs(gauss(r)) * 0.5 + 0.1, Math.abs(gauss(r)) * 0.5 + 0.1)); prev = c; }); return out; }
  // 摆动高低点：比左右各 2 根都高（低）的那根。
  function swings(bars) { var hi = [], lo = []; for (var i = 2; i < bars.length - 2; i++) { var b = bars[i]; if (b.h > bars[i - 1].h && b.h > bars[i - 2].h && b.h >= bars[i + 1].h && b.h >= bars[i + 2].h) hi.push(i); if (b.l < bars[i - 1].l && b.l < bars[i - 2].l && b.l <= bars[i + 1].l && b.l <= bars[i + 2].l) lo.push(i); } return { hi: hi, lo: lo }; }
  // 第 169 课：上涨趋势 = 摆动高点和低点都同向抬高；下跌反之；都没有持续同向推进 = 震荡。这里要求最近三个高点、三个低点都同向。
  function classifyTrend(bars) {
    var s = swings(bars); if (s.hi.length < 3 || s.lo.length < 3) return null;
    var H = s.hi.slice(-3).map(function (i) { return bars[i].h; }), L = s.lo.slice(-3).map(function (i) { return bars[i].l; });
    var upH = H[0] < H[1] && H[1] < H[2], upL = L[0] < L[1] && L[1] < L[2], dnH = H[0] > H[1] && H[1] > H[2], dnL = L[0] > L[1] && L[1] > L[2];
    if (upH && upL) return { kind: 'up', H: H, L: L };
    if (dnH && dnL) return { kind: 'down', H: H, L: L };
    if (!upH && !dnH && !upL && !dnL) return { kind: 'range', H: H, L: L };
    return null; // 一半像趋势一半不像：不出这种题
  }
  function makeTrend(seed, want) {
    for (var k = 0; k < 200; k++) {
      var r = rng(seed * 977 + k), dir = want === 'up' ? 1 : want === 'down' ? -1 : 0, phase = r() * 6.28, closes = [];
      for (var i = 0; i < 44; i++) closes.push(100 + dir * 0.55 * i + (dir ? 2.6 : 4) * Math.sin(2 * Math.PI * i / 9 + phase) + gauss(r) * 0.35);
      var bars = path(closes, r, 100), c = classifyTrend(bars);
      if (c && c.kind === want) return { bars: bars, answer: want, swing: c };
    }
    return null;
  }
  // 第 134 课：区间 = 至少两次触及上沿、两次触及下沿，中间收盘没有持续越过边界。下沿就是要找的支撑。
  function makeRange(seed, n) {
    var r = rng(seed * 131 + 7), floor = r2(90 + r() * 20), height = r2(6 + r() * 6), ceil = r2(floor + height), mid = (floor + ceil) / 2, phase = r() * 6.28, closes = [];
    for (var i = 0; i < (n || 40); i++) closes.push(mid + (height / 2 - 0.9) * Math.sin(2 * Math.PI * i / 10 + phase) + gauss(r) * 0.25);
    var bars = path(closes, r, closes[0]);
    // 在波谷、波峰处把影线拉到边界附近，形成“触及”。
    bars.forEach(function (b, i) { var s = Math.sin(2 * Math.PI * i / 10 + phase); if (s < -0.95) b.l = r2(floor + (r() - 0.5) * 0.3); if (s > 0.95) b.h = r2(ceil + (r() - 0.5) * 0.3); b.l = Math.max(b.l, r2(floor - 0.2)); b.h = Math.min(b.h, r2(ceil + 0.2)); b.l = Math.min(b.l, b.o, b.c); b.h = Math.max(b.h, b.o, b.c); });
    var touchLo = bars.filter(function (b) { return b.l <= floor + 0.3; }).length, touchHi = bars.filter(function (b) { return b.h >= ceil - 0.3; }).length;
    var inside = bars.every(function (b) { return b.c > floor && b.c < ceil; });
    return touchLo >= 2 && touchHi >= 2 && inside ? { bars: bars, floor: floor, ceil: ceil } : null;
  }
  function makeSupport(seed) { for (var k = 0; k < 100; k++) { var g = makeRange(seed + k * 31); if (g) return g; } return null; }
  function supportOk(g, pick) { return Math.abs(pick - g.floor) <= (g.ceil - g.floor) * 0.2; }
  // 第 131 课：突破 = 收盘越过此前区间的最高价；盘中刺破、收盘缩回不算。
  function makeBreakout(seed, real) {
    for (var k = 0; k < 100; k++) {
      var g = makeRange(seed + k * 17, 34); if (!g) continue;
      var r = rng(seed * 59 + k), top = Math.max.apply(null, g.bars.map(function (b) { return b.h; })), h = g.ceil - g.floor, last = g.bars[g.bars.length - 1], o = r2(g.ceil - h * 0.25);
      var nb = real ? { o: o, c: r2(top + h * (0.12 + r() * 0.1)), h: 0, l: r2(o - h * 0.05) } : { o: o, c: r2(g.ceil - h * (0.12 + r() * 0.15)), h: r2(top + h * (0.12 + r() * 0.1)), l: r2(o - h * 0.2) };
      if (real) nb.h = r2(nb.c + h * 0.04);
      nb.l = Math.min(nb.l, nb.o, nb.c); g.bars.push(nb); void last;
      var closedAbove = nb.c > top, poked = nb.h > top;
      if (real ? closedAbove : poked && !closedAbove) return { bars: g.bars, top: top, answer: real ? 'yes' : 'no' };
    }
    return null;
  }
  // 第 128、140、141、143 课的形态口径。
  function parts(b) { var range = b.h - b.l, body = Math.abs(b.c - b.o); return { range: range, body: body, upper: b.h - Math.max(b.o, b.c), lower: Math.min(b.o, b.c) - b.l }; }
  function isDoji(b) { var p = parts(b); return p.range > 0 && p.body < p.range * 0.1; }
  function isHammerShape(b) { var p = parts(b); return p.body > 0 && p.lower >= 2 * p.body && p.upper <= p.body && Math.min(b.o, b.c) >= b.l + p.range * 0.5 && !isDoji(b); }
  function isBullEngulf(prev, b) { return prev.c < prev.o && b.c > b.o && b.o <= prev.c && b.c > prev.o; }
  function isTrendBar(b) { var p = parts(b); return b.c > b.o && p.body >= p.range * 0.6 && p.upper <= p.range * 0.2; }
  function classifyCandle(bars) {
    var b = bars[bars.length - 1], prev = bars[bars.length - 2], hits = [];
    if (isBullEngulf(prev, b)) hits.push('engulf');
    if (isHammerShape(b)) hits.push('hammer');
    if (isDoji(b)) hits.push('doji');
    if (isTrendBar(b) && !isBullEngulf(prev, b)) hits.push('trendbar');
    return hits;
  }
  function makeCandle(seed, want) {
    for (var k = 0; k < 100; k++) {
      var r = rng(seed * 313 + k), closes = [];
      for (var i = 0; i < 14; i++) closes.push(110 - i * 0.7 + gauss(r) * 0.3);
      var bars = path(closes, r, 110.5), p = closes[closes.length - 1];
      if (want === 'engulf') { bars.push({ o: r2(p + 1.1), c: r2(p), h: r2(p + 1.3), l: r2(p - 0.2) }); bars.push({ o: r2(p - 0.15), c: r2(p + 1.6 + r() * 0.4), h: 0, l: r2(p - 0.3) }); bars[bars.length - 1].h = r2(bars[bars.length - 1].c + 0.15); }
      else {
        bars.push({ o: r2(p), c: r2(p + 0.5), h: r2(p + 0.7), l: r2(p - 0.2) }); // 前一根小阳线：排除吞没
        var q = p + 0.4;
        if (want === 'hammer') { var body = 0.5 + r() * 0.2; bars.push({ o: r2(q), c: r2(q + body), h: r2(q + body + 0.08), l: r2(q - body * (2.4 + r())) }); }
        if (want === 'doji') { bars.push({ o: r2(q), c: r2(q + 0.04), h: r2(q + 0.9 + r() * 0.4), l: r2(q - 0.9 - r() * 0.4) }); }
        if (want === 'trendbar') { bars.push({ o: r2(q), c: r2(q + 1.6 + r() * 0.4), h: 0, l: r2(q - 0.1) }); bars[bars.length - 1].h = r2(bars[bars.length - 1].c + 0.12); }
      }
      var hits = classifyCandle(bars);
      if (hits.length === 1 && hits[0] === want) return { bars: bars, answer: want, parts: parts(bars[bars.length - 1]) };
    }
    return null;
  }
  var api = { rng: rng, swings: swings, classifyTrend: classifyTrend, makeTrend: makeTrend, makeRange: makeRange, makeSupport: makeSupport, supportOk: supportOk, makeBreakout: makeBreakout, classifyCandle: classifyCandle, makeCandle: makeCandle, parts: parts };
  if (typeof window !== 'undefined') window.UnfinishedChartLab = api;
  if (typeof document === 'undefined' || !document.querySelector) return;
  var host = document.querySelector('[data-chartlab]'); if (!host) return;

  // ---------- 界面 ----------
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0, base = host.getAttribute('data-base') || '';
  var T = EN ? {
    kinds: { trend: 'Trend or range?', support: 'Find the support', breakout: 'Closed breakout?', candle: 'Name the last candle' },
    pick: 'Choose an exercise', score: 'This session: {r} correct out of {n}', next: 'Next chart', check: 'Check', sim: 'Simulated candles generated in your browser; not a real asset or date.',
    trendQ: 'Looking at the swing highs and lows, what is this chart doing?', up: 'Uptrend: higher highs and higher lows', down: 'Downtrend: lower highs and lower lows', range: 'Range: highs and lows are not moving one way',
    trendWhy: 'The last three swing highs are {H} and the last three swing lows are {L}.', trendUp: 'Both are rising, so this is an uptrend.', trendDown: 'Both are falling, so this is a downtrend.', trendRange: 'Neither keeps moving one way, so treat it as a range.',
    supQ: 'Where is the support (the lower edge of this range)? Click the chart or use the slider, then check.', level: 'Your level', supRight: 'Close enough. The lower edge is about {f}; price turned up near it several times.', supWrong: 'Not quite. The lower edge is about {f} (your level: {p}). Look for the price where several lows stopped.', supNote: 'Support is a zone, not an exact number: the check accepts anything within 20% of the range height.',
    boQ: 'The last candle went above the range. Is it a breakout confirmed by the close?', yes: 'Yes: it closed above the range high', no: 'No: it only poked above and closed back inside', unk: 'Cannot tell: there is no range here',
    boWhy: 'The range high is {t}. The last candle’s high is {h} and its close is {c}.', boYes: 'The close is above the range high, so the close confirms it. Lesson 131 still waits for the next candle to follow through.', boNo: 'Only the shadow went above; the close fell back inside. Lesson 131 treats this as an unconfirmed or failed breakout.', boUnk: 'The price touched both edges at least twice before this candle, so a range is there.',
    cQ: 'After this decline, what is the last candle (highlighted)?', engulf: 'Bullish engulfing', hammer: 'Hammer', doji: 'Doji', trendbar: 'Ordinary trend bar (bullish)',
    cWhy: 'Last candle: body {b}, upper shadow {u}, lower shadow {lo}, total range {r}.', cEngulf: 'The previous candle is bearish, this one is bullish, and its body covers the previous body.', cHammer: 'The lower shadow is at least twice the body and the upper shadow is no longer than the body.', cDoji: 'The body is less than 10% of the range.', cTrend: 'The body is most of the range and it closes near the high; the previous candle is bullish, so it is not an engulfing.',
    right: 'Correct.', wrong: 'Not this time.', lessons: 'Read more:', fail: 'This chart could not be generated. Try the next one.'
  } : {
    kinds: { trend: '趋势还是震荡', support: '找出支撑位', breakout: '突破收盘确认了吗', candle: '认出最后一根K线' },
    pick: '选一种练习', score: '本次已答 {n} 题，答对 {r} 题', next: '换一张图', check: '检查', sim: '模拟K线，由浏览器随机生成，不对应任何真实资产或日期。',
    trendQ: '看摆动高点和低点，这张图在做什么？', up: '上涨趋势：高点和低点都在抬高', down: '下跌趋势：高点和低点都在降低', range: '震荡区间：高低点没有持续往一个方向走',
    trendWhy: '最近三个摆动高点依次是 {H}，最近三个摆动低点依次是 {L}。', trendUp: '两组都在抬高，所以是上涨趋势。', trendDown: '两组都在降低，所以是下跌趋势。', trendRange: '两组都没有持续往一个方向走，按震荡区间看。',
    supQ: '这段区间的支撑位（下沿）大约在哪里？在图上点一下，或拖动滑块，再点“检查”。', level: '你选的价位', supRight: '接近了。下沿大约在 {f}，价格几次在这附近止跌回升。', supWrong: '还差一点。下沿大约在 {f}（你选的是 {p}）。找几次低点都停住的那个价位。', supNote: '支撑是一片区域，不是精确数字：与下沿相差不超过区间高度的 20% 就算对。',
    boQ: '最后一根K线冲出了区间上沿。这算收盘确认的向上突破吗？', yes: '算：收盘在区间最高价之上', no: '不算：只是盘中刺破，收盘回到了区间内', unk: '看不出：这里没有区间',
    boWhy: '区间最高价是 {t}。最后一根的最高价是 {h}，收盘价是 {c}。', boYes: '收盘在区间最高价之上，所以是收盘确认的突破；第 131 课还要等下一根有没有跟随。', boNo: '只有影线越过，收盘缩回区间内。第 131 课把这种情况当作未确认或失败的突破。', boUnk: '这根之前价格已经至少两次碰到上沿、两次碰到下沿，区间是存在的。',
    cQ: '一段下跌之后，最后一根（标出的那根）是什么？', engulf: '看涨吞没', hammer: '锤子线', doji: '十字星', trendbar: '普通阳线（趋势K）',
    cWhy: '最后一根：实体 {b}，上影线 {u}，下影线 {lo}，整根波幅 {r}。', cEngulf: '前一根是阴线，这根是阳线，而且实体完全覆盖了前一根的实体。', cHammer: '下影线至少是实体的 2 倍，上影线不超过实体。', cDoji: '实体不到整根波幅的 10%。', cTrend: '实体占了整根的大部分、收在高点附近；前一根是阳线，所以不是吞没。',
    right: '答对了。', wrong: '这次没答对。', lessons: '回到课程：', fail: '这张图没能生成，换一张试试。'
  };
  var LESSONS = { trend: [[169, EN ? 'Trend vs Range' : '趋势与震荡的判断'], [116, EN ? 'Dow Theory' : '道氏理论']], support: [[111, EN ? 'Support & Resistance' : '支撑与阻力'], [134, EN ? 'Trading Ranges' : '交易区间']], breakout: [[131, EN ? 'Breakouts & Failed Breakouts' : '突破与假突破']], candle: [[140, EN ? 'Engulfing' : '吞没形态'], [141, EN ? 'Hammer & Hanging Man' : '锤子线与上吊线'], [143, EN ? 'The Doji Family' : '十字星家族'], [128, EN ? 'Trend Bars & Doji' : '趋势K与十字星']] };
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) { var e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }
  var W = 640, H = 300, PAD = { l: 8, r: 54, t: 12, b: 12 };
  function draw(bars, opts) {
    opts = opts || {};
    var lo = Math.min.apply(null, bars.map(function (b) { return b.l; })), hi = Math.max.apply(null, bars.map(function (b) { return b.h; })), span = hi - lo || 1; lo -= span * 0.08; hi += span * 0.08;
    var y = function (p) { return PAD.t + (hi - p) / (hi - lo) * (H - PAD.t - PAD.b); }, step = (W - PAD.l - PAD.r) / bars.length, cw = Math.max(3, step * 0.6);
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chartlab-svg', role: 'img', 'aria-label': T.sim });
    for (var g = 0; g <= 4; g++) { var p = lo + (hi - lo) * g / 4, yy = y(p); svg.appendChild(s('line', { x1: PAD.l, x2: W - PAD.r, y1: yy, y2: yy, class: 'cl-grid' })); var tx = s('text', { x: W - PAD.r + 6, y: yy + 4, class: 'cl-axis' }); tx.textContent = p.toFixed(1); svg.appendChild(tx); }
    bars.forEach(function (b, i) {
      var x = PAD.l + step * i + step / 2, up = b.c >= b.o, cls = up ? 'cl-up' : 'cl-down', mark = opts.mark && i >= bars.length - opts.mark;
      if (mark) svg.appendChild(s('rect', { x: x - step / 2, y: PAD.t, width: step, height: H - PAD.t - PAD.b, class: 'cl-mark' }));
      svg.appendChild(s('line', { x1: x, x2: x, y1: y(b.h), y2: y(b.l), class: cls + ' cl-wick' }));
      var top = y(Math.max(b.o, b.c)), hgt = Math.max(1.2, Math.abs(y(b.o) - y(b.c)));
      svg.appendChild(s('rect', { x: x - cw / 2, y: top, width: cw, height: hgt, class: cls + ' cl-body' }));
    });
    (opts.lines || []).forEach(function (L) { var yy = y(L.p); svg.appendChild(s('line', { x1: PAD.l, x2: W - PAD.r, y1: yy, y2: yy, class: 'cl-level ' + (L.cls || '') })); });
    svg._y = y; svg._inv = function (py) { return hi - (py - PAD.t) / (H - PAD.t - PAD.b) * (hi - lo); }; svg._lo = lo; svg._hi = hi;
    return svg;
  }

  var score = { n: 0, r: 0 }, kind = 'trend', seed = Math.floor(Math.random() * 1e6);
  var tabs = el('div', { class: 'chartlab-tabs', role: 'group', 'aria-label': T.pick }), stage = el('div', { class: 'chartlab-stage' }), scoreLine = el('p', { class: 'practice-progress', role: 'status', 'aria-live': 'polite' });
  Object.keys(T.kinds).forEach(function (k) { var b = el('button', { type: 'button', 'data-kind': k, 'aria-pressed': String(k === kind), text: T.kinds[k] }); b.addEventListener('click', function () { kind = k; Array.prototype.forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); next(); }); tabs.appendChild(b); });
  host.appendChild(tabs); host.appendChild(scoreLine); host.appendChild(stage);
  function updateScore() { scoreLine.textContent = fill(T.score, score); }
  function lessonLinks(k) { var p = el('p', { class: 'chartlab-lessons' }, [T.lessons + ' ']); LESSONS[k].forEach(function (x, i) { if (i) p.appendChild(document.createTextNode(' · ')); p.appendChild(el('a', { href: base + 'learn/' + x[0] + '-' + (EN ? 'en' : 'zh') + '.html', text: x[1] })); }); return p; }
  function finish(ok, lines, k) {
    score.n++; if (ok) score.r++; updateScore();
    var box = el('div', { class: 'chartlab-result ' + (ok ? 'is-right' : 'is-wrong'), tabindex: '-1' }, [el('p', { class: 'practice-outcome', text: ok ? T.right : T.wrong })]);
    lines.forEach(function (l) { box.appendChild(el('p', { text: l })); }); box.appendChild(lessonLinks(k));
    var nx = el('button', { type: 'button', class: 'practice-check', text: T.next }); nx.addEventListener('click', next); box.appendChild(nx);
    stage.appendChild(box); box.focus({ preventScroll: true }); box.scrollIntoView({ block: 'nearest' });
  }
  function choices(opts, onPick) {
    var wrap = el('div', { class: 'practice-options chartlab-options' });
    opts.forEach(function (o) { var b = el('button', { type: 'button', class: 'chartlab-choice', text: o[1] }); b.addEventListener('click', function () { Array.prototype.forEach.call(wrap.children, function (x) { x.disabled = true; }); b.setAttribute('aria-pressed', 'true'); onPick(o[0]); }); wrap.appendChild(b); });
    return wrap;
  }
  function chartBox(svg) { return el('div', { class: 'chartlab-chart', role: 'region', 'aria-label': T.sim, tabindex: '0' }, [svg]); }
  function next() {
    seed++; while (stage.firstChild) stage.removeChild(stage.firstChild);
    var g, svg;
    if (kind === 'trend') {
      var want = ['up', 'down', 'range'][seed % 3]; g = makeTrend(seed, want); if (!g) return stage.appendChild(el('p', { text: T.fail }));
      stage.appendChild(el('h3', { text: T.trendQ })); stage.appendChild(chartBox(draw(g.bars)));
      stage.appendChild(choices([['up', T.up], ['down', T.down], ['range', T.range]], function (v) {
        var f = function (a) { return a.map(function (x) { return x.toFixed(2); }).join(' → '); };
        finish(v === g.answer, [fill(T.trendWhy, { H: f(g.swing.H), L: f(g.swing.L) }), g.answer === 'up' ? T.trendUp : g.answer === 'down' ? T.trendDown : T.trendRange], 'trend');
      }));
    } else if (kind === 'support') {
      g = makeSupport(seed); if (!g) return stage.appendChild(el('p', { text: T.fail }));
      stage.appendChild(el('h3', { text: T.supQ }));
      svg = draw(g.bars); var pickLine = s('line', { x1: PAD.l, x2: W - PAD.r, y1: -10, y2: -10, class: 'cl-level cl-pick' }); svg.appendChild(pickLine);
      var holder = chartBox(svg); stage.appendChild(holder);
      var id = 'chartlab-level-' + seed, slider = el('input', { id: id, type: 'range', min: svg._lo.toFixed(2), max: svg._hi.toFixed(2), step: '0.05', value: ((g.floor + g.ceil) / 2).toFixed(2) }), shown = el('output', { for: id });
      var setPick = function (p) { slider.value = p.toFixed(2); shown.textContent = Number(slider.value).toFixed(2); var yy = svg._y(Number(slider.value)); pickLine.setAttribute('y1', yy); pickLine.setAttribute('y2', yy); };
      slider.addEventListener('input', function () { setPick(Number(slider.value)); });
      svg.addEventListener('click', function (e) { var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var m = svg.getScreenCTM(); if (!m) return; var loc = pt.matrixTransform(m.inverse()); setPick(Math.min(svg._hi, Math.max(svg._lo, svg._inv(loc.y)))); });
      setPick(Number(slider.value));
      var go = el('button', { type: 'button', class: 'practice-check', text: T.check });
      go.addEventListener('click', function () {
        go.disabled = true; slider.disabled = true; var p = Number(slider.value), ok = supportOk(g, p);
        svg.appendChild(s('line', { x1: PAD.l, x2: W - PAD.r, y1: svg._y(g.floor), y2: svg._y(g.floor), class: 'cl-level cl-answer' }));
        finish(ok, [fill(ok ? T.supRight : T.supWrong, { f: g.floor.toFixed(2), p: p.toFixed(2) }), T.supNote], 'support');
      });
      stage.appendChild(el('div', { class: 'chartlab-slider' }, [el('label', { for: id, text: T.level }), slider, shown, go]));
    } else if (kind === 'breakout') {
      g = makeBreakout(seed, seed % 2 === 0); if (!g) return stage.appendChild(el('p', { text: T.fail }));
      var lastB = g.bars[g.bars.length - 1];
      stage.appendChild(el('h3', { text: T.boQ })); stage.appendChild(chartBox(draw(g.bars, { mark: 1, lines: [{ p: g.top, cls: 'cl-answer' }] })));
      stage.appendChild(choices([['yes', T.yes], ['no', T.no], ['unk', T.unk]], function (v) {
        finish(v === g.answer, [fill(T.boWhy, { t: g.top.toFixed(2), h: lastB.h.toFixed(2), c: lastB.c.toFixed(2) }), v === 'unk' ? T.boUnk : g.answer === 'yes' ? T.boYes : T.boNo].concat(v === 'unk' ? [g.answer === 'yes' ? T.boYes : T.boNo] : []), 'breakout');
      }));
    } else {
      var kinds = ['engulf', 'hammer', 'doji', 'trendbar']; g = makeCandle(seed, kinds[seed % 4]); if (!g) return stage.appendChild(el('p', { text: T.fail }));
      stage.appendChild(el('h3', { text: T.cQ })); stage.appendChild(chartBox(draw(g.bars, { mark: 1 })));
      stage.appendChild(choices(kinds.map(function (k) { return [k, T[k]]; }), function (v) {
        var pp = g.parts; finish(v === g.answer, [fill(T.cWhy, { b: pp.body.toFixed(2), u: pp.upper.toFixed(2), lo: pp.lower.toFixed(2), r: pp.range.toFixed(2) }), { engulf: T.cEngulf, hammer: T.cHammer, doji: T.cDoji, trendbar: T.cTrend }[g.answer]], 'candle');
      }));
    }
    stage.appendChild(el('p', { class: 'lesson-note', text: T.sim }));
  }
  updateScore(); next();
})();
