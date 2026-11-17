// 首页开场动画：黑底上按笔顺写出“未尽”，月亮从中心升起放大、盖满全屏变白，再淡出露出首页。
// 是否播放由首页 <head> 里的一小段脚本决定（每次打开网站一次；“减少动态效果”和自动化测试浏览器不播），它会给 <html> 加 intro-on 并先盖一层黑幕。
// 笔画数据见 strokes.js（Make Me a Hanzi，Arphic Public License）。点击或按任意键可跳过。
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('intro-on')) return;
  const done = () => { root.classList.remove('intro-on'); };
  try {
    const DATA = window.UNF_INTRO_STROKES;
    if (!DATA) return done();
    const EN = window.UNF_LANG === 'en' || (root.lang || '').toLowerCase().startsWith('en');
    const ASSETS = (document.currentScript && document.currentScript.src || '').replace(/intro\/intro\.js.*$/, '') || 'assets/';

    // 每一笔的运笔方式：hv 横竖（落笔顿、收笔缓）、turn 横折（转角停顿）、flick 撇（越写越快出锋）、na 捺（慢起加速、收笔按住）、dot 点
    const KIND = { '未': ['hv', 'hv', 'hv', 'flick', 'na'], '尽': ['turn', 'hv', 'flick', 'na', 'dot', 'dot'] };
    const ease = {
      hv: t => t < .14 ? .04 * t / .14 : .04 + .96 * (1 - Math.pow(1 - (t - .14) / .86, 2.2)),
      flick: t => t < .12 ? .05 * t / .12 : .05 + .95 * Math.pow((t - .12) / .88, 1.55),
      na: t => t < .12 ? .04 * t / .12 : .04 + .96 * (.5 - .5 * Math.cos(Math.PI * (t - .12) / .88)),
      dot: t => t < .2 ? .1 * t / .2 : .1 + .9 * (1 - Math.pow(1 - (t - .2) / .8, 2)),
      turn: (t, at) => t < .1 ? .03 * t / .1 : t < .5 ? .03 + (at - .03) * (1 - Math.pow(1 - (t - .1) / .4, 2)) : t < .6 ? at : at + (1 - at) * (.5 - .5 * Math.cos(Math.PI * (t - .6) / .4))
    };
    // 书写共 4.5 秒（第一笔落下到最后一点写完），开头先停 0.45 秒
    const SPEED = 1.5212, START = 450, GAP = 150, CHARGAP = 330, MOON = 1300;

    // 画面
    const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
    const sp = el('div', 'intro'); sp.setAttribute('aria-hidden', 'true');
    const ink = el('canvas', 'intro-ink');
    const moon = el('div', 'intro-moon'), img = el('img'), mw = el('i');
    img.src = ASSETS + 'moon-nasa-lro.jpg'; img.alt = '';
    moon.append(img, mw);
    const white = el('div', 'intro-white');
    const skip = el('p', 'intro-skip'); skip.textContent = EN ? (matchMedia('(hover: none)').matches ? 'Tap anywhere to skip' : 'Click anywhere to skip') : '点击任意处跳过'; // 触屏用 Tap
    sp.append(ink, moon, white, skip);
    document.body.append(sp);

    const css = Math.round(Math.min(innerHeight * .42, innerWidth * .42)), dpr = Math.min(2, devicePixelRatio || 1);
    const cw = Math.round(css * dpr), gapPx = Math.round(css * .04 * dpr);
    ink.width = cw * 2 + gapPx; ink.height = cw; ink.style.width = ink.width / dpr + 'px'; ink.style.height = ink.height / dpr + 'px';
    const ctx = ink.getContext('2d'), s = cw / 1024;
    const place = (x, ci) => x.setTransform(s, 0, 0, -s, ci * (cw + gapPx), 900 * s); // 数据坐标（1024 方格、y 轴向上）→ 画布

    const segDist = (px, py, m) => { let b = 1e18; for (let k = 0; k < m.length - 1; k++) { const [ax, ay] = m[k], [bx, by] = m[k + 1], ex = bx - ax, ey = by - ay, l = ex * ex + ey * ey || 1; let t = ((px - ax) * ex + (py - ay) * ey) / l; t = t < 0 ? 0 : t > 1 ? 1 : t; const dx = ax + ex * t - px, dy = ay + ey * t - py; b = Math.min(b, dx * dx + dy * dy); } return Math.sqrt(b); };
    const strokes = []; let tl = START;
    ['未', '尽'].forEach((ch, ci) => {
      const d = DATA[ch];
      d.strokes.forEach((o, i) => {
        const m = d.medians[i], kind = KIND[ch][i];
        // 笔宽：轮廓上最远的点到中线的距离，保证这一笔扫到底时整笔都显出
        const pts = o.match(/-?\d+(\.\d+)?/g).map(Number); let hw = 0;
        for (let k = 0; k < pts.length; k += 2) hw = Math.max(hw, segDist(pts[k], pts[k + 1], m));
        let len = 0; const segs = [];
        for (let k = 0; k < m.length - 1; k++) { const l = Math.hypot(m[k + 1][0] - m[k][0], m[k + 1][1] - m[k][1]); segs.push(l); len += l; }
        // 横折的转角：方向变化最大的点
        let at = .6;
        if (kind === 'turn') { let best = -1, acc = 0; for (let k = 1; k < m.length - 1; k++) { acc += segs[k - 1]; const a1 = Math.atan2(m[k][1] - m[k - 1][1], m[k][0] - m[k - 1][0]), a2 = Math.atan2(m[k + 1][1] - m[k][1], m[k + 1][0] - m[k][0]); let da = Math.abs(a2 - a1); if (da > Math.PI) da = 2 * Math.PI - da; if (da > best) { best = da; at = acc / len; } } }
        const dur = (kind === 'dot' ? 240 : 180 + len * .62 * (kind === 'flick' ? .8 : 1)) / SPEED;
        strokes.push({ ci, kind, at, outline: new Path2D(o), path: new Path2D('M' + m.map(p => p.join(' ')).join('L')), len, hw: Math.ceil(hw + 6), t0: tl, dur });
        tl += dur + (i < d.strokes.length - 1 ? GAP / SPEED : 0);
      });
      tl += CHARGAP / SPEED;
    });
    const tmp = document.createElement('canvas'); tmp.width = ink.width; tmp.height = ink.height; const tx = tmp.getContext('2d');
    function draw(ms) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ink.width, ink.height); ctx.fillStyle = '#fff';
      for (const st of strokes) {
        if (ms <= st.t0) continue;
        const t = Math.min(1, (ms - st.t0) / st.dur);
        if (t >= 1) { place(ctx, st.ci); ctx.fill(st.outline); continue; }
        // 正在写的一笔：沿中线推进一支和笔画同宽的圆头笔，只在这一笔自己的轮廓里显出
        const p = ease[st.kind](t, st.at);
        tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, tmp.width, tmp.height);
        place(tx, st.ci); tx.lineWidth = 2 * st.hw; tx.lineCap = 'round'; tx.lineJoin = 'round'; tx.strokeStyle = '#fff';
        tx.setLineDash([Math.max(.01, st.len * p), st.len * 2]); tx.stroke(st.path);
        tx.globalCompositeOperation = 'destination-in'; tx.fillStyle = '#fff'; tx.setLineDash([]); tx.fill(st.outline);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(tmp, 0, 0);
      }
    }
    const writeEnd = strokes[strokes.length - 1].t0 + strokes[strokes.length - 1].dur;
    const tm = writeEnd + 380, out = tm + MOON + 200, total = out + 700;
    const cover = Math.hypot(innerWidth, innerHeight) / 10 * 1.05;
    const anims = [];
    const begin = () => {
      root.classList.add('intro-playing'); // 黑幕交给开场画面，自身的黑底接上
      anims.push(moon.animate([{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(4)', offset: .18 }, { transform: 'scale(14)', offset: .45 }, { opacity: 1, transform: 'scale(' + cover + ')' }], { duration: MOON, delay: tm, easing: 'cubic-bezier(.55,0,.75,.4)', fill: 'both' }));
      anims.push(mw.animate([{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1 }], { duration: MOON, delay: tm, fill: 'both' }));
      anims.push(white.animate([{ opacity: 0 }, { opacity: 0, offset: .7 }, { opacity: 1 }], { duration: MOON, delay: tm, fill: 'both' }));
      anims.push(sp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: out, easing: 'ease-in-out', fill: 'both' }));
      anims.push(skip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 700, fill: 'both' }));
      const t0 = performance.now(); let ended = false;
      const finish = () => { if (ended) return; ended = true; sp.remove(); root.classList.remove('intro-on', 'intro-playing'); removeEventListener('keydown', onKey, true); };
      const loop = () => { if (ended) return; const ms = performance.now() - t0; if (ms <= writeEnd + 50) draw(ms); if (ms >= total) return finish(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      // 跳过：直接把画面淡出
      const skipNow = () => { if (ended) return; anims.forEach(a => a.cancel()); sp.animate([{ opacity: getComputedStyle(sp).opacity }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).onfinish = finish; };
      const onKey = e => { if (e.key === 'Tab' || e.key === 'Shift') return; skipNow(); };
      sp.addEventListener('click', skipNow);
      addEventListener('keydown', onKey, true);
      setTimeout(finish, total + 1500); // 兜底
    };
    // 在后台标签页里打开时，等切回来再开始
    if (document.visibilityState === 'visible') begin();
    else document.addEventListener('visibilitychange', function v() { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', v); begin(); } });
  } catch (e) { document.querySelector('.intro')?.remove(); done(); }
})();
