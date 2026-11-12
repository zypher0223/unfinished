/* 未尽 · 阅读位置（2026-11-12）
 * 记的是“读到哪个小节”（小节 id），不是像素位置：换手机、换字体、切换中英文后仍然对得上。
 * 只保存在当前浏览器的学习记录里（market-learning-v1 的 positions），不联网。
 * 规则：
 * - 打开课程时不自动滚动。若上次读到的不是第一节，在标题下给一个“继续阅读”入口，由读者决定。
 * - 链接里带 #小节 时以链接为准，不显示入口，也不用旧记录覆盖它。
 * - 每 2 秒看一次当前小节，在同一小节连续停留约 6 秒才记录；页面在后台时不记录。不在滚动事件里写盘。 */
(function () {
  'use strict';
  var host = document.querySelector('[data-learning-key]'), main = document.querySelector('.lesson-content');
  if (!host || !main || !window.LearningStore) return;
  var key = host.getAttribute('data-learning-key');
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN ? { at: 'Last time you stopped at: ', go: 'Continue reading', top: 'Start from the top', label: 'Continue where you left off' }
             : { at: '上次读到：', go: '继续阅读', top: '从头读', label: '继续上次的阅读位置' };
  var sections = Array.prototype.slice.call(main.querySelectorAll('section[id]')).filter(function (s) { return /^[A-Za-z][\w-]{0,59}$/.test(s.id) && s.querySelector('h2'); });
  if (sections.length < 2) return;
  function saved() { var p = LearningStore.read().positions; p = p && typeof p === 'object' ? p[key] : null; return p && typeof p.section === 'string' ? p.section : null; }
  function indexOf(id) { for (var i = 0; i < sections.length; i++) if (sections[i].id === id) return i; return -1; }
  function write(id) { LearningStore.write(function (s) { if (!s.positions || typeof s.positions !== 'object' || Array.isArray(s.positions)) s.positions = {}; if (id) s.positions[key] = { section: id, date: new Date().toISOString() }; else delete s.positions[key]; }); }

  var banner = null, hasHash = location.hash.length > 1, start = saved(), startIndex = start ? indexOf(start) : -1;
  if (!hasHash && startIndex > 0) {
    var target = sections[startIndex], title = target.querySelector('h2').textContent.trim();
    var go = document.createElement('button'), top = document.createElement('button'), text = document.createElement('p'), strong = document.createElement('strong');
    banner = document.createElement('div'); banner.className = 'resume-banner'; banner.setAttribute('role', 'region'); banner.setAttribute('aria-label', T.label);
    text.appendChild(document.createTextNode(T.at)); strong.textContent = title; text.appendChild(strong);
    go.type = 'button'; go.className = 'resume-go'; go.textContent = T.go; top.type = 'button'; top.className = 'resume-top'; top.textContent = T.top;
    go.addEventListener('click', function () { close(); var h2 = target.querySelector('h2'); h2.setAttribute('tabindex', '-1'); target.scrollIntoView({ block: 'start' }); h2.focus({ preventScroll: true }); });
    top.addEventListener('click', function () { close(); write(null); });
    banner.appendChild(text); banner.appendChild(go); banner.appendChild(top);
    host.insertAdjacentElement('afterend', banner);
  }
  function close() { if (banner) { banner.remove(); banner = null; } }

  function current() {
    var line = window.innerHeight * 0.4, found = -1;
    for (var i = 0; i < sections.length; i++) { if (sections[i].getBoundingClientRect().top <= line) found = i; else break; }
    return found;
  }
  var candidate = -1, ticks = 0, moved = false;
  window.addEventListener('scroll', function () { moved = true; }, { passive: true });
  setInterval(function () {
    if (document.visibilityState !== 'visible') { ticks = 0; return; }
    // 入口还在、读者也没滚动过：说明还没决定，不要用“页面顶部”覆盖上次的位置。
    if (banner && !moved) return;
    var now = current();
    if (now < 0) { candidate = -1; ticks = 0; return; }
    if (now !== candidate) { candidate = now; ticks = 1; return; }
    if (++ticks < 3) return;
    if (sections[now].id !== saved()) { if (LearningStore.available()) write(sections[now].id); if (banner && now >= startIndex) close(); }
  }, 2000);
})();
