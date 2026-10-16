/* Взлёт: вкладка "Тренировка" (предполётная проверка, сборка дрона, аккумуляторы, тренажёр стиков),
   доступ к тестам и заданиям для каждого ученика, "Почему так" в калькуляторах.
   Доступ хранится в листе "Статус": строки "_доступ:Имя (класс)" -> "safe:2,tech:1"
   (0 закрыто, 1 тест открыт, 2 открыто задание, 3 задание выполнено). */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ses = { get(k) { try { return sessionStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { sessionStorage.setItem(k, v) } catch (e) {} } };
const nrm = s => String(s || '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
const isCoach = () => typeof MODE !== 'undefined' && MODE === 'coach';
const D = () => (typeof data !== 'undefined' && data) ? data : {};
const AC = () => window.ACAD || null;
const tg = () => { const a = AC(); if (!a) return {}; a.A.tg = a.A.tg || {}; return a.A.tg; };
const fx = (n, d = 1) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- звук: короткие щелчки, без файлов ---------- */
let AX = null;
function snd(kind) {
  try {
    AX = AX || new (window.AudioContext || window.webkitAudioContext)();
    const t = AX.currentTime, o = AX.createOscillator(), g = AX.createGain();
    const P = { ok: [660, 990, .12, 'triangle'], bad: [180, 140, .18, 'sawtooth'], tap: [520, 520, .05, 'square'], win: [523, 1046, .45, 'triangle'] }[kind] || [440, 440, .1, 'sine'];
    o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'bad' ? .05 : .08, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + P[2] + .05);
    o.connect(g); g.connect(AX.destination); o.start(t); o.stop(t + P[2] + .08);
  } catch (e) {}
}
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms) } catch (e) {} }
function modal(html) { $('pbody').innerHTML = html; $('pmodal').classList.add('open'); }

/* =====================================================================
   1. ДОСТУП К ТЕСТАМ И ЗАДАНИЯМ ДЛЯ КАЖДОГО УЧЕНИКА
   ===================================================================== */
const ACC = '_доступ:';
function me() { try { const S = JSON.parse(localStorage.getItem('spk_vzlet') || 'null'); if (S && S.code && S.first) return S.first + ' (' + S.cls + ')'; } catch (e) {} return null; }
function accMap() {
  const M = {};
  (D()['Статус'] || []).forEach(r => {
    const p = String(r['Параметр'] || '');
    if (!p.startsWith(ACC)) return;
    const o = {};
    String(r['Значение'] || '').split(',').forEach(x => { const [k, v] = x.split(':').map(s => s.trim()); if (k) o[k] = Math.max(0, Math.min(3, parseInt(v, 10) || 0)); });
    M[nrm(p.slice(ACC.length))] = { name: p.slice(ACC.length).trim(), o };
  });
  return M;
}
window.vzMe = me;
/* состояние уровня k (номер i в списке) для ученика на этом устройстве */
window.vzAcc = (k, i) => {
  const n = me(), r = n ? accMap()[nrm(n)] : null, v = r ? (r.o[k] || 0) : 0;
  return i === 0 ? Math.max(1, v) : v;
};
const STI = ['🔒', '📖', '📝', '✅'], STN = ['закрыто', 'тест открыт', 'открыто задание', 'задание выполнено'];

