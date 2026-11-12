// 首页星图（交互方案 E）：每颗星是一课，一次只看一片——市场或 Web3。
// 市场：每个分类排成一条“走势”；Web3：35 个区块首尾相连成一条链，逐块确认。
// 鼠标移到哪里，哪里的星和连线才亮起来；停在星上显示课程名，点击进入课程。
// 触屏没有鼠标：默认全部点亮，第一下显示课程名，第二下进入。键盘只占一个 Tab 位，左右方向键移动。
// 数据：window.HOME_GROUPS（构建时写入的分类与课程 key）+ window.STUDY_CATALOG（课程名与地址）+ LearningStore（已读）。
(() => {
  const map = document.getElementById('s-map'), groups = window.HOME_GROUPS, catalog = window.STUDY_CATALOG;
  if (!map || !groups || !catalog) return;
  const byKey = new Map(catalog.map(t => [t.key, t]));
  const touch = matchMedia('(hover: none)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const TEXT = {
    m: { desc: '从宏观指标与 K 线形态，到看懂期权与交易风控', label: '市场的全部课程，按分类排成几条走势', hint: '每颗星是一课，每个分类排成一条走势。移动鼠标，光照到的地方连线才显出来；停在星上看课程名，点击进入。' },
    w: { desc: '从公链与钱包，到生态应用、前沿协议与行业岗位', label: 'Web3 的全部课程，按分类连成一条链', hint: 'Web3 的课程像区块一样首尾相连，白色的光点是正在逐块确认。移动鼠标照亮区块；停在上面看课程名，点击进入。' },
    touch: '每颗星是一课。点一下星星看课程名，再点一下进入课程。'
  };
  let tab = 'm', all = touch, tip = null, timer = 0, armed = -1, focusIdx = 0, pts = [], lastW = 0;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const svgPath = (W, H, d, stroke, opacity) => {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', '1');
    if (opacity) p.setAttribute('stroke-opacity', opacity);
    s.append(p); return s;
  };
  const isDone = () => { let s = null; try { s = window.LearningStore ? LearningStore.read() : null; } catch { s = null; } return k => !!(s && s.courses && s.courses[k] && s.courses[k].done); };
  const lessons = g => g.keys.map(k => byKey.get(k)).filter(Boolean);

  // 市场：分类依次排开，短的分类接在同一行，长的自动换行；y 方向是固定种子的小幅随机游走
  function layoutMarket(W) {
    const sx = W < 700 ? 11 : 12, rowH = 76, wrapH = 52, gap = 64, out = { pts: [], lines: '', labels: [] };
    let x = 0, yc = 58, seed = 23; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    groups.filter(g => g.g === 'm').forEach(g => {
      const items = lessons(g), need = (items.length - 1) * sx;
      if (x > 0 && items.length <= 20 && x + gap + need <= W) x += gap; else if (x > 0) { x = 0; yc += rowH; }
      out.labels.push({ x, y: yc - 40, label: g.label, n: items.length });
      let px = x, y = yc, first = true;
      items.forEach(t => {
        if (px > W - 4) { px = 0; yc += wrapH; y = yc; first = true; }
        y += (r() - .5) * 13; y = Math.max(yc - 18, Math.min(yc + 18, y));
        out.pts.push({ x: px, y, t, cat: g.label });
        out.lines += (first ? 'M' : 'L') + px.toFixed(1) + ' ' + y.toFixed(1);
        first = false; px += sx;
      });
      x = px - sx + 1;
    });
    out.H = yc + 34; return out;
  }
  // Web3：每个分类一行（放不下就换行），所有区块按顺序用横线和折线连成一条链
  function layoutWeb3(W) {
    const sx = W < 700 ? 40 : 62, x0 = 24, out = { pts: [], lines: '', labels: [] };
    let y = 44;
    groups.filter(g => g.g === 'w').forEach((g, gi) => {
      if (gi) y += 62;
      out.labels.push({ x: x0 - 6, y: y - 31, label: g.label, n: lessons(g).length });
      let px = x0;
      lessons(g).forEach(t => {
        if (px > W - 16) { px = x0; y += 44; }
        out.pts.push({ x: px, y, t, cat: g.label }); px += sx;
      });
    });
    out.pts.forEach((p, i) => {
      const q = out.pts[i + 1]; if (!q) return;
      if (q.y === p.y) out.lines += `M${p.x} ${p.y}L${q.x} ${q.y}`;
      else { out.lines += `M${p.x} ${p.y}h14v20H${q.x - 14}v${q.y - p.y - 20}h14`; }
    });
    out.H = y + 36; return out;
  }

  function hideTip() { clearTimeout(timer); if (tip) { tip.remove(); tip = null; } }
  function showTip(i, W) {
    hideTip();
    const p = pts[i]; if (!p) return;
    tip = el('div', 's-tip'); tip.setAttribute('aria-hidden', 'true');
    const sub = el('small'); sub.append(el('span', '', p.cat));
    if (p.read) sub.append(' · ', el('span', '', '已读'));
    if (touch) sub.append(' · ', el('span', '', '再点一下进入'));
    tip.append(el('b', '', p.t.title), sub);
    const below = p.y < 90, tx = p.x < 150 ? '0' : p.x > W - 170 ? '-100%' : '-50%';
    tip.style.left = p.x + 'px'; tip.style.top = (p.y + (below ? 14 : -14)) + 'px';
    tip.style.transform = `translate(${tx}, ${below ? '0' : '-100%'})`;
    map.append(tip);
  }

  function render() {
    const W = map.clientWidth; if (!W) return; lastW = W;
    const L = tab === 'w' ? layoutWeb3(W) : layoutMarket(W), done = isDone(), w = tab === 'w';
    pts = L.pts.map(p => ({ ...p, read: done(p.t.key) }));
    if (focusIdx >= pts.length) focusIdx = 0;
    hideTip(); armed = -1; map.textContent = ''; map.style.height = L.H + 'px';
    L.labels.forEach(b => { const p = el('p', 's-lab'); p.style.left = b.x + 'px'; p.style.top = b.y + 'px'; p.append(el('span', '', b.label), ' · ', el('span', '', String(b.n))); map.append(p); });
    if (w) map.append(svgPath(W, L.H, L.lines, '#1E2A3D'));
    const nav = el('nav', 's-stars'); nav.setAttribute('aria-label', TEXT[tab].label);
    const lit = el('div', 's-lit' + (all ? ' all' : '')); lit.setAttribute('aria-hidden', 'true');
    lit.append(svgPath(W, L.H, L.lines, w ? '#9FC2E8' : '#EFE3C4', '.7'));
    pts.forEach((p, i) => {
      const a = el('a', 's-star' + (w ? ' w' : '') + (p.read ? ' read' : ''));
      a.href = p.t.path; a.setAttribute('aria-label', p.t.title); a.tabIndex = i === focusIdx ? 0 : -1;
      a.style.left = p.x + 'px'; a.style.top = p.y + 'px'; a.append(el('i'));
      a.addEventListener('mouseenter', () => { if (touch) return; clearTimeout(timer); timer = setTimeout(() => showTip(i, W), 250); });
      a.addEventListener('mouseleave', () => { if (!touch) hideTip(); });
      a.addEventListener('focus', () => { focusIdx = i; showTip(i, W); });
      a.addEventListener('blur', hideTip);
      a.addEventListener('click', e => { if (touch && armed !== i) { e.preventDefault(); armed = i; showTip(i, W); } });
      nav.append(a);
      const g = el('i', 's-g' + (w ? ' w' : '') + (p.read ? ' read' : '')); g.style.left = p.x + 'px'; g.style.top = p.y + 'px'; lit.append(g);
    });
    map.append(nav, lit);
    if (w) { const pulse = el('div', 's-pulse'); pulse.setAttribute('aria-hidden', 'true'); pts.forEach((p, i) => { const b = el('i', 's-blk'); b.style.left = p.x + 'px'; b.style.top = p.y + 'px'; b.style.animationDelay = (i * .25) + 's'; pulse.append(b); }); map.append(pulse); }
  }

  function setTab(next) {
    tab = next; focusIdx = 0;
    document.querySelectorAll('.s-tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    map.setAttribute('aria-labelledby', 's-tab-' + tab);
    const desc = document.getElementById('s-desc'), hint = document.getElementById('s-hint');
    if (desc) desc.textContent = TEXT[tab].desc;
    if (hint) hint.textContent = touch ? TEXT.touch : TEXT[tab].hint;
    render();
  }

  document.querySelectorAll('.s-tab').forEach(b => {
    b.addEventListener('click', () => setTab(b.dataset.tab));
    b.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); const next = tab === 'm' ? 'w' : 'm'; setTab(next); document.getElementById('s-tab-' + next).focus(); });
  });
  const allBtn = document.getElementById('s-all');
  if (allBtn) {
    const sync = () => { allBtn.setAttribute('aria-pressed', String(all)); allBtn.textContent = all ? '收起，只看光照到的地方' : '全部点亮'; const lit = map.querySelector('.s-lit'); if (lit) lit.classList.toggle('all', all); };
    if (touch) allBtn.hidden = true;
    allBtn.addEventListener('click', () => { all = !all; sync(); });
    sync();
  }
  map.addEventListener('mousemove', e => { const b = map.getBoundingClientRect(); map.style.setProperty('--mx', (e.clientX - b.left) + 'px'); map.style.setProperty('--my', (e.clientY - b.top) + 'px'); });
  map.addEventListener('mouseleave', () => { map.style.setProperty('--mx', '-999px'); map.style.setProperty('--my', '-999px'); });
  map.addEventListener('keydown', e => {
    const move = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; let next = null;
    if (move) next = Math.max(0, Math.min(pts.length - 1, focusIdx + move));
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = pts.length - 1;
    if (next === null) return;
    e.preventDefault();
    const stars = map.querySelectorAll('.s-star');
    stars[focusIdx].tabIndex = -1; focusIdx = next; stars[focusIdx].tabIndex = 0; stars[focusIdx].focus();
  });
  document.addEventListener('click', e => { if (touch && !map.contains(e.target)) { armed = -1; hideTip(); } });
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (map.clientWidth !== lastW) render(); }, 150); });
  addEventListener('learning-change', render);
  setTab('m');
})();
