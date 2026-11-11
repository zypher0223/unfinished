// 我的学习 · 课程索引（方案 D）：一个圆点对应一节课。
// 悬停约 0.35 秒显示课程名，点击进入课程；触屏第一下显示课程名、第二下进入；
// 键盘只占一个 Tab 位，用方向键、Home、End 在圆点之间移动，回车进入。
(() => {
  const box = document.getElementById('d-index-grid');
  if (!box || !window.STUDY_CATALOG) return;
  const web3 = id => (id >= 179 && id <= 183) || (id >= 196 && id <= 207) || (id >= 214 && id <= 231);
  const all = window.STUDY_CATALOG;
  const isW = t => t.kind === 'technical' && web3(t.id);
  const list = [...all.filter(t => !isW(t)), ...all.filter(isW)];
  const touch = matchMedia('(hover: none)').matches;
  const cols = 21;
  let tip = null, timer = 0, armed = -1, focusIdx = 0;

  function state() {
    try { return window.LearningStore ? LearningStore.read() : null; } catch { return null; }
  }
  function hideTip() { clearTimeout(timer); if (tip) { tip.remove(); tip = null; } }
  function showTip(i) {
    hideTip();
    const t = list[i], a = box.children[i], row = Math.floor(i / cols), col = i % cols;
    tip = document.createElement('div');
    tip.className = 'd-tip';
    tip.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span'); name.textContent = t.title;
    const sub = document.createElement('small');
    const g = document.createElement('span'); g.textContent = isW(t) ? 'Web3' : '市场';
    sub.append(g);
    if (a.classList.contains('done')) { const r = document.createElement('span'); r.textContent = '已读'; sub.append(' · ', r); }
    if (touch) { const go = document.createElement('span'); go.textContent = '再点一下进入'; sub.append(' · ', go); }
    tip.append(name, sub);
    box.append(tip);
    const below = row < 2;
    tip.style.left = ((col + .5) / cols * 100) + '%';
    tip.style.top = below ? (a.offsetTop + a.offsetHeight + 8) + 'px' : (a.offsetTop - 8) + 'px';
    const x = col < 4 ? '0' : col > 16 ? '-100%' : '-50%';
    tip.style.transform = `translate(${x}, ${below ? '0' : '-100%'})`;
  }
  function render() {
    const s = state(), done = k => !!(s && s.courses && s.courses[k] && s.courses[k].done);
    box.textContent = '';
    list.forEach((t, i) => {
      const a = document.createElement('a');
      a.href = t.path;
      a.setAttribute('aria-label', t.title);
      a.tabIndex = i === focusIdx ? 0 : -1;
      if (isW(t)) a.classList.add('w3');
      if (done(t.key)) a.classList.add('done');
      if (s && s.last === t.key) a.classList.add('last');
      a.addEventListener('mouseenter', () => { if (touch) return; clearTimeout(timer); timer = setTimeout(() => showTip(i), 350); });
      a.addEventListener('mouseleave', () => { if (!touch) hideTip(); });
      a.addEventListener('focus', () => { focusIdx = i; showTip(i); });
      a.addEventListener('blur', hideTip);
      a.addEventListener('click', e => { if (touch && armed !== i) { e.preventDefault(); armed = i; showTip(i); } });
      box.append(a);
    });
    const count = document.getElementById('d-index-count');
    if (count) count.textContent = `已读 ${list.filter(t => done(t.key)).length} / ${list.length}`;
  }
  box.addEventListener('keydown', e => {
    const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    let next = null;
    if (move) next = Math.max(0, Math.min(list.length - 1, focusIdx + move));
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = list.length - 1;
    if (next === null) return;
    e.preventDefault();
    box.children[focusIdx].tabIndex = -1;
    focusIdx = next;
    box.children[focusIdx].tabIndex = 0;
    box.children[focusIdx].focus();
  });
  document.addEventListener('click', e => { if (touch && !box.contains(e.target)) { armed = -1; hideTip(); } });
  const help = document.getElementById('d-index-help');
  if (touch && help) help.textContent = '一点一课：亮的是读过的，圆圈是上次学到的地方。点一下圆点看课程名，再点一下进入课程。记录只保存在当前浏览器。';
  addEventListener('learning-change', render);
  render();
})();