window.vzAccOpen = function () {
  const Q = typeof QUIZ === 'object' ? QUIZ : {}, keys = Object.keys(Q), M = accMap();
  const seen = new Set(), list = [];
  const add = (n, c) => { const k = nrm(n); if (!k || seen.has(k)) return; seen.add(k); list.push({ n: String(n).trim(), c: c || '' }); };
  (typeof SPK_PIL !== 'undefined' ? SPK_PIL : []).forEach(p => add(p['Пилот'], p['Класс']));
  Object.values(M).forEach(r => add(r.name, ''));
  (typeof allPilots === 'function' ? allPilots() : []).forEach(p => add(p['Пилот'], p['Класс']));
  list.sort((a, b) => (parseInt(a.c) || 99) - (parseInt(b.c) || 99) || a.n.localeCompare(b.n, 'ru'));
  const st = list.map(s => { const r = M[nrm(s.n)]; return keys.map((k, i) => { const v = r ? (r.o[k] || 0) : 0; return i === 0 ? Math.max(1, v) : v; }); });
  const sel = new Set();
  function cell(r, i) { const v = st[r][i]; return `<button class="ac s${v}" data-r="${r}" data-i="${i}" title="${E(STN[v])}">${STI[v]}</button>`; }
  function draw() {
    const box = $('accBox'); if (!box) return;
    box.innerHTML = list.length ? `<table class="acc"><thead><tr><th><button class="ac all" id="accAll" title="Выбрать всех">☑</button></th><th>Ученик</th>${keys.map(k => `<th title="${E(Q[k].n)}">${Q[k].e}<small>${E(Q[k].n)}</small></th>`).join('')}</tr></thead><tbody>${list.map((s, r) => `<tr class="${sel.has(r) ? 'sel' : ''}"><td><input type="checkbox" data-r="${r}" ${sel.has(r) ? 'checked' : ''}></td><td class="an">${E(s.n)}</td>${keys.map((k, i) => `<td>${cell(r, i)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : '<p class="empty">Учеников пока нет. Они появятся здесь после одобрения заявок.</p>';
    box.querySelectorAll('.ac[data-r]').forEach(b => b.onclick = () => { const r = +b.dataset.r, i = +b.dataset.i; let v = (st[r][i] + 1) % 4; if (i === 0 && v === 0) v = 1; st[r][i] = v; snd('tap'); draw(); });
    box.querySelectorAll('input[data-r]').forEach(c => c.onchange = () => { const r = +c.dataset.r; c.checked ? sel.add(r) : sel.delete(r); draw(); });
    const a = $('accAll'); if (a) a.onclick = () => { if (sel.size === list.length) sel.clear(); else list.forEach((_, r) => sel.add(r)); draw(); };
    const nx = $('accNext'); if (nx) { nx.disabled = !sel.size; nx.textContent = sel.size ? `▶ Следующий шаг выбранным (${sel.size})` : '▶ Следующий шаг выбранным'; }
  }
  modal(`<h2>🔓 Доступ учеников</h2>
    <p class="sub">Нажимай на клетку, чтобы сменить шаг: 🔒 закрыто → 📖 тест открыт → 📝 открыто задание → ✅ задание выполнено. Первый тест открыт всем.<br>Пришли не все? Отметь галочками тех, кто пришёл, и нажми "Следующий шаг": каждому откроется его следующий шаг.</p>
    <div class="accbar"><button class="btn" id="accNext" disabled>▶ Следующий шаг выбранным</button></div>
    <div class="tscroll" id="accBox"></div>
    <div class="ebar" style="margin-top:12px"><span class="sp"></span><button class="btn" onclick="closePilot()">Отмена</button><button class="btn primary" id="accSave">Сохранить</button></div>`);
  $('accNext').onclick = () => { sel.forEach(r => { const i = st[r].findIndex(v => v < 3); if (i >= 0) st[r][i]++; }); snd('ok'); draw(); };
  $('accSave').onclick = async () => {
    const b = $('accSave'); b.disabled = true; b.textContent = 'Сохраняю…';
    const keep = (D()['Статус'] || []).filter(x => !String(x['Параметр'] || '').startsWith(ACC));
    const rows = list.map((s, r) => ({ s, v: keys.map((k, i) => (i === 0 ? (st[r][i] > 1 ? k + ':' + st[r][i] : '') : (st[r][i] ? k + ':' + st[r][i] : ''))).filter(Boolean).join(',') }))
      .filter(x => x.v).map(x => ({ 'Параметр': ACC + x.s.n, 'Значение': x.v }));
    try { await postSheet('Статус', [...keep, ...rows]); closePilot(); renderAll(); toast('Доступ сохранён ✓', 'ok'); }
    catch (e) { toast('Не сохранилось: ' + e.message, 'bad'); b.disabled = false; b.textContent = 'Сохранить'; }
  };
  draw();
};

/* =====================================================================
   2. ПРЕДПОЛЁТНАЯ ПРОВЕРКА (открывает тренировки)
   ===================================================================== */
const CK = [
  ['🔋', 'Аккумулятор заряжен и не вздут', 'Вздутый или помятый LiPo может загореться. Такой не ставим никогда.'],
  ['🌀', 'Пропеллеры целые, гайки затянуты', 'Даже маленькая трещина: на 30 000 оборотах лопасть может оторваться.'],
  ['🔄', 'Пропеллеры стоят по направлению вращения', 'Перепутал направление - дрон перевернётся сразу при взлёте.'],
  ['📡', 'Антенны видео и приёмника на месте', 'Без антенны видеопередатчик может сгореть, а связь с пультом пропасть.'],
  ['🎮', 'Пульт включён первым, тумблеры в исходном положении', 'Сначала пульт, потом дрон. Тумблер ARM выключен, газ внизу.'],
  ['🥽', 'Очки включены, канал не занят другими', 'Твой канал не должен совпадать с чужим, иначе собьёшь видео другому пилоту.'],
  ['👀', 'Площадка свободна, наблюдатель рядом', 'Людей в зоне полёта нет. Наблюдатель следит за дроном, пока ты в очках.'],
  ['🛟', 'Failsafe проверен', 'Failsafe - что делает дрон, если пропала связь с пультом. Проверка без пропеллеров: заармь, выключи пульт - моторы должны остановиться.']
];
let CS = []; try { CS = JSON.parse(ses.get('vzlet_ck') || '[]'); } catch (e) {}
const preOk = () => ses.get('vzlet_pre_ok') === '1';
let ckOrder = CK.map((_, i) => i);
function renderPre() {
  const el = $('tgPre'); if (!el) return;
  const n = CS.length, all = n === CK.length;
  el.innerHTML = `<div class="tgh"><h3>✅ Предполётная проверка</h3><span class="tgc">${n}/${CK.length}</span></div>
    <div class="memo">⚠️ <b>Будь внимателен и запомни:</b> эту проверку пилот делает перед <u>каждым</u> полётом. Нажимай на пункт, только когда проверил его по-настоящему. Читай, зачем он нужен.</div>
    <div class="ckbar"><i style="width:${n / CK.length * 100}%"></i></div>
    <div class="tck">${ckOrder.map(i => { const c = CK[i], on = CS.includes(i); return `<button class="${on ? 'on' : ''}" data-i="${i}"><i>${on ? '✓' : ''}</i><span class="ce">${c[0]}</span><span class="ct"><b>${E(c[1])}</b><small>${E(c[2])}</small></span></button>`; }).join('')}</div>
    <div class="tgrow"><button class="btn" id="ckReset">↺ Сбросить</button>${all ? '<span class="ready">🛫 Готов к взлёту! Тренировки открыты.</span>' : `<span class="muted">Осталось ${CK.length - n} - и откроются тренировки.</span>`}</div>
    <div class="stamp ${all ? 'on' : ''}">ГОТОВ К ВЗЛЁТУ</div>`;
  el.querySelectorAll('.tck button').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, k = CS.indexOf(i);
    k < 0 ? CS.push(i) : CS.splice(k, 1); ses.set('vzlet_ck', JSON.stringify(CS));
    snd(k < 0 ? 'tap' : 'bad');
    const was = preOk(), now = CS.length === CK.length;
    if (now && !was) { ses.set('vzlet_pre_ok', '1'); snd('win'); buzz([40, 40, 80]); const t = tg(); t.pre = (t.pre || 0) + 1; const a = AC(); if (a) { a.save(); a.award('preflight'); a.renderXP(); } }
    if (!now) ses.set('vzlet_pre_ok', '');
    renderPre(); lockUpd();
  });
  $('ckReset').onclick = () => { CS = []; ses.set('vzlet_ck', '[]'); ses.set('vzlet_pre_ok', ''); ckOrder = shuffle(ckOrder); renderPre(); lockUpd(); };
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function lockUpd() {
  const w = $('tgWrap'); if (!w) return;
  const lock = !preOk() && !isCoach();
  w.classList.toggle('locked', lock);
  w.querySelectorAll('.tglock').forEach(x => x.hidden = !lock);
  if (!lock && window.ACAD && typeof window.ACAD.trSize === 'function') setTimeout(() => window.ACAD.trSize(), 60);
}

/* =====================================================================
   3. СОБЕРИ ДРОН
   ===================================================================== */
const PARTS = {
  motor: { s: 'Мотор', n: 'Мотор', k: 4, i: 'Бесколлекторный мотор крутит пропеллер. У квадрокоптера их 4, на концах лучей рамы.', h: 'Моторы стоят на концах лучей рамы.' },
  esc: { s: 'ESC', n: 'Регулятор ESC 4в1', k: 1, i: 'Получает команды от полётного контроллера и управляет оборотами всех четырёх моторов. В стеке он снизу.', h: 'Регулятор стоит в центре, в самом низу стека.' },
  fc: { s: 'FC (мозг)', n: 'Полётный контроллер', k: 1, i: 'Мозг дрона. Гироскоп чувствует наклоны, и контроллер тысячи раз в секунду поправляет обороты моторов. Ставится в стек над регулятором.', h: 'Контроллер - в центре, над регулятором.' },
  cam: { s: 'Камера', n: 'FPV-камера', k: 1, i: 'Смотрит вперёд по ходу полёта. Картинка идёт в видеопередатчик.', h: 'Камера смотрит вперёд, по ходу полёта.' },
  vtx: { s: 'VTX', n: 'Видеопередатчик VTX', k: 1, i: 'Отправляет картинку с камеры в очки пилота на частоте 5,8 ГГц.', h: 'Видеопередатчик - за стеком, ближе к хвосту.' },
  rx: { s: 'Приёмник', n: 'Приёмник', k: 1, i: 'Принимает команды с пульта, например ELRS 2,4 ГГц, и передаёт их контроллеру.', h: 'Приёмник - сзади, у самого хвоста.' },
  ant: { s: 'Антенна', n: 'Антенна видео', k: 1, i: 'Без антенны видеопередатчик может сгореть! Питание включаем только с антенной. Торчит сзади, подальше от винтов.', h: 'Антенна торчит сзади, подальше от пропеллеров.' },
  pcw: { s: 'Проп ↻ CW', n: 'Пропеллер ↻ CW', k: 2, i: 'Крутится по часовой стрелке. Ставится на моторы, которые крутятся по часовой.', h: 'Пропеллеры надеваются на моторы.' },
  pccw: { s: 'Проп ↺ CCW', n: 'Пропеллер ↺ CCW', k: 2, i: 'Крутится против часовой стрелки. Ставится на моторы, которые крутятся против часовой.', h: 'Пропеллеры надеваются на моторы.' },
  bat: { s: 'АКБ', n: 'Аккумулятор', k: 1, i: 'Ставится последним, прямо перед полётом, и крепится ремешком сверху рамы.', h: 'Аккумулятор - сверху по центру, его ставят последним.' }
};
/* схема "пропеллеры внутрь" (как по умолчанию в Betaflight): передний левый и задний правый - по часовой */
const CORN = { FL: [95, 95, 'pcw'], FR: [305, 95, 'pccw'], RL: [95, 305, 'pccw'], RR: [305, 305, 'pcw'] };
const ZONES = { cam: [200, 112], vtx: [200, 268], rx: [200, 305], ant: [200, 345] };
let B = null;
function bReset() { B = { m: {}, p: {}, esc: 0, fc: 0, cam: 0, vtx: 0, rx: 0, ant: 0, bat: 0, used: {}, t0: 0, miss: 0, done: false, sel: null, hint: 0 }; }
bReset();
const left = k => PARTS[k].k - (B.used[k] || 0);
const allButBat = () => Object.keys(CORN).every(c => B.m[c] && B.p[c]) && B.esc && B.fc && B.cam && B.vtx && B.rx && B.ant;

function partSVG(k, x, y, extra) {
  extra = extra || '';
  switch (k) {
    case 'motor': return `<g transform="translate(${x} ${y})" ${extra}><circle r="24" fill="url(#gMot)" stroke="#9fb3c8" stroke-width="2"/><circle r="15" fill="#1b2633" stroke="#5c7186"/>${[0, 90, 180, 270].map(a => `<circle cx="${Math.cos(a * Math.PI / 180) * 9}" cy="${Math.sin(a * Math.PI / 180) * 9}" r="2" fill="#c9d1d9"/>`).join('')}<circle r="4" fill="#e6edf3"/></g>`;
    case 'esc': return `<g transform="translate(${x} ${y})" ${extra}><rect x="-36" y="-36" width="72" height="72" rx="6" fill="#0f5132" stroke="#3fb950" stroke-width="2"/>${[-20, 0, 20].map(a => `<rect x="${a - 6}" y="-26" width="12" height="9" fill="#111"/><rect x="${a - 6}" y="17" width="12" height="9" fill="#111"/>`).join('')}<text y="5" text-anchor="middle" font-size="11" font-weight="800" fill="#b7f0c3">ESC</text></g>`;
    case 'fc': return `<g transform="translate(${x} ${y})" ${extra}><rect x="-28" y="-28" width="56" height="56" rx="5" fill="#0b2a4a" stroke="#00d4ff" stroke-width="2"/><rect x="-10" y="-10" width="20" height="20" fill="#111" stroke="#334"/><circle cx="18" cy="-18" r="3" fill="#3fb950"/><circle cx="18" cy="-9" r="3" fill="#f85149"/><text y="22" text-anchor="middle" font-size="9" font-weight="800" fill="#9fe8ff">FC</text></g>`;
    case 'cam': return `<g transform="translate(${x} ${y})" ${extra}><rect x="-17" y="-14" width="34" height="28" rx="6" fill="#20262e" stroke="#8b949e" stroke-width="2"/><circle cy="-2" r="9" fill="#0d1117" stroke="#a371f7" stroke-width="3"/><circle cx="-3" cy="-5" r="2.5" fill="#fff" opacity=".7"/></g>`;
    case 'vtx': return `<g transform="translate(${x} ${y})" ${extra}><rect x="-20" y="-12" width="40" height="24" rx="4" fill="#3b1f5c" stroke="#a371f7" stroke-width="2"/>${[-12, -6, 0, 6, 12].map(a => `<line x1="${a}" y1="-8" x2="${a}" y2="8" stroke="#d2a8ff" stroke-width="1.5"/>`).join('')}</g>`;
    case 'rx': return `<g transform="translate(${x} ${y})" ${extra}><rect x="-13" y="-9" width="26" height="18" rx="3" fill="#5c3b0b" stroke="#d29922" stroke-width="2"/><path d="M-8 9 q-6 14 -14 18 M8 9 q6 14 14 18" stroke="#e3b341" stroke-width="2" fill="none"/></g>`;
    case 'ant': return `<g transform="translate(${x} ${y})" ${extra}><line y1="-18" y2="6" stroke="#8b949e" stroke-width="4"/><ellipse cy="10" rx="13" ry="10" fill="#f85149" stroke="#ffb3ad" stroke-width="2"/></g>`;
    case 'pcw': case 'pccw': {
      const col = k === 'pcw' ? '#58a6ff' : '#ff9f43', s = k === 'pcw' ? 1 : -1;
      return `<g transform="translate(${x} ${y})" ${extra}><g class="prop ${k}"><circle r="46" fill="none"/>${[0, 120, 240].map(a => `<path transform="rotate(${a})" d="M0 0 C ${8 * s} -14, ${10 * s} -34, ${2 * s} -44 C ${-6 * s} -36, ${-6 * s} -14, 0 0 Z" fill="${col}" fill-opacity=".78" stroke="${col}"/>`).join('')}<circle r="6" fill="#0d1117" stroke="${col}" stroke-width="2"/></g></g>`;
    }
    case 'bat': return `<g transform="translate(${x} ${y})" ${extra}><rect x="-38" y="-62" width="76" height="124" rx="10" fill="url(#gBat)" stroke="#e3b341" stroke-width="2"/><rect x="-44" y="-8" width="88" height="14" rx="3" fill="#1f2937" stroke="#6e7681"/><text y="-28" text-anchor="middle" font-size="13" font-weight="900" fill="#1b1200">4S</text><text y="30" text-anchor="middle" font-size="10" font-weight="800" fill="#1b1200">1500 мАч</text></g>`;
  }
  return '';
}
const VB = { motor: "-28 -28 56 56", esc: "-40 -40 80 80", fc: "-32 -32 64 64", cam: "-22 -22 44 44", vtx: "-24 -24 48 48", rx: "-26 -16 52 48", ant: "-20 -22 40 44", pcw: "-48 -48 96 96", pccw: "-48 -48 96 96", bat: "-50 -66 100 132" };
function trayIcon(k) { return `<svg viewBox="${VB[k]}" width="46" height="46" aria-hidden="true">${partSVG(k, 0, 0)}</svg>`; }

function bSVG() {
  const rot = c => CORN[c][2] === 'pcw';
  let s = `<svg viewBox="0 0 400 400" id="bSvg" class="${B.done ? 'fly' : ''}" role="img" aria-label="Рама дрона: перетащи детали на места">
  <defs><radialGradient id="gMot" cx="40%" cy="35%"><stop offset="0" stop-color="#e6edf3"/><stop offset=".55" stop-color="#6e7f91"/><stop offset="1" stop-color="#2d3946"/></radialGradient>
  <linearGradient id="gBat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd76a"/><stop offset="1" stop-color="#ff9f1c"/></linearGradient>
  <linearGradient id="gCarb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b3138"/><stop offset=".5" stop-color="#171b20"/><stop offset="1" stop-color="#2b3138"/></linearGradient>
  <pattern id="pCarb" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#1a1f25"/><rect width="4" height="8" fill="#232a31"/></pattern></defs>
  <text x="200" y="22" text-anchor="middle" class="bfront">▲ ПЕРЕД</text>
  <g class="drone"><ellipse cx="200" cy="215" rx="150" ry="150" class="shadow"/>
  <g class="frame"><path d="M95 95 L305 305 M305 95 L95 305" stroke="url(#pCarb)" stroke-width="26" stroke-linecap="round"/>
  <path d="M95 95 L305 305 M305 95 L95 305" stroke="#3a434d" stroke-width="26" stroke-linecap="round" fill="none" opacity=".35"/>
  <rect x="150" y="96" width="100" height="222" rx="22" fill="url(#pCarb)" stroke="#444c56" stroke-width="2"/>
  ${[[160, 110], [240, 110], [160, 304], [240, 304]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#8b949e"/>`).join('')}</g>`;
  /* пустые места */
  Object.entries(CORN).forEach(([c, [x, y]]) => { if (!B.m[c]) s += `<circle cx="${x}" cy="${y}" r="26" class="slot" data-z="${c}"/>`; });
  if (!B.esc) s += `<rect x="164" y="154" width="72" height="72" rx="8" class="slot"/>`;
  else if (!B.fc) s += `<rect x="172" y="162" width="56" height="56" rx="6" class="slot"/>`;
  Object.entries(ZONES).forEach(([z, [x, y]]) => { if (!B[z]) s += z === 'ant' ? `<circle cx="${x}" cy="${y}" r="14" class="slot"/>` : `<rect x="${x - 21}" y="${y - 14}" width="42" height="28" rx="6" class="slot"/>`; });
  if (B.hint) { s += `<g class="hintl">${Object.entries(CORN).map(([c, [x, y]]) => `<text x="${x}" y="${y + 44}">мотор</text>`).join('')}<text x="200" y="146">ESC, потом FC</text><text x="200" y="${ZONES.cam[1] - 18}">камера</text><text x="248" y="${ZONES.vtx[1] + 4}" text-anchor="start">VTX</text><text x="248" y="${ZONES.rx[1] + 4}" text-anchor="start">приёмник</text><text x="248" y="${ZONES.ant[1] + 4}" text-anchor="start">антенна</text></g>`; }
  /* детали */
  if (B.esc) s += partSVG('esc', 200, 190, 'class="pin"');
  if (B.fc) s += partSVG('fc', 200, 190, 'class="pin"');
  ['cam', 'vtx', 'rx', 'ant'].forEach(z => { if (B[z]) s += partSVG(z, ZONES[z][0], ZONES[z][1], 'class="pin"'); });
  Object.entries(CORN).forEach(([c, [x, y]]) => {
    if (B.m[c]) {
      s += partSVG('motor', x, y, 'class="pin"');
      if (!B.p[c]) s += `<path d="${rot(c) ? `M${x - 30} ${y - 12} A32 32 0 0 1 ${x + 12} ${y - 30}` : `M${x + 30} ${y - 12} A32 32 0 0 0 ${x - 12} ${y - 30}`}" class="rarr ${rot(c) ? 'cw' : 'ccw'}" marker-end="url(#none)"/><text x="${x}" y="${y + 46}" class="rlab ${rot(c) ? 'cw' : 'ccw'}">${rot(c) ? '↻ по часовой' : '↺ против'}</text>`;
    }
    if (B.p[c]) s += partSVG(B.p[c], x, y, 'class="pin"');
  });
  if (B.bat) s += partSVG('bat', 200, 205, 'class="pin"');
  s += `</g></svg>`;
  return s;
}
function renderBuild() {
  const el = $('tgBuild'); if (!el) return;
  const best = tg().build;
  const t = B.t0 && !B.done ? Math.round((Date.now() - B.t0) / 1000) : B.dt || 0;
  el.innerHTML = `<div class="tgh"><h3>🔧 Собери дрон</h3><span class="tgc">${best ? '🏆 ' + fx(best, 0) + ' с' : ''}</span></div>
    <p class="muted">Перетащи детали на раму (или нажми на деталь, потом на место). Перед - сверху. Ошибся - подскажу, что не так.</p>
    <div class="bst"><span>⏱ <b id="bT">${t}</b> с</span><span>❌ <b>${B.miss}</b></span><span>🧩 <b>${Object.keys(PARTS).reduce((a, k) => a + (B.used[k] || 0), 0)}</b>/${Object.values(PARTS).reduce((a, p) => a + p.k, 0)}</span><button class="btn" id="bHint">💡 Подсказка</button><button class="btn" id="bNew">↻ Заново</button></div>
    <div class="bw"><div class="bsv" id="bSv">${bSVG()}</div><div class="bside"><div class="tray" id="bTray">${Object.keys(PARTS).map(k => { const l = left(k); return `<button class="tp ${l ? '' : 'gone'} ${B.sel === k ? 'sel' : ''}" data-k="${k}" ${l ? '' : 'disabled'}>${trayIcon(k)}<span>${E(PARTS[k].s)}</span>${PARTS[k].k > 1 ? `<em>×${l}</em>` : ''}</button>`; }).join('')}</div><div class="binfo" id="bInfo">${B.done ? '' : '<b>Начни с моторов.</b> Нажми на деталь, чтобы узнать, что она делает.'}</div></div></div>`;
  if (B.done) bWin(true);
  bBind();
}
function info(html, cls) { const el = $('bInfo'); if (!el) return; el.className = 'binfo ' + (cls || ''); el.innerHTML = html; if (!RED) { el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; } }
function bBind() {
  const tray = $('bTray'), svg = $('bSvg');
  $('bNew').onclick = () => { bReset(); renderBuild(); };
  $('bHint').onclick = () => { B.hint = 1; B.miss++; renderBuild(); info('💡 Подписи мест видны 3 секунды. За подсказку +1 ошибка.'); setTimeout(() => { B.hint = 0; if (!B.done) { const keep = $('bInfo') && $('bInfo').innerHTML; renderBuild(); if (keep) info(keep); } }, 3000); };
  tray.querySelectorAll('.tp').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => {
      if (b.disabled || B.done) return;
      e.preventDefault(); bView();
      const sx = e.clientX, sy = e.clientY; let g = null, moved = false;
      const mv = ev => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
        if (!moved) { moved = true; g = document.createElement('div'); g.className = 'bghost'; g.innerHTML = trayIcon(k); document.body.appendChild(g); }
        g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px';
      };
      const up = ev => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        if (!moved) { B.sel = k; tray.querySelectorAll('.tp').forEach(x => x.classList.toggle('sel', x.dataset.k === B.sel)); info(`<b>${E(PARTS[k].n)}</b><br>${E(PARTS[k].i)}${B.sel ? '<br><small>Теперь нажми на место на раме.</small>' : ''}`); snd('tap'); return; }
        const ok = drop(k, ev.clientX, ev.clientY);
        if (g) { if (ok) g.remove(); else { g.classList.add('back'); const r = b.getBoundingClientRect(); g.style.left = (r.left + r.width / 2) + 'px'; g.style.top = (r.top + r.height / 2) + 'px'; setTimeout(() => g.remove(), 380); } }
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  });
  svg.addEventListener('click', e => { if (!B.sel || B.done) return; drop(B.sel, e.clientX, e.clientY); });
}
function bView() {
  const s = $('bSv'); if (!s) return;
  const n = document.getElementById('vt'), top = Math.max(0, n ? n.getBoundingClientRect().bottom : 0) + 8, r = s.getBoundingClientRect();
  if (r.top < top - 4 || r.bottom > innerHeight) window.scrollBy({ top: r.top - top, behavior: RED ? 'auto' : 'smooth' });
}
function svgPt(cx, cy) { const svg = $('bSvg'); if (!svg) return null; const p = svg.createSVGPoint(); p.x = cx; p.y = cy; const m = svg.getScreenCTM(); if (!m) return null; return p.matrixTransform(m.inverse()); }
function zoneAt(x, y) {
  let best = null, bd = 1e9;
  const test = (z, zx, zy, r) => { const d = Math.hypot(x - zx, y - zy); if (d < r && d < bd) { bd = d; best = z; } };
  Object.entries(CORN).forEach(([c, [zx, zy]]) => test(c, zx, zy, 52));
  test('center', 200, 195, 62);
  Object.entries(ZONES).forEach(([z, [zx, zy]]) => test(z, zx, zy, z === 'cam' ? 34 : 22));
  return best;
}
function drop(k, cx, cy) {
  const p = svgPt(cx, cy); if (!p) return false;
  const z = zoneAt(p.x, p.y);
  if (!z) { return false; }
  if (!B.t0) B.t0 = Date.now();
  let err = '';
  if (CORN[z]) {
    if (k === 'motor') { if (B.m[z]) err = 'Здесь мотор уже стоит.'; else B.m[z] = 1; }
    else if (k === 'pcw' || k === 'pccw') {
      if (!B.m[z]) err = 'Сначала поставь сюда мотор: пропеллер надевается на мотор.';
      else if (B.p[z]) err = 'Пропеллер здесь уже стоит.';
      else if (CORN[z][2] !== k) err = `Не тот пропеллер! Этот мотор крутится ${CORN[z][2] === 'pcw' ? 'по часовой ↻ - нужен CW' : 'против часовой ↺ - нужен CCW'}. Перепутаешь - дрон перевернётся при взлёте.`;
      else B.p[z] = k;
    } else err = 'На концах лучей стоят моторы и пропеллеры. ' + PARTS[k].h;
  } else if (z === 'center') {
    if (k === 'esc') { if (B.esc) err = 'Регулятор уже стоит.'; else B.esc = 1; }
    else if (k === 'fc') { if (!B.esc) err = 'Сначала регулятор ESC: в стеке он снизу, контроллер - над ним.'; else if (B.fc) err = 'Контроллер уже стоит.'; else B.fc = 1; }
    else if (k === 'bat') { if (!allButBat()) err = 'Аккумулятор ставим последним, когда всё остальное собрано и проверено.'; else B.bat = 1; }
    else err = 'В центре собирается стек: снизу регулятор, сверху контроллер. ' + PARTS[k].h;
  } else {
    if (k === z) { if (B[z]) err = 'Уже стоит.'; else B[z] = 1; }
    else err = 'Не сюда. ' + PARTS[k].h;
  }
  if (err) { B.miss++; snd('bad'); buzz(60); info('❌ ' + E(err), 'bad'); const s = $('bSvg'); if (s && !RED) { s.classList.remove('shake'); s.offsetWidth; s.classList.add('shake'); } const m = document.querySelector('.bst b:nth-of-type(1)'); renderStats(); return false; }
  B.used[k] = (B.used[k] || 0) + 1; if (B.sel && !left(B.sel)) B.sel = null;
  snd('ok'); buzz(15);
  const done = Object.keys(PARTS).every(q => !left(q));
  if (done) { B.done = true; B.dt = Math.round((Date.now() - B.t0) / 10) / 100; }
  const keepInfo = `✅ <b>${E(PARTS[k].n)}</b><br>${E(PARTS[k].i)}`;
  renderBuild(); if (!done) info(keepInfo, 'ok');
  return true;
}
function renderStats() { const el = document.querySelectorAll('.bst b'); if (el[1]) el[1].textContent = B.miss; }
function bWin(silent) {
  const t = B.dt, prev = tg().build;
  if (!silent) {
    if (!prev || t < prev) tg().build = t;
    const a = AC(); if (a) { a.save(); a.award('build'); if (t <= 60 && B.miss <= 2) a.award('build60'); a.renderXP(); }
    snd('win'); buzz([30, 30, 30, 30, 120]);
  }
  info(`🎉 <b>Дрон собран за ${fx(t, 1)} с</b>, ошибок: ${B.miss}.${prev && t < prev && !silent ? ' Новый рекорд!' : ''}<br>Порядок как в жизни: моторы, стек (ESC + FC), камера, видео, приёмник, антенна, пропеллеры по направлению и аккумулятор последним.`, 'win');
}
setInterval(() => { if (!B || !B.t0 || B.done) return; const el = $('bT'); if (el) el.textContent = Math.round((Date.now() - B.t0) / 1000); }, 500);
/* победа - после отрисовки, чтобы анимация взлёта сработала */
const _rb = renderBuild;

/* =====================================================================
   4. АККУМУЛЯТОРЫ: собери пачку + подбери аккумулятор
   ===================================================================== */
const AK = { s: 4, hv: false, ch: 85 };
const TYPES = { lipo: { n: 'LiPo', full: 4.2, nom: 3.7, stor: 3.8 }, hv: { n: 'LiHV', full: 4.35, nom: 3.8, stor: 3.85 } };
const conn = s => s === 1 ? 'PH2.0 / BT2.0' : s <= 3 ? 'XT30' : 'XT60';
function cellV() { const T = AK.hv ? TYPES.hv : TYPES.lipo; return 3.3 + (T.full - 3.3) * AK.ch / 100; }
function zone(v) { const T = AK.hv ? TYPES.hv : TYPES.lipo; if (v >= T.full - .05) return ['full', 'Полный заряд', 'Можно летать.']; if (v >= 3.95) return ['ok', 'Хорошо заряжен', 'Можно летать.']; if (v >= 3.75) return ['stor', 'Напряжение хранения', `Так хранят, если не летают несколько дней (около ${fx(T.stor, 2)} В на банку).`]; if (v >= 3.5) return ['low', 'Почти пустой', 'Пора садиться и заряжать.']; return ['bad', 'Опасно разряжен!', 'Ниже 3,5 В под нагрузкой аккумулятор портится и может вздуться.']; }
function renderAkb() {
  const el = $('tgAkb'); if (!el) return;
  const T = AK.hv ? TYPES.hv : TYPES.lipo, v = cellV(), z = zone(v), best = tg().akb;
  el.innerHTML = `<div class="tgh"><h3>🔋 Аккумуляторы</h3><span class="tgc">${best != null ? '🏆 ' + best + '/8' : ''}</span></div>
    <p class="muted">Собери пачку и посмотри, как меняется напряжение. Потом проверь себя: подбери аккумулятор под дрон.</p>
    <div class="akrow"><span class="lbl">Банок (S):</span>${[1, 2, 3, 4, 5, 6].map(n => `<button class="chip ${n === AK.s ? 'on' : ''}" data-s="${n}">${n}S</button>`).join('')}</div>
    <div class="akrow"><span class="lbl">Тип:</span><button class="chip ${!AK.hv ? 'on' : ''}" data-hv="0">LiPo</button><button class="chip ${AK.hv ? 'on' : ''}" data-hv="1">LiHV</button></div>
    <div class="akrow"><span class="lbl">Заряд:</span><input type="range" id="akCh" min="0" max="100" value="${AK.ch}"><b>${AK.ch}%</b></div>
    <div class="pack z-${z[0]}">${Array.from({ length: AK.s }, (_, i) => `<div class="cell" style="--f:${Math.max(4, AK.ch)}%;animation-delay:${i * 50}ms"><i></i><span>${fx(v, 2)}</span></div>`).join('')}<div class="plug">${E(conn(AK.s))}</div></div>
    <div class="aksum"><div><b>${fx(v * AK.s, 1)} В</b><small>сейчас вся пачка</small></div><div><b>${fx(v, 2)} В</b><small>на одну банку</small></div><div><b class="zt">${E(z[1])}</b><small>${E(z[2])}</small></div></div>
    <div class="akfacts"><span>${AK.s}S ${T.n}: банки соединены последовательно, напряжения складываются.</span><span>Номинал ${fx(T.nom * AK.s, 1)} В · полный ${fx(T.full * AK.s, 1)} В · хранение ≈ ${fx(T.stor * AK.s, 1)} В</span><span>${AK.hv ? 'LiHV заряжают до 4,35 В на банку, и в нём чуть больше энергии. Ставь на зарядке режим LiHV!' : 'LiPo заряжают до 4,2 В на банку. Если поставить режим LiHV, аккумулятор перезарядится - это опасно.'}</span></div>
    <div class="tgrow"><button class="btn primary" id="akGo">🎯 Подбери аккумулятор: 8 вопросов</button></div>
    <div id="akQ"></div>`;
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { AK.s = +b.dataset.s; snd('tap'); renderAkb(); });
  el.querySelectorAll('[data-hv]').forEach(b => b.onclick = () => { AK.hv = b.dataset.hv === '1'; snd('tap'); renderAkb(); });
  const r = $('akCh'); r.oninput = () => { AK.ch = +r.value; const vv = cellV(), zz = zone(vv); el.querySelectorAll('.cell').forEach(c => { c.style.setProperty('--f', Math.max(4, AK.ch) + '%'); c.querySelector('span').textContent = fx(vv, 2); }); const P = el.querySelector('.pack'); P.className = 'pack z-' + zz[0]; const S = el.querySelectorAll('.aksum b'); S[0].textContent = fx(vv * AK.s, 1) + ' В'; S[1].textContent = fx(vv, 2) + ' В'; S[2].textContent = zz[1]; el.querySelectorAll('.aksum small')[2].textContent = zz[2]; r.nextElementSibling.textContent = AK.ch + '%'; };
  $('akGo').onclick = () => akStart();
}
const AKQ = [
  ['Маленький вупп 75 мм для полётов в зале, моторы рассчитаны на 1S.', ['1S 450 мАч LiHV, разъём BT2.0', '4S 1500 мАч, разъём XT60', '6S 1100 мАч, разъём XT60'], 0, 'Вупп весит 20-30 граммов: ему нужна лёгкая банка 1S. Тяжёлая пачка 4-6S его просто не поднимет и сожжёт моторы.'],
  ['5-дюймовый фристайл, моторы 1950KV (под 6S).', ['6S 1100 мАч 120C, XT60', '4S 450 мАч, XT30', '1S 300 мАч, PH2.0'], 0, 'Моторы с небольшим KV рассчитаны на высокое напряжение 6S. На 4S такой дрон будет вялым.'],
  ['5-дюймовый гоночный, моторы 2650KV (под 4S).', ['4S 1500 мАч 100C, XT60', '6S 1500 мАч, XT60', '2S 450 мАч, XT30'], 0, 'Высокий KV - это под 4S. Если дать 6S, моторы раскрутятся слишком сильно и перегреются.'],
  ['3-дюймовый синевуп под 4S, весь дрон с аккумулятором до 250 г.', ['4S 650 мАч, XT30', '4S 1800 мАч, XT60', '1S 550 мАч, BT2.0'], 0, 'Нужен 4S, но лёгкий: 650 мАч. Пачка 1800 мАч слишком тяжёлая для маленького дрона.'],
  ['Аккумулятор 4S 1500 мАч. Какой ток поставить на зарядке, если заряжаем 1C?', ['1,5 А', '15 А', '0,15 А'], 0, '1C = ёмкость в амперах: 1500 мАч = 1,5 А. Это безопасный ток для большинства LiPo.'],
  ['Пачка 6S в покое показывает 21,6 В. Что это значит?', ['3,6 В на банку - почти пустая, надо заряжать', 'Полностью заряжена', 'Напряжение хранения'], 0, '21,6 ÷ 6 = 3,6 В на банку. Полная была бы 25,2 В, хранение - около 22,8 В.'],
  ['Банка LiHV показывает 4,35 В. Это…', ['полный заряд LiHV', 'перезаряд, опасно', 'почти разряжена'], 0, 'LiHV заряжают до 4,35 В. А вот обычный LiPo выше 4,2 В заряжать нельзя.'],
  ['Не будешь летать неделю. Что сделать с аккумуляторами 4S?', ['Довести до хранения ≈ 15,2 В (3,8 В на банку)', 'Зарядить до полного 16,8 В', 'Разрядить в ноль'], 0, 'При 3,8 В на банку LiPo хранится дольше всего. Полный или пустой аккумулятор от хранения портится.'],
  ['Аккумулятор вздулся. Что делать?', ['Больше не использовать, разрядить и сдать на утилизацию', 'Проколоть, чтобы вышел воздух', 'Летать, пока работает'], 0, 'Вздутие - химия внутри разрушается. Такой аккумулятор может загореться. Прокалывать нельзя!'],
  ['У двух пачек 6S разная ёмкость: 1100 и 1500 мАч. Чем они отличаются?', ['1500 - летает дольше, но тяжелее', '1500 - выше напряжение', 'Ничем'], 0, 'Напряжение одинаковое (6S). Ёмкость больше - запас энергии больше, но и вес тоже.'],
  ['Полный аккумулятор 3S. Сколько вольт?', ['12,6 В', '11,1 В', '14,8 В'], 0, '3 × 4,2 = 12,6 В. А 11,1 В - это номинал (3 × 3,7).'],
  ['Почему для 6S берут моторы с меньшим KV?', ['Напряжение выше, и меньший KV даёт те же обороты', 'Так дешевле', 'Чтобы было громче'], 0, 'KV - обороты на 1 вольт. 1950 × 25,2 В ≈ 49 000, а 2650 × 16,8 В ≈ 44 500 об/мин: обороты похожи.'],
  ['Что значит надпись 100C на аккумуляторе?', ['Какой большой ток он может отдавать', 'Температура зарядки', 'Число банок'], 0, 'C - токоотдача. Для гонок нужна высокая, чтобы напряжение не проседало на полном газу.'],
  ['Какой разъём обычно стоит на пачке 6S для 5-дюймового дрона?', ['XT60', 'PH2.0', 'USB'], 0, 'XT60 держит большие токи. Маленькие разъёмы PH2.0 и BT2.0 - для вуппов на 1S.']
];
let AQ = null;
function akStart() { const pick = shuffle(AKQ.map((_, i) => i)).slice(0, 8); AQ = { list: pick, i: 0, ok: 0 }; akQ(); const q = $('akQ'); if (q) q.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'center' }); }
function akQ() {
  const el = $('akQ'); if (!el || !AQ) return;
  if (AQ.i >= AQ.list.length) {
    const s = AQ.ok, prev = tg().akb; if (prev == null || s > prev) tg().akb = s;
    const a = AC(); if (a) { a.save(); if (s >= 7) a.award('akb'); a.renderXP(); }
    if (s >= 7) snd('win');
    el.innerHTML = `<div class="akend"><b>${s}/8</b><p>${s === 8 ? 'Идеально! Ты разбираешься в аккумуляторах.' : s >= 6 ? 'Хорошо! Ещё чуть-чуть до идеала.' : 'Поиграй с пачкой выше и попробуй снова.'}</p><button class="btn" id="akAgain">↻ Ещё раз</button></div>`;
    $('akAgain').onclick = akStart; return;
  }
  const q = AKQ[AQ.list[AQ.i]], ord = shuffle(q[1].map((_, i) => i));
  el.innerHTML = `<div class="akq"><div class="akt"><span>Вопрос ${AQ.i + 1} из 8</span><span>✔ ${AQ.ok}</span></div><p>${E(q[0])}</p>
    <div class="ako">${ord.map(i => `<button data-i="${i}">🔋 ${E(q[1][i])}</button>`).join('')}</div><div class="akx" id="akX"></div></div>`;
  el.querySelectorAll('.ako button').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, ok = i === q[2];
    el.querySelectorAll('.ako button').forEach(x => { x.disabled = true; if (+x.dataset.i === q[2]) x.classList.add('ok'); });
    if (!ok) b.classList.add('no'); else AQ.ok++;
    snd(ok ? 'ok' : 'bad'); buzz(ok ? 15 : 60);
    $('akX').innerHTML = `<b>${ok ? '✅ Верно!' : '❌ Не совсем.'}</b> ${E(q[3])}<div><button class="btn primary" id="akNext">Дальше →</button></div>`;
    $('akNext').onclick = () => { AQ.i++; akQ(); };
  });
}

