/* 未尽 · anonymous quiz statistics (2026-10-31)
 * After a test is submitted, sends one row per question to Supabase:
 * question id, chosen option index, right/wrong, scope and a random per-browser id.
 * No names, accounts or free text. The publishable key below can only INSERT rows
 * and read per-question aggregates (row-level security); it cannot read or change records.
 * Failures are silent and never affect the test. */
(function () {
  'use strict';
  var URL_ = 'https://jnyenifjliwbvwwqzhys.supabase.co/rest/v1/quiz_answers';
  var KEY = 'sb_publishable_jv24Wk3RPap3rKCMlmvW8Q_UVFZ0l74';
  var SID = 'unfinished.stats.sid';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function sid() {
    var s = get(SID);
    if (!s || !/^[a-z0-9-]{8,64}$/.test(s)) {
      s = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      set(SID, s);
    }
    return s;
  }
  var sent = new WeakSet();
  function report() {
    var a;
    try { a = attempt; } catch (e) { return; } // `attempt` is the assessment page's current test
    if (!a || !a.questions || !a.answers || sent.has(a)) return;
    if (a.answers.some(function (x) { return x === null; })) return; // not submitted yet
    var results = document.getElementById('test-results');
    if (!results || results.hidden) return;
    sent.add(a);
    var id = sid(), rows = a.questions.map(function (q, i) {
      return { session_id: id, question_id: String(q.id).slice(0, 64), choice: a.answers[i], correct: a.answers[i] === q.answer, scope: q.type === 'information' ? 'information' : 'technical', lang: 'zh' };
    }).filter(function (r) { return r.choice >= 0 && r.choice <= 3; });
    if (!rows.length) return;
    try {
      fetch(URL_, { method: 'POST', keepalive: true, headers: { apikey: KEY, 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify(rows) }).catch(function () {});
    } catch (e) {}
  }
  function note() {
    var h = document.getElementById('test-history');
    if (!h || document.getElementById('stats-note')) return;
    var p = document.createElement('p');
    p.className = 'test-history'; p.id = 'stats-note'; p.style.marginTop = '4px';
    p.textContent = '测验作答会匿名用于改进题目。';
    h.parentNode.insertBefore(p, h.nextSibling);
  }
  function init() {
    note();
    var submit = document.getElementById('test-submit');
    if (submit) submit.addEventListener('click', function () { setTimeout(report, 0); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
