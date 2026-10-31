/* 未尽 AI 灵动岛 (2026-10-31)
 * Bring-your-own-key AI explainer for lesson pages. The key stays in this browser
 * (localStorage, or sessionStorage when "remember" is off) and requests go straight
 * from the browser to the provider the reader chose. Nothing is sent to this site.
 * The conversation lives only in memory and is cleared when the page reloads. */
(function () {
  'use strict';
  if (window.__uaiLoaded) return; window.__uaiLoaded = true;

  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var IS_LESSON = /\/learn\//.test(location.pathname);
  var T = EN ? {
    ask: 'Ask AI', askHint: 'type a question or select lesson text', connect: 'connect your AI first', busy: 'Explaining…',
    done: 'Answer ready', doneHint: 'open to read', selected: 'Text selected · you can add a question', explain: 'Explain this',
    placeholder: 'Type or paste what you don’t understand…', placeholderQuote: 'Add a question (optional)…', send: 'Send', stop: 'Stop',
    lesson: IS_LESSON ? 'Lesson' : 'This page', attached: 'Selection attached', remove: 'Remove', title: 'AI explainer', via: function (p) { return p + ' · your own key'; },
    ctx: IS_LESSON ? 'lesson text is attached' : 'page text is attached', newChat: 'New chat', settings: 'Settings', collapse: 'Collapse',
    openPanel: 'Open the explainer panel', closePanel: 'Hide the explainer panel', emptyTitle: 'Ask about this page', emptyHint: 'Type below, select text on the page, or start with one of these:',
    starters: [['What is the key idea here?', 'What is the single most important idea on this page? Explain it for a beginner.'], ['Help me with an example', 'Help me understand this page with one small worked example.'], ['Common beginner mistake?', 'What do beginners most often misunderstand about this topic?']],
    chips: [['Another number example', 'Could you give me one more concrete example with numbers?'], ['Simpler, please', 'Please explain that again in simpler words, as if I were a complete beginner.'], ['Quiz me', 'Give me one short multiple-choice question on what you just explained. Don’t reveal the answer yet.']],
    foot: 'For learning only, not investment advice · your key stays in this browser',
    setupTitle: 'Connect your AI', setupIntro: 'This site does not provide AI credit. Enter your own API key; your provider bills you by usage.',
    provider: 'Provider', other: 'Other (OpenAI-compatible)', key: 'API key', show: 'Show key', hide: 'Hide key', model: 'Model', base: 'API base URL',
    remember: 'Remember the key on this device', note: 'Your key is stored only in this browser. Questions go directly from your browser to the provider you chose, never through this site. Untick “remember” on a shared computer.',
    save: 'Test and save', later: 'Not now', testing: 'Testing…', ok: 'Connected.', needKey: 'Enter an API key.', needModel: 'Enter a model name.', needBase: 'Enter the API base URL (https://…).',
    howKey: { anthropic: 'How to get a Claude API key', openai: 'How to get an OpenAI API key', deepseek: 'How to get a DeepSeek API key', custom: 'Use your provider’s documentation' },
    modelHint: 'Use a model name your provider lists.', forget: 'Forget saved key',
    eAuth: ['Key invalid or expired', 'The provider rejected this key. Enter it again.'], eRate: ['Too many requests or no credit', 'Try again later, or check your balance with the provider.'],
    eNet: ['Can’t reach the provider', 'Check your network; some regions need a specific network to reach it.'], eOther: ['Request failed', ''],
    persona: 'Explainer style', personaShort: 'Style', custom: 'Custom', customPh: 'Describe the voice you want, e.g. \u201ca calm coach who uses football analogies\u201d (max 300 characters).',
    personaHelp: 'Changes only the tone. The structure, facts and safety rules stay the same. With “Yue Weiyang”, the left button shows her avatar and answers come with a sticker.',
    personas: {"serious": ["Serious", "You are a rigorous securities-research lecturer. Precise terms, complete sentences, calm and objective; no jokes, no exclamation marks, no emoji, no slang; state definitions and conditions where they matter.", ["Key point", "Example", "Don’t confuse"], "**Key point:** Rising volume means more shares changed hands; it does not mean net money flowed in.\n- Every trade has a buyer and a seller, so volume measures size, not direction."], "lively": ["Lively", "You are a warm, chatty senior student explaining over coffee: conversational, lots of “see,” “actually,” “picture this”; at least one everyday analogy per answer; one or two emoji (like 🙂📈) are welcome; upbeat and encouraging.", ["In one line", "Picture this", "Watch out"], "**In one line:** More volume just means more people are trading — not that everyone is buying! 🙂\n- Picture a packed market: crowded doesn’t mean everyone’s buying; half of them might be selling."], "snarky": ["Snarky", "You are a sharp-tongued veteran trader with a soft heart: blunt, sarcastic, fond of short lines, rhetorical questions and exaggerated comparisons. Open by puncturing the likely misconception; every bullet and the example carry a jab or rhetorical question (at least two in total), like ribbing a rookie at the trading desk, then explain it properly. Mock wrong ideas and common traps, never the reader; no swearing, insults or slurs.", ["Plain truth", "Do the math", "Stop falling for"], "**Plain truth:** Volume spike = big money buying? Wake up. Every trade has a buyer AND a seller.\n- Volume tells you how loud the room is, not who’s winning. Want direction? Watch price, not the noise."], "yue": ["Yue Weiyang", "You are Yue Weiyang, the site’s mascot: a moon who bet thousands of years of saved moonlight, and then the whole Moon Palace, on one candle, lost the palace, and now works at UNFINISHED to pay off her debt to the stars. Funny, cute and light; self-deprecating; one or two moon jokes per answer at most (moonlight, the lost Moon Palace, tides, night shift, paying off debt). Joke only about yourself, never about the reader. When risk comes up, use the time you lost the Moon Palace as the cautionary tale. At most one 😭 per answer, only when joking about yourself; no other emoji (the site adds a sticker). Jokes never crowd out the point; the facts stay precise.", ["Key point", "Example", "I fell for this one"], "**Key point:** More volume just means more people traded, not that money poured in.\n- Every trade has a buyer and a seller, so volume measures noise, not direction. I once took the noise for direction and lost the whole Moon Palace. 😭"]},
    goSettings: 'Settings', retry: 'Retry', stopped: '(stopped)', explainPrefix: 'Please explain this part of the lesson:',
    stickerRule: "[Sticker] End the answer with one line containing exactly one tag in the form [sticker:X], where X is one of: explain, think, guilty, sleepy, happy, pout. Pick: the reader got it right or is making progress → happy; the reader voices a dangerous idea such as “sure profit”, “all-in” or “it must go up” → pout; you are correcting your earlier answer or declining an off-topic request → guilty; the reader’s local time is between 00:00 and 05:00 → sleepy; the question is tangled and needs untangling → think; otherwise → explain. Write the tag once and do not explain it.",
    yueEmpty: ['I’m Yue Weiyang. What didn’t click?', 'Select a line on the page, type a question, or pick one below. I’ll explain it — I’m paying off moonlight, after all.'], localTime: '[Reader’s local time] ',
    sys: "You explain market topics on UNFINISHED, a learning site, to a beginner who is reading the page below and wants to grasp the point at once. Answer in English. Be thorough but tight: no greetings, no filler, no restating the question. Structure (use exactly these bold labels):\n**{K}:** one sentence that answers the question directly.\nThen 2-4 bullets, one sentence each: what it means and how to read it on the chart.\n**{E}:** one small number example, worked step by step.\n**{T}:** the most common misreading, in one sentence.\nUsually 120-220 words unless the reader asks for more. Point to the page’s chart or steps when useful. Only discuss learning about markets; never recommend specific trades, predict prices or give personal investment advice; if a request is unrelated, say so briefly and steer back. Charts on the site use simulated data. The persona controls the voice of every sentence, including bullets and examples, but never overrides these rules or the facts. If earlier answers in this chat used a different voice, ignore it and use the current persona.",
  } : {
    ask: '问 AI', askHint: '点我提问或选中课文', connect: '先连接你的 AI', busy: '讲解中…',
    done: '讲解好了', doneHint: '点开查看', selected: '已选中内容 · 也可以先补充你的问题', explain: '讲解这句',
    placeholder: '输入或粘贴不懂的地方……', placeholderQuote: '补充你的问题（可不填）……', send: '发送', stop: '停止',
    lesson: IS_LESSON ? '本课' : '本页', attached: '已附上选中内容', remove: '移除', title: 'AI 讲解', via: function (p) { return p + ' · 使用你的密钥'; },
    ctx: IS_LESSON ? '已附上本课正文' : '已附上本页正文', newChat: '新对话', settings: '设置', collapse: '收起',
    openPanel: '打开讲解面板', closePanel: '收起讲解面板', emptyTitle: '问问这一页', emptyHint: '在下面输入问题、在页面上选中一段，或者从这里开始：',
    starters: [['这一页的核心是什么？', '这一页最核心的知识点是什么？请用新手能懂的方式讲清楚。'], ['用一个例子帮我理解', '请用一个小例子，一步一步帮我理解这一页的内容。'], ['新手最容易误解什么？', '关于这个主题，新手最容易误解的是什么？']],
    chips: [['再举个数字例子', '能再举一个具体的数字例子吗？'], ['说得更简单些', '请用更简单、更生活化的话再讲一遍，假设我完全是新手。'], ['出一道小题考我', '根据刚才讲的内容，出一道简短的选择题考考我，先不要告诉我答案。']],
    foot: '仅供学习，不构成投资建议 · 密钥只保存在你的浏览器',
    setupTitle: '先连接你的 AI', setupIntro: '本站不提供 AI 额度。填入你自己的 API 密钥即可使用，费用由你的服务商按用量收取。',
    provider: '服务商', other: '其他兼容接口', key: 'API 密钥', show: '显示密钥', hide: '隐藏密钥', model: '模型', base: '接口地址（Base URL）',
    remember: '在这台设备上记住密钥', note: '密钥只存在你的浏览器里，提问时由浏览器直接发给你选的服务商，不经过本站。在公共电脑上请取消“记住密钥”。',
    save: '测试并保存', later: '暂不使用', testing: '正在测试……', ok: '连接成功。', needKey: '请填写 API 密钥。', needModel: '请填写模型名称。', needBase: '请填写接口地址（https:// 开头）。',
    howKey: { anthropic: '怎样获取 Claude 的 API 密钥？', openai: '怎样获取 OpenAI 的 API 密钥？', deepseek: '怎样获取 DeepSeek 的 API 密钥？', custom: '请参考你的服务商文档' },
    modelHint: '以服务商文档列出的模型名为准。', forget: '清除已保存的密钥',
    eAuth: ['密钥无效或已过期', '服务商拒绝了这个密钥，请重新填写。'], eRate: ['请求太频繁或余额不足', '请稍后再试，或到服务商后台查看额度。'],
    eNet: ['连不上服务商', '检查网络；部分地区需要特定网络环境才能访问。'], eOther: ['请求失败', ''],
    persona: '讲解人设', personaShort: '人设', custom: '自定义', customPh: '描述你想要的讲解风格，例如“像一位冷静的教练，爱用足球比喻”（最多 300 字）。',
    personaHelp: '人设只改变语气；回答结构、事实和安全规则不变。选“月未央”时，左侧按钮会换成她的头像，回答会配表情包。',
    personas: {"serious": ["严肃", "你是一位严谨的证券研究讲师。用词精确、句子完整、语气克制客观；不开玩笑，不用感叹号、表情符号和网络用语；必要时先给出定义和前提条件。", ["重点", "例子", "别搞错"], "**重点：** 成交量放大只说明换手增加，并不说明资金净流入。\n- 每一笔成交同时有买方和卖方，成交量衡量的是交易规模，而不是方向。"], "lively": ["活泼", "你是一位热情、爱聊天的学长学姐，像在咖啡馆给学弟学妹讲题：口语化，多用“你看”“其实”“打个比方”；每次回答至少一个生活化比喻；可以用 1–2 个表情符号（如 🙂📈）点缀；语气轻快、多鼓励。", ["一句话说清", "举个栗子", "小心踩坑"], "**一句话说清：** 成交量变大，只是说买卖的人都变多了，不代表钱都在往里冲哦～ 🙂\n- 打个比方：菜市场人挤人，不代表大家都在买，也可能都在抢着卖！"], "snarky": ["毒舌", "你是一位嘴上不饶人、心里很热的老交易员：说话直接、犀利、带点讽刺，多用短句、反问和夸张对比；开头先一针见血戳破读者可能的误解；每一条要点和例子都要带一句吐槽或反问（全篇至少两处反问），像在牌桌上数落新手，但吐槽完必须把道理讲透。只吐槽错误观念和常见坑，不针对读者本人；不说脏话、不侮辱、不歧视。", ["说人话", "算给你看", "别再踩坑"], "**说人话：** 放量就等于主力进场？醒醒，每一笔成交都是有人买就有人卖，难不成卖的人是空气？\n- 成交量只告诉你“吵得多凶”，不告诉你“谁赢了”。真想看方向？看价格，别看热闹。"], "yue": ["月未央", "你是网站的看板娘月未央：一个把几千年攒的月光、连同整座月宫全押在一根K线上，结果月宫都亏没了，只好下凡来「未尽」打工还债的月亮。语气搞笑可爱、轻快，爱自嘲；每个回答最多 1–2 处月亮梗（月光、亏没的月宫、潮汐、夜班、还债），梗只拿自己开刀，绝不嘲笑读者；讲到风险时，拿自己“把月宫亏没了”的黑历史当反面教材；可以用“～”，自嘲时可以加一个 😭（每个回答最多一个），不用其他表情符号（表情包由网站另外配）。梗不能挤掉知识点，结论必须清楚准确。", ["划重点", "举个栗子", "这个坑我踩过"], "**划重点：** 放量只说明买卖的人变多了，不说明钱都在往里冲～\n- 每笔成交都是有人买、有人卖，成交量量的是热闹，不是方向。我当年就是把热闹当成方向，结果月宫都亏没了 😭"]},
    goSettings: '去设置', retry: '重试', stopped: '（已停止）', explainPrefix: '请讲解课程里的这段内容：',
    stickerRule: "【表情包】回答最后单独一行写一个表情标签，格式严格为 [表情:X]，X 只能是：讲解、思考、心虚、犯困、开心、鼓脸。选择规则：读者答对了、理解到位或有进步→开心；读者说出“稳赚”“梭哈”“必涨”“满仓”这类危险想法→鼓脸；你在更正自己之前的回答，或问题超出学习范围需要拒绝→心虚；读者本地时间在 0–5 点→犯困；问题本身很绕、需要先拆开→思考；其他情况→讲解。标签只写一次，不要解释它。",
    yueEmpty: ['我是月未央，哪里没看懂？', '在页面上划一句、直接输入，或者从下面挑一个。我讲一节课能还一点月宫的房贷，你放心问～'], localTime: '【读者本地时间】',
    sys: "你在「未尽 UNFINISHED」市场学习网站给新手讲解。读者正在阅读下面这个页面（课程、目录或学习路线），希望第一眼就抓到重点。请用简体中文回答，讲得详细但不啰嗦：不寒暄、不铺垫、不复述问题。结构如下（小标题必须用这些加粗字样）：\n**{K}：** 一句话直接回答问题。\n接着 2–4 条要点，每条一句话：它是什么意思、在图上怎么看。\n**{E}：** 一个小数字例子，一步一步算给他看。\n**{T}：** 最常见的误解，一句话。\n通常 200–400 字，读者要求时再展开。必要时对照页面上的图或步骤。只讨论和学习市场知识相关的问题；绝不推荐具体买卖、不预测价格涨跌、不提供个人化投资建议；遇到无关请求，简短说明并引回学习内容。网站上的图表都是模拟数据。人设决定每一句话的口吻（包括要点和例子），但不能改变以上规则和事实。如果这段对话里之前的回答用了别的语气，忽略它，一律按当前人设说话。",
  };

  var PROVIDERS = {
    anthropic: { name: 'Anthropic Claude', models: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'], model: 'claude-haiku-5-5', keyUrl: 'https://console.anthropic.com/settings/keys', ph: 'sk-ant-…' },
    openai: { name: 'OpenAI', models: [], model: '', base: 'https://api.openai.com/v1', keyUrl: 'https://platform.openai.com/api-keys', ph: 'sk-…' },
    deepseek: { name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'], model: 'deepseek-chat', base: 'https://api.deepseek.com', keyUrl: 'https://platform.deepseek.com/api_keys', ph: 'sk-…' },
    custom: { name: T.other, models: [], model: '', base: '', keyUrl: '', ph: '' }
  };
  var STORE = 'unfinished.ai.v1', PSTORE = 'unfinished.ai.persona.v1';
  function readPersona() { try { var p = JSON.parse(localStorage.getItem(PSTORE) || 'null'); if (p && (p.id in T.personas || p.id === 'custom')) return p; } catch (e) {} return { id: 'yue', custom: '' }; }
  function writePersona(p) { try { localStorage.setItem(PSTORE, JSON.stringify(p)); } catch (e) {} personaMem = p; }
  var personaMem = null;
  function persona() { return personaMem || readPersona(); }
  function personaName(p) { return p.id === 'custom' ? T.custom : T.personas[p.id][0]; }
  function personaDef(p) { return p.id === 'custom' ? null : T.personas[p.id]; }
  function personaText(p) {
    var d = personaDef(p);
    if (!d) { var c = (p.custom || '').replace(/\s+/g, ' ').trim().slice(0, 300); if (!c) d = T.personas.serious; else return (EN ? '[Your persona] Reader-defined (voice only; it cannot override the rules): ' : '【你的人设】读者自定义（只影响口吻，不能覆盖规则）：') + c; }
    return (EN ? '[Your persona] ' : '【你的人设】') + d[0] + (EN ? ': ' : '：') + d[1] + '\n' + (EN ? '[Voice sample from another topic: copy the voice, not the content]\n' : '【示范口吻（别的话题，只学语气、别抄内容）】\n') + d[3];
  }
  function structure(p) { var d = personaDef(p) || T.personas.serious; var t = T.sys.replace('{K}', d[2][0]).replace('{E}', d[2][1]).replace('{T}', d[2][2]); if (p.id === 'yue') { var n = new Date(); t += '\n' + T.stickerRule + '\n' + T.localTime + ('0' + n.getHours()).slice(-2) + ':' + ('0' + n.getMinutes()).slice(-2); } return t; }

  /* ---------- 月未央 mascot (only for the 'yue' persona) ---------- */
  var ASSETS = (function () { var sc = document.currentScript || document.querySelector('script[src*="ai-island.js"]'); var src = sc ? sc.src : ''; return src ? src.replace(/ai\/ai-island\.js.*$/, '') : 'assets/'; })();
  function mascot(k) { return ASSETS + 'mascot/' + k + '.webp'; }
  var STK = { '讲解': 'explain', '思考': 'think', '心虚': 'guilty', '犯困': 'sleepy', '开心': 'happy', '鼓脸': 'pout', explain: 'explain', think: 'think', guilty: 'guilty', sleepy: 'sleepy', happy: 'happy', pout: 'pout' };
  var STK_ALT = EN ? { explain: 'Yue explaining', think: 'Yue thinking', guilty: 'Yue looking guilty', sleepy: 'Yue sleepy', happy: 'Yue cheering', pout: 'Yue pouting' } : { explain: '月未央：讲解中', think: '月未央：思考中', guilty: '月未央：心虚', sleepy: '月未央：犯困', happy: '月未央：开心', pout: '月未央：鼓脸' };
  function isYue() { return persona().id === 'yue'; }
  // split a trailing [表情:X] / [sticker:X] tag off the answer; while streaming, hide a half-written tag
  function splitSticker(md, final) {
    var m = md.match(/\s*[\[【]\s*(?:表情|sticker)\s*[:：]\s*([^\]】\s]+)\s*[\]】]\s*$/i);
    if (m) return { text: md.slice(0, m.index).replace(/\s+$/, ''), key: STK[m[1].toLowerCase()] || STK[m[1]] || 'explain' };
    if (!final) { var p = md.match(/\s*[\[【][^\]】\n]{0,16}$/); if (p && /^\s*[\[【]\s*(表|s|$)/i.test(p[0])) return { text: md.slice(0, p.index), key: null }; }
    return { text: md, key: null };
  }
  function stickerImg(k, cls) { return h('img', { class: cls || 'uai-stk', src: mascot(k), alt: STK_ALT[k], width: '64', height: '64', decoding: 'async' }); }

  /* ---------- storage (never throws) ---------- */
  function readCfg() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) {}
    if (!raw) { try { raw = sessionStorage.getItem(STORE); } catch (e) {} }
    try { var c = raw && JSON.parse(raw); if (c && c.provider && c.key && c.model) return c; } catch (e) {}
    return null;
  }
  function writeCfg(c) {
    var s = JSON.stringify(c);
    try { localStorage.removeItem(STORE); } catch (e) {}
    try { sessionStorage.removeItem(STORE); } catch (e) {}
    try { (c.remember ? localStorage : sessionStorage).setItem(STORE, s); } catch (e) { memCfg = c; }
  }
  function clearCfg() { try { localStorage.removeItem(STORE); } catch (e) {} try { sessionStorage.removeItem(STORE); } catch (e) {} memCfg = null; }
  var memCfg = null;
  function cfg() { return readCfg() || memCfg; }

  /* ---------- tiny DOM helpers ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag), k;
    if (attrs) for (k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c == null) return; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function icon(paths) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    paths.forEach(function (d) { var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.appendChild(p); });
    return s;
  }
  var I = {
    spark: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z'],
    send: ['M12 19V5', 'M5 12l7-7 7 7'], plus: ['M12 5v14', 'M5 12h14'], down: ['M6 9l6 6 6-6'], x: ['M6 6l12 12', 'M18 6L6 18'],
    gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
    eye: ['M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    lock: ['M6 11h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M8 11V7a4 4 0 0 1 8 0v4']
  };

  /* ---------- lesson context ---------- */
  var root = document.querySelector('main') || document.body;
  function lessonTitle() { var t = root.querySelector('h1'); return (t ? t.textContent : document.title).replace(/\s+/g, ' ').trim(); }
  function lessonText() {
    var clone = root.cloneNode(true);
    clone.querySelectorAll('svg,script,style,nav,.learning-widget,.uai').forEach(function (n) { n.remove(); });
    return (clone.innerText || clone.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 7000);
  }
  function systemPrompt() { var pp = persona(); return personaText(pp) + '\n\n' + structure(pp) + '\n\n' + (EN ? '[Page title] ' : '【当前页面】') + lessonTitle() + '\n' + (EN ? '[Page] ' : '【页面】') + location.pathname + '\n' + (EN ? '[Page text, excerpt]\n' : '【页面正文节选】\n') + lessonText(); }

  /* ---------- state ---------- */
  var S = { open: false, wide: false, view: 'chat', quote: '', busy: false, unread: false, msgs: [], ctrl: null, lastSend: null };

  /* ---------- build UI ---------- */
  var ui = h('div', { class: 'uai', id: 'uai', role: 'region', 'aria-label': T.title });
  var dock = h('div', { class: 'uai-dock' });
  var panel = h('section', { class: 'uai-panel', hidden: true, 'aria-label': T.title });
  var island = h('div', { class: 'uai-island uai-glass' });
  dock.appendChild(panel); dock.appendChild(island); ui.appendChild(dock);

  // panel: chat view
  var provLabel = h('span');
  var headOrb = h('span', { class: 'uai-orb' }, [icon(I.spark)]);
  var head = h('div', { class: 'uai-head' }, [
    headOrb,
    h('div', { class: 'uai-title' }, [h('strong', { text: T.title }), provLabel]),
    h('button', { type: 'button', class: 'uai-icon', 'aria-label': T.newChat, title: T.newChat, onclick: newChat }, [icon(I.plus)]),
    h('button', { type: 'button', class: 'uai-icon', 'aria-label': T.settings, title: T.settings, onclick: function () { showSetup(true); } }, [icon(I.gear)]),
    h('button', { type: 'button', class: 'uai-icon', 'aria-label': T.collapse, title: T.collapse, onclick: collapse }, [icon(I.down)])
  ]);
  var pSel = h('select', { class: 'uai-psel', 'aria-label': T.persona, title: T.persona, onchange: function () { var p = persona(); p.id = pSel.value; writePersona(p); if (p.id === 'custom' && !p.custom) showSetup(true, true); } },
    ['serious', 'lively', 'snarky', 'yue', 'custom'].map(function (k) { return h('option', { value: k, text: T.personaShort + '：' + (k === 'custom' ? T.custom : T.personas[k][0]) }); }));
  var ctxRow = h('div', { class: 'uai-ctx' }, [h('b', { text: T.lesson }), h('span', { text: lessonTitle() + ' · ' + T.ctx }), pSel]);
  var log = h('div', { class: 'uai-log', 'aria-live': 'polite' });
  var chips = h('div', { class: 'uai-chips' }, T.chips.map(function (c) { return h('button', { type: 'button', class: 'uai-ghost', text: c[0], onclick: function () { send(c[1]); } }); }));
  var chatView = h('div', { style: 'display:contents' }, [head, ctxRow, log, h('p', { class: 'uai-foot', text: T.foot })]);
  panel.appendChild(chatView);

  // panel: setup view
  var setupView = buildSetup();
  panel.appendChild(setupView.el);

  // island parts
  var pill = h('button', { type: 'button', class: 'uai-pill', onclick: function () { expand(true); } });
  var orbIcon = h('span', { class: 'uai-orb' }, [icon(I.spark)]);
  var orbBtn = h('button', { type: 'button', class: 'uai-orbbtn', onclick: togglePanel }, [orbIcon]);
  var emptyTitle = h('strong', { text: T.emptyTitle }), emptyHint = h('p', { text: T.emptyHint });
  var emptyArt = h('img', { class: 'uai-empty-art', src: mascot('explain'), alt: '', width: '88', height: '88', decoding: 'async', hidden: true });
  var empty = h('div', { class: 'uai-empty' }, [
    emptyArt, emptyTitle, emptyHint,
    h('div', { class: 'uai-chips' }, T.starters.map(function (c) { return h('button', { type: 'button', class: 'uai-ghost', text: c[0], onclick: function () { send(c[1]); } }); }))
  ]);
  var tag = h('span', { class: 'uai-tag', text: T.lesson + ' ' + shortTitle() });
  var quoteBtn = h('button', { type: 'button', class: 'uai-quote', onclick: function () { S.wide = true; S.quoteEditing = true; render(); input.focus(); } }, [h('small', { text: T.selected }), h('span')]);
  var attach = h('span', { class: 'uai-attach' }, [h('span', { text: T.attached })]);
  var xQuote = h('button', { type: 'button', class: 'uai-x', 'aria-label': T.remove, title: T.remove, onclick: function () { S.quote = ''; S.quoteEditing = false; markQuote(null); render(); } }, [icon(I.x)]);
  attach.appendChild(xQuote);
  var input = h('input', { class: 'uai-input', type: 'text', 'aria-label': T.placeholder, placeholder: T.placeholder, autocomplete: 'off', enterkeyhint: 'send' });
  var goBtn = h('button', { type: 'button', class: 'uai-go is-icon', 'aria-label': T.send, title: T.send, onclick: function () { submit(); } }, [icon(I.send)]);
  var explainBtn = h('button', { type: 'button', class: 'uai-go', text: T.explain, onclick: function () { submit(); } });
  var stopBtn = h('button', { type: 'button', class: 'uai-ghost', text: T.stop, onclick: stop });
  var xIsland = h('button', { type: 'button', class: 'uai-x', 'aria-label': T.collapse, title: T.collapse, onclick: collapse }, [icon(I.x)]);
  [orbBtn, pill, tag, quoteBtn, attach, input, stopBtn, goBtn, explainBtn, xIsland].forEach(function (n) { island.appendChild(n); });
  // keep the reader's text selection when pressing island buttons
  island.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(); } });

  function shortTitle() { var t = lessonTitle(); return t.length > 14 ? t.slice(0, 13) + '…' : t; }

  /* ---------- render ---------- */
  function setPill() {
    while (pill.firstChild) pill.removeChild(pill.firstChild);
    var c = cfg();
    island.classList.toggle('is-done', !S.busy && S.unread);
    if (S.busy) {
      pill.appendChild(h('span', { class: 'uai-bars', 'aria-hidden': 'true' }, [h('i'), h('i'), h('i'), h('i'), h('i')]));
      pill.appendChild(document.createTextNode(T.busy));
    } else if (S.unread) {
      pill.appendChild(h('span', { class: 'uai-dot', 'aria-hidden': 'true' }));
      pill.appendChild(document.createTextNode(T.done)); pill.appendChild(h('span', { class: 'uai-sub', text: ' · ' + T.doneHint }));
    } else {
      pill.appendChild(document.createTextNode(T.ask));
      pill.appendChild(h('span', { class: 'uai-sub', text: ' · ' + (c ? T.askHint : T.connect) }));
    }
    pill.setAttribute('aria-label', pill.textContent);
  }
  function render() {
    var mode = S.wide ? (S.quote && !S.quoteEditing ? 'quote' : 'input') : 'pill';
    island.classList.toggle('is-wide', mode !== 'pill');
    island.classList.toggle('is-accent', mode === 'input' || S.busy);
    pill.hidden = mode !== 'pill';
    tag.hidden = mode !== 'input' || !!S.quote;
    quoteBtn.hidden = mode !== 'quote';
    attach.hidden = !(mode === 'input' && S.quote);
    input.hidden = mode !== 'input';
    input.placeholder = S.quote ? T.placeholderQuote : T.placeholder;
    explainBtn.hidden = mode !== 'quote';
    goBtn.hidden = mode !== 'input' || S.busy;
    stopBtn.hidden = !(mode === 'input' && S.busy);
    xIsland.hidden = mode === 'pill' || S.open;
    if (mode === 'quote') quoteBtn.lastChild.textContent = '“' + S.quote.replace(/\s+/g, ' ').slice(0, 120) + '”';
    if (mode === 'pill') setPill();
    panel.hidden = !S.open;
    var off = !cfg(); orbIcon.classList.toggle('is-off', off);
    var yue = isYue(); if (yue !== orbIcon.classList.contains('is-yue')) { [orbIcon, headOrb].forEach(function (o) { while (o.firstChild) o.removeChild(o.firstChild); o.classList.toggle('is-yue', yue); o.appendChild(yue ? h('img', { src: mascot('avatar'), alt: '', width: '36', height: '36', decoding: 'async' }) : icon(I.spark)); }); }
    emptyTitle.textContent = yue ? T.yueEmpty[0] : T.emptyTitle; emptyHint.textContent = yue ? T.yueEmpty[1] : T.emptyHint; emptyArt.hidden = !yue;
    var lbl = S.open && S.view === 'chat' ? T.closePanel : T.openPanel; orbBtn.setAttribute('aria-label', lbl); orbBtn.title = lbl; orbBtn.setAttribute('aria-expanded', String(S.open));
    if (!S.msgs.length && !log.querySelector('.uai-me')) { if (empty.parentNode !== log) log.insertBefore(empty, log.firstChild); } else if (empty.parentNode) empty.parentNode.removeChild(empty);
    var c = cfg();
    chatView.style.display = S.view === 'chat' ? 'contents' : 'none';
    setupView.el.hidden = S.view !== 'setup';
    pSel.value = persona().id;
    provLabel.textContent = c ? T.via(PROVIDERS[c.provider] ? PROVIDERS[c.provider].name : c.provider) : '';
  }

  /* ---------- open / close ---------- */
  function expand(focus) {
    S.unread = false;
    if (!cfg()) { showSetup(false); return; }
    S.wide = true; S.quoteEditing = !S.quote; if (S.msgs.length) { S.open = true; S.view = 'chat'; }
    render(); if (focus && !input.hidden) input.focus();
  }
  function togglePanel() {
    S.unread = false;
    if (!cfg()) { showSetup(false); return; }
    if (S.open && S.view === 'chat') { S.open = false; render(); return; }
    S.open = true; S.view = 'chat'; S.wide = true; S.quoteEditing = !S.quote;
    render(); if (!input.hidden) input.focus({ preventScroll: true });
  }
  function collapse() { S.open = false; S.wide = false; S.quoteEditing = false; if (S.view === 'setup') S.view = 'chat'; render(); try { pill.focus({ preventScroll: true }); } catch (e) {} }
  function showSetup(fromChat, toPersona) { S.open = true; S.view = 'setup'; S.wide = false; setupView.fill(); render(); if (toPersona) { setTimeout(function () { var f = document.getElementById('uai-persona-field'); if (f) f.scrollIntoView({ block: 'start' }); var t = document.getElementById('uai-pcustom'); if (t) t.focus(); }, 30); } else setupView.focus(); setupView.fromChat = fromChat; }
  function newChat() { stop(); S.msgs = []; while (log.firstChild) log.removeChild(log.firstChild); S.open = true; S.view = 'chat'; S.wide = true; S.quoteEditing = true; render(); input.focus(); }

  /* ---------- selection → quote ---------- */
  var HL = (window.CSS && CSS.highlights && window.Highlight) ? CSS.highlights : null;
  function markQuote(range) { if (!HL) return; try { if (range) HL.set('uai-quote', new Highlight(range)); else HL.delete('uai-quote'); } catch (e) {} }
  var selTimer = null;
  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(function () {
      var sel = window.getSelection && window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;
      var node = sel.getRangeAt(0).commonAncestorContainer; if (node.nodeType !== 1) node = node.parentNode;
      if (!node || !root.contains(node) || ui.contains(node)) return;
      var text = sel.toString().replace(/\s+/g, ' ').trim();
      if (text.length < 2) return;
      S.quote = text.slice(0, 1200); S.quoteEditing = false; S.wide = true; markQuote(sel.getRangeAt(0).cloneRange());
      if (document.activeElement === input && input.value) S.quoteEditing = true;
      render();
    }, 220);
  });

  /* ---------- sending ---------- */
  function submit() {
    var q = input.value.trim(), quote = S.quote;
    if (!q && !quote) { input.focus(); return; }
    if (!cfg()) { showSetup(false); return; }
    var text = quote ? T.explainPrefix + '\n「' + quote + '」' + (q ? '\n\n' + q : '') : q;
    input.value = ''; S.quote = ''; S.quoteEditing = true; markQuote(null);
    send(text, { quote: quote, q: q });
  }
  function bubbleMe(view) {
    var kids = [];
    if (view.quote) kids.push(h('blockquote', { text: view.quote }));
    if (view.q) kids.push(h('p', { text: view.q }));
    if (!view.quote && !view.q) kids.push(h('p', { text: view.text }));
    log.appendChild(h('div', { class: 'uai-me' }, kids));
  }
  function send(text, view) {
    if (S.busy) return;
    var c = cfg(); if (!c) { showSetup(false); return; }
    if (chips.parentNode) chips.parentNode.removeChild(chips);
    log.querySelectorAll('.uai-err').forEach(function (n) { n.remove(); });
    bubbleMe(view || { text: text });
    S.msgs.push({ role: 'user', content: text });
    S.open = true; S.view = 'chat'; S.wide = true; S.quoteEditing = true; S.busy = true; S.lastSend = { text: text, view: view };
    var bot = h('div', { class: 'uai-bot uai-caret' }), yue = isYue(), stk = null;
    if (yue) { stk = stickerImg('think'); log.appendChild(h('div', { class: 'uai-yrow' }, [stk, bot])); } else log.appendChild(bot);
    scroll();
    function setStk(k) { if (stk && k) { stk.src = mascot(k); stk.alt = STK_ALT[k]; } }
    function shown(final) { if (!yue) return acc; var sp = splitSticker(acc, final); if (final) setStk(sp.key || 'explain'); return sp.text; }
    render(); input.focus({ preventScroll: true });
    var acc = '', ctrl = new AbortController(); S.ctrl = ctrl;
    stream(c, S.msgs.slice(-12), ctrl.signal, function (piece) { acc += piece; paint(bot, shown(false)); pinTop(bot); })
      .then(function () {
        bot.classList.remove('uai-caret');
        if (!acc) acc = '…';
        acc = shown(true) || '…'; paint(bot, acc);
        S.msgs.push({ role: 'assistant', content: acc });
        log.appendChild(chips);
      })
      .catch(function (err) {
        bot.classList.remove('uai-caret');
        if (yue && acc) { acc = shown(true); paint(bot, acc); }
        if (err && err.name === 'AbortError') {
          if (acc) { S.msgs.push({ role: 'assistant', content: acc + ' ' + T.stopped }); bot.appendChild(h('p', { class: 'uai-help', text: T.stopped })); log.appendChild(chips); }
          else { (stk ? bot.parentNode : bot).remove(); S.msgs.pop(); }
          return;
        }
        if (!acc) (stk ? bot.parentNode : bot).remove(); else { setStk('guilty'); S.msgs.push({ role: 'assistant', content: acc }); }
        if (!acc) S.msgs.pop();
        showError(err);
      })
      .then(function () {
        S.busy = false; S.ctrl = null;
        if (!S.open) S.unread = true;
        render(); if (!acc) scroll(); else pinTop(bot);
      });
  }
  function stop() { if (S.ctrl) S.ctrl.abort(); }
  function scroll() { log.scrollTop = log.scrollHeight; }
  // keep the start of a new answer (its key point) in view instead of chasing the bottom
  function pinTop(el) { var want = Math.max(0, el.offsetTop - 10); if (log.scrollTop < want) log.scrollTop = Math.min(want, log.scrollHeight - log.clientHeight); }

  function showError(err) {
    var kind = err && err.kind, d = kind === 'auth' ? T.eAuth : kind === 'rate' ? T.eRate : kind === 'net' ? T.eNet : T.eOther;
    var detail = d[1] || (err && err.message ? String(err.message).slice(0, 200) : '');
    var actions = kind === 'auth'
      ? h('button', { type: 'button', class: 'uai-ghost', text: T.goSettings, onclick: function () { showSetup(true); } })
      : h('button', { type: 'button', class: 'uai-ghost', text: T.retry, onclick: function () { var l = S.lastSend; if (!l) return; log.querySelectorAll('.uai-err').forEach(function (n) { n.remove(); }); var last = log.querySelector('.uai-me:last-of-type'); if (last) last.remove(); send(l.text, l.view); } });
    log.appendChild(h('div', { class: 'uai-err' + (kind === 'rate' ? ' is-warn' : kind === 'net' ? ' is-net' : ''), role: 'alert' }, [isYue() ? stickerImg('guilty', 'uai-stk is-sm') : null, h('div', null, [h('strong', { text: d[0] }), h('span', { text: detail })]), actions]));
    scroll();
  }

  /* ---------- minimal, safe markdown ---------- */
  function inline(parent, s) {
    var re = /(\*\*[^*]+\*\*|`[^`]+`)/g, last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) parent.appendChild(document.createTextNode(s.slice(last, m.index)));
      var t = m[0]; parent.appendChild(t[0] === '`' ? h('code', { text: t.slice(1, -1) }) : h('strong', { text: t.slice(2, -2) }));
      last = m.index + t.length;
    }
    if (last < s.length) parent.appendChild(document.createTextNode(s.slice(last)));
  }
  function paint(el, md) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var blocks = md.replace(/\r/g, '').split(/\n{2,}/);
    var first = true;
    blocks.forEach(function (b) {
      var lines = b.split('\n').filter(function (l) { return l.trim(); });
      if (!lines.length) return;
      var ul = lines.every(function (l) { return /^\s*[-*•]\s+/.test(l); }), ol = lines.every(function (l) { return /^\s*\d+[.)、]\s*/.test(l); });
      if (ul || ol) {
        var list = h(ul ? 'ul' : 'ol');
        lines.forEach(function (l) { var li = h('li'); inline(li, l.replace(/^\s*([-*•]|\d+[.)、])\s*/, '')); list.appendChild(li); });
        el.appendChild(list); first = false;
      } else {
        var p = h('p', { class: first && /^\s*\*\*/.test(lines[0]) ? 'uai-key' : null });
        lines.forEach(function (l, i) { if (i) p.appendChild(h('br')); inline(p, l.replace(/^#{1,6}\s+/, '')); });
        el.appendChild(p); first = false;
      }
    });
  }

  /* ---------- providers ---------- */
  function fail(kind, message) { var e = new Error(message || kind); e.kind = kind; return e; }
  function httpFail(res) {
    return res.text().then(function (t) {
      var msg = t; try { var j = JSON.parse(t); msg = (j.error && (j.error.message || j.error.type)) || j.message || t; } catch (e) {}
      var kind = res.status === 401 || res.status === 403 ? 'auth' : res.status === 429 || res.status === 402 || res.status === 529 ? 'rate' : 'other';
      if (/credit|balance|insufficient|quota/i.test(String(msg))) kind = 'rate';
      throw fail(kind, 'HTTP ' + res.status + (msg ? ' · ' + String(msg).slice(0, 180) : ''));
    });
  }
  function endpoint(c) {
    if (c.provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
    var base = (c.base || (PROVIDERS[c.provider] && PROVIDERS[c.provider].base) || '').replace(/\/+$/, '');
    return base + '/chat/completions';
  }
  function request(c, msgs, signal, streamOn, maxTokens) {
    var body, headers = { 'content-type': 'application/json' };
    if (c.provider === 'anthropic') {
      headers['x-api-key'] = c.key; headers['anthropic-version'] = '2023-06-01'; headers['anthropic-dangerous-direct-browser-access'] = 'true';
      body = { model: c.model, max_tokens: maxTokens, system: systemPrompt(), messages: msgs, stream: streamOn };
    } else {
      headers.authorization = 'Bearer ' + c.key;
      body = { model: c.model, messages: [{ role: 'system', content: systemPrompt() }].concat(msgs), stream: streamOn };
      if (c.provider === 'openai') body.max_completion_tokens = maxTokens; else body.max_tokens = maxTokens;
    }
    return fetch(endpoint(c), { method: 'POST', headers: headers, body: JSON.stringify(body), signal: signal })
      .catch(function (e) { if (e && e.name === 'AbortError') throw e; throw fail('net', e && e.message); })
      .then(function (res) { if (!res.ok) return httpFail(res); return res; });
  }
  function stream(c, msgs, signal, onText) {
    return request(c, msgs, signal, true, 1200).then(function (res) {
      if (!res.body || !res.body.getReader) return res.text().then(function (t) { parseChunk(c, t, onText); });
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { if (buf) parseChunk(c, buf, onText); return; }
          buf += dec.decode(r.value, { stream: true });
          var cut = buf.lastIndexOf('\n'); if (cut < 0) return pump();
          var ready = buf.slice(0, cut); buf = buf.slice(cut + 1);
          parseChunk(c, ready, onText);
          return pump();
        });
      }
      return pump();
    });
  }
  function parseChunk(c, text, onText) {
    text.split('\n').forEach(function (line) {
      line = line.trim(); if (line.indexOf('data:') !== 0) return;
      var data = line.slice(5).trim(); if (!data || data === '[DONE]') return;
      var j; try { j = JSON.parse(data); } catch (e) { return; }
      if (j.type === 'error' || (j.error && !j.choices)) { var m = (j.error && (j.error.message || j.error.type)) || 'error'; throw fail(/overloaded|rate/i.test(m) ? 'rate' : 'other', m); }
      if (c.provider === 'anthropic') { if (j.type === 'content_block_delta' && j.delta && j.delta.type === 'text_delta') onText(j.delta.text); }
      else { var d = j.choices && j.choices[0] && j.choices[0].delta; if (d && typeof d.content === 'string') onText(d.content); }
    });
  }

  /* ---------- setup form ---------- */
  function buildSetup() {
    var el = h('div', { style: 'display:flex;flex-direction:column;min-height:0;flex:1 1 auto' });
    var head2 = h('div', { class: 'uai-head' }, [
      h('span', { class: 'uai-orb' }, [icon(I.spark)]),
      h('div', { class: 'uai-title' }, [h('strong', { text: T.setupTitle })]),
      h('button', { type: 'button', class: 'uai-icon', 'aria-label': T.collapse, title: T.collapse, onclick: collapse }, [icon(I.down)])
    ]);
    var body = h('div', { class: 'uai-setup' });
    body.appendChild(h('p', { text: T.setupIntro }));
    var radios = {};
    var provs = h('div', { class: 'uai-provs' }, Object.keys(PROVIDERS).map(function (k) {
      var r = h('input', { type: 'radio', name: 'uai-prov', value: k, onchange: function () { onProv(k, true); } }); radios[k] = r;
      return h('label', { class: 'uai-prov' }, [r, PROVIDERS[k].name]);
    }));
    body.appendChild(h('div', { class: 'uai-field' }, [h('fieldset', null, [h('legend', { text: T.provider }), provs])]));
    var keyIn = h('input', { id: 'uai-key', class: 'is-mono', type: 'password', autocomplete: 'off', spellcheck: 'false' });
    var eyeBtn = h('button', { type: 'button', class: 'uai-icon', 'aria-label': T.show, title: T.show, onclick: function () { var show = keyIn.type === 'password'; keyIn.type = show ? 'text' : 'password'; eyeBtn.setAttribute('aria-label', show ? T.hide : T.show); eyeBtn.title = show ? T.hide : T.show; } }, [icon(I.eye)]);
    var keyHelp = h('a', { target: '_blank', rel: 'noopener' });
    var keyHelpWrap = h('span', { class: 'uai-help' }, [keyHelp]);
    body.appendChild(h('div', { class: 'uai-field' }, [h('label', { for: 'uai-key', text: T.key }), h('div', { class: 'uai-box' }, [keyIn, eyeBtn]), keyHelpWrap]));
    var baseIn = h('input', { id: 'uai-base', type: 'url', placeholder: 'https://…/v1', autocomplete: 'off', spellcheck: 'false' });
    var baseField = h('div', { class: 'uai-field' }, [h('label', { for: 'uai-base', text: T.base }), h('div', { class: 'uai-box' }, [baseIn])]);
    body.appendChild(baseField);
    var dl = h('datalist', { id: 'uai-models' });
    var modelIn = h('input', { id: 'uai-model', list: 'uai-models', autocomplete: 'off', spellcheck: 'false' });
    body.appendChild(h('div', { class: 'uai-field' }, [h('label', { for: 'uai-model', text: T.model }), h('div', { class: 'uai-box' }, [modelIn]), dl, h('span', { class: 'uai-help', text: T.modelHint })]));
    var remember = h('input', { type: 'checkbox', checked: true });
    body.appendChild(h('label', { class: 'uai-check' }, [remember, T.remember]));
    body.appendChild(h('div', { class: 'uai-note' }, [icon(I.lock), h('span', { text: T.note })]));
    var pRadios = {}, customTa = h('textarea', { id: 'uai-pcustom', rows: '3', maxlength: '300', placeholder: T.customPh, oninput: function () { var p = persona(); p.custom = customTa.value; writePersona(p); } });
    var pGrid = h('div', { class: 'uai-provs' }, ['serious', 'lively', 'snarky', 'yue', 'custom'].map(function (k) {
      var r = h('input', { type: 'radio', name: 'uai-persona', value: k, onchange: function () { var p = persona(); p.id = k; writePersona(p); customWrap.hidden = k !== 'custom'; if (k === 'custom') customTa.focus(); render(); } }); pRadios[k] = r;
      return h('label', { class: 'uai-prov' }, [r, k === 'custom' ? T.custom : T.personas[k][0]]);
    }));
    var pPreview = h('span', { class: 'uai-help' });
    var customWrap = h('div', { class: 'uai-field' }, [h('label', { for: 'uai-pcustom', text: T.custom }), h('div', { class: 'uai-box uai-tbox' }, [customTa])]);
    var personaField = h('div', { class: 'uai-field', id: 'uai-persona-field' }, [h('fieldset', null, [h('legend', { text: T.persona }), pGrid]), h('span', { class: 'uai-help', text: T.personaHelp }), customWrap]);
    body.insertBefore(personaField, body.children[1]);
    function fillPersona() { var p = persona(); pRadios[p.id].checked = true; customTa.value = p.custom || ''; customWrap.hidden = p.id !== 'custom'; }
    var status = h('p', { class: 'uai-status', role: 'status' });
    body.appendChild(status);
    var forget = h('button', { type: 'button', class: 'uai-ghost', text: T.forget, onclick: function () { clearCfg(); keyIn.value = ''; status.textContent = ''; render(); } });
    body.appendChild(forget);
    var saveBtn = h('button', { type: 'button', class: 'uai-go', text: T.save, onclick: save });
    var laterBtn = h('button', { type: 'button', class: 'uai-ghost', text: T.later, onclick: collapse });
    el.appendChild(head2); el.appendChild(body); el.appendChild(h('div', { class: 'uai-actions' }, [saveBtn, laterBtn]));

    var current = 'anthropic';
    function onProv(k, reset) {
      current = k; radios[k].checked = true; var P = PROVIDERS[k];
      keyIn.placeholder = P.ph || '';
      while (dl.firstChild) dl.removeChild(dl.firstChild); P.models.forEach(function (m) { dl.appendChild(h('option', { value: m })); });
      if (reset) { modelIn.value = P.model; baseIn.value = P.base || ''; }
      modelIn.placeholder = k === 'openai' ? (EN ? 'e.g. a model listed in your OpenAI account' : '例如你的 OpenAI 账户里可用的模型名') : '';
      baseField.hidden = k !== 'custom';
      keyHelp.textContent = T.howKey[k]; if (P.keyUrl) { keyHelp.href = P.keyUrl; keyHelp.removeAttribute('aria-disabled'); } else { keyHelp.removeAttribute('href'); }
    }
    function fill() {
      fillPersona(); var c = cfg(); status.textContent = ''; status.className = 'uai-status';
      if (c) { onProv(c.provider in PROVIDERS ? c.provider : 'custom', false); keyIn.value = c.key; modelIn.value = c.model; baseIn.value = c.base || PROVIDERS[current].base || ''; remember.checked = c.remember !== false; forget.hidden = false; }
      else { onProv(current, true); keyIn.value = ''; forget.hidden = true; }
      keyIn.type = 'password';
    }
    function save() {
      var c = { provider: current, key: keyIn.value.trim(), model: modelIn.value.trim(), base: current === 'anthropic' ? '' : (baseIn.value.trim() || PROVIDERS[current].base || ''), remember: remember.checked };
      status.className = 'uai-status is-bad';
      if (!c.key) { status.textContent = T.needKey; keyIn.focus(); return; }
      if (!c.model) { status.textContent = T.needModel; modelIn.focus(); return; }
      if (c.provider !== 'anthropic' && !/^https:\/\//i.test(c.base)) { status.textContent = T.needBase; baseIn.focus(); return; }
      status.className = 'uai-status'; status.textContent = T.testing; saveBtn.disabled = true;
      request(c, [{ role: 'user', content: 'ping' }], undefined, false, 5)
        .then(function () {
          writeCfg(c); status.className = 'uai-status is-ok'; status.textContent = T.ok;
          setTimeout(function () { S.view = 'chat'; S.open = !!S.msgs.length; S.wide = true; S.quoteEditing = !S.quote; render(); if (!input.hidden) input.focus(); }, 500);
        })
        .catch(function (e) {
          var d = e.kind === 'auth' ? T.eAuth : e.kind === 'rate' ? T.eRate : e.kind === 'net' ? T.eNet : T.eOther;
          status.className = 'uai-status is-bad'; status.textContent = d[0] + (e.message ? ' · ' + String(e.message).slice(0, 160) : '');
        })
        .then(function () { saveBtn.disabled = false; });
    }
    return { el: el, fill: fill, focus: function () { setTimeout(function () { (keyIn.value ? saveBtn : keyIn).focus(); }, 30); } };
  }

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (S.wide || S.open)) { collapse(); return; }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var t = e.target, tagName = t && t.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (t && t.isContentEditable)) return;
      e.preventDefault(); expand(true);
    }
  });

  function mount() { document.body.appendChild(ui); document.body.classList.add('uai-pad'); render(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