/* =====================================================================
   5. КАЛЬКУЛЯТОРЫ: "Почему так"
   ===================================================================== */
const val = id => parseFloat(($(id) || {}).value) || 0;
const WHY = {
  time: () => { const c = val('c1a'), a = val('c1b') || 1, m = c / 1000 * .8 / a * 60; return ['⏱ Время полёта', `<p>Ёмкость в мАч говорит, сколько тока аккумулятор отдаст за час. <b>${fx(c, 0)} мАч = ${fx(c / 1000, 2)} А·ч</b>: например, ${fx(c / 1000, 2)} А целый час.</p>
      <p>Дрон в среднем берёт <b>${fx(a, 1)} А</b>. Значит, время = ёмкость ÷ ток.</p>
      <div class="fm">${fx(c / 1000, 2)} А·ч × 0,8 ÷ ${fx(a, 1)} А × 60 = <b>${fx(m, 1)} мин</b></div>
      <p><b>Почему 0,8?</b> Мы используем только 80% ёмкости. Если высадить LiPo в ноль, он испортится и может вздуться.</p>
      <p class="mist">⚠️ Частая ошибка: считать по максимальному току. На полном газу 5-дюймовый дрон берёт 80-120 А, а в среднем 20-30 А - поэтому и летает 3-5 минут.</p>`]; },
  lipo: () => { const S = val('c2a'), hv = ($('c2t') || {}).value === 'LiHV', T = hv ? TYPES.hv : TYPES.lipo; return ['🔋 Напряжение пачки', `<p>Аккумулятор состоит из банок. У каждой банки своё напряжение: ${T.n} номинал <b>${fx(T.nom, 2)} В</b>, полный заряд <b>${fx(T.full, 2)} В</b>.</p>
      <p>"${S}S" значит ${S} ${S === 1 ? "банка" : S < 5 ? "банки" : "банок"} <b>последовательно</b>, как батарейки в фонарике: напряжения складываются.</p>
      <div class="fm">${S} × ${fx(T.nom, 2)} В = <b>${fx(S * T.nom, 1)} В</b> номинал · ${S} × ${fx(T.full, 2)} В = <b>${fx(S * T.full, 1)} В</b> полный</div>
      <p><b>LiPo и LiHV.</b> LiHV можно заряжать до 4,35 В на банку - в нём чуть больше энергии. Обычный LiPo выше 4,2 В заряжать нельзя.</p>
      <p class="mist">⚠️ Частая ошибка: смотреть на всю пачку, а не на банку. 14,0 В у 4S - это 3,5 В на банку, уже пора садиться.</p>`]; },
  twr: () => { const w = val('c3a') || 1, t = val('c3b'), n = val('c3c'), r = t * n / w; return ['💪 Тяговооружённость', `<p>Это во сколько раз все моторы вместе тянут сильнее, чем весит дрон.</p>
      <div class="fm">${fx(t, 0)} г × ${fx(n, 0)} мотора ÷ ${fx(w, 0)} г = <b>${fx(r, 1)} : 1</b></div>
      <p>Если тяга равна весу (1:1), дрон только висит и не может разогнаться. Запас тяги нужен для манёвров и чтобы выходить из падения.</p>
      <p>2-4 : 1 - спокойные полёты и съёмка · 5-8 : 1 - фристайл · больше 8 : 1 - гонки.</p>
      <p class="mist">⚠️ Частая ошибка: забыть вес аккумулятора и камеры. Считаем вес дрона <b>со всем</b>, что летит.</p>`]; },
  charge: () => { const c = val('c4a'), C = val('c4b'); return ['⚡ Ток зарядки', `<p>"C" при зарядке - это ток в долях ёмкости. 1C = ёмкость, переведённая в амперы.</p>
      <div class="fm">${fx(c, 0)} мАч = ${fx(c / 1000, 2)} А·ч → ${fx(C, 1)}C = <b>${fx(c / 1000 * C, 2)} А</b></div>
      <p>1C заряжает примерно за час и бережёт аккумулятор. Быстрее можно, только если производитель разрешает.</p>
      <p class="mist">⚠️ Частая ошибка: поставить 15 А вместо 1,5 А (перепутать мАч и А). Аккумулятор перегреется и может загореться.</p>`]; },
  rpm: () => { const kv = val('c5a'), S = val('c5b'); return ['🌀 Обороты мотора', `<p>KV - сколько оборотов в минуту мотор делает на каждый вольт, без нагрузки.</p>
      <div class="fm">${fx(kv, 0)} KV × ${S} банки × 4,2 В = <b>${fx(kv * S * 4.2, 0)} об/мин</b></div>
      <p>Поэтому под 6S ставят моторы с меньшим KV (около 1700-1950), а под 4S - с большим (2300-2700): обороты получаются похожие.</p>
      <p class="mist">⚠️ Частая ошибка: поставить пачку 6S на моторы под 4S. Они раскрутятся слишком сильно и перегреются.</p>`]; },
  vtx: () => ['📡 Частоты Raceband', `<p>Видео у каждого пилота идёт на своей частоте. Если частоты рядом, картинки мешают друг другу: появляются полосы и "снег".</p>
      <p>Соседние каналы Raceband отличаются на <b>37 МГц</b>. Чем дальше твой канал от чужих, тем чище картинка.</p>
      <div class="fm">Для 4 пилотов часто берут <b>R1, R2, R7, R8</b> или R1, R3, R6, R8</div>
      <p class="mist">⚠️ Частая ошибка: включить дрон, не спросив, какие каналы заняты. Ты можешь сбить видео пилоту, который сейчас летит.</p>`]
};
function initWhy() {
  document.querySelectorAll('.calc[data-c]').forEach(c => {
    if (c.querySelector('.why')) return;
    const b = document.createElement('button'); b.className = 'btn why'; b.textContent = '❓ Почему так'; b.type = 'button';
    b.onclick = () => { const f = WHY[c.dataset.c]; if (!f) return; const [t, h] = f(); modal(`<h2>${t}</h2><div class="whyb">${h}</div><div class="ebar" style="margin-top:14px"><span class="sp"></span><button class="btn primary" onclick="closePilot()">Понятно</button></div>`); };
    c.appendChild(b);
  });
}

