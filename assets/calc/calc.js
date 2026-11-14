/* 小计算器（2026-11-13）：仓位与盈亏比、回撤恢复、杠杆强平价、期权到期盈亏、无常损失。
 * 放在对应课程页的“自己算一算”和 calculators.html。只在本页计算，不保存、不联网。所有结果都写出算式，并注明简化假设。
 * 用法：<div data-calc="position|drawdown|leverage|option|il"></div>。 */
(function () {
  'use strict';
  var EN = typeof document !== 'undefined' && document.documentElement && (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var Z = {
    note: '只作学习演示：不含手续费、滑点、资金费率等成本，结果不构成交易建议。', bad: '请填写有效的数字。',
    position: { title: '仓位大小与盈亏比', intro: '先定“这笔最多亏多少”，再由止损距离倒推能买多少。', account: '账户资金', risk: '单笔最多亏账户的 %', entry: '计划买入价', stop: '止损价', target: '目标价（可不填）',
      out: '最多亏损 {risk} = {account} × {pct}%。每单位从买入价到止损亏 {per}，所以数量 = {risk} ÷ {per} = {qty}，仓位价值约 {value}（占账户 {share}%）。',
      lever: '仓位价值超过账户资金，需要借钱或用杠杆才能买到这个数量；新手先缩小仓位。', rr: '盈亏比 = 潜在盈利 {gain} ÷ 潜在亏损 {per} = {rr}。在这个盈亏比下，长期胜率要高于 1 ÷ (1 + {rr}) = {win}% 才不亏（不计成本）。', side: '目标价要在止损的另一侧。', same: '买入价和止损价不能相同。' },
    drawdown: { title: '亏损后要涨多少才能回本', intro: '亏得越多，回本需要的涨幅越大，这就是先控制亏损的原因。', loss: '亏损 %', perTrade: '每笔亏账户的 %', streak: '连续亏几笔',
      out: '亏 {loss}% 后剩 {left}%，剩下的钱要涨 {loss} ÷ {left} = {need}% 才能回到原来的金额。', streakOut: '每笔亏 {p}%、连续亏 {n} 笔：账户剩 (1 − {p}%)^{n} = {rest}%，共亏 {lost}%。', range: '亏损要在 0 到 99.9 之间。' },
    leverage: { title: '杠杆仓位的大致强平价', intro: '按逐仓、U 本位线性合约简化计算；真实交易所还有手续费、分档维持保证金和标记价格，强平通常更早。', margin: '保证金', lev: '杠杆倍数', entry: '开仓价', mmr: '维持保证金率 %', dir: '方向', long: '做多', short: '做空',
      out: '仓位价值 = {margin} × {lev} = {value}，数量 = {value} ÷ {entry} = {qty}。', liqLong: '做多强平价 ≈ 开仓价 × (1 − 1/杠杆) ÷ (1 − 维持保证金率) = {entry} × (1 − 1/{lev}) ÷ (1 − {mmr}%) = {liq}，价格下跌约 {move}% 就会被强平。', liqShort: '做空强平价 ≈ 开仓价 × (1 + 1/杠杆) ÷ (1 + 维持保证金率) = {entry} × (1 + 1/{lev}) ÷ (1 + {mmr}%) = {liq}，价格上涨约 {move}% 就会被强平。', levRange: '杠杆要在 1 到 125 之间，维持保证金率在 0 到 50 之间。' },
    option: { title: '期权到期盈亏', intro: '只看到期那一刻：到期前的价格还受时间价值和波动率影响。', type: '期权类型', call: '看涨（Call）', put: '看跌（Put）', side: '买入或卖出', buy: '买入', sell: '卖出', strike: '行权价', premium: '每份权利金', mult: '每张对应的份数', at: '假设到期价',
      out: '到期内在价值 = {intr}（看涨取 max(到期价 − 行权价, 0)，看跌取 max(行权价 − 到期价, 0)）。{sideText}每份盈亏 = {per}，乘以 {mult} 份 = {total}。', buyText: '买方：内在价值 − 权利金，', sellText: '卖方：权利金 − 内在价值，', be: '盈亏平衡的到期价 = {formula} = {be}。', maxBuy: '买方最多亏掉权利金 {max}。', maxSellCall: '卖出看涨期权：价格涨得越多亏得越多，理论上没有上限。', maxSellPut: '卖出看跌期权：最大亏损发生在标的跌到 0，为 (行权价 − 权利金) × 份数 = {max}。', table: '到期价', pl: '盈亏' },
    il: { title: '无常损失（恒定乘积 50/50 池）', intro: '按 x·y = k、两边各一半价值的资金池计算，不含手续费收入。集中流动性池（如第 227 课）的损失会被放大，不适用这个公式。', value: '存入时总价值', change: '币价变化 %',
      out: '价格比 r = 1 + {chg}% = {r}。一直拿着不动：{v} ÷ 2 × (1 + r) = {hold}；放在池里：{v} × √r = {lp}。', loss: '无常损失 = 2√r ÷ (1 + r) − 1 = {il}%，比一直拿着少 {diff}。只有手续费等收入超过这部分，提供流动性才划算。', range: '币价变化要大于 −100%。' }
  };
  var E = {
    note: 'Learning demo only: fees, slippage and funding are ignored. Not trading advice.', bad: 'Enter valid numbers.',
    position: { title: 'Position size and reward-to-risk', intro: 'Decide the most you will lose on this trade first, then work back from the stop distance.', account: 'Account balance', risk: 'Max loss per trade, % of account', entry: 'Planned entry', stop: 'Stop price', target: 'Target (optional)',
      out: 'Max loss {risk} = {account} × {pct}%. Each unit loses {per} from entry to stop, so size = {risk} ÷ {per} = {qty}; position value ≈ {value} ({share}% of the account).',
      lever: 'The position is larger than the account, so it would need borrowing or leverage. Beginners should size down.', rr: 'Reward-to-risk = potential gain {gain} ÷ potential loss {per} = {rr}. At this ratio the long-run win rate must exceed 1 ÷ (1 + {rr}) = {win}% to break even (before costs).', side: 'The target must be on the other side of the entry from the stop.', same: 'Entry and stop cannot be equal.' },
    drawdown: { title: 'How much you need to gain back after a loss', intro: 'The bigger the loss, the bigger the gain needed to recover. That is why losses come first.', loss: 'Loss %', perTrade: 'Loss per trade, % of account', streak: 'Losses in a row',
      out: 'After a {loss}% loss, {left}% is left. To recover you need {loss} ÷ {left} = {need}% gain.', streakOut: 'Losing {p}% per trade {n} times in a row leaves (1 − {p}%)^{n} = {rest}% of the account, a total loss of {lost}%.', range: 'Loss must be between 0 and 99.9.' },
    leverage: { title: 'Approximate liquidation price', intro: 'Simplified for isolated margin on a linear (USDT-margined) contract. Real exchanges add fees, tiered maintenance margin and mark prices, so liquidation usually comes earlier.', margin: 'Margin', lev: 'Leverage', entry: 'Entry price', mmr: 'Maintenance margin rate %', dir: 'Direction', long: 'Long', short: 'Short',
      out: 'Position value = {margin} × {lev} = {value}; size = {value} ÷ {entry} = {qty}.', liqLong: 'Long liquidation ≈ entry × (1 − 1/leverage) ÷ (1 − maintenance rate) = {entry} × (1 − 1/{lev}) ÷ (1 − {mmr}%) = {liq}. A drop of about {move}% liquidates the position.', liqShort: 'Short liquidation ≈ entry × (1 + 1/leverage) ÷ (1 + maintenance rate) = {entry} × (1 + 1/{lev}) ÷ (1 + {mmr}%) = {liq}. A rise of about {move}% liquidates the position.', levRange: 'Leverage must be 1–125 and the maintenance rate 0–50.' },
    option: { title: 'Option profit or loss at expiry', intro: 'Expiry only: before expiry the price also depends on time value and volatility.', type: 'Option type', call: 'Call', put: 'Put', side: 'Buy or sell', buy: 'Buy', sell: 'Sell', strike: 'Strike', premium: 'Premium per unit', mult: 'Units per contract', at: 'Price at expiry',
      out: 'Intrinsic value at expiry = {intr} (call: max(expiry − strike, 0); put: max(strike − expiry, 0)). {sideText}per unit = {per}; × {mult} units = {total}.', buyText: 'Buyer: intrinsic − premium, ', sellText: 'Seller: premium − intrinsic, ', be: 'Break-even expiry price = {formula} = {be}.', maxBuy: 'The buyer can lose at most the premium, {max}.', maxSellCall: 'Selling a call: the higher the price goes, the bigger the loss, with no theoretical limit.', maxSellPut: 'Selling a put: the worst case is the underlying going to 0, a loss of (strike − premium) × units = {max}.', table: 'Expiry price', pl: 'P/L' },
    il: { title: 'Impermanent loss (constant-product 50/50 pool)', intro: 'Uses an x·y = k pool holding equal value on both sides, before fee income. Concentrated-liquidity pools (lesson 227) magnify the loss; this formula does not apply to them.', value: 'Value deposited', change: 'Price change %',
      out: 'Price ratio r = 1 + {chg}% = {r}. Just holding: {v} ÷ 2 × (1 + r) = {hold}; in the pool: {v} × √r = {lp}.', loss: 'Impermanent loss = 2√r ÷ (1 + r) − 1 = {il}%, i.e. {diff} less than holding. Providing liquidity pays only if fees and other income exceed this.', range: 'Price change must be greater than −100%.' }
  };
  var T = EN ? E : Z;
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function fmt(n, d) { if (!isFinite(n)) return '—'; var a = Math.abs(n), dd = d != null ? d : a >= 1000 ? 2 : a >= 1 ? 4 : 6; return Number(n.toFixed(dd)).toLocaleString(EN ? 'en-US' : 'zh-CN', { maximumFractionDigits: dd }); }
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  var uid = 0;
  function num(label, value, opts) { var id = 'calc-' + (++uid); var input = el('input', Object.assign({ id: id, type: 'number', inputmode: 'decimal', step: 'any', value: String(value) }, opts || {})); return { wrap: el('label', { class: 'calc-field', for: id }, [el('span', { text: label }), input]), input: input }; }
  function pick(label, options, value) { var id = 'calc-' + (++uid); var s = el('select', { id: id }); options.forEach(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (o[0] === value) op.selected = true; s.appendChild(op); }); return { wrap: el('label', { class: 'calc-field', for: id }, [el('span', { text: label }), s]), input: s }; }
  function v(f) { var x = f.input.value; return x === '' ? NaN : Number(x); }

  // 纯计算函数（供 verify-extras.mjs 在 Node 里核对），全部不含界面。
  var M = {
    position: function (account, pct, entry, stop, target) {
      var risk = account * pct / 100, per = Math.abs(entry - stop); if (!(per > 0)) return { error: 'same' };
      var qty = risk / per, value = qty * entry, r = { risk: risk, per: per, qty: qty, value: value, share: value / account * 100 };
      if (isFinite(target)) { var long = stop < entry, gain = long ? target - entry : entry - target; if (!(gain > 0)) r.sideError = true; else { r.gain = gain; r.rr = gain / per; r.win = 100 / (1 + r.rr); } }
      return r;
    },
    drawdown: function (loss) { var left = 100 - loss; return { left: left, need: loss / left * 100 }; },
    streak: function (p, n) { var rest = Math.pow(1 - p / 100, n) * 100; return { rest: rest, lost: 100 - rest }; },
    leverage: function (margin, lev, entry, mmr, dir) {
      var value = margin * lev, qty = value / entry, m = mmr / 100;
      var liq = dir === 'short' ? entry * (1 + 1 / lev) / (1 + m) : entry * (1 - 1 / lev) / (1 - m);
      return { value: value, qty: qty, liq: liq, move: Math.abs(liq - entry) / entry * 100 };
    },
    option: function (type, side, K, p, mult, S) {
      var intr = type === 'put' ? Math.max(K - S, 0) : Math.max(S - K, 0), per = side === 'sell' ? p - intr : intr - p;
      return { intr: intr, per: per, total: per * mult, be: type === 'put' ? K - p : K + p };
    },
    il: function (value, chg) { var r = 1 + chg / 100, hold = value / 2 * (1 + r), lp = value * Math.sqrt(r); return { r: r, hold: hold, lp: lp, il: (2 * Math.sqrt(r) / (1 + r) - 1) * 100, diff: hold - lp }; }
  };

  var builders = {
    position: function (out) {
      var t = T.position, f = [num(t.account, 10000, { min: '0' }), num(t.risk, 1, { min: '0', max: '100' }), num(t.entry, 50, { min: '0' }), num(t.stop, 47, { min: '0' }), num(t.target, 59, { min: '0' })];
      return { fields: f, run: function () {
        var a = v(f[0]), pct = v(f[1]), e = v(f[2]), s = v(f[3]), tg = v(f[4]);
        if (!(a > 0) || !(pct > 0 && pct <= 100) || !(e > 0) || !(s > 0)) return [T.bad];
        var r = M.position(a, pct, e, s, tg); if (r.error) return [t.same];
        var lines = [fill(t.out, { risk: fmt(r.risk, 2), account: fmt(a, 2), pct: fmt(pct, 2), per: fmt(r.per), qty: fmt(r.qty), value: fmt(r.value, 2), share: fmt(r.share, 1) })];
        if (r.value > a) lines.push(t.lever);
        if (r.sideError) lines.push(t.side); else if (r.rr != null) lines.push(fill(t.rr, { gain: fmt(r.gain), per: fmt(r.per), rr: fmt(r.rr, 2), win: fmt(r.win, 1) }));
        return lines;
      } };
    },
    drawdown: function () {
      var t = T.drawdown, f = [num(t.loss, 50, { min: '0', max: '99.9' }), num(t.perTrade, 2, { min: '0', max: '100' }), num(t.streak, 10, { min: '1', max: '100', step: '1' })];
      return { fields: f, run: function () {
        var loss = v(f[0]), p = v(f[1]), n = v(f[2]), lines = [];
        if (!(loss >= 0 && loss < 100)) lines.push(t.range); else { var r = M.drawdown(loss); lines.push(fill(t.out, { loss: fmt(loss, 2), left: fmt(r.left, 2), need: fmt(r.need, 1) })); }
        if (p > 0 && p < 100 && n >= 1 && n <= 100 && Math.floor(n) === n) { var s = M.streak(p, n); lines.push(fill(t.streakOut, { p: fmt(p, 2), n: n, rest: fmt(s.rest, 1), lost: fmt(s.lost, 1) })); }
        return lines.length ? lines : [T.bad];
      } };
    },
    leverage: function () {
      var t = T.leverage, f = [num(t.margin, 1000, { min: '0' }), num(t.lev, 10, { min: '1', max: '125' }), num(t.entry, 60000, { min: '0' }), num(t.mmr, 0.5, { min: '0', max: '50' }), pick(t.dir, [['long', t.long], ['short', t.short]], 'long')];
      return { fields: f, run: function () {
        var m = v(f[0]), lev = v(f[1]), e = v(f[2]), mmr = v(f[3]), dir = f[4].input.value;
        if (!(m > 0) || !(e > 0)) return [T.bad];
        if (!(lev >= 1 && lev <= 125) || !(mmr >= 0 && mmr < 50)) return [t.levRange];
        var r = M.leverage(m, lev, e, mmr, dir), o = { margin: fmt(m, 2), lev: fmt(lev, 2), value: fmt(r.value, 2), entry: fmt(e), qty: fmt(r.qty), mmr: fmt(mmr, 2), liq: fmt(r.liq), move: fmt(r.move, 2) };
        return [fill(t.out, o), fill(dir === 'short' ? t.liqShort : t.liqLong, o)];
      } };
    },
    option: function (out) {
      var t = T.option, f = [pick(t.type, [['call', t.call], ['put', t.put]], 'call'), pick(t.side, [['buy', t.buy], ['sell', t.sell]], 'buy'), num(t.strike, 105, { min: '0' }), num(t.premium, 3, { min: '0' }), num(t.mult, 1, { min: '1', step: '1' }), num(t.at, 112, { min: '0' })];
      return { fields: f, run: function () {
        var type = f[0].input.value, side = f[1].input.value, K = v(f[2]), p = v(f[3]), mult = v(f[4]), S = v(f[5]);
        if (!(K > 0) || !(p >= 0) || !(mult >= 1) || !(S >= 0)) return [T.bad];
        var r = M.option(type, side, K, p, mult, S), lines = [fill(t.out, { intr: fmt(r.intr), sideText: side === 'sell' ? t.sellText : t.buyText, per: fmt(r.per), mult: fmt(mult, 0), total: fmt(r.total, 2) })];
        lines.push(fill(t.be, { formula: type === 'put' ? fmt(K) + ' − ' + fmt(p) : fmt(K) + ' + ' + fmt(p), be: fmt(r.be) }));
        if (side === 'buy') lines.push(fill(t.maxBuy, { max: fmt(p * mult, 2) })); else lines.push(type === 'call' ? t.maxSellCall : fill(t.maxSellPut, { max: fmt((K - p) * mult, 2) }));
        // 几个到期价下的盈亏，方便看出折线形状。
        var pts = [0.8, 0.9, 1, 1.1, 1.2].map(function (k) { return Math.round(K * k * 100) / 100; });
        var tbl = el('table', { class: 'calc-table' }, [el('thead', {}, [el('tr', {}, [el('th', { text: t.table }), el('th', { text: t.pl })])])]), tb = el('tbody');
        pts.forEach(function (x) { tb.appendChild(el('tr', {}, [el('td', { text: fmt(x) }), el('td', { text: fmt(M.option(type, side, K, p, mult, x).total, 2) })])); });
        tbl.appendChild(tb); lines.push(tbl);
        return lines;
      } };
    },
    il: function () {
      var t = T.il, f = [num(t.value, 2000, { min: '0' }), num(t.change, 100, { min: '-99.9' })];
      return { fields: f, run: function () {
        var val = v(f[0]), chg = v(f[1]);
        if (!(val > 0)) return [T.bad];
        if (!(chg > -100)) return [t.range];
        var r = M.il(val, chg), o = { chg: fmt(chg, 2), r: fmt(r.r, 4), v: fmt(val, 2), hold: fmt(r.hold, 2), lp: fmt(r.lp, 2), il: fmt(r.il, 2), diff: fmt(r.diff, 2) };
        return [fill(t.out, o), fill(t.loss, o)];
      } };
    }
  };

  function mount(host) {
    var kind = host.getAttribute('data-calc'), b = builders[kind]; if (!b || host.getAttribute('data-calc-ready')) return;
    host.setAttribute('data-calc-ready', '1');
    var t = T[kind], built = b(), form = el('form', { class: 'calc-form', novalidate: '' }), out = el('div', { class: 'calc-out', role: 'status', 'aria-live': 'polite' });
    host.appendChild(el('h3', { text: t.title }));
    host.appendChild(el('p', { text: t.intro }));
    built.fields.forEach(function (x) { form.appendChild(x.wrap); });
    host.appendChild(form); host.appendChild(out); host.appendChild(el('p', { class: 'lesson-note', text: T.note }));
    function update() { while (out.firstChild) out.removeChild(out.firstChild); built.run().forEach(function (line) { out.appendChild(typeof line === 'string' ? el('p', { text: line }) : line); }); }
    form.addEventListener('input', update); form.addEventListener('change', update); form.addEventListener('submit', function (e) { e.preventDefault(); update(); });
    update();
  }
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    var run = function () { Array.prototype.forEach.call(document.querySelectorAll('[data-calc]'), mount); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  }
  if (typeof window !== 'undefined') window.UnfinishedCalc = M;
})();