/* =====================================================================
   6. СБОРКА ВКЛАДКИ
   ===================================================================== */
const CSS = `
#t-train{display:grid;gap:16px}#t-train[hidden]{display:none}
.tgh{display:flex;align-items:center;gap:10px;margin-bottom:6px}.tgh h3{font-size:18px;margin:0}.tgc{margin-left:auto;font:800 14px var(--fh);color:var(--accent)}
.tgpre{position:relative;overflow:hidden}
.memo{margin:6px 0 10px;padding:10px 12px;border-radius:12px;background:rgba(210,153,34,.12);border:1px solid rgba(210,153,34,.45);font-size:14px;line-height:1.45}
.tck{display:grid;gap:7px}@media(min-width:861px){.tck{grid-template-columns:1fr 1fr}}
.tck button{display:flex;align-items:flex-start;gap:10px;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.22);color:var(--text);font:600 14px Manrope,system-ui,sans-serif;cursor:pointer;transition:border-color .2s,background .25s}
.tck button i{flex-shrink:0;width:22px;height:22px;margin-top:2px;border-radius:7px;border:2px solid var(--dim);display:grid;place-items:center;font-style:normal;font-size:13px;color:#04121b;transition:.25s cubic-bezier(.3,1.6,.5,1)}
.tck .ce{font-size:20px;line-height:1.2}.tck .ct{display:grid;gap:2px}.tck .ct small{color:var(--dim);font-weight:500;font-size:12.5px;line-height:1.35;max-height:0;overflow:hidden;transition:max-height .4s ease}
.tck button.on{border-color:rgba(63,185,80,.6);background:rgba(63,185,80,.12)}.tck button.on i{background:var(--ok);border-color:var(--ok);transform:rotate(-8deg) scale(1.1)}.tck button.on .ct small{max-height:80px}
.tgrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}.ready{font-weight:800;color:var(--ok)}
.tgpre .stamp{bottom:auto;top:14px;right:70px}
#tgWrap{display:grid;gap:16px;position:relative}
.tgl{position:relative}
.tglock{position:absolute;inset:0;z-index:5;display:grid;place-items:center;text-align:center;padding:20px;border-radius:16px;background:rgba(8,12,18,.72);backdrop-filter:blur(3px)}
.tglock[hidden]{display:none}
.tglock b{display:block;font:800 18px var(--fh);margin-bottom:6px}.tglock .btn{margin-top:10px}
#tgWrap.locked .tgl>.card{filter:grayscale(.7) blur(1.5px);pointer-events:none}
html.fx .tglock{backdrop-filter:none}
.bst{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:6px 0 10px;font-size:14px}.bst b{font-variant-numeric:tabular-nums;color:var(--accent)}.bst .btn{padding:6px 11px;font-size:13px}
.bw{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:14px;align-items:start}@media(max-width:860px){.bw{grid-template-columns:1fr}}
.bsv{border-radius:16px;background:radial-gradient(circle at 50% 45%,#16263a,#0a111b 70%);border:1px solid var(--line);touch-action:none}
#bSvg{display:block;width:100%;height:auto;max-height:62vh;user-select:none}
#bSvg .slot{fill:rgba(0,212,255,.05);stroke:rgba(0,212,255,.55);stroke-width:2;stroke-dasharray:6 5;animation:slotp 1.6s ease-in-out infinite}
@keyframes slotp{50%{stroke:rgba(0,212,255,.95);fill:rgba(0,212,255,.12)}}
#bSvg .bfront{fill:var(--dim);font:800 12px var(--fh);letter-spacing:2px}
#bSvg .shadow{fill:rgba(0,0,0,.28);transform-origin:200px 215px}
#bSvg .pin{animation:pin .45s cubic-bezier(.3,1.6,.5,1)}@keyframes pin{from{opacity:0;transform:scale(1.35)}}
#bSvg .pin{transform-box:fill-box;transform-origin:center}
#bSvg .rarr{fill:none;stroke-width:3;stroke-linecap:round}#bSvg .rarr.cw{stroke:#58a6ff}#bSvg .rarr.ccw{stroke:#ff9f43}
#bSvg .rlab{font:800 11px Manrope,system-ui,sans-serif;text-anchor:middle}#bSvg .rlab.cw{fill:#79c0ff}#bSvg .rlab.ccw{fill:#ffb86b}
#bSvg .hintl text{fill:#ffd166;font:800 12px Manrope,system-ui,sans-serif;text-anchor:middle;paint-order:stroke;stroke:#0a111b;stroke-width:3}
#bSvg.shake{animation:bshake .4s}@keyframes bshake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
#bSvg .prop{transform-box:fill-box;transform-origin:center}
#bSvg.fly .drone{animation:lift 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
#bSvg.fly .shadow{animation:shd 2.6s ease-in-out infinite}
#bSvg.fly .prop.pcw{animation:spin .12s linear infinite}#bSvg.fly .prop.pccw{animation:spin .12s linear infinite reverse}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes lift{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-14px) scale(1.04)}}@keyframes shd{50%{transform:scale(.8);opacity:.5}}
.binfo{min-height:84px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:rgba(0,0,0,.22);font-size:14.5px;line-height:1.5;animation:bin .35s ease}
@keyframes bin{from{opacity:0;transform:translateY(6px)}}
.binfo.ok{border-color:rgba(63,185,80,.55)}.binfo.bad{border-color:rgba(248,81,73,.6);background:rgba(248,81,73,.08)}.binfo.win{border-color:rgba(210,153,34,.7);background:linear-gradient(135deg,rgba(210,153,34,.18),rgba(0,0,0,.2))}
.bside{display:grid;gap:12px;align-content:start}
.tray{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
@media(max-width:860px){.tray{grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.tp{padding:6px 2px 5px;font-size:10.5px}.tp svg{width:34px;height:34px}.tp em{top:2px;right:4px;font-size:10px}}
.tp{position:relative;display:grid;justify-items:center;gap:2px;padding:8px 6px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.25);color:var(--text);font:700 11.5px Manrope,system-ui,sans-serif;line-height:1.2;text-align:center;cursor:grab;touch-action:none;transition:transform .2s,border-color .2s,opacity .3s}
.tp:hover{border-color:var(--accent);transform:translateY(-2px)}.tp.sel{border-color:#ffd166;box-shadow:0 0 0 2px rgba(255,209,102,.35)}
.tp.gone{opacity:.25;cursor:default;transform:none}.tp em{position:absolute;top:4px;right:6px;font:800 11px var(--fh);font-style:normal;color:var(--accent)}
.bghost{position:fixed;z-index:9999;pointer-events:none;transform:translate(-50%,-50%) scale(1.25);filter:drop-shadow(0 10px 16px rgba(0,0,0,.6));transition:none}
.bghost.back{transition:left .35s,top .35s,opacity .35s;opacity:0}
.akrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.akrow .lbl{font-weight:700;font-size:13.5px;min-width:86px}.akrow input[type=range]{flex:1;min-width:140px;accent-color:var(--accent)}.akrow b{min-width:44px;text-align:right}
.pack{position:relative;display:flex;gap:6px;align-items:flex-end;height:150px;margin:14px 0 8px;padding:12px 70px 12px 12px;border-radius:18px;background:rgba(0,0,0,.3);border:1px solid var(--line)}
.cell{position:relative;flex:1;max-width:64px;height:100%;border-radius:10px 10px 6px 6px;border:2px solid #6e7681;background:#0d1117;overflow:hidden;animation:cellin .4s backwards cubic-bezier(.3,1.6,.5,1)}
.cell::before{content:"";position:absolute;top:-2px;left:30%;right:30%;height:6px;border-radius:0 0 3px 3px;background:#8b949e}
.cell i{position:absolute;left:0;right:0;bottom:0;height:var(--f);transition:height .35s cubic-bezier(.2,.8,.2,1),background .4s}
.cell span{position:absolute;inset:auto 0 6px;text-align:center;font:800 12px var(--fh);color:#fff;text-shadow:0 1px 3px #000}
.pack .plug{position:absolute;right:10px;bottom:12px;padding:6px 8px;border-radius:8px;background:#1f2937;border:1px solid #6e7681;font:800 11px var(--fh);color:#ffd166;max-width:56px;text-align:center}
.z-full .cell i{background:linear-gradient(#3fb950,#00d4ff)}.z-ok .cell i{background:linear-gradient(#3fb950,#2ea043)}.z-stor .cell i{background:linear-gradient(#58a6ff,#1f6feb)}.z-low .cell i{background:linear-gradient(#e3b341,#d29922)}.z-bad .cell i{background:linear-gradient(#ff7b72,#f85149)}
.z-bad .cell{animation:warn 1s ease-in-out infinite}@keyframes warn{50%{border-color:#f85149}}
.aksum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.aksum div{padding:10px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid var(--line)}.aksum b{display:block;font:800 18px var(--fh)}.aksum small{color:var(--dim);font-size:12px;line-height:1.3;display:block}
@media(max-width:600px){.aksum{grid-template-columns:1fr 1fr}.aksum div:last-child{grid-column:1/-1}.pack{height:130px}}
.akfacts{display:grid;gap:4px;margin-top:10px;font-size:13.5px;color:var(--dim);line-height:1.4}
.akq{margin-top:12px;padding:14px;border-radius:16px;border:1px solid var(--line);background:rgba(0,0,0,.22)}.akq p{font-weight:800;font-size:16px;margin:6px 0 10px;line-height:1.35}
.akt{display:flex;justify-content:space-between;color:var(--dim);font-size:13px;font-weight:700}
.ako{display:grid;gap:8px}.ako button{text-align:left;padding:11px 14px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.25);color:var(--text);font:700 14.5px Manrope,system-ui,sans-serif;cursor:pointer;transition:border-color .2s,background .2s}
.ako button:hover:not(:disabled){border-color:var(--accent)}.ako button.ok{background:rgba(63,185,80,.22);border-color:var(--ok)}.ako button.no{background:rgba(248,81,73,.18);border-color:var(--bad)}
.akx{margin-top:10px;font-size:14px;line-height:1.5}.akx div{margin-top:10px}
.akend{margin-top:12px;text-align:center;padding:16px;border-radius:16px;border:1px solid var(--line)}.akend b{font:800 40px var(--fh);color:var(--accent)}
.why{margin-top:10px;padding:6px 12px;font-size:13px}
.whyb p{margin:0 0 10px;line-height:1.55}.whyb .fm{margin:4px 0 12px;padding:10px 12px;border-radius:12px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.35);font:700 15px var(--fh);overflow-wrap:anywhere}
.whyb .mist{padding:10px 12px;border-radius:12px;background:rgba(210,153,34,.1);border:1px solid rgba(210,153,34,.4)}
.accbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
table.acc{border-collapse:collapse;width:100%}table.acc th,table.acc td{padding:4px;text-align:center;border-bottom:1px solid var(--line)}table.acc th small{display:block;font-size:10px;color:var(--dim);font-weight:600;max-width:64px;margin:0 auto;line-height:1.1}
table.acc td.an{text-align:left;font-weight:700;white-space:nowrap}table.acc tr.sel{background:rgba(0,212,255,.08)}
.ac{width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:rgba(0,0,0,.25);font-size:17px;cursor:pointer}.ac.s1{border-color:#58a6ff}.ac.s2{border-color:#d29922}.ac.s3{border-color:var(--ok);background:rgba(63,185,80,.15)}
table.acc input{width:20px;height:20px;accent-color:var(--accent)}
.qacc{grid-column:1/-1;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14px}
.qcell{display:grid;gap:8px;align-content:start}
.ql.lock{cursor:default;filter:grayscale(.85);opacity:.55}.ql.lock:hover{transform:none;box-shadow:none;border-color:var(--line)}.ql.lock .e{animation:none}
.qt{padding:10px 12px;border-radius:14px;border:1px dashed var(--line);font-size:13.5px;line-height:1.4;display:grid;gap:3px}.qt b{font-size:13px}
.qt.lock{opacity:.5}.qt.on{border-style:solid;border-color:rgba(210,153,34,.6);background:rgba(210,153,34,.08)}.qt.done{border-style:solid;border-color:rgba(63,185,80,.6);background:rgba(63,185,80,.1)}
@media (prefers-reduced-motion: reduce){#bSvg .slot,#bSvg .pin,#bSvg.fly .drone,#bSvg.fly .prop,#bSvg.fly .shadow,.z-bad .cell,.binfo{animation:none!important}}
`;
function build() {
  const t = $('t-train'); if (!t || t.dataset.ok) return; t.dataset.ok = '1';
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const lock = `<div class="tglock" hidden><div><b>🔒 Сначала предполётная проверка</b>Отметь все пункты выше - и тренировки откроются.<br><button class="btn primary" onclick="document.getElementById('tgPre').scrollIntoView({behavior:'smooth',block:'start'})">↑ К проверке</button></div></div>`;
  t.innerHTML = `<div class="card pl tgpre" id="tgPre"></div>
    <div id="tgWrap"><div class="tgl"><section class="card" id="tgBuild"></section>${lock}</div>
    <div class="tgl"><section class="card" id="tgAkb"></section>${lock}</div>
    <div class="tgl" id="tgStk">${lock}</div></div>`;
  const trn = document.querySelector('#t-learn .trn'); if (trn) $('tgStk').insertBefore(trn, $('tgStk').firstChild);
  renderPre(); renderBuild(); renderAkb(); lockUpd(); initWhy();
}
/* перерисовка после загрузки данных (доступ к тестам) */
function hook() {
  if (typeof renderAll !== 'function' || renderAll._tg) return;
  const ra = renderAll; renderAll = function () { ra.apply(this, arguments); try { const a = AC(); if (a && a.renderLevels) a.renderLevels(); lockUpd(); } catch (e) { console.warn('tg', e); } }; renderAll._tg = 1;
}
/* победная анимация после отрисовки */
const _drop = drop;
function start() { build(); hook(); const a = AC(); if (a && a.renderLevels) a.renderLevels(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
/* когда дрон собран - празднуем один раз */
const obs = setInterval(() => { if (B && B.done && !B.won) { B.won = true; bWin(false); } }, 300);
})();
