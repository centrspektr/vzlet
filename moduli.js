/* Взлёт: вкладка "Курс" - модули по шагам (задания и подзадачи из zadaniya-vzlet.js).
   Шаги внутри модуля открываются сами по порядку. Следующий модуль открывает тренер.
   Плохо прошёл проверку (меньше 70%) - обязательное доп. задание "другими словами", без очков.
   Прогресс пока хранится на устройстве (localStorage vz_kurs), очки идут в рейтинг через SPK_PROGRESS.
   Подключение: <div class="vtab" id="t-kurs" hidden></div>, затем zadaniya-vzlet.js и moduli.js. */
(function () {
'use strict';
const K = window.VZ_KURS; if (!K) return;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'vz_kurs', PASS = 0.7;
const PREVIEW_OPEN = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];   // пробная версия: все модули открыты для проверки
const isCoach = () => typeof MODE !== 'undefined' && MODE === 'coach';
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const fx = (n, d = 1) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
const today = () => new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
/* короткий стабильный ключ вопроса (для "чаще всего ошибаются") */
const qh = s => { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const plur = (n, a, b, c) => { const d = n % 10, h = n % 100; return n + ' ' + (d === 1 && h !== 11 ? a : d >= 2 && d <= 4 && (h < 12 || h > 14) ? b : c); };

/* ---------- состояние ---------- */
let S = { t: {} };
try { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
S.t = S.t || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (window.SPK && SPK.sync) try { SPK.sync(); } catch (e) {} if (typeof kSync === 'function') kSync(); };
const T = id => (S.t[id] = S.t[id] || { s: {} });
const stepSt = (id, i) => { const t = T(id); return (t.s[i] = t.s[i] || {}); };
const taskDone = id => !!(S.t[id] && S.t[id].done);
function taskOpen(m, k) { const p = S.t[m.tasks[k - 1]]; return isCoach() || k === 0 || taskDone(m.tasks[k - 1]) || !!(p && (p.was || p.skip)); }
function modOpen(m) { return !!m.tasks && (isCoach() || PREVIEW_OPEN.includes(m.id) || (S.open || []).includes(m.id)); }
function modProg(m) { if (!m.tasks) return 0; return m.tasks.filter(taskDone).length / m.tasks.length; }
/* очки задания = pts x средний лучший результат проверок задания (доп. задания очков не дают) */
function taskPts(id) {
  const L = K.lib[id], t = S.t[id]; if (!L || !t || !t.done || t.cr) return 0;
  const g = L.steps.map((st, i) => t.s[i] && t.s[i].best != null ? t.s[i].best : null).filter(v => v != null);
  const r = g.length ? g.reduce((a, b) => a + b, 0) / g.length : 1;
  return Math.round(L.pts * r);
}
const allPts = () => Object.keys(K.lib).reduce((a, id) => a + taskPts(id), 0);

/* уровень сложности модуля: по классу (5-6 -> 1, 7-8 -> 2, 9-11 -> 3), тренер может поменять.
   В пробной версии переключатель уровня стоит прямо в модуле. */
const LV = K.levels || [{ n: 1, t: 'Базовый', s: '5-6 класс', e: '🟢' }, { n: 2, t: 'Средний', s: '7-8 класс', e: '🟡' }, { n: 3, t: 'Продвинутый', s: '9-11 класс', e: '🔴' }];
function clsLvl() {
  try { const P = JSON.parse(localStorage.getItem('spk_vzlet') || 'null'), c = P && parseInt(P.cls, 10); if (c) return c <= 6 ? 1 : c <= 8 ? 2 : 3; } catch (e) {}
  return 1;
}
S.lvl = S.lvl || {};
const modOf = tid => K.mods.find(x => x.tasks && x.tasks.includes(tid));
/* BETA: бета-версия 2 - все тестируют на базовом уровне, если тренер или сам ученик не выбрал другой. После беты - 0 */
const BETA = 2;
const lvlOf = mid => S.lvl[mid] || (BETA ? 1 : clsLvl());
const lvInfo = n => LV[(n || 1) - 1];
const lvChip = n => { const v = lvInfo(n); return `<span class="kr-lv l${v.n}">${v.e} ${E(v.t)}</span>`; };

const baseP = window.SPK_PROGRESS;
/* KURS_RATE: пока курс на тесте, его очки не идут в общий рейтинг Взлёта (видны только во вкладке Курс). При запуске курса - true */
const KURS_RATE = false;
window.SPK_PROGRESS = function (c) { const r = Object.assign({}, baseP ? baseP(c) : { p: 0, b: 0, l: '' }); if (KURS_RATE) r.p = (r.p || 0) + allPts(); return r; };
const baseR = window.SPK_RESET;
window.SPK_RESET = function (c) { S = { t: {}, lvl: {} }; try { localStorage.setItem(KEY, '{}'); } catch (e) {} if (baseR) baseR(c); if (box) home(); };

/* ---------- звук и вибро (как в тренировке) ---------- */
let AX = null;
function snd(kind) {
  try {
    AX = AX || new (window.AudioContext || window.webkitAudioContext)();
    const t = AX.currentTime, o = AX.createOscillator(), g = AX.createGain();
    const P = { ok: [660, 990, .12, 'triangle'], bad: [180, 140, .18, 'sawtooth'], tap: [520, 520, .05, 'square'], win: [523, 1046, .45, 'triangle'] }[kind] || [440, 440, .1, 'sine'];
    o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'bad' ? .05 : .07, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + P[2] + .05);
    o.connect(g); g.connect(AX.destination); o.start(t); o.stop(t + P[2] + .08);
  } catch (e) {}
}
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
function toastK(m) { const t = $('#toast'); if (!t) return; t.textContent = m; t.className = 'show ok'; clearTimeout(t._k); t._k = setTimeout(() => t.className = '', 4200); }
function confetti() {
  if (RED) return; const C = ['#00d4ff', '#3fb950', '#facc15', '#a78bfa', '#fff'];
  for (let i = 0; i < 50; i++) { const d = document.createElement('i'), a = Math.random() * 6.28, v = 100 + Math.random() * 260;
    d.style.cssText = `position:fixed;left:${innerWidth / 2}px;top:${innerHeight * .3}px;width:7px;height:5px;background:${C[i % 5]};z-index:10000;pointer-events:none;border-radius:2px`;
    document.body.appendChild(d);
    d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v + 220}px) rotate(${Math.random() * 600}deg)`, opacity: 0 }], { duration: 1200 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => d.remove(); }
}

/* ---------- картинки к карточкам ---------- */
function cellSvg(x, y, w, h, lvl, txt, d) {
  const fh = Math.max(4, (h - 10) * lvl);
  return `<g class="kcell" style="animation-delay:${d || 0}ms"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" class="kc-b"/><rect x="${x + w / 2 - 7}" y="${y - 5}" width="14" height="6" rx="2" class="kc-t"/>` +
    `<rect x="${x + 5}" y="${y + h - 5 - fh}" width="${w - 10}" height="${fh}" rx="4" class="kc-f"/>` + (txt ? `<text x="${x + w / 2}" y="${y + h / 2 + 5}" class="kc-x">${txt}</text>` : '') + '</g>';
}
function pic(k) {
  if (k && k.indexOf('e:') === 0) return `<div class="kpic-e" aria-hidden="true">${E(k.slice(2))}</div>`;
  if (k && k.indexOf('chain:') === 0) return `<div class="kchain" aria-hidden="true">${k.slice(6).split('>').map((t, i) => (i ? '<i>→</i>' : '') + `<span style="animation-delay:${i * 140}ms">${E(t)}</span>`).join('')}</div>`;
  const V = (b, w) => `<svg viewBox="0 0 ${w || 240} 120" class="kpic" aria-hidden="true">${b}</svg>`;
  switch (k) {
    case 'tank': return V(cellSvg(88, 18, 64, 92, .78, '3,7 В') + '<path d="M160 60h14" class="kp-l"/><text x="178" y="56" class="kp-s">бак</text><text x="178" y="74" class="kp-s">энергии</text>');
    case 'cell': return V('<g class="kroll">' + [44, 36, 28, 20, 12].map((r, i) => `<circle cx="120" cy="62" r="${r}" class="kp-r${i % 2}"/>`).join('') + '</g><text x="186" y="58" class="kp-s">тонкие</text><text x="186" y="76" class="kp-s">слои</text>');
    case 'stack': return V([0, 1, 2, 3].map(i => cellSvg(20 + i * 50, 30, 40, 70, .8, '', i * 120)).join('') + [0, 1, 2].map(i => `<path d="M${60 + i * 50} 65h10" class="kp-w"/>`).join('') + '<text x="120" y="20" class="kp-h">4S = 4 x 3,7 = 14,8 В</text>');
    case 'par': return V([0, 1].map(i => cellSvg(70 + i * 56, 34, 44, 70, .8, '3,7', i * 150)).join('') + '<path d="M92 26h56M92 26v8M148 26v8" class="kp-w"/><text x="120" y="118" class="kp-s2">рядом: 3,7 В, бак в 2 раза больше</text>');
    case 'scale': return V('<rect x="20" y="52" width="200" height="16" rx="8" class="kp-g"/>' + [['3,3', 40, 'kp-red'], ['3,5', 90, 'kp-yel'], ['3,8', 140, 'kp-blu'], ['4,2', 200, 'kp-grn']].map(a => `<circle cx="${a[1]}" cy="60" r="9" class="${a[2]}"/><text x="${a[1]}" y="96" class="kp-s2">${a[0]}</text>`).join('') + '<text x="120" y="30" class="kp-h">вольты одной банки</text>');
    case 'sp': return V('<g>' + [0, 1, 2].map(i => `<rect x="34" y="${78 - i * 28}" width="44" height="24" rx="5" class="kp-cs"/>`).join('') + '<path d="M56 18v-6" class="kp-w"/></g><text x="56" y="116" class="kp-s2">столбик: вольты</text>' +
      [0, 1, 2].map(i => `<rect x="${134 + i * 28}" y="50" width="22" height="52" rx="5" class="kp-cs"/>`).join('') + '<path d="M134 42h78" class="kp-w"/><text x="173" y="116" class="kp-s2">ряд: бак</text>');
    case 'hv': return V(cellSvg(60, 22, 50, 86, .9, '4,2') + cellSvg(130, 22, 50, 86, 1, '4,35') + '<text x="85" y="118" class="kp-s2">LiPo</text><text x="155" y="118" class="kp-s2">LiHV</text>');
    case 'mob': return V('<g class="kfly"><rect x="92" y="54" width="56" height="18" rx="6" class="kp-d"/>' + [[72, 50], [168, 50], [72, 80], [168, 80]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="16" class="kp-ring"/><ellipse cx="${p[0]}" cy="${p[1]}" rx="14" ry="3" class="kp-prop"/>`).join('') + '<rect x="110" y="40" width="20" height="12" rx="3" class="kp-blu"/></g><text x="120" y="116" class="kp-s2">Mobula 7: 75 мм, 1S</text>');
    case 'sim': return V('<rect x="40" y="20" width="160" height="84" rx="10" class="kp-g"/><path d="M60 88 Q100 30 140 60 T190 40" class="kp-path"/><circle r="5" class="kp-yel kdot"><animateMotion dur="3s" repeatCount="indefinite" path="M60 88 Q100 30 140 60 T190 40"/></circle>');
    case 'osd': return V('<rect x="30" y="16" width="180" height="92" rx="12" class="kp-g"/><text x="48" y="44" class="kp-osd">14,8V</text><text x="160" y="44" class="kp-osd">02:31</text><path d="M110 70h20M120 60v20" class="kp-l"/><text x="120" y="100" class="kp-s2">так видно в очках</text>');
    case 'hose': return V('<rect x="30" y="40" width="60" height="50" rx="8" class="kp-g"/><path d="M90 52h70" class="kp-hose1"/><path d="M90 78h70" class="kp-hose2"/><text x="190" y="57" class="kp-s2">120C</text><text x="190" y="83" class="kp-s2">25C</text>');
    case 'sag': return V('<path d="M20 40 L70 42 L90 80 L120 82 L135 46 L220 50" class="kp-path"/><text x="105" y="106" class="kp-s2">газ: просадка</text><text x="40" y="28" class="kp-s2">спокойно</text>');
    case 'plug': return V('<rect x="40" y="36" width="70" height="50" rx="8" class="kp-g"/><path d="M110 50h50M110 58h50" class="kp-pw"/>' + [0, 1, 2, 3, 4].map(i => `<path d="M110 ${70 + i * 3}h80" class="kp-bw${i}"/>`).join('') + '<text x="180" y="44" class="kp-s2">силовой</text><text x="180" y="100" class="kp-s2">балансир: 5 проводов</text>');
    case 'charge': return V('<rect x="30" y="34" width="80" height="56" rx="10" class="kp-g"/><text x="70" y="68" class="kp-osd">1,5A</text><path d="M110 62h40" class="kp-l"/>' + cellSvg(156, 26, 48, 76, .5, '', 0) + '<path d="M180 46l-8 16h10l-6 16" class="kp-bolt"/>');
    case 'bag': return V('<path d="M80 30h80l10 76H70z" class="kp-bag"/><text x="120" y="76" class="kp-s">🔥🚫</text>');
    case 'temp': return V('<text x="70" y="78" class="kp-big">☀️</text><text x="170" y="78" class="kp-big">❄️</text><path d="M95 30l50 64M145 30l-50 64" class="kp-x"/>');
    case 'swell': return V('<path d="M70 40 Q120 10 170 40 L170 90 Q120 118 70 90 Z" class="kp-sw"/><text x="120" y="72" class="kp-h">не летаем</text>');
    case 'hot': return V(cellSvg(96, 26, 48, 80, .4, '', 0) + '<path d="M80 30q6-10 0-20M120 18q6-10 0-20M160 30q6-10 0-20" class="kp-heat"/>');
    case 'quad': return V('<path d="M78 30L162 90M162 30L78 90" class="kp-l" style="stroke-width:6"/><rect x="104" y="46" width="32" height="28" rx="6" class="kp-d"/><rect x="113" y="40" width="14" height="8" rx="2" class="kp-yel"/>' +
      [[78, 30, 1], [162, 30, 0], [78, 90, 0], [162, 90, 1]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="22" class="kp-ring"/><g class="${p[2] ? 'kspin' : 'kspin r'}" style="transform-origin:${p[0]}px ${p[1]}px"><path d="M${p[0] - 16} ${p[1]}h32" class="kp-w" style="stroke-width:4"/></g><text x="${p[0]}" y="${p[1] + 34 > 118 ? p[1] - 26 : p[1] + 36}" class="kp-s2">${p[2] ? '↺ против' : '↻ по часовой'}</text>`).join('') + '<text x="120" y="14" class="kp-s2">▲ вперёд</text>');
    default: return '';
  }
}

/* ---------- стили ---------- */
const css = document.createElement('style');
css.textContent = `
#t-kurs,#krRet,#krUndo,#krGp{--ka:#00d4ff;--kb:#a78bfa;--krgb:0,212,255}
.kr{max-width:840px;margin:0 auto;padding:4px 0 90px;display:grid;gap:14px}
.kr-card{position:relative;border:1px solid rgba(127,127,160,.28);background:rgba(12,13,30,.86);border-radius:20px;padding:16px;overflow:hidden}
.kr-card.top:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--ka),var(--kb))}
.kr h3{margin:0 0 4px;font-size:20px}.kr p{margin:0;line-height:1.5}
.kr .mut{opacity:.75;font-size:13.5px}
.kr-bar{height:9px;border-radius:99px;background:rgba(127,127,160,.2);overflow:hidden;margin-top:10px}
.kr-bar i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--ka),var(--kb));transition:width 1s cubic-bezier(.2,.8,.2,1)}
.kr-row{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;opacity:.82;margin-top:6px}
.kr-beta summary{display:flex;align-items:center;gap:10px;cursor:pointer;list-style:none;flex-wrap:wrap}.kr-beta summary::-webkit-details-marker{display:none}.kr-beta summary small{margin-left:auto;opacity:.7}.kr-beta[open] summary small{display:none}.kr-bt{font-weight:800;font-size:11px;letter-spacing:.06em;padding:3px 8px;border-radius:99px;background:linear-gradient(90deg,#a855f7,#22d3ee);color:#fff}.kr-beta p,.kr-beta ul,.kr-beta ol{margin:10px 0;font-size:14px;line-height:1.55}.kr-beta ul,.kr-beta ol{padding-left:20px}.kr-beta li{margin:4px 0}.kr-beta .kr-sec{margin-top:12px}
.kr-note{padding:10px 12px;border-radius:14px;border:1px dashed rgba(var(--krgb),.5);background:rgba(var(--krgb),.08);font-size:13.5px;line-height:1.45}
.kr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 16px;border-radius:13px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.12);color:inherit;font-family:inherit;font-weight:700;font-size:14px;line-height:1.1;cursor:pointer;transition:transform .15s,background .2s;-webkit-tap-highlight-color:transparent}
.kr-btn:active{transform:scale(.96)}.kr-btn.pri{background:linear-gradient(135deg,var(--ka),var(--kb));color:#0b0b18;border:none}
.kr-btn[disabled]{opacity:.45;cursor:default}.kr-btn.sm{min-height:36px;padding:0 12px;font-size:13px}
.kr-back{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.kr-mods{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.kr-m{position:relative;text-align:left;border:1px solid rgba(127,127,160,.26);background:rgba(12,13,30,.86);border-radius:18px;padding:14px;color:inherit;font-family:inherit;cursor:pointer;animation:krIn .55s cubic-bezier(.2,.8,.2,1) both;transition:transform .2s,border-color .2s;-webkit-tap-highlight-color:transparent}
.kr-m:active{transform:scale(.98)}
.kr-m.on{border-color:rgba(var(--krgb),.6);box-shadow:0 12px 30px -16px rgba(var(--krgb),.8)}
.kr-m.lock{opacity:.62}
.kr-m .nn{font-size:11.5px;font-weight:800;letter-spacing:.08em;opacity:.7}
.kr-m .e{font-size:30px;line-height:1;float:right}
.kr-m b{display:block;font-size:17px;margin:4px 0 2px}.kr-m small{display:block;font-size:13px;opacity:.75;line-height:1.4}
.kr-m .st{margin-top:10px;font-size:12.5px;font-weight:700}
.kr-plan{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:6px}
.kr-plan li{padding:8px 12px;border-radius:11px;background:rgba(127,127,160,.08);font-size:14px}
.kr-road{position:relative;display:grid;gap:10px;padding-left:30px}
.kr-road:before{content:"";position:absolute;left:13px;top:16px;bottom:16px;width:3px;border-radius:3px;background:linear-gradient(var(--ka),var(--kb));opacity:.35}
.kr-t{position:relative;display:flex;gap:12px;align-items:center;width:100%;text-align:left;border:1px solid rgba(127,127,160,.26);background:rgba(12,13,30,.86);border-radius:16px;padding:12px 14px;color:inherit;font-family:inherit;cursor:pointer;animation:krIn .5s cubic-bezier(.2,.8,.2,1) both;-webkit-tap-highlight-color:transparent}
.kr-t:active{transform:scale(.985)}
.kr-t .d{position:absolute;left:-30px;top:50%;margin-top:-14px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:12.5px;background:#1b1b2e;border:2px solid rgba(127,127,160,.5)}
.kr-t.ok .d{background:linear-gradient(135deg,#22c55e,#16a34a);border-color:transparent}
.kr-t.cur{border-color:rgba(var(--krgb),.6)}.kr-t.cur .d{background:linear-gradient(135deg,var(--ka),var(--kb));color:#0b0b18;border-color:transparent;animation:krPulse 2.2s ease-out infinite}
.kr-t.lock{opacity:.5;cursor:default}
.kr-t .e{font-size:24px;flex:none}.kr-t b{display:block;font-size:15.5px}.kr-t small{display:block;font-size:12.5px;opacity:.75;margin-top:2px;line-height:1.35}
.kr-t .r{margin-left:auto;flex:none;font-size:12px;font-weight:800;opacity:.85;text-align:right}
.kr-t .wait{color:#facc15}
.kr-steps{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.kr-steps i{width:22px;height:6px;border-radius:9px;background:rgba(127,127,160,.3)}.kr-steps i.ok{background:#22c55e}.kr-steps i.x{background:#facc15}
.kr-stp{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.kr-stp::-webkit-scrollbar{display:none}
.kr-stp button{flex:none;min-height:34px;padding:0 12px;border-radius:99px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.1);color:inherit;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer}
.kr-stp button.on{background:linear-gradient(135deg,var(--ka),var(--kb));color:#0b0b18;border:none}
.kr-stp button.ok:not(.on){border-color:#22c55e;color:#86efac}.kr-stp button[disabled]{opacity:.4}
.kr-sec{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.65;margin:2px 0 10px}
.kr-cards{position:relative;min-height:250px}
.kr-cd{text-align:center;padding:4px 4px 0;animation:krSw .45s cubic-bezier(.2,.8,.2,1) both}
.kr-cd h4{margin:8px 0 6px;font-size:18px}.kr-cd p{font-size:15px;line-height:1.55;max-width:560px;margin:0 auto;text-align:left}
.kr-dots{display:flex;gap:6px;justify-content:center;margin:12px 0}.kr-dots i{width:8px;height:8px;border-radius:50%;background:rgba(127,127,160,.4);transition:all .3s}.kr-dots i.on{width:22px;border-radius:9px;background:var(--ka)}
.kr-nav{display:flex;gap:8px;justify-content:space-between}
.kpic{width:100%;max-width:340px;height:auto;display:block;margin:0 auto}
.kc-b{fill:rgba(127,127,160,.12);stroke:rgba(200,210,255,.6);stroke-width:2}.kc-t{fill:rgba(200,210,255,.6)}
.kc-f{fill:url(#kgr);fill:#22c55e;opacity:.85;transform-box:fill-box;transform-origin:bottom;animation:krFill 1.2s cubic-bezier(.2,.8,.2,1) both}
.kcell{animation:krIn .5s cubic-bezier(.2,.8,.2,1) both}
.kc-x{fill:#fff;font:800 13px system-ui;text-anchor:middle}
.kp-s{fill:#cbd5ff;font:700 14px system-ui}.kp-s2{fill:#cbd5ff;font:600 12px system-ui;text-anchor:middle}.kp-h{fill:#fff;font:800 14px system-ui;text-anchor:middle}
.kp-l{stroke:#cbd5ff;stroke-width:2}.kp-w{stroke:#facc15;stroke-width:4;stroke-linecap:round}
.kp-r0{fill:none;stroke:#00d4ff;stroke-width:5;opacity:.8}.kp-r1{fill:none;stroke:#a78bfa;stroke-width:5;opacity:.8}
.kroll{transform-box:fill-box;transform-origin:center;animation:krSpin 14s linear infinite}
.kp-cs{fill:rgba(34,197,94,.75);stroke:rgba(200,210,255,.6);stroke-width:2}
.kp-g{fill:rgba(127,127,160,.14);stroke:rgba(200,210,255,.35);stroke-width:2}
.kp-red{fill:#f87171}.kp-yel{fill:#facc15}.kp-blu{fill:#38bdf8}.kp-grn{fill:#22c55e}
.kp-d{fill:#334155;stroke:#94a3b8}.kp-ring{fill:none;stroke:#94a3b8;stroke-width:3}.kp-prop{fill:rgba(0,212,255,.45);transform-box:fill-box;transform-origin:center;animation:krSpin .35s linear infinite}
.kfly{animation:krHover 2.6s ease-in-out infinite}
.kp-path{fill:none;stroke:#00d4ff;stroke-width:3;stroke-dasharray:6 6;animation:krDash 2s linear infinite}
.kp-osd{fill:#4ade80;font:800 16px ui-monospace,monospace}
.kp-hose1{stroke:#00d4ff;stroke-width:14;stroke-linecap:round}.kp-hose2{stroke:#a78bfa;stroke-width:4;stroke-linecap:round}
.kp-pw{stroke:#f87171;stroke-width:5}.kp-bw0{stroke:#111;stroke-width:2}.kp-bw1,.kp-bw2,.kp-bw3,.kp-bw4{stroke:#e5e7eb;stroke-width:2}
.kp-bolt{fill:none;stroke:#facc15;stroke-width:3;stroke-linejoin:round;animation:krBlink 1.2s ease-in-out infinite}
.kp-bag{fill:rgba(250,204,21,.18);stroke:#facc15;stroke-width:2}.kp-big{font-size:40px;text-anchor:middle}
.kp-x{stroke:#f87171;stroke-width:5;stroke-linecap:round}.kp-sw{fill:rgba(248,113,113,.22);stroke:#f87171;stroke-width:3;transform-box:fill-box;transform-origin:center;animation:krSwell 2s ease-in-out infinite}
.kp-heat{fill:none;stroke:#fb923c;stroke-width:3;stroke-linecap:round;animation:krHeat 1.6s ease-in-out infinite}
.kr-q .top{display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;opacity:.75;margin-bottom:8px}
.kr-q .pr{height:5px;border-radius:9px;background:rgba(127,127,160,.2);margin-bottom:12px;overflow:hidden}.kr-q .pr i{display:block;height:100%;background:linear-gradient(90deg,var(--ka),var(--kb));transition:width .4s}
.kr-q .qq{font-size:16.5px;font-weight:700;line-height:1.4;margin-bottom:12px;animation:krSw .35s both}
.kr-q .qa{display:grid;gap:8px}
.kr-q .qa button,.kr-opt{text-align:left;min-height:48px;padding:10px 14px;border-radius:13px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.1);color:inherit;font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;transition:background .2s,border-color .2s,transform .15s;animation:krIn .4s both}
.kr-q .qa button:active,.kr-opt:active{transform:scale(.98)}
#t-kurs .y{background:rgba(34,197,94,.22) !important;border-color:#22c55e !important}#t-kurs .n{background:rgba(248,113,113,.2) !important;border-color:#f87171 !important}
.kr-end{text-align:center;padding:8px 0}.kr-end .big{font-size:40px;font-weight:900;margin:6px 0;background:linear-gradient(135deg,var(--ka),var(--kb));-webkit-background-clip:text;background-clip:text;color:transparent}
.kr-end .acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}
.kr-x{border:1px solid rgba(250,204,21,.6);background:rgba(250,204,21,.09);border-radius:16px;padding:14px;margin-top:12px;text-align:left}
.kr-like{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:12px;font-size:13.5px}
.kr-like button{min-height:40px;min-width:54px;border-radius:12px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.1);color:inherit;font-size:18px;cursor:pointer;transition:transform .15s}
.kr-fbd summary{cursor:pointer;font-weight:700;font-size:14px}.kr-fbd .kr-like{justify-content:flex-start}
.kr-fb{display:grid;gap:6px;margin-top:12px;font-size:13.5px}.kr-fb label{opacity:.85}.kr-fb textarea{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.08);color:inherit;font:inherit;padding:8px 10px;resize:vertical}.kr-fb .kr-btn{justify-self:start}
.kr-like button.on{background:rgba(var(--krgb),.22);border-color:var(--ka);transform:scale(1.08)}
.kr-in{display:grid;gap:10px}.kr-in label{display:grid;gap:4px;font-size:13px;font-weight:700;opacity:.9}
.kr-in input,.kr-in select,.kr-in textarea{font:inherit;font-size:15px;color:inherit;background:rgba(0,0,0,.25);border:1px solid rgba(127,127,160,.4);border-radius:11px;padding:10px 12px;width:100%;box-sizing:border-box}
.kr-done{display:flex;gap:10px;align-items:center;padding:12px;border-radius:14px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.45);font-size:14px}
.kr-wait{display:flex;gap:10px;align-items:center;padding:12px;border-radius:14px;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.45);font-size:14px}
.kr-hist{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:6px;font-size:13px}
.kr-hist li{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(127,127,160,.08)}
/* тренажёры */
.kg-stack{display:flex;gap:10px;justify-content:center;align-items:flex-end;min-height:150px;padding:10px;flex-wrap:wrap}
.kg-stack.par{flex-direction:row}.kg-stack.ser{flex-direction:column-reverse;align-items:center;gap:0}.kg-stack.ser .kg-cell{border-radius:6px;margin-top:-2px}
.kg-cell{width:58px;height:34px;border-radius:9px;border:2px solid rgba(200,210,255,.6);background:linear-gradient(90deg,#22c55e 78%,rgba(127,127,160,.15) 78%);display:grid;place-items:center;font:800 12px system-ui;color:#04130a;animation:krPop .35s cubic-bezier(.2,1.4,.4,1) both}
.kg-stack.par .kg-cell{width:44px;height:74px;background:linear-gradient(0deg,#22c55e 78%,rgba(127,127,160,.15) 78%)}
.kg-read{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.kg-read div{padding:10px 6px;border-radius:12px;background:rgba(127,127,160,.1)}.kg-read b{display:block;font-size:20px}.kg-read small{font-size:11.5px;opacity:.75}
.kg-goal{padding:10px 12px;border-radius:12px;background:rgba(var(--krgb),.12);font-weight:700;margin:10px 0;text-align:center;font-size:15px}
.kg-ctl{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.kg-volt{font:900 44px ui-monospace,monospace;text-align:center;margin:6px 0;color:#4ade80;text-shadow:0 0 18px rgba(74,222,128,.5)}
.kg-gauge{position:relative;height:16px;border-radius:9px;background:linear-gradient(90deg,#f87171 0 20%,#facc15 20% 38%,#38bdf8 38% 70%,#22c55e 70%);margin:8px 0 14px}
.kg-gauge i{position:absolute;top:-6px;width:4px;height:28px;border-radius:3px;background:#fff;box-shadow:0 0 8px #fff;transition:left .6s cubic-bezier(.2,.8,.2,1)}
.kg-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.kg-cmp{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.kg-akb{border:2px solid rgba(127,127,160,.35);border-radius:16px;padding:14px 8px;text-align:center;background:rgba(127,127,160,.08);color:inherit;font-family:inherit;cursor:pointer;transition:transform .15s,border-color .2s;animation:krIn .4s both}
.kg-akb:active{transform:scale(.97)}.kg-akb b{display:block;font-size:22px}.kg-akb small{display:block;font-size:13px;opacity:.8;margin-top:4px}
.kg-lbl{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:18px 12px;border-radius:16px;background:linear-gradient(135deg,#1e293b,#0f172a);border:2px solid #334155}
.kg-lbl button{min-height:44px;padding:0 14px;border-radius:10px;border:2px dashed rgba(0,212,255,.55);background:rgba(0,212,255,.08);color:#fff;font:900 18px ui-monospace,monospace;cursor:pointer;transition:all .25s}
.kg-lbl button.ok{border-style:solid;border-color:#22c55e;background:rgba(34,197,94,.18)}
.kg-exp{min-height:64px;margin-top:12px;padding:12px;border-radius:12px;background:rgba(127,127,160,.1);font-size:14.5px;line-height:1.5;animation:krSw .35s both}
.kg-story{display:grid;gap:8px}
.kg-story button{text-align:left;padding:12px 14px;border-radius:13px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.1);color:inherit;font-family:inherit;font-weight:600;font-size:14.5px;line-height:1.4;cursor:pointer;transition:all .2s}
.kg-story button.sel{border-color:#f87171;background:rgba(248,113,113,.15)}
.kg-story small{display:block;margin-top:4px;font-weight:600;opacity:.85}
.kr-lv{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:12px;font-weight:800;background:rgba(34,197,94,.14);color:#86efac}
.kr-lv.l2{background:rgba(250,204,21,.14);color:#fde68a}.kr-lv.l3{background:rgba(248,113,113,.15);color:#fca5a5}
.kr-lvs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.kr-lvs button{min-height:52px;padding:6px 4px;border-radius:13px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.08);color:inherit;font-family:inherit;font-weight:800;font-size:13.5px;line-height:1.2;cursor:pointer;transition:all .2s;-webkit-tap-highlight-color:transparent}
.kr-lvs button small{display:block;font-weight:600;font-size:11.5px;opacity:.75;margin-top:2px}
.kr-lvs button.on{border-color:var(--ka);background:rgba(var(--krgb),.18);box-shadow:0 0 0 1px var(--ka) inset}
.kr-more{margin:10px auto 0;max-width:560px;text-align:left;padding:10px 12px;border-radius:12px;font-size:14.5px;line-height:1.5;border-left:3px solid #facc15;background:rgba(250,204,21,.08)}
.kr-more.l3{border-left-color:#f87171;background:rgba(248,113,113,.08)}
.kr-more b{display:block;font-size:12px;letter-spacing:.04em;opacity:.85;margin-bottom:2px}
.kr-why{margin-top:12px;padding:12px 14px;border-radius:14px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.45);font-size:14.5px;line-height:1.5;animation:krSw .35s both}
.kr-why.ok{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.45)}
.kr-why b{display:block;margin-bottom:4px}
.kr-why .kr-btn{margin-top:10px;width:100%}
.kr-err{margin-top:12px;text-align:left}.kr-err summary{cursor:pointer;font-weight:700;font-size:14px;padding:8px 0}
.kr-err li{margin:0 0 8px;padding:8px 10px;border-radius:10px;background:rgba(127,127,160,.08);font-size:13.5px;line-height:1.45;list-style:none}
.kr-err ul{margin:0;padding:0}
.kr-hint{font-size:13px;padding:8px 10px;border-radius:10px;background:rgba(250,204,21,.1);margin-bottom:10px}
@keyframes krIn{from{opacity:0;transform:translateY(12px)}}
@keyframes krSw{from{opacity:0;transform:translateX(18px)}}
@keyframes krPop{from{opacity:0;transform:scale(.4)}}
@keyframes krFill{from{transform:scaleY(0)}}
@keyframes krSpin{to{transform:rotate(360deg)}}
@keyframes krHover{50%{transform:translateY(-6px)}}
@keyframes krDash{to{stroke-dashoffset:-24}}
@keyframes krBlink{50%{opacity:.3}}
@keyframes krSwell{50%{transform:scale(1.05)}}
@keyframes krHeat{50%{transform:translateY(-5px);opacity:.4}}
@keyframes krPulse{0%{box-shadow:0 0 0 0 rgba(var(--krgb),.55)}70%{box-shadow:0 0 0 10px rgba(var(--krgb),0)}100%{box-shadow:0 0 0 0 rgba(var(--krgb),0)}}
@media (max-width:520px){.kr-card{padding:14px}.kr-road{padding-left:26px}.kr-road:before{left:11px}.kr-t .d{left:-26px;width:24px;height:24px;margin-top:-12px;font-size:11px}.kg-opts{grid-template-columns:1fr}.kg-volt{font-size:38px}}
@media (prefers-reduced-motion:reduce){#t-kurs *{animation:none !important;transition:none !important}}
`;
document.head.appendChild(css);

/* ---------- экраны ---------- */
let box = null, VIEW = { m: null, t: null, step: null }, CARD = null;
function mount(html, quiet) {
  box.classList.toggle('kq', !!quiet);
  CARD = null;
  navRec();
  box.innerHTML = '<div class="kr">' + html + navHtml() + '</div>';
  bodyCls();
  if (!quiet && window.tabFx && !RED) window.tabFx(box, 0, false);
}
/* класс на body, пока открыта вкладка Курс: прячем плавающие кнопки других скриптов, в окне тренера - плашку и шапку для учеников */
function bodyCls() {
  if (!box) return; const on = !box.hidden, B = document.body.classList;
  B.toggle('kr-on', on); B.toggle('kr-co', on && isCoach() && !CO.as);
}
/* кнопка "нашёл ошибку" в шапке курса (сама плавающая кнопка во вкладке Курс скрыта) */
const bugBtn = () => '<button class="kr-bug" data-k="bug" title="Нашёл ошибку? Сообщить" aria-label="Сообщить об ошибке">⚠</button>';
/* ---------- назад / вперёд: история экранов и "дальше по порядку" ---------- */
const NAV = { h: [], i: -1, off: false };
function navCur() {
  if (isCoach() && !CO.as) return { c: 1, tab: CO.tab, who: CO.who, mod: CO.mod, cm: CO.cm, ct: CO.ct };
  return { m: VIEW.m, t: VIEW.t, s: VIEW.step };
}
function navRec() {
  if (NAV.off) return;
  const d = navCur(), j = JSON.stringify(d);
  if (NAV.h[NAV.i] && NAV.h[NAV.i].j === j) return;
  NAV.h = NAV.h.slice(0, NAV.i + 1); NAV.h.push({ d, j }); if (NAV.h.length > 40) NAV.h.shift(); NAV.i = NAV.h.length - 1;
}
function navShow(d) {
  NAV.off = true;
  try {
    if (d.c) { CO.as = false; CO.tab = d.tab; CO.who = d.who; CO.mod = d.mod; CO.cm = d.cm; CO.ct = d.ct; coDraw(); }
    else { if (isCoach()) CO.as = true; if (d.t) taskView(d.t, d.s); else if (d.m) modView(d.m); else home(); }
  } finally { NAV.off = false; }
}
function navUp() {
  if (isCoach() && !CO.as) { if (CO.ct) CO.ct = null; else if (CO.mod) CO.mod = null; else if (CO.cm) CO.cm = null; else if (CO.who) CO.who = null; else return false; coDraw(); return true; }
  if (VIEW.t) { modView(VIEW.m); return true; } if (VIEW.m) { home(); return true; } return false;
}
function navLabel(d) {
  try {
    if (d.c) return d.ct ? K.lib[d.ct].t : d.cm ? mName(mOf(d.cm)) : d.who ? (CO.list.find(x => x.id === d.who) || {}).n || 'Ученик' : d.tab === 'mo' ? 'Модули' : d.tab === 'st' ? 'Ученики' : 'Обзор';
    return d.t ? K.lib[d.t].t : d.m ? mName(mOf(d.m)) : 'Курс';
  } catch (e) { return ''; }
}
function navNext() {
  if (CARD && VIEW.t === CARD.tid && VIEW.step === CARD.i) return { card: 1, label: CARD.c < CARD.N - 1 ? 'карточка ' + (CARD.c + 2) + ' из ' + CARD.N : 'Всё понятно' };
  if (NAV.i < NAV.h.length - 1) return { r: 1, label: navLabel(NAV.h[NAV.i + 1].d) };
  if (isCoach() && !CO.as) return null;
  if (VIEW.t) {
    const L = K.lib[VIEW.t], t = T(VIEW.t), n = L.steps.length, st = VIEW.step, ok = i => !!(t.s[i] && t.s[i].ok);
    if (st >= 0 && st < n - 1 && ok(st)) return { t: VIEW.t, s: st + 1, label: stepName(L.steps[st + 1]) };
    if (st >= 0 && st === n - 1 && ok(st)) return { t: VIEW.t, s: -1, label: 'Итог задания' };
    if (st === -1) { const m = modOf(VIEW.t), k = m.tasks.indexOf(VIEW.t), nx = m.tasks[k + 1]; return nx && taskOpen(m, k + 1) ? { t: nx, label: 'Следующее задание' } : { m: m.id, label: 'К модулю' }; }
    return null;
  }
  if (VIEW.m) { const m = mOf(VIEW.m), k = m && m.tasks ? m.tasks.findIndex((id, i) => !taskDone(id) && !(S.t[id] && S.t[id].skip) && taskOpen(m, i)) : -1; return k >= 0 ? { t: m.tasks[k], label: K.lib[m.tasks[k]].t } : null; }
  const m = K.mods.find(x => x.tasks && modOpen(x) && modProg(x) < 1); return m ? { m: m.id, label: mName(m) } : null;
}
function navHtml() {
  /* у тренера своя навигация кнопками "←" на экранах; внизу только значок сохранения */
  if (isCoach() && !CO.as) return `<div class="kr-svc" id="krSv" role="status">${coSvHtml()}</div>`;
  const back = NAV.i > 0 || !!(VIEW.t || VIEW.m) || !!(CARD && CARD.c > 0), nx = navNext();
  return `<div class="kr-gnav"><button class="kr-btn" data-k="nav-b" ${back ? '' : 'disabled'} aria-label="Назад">‹ Назад</button><div class="kr-gnc"><b>${E(navLabel(navCur()))}</b><span>${nx ? 'Дальше: ' + E(nx.label) : ''}</span></div><button class="kr-btn pri" data-k="nav-f" ${nx ? '' : 'disabled'} aria-label="Вперёд">Вперёд ›</button></div>`;
}
function navSync() { const g = box && $('.kr-gnav', box); if (g) g.outerHTML = navHtml(); }
function navBack() {
  if (CARD && CARD.c > 0 && VIEW.t === CARD.tid) { CARD.go(-1); return; }
  if (NAV.i > 0) { NAV.i--; navShow(NAV.h[NAV.i].d); } else if (!navUp()) return;
  scrollTop();
}
function navFwd() {
  const n = navNext(); if (!n) return;
  if (n.card) { CARD.go(1); return; }
  if (n.r) { NAV.i++; navShow(NAV.h[NAV.i].d); } else if (n.t) taskView(n.t, n.s); else if (n.m) modView(n.m);
  scrollTop();
}
function scrollTop() {
  const nav = document.getElementById('vtb'), off = (nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0) + 10, r = box.getBoundingClientRect();
  if (Math.abs(r.top - off) > 30) window.scrollTo({ top: scrollY + r.top - off, behavior: RED ? 'auto' : 'smooth' });
}

/* руководство тестера (бета 2): раскрыто, пока не нажали "Понятно" */
function betaGuide() {
  let seen = false; try { seen = localStorage.getItem('vz_beta2_seen') === '1'; } catch (e) {}
  return `<details class="kr-card kr-beta" ${seen ? '' : 'open'}><summary><span class="kr-bt">БЕТА 2</span><b>Нужна ваша помощь в тестировании</b><small>руководство</small></summary>
  <p><b>Ребята, это бета-версия 2 курса пилота.</b> Вы проходите его первыми. Помогите сделать курс понятным и интересным: найдите, что непонятно, скучно или не работает. Перед бетой 2 результаты всех обнулены, начинаем с чистого листа.</p>
  <div class="kr-sec">Зачем тестируем</div>
  <ul><li>Проверить, что материал понятен с первого раза.</li><li>Найти ошибки в вопросах, ответах и пояснениях.</li><li>Понять, что интересно, а что скучно или слишком длинно, и переделать.</li><li>Проверить, что всё работает и на телефоне, и на компьютере.</li></ul>
  <div class="kr-sec">Как тестировать</div>
  <ol><li>Проходите на <b>🟢 Базовом</b> уровне, он уже выбран сам.</li><li>Идите по модулям по порядку, задание за заданием, от первого до шестого.</li><li>Полёты в симуляторе и задания "на занятии" можно пропустить кнопкой "⏭ Пропустить", их проверим в клубе.</li><li>Внизу каждого задания есть "💬 Оставь комментарий": поставьте 👍 или 👎 и коротко напишите, что понятно, а что нет. Тренер видит все комментарии.</li><li>Нашли ошибку (неверный ответ, опечатка, кнопка не работает) - жмите ⚠ у задания или "Нашёл ошибку?" внизу справа.</li></ol>
  <div class="kr-sec">Что писать в комментарии</div>
  <ul><li>какое слово, вопрос или пояснение было непонятно;</li><li>где ответ кажется неверным;</li><li>что было скучно или слишком долго;</li><li>что понравилось.</li></ul>
  <p class="mut">Краткость - сестра таланта: одна мысль - одна строка. Спасибо, что помогаете!</p>
  <button class="kr-btn pri" data-k="beta-ok">Понятно, начинаю</button></details>`;
}
function home() {
  if (isCoach() && !CO.as) { if (CO.st === 'idle') coLoad(); else coDraw(); return; }
  VIEW = { m: null, t: null, step: null };
  const live = K.mods.filter(m => m.tasks), tot = live.reduce((a, m) => a + m.tasks.length, 0), dn = live.reduce((a, m) => a + m.tasks.filter(taskDone).length, 0);
  const go = contTarget();
  let h = go ? `<button class="kr-btn pri kr-cont" data-k="task" data-t="${go.tid}"><span>${go.st ? '▶ Продолжить' : '▶ Начать'}: Модуль ${go.m.n} · "${E(K.lib[go.tid].t)}"</span><small>шаг ${go.st + 1} из ${K.lib[go.tid].steps.length}</small></button>` : '';
  h += `<div class="kr-card top">${bugBtn()}<h3>🎓 Твой прогресс</h3><p class="mut">Внутри модуля шаги открываются сами. Следующий модуль открывает тренер, когда проверит задания.</p>
    <div class="kr-bar"><i data-w="${tot ? dn / tot * 100 : 0}"></i></div><div class="kr-row"><span>Пройдено заданий: ${dn} из ${tot}</span><span>⭐ ${allPts()} очков</span></div></div>`;
  h += (BETA ? betaGuide() : `<div class="kr-note">🧪 Пробная версия: наполнены все 6 модулей, они открыты для проверки. В каждом модуле 3 уровня сложности (по классу).</div>`) + `${isCoach() ? '<div class="kr-back"><button class="kr-btn sm pri" data-k="co-home">👥 К ученикам (окно тренера)</button><span class="mut">Вы тренер: здесь курс глазами ученика, всё открыто.</span></div>' : ''}`;
  h += '<div class="kr-mods">' + K.mods.map((m, i) => {
    const op = modOpen(m), p = modProg(m), full = p === 1;
    const st = !m.tasks ? '🛠 готовится' : full ? '✓ модуль пройден' + (S.t[m.tasks[m.tasks.length - 1]] ? '' : '') : op ? '▶ ' + Math.round(p * 100) + '% пройдено' : '🔒 откроет тренер';
    return `<button class="kr-m ${op && !full ? 'on' : ''} ${!op ? 'lock' : ''}" data-k="mod" data-m="${m.id}" style="animation-delay:${i * 60}ms"><span class="e">${m.e}</span><span class="nn">МОДУЛЬ ${m.n}</span><b>${E(m.t)}</b><small>${E(m.sub)}</small>
      ${m.tasks ? `<div class="kr-bar"><i data-w="${p * 100}"></i></div>` : ''}<div class="st">${st}</div></button>`;
  }).join('') + '</div>';
  mount(h); bars();
}
/* куда вернуться: первое незаконченное открытое задание (пропущенные - в конце) */
function contTarget() {
  for (const m of K.mods) {
    if (!m.tasks || !modOpen(m) || modProg(m) === 1) continue;
    let k = m.tasks.findIndex((id, i) => !taskDone(id) && !(S.t[id] && S.t[id].skip) && taskOpen(m, i));
    if (k < 0) k = m.tasks.findIndex((id, i) => !taskDone(id) && taskOpen(m, i));
    if (k < 0) continue;
    const tid = m.tasks[k], t = S.t[tid], L = K.lib[tid], st = Math.max(0, L.steps.findIndex((x, i) => !(t && t.s[i] && t.s[i].ok)));
    return { m, tid, st };
  }
  return null;
}
function bars() { requestAnimationFrame(() => requestAnimationFrame(() => $$('.kr-bar i[data-w]', box).forEach(i => i.style.width = i.dataset.w + '%'))); }

function modView(id) {
  const m = K.mods.find(x => x.id === id); if (!m) return home();
  VIEW = { m: id, t: null, step: null };
  let h = `<div class="kr-back"><button class="kr-btn sm" data-k="home">← Все модули</button>${bugBtn()}</div>
    <div class="kr-card top"><span style="float:right;font-size:34px">${m.e}</span><div class="mut" style="font-weight:800;letter-spacing:.08em;font-size:12px">МОДУЛЬ ${m.n} ИЗ ${K.mods.length}</div><h3>${E(m.t)}</h3><p class="mut">${E(m.sub)}</p>`;
  if (!m.tasks) {
    h += `<div class="kr-sec" style="margin-top:14px">План модуля</div><ul class="kr-plan">${m.plan.map(p => `<li>${E(p)}</li>`).join('')}</ul><p class="mut" style="margin-top:10px">🛠 Задания этого модуля готовятся.</p></div>`;
    return mount(h);
  }
  const p = modProg(m);
  h += `<div class="kr-bar"><i data-w="${p * 100}"></i></div><div class="kr-row"><span>${m.tasks.filter(taskDone).length} из ${m.tasks.length} заданий${m.tasks.some(x => S.t[x] && S.t[x].skip && !taskDone(x)) ? ' · пропущено: ' + m.tasks.filter(x => S.t[x] && S.t[x].skip && !taskDone(x)).length : ''}</span><span>⭐ ${m.tasks.reduce((a, t) => a + taskPts(t), 0)} очков</span></div></div>`;
  if (!modOpen(m)) { h += '<div class="kr-wait">🔒 Этот модуль откроет тренер, когда проверит задания предыдущего.</div>'; return mount(h) || bars(); }
  const lv = lvlOf(m.id);
  h += `<div class="kr-card kr-lvc"><div class="kr-lvr"><span class="kr-sec">Уровень</span><div class="kr-lvs sm">${LV.map(v => `<button data-k="lvl" data-m="${m.id}" data-v="${v.n}" class="${v.n === lv ? 'on' : ''}" title="${E(v.s)}" aria-pressed="${v.n === lv}">${v.e} ${E(v.t)}</button>`).join('')}</div></div>
    <details class="kr-lvi"><summary>Что значит уровень?</summary><p class="mut">Задания те же, но глубже: больше подробностей, сложнее вопросы и расчёты. Уровень ставится по классу${S.lvl[m.id] ? '' : ' (сейчас: ' + E(lvInfo(lv).s) + ')'}, тренер может поменять. В пробной версии можно переключить самому.</p></details></div>`;
  if (p === 1) h += `<div class="kr-done">🎉 Модуль пройден! ${waitingCoach(m) ? 'Тренер проверит задания на занятии и откроет следующий модуль.' : 'Тренер откроет следующий модуль.'}</div>`;
  let curSet = false, lockN = 0;
  const lockAll = m.tasks.filter((x, k) => !taskOpen(m, k)).length, showAll = ROADALL[m.id];
  h += '<div class="kr-road">' + m.tasks.map((tid, k) => {
    const L = K.lib[tid], t = S.t[tid], done = taskDone(tid), op = taskOpen(m, k), sk = !!(t && t.skip && !done), cur = op && !done && !sk && !curSet; if (cur) curSet = true;
    /* закрытые: видно 2 следующих, остальные свёрнуты в одну строку */
    const hid = !op && ++lockN > 2 && !showAll;
    const dots = L.steps.map((st, i) => { const x = t && t.s[i]; return `<i class="${x && x.ok ? (x.viaX ? 'x' : 'ok') : ''}"></i>`; }).join('');
    const wait = t && coachWait(tid);
    const r = done ? `<span>✓ ${E(t.done)}<br>⭐ ${taskPts(tid)}</span>` : !op ? '🔒' : '';
    return `<button class="kr-t ${done ? 'ok' : ''} ${cur ? 'cur' : ''} ${!op ? 'lock' : ''}" data-k="task" data-t="${tid}" ${op ? '' : 'disabled'} ${hid ? 'hidden' : ''} style="animation-delay:${k * 45}ms">
      <span class="d">${done ? '✓' : k + 1}</span><span class="e">${L.e}</span><span style="min-width:0"><b>${E(L.t)}</b><small>${E(L.sub)}</small>${wait ? '<small class="wait">⏳ ждёт проверки тренера</small>' : ''}${sk ? '<small class="wait">⏭ пропущено, можно вернуться</small>' : ''}${t && t.cr ? '<small class="wait" style="color:#86efac">✓ засчитано тренером</small>' : ''}<span class="kr-steps">${dots}</span></span><span class="r">${r}</span></button>`;
  }).join('') + (lockAll > 2 && !showAll ? `<button class="kr-lmore" data-k="lockmore" data-m="${m.id}">🔒 Ещё ${plur(lockAll - 2, 'задание откроется', 'задания откроются', 'заданий откроются')} по порядку</button>` : '') + '</div>';
  mount(h); bars();
}
const ROADALL = {};
const coachWait = tid => { const L = K.lib[tid], t = S.t[tid]; return !!t && L.steps.some((st, i) => st.s === 'coach' && t.s[i] && t.s[i].ok && !t.s[i].acc); };
const waitingCoach = m => m.tasks.some(coachWait);

function taskView(tid, step) {
  const L = K.lib[tid], t = T(tid), m = K.mods.find(x => x.tasks && x.tasks.includes(tid));
  if (step == null) { step = L.steps.findIndex((st, i) => !(t.s[i] && t.s[i].ok)); if (step < 0) step = t.done ? -1 : 0; }
  VIEW = { m: m.id, t: tid, step };
  mount(`<div id="krHead">${taskHead(tid, step)}</div><div class="kr-card" id="krStage"></div>${BETA && step !== -1 && !isCoach() ? `<details class="kr-card kr-fbd"${T(tid).fb ? ' open' : ''}><summary>💬 Что-то непонятно? Оставь комментарий к заданию</summary>${likeRow(tid)}</details>` : ''}`);
  const stg = $('#krStage', box);
  if (step === -1) return summary(tid, stg);
  runStep(tid, step, stg);
}
/* шапка задания: шаги, счётчик, пропуск. Обновляется на месте после каждого пройденного шага */
function taskHead(tid, step) {
  const L = K.lib[tid], t = T(tid), m = modOf(tid);
  return `<div class="kr-back"><button class="kr-btn sm" data-k="mod" data-m="${m.id}">← Модуль ${m.n}</button>${t.done ? '<span class="mut kr-dn" style="margin-left:auto">✓ пройдено</span>' : t.skip ? '<span class="mut" style="margin-left:auto">⏭ пропущено</span>' : `<button class="kr-btn sm" style="margin-left:auto" data-k="skip" data-t="${tid}">⏭ Пропустить</button>`}${bugBtn()}</div>
    <div class="kr-card top"><span style="float:right;font-size:30px">${L.e}</span><h3>${E(L.t)}</h3><p class="mut">${E(L.sub)}</p><div style="margin-top:8px">${lvChip(lvlOf(m.id))} <span class="mut" style="margin-left:6px">${L.steps.filter((st, i) => t.s[i] && t.s[i].ok).length} из ${L.steps.length} шагов</span></div>
    <div class="kr-stp" style="margin-top:12px">${L.steps.map((st, i) => { const ok = t.s[i] && t.s[i].ok, can = i === 0 || (t.s[i - 1] && t.s[i - 1].ok) || ok || isCoach();
      return `<button data-k="step" data-i="${i}" class="${i === step ? 'on' : ''} ${ok ? 'ok' : ''}" ${can ? '' : 'disabled'}>${ok ? '✓ ' : ''}${i + 1}. ${E(stepName(st))}</button>`; }).join('')}
      <button data-k="step" data-i="-1" class="${step === -1 ? 'on' : ''}" ${t.done ? '' : 'disabled'}>📊 Итог</button></div></div>`;
}
function headSync() { const h = box && VIEW.t && $('#krHead', box); if (h) h.innerHTML = taskHead(VIEW.t, VIEW.step); navSync(); }
function stepName(st) { return { cards: 'Материал', game: 'Тренажёр', quiz: 'Проверка', fly: 'Полёт', coach: 'С тренером' }[st.s] || st.s; }

/* шаг пройден: отмечаем, открываем следующий */
function stepOk(tid, i, res) {
  const L = K.lib[tid], x = stepSt(tid, i);
  Object.assign(x, res || {}); x.ok = true; x.date = x.date || today();
  const t = T(tid);
  const all = L.steps.every((st, k) => t.s[k] && t.s[k].ok);
  let fresh = false;
  if (all && !t.done) { t.done = today(); t.skip = ''; fresh = true; }
  save();
  if (fresh) { snd('win'); buzz([30, 40, 60]); confetti(); toastK('Задание пройдено! +' + taskPts(tid) + ' очков'); }
  if (VIEW.t === tid) headSync();
  return fresh;
}
function nextBtn(tid, i) {
  const L = K.lib[tid];
  if (i < L.steps.length - 1) return `<button class="kr-btn pri" data-k="step" data-i="${i + 1}">Дальше: ${E(stepName(L.steps[i + 1]))} →</button>`;
  return `<button class="kr-btn pri" data-k="step" data-i="-1">📊 Итог задания</button>`;
}
function likeRow(tid) {
  const v = T(tid).like || 0;
  return `<div class="kr-like"><span class="mut">Как тебе задание?</span><button data-k="like" data-v="1" data-t="${tid}" class="${v === 1 ? 'on' : ''}" aria-label="Класс">👍</button><button data-k="like" data-v="-1" data-t="${tid}" class="${v === -1 ? 'on' : ''}" aria-label="Не очень">👎</button></div>
  <div class="kr-fb"><label for="fb-${tid}">💬 Что понятно, что нет? Напиши коротко</label><textarea id="fb-${tid}" maxlength="140" rows="2" placeholder="Например: не понял, чем Acro отличается от Angle">${E(T(tid).fb || '')}</textarea><button class="kr-btn sm" data-k="fb" data-t="${tid}">${T(tid).fb ? '✓ Отправлено, изменить' : 'Отправить тренеру'}</button></div>`;
}

function summary(tid, stg) {
  const L = K.lib[tid], t = T(tid), m = K.mods.find(x => x.tasks && x.tasks.includes(tid)), k = m.tasks.indexOf(tid), nx = m.tasks[k + 1];
  const rows = L.steps.map((st, i) => { const x = t.s[i] || {};
    const res = x.best != null ? Math.round(x.best * 100) + '%' + (x.att > 1 ? ' · ' + x.att + ' попыт.' : '') : x.ok ? '✓' : '-';
    const extra = x.viaX ? ' · 🔁 доп. задание' : '';
    const cw = st.s === 'coach' && x.ok ? (x.acc ? ' · ✓ тренер принял' : ' · ⏳ ждёт тренера') : '';
    const fl = st.s === 'fly' && x.v ? ' · ' + E(x.v) : '';
    const lvT = x.lv ? ' · ' + lvInfo(x.lv).e : '';
    return `<li><span>${i + 1}. ${E(stepName(st))}</span><span>${x.date ? E(x.date) + ' · ' : ''}${res}${lvT}${extra}${cw}${fl}</span></li>`; }).join('');
  stg.innerHTML = `<div class="kr-end"><div style="font-size:42px">${L.e}</div><b style="font-size:18px">${t.done ? 'Задание пройдено ' + E(t.done) : 'Задание в процессе'}</b><div class="big">⭐ ${taskPts(tid)}</div><div class="mut">из ${L.pts} возможных очков. Пересдай проверки, чтобы набрать больше.</div><div class="mut" style="margin-top:6px">Уровень: ${lvChip(lvlOf(m.id))}</div></div>
    <ul class="kr-hist">${rows}</ul>${likeRow(tid)}
    <div class="kr-end"><div class="acts">${nx ? `<button class="kr-btn pri" data-k="task" data-t="${nx}">Следующее задание →</button>` : `<button class="kr-btn pri" data-k="mod" data-m="${m.id}">К модулю</button>`}</div></div>`;
}

function runStep(tid, i, stg) {
  const st = K.lib[tid].steps[i];
  const R = { cards: cardsStep, game: gameStep, quiz: quizStep, fly: flyStep, coach: coachStep }[st.s];
  R(tid, i, st, stg);
}

/* ---------- материал карточками ---------- */
/* текст по уровню: строка или {1: 'суть', 2: 'подробнее', 3: '...'} - берём самый подробный, что не выше уровня */
function lvText(v, lv) { if (!v || typeof v !== 'object') return v || ''; for (let n = lv; n >= 1; n--) if (v[n]) return v[n]; return v[1] || ''; }
function moreHtml(cd, lv) {
  if (!cd.more || lv < 2) return '';
  return [2, 3].filter(n => n <= lv && cd.more[n]).map(n => `<div class="kr-more l${n}"><b>${lvInfo(n).e} ${n === 2 ? 'Глубже' : 'Ещё глубже'}</b>${E(cd.more[n])}</div>`).join('');
}
function cardsStep(tid, i, st, stg) {
  let c = 0; const N = st.cards.length, lv = lvlOf(modOf(tid).id);
  function draw(dir) {
    const cd = st.cards[c];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><div class="kr-cards"><div class="kr-cd" style="${dir < 0 ? 'animation-name:krIn' : ''}">${pic(cd.pic)}<h4>${E(cd.h)}</h4><p>${E(lvText(cd.p, lv))}</p>${moreHtml(cd, lv)}</div></div>
      <div class="kr-dots">${st.cards.map((x, k) => `<i class="${k === c ? 'on' : ''}"></i>`).join('')}</div>
      <div class="kr-nav">${c < N - 1 ? '<button class="kr-btn pri" data-c="1">Понятно, дальше →</button>' : '<button class="kr-btn pri" data-c="ok">✓ Всё понятно</button>'}</div>`;
    const go = v => {
      snd('tap');
      if (v === 'ok') { CARD = null; stepOk(tid, i, {}); stg.innerHTML = `<div class="kr-done">✓ Материал прочитан. Можно вернуться к нему в любой момент.</div><div class="kr-end"><div class="acts">${nextBtn(tid, i)}</div></div>`; navSync(); return; }
      c = Math.max(0, Math.min(N - 1, c + (+v))); draw(+v);
    };
    $$('[data-c]', stg).forEach(b => b.onclick = () => go(b.dataset.c));
    /* нижние "Назад / Вперёд" листают карточки */
    CARD = { tid, i, c, N, go: d => go(d > 0 && c >= N - 1 ? 'ok' : d) }; navSync();
    let x0 = null; const area = $('.kr-cards', stg);
    area.addEventListener('touchstart', e => x0 = e.touches[0].clientX, { passive: true });
    area.addEventListener('touchend', e => { if (x0 == null) return; const d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) < 50) return; const nc = c + (d < 0 ? 1 : -1); if (nc >= 0 && nc < N) { c = nc; draw(d < 0 ? 1 : -1); } }, { passive: true });
  }
  draw(1);
}

/* ---------- проверка (вопросы) + доп. задание ---------- */
/* вопрос = { l: уровень, q: вопрос, e: пояснение, a: [верный, неверные...] } */
const ah = v => fx(v, 2).replace(/0$/, '');     // 0,45 · 1,5 · 1,3
function genLabel(hint, lv) {
  lv = lv || 1;
  const S_ = pick(lv === 1 ? [2, 3, 4, 4] : [2, 3, 4, 4, 6]), mah = pick([450, 650, 850, 1300, 1500, 1800]), C = pick([45, 75, 100, 120]);
  const lbl = `${S_}S ${mah}mAh ${C}C`, A = mah / 1000;
  const types = ['s', 'full', 'land', 'bal'].concat(lv >= 2 ? ['cap', 'chg', 'cap', 'chg'] : [], lv >= 3 ? ['wh', 'imax', 'wh', 'imax'] : []);
  const typ = pick(types), n = (v, d) => fx(v, d == null ? 1 : d);
  const Qo = (q, e, ...a) => ({ l: lv, g: 'g.' + typ, q: `Наклейка "${lbl}". ${q}`, e, a });
  switch (typ) {
    case 's': { const w = k => k + (k === 1 ? ' банка' : k < 5 ? ' банки' : ' банок'); return Qo('Сколько банок в АКБ?', `Число перед S - сколько банок стоит "этажами": ${S_}S = ${w(S_)}.`, w(S_), w(S_ + 2), w(S_ === 1 ? 2 : 1)); }
    case 'full': return Qo(`Сколько вольт у полностью заряженной АКБ?${hint ? ' (банка 4,2 В x ' + S_ + ')' : ''}`, `Полная банка 4,2 В, банок ${S_}: ${S_} x 4,2 = ${n(S_ * 4.2)} В. ${n(S_ * 3.7)} В - это номинал, а не полный заряд.`, n(S_ * 4.2) + ' В', n(S_ * 3.7) + ' В', n(S_ * 4.2 + 4.2) + ' В');
    case 'land': return Qo(`При каких вольтах всей АКБ пора садиться?${hint ? ' (3,5 В x ' + S_ + ')' : ''}`, `Садимся около 3,5 В на банку: ${S_} x 3,5 = ${n(S_ * 3.5)} В.`, n(S_ * 3.5) + ' В', n(S_ * 4.2) + ' В', n(S_ * 3.5 - 3.5) + ' В');
    case 'cap': return Qo(`Сколько это ампер-часов?${hint ? ' (раздели mAh на 1000)' : ''}`, `"милли" = тысячная часть: ${mah} mAh : 1000 = ${ah(A)} А·ч.`, ah(A) + ' А·ч', n(A * 10) + ' А·ч', mah + ' А·ч');
    case 'chg': return Qo(`Каким током заряжать при 1C?${hint ? ' (ёмкость в амперах)' : ''}`, `1C - ток, равный ёмкости: ${mah} mAh = ${ah(A)} А·ч, значит заряжаем током ${ah(A)} А. Число ${C}C - это токоотдача при разряде, не для зарядки.`, ah(A) + ' А', n(A * C / 10) + ' А', n(C, 0) + ' А');
    case 'wh': { const wh = S_ * 3.7 * A; return Qo('Сколько энергии в АКБ, в ватт-часах?', `Энергия = номинал x ампер-часы: ${S_} x 3,7 = ${n(S_ * 3.7)} В, ${n(S_ * 3.7)} x ${ah(A)} = ${n(wh)} Вт·ч.`, n(wh) + ' Вт·ч', n(3.7 * A) + ' Вт·ч', n(S_ * A) + ' Вт·ч'); }
    case 'imax': return Qo('Какой самый большой ток она может отдать (по наклейке)?', `Максимальный ток = C x ёмкость в амперах: ${C} x ${ah(A)} = ${n(C * A, 0)} А. На деле обычно меньше, это число производителя.`, n(C * A, 0) + ' А', n(C, 0) + ' А', n(C * A * 10, 0) + ' А');
    default: return Qo(`Сколько проводов у балансировочного разъёма?${hint ? ' (на 1 больше, чем банок)' : ''}`, `Балансир идёт к каждому стыку банок: проводов на 1 больше, чем банок. ${S_}S - ${S_ + 1} провода(ов).`, String(S_ + 1), String(S_), String(S_ * 2));
  }
}
function genMix(lv) {
  const S_ = pick([1, 2, 3, 4, 6]);
  return pick([
    () => ({ l: 1, g: 'm.land', q: `В очках ${fx(S_ * 3.5)} В у АКБ ${S_}S, дрон летит спокойно, без полного газа. Что делаешь?`, e: `${fx(S_ * 3.5)} : ${S_} = 3,5 В на банку - пора садиться.`, a: ['Сажусь', 'Лечу ещё 5 кругов', 'Даю полный газ'] }),
    () => ({ l: 1, g: 'm.full', q: `Сколько вольт у полной АКБ ${S_}S?`, e: `${S_} x 4,2 = ${fx(S_ * 4.2)} В. ${fx(S_ * 3.7)} В - номинал, ${fx(S_ * 3.5)} В - пора садиться.`, a: [fx(S_ * 4.2) + ' В', fx(S_ * 3.7) + ' В', fx(S_ * 3.5) + ' В'] }),
    () => genLabel(false, lv)
  ])();
}
/* выбор вопросов по уровню: на 1 - только базовые; на 2 и 3 - больше половины своего уровня, остальные попроще */
function byLevel(pool, n, lv) {
  pool = pool.filter(q => (q.l || 1) <= lv);
  if (lv === 1) return shuf(pool).slice(0, n);
  const own = shuf(pool.filter(q => (q.l || 1) === lv)), low = shuf(pool.filter(q => (q.l || 1) < lv));
  const k = Math.min(own.length, Math.ceil(n * 0.6)), r = own.slice(0, k).concat(low.slice(0, n - k));
  if (r.length < n) r.push(...own.slice(k, k + n - r.length));
  return shuf(r);
}
function buildQs(st, extra, lv) {
  const L = K.lib, n = st.n || 5;
  if (st.gen === 'label') return Array.from({ length: n }, () => genLabel(extra, lv));
  if (st.from) {
    let pool = [];
    st.from.forEach(id => L[id].steps.forEach(s => { if (s.s === 'quiz' && s.pool) pool = pool.concat(extra ? (s.x || []) : s.pool); }));
    if (st.gen2 !== 'mix') return byLevel(pool, n, lv);
    const q = byLevel(pool, n - 2, lv); q.push(genMix(lv), genMix(lv)); return shuf(q);
  }
  const src = extra ? st.x : st.pool;
  return byLevel(src, extra ? Math.min(5, src.length) : n, lv);
}
function quizStep(tid, i, st, stg, forceX) {
  const x = stepSt(tid, i), pass = st.pass || PASS, lv = lvlOf(modOf(tid).id);
  const needX = forceX || (x.needX && !x.ok);
  const qs = buildQs(st, needX, lv).map(q => ({ q: q.q, e: q.e, l: q.l || 1, g: q.g, right: q.a[0], o: shuf(q.a.map((a, k) => ({ a, ok: k === 0 }))) }));
  let k = 0, ok = 0; const wrong = [];
  function draw() {
    const it = qs[k];
    stg.innerHTML = `<div class="kr-q">${needX ? '<div class="kr-hint">🔁 Доп. задание: те же темы, вопросы другими словами. Очки за него не начисляются, но без него дальше нельзя.</div>' : ''}
      <div class="kr-sec">${E(needX ? 'Доп. задание' : st.h)}</div><div class="top"><span>Вопрос ${k + 1} из ${qs.length}${it.l > 1 ? ' · ' + lvInfo(it.l).e : ''}</span><span>✓ ${ok}</span></div><div class="pr"><i style="width:${k / qs.length * 100}%"></i></div>
      <div class="qq">${E(it.q)}</div><div class="qa">${it.o.map((o, j) => `<button data-j="${j}" style="animation-delay:${j * 50}ms">${E(o.a)}</button>`).join('')}</div><div class="kq-r"></div></div>`;
    $$('.qa button', stg).forEach(b => b.onclick = () => {
      const o = it.o[+b.dataset.j]; $$('.qa button', stg).forEach(z => { z.disabled = true; if (it.o[+z.dataset.j].ok) z.classList.add('y'); });
      const nxt = () => { k++; k < qs.length ? draw() : end(); };
      if (o.ok) { ok++; snd('ok'); buzz(15); setTimeout(nxt, 650); return; }
      b.classList.add('n'); snd('bad'); buzz([40, 30, 40]); wrong.push(it);
      /* счётчик ошибок по вопросам: тренер видит "чаще всего ошибаются" */
      const w = x.w = x.w || {}, key = it.g || qh(it.q); w[key] = (w[key] || 0) + 1;
      const wk = Object.keys(w); if (wk.length > 30) { wk.sort((a, b) => w[a] - w[b]); delete w[wk[0] === key ? wk[1] : wk[0]]; }
      /* ошибся: показываем пояснение и ждём "Дальше" (верный ответ подсвечен зелёным) */
      const r = $('.kq-r', stg);
      r.innerHTML = `<div class="kr-why"><b>✗ Не так.</b>${E(it.e || 'Верный ответ подсвечен зелёным.')}<button class="kr-btn pri">${k < qs.length - 1 ? 'Понятно, дальше →' : 'Понятно, к итогу →'}</button></div>`;
      $('button', r).onclick = nxt;
      r.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'center' });
    });
  }
  const errList = () => wrong.length ? `<details class="kr-err" ${wrong.length <= 3 ? 'open' : ''}><summary>📝 Разбор ошибок (${wrong.length})</summary><ul>${wrong.map(w => `<li><b>${E(w.q)}</b><br>✓ ${E(w.right)}. ${E(w.e || '')}</li>`).join('')}</ul></details>` : '';
  function end() {
    const r = ok / qs.length, good = r >= pass;
    const lvR = Math.max(x.lv || 0, lv);
    if (needX) {
      x.xatt = (x.xatt || 0) + 1;
      if (good) { x.needX = false; stepOk(tid, i, { viaX: true, lv: lvR }); }
      else save();
      stg.innerHTML = `<div class="kr-end"><div style="font-size:40px">${good ? '💪' : '🧩'}</div><b>Доп. задание: ${ok} из ${qs.length}</b>
        <p class="mut" style="margin-top:6px">${good ? 'Отлично, тема освоена! Можно идти дальше. Основную проверку можно пересдать, чтобы получить больше очков.' : 'Пока не получилось. Перечитай материал и попробуй ещё раз - вопросы будут другие.'}</p>
        ${errList()}<div class="acts">${good ? nextBtn(tid, i) : '<button class="kr-btn" data-k="reread">📖 Материал</button><button class="kr-btn pri" data-k="retryx" data-i="' + i + '">🔁 Ещё раз</button>'}</div></div>`;
      return;
    }
    x.att = (x.att || 0) + 1; x.last = today();
    if (x.best == null || r > x.best) { x.best = r; x.bdate = today(); }
    if (good) stepOk(tid, i, { lv: lvR }); else { if (!x.ok) x.needX = true; save(); }
    const pct = Math.round(r * 100);
    stg.innerHTML = `<div class="kr-end"><div style="font-size:40px">${good ? (r === 1 ? '🏆' : '✅') : '🤔'}</div><div class="big">${ok} из ${qs.length}</div>
      <p class="mut">${good ? (r === 1 ? 'Без единой ошибки!' : 'Тема освоена. Можно пересдать на 100%.') : 'Меньше ' + Math.round(pass * 100) + '% - тему нужно закрепить.'} Лучший результат: ${Math.round(x.best * 100)}%.</p>
      ${errList()}
      ${!good && !x.ok ? `<div class="kr-x"><b>🔁 Обязательное доп. задание</b><p class="mut" style="margin-top:4px">Те же темы, вопросы с другой стороны. Без очков, но после него откроется следующий шаг.</p><div class="acts" style="justify-content:flex-start"><button class="kr-btn pri" data-k="retryx" data-i="${i}">Пройти доп. задание</button><button class="kr-btn" data-k="reread">📖 Сначала материал</button></div></div>` : ''}
      <div class="acts">${good ? nextBtn(tid, i) : ''}<button class="kr-btn" data-k="retry" data-i="${i}">↻ Пересдать (${pct}%)</button></div></div>`;
  }
  draw();
}

/* ---------- полёт ---------- */
function flyStep(tid, i, st, stg) {
  const x = stepSt(tid, i);
  if (x.ok) { stg.innerHTML = `<div class="kr-done">✓ Записано ${E(x.date)}: ${E(x.v || '')}</div><div class="kr-end"><div class="acts">${nextBtn(tid, i)}<button class="kr-btn" data-k="refly" data-i="${i}">✎ Записать новый результат</button></div></div>`; return; }
  stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><form class="kr-in">
    ${st.live ? '<label>Напряжение при посадке, В на банку<input name="v" inputmode="decimal" placeholder="например 3,5" required></label>' :
      `<label>Симулятор<select name="sim">${st.sims.map(s => `<option>${E(s)}</option>`).join('')}</select></label><label>Трасса<input name="tr" maxlength="40" placeholder="название трассы" required></label><label>Лучший круг, секунд<input name="v" inputmode="decimal" placeholder="например 42,5" required></label>`}
    <label>Комментарий (по желанию)<textarea name="c" rows="2" maxlength="140" placeholder="что получилось, что было трудно"></textarea></label>
    <button class="kr-btn pri">✓ Сделал</button></form>`;
  $('form', stg).onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target), v = String(f.get('v') || '').replace(',', '.'), n = parseFloat(v);
    if (!(n > 0)) { toastK('Впиши число'); return; }
    const txt = st.live ? fx(n, 2) + ' В при посадке' : f.get('sim') + ', ' + f.get('tr') + ': ' + fx(n, 1) + ' с';
    stepOk(tid, i, { v: txt, c: String(f.get('c') || '').slice(0, 140) }); snd('ok'); flyStep(tid, i, st, stg);
  };
}

/* ---------- задание с тренером ---------- */
function coachStep(tid, i, st, stg) {
  const x = stepSt(tid, i);
  if (x.ok) {
    stg.innerHTML = `${x.acc ? '<div class="kr-done">✓ Тренер принял задание.</div>' : `<div class="kr-wait">⏳ Отправлено ${E(x.date)}. Тренер проверит на занятии.</div>`}${x.c ? `<p class="mut" style="margin-top:10px">Твой комментарий: ${E(x.c)}</p>` : ''}
      <div class="kr-end"><div class="acts">${nextBtn(tid, i)}</div></div>`;
    return;
  }
  stg.innerHTML = `${x.ret ? `<div class="kr-wait" style="margin-bottom:12px">↩ Тренер вернул задание ${E(x.ret)}${x.retWhy ? ': ' + E(x.retWhy) : ''}. Доделай и отправь ещё раз.</div>` : ''}<div class="kr-sec">${E(st.h)}</div><p style="font-size:15px;margin-bottom:12px">✋ ${E(st.p)}</p><form class="kr-in"><label>Комментарий для тренера (по желанию)<textarea name="c" rows="2" maxlength="140" placeholder="коротко: что сделал"></textarea></label><button class="kr-btn pri">✓ Сделал, на проверку</button></form>`;
  $('form', stg).onsubmit = e => { e.preventDefault(); stepOk(tid, i, { c: String(new FormData(e.target).get('c') || '').slice(0, 140) }); snd('ok'); coachStep(tid, i, st, stg); };
}

/* ---------- тренажёры (сложность растёт с уровнем модуля) ---------- */
function gameStep(tid, i, st, stg, forceX) {
  const x = stepSt(tid, i), G = { build: gBuild, light: gLight, calc: gCalc, compare: gCompare, label: gLabel, story: gStory, sort: gSort, order: gOrder, match: gMatch }[st.g];
  const needX = forceX || (x.needX && !x.ok), lv = lvlOf(modOf(tid).id);
  G(stg, st, needX, r => {   // r: доля верных (или 1 для тренажёров без оценки)
    const pass = st.pass || PASS, good = r >= pass, lvR = Math.max(x.lv || 0, lv);
    if (needX) { x.xatt = (x.xatt || 0) + 1; if (good) { x.needX = false; stepOk(tid, i, { viaX: true, lv: lvR }); } else save(); }
    else { x.att = (x.att || 0) + 1; x.last = today(); if (st.g !== 'build' && st.g !== 'label') { if (x.best == null || r > x.best) x.best = r; }
      if (good) stepOk(tid, i, { lv: lvR }); else { if (!x.ok) x.needX = true; save(); } }
    const msg = good ? (needX ? 'Доп. задание пройдено, тема освоена!' : 'Отлично, тренажёр пройден!') : (needX ? 'Пока не вышло - попробуй ещё раз, числа будут другие.' : 'Нужно закрепить: пройди тренажёр ещё раз с подсказками (доп. задание, без очков).');
    stg.insertAdjacentHTML('beforeend', `<div class="kr-end" style="margin-top:12px"><b>${msg}</b><div class="acts">${good ? nextBtn(tid, i) : `<button class="kr-btn pri" data-k="${needX || !x.ok ? 'gamex' : 'game'}" data-i="${i}">🔁 ${!x.ok ? 'Доп. задание с подсказками' : 'Ещё раз'}</button>`}${good && st.g !== 'build' && st.g !== 'label' ? `<button class="kr-btn" data-k="game" data-i="${i}">↻ Ещё раз</button>` : ''}</div></div>`);
    $('.kr-end:last-child', stg).scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'nearest' });
  }, lv);
}
/* общий блок "ошибся - пояснение - Дальше" для тренажёров */
function whyBox(el, good, txt, last, go) {
  el.innerHTML = `<div class="kr-why ${good ? 'ok' : ''}"><b>${good ? '✓ Верно!' : '✗ Не совсем.'}</b>${E(txt)}<button class="kr-btn pri">${last ? 'Итог' : 'Дальше →'}</button></div>`;
  $('button', el).onclick = go;
  if (!good) el.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'center' });
}

/* ---------- общие тренажёры для любых модулей: все данные лежат в задании ---------- */
const byLv = (arr, lv) => arr.filter(x => (x[0] || 1) <= lv);
/* sort: карточка с ситуацией - выбери группу. st.cats [[значок, название]], st.items [[уровень, текст, номер группы, пояснение]] */
function gSort(stg, st, hint, done, lv) {
  const items = shuf(byLv(st.items, lv)).slice(0, [6, 8, 10][lv - 1] - (hint ? 1 : 0));
  let k = 0, ok = 0;
  function draw() {
    const it = items[k];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · ${k + 1} из ${items.length}</div>${hint && st.tip ? `<div class="kr-hint">Подсказка: ${E(st.tip)}</div>` : ''}
      <div class="kg-item">${E(it[1])}</div><div class="kg-opts">${st.cats.map((c, j) => `<button class="kr-opt" data-j="${j}">${c[0]} ${E(c[1])}</button>`).join('')}</div><div class="kq-r"></div>`;
    $$('.kr-opt', stg).forEach(b => b.onclick = () => {
      const j = +b.dataset.j, good = j === it[2];
      $$('.kr-opt', stg).forEach(z => { z.disabled = true; if (+z.dataset.j === it[2]) z.classList.add('y'); });
      if (good) { ok++; snd('ok'); } else { b.classList.add('n'); snd('bad'); buzz(40); }
      whyBox($('.kq-r', stg), good, it[3] || '', k === items.length - 1, () => { k++; if (k < items.length) draw(); else { stg.innerHTML = `<div class="kr-end"><div class="big">${ok} из ${items.length}</div></div>`; done(ok / items.length); } });
    });
  }
  draw();
}
/* order: нажимай по порядку. st.sets [{l, q, items: [в правильном порядке], why}] */
function gOrder(stg, st, hint, done, lv) {
  const sets = st.sets.filter(s => (s.l || 1) <= lv).slice(0, [3, 4, 5][lv - 1]);
  let k = 0, sc = 0;
  function draw() {
    const S = sets[k], pool = shuf(S.items.map((t, i) => ({ t, i })));
    let pos = 0, miss = 0;
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · ${k + 1} из ${sets.length}</div><div class="kg-goal">🎯 ${E(S.q)}</div>${hint ? `<div class="kr-hint">Подсказка: первым идёт "${E(S.items[0])}"</div>` : ''}
      <p class="mut" style="margin:4px 0 8px">Нажимай по порядку: что первое, что второе и дальше.</p>
      <ol class="kg-ord">${S.items.map(() => '<li></li>').join('')}</ol><div class="kg-pool">${pool.map(p => `<button class="kr-opt" data-i="${p.i}">${E(p.t)}</button>`).join('')}</div><div class="kq-r"></div>`;
    $$('.kg-pool button', stg).forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (i !== pos) { miss++; snd('bad'); buzz(30); b.classList.add('n'); setTimeout(() => b.classList.remove('n'), 450); return; }
      const li = $$('.kg-ord li', stg)[pos]; li.textContent = S.items[i]; li.classList.add('on'); b.disabled = true; b.classList.add('gone'); snd('tap'); pos++;
      if (pos < S.items.length) return;
      sc += Math.max(0, 1 - miss / S.items.length); snd(miss ? 'ok' : 'win');
      whyBox($('.kq-r', stg), !miss, (miss ? 'Ошибок: ' + miss + '. ' : 'Без ошибок! ') + (S.why || ''), k === sets.length - 1, () => {
        k++; if (k < sets.length) return draw();
        stg.innerHTML = `<div class="kr-end"><div class="big">${Math.round(sc / sets.length * 100)}%</div><div class="mut">порядок без ошибок</div></div>`; done(sc / sets.length);
      });
    });
  }
  draw();
}
/* match: найди пару. st.pairs [[уровень, слово, что это]] */
function gMatch(stg, st, hint, done, lv) {
  const P = shuf(byLv(st.pairs, lv)).slice(0, [4, 6, 8][lv - 1] - (hint ? 1 : 0)), R = shuf(P.map((p, i) => i));
  let sel = null, ok = 0, miss = 0;
  stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><p class="mut" style="margin-bottom:10px">Нажми слово слева, потом его пару справа.</p>
    <div class="kg-mt"><div>${P.map((p, i) => `<button class="kr-opt" data-a="${i}">${E(p[1])}</button>`).join('')}</div><div>${R.map(i => `<button class="kr-opt" data-b="${i}">${E(P[i][2])}</button>`).join('')}</div></div>`;
  $$('[data-a]', stg).forEach(b => b.onclick = () => { $$('[data-a]', stg).forEach(z => z.classList.remove('sel')); sel = +b.dataset.a; b.classList.add('sel'); snd('tap'); });
  $$('[data-b]', stg).forEach(b => b.onclick = () => {
    if (sel == null) { toastK('Сначала нажми слово слева'); return; }
    const a = $(`[data-a="${sel}"]`, stg);
    if (+b.dataset.b !== sel) { miss++; snd('bad'); buzz(30); b.classList.add('n'); setTimeout(() => b.classList.remove('n'), 450); return; }
    a.disabled = b.disabled = true; a.classList.remove('sel'); a.classList.add('y'); b.classList.add('y'); ok++; sel = null; snd('ok');
    if (ok === P.length) { stg.insertAdjacentHTML('beforeend', `<div class="kr-end"><div class="big">${miss ? 'Ошибок: ' + miss : 'Без ошибок!'}</div></div>`); done(P.length / (P.length + miss)); }
  });
}

/* собери АКБ из банок: цели по очереди. Уровень 2-3: цель задана вольтами или ёмкостью - сначала посчитай */
function gBuild(stg, st, hint, done, lv) {
  const G1 = [['Собери АКБ 1S, как у Mobula 7', 1, 'ser'], ['Собери 4S - как у гоночного 5-дюймового дрона', 4, 'ser'], ['Собери 6S - самую мощную', 6, 'ser'], ['Поставь 2 банки рядом: бак в 2 раза больше (2P)', 2, 'par']];
  const G2 = [['Собери АКБ, у которой полная зарядка 12,6 В', 3, 'ser', '12,6 : 4,2 = 3 банки этажами (3S)'], ['Собери 4S - как у гоночного 5-дюймового дрона', 4, 'ser'], ['Номинал (обычное напряжение) 22,2 В - сколько банок?', 6, 'ser', '22,2 : 3,7 = 6 банок (6S)'], ['Нужен бак 900 mAh из банок по 450 mAh', 2, 'par', '900 : 450 = 2 банки рядом (2P)']];
  const G3 = [['Пора садиться при 7 В. Собери такую АКБ', 2, 'ser', '7 : 3,5 = 2 банки (2S)'], ['Полная зарядка 16,8 В', 4, 'ser', '16,8 : 4,2 = 4 банки (4S)'], ['Номинал 22,2 В', 6, 'ser', '22,2 : 3,7 = 6 банок (6S)'], ['Бак 1350 mAh из банок по 450 mAh', 3, 'par', '1350 : 450 = 3 банки рядом (3P)']];
  const goals = lv >= 3 ? G3 : lv === 2 ? G2 : G1;
  let g = 0, n = 1, mode = 'ser';
  function draw() {
    const [txt, , , tip] = goals[g], ser = mode === 'ser';
    const v = ser ? n * 3.7 : 3.7, vf = ser ? n * 4.2 : 4.2, cap = ser ? 450 : 450 * n;
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · цель ${g + 1} из ${goals.length}</div><div class="kg-goal">🎯 ${E(txt)}</div>${hint && tip ? `<div class="kr-hint">Подсказка: ${E(tip)}</div>` : ''}
      <div class="kg-stack ${ser ? 'ser' : 'par'}">${Array.from({ length: n }, (_, k) => `<div class="kg-cell" style="animation-delay:${k * 40}ms">3,7</div>`).join('')}</div>
      <p class="mut" style="text-align:center;margin:0 0 10px">${ser ? '⇅ Столбик = "этажами" (последовательно): плюс одной банки к минусу следующей. Вольты складываются, бак как у одной банки.' : '⇄ Ряд = "рядом" (параллельно): все плюсы вместе, все минусы вместе. Вольты как у одной банки, бак складывается.'}</p>
      <div class="kg-read"><div><b>${ser ? n + 'S' : n + 'P'}</b><small>запись</small></div><div><b>${fx(v)} В</b><small>обычное (полная ${fx(vf)})</small></div><div><b>${cap}</b><small>mAh, бак</small></div></div>
      <div class="kg-ctl" style="margin-top:12px"><button class="kr-btn" data-b="-">− банка</button><button class="kr-btn" data-b="+">+ банка</button><button class="kr-btn" data-b="m">${ser ? '⇄ Поставить рядом' : '⇅ Поставить этажами'}</button></div>`;
    $$('[data-b]', stg).forEach(b => b.onclick = () => {
      const a = b.dataset.b; if (a === '+') n = Math.min(6, n + 1); else if (a === '-') n = Math.max(1, n - 1); else mode = ser ? 'par' : 'ser';
      snd('tap'); draw(); check();
    });
  }
  function check() {
    const [, need, nm, tip] = goals[g];
    if (n === need && mode === nm) {
      snd('ok'); buzz(20);
      setTimeout(() => { g++; if (g < goals.length) { n = 1; mode = 'ser'; draw(); toastK('✓ Готово!' + (tip ? ' ' + tip : ' Следующая цель')); } else { stg.querySelector('.kg-ctl').innerHTML = '<div class="kr-done">✓ Все 4 цели выполнены. Запомни: этажами - вольты растут, рядом - растёт бак.</div>'; done(1); } }, 700);
    }
  }
  draw();
}

/* светофор: лететь или садиться (напряжение одной банки без газа). Уровень 3: попадаются банки LiHV */
function gLight(stg, st, hint, done, lv) {
  const Z = [['Полностью заряжена', [4.2, 4.18, 4.16], 'от 4,15 до 4,2 В - полный бак обычной LiPo'], ['Можно летать', [3.95, 3.9, 3.85, 3.8, 3.75, 3.7, 3.65], 'от 3,65 до 4,0 В - в баке ещё есть энергия, летаем'],
    ['Пора садиться', [3.55, 3.5, 3.45], 'около 3,5 В - сигнал на посадку'], ['Опасно мало', [3.25, 3.2, 3.1, 3.0, 2.9], 'ниже 3,3 В - переразряд, АКБ портится. Сказать тренеру']];
  let rounds = Z.flatMap((z, zi) => shuf(z[1]).slice(0, 2).map(v => ({ v, zi, t: 'LiPo' })));
  if (lv >= 2) rounds = rounds.concat([{ v: pick([3.6, 3.62]), zi: 1, t: 'LiPo', e: '3,6 В - ещё можно, но скоро садиться. Без газа вольты чуть выше, чем на газу' }]);
  if (lv >= 3) rounds = rounds.concat([{ v: pick([4.35, 4.33, 4.3]), zi: 0, t: 'LiHV', e: 'У LiHV полная банка 4,35 В, так что 4,3 В - это почти полная' }, { v: 4.35, zi: 3, t: 'LiPo', e: 'Обычная LiPo выше 4,2 В - перезаряд, это опасно. Скорее всего заряжали в режиме LiHV. Сказать тренеру', opt3: 'Опасно: перезаряд или мало' }]);
  rounds = shuf(rounds).slice(0, lv >= 3 ? 10 : lv === 2 ? 9 : 8);
  let k = 0, ok = 0;
  const pos = v => Math.max(0, Math.min(100, (v - 2.9) / (4.4 - 2.9) * 100));
  function draw() {
    const R = rounds[k];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · ${k + 1} из ${rounds.length}</div>${hint ? '<div class="kr-hint">Подсказка: 4,2 полная · 3,5 пора садиться · ниже 3,3 опасно' + (lv >= 3 ? ' · LiHV полная 4,35' : '') + '</div>' : ''}
      <div class="kg-volt">${fx(R.v, 2)} В</div><div class="kg-gauge"><i style="left:${pos(4.4)}%"></i></div><p class="mut" style="text-align:center;margin-bottom:10px">одна банка${R.t === 'LiHV' ? ' <b>LiHV</b>' : lv >= 3 ? ' обычная LiPo' : ''}, без газа (дрон стоит или висит)</p>
      <div class="kg-opts">${Z.map((z, j) => `<button class="kr-opt" data-j="${j}">${['🟢', '🔵', '🟡', '🔴'][j]} ${E(j === 3 && lv >= 3 ? 'Опасно: перезаряд или мало' : z[0])}</button>`).join('')}</div><div class="kq-r"></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const i = $('.kg-gauge i', stg); if (i) i.style.left = pos(R.v) + '%'; }));
    $$('.kr-opt', stg).forEach(b => b.onclick = () => {
      const j = +b.dataset.j, good = j === R.zi; $$('.kr-opt', stg).forEach(z => { z.disabled = true; if (+z.dataset.j === R.zi) z.classList.add('y'); });
      const nxt = () => { k++; if (k < rounds.length) draw(); else { stg.innerHTML = `<div class="kr-end"><div class="big">${ok} из ${rounds.length}</div></div>`; done(ok / rounds.length); } };
      if (good) { ok++; snd('ok'); setTimeout(nxt, 700); return; }
      b.classList.add('n'); snd('bad'); buzz(40);
      whyBox($('.kq-r', stg), false, fx(R.v, 2) + ' В: ' + (R.e || Z[R.zi][2]) + '.', k === rounds.length - 1, nxt);
    });
  }
  draw();
}

/* посчитай: уровень 1 - вольты; 2 - плюс ёмкость и ток зарядки; 3 - плюс энергия, макс. ток, время полёта */
function gCalc(stg, st, hint, done, lv) {
  const N = st.n || 6;
  const T1 = ['full', 'land', 'nom', 'per'], T2 = T1.concat(['ah', 'chg', 'left']), T3 = T2.concat(['wh', 'imax', 'time', 'wh', 'imax']);
  const types = lv >= 3 ? T3 : lv === 2 ? T2 : T1, SS = lv === 1 ? [1, 2, 3, 4] : [1, 2, 3, 4, 6];
  const mk = () => {
    const s = pick(SS), t = pick(types), mah = pick([450, 650, 850, 1300, 1500]), A = mah / 1000, C = pick([75, 100, 120]);
    if (t === 'full') return [`Сколько вольт у полностью заряженной АКБ ${s}S?`, s * 4.2, `${s} x 4,2 = ${fx(s * 4.2)} В`, 'В'];
    if (t === 'land') return [`При каком напряжении всей АКБ ${s}S пора садиться?`, s * 3.5, `${s} x 3,5 = ${fx(s * 3.5)} В`, 'В'];
    if (t === 'nom') return [`Какое "обычное" напряжение (номинал) у АКБ ${s}S?`, s * 3.7, `${s} x 3,7 = ${fx(s * 3.7)} В`, 'В'];
    if (t === 'ah') return [`АКБ ${mah} mAh. Сколько это ампер-часов?`, A, `${mah} : 1000 = ${ah(A)} А·ч`, 'А·ч'];
    if (t === 'chg') return [`АКБ ${s}S ${mah} mAh. Каким током заряжать при 1C?`, A, `1C = ёмкость в амперах: ${mah} : 1000 = ${ah(A)} А`, 'А'];
    if (t === 'left') { const s2 = pick([2, 3, 4, 6]), per = pick([3.9, 3.8, 3.7]); return [`АКБ ${s2}S, в очках ${fx(per * s2)} В. Сколько вольт осталось до посадки (3,5 В на банку)?`, (per - 3.5) * s2, `Посадка при ${s2} x 3,5 = ${fx(s2 * 3.5)} В. ${fx(per * s2)} - ${fx(s2 * 3.5)} = ${fx((per - 3.5) * s2)} В`, 'В']; }
    if (t === 'wh') return [`Сколько энергии в АКБ ${s}S ${mah} mAh, в ватт-часах?`, s * 3.7 * A, `Номинал ${s} x 3,7 = ${fx(s * 3.7)} В, ёмкость ${ah(A)} А·ч. ${fx(s * 3.7)} x ${ah(A)} = ${fx(s * 3.7 * A)} Вт·ч`, 'Вт·ч'];
    if (t === 'imax') return [`АКБ ${mah} mAh ${C}C. Какой самый большой ток по наклейке?`, C * A, `${C} x ${ah(A)} = ${fx(C * A, 0)} А`, 'А'];
    if (t === 'time') { const I = pick([10, 12, 15, 20]), m2 = pick([1000, 1300, 1500]), A2 = m2 / 1000, mins = A2 * 0.8 / I * 60;
      return [`АКБ ${m2} mAh. Дрон тратит в среднем ${I} А. Используем 80% ёмкости, чтобы беречь АКБ. Сколько минут полёта?`, mins, `80% от ${ah(A2)} А·ч = ${fx(A2 * 0.8, 2)} А·ч. ${fx(A2 * 0.8, 2)} : ${I} А = ${fx(A2 * 0.8 / I, 3)} ч. x 60 = ${fx(mins, 1)} мин`, 'мин']; }
    const per = pick([4.2, 3.9, 3.8, 3.7, 3.5]), s2 = pick([2, 3, 4, 6]);
    return [`В очках ${fx(per * s2)} В у АКБ ${s2}S. Сколько на одну банку?`, per, `${fx(per * s2)} : ${s2} = ${fx(per)} В`, 'В'];
  };
  const items = Array.from({ length: N }, mk);
  let k = 0, ok = 0;
  const HINT = ['Подсказка: вся АКБ = банка x S. Полная 4,2 · номинал 3,7 · садиться 3,5', ' · А·ч = mAh : 1000 · 1C = ёмкость в амперах', ' · Вт·ч = номинал x А·ч · макс. ток = C x А·ч'];
  function draw() {
    const it = items[k];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · ${k + 1} из ${N}</div>${hint ? '<div class="kr-hint">' + E(HINT.slice(0, lv).join('')) + '</div>' : ''}
      <div class="qq" style="font-size:17px;font-weight:700;margin-bottom:12px">${E(it[0])}</div>
      <form class="kr-in"><label>Ответ, ${E(it[3])}<input name="a" inputmode="decimal" autocomplete="off" placeholder="число" required></label><button class="kr-btn pri">Проверить</button></form><div id="kcR"></div>`;
    const inp = $('input', stg); setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 100);
    $('form', stg).onsubmit = e => {
      e.preventDefault(); const a = parseFloat(String(inp.value).replace(',', '.')); if (isNaN(a)) return;
      const good = Math.abs(a - it[1]) <= Math.max(0.06, Math.abs(it[1]) * 0.03); if (good) { ok++; snd('ok'); } else { snd('bad'); buzz(40); }
      $('form button', stg).disabled = true; inp.disabled = true;
      whyBox($('#kcR', stg), good, (good ? '' : 'Твой ответ ' + fx(a, 2).replace(/,?0+$/, '') + '. ') + it[2] + '.', k === N - 1, () => { k++; if (k < N) draw(); else { stg.innerHTML = `<div class="kr-end"><div class="big">${ok} из ${N}</div></div>`; done(ok / N); } });
    };
  }
  draw();
}

/* сравни две АКБ. Уровень 2: макс. ток (C x ёмкость). Уровень 3: энергия в Вт·ч */
function gCompare(stg, st, hint, done, lv) {
  const N = st.n || 5, R = [], types = ['long', 'pow', 'c'].concat(lv >= 2 ? ['imax', 'imax'] : [], lv >= 3 ? ['wh', 'wh'] : []);
  const card = p => ({ s: p[0], m: p[1], c: p[2] });
  for (let i = 0; i < N; i++) {
    const t = types[i < 3 && lv === 1 ? i : Math.floor(Math.random() * types.length)];
    if (t === 'long') { const s = pick([1, 4, 6]), m1 = pick([450, 650, 850, 1300]), m2 = m1 + pick([200, 400, 500]); R.push(['Какая АКБ даст дольше полёт на том же дроне?', shuf([[card([s, m1, 100]), 0], [card([s, m2, 100]), 1]]), `Больше mAh - больше бак, дольше полёт (но АКБ тяжелее). ${m2} больше, чем ${m1}.`]); continue; }
    if (t === 'pow') { const m = pick([850, 1300, 1500]); R.push(['Какая АКБ мощнее (моторы крутятся быстрее)?', shuf([[card([4, m, 100]), 0], [card([6, m, 100]), 1]]), 'Больше банок (S) - выше напряжение, моторы крутятся быстрее. 6S: 22,2 В, 4S: 14,8 В.']); continue; }
    if (t === 'imax') {
      const P = pick([[[1300, 100], [1500, 75]], [[850, 120], [1300, 75]], [[1500, 45], [1000, 100]], [[650, 100], [1300, 45]]]), s = pick([4, 6]);
      const a = card([s, P[0][0], P[0][1]]), b = card([s, P[1][0], P[1][1]]), ia = a.c * a.m / 1000, ib = b.c * b.m / 1000, w = ia > ib ? 0 : 1;
      R.push(['Какая АКБ может отдать больше тока сразу? Посчитай: C x ёмкость в амперах', shuf([[a, w === 0 ? 1 : 0], [b, w === 1 ? 1 : 0]]), `${a.c} x ${ah(a.m / 1000)} = ${fx(ia, 0)} А, ${b.c} x ${ah(b.m / 1000)} = ${fx(ib, 0)} А. Одно большое число C ещё не значит больше тока.`]); continue;
    }
    if (t === 'wh') {
      const P = pick([[[4, 1500], [6, 1100]], [[4, 1300], [6, 850]], [[6, 650], [4, 1100]], [[3, 1500], [4, 1000]]]);
      const a = card([P[0][0], P[0][1], 100]), b = card([P[1][0], P[1][1], 100]), wa = a.s * 3.7 * a.m / 1000, wb = b.s * 3.7 * b.m / 1000, w = wa > wb ? 0 : 1;
      R.push(['В какой АКБ больше энергии? Посчитай ватт-часы: номинал x А·ч', shuf([[a, w === 0 ? 1 : 0], [b, w === 1 ? 1 : 0]]), `${a.s}S ${a.m}: ${fx(a.s * 3.7)} x ${ah(a.m / 1000)} = ${fx(wa)} Вт·ч. ${b.s}S ${b.m}: ${fx(b.s * 3.7)} x ${ah(b.m / 1000)} = ${fx(wb)} Вт·ч.`]); continue;
    }
    const m = pick([850, 1300, 1500]), s = pick([4, 6]);
    R.push(['Какая АКБ лучше выдержит полный газ и не "задохнётся"?', shuf([[card([s, m, pick([25, 45])]), 0], [card([s, m, pick([100, 120])]), 1]]), 'Больше C - шире "шланг", АКБ отдаёт больше тока сразу и меньше проседает.']);
  }
  let k = 0, ok = 0;
  function draw() {
    const [q, pair, why] = R[k];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · ${k + 1} из ${N}</div>${hint ? '<div class="kr-hint">Подсказка: mAh - бак, S - сила, C - шланг' + (lv >= 2 ? ' · ток = C x А·ч' : '') + (lv >= 3 ? ' · Вт·ч = S x 3,7 x А·ч' : '') + '</div>' : ''}<div class="qq" style="font-size:16.5px;font-weight:700;margin-bottom:12px">${E(q)}</div>
      <div class="kg-cmp">${pair.map((p, j) => `<button class="kg-akb" data-j="${j}" style="animation-delay:${j * 80}ms"><span style="font-size:30px">🔋</span><b>${p[0].s}S</b><small>${p[0].m} mAh</small><small>${p[0].c}C</small></button>`).join('')}</div><div id="kcR"></div>`;
    $$('.kg-akb', stg).forEach(b => b.onclick = () => {
      const j = +b.dataset.j, good = pair[j][1] === 1; $$('.kg-akb', stg).forEach(z => { z.disabled = true; if (pair[+z.dataset.j][1] === 1) z.classList.add('y'); });
      if (good) { ok++; snd('ok'); } else { b.classList.add('n'); snd('bad'); buzz(40); }
      whyBox($('#kcR', stg), good, why, k === N - 1, () => { k++; if (k < N) draw(); else { stg.innerHTML = `<div class="kr-end"><div class="big">${ok} из ${N}</div></div>`; done(ok / N); } });
    });
  }
  draw();
}

/* наклейка по частям. Уровень 2: + разъём. Уровень 3: + ватт-часы */
function gLabel(stg, st, hint, done, lv) {
  const P = [['4S', '4 банки "этажами". Полная 4 x 4,2 = 16,8 В, садиться при 4 x 3,5 = 14 В.'], ['1500mAh', 'Ёмкость - размер бака: 1500 mAh = 1,5 А·ч. Заряжаем током 1,5 А (1C).'], ['120C', 'Токоотдача - ширина "шланга": сколько энергии АКБ может отдать сразу на полном газу.' + (lv >= 2 ? ' Максимум по наклейке: 120 x 1,5 = 180 А.' : '')], ['14.8V', 'Номинал всей АКБ: 4 x 3,7 = 14,8 В. Это "обычное" напряжение, не полный заряд.'], ['LiPo', 'Тип банок: литий-полимер. Полная банка 4,2 В. Если написано LiHV - до 4,35 В.']];
  if (lv >= 2) P.push(['XT60', 'Разъём силовых проводов. У 5-дюймовых дронов обычно XT60, у маленьких - XT30 или PH2.0. Разъём АКБ и дрона должен совпадать.']);
  if (lv >= 3) P.push(['22.2Wh', 'Энергия: 14,8 В x 1,5 А·ч = 22,2 Вт·ч. По ней сравнивают АКБ с разным числом банок; в самолёт берут АКБ до 100 Вт·ч.']);
  const seen = new Set();
  stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><div class="kg-lbl">${P.map((p, j) => `<button data-j="${j}">${p[0]}</button>`).join('')}</div><div class="kg-exp" id="kgE">👆 Нажимай на части наклейки по очереди. Открыто 0 из ${P.length}.</div>`;
  $$('.kg-lbl button', stg).forEach(b => b.onclick = () => {
    const j = +b.dataset.j; seen.add(j); b.classList.add('ok'); snd('tap');
    $('#kgE', stg).innerHTML = `<b>${P[j][0]}</b> - ${E(P[j][1])}<br><small class="mut">Открыто ${seen.size} из ${P.length}</small>`;
    $('#kgE', stg).style.animation = 'none'; $('#kgE', stg).offsetWidth; $('#kgE', stg).style.animation = '';
    if (seen.size === P.length && !stg._d) { stg._d = 1; snd('ok'); done(1); }
  });
}

/* найди ошибки в истории: на уровне выше больше предложений */
function gStory(stg, st, hint, done, lv) {
  const SRC = st.story || K.story, n = Math.min(SRC.length, [6, 7, 9][(lv || 1) - 1] - (hint ? 1 : 0));
  /* в каждой истории хотя бы 2 ошибки и 2 верных шага */
  let L; do { L = shuf(SRC).slice(0, n); } while (L.filter(s => s[1]).length < 2 || L.filter(s => !s[1]).length < 2);
  const sel = new Set();
  stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><p class="mut" style="margin-bottom:10px">Нажми на предложения, где ${E(st.who || 'Петя')} ${st.she ? 'ошиблась' : 'ошибся'}, потом "Проверить".${hint ? ' Подсказка: ' + E(st.tip || 'ошибки про тепло, присмотр, вздутие и режим зарядки.') : ''}</p>
    <div class="kg-story">${L.map((s, j) => `<button data-j="${j}">${E(s[0])}</button>`).join('')}</div><div class="kr-end"><div class="acts"><button class="kr-btn pri" id="kgC">Проверить</button></div></div>`;
  $$('.kg-story button', stg).forEach(b => b.onclick = () => { const j = +b.dataset.j; sel.has(j) ? sel.delete(j) : sel.add(j); b.classList.toggle('sel'); snd('tap'); });
  $('#kgC', stg).onclick = function () {
    let ok = 0; this.parentNode.parentNode.remove();
    $$('.kg-story button', stg).forEach(b => { const j = +b.dataset.j, err = L[j][1] === 1, good = err === sel.has(j); if (good) ok++; b.disabled = true; b.classList.remove('sel'); b.classList.add(good ? 'y' : 'n'); b.insertAdjacentHTML('beforeend', `<small>${err ? '❌ ошибка: ' : /^верно/i.test(L[j][2]) ? '✓ ' : '✓ верно: '}${E(L[j][2])}</small>`); });
    stg.insertAdjacentHTML('beforeend', `<div class="kr-end"><div class="big">${ok} из ${L.length}</div></div>`); snd(ok === L.length ? 'win' : 'ok'); done(ok / L.length);
  };
}

/* ---------- связь с общим сервером СПЕКТРа ----------
   Ученик (вошёл по коду в "🏆 Рейтинг"): прогресс курса уходит на сервер (op ksync), в ответ приходят решения тренера:
   открытые модули, принятые и возвращённые задания, уровень по модулям.
   Тренер (вход по PIN): видит всех учеников по модулям (slist), открывает модули, принимает задания (sset act kurs). */
const SPK_API = 'https://script.google.com/macros/s/AKfycbwmh9Ksw7lm9pYZCy3ao-mvZ5ogKbFM7E66zJIAa5ZvorA6q7FLH8ZlFZvFK9RKHRM-/exec';
const spkCall = q => fetch(SPK_API, { method: 'POST', body: JSON.stringify(q) }).then(r => r.json());
const sesS = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
function meK() { try { const P = JSON.parse(localStorage.getItem('spk_vzlet') || 'null'); return P && P.code && P.status === 'принят' ? P : null; } catch (e) { return null; } }

/* краткая сводка для тренера: по заданию - шаги (o пройден, x через доп. задание, n нужно доп. задание, w ждёт тренера, - нет), % и т.д. */
function kSummary() {
  const t = {};
  Object.keys(S.t).forEach(id => {
    const L = K.lib[id], z = S.t[id]; if (!L || !z) return;
    let att = 0, lv = 0, best = [], c = '', f = '', wd = '';
    const w = {};
    const s = L.steps.map((st, i) => { const x = z.s[i] || {}; att += (x.att || 0) + (x.xatt || 0); lv = Math.max(lv, x.lv || 0); if (x.best != null) best.push(x.best); if (x.c) c = x.c; if (x.v) f = x.v;
      if (x.w) Object.keys(x.w).forEach(k => w[k] = (w[k] || 0) + x.w[k]);
      const ch = x.ok ? (st.s === 'coach' && !x.acc ? 'w' : x.viaX ? 'x' : 'o') : x.needX ? 'n' : '-'; if (ch === 'w') wd = x.date || '';
      return ch; }).join('');
    if (s.replace(/-/g, '') === '' && !z.like && !z.skip && !z.fb) return;
    t[id] = { s, p: best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length * 100) : null, a: att, d: z.done || z.was || '', l: lv || lvlOf((modOf(id) || {}).id), k: z.like || 0, sk: z.skip && !z.done ? 1 : 0, c: String(c).slice(0, 140), f: String(f).slice(0, 60) };
    /* новые поля: w - до 5 вопросов, где чаще ошибался (ключ вопроса: число ошибок), wd - когда отправил тренеру */
    const wk = Object.keys(w).sort((a, b) => w[b] - w[a]).slice(0, 5);
    if (wk.length) { t[id].w = {}; wk.forEach(k => t[id].w[k] = w[k]); }
    if (wd) t[id].wd = wd;
    if (z.fb) t[id].fb = String(z.fb).slice(0, 140);
  });
  return { v: 1, t, pts: allPts(), lv: S.lvl };
}
let kT = 0, kBusy = false;
function kSync(soon) {
  const P = meK(); if (!P || isCoach()) return;
  clearTimeout(kT);
  kT = setTimeout(() => {
    if (kBusy) return kSync(true); kBusy = true;
    spkCall({ op: 'ksync', code: P.code, club: 'vzlet', e: P.e || 0, k: kSummary() }).then(j => {
      kBusy = false;
      if (j && j.retry) return kSync(true);
      if (j && j.ok && j.kc && !j.reset) applyKc(j.kc);
    }).catch(() => { kBusy = false; });
  }, soon ? 9000 : 1500);
}
/* решения тренера с сервера */
function applyKc(kc) {
  let ch = false;
  const o = Array.isArray(kc.o) ? kc.o : [];
  if (JSON.stringify(o) !== JSON.stringify(S.open || [])) { S.open = o; ch = true; }
  Object.keys(kc.a || {}).forEach(id => { const L = K.lib[id], z = S.t[id]; if (!L) return;
    /* "засчитать без выполнения": задание не начато - тренер засчитал, без очков */
    if (!z || (!z.done && !L.steps.some((st, i) => z.s[i] && z.s[i].ok))) { const t = T(id); if (!t.done) { t.done = kc.a[id]; t.cr = kc.a[id]; t.skip = ''; ch = true; } return; }
    L.steps.forEach((st, i) => { const x = z.s[i]; if (st.s === 'coach' && x && x.ok && !x.acc) { x.acc = kc.a[id]; ch = true; } }); });
  Object.keys(kc.r || {}).forEach(id => { const L = K.lib[id], z = S.t[id], r = kc.r[id] || []; if (!L || !z) return;
    L.steps.forEach((st, i) => { const x = z.s[i]; if (st.s === 'coach' && x && x.ok && x.ret !== r[0]) { x.ok = false; x.acc = false; x.ret = r[0]; x.retWhy = r[1] || ''; if (z.done) { z.was = z.done; z.done = ''; } ch = true; } }); });
  if (kc.v && kc.at && kc.at !== S.kcat) { Object.assign(S.lvl, kc.v); S.kcat = kc.at; ch = true; }
  if (!ch) return;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  if (box && VIEW.t == null) { VIEW.m ? modView(VIEW.m) : home(); }
}

/* ---------- окно тренера ---------- */
let CO = { tab: sesS.get('vz_co_tab') || 'gr', st: 'idle', list: [], err: '', tok: '', demo: false, sel: new Set(), who: null, mod: null, as: false, f: null, menu: false, rt: false, opEd: false, at: 0, busy: false };
function coTok() {
  const t = sesS.get('vz_spk_tok'); if (t) return t;
  try { const P = JSON.parse(sesS.get('spectr_sess') || 'null'); if (P && P.token) return P.token; } catch (e) {}
  return '';
}
/* загрузка списка. Если список уже на экране - обновляем тихо, без "Загружаю" и без анимации */
async function coLoad(pin) {
  undoFlush();
  const soft = CO.st === 'ok' && CO.list.length > 0 && !pin && !CO.demo;
  if (soft) { CO.busy = true; coUpd(); } else { CO.st = 'load'; coDraw(); }
  const fin = q => { CO.busy = false; coDraw(q); };
  try {
    let tok = pin ? '' : coTok();
    if (!tok && !pin && sesS.get('vz_kurs_try') !== '1') {
      sesS.set('vz_kurs_try', '1');
      try { pin = typeof ss_ !== 'undefined' && typeof PIN_KEY !== 'undefined' ? ss_.get(PIN_KEY) : ''; } catch (e) { pin = ''; }
    }
    if (!tok && pin) { const j = await spkCall({ op: 'login', pin }); if (!j.ok) { CO.st = 'pin'; CO.err = j.error || 'PIN не подошёл'; return fin(); } tok = j.token; sesS.set('vz_spk_tok', tok); }
    if (!tok) { CO.st = 'pin'; CO.err = ''; return fin(); }
    const j = await spkCall({ op: 'slist', token: tok });
    if (!j.ok) { sesS.set('vz_spk_tok', ''); CO.st = 'pin'; CO.err = j.error || ''; return fin(); }
    if (CO.demo) { CO.busy = false; return; }
    CO.tok = tok; coParse(j); CO.st = 'ok'; CO.at = Date.now(); if (COQ.q.length) { COQ.bad = false; coPump(); }
  } catch (e) {
    if (soft) { CO.busy = false; coUpd(); toastK('Нет связи с сервером, показан прошлый список'); return; }
    CO.st = 'err'; CO.err = 'Нет связи с сервером';
  }
  fin(soft);
}
function coParse(j) {
  CO.server = (j.list || []).some(x => 'kurs' in x);
  CO.list = (j.list || []).filter(x => x.club === 'vzlet' && x.st === 'принят' && !x.hid).map(x => ({ id: x.id, n: x.first, c: x.cls, k: x.kurs || {}, kc: x.kc || {}, upd: x.upd }))
    .sort((a, b) => (parseInt(a.c) || 99) - (parseInt(b.c) || 99) || a.n.localeCompare(b.n, 'ru'));
  /* то, что ещё в очереди на сервер, сразу видно и в свежем списке */
  COQ.q.forEach(o => coApply(o.ids, o.q));
}
const updAgo = () => { if (!CO.at) return ''; const m = Math.floor((Date.now() - CO.at) / 60000); return m < 1 ? 'обновлено только что' : m < 60 ? 'обновлено ' + m + ' мин назад' : 'обновлено в ' + new Date(CO.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); };
function coUpd() { const el = box && $('.co-upd', box); if (el) el.textContent = CO.busy ? 'обновляю...' : updAgo(); }
const mName = m => 'Модуль ' + m.n + '. ' + m.t;
const mOf = id => K.mods.find(x => x.id === id);
/* ---------- очередь записи на сервер: нажатие видно сразу, на сервер уходит по порядку ---------- */
const COQ = { q: [], busy: false, bad: false, ok: false };
const UNDO = { t: 0, op: null };
const coSvHtml = () => COQ.bad ? '<button class="kr-btn sm" data-k="co-retry">⚠ Не сохранилось. Повторить</button>' : UNDO.op ? '⏳ Сохраню через пару секунд' : (COQ.busy || COQ.q.length) ? '<i class="kr-spin"></i>Сохраняю...' : COQ.ok ? '✓ Сохранено' : '';
function coSv() {
  const el = box && $('#krSv', box); if (el && isCoach()) el.innerHTML = coSvHtml();
  clearTimeout(coSv.t);
  if (COQ.ok && !COQ.busy && !COQ.q.length) coSv.t = setTimeout(() => { COQ.ok = false; const e = box && $('#krSv', box); if (e && !COQ.busy && !COQ.q.length && !UNDO.op && !COQ.bad) e.innerHTML = ''; }, 3500);
}
async function coPump() {
  if (COQ.busy || COQ.bad) return;
  const op = COQ.q[0]; if (!op) { COQ.ok = true; return coSv(); }
  COQ.busy = true; COQ.ok = false; coSv();
  try {
    const j = await spkCall(Object.assign({ op: 'sset', act: 'kurs', ids: op.ids, token: CO.tok }, op.q));
    if (!j.ok) { COQ.bad = true; toastK('Не получилось: ' + (j.error || 'ошибка')); if (j.auth) { CO.st = 'pin'; CO.tok = ''; sesS.set('vz_spk_tok', ''); COQ.busy = false; coDraw(true); return; } }
    else COQ.q.shift();
  } catch (e) { COQ.bad = true; toastK('Нет связи с сервером'); }
  COQ.busy = false; coSv(); if (!COQ.bad) coPump();
}
function coAct(id, q) {
  undoFlush();
  const ids = Array.isArray(id) ? id : [id];
  coApply(ids, q);
  if (CO.demo) toastK('👀 Пример: на сервер не отправлено');
  else {
    if (q.k === 'lvl') COQ.q = COQ.q.filter((o, i) => !(o.q.k === 'lvl' && o.q.mod === q.mod && o.ids.join() === ids.join() && !(i === 0 && COQ.busy)));
    COQ.q.push({ ids, q }); COQ.ok = false; coPump();
  }
  coDraw(true);
}
/* "Принять" сразу видно, на сервер уходит через 6 с - до этого можно отменить (на сервере нет операции "снять принятие") */
function coAccept(ids, task) {
  undoFlush();
  const L = K.lib[task]; if (!L) return;
  const snap = ids.map(id => CO.list.find(z => z.id === id)).filter(Boolean).map(s => [s.id, JSON.stringify(s.kc || {}), JSON.stringify(kRec(s, task))]);
  coApply(ids, { k: 'acc', task });
  UNDO.op = { ids, q: { k: 'acc', task }, snap };
  UNDO.t = setTimeout(undoFlush, 6000);
  const one = ids.length === 1 && CO.list.find(z => z.id === ids[0]);
  undoShow('✓ Принято' + (one ? ': ' + one.n + ' - ' + L.t : ' у ' + plur(ids.length, 'ученика', 'учеников', 'учеников') + ': ' + L.t));
  coDraw(true);
}
function undoFlush() {
  clearTimeout(UNDO.t); const o = UNDO.op; if (!o) return;
  UNDO.op = null; undoHide();
  if (CO.demo) { coSv(); return; }
  COQ.q.push({ ids: o.ids, q: o.q }); COQ.ok = false; coPump();
}
function undoDo() {
  clearTimeout(UNDO.t); const o = UNDO.op; if (!o) return;
  UNDO.op = null; undoHide();
  o.snap.forEach(([id, kc, r]) => { const s = CO.list.find(z => z.id === id); if (!s) return; s.kc = JSON.parse(kc); const rr = JSON.parse(r); if (rr && s.k && s.k.t) s.k.t[o.q.task] = rr; });
  coDraw(true); coSv(); toastK('Отменено, ничего не сохранено');
}
function undoShow(txt) {
  let u = document.getElementById('krUndo');
  if (!u) { u = document.createElement('div'); u.id = 'krUndo'; u.setAttribute('role', 'status'); document.body.appendChild(u); u.addEventListener('click', e => { if (e.target.closest('button')) undoDo(); }); }
  u.innerHTML = `<span>${E(txt)}</span><button type="button">Отменить</button><i></i>`; u.className = ''; void u.offsetWidth; u.className = 'on';
}
function undoHide() { const u = document.getElementById('krUndo'); if (u) u.className = ''; }
/* "Вернуть": лист снизу вместо window.prompt */
const RET_CHIPS = ['Пересдай устно', 'Покажи полёт ещё раз', 'Доделай на занятии'];
function retOpen(ids, task) {
  const L = K.lib[task]; if (!L) return;
  const s1 = ids.length === 1 && CO.list.find(z => z.id === ids[0]);
  let el = document.getElementById('krRet');
  if (!el) {
    el = document.createElement('div'); el.id = 'krRet'; document.body.appendChild(el);
    el.addEventListener('click', e => {
      if (e.target === el) return retClose();
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x, ta = $('textarea', el);
      if (x === 'chip') { ta.value = b.textContent; $$('[data-x="chip"]', el).forEach(z => z.classList.toggle('on', z === b)); }
      else if (x === 'no') retClose();
      else if (x === 'go') { const o = el._o, why = ta.value.trim().slice(0, 140); retClose(); coAct(o.ids, { k: 'ret', task: o.task, why }); }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') retClose(); });
  }
  el._o = { ids, task };
  el.innerHTML = `<div class="kr-shb" role="dialog" aria-modal="true" aria-labelledby="krRetH" tabindex="-1"><b id="krRetH">↩ Вернуть задание</b><p>${s1 ? E(s1.n) + ', ' + E(s1.c) + ' · ' : ''}${L.e} ${E(L.t)}</p>
    <label>Что доделать? Ученик увидит эту подсказку<textarea maxlength="140" rows="2" placeholder="или выбери ниже"></textarea></label>
    <div class="kr-shc">${RET_CHIPS.map(t => `<button type="button" data-x="chip">${t}</button>`).join('')}</div>
    <div class="kr-sha"><button type="button" class="kr-btn" data-x="no">Отмена</button><button type="button" class="kr-btn pri" data-x="go">↩ Вернуть</button></div></div>`;
  el.className = 'on'; const d = $('.kr-shb', el); if (d) d.focus({ preventScroll: true });
}
function retClose() { const el = document.getElementById('krRet'); if (el) el.className = ''; }

/* пример для показа: выдуманные ученики во всех трёх модулях, все типичные случаи */
function coDemo() {
  const dd = back => { const d = new Date(); d.setDate(d.getDate() - back); return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }); };
  const up = back => back == null ? '' : dd(back) + '.' + new Date(Date.now() - back * 864e5).getFullYear() + ' 18:05';
  const wKeys = id => { const L = K.lib[id]; let pool = [];
    L.steps.forEach(st => { if (st.s !== 'quiz') return; if (st.gen === 'label') pool.push('g.cap', 'g.land', 'g.wh'); else if (st.from) ((K.lib[st.from[0]].steps.find(z => z.s === 'quiz') || {}).pool || []).forEach(q => pool.push(qh(q.q))); else (st.pool || []).forEach(q => pool.push(qh(q.q))); });
    return pool; };
  const rec = (id, kind, i, nm, back, lv) => {
    const L = K.lib[id], hasQ = L.steps.some(x => x.s === 'quiz' || x.s === 'game'); let s;
    if (kind === 'n') { let f = false; s = L.steps.map(st => { if (f) return '-'; if (st.s === 'quiz' || st.s === 'game') { f = true; return 'n'; } return 'o'; }).join(''); }
    else if (kind === 'p') s = L.steps.map((st, k) => k ? '-' : 'o').join('');
    else if (kind === 'k') s = L.steps.map(() => '-').join('');
    else s = L.steps.map(st => st.s === 'coach' ? (kind === 'w' ? 'w' : 'o') : kind === 'x' && st.s === 'quiz' ? 'x' : 'o').join('');
    const fin = kind === 'o' || kind === 'w' || kind === 'x';
    const r = { s, p: hasQ && (fin || kind === 'n') ? (kind === 'n' ? 45 : kind === 'x' ? 62 : 68 + (i * 7 + nm.length * 5) % 33) : null, a: kind === 'n' ? 4 : 1 + (i + nm.length) % 2, d: fin ? dd(back + Math.max(0, 8 - i)) : '', l: lv,
      k: i % 4 === 1 ? 1 : (i + nm.length) % 5 === 3 ? -1 : 0, sk: kind === 'k' ? 1 : 0, c: kind === 'w' ? 'Сделал на занятии, проверьте' : '', f: L.fly && fin ? (L.steps.some(x => x.live) ? '3,52 В при посадке' : 'Квадросим, Ангар: ' + (38 + i) + ',4 с') : '' };
    if (kind === 'w') r.wd = dd(back + i % 3);
    const P = wKeys(id); if (P.length && r.p != null && r.p < 96) { r.w = {}; [0, 2 + nm.length % 3].forEach((j, z) => { const k = P[j % P.length]; r.w[k] = (r.w[k] || 0) + 1 + z; }); }
    return r;
  };
  /* по модулю - строка: o сдано, w ждёт тренера, x через доп. задание, n застрял, p начато, k пропущено, . нет */
  const P = [['Артём', '6А', 1, { m1: 'ooooooooo', m2: 'oon' }],
    ['Маша', '7Б', 0, { m1: 'ooooooooo', m2: 'oooooooww', m3: 'oooox' }],
    ['Илья', '9А', 0, { m1: 'ooooooooo', m2: 'ooooooooo', m3: 'ooooooooooo'.slice(0, 10) + 'w' }],
    ['Соня', '8В', null, {}],
    ['Даня', '5Б', 10, { m1: 'oookooop' }, { r: { m1_coach: [dd(9), 'Покажи полёт ещё раз'] } }],
    ['Лиза', '7А', 2, { m1: 'ooooooooo', m2: 'ooooooooo', m3: 'ooooooooooo' }]];
  CO.list = P.map((a, n) => { const t = {}, acc = {}, cl = parseInt(a[1]), lv = cl <= 6 ? 1 : cl <= 8 ? 2 : 3;
    Object.keys(a[3]).forEach(mid => a[3][mid].split('').forEach((ch, i) => { const id = mOf(mid).tasks[i]; if (!id || ch === '.') return; t[id] = rec(id, ch, i, a[0], a[2] || 0, lv); if (ch === 'o' && K.lib[id].steps.some(x => x.s === 'coach')) acc[id] = t[id].d; }));
    return { id: 'demo' + n, n: a[0], c: a[1], k: { v: 1, t }, kc: Object.assign({ o: ['m1', 'm2', 'm3'], v: {}, a: acc }, a[4] || {}), upd: up(a[2]) };
  });
}
function coApply(id, q) {
  (Array.isArray(id) ? id : [id]).forEach(x => { const s = CO.list.find(z => z.id === x); if (!s) return; const kc = s.kc = s.kc || {}; kc.o = kc.o || []; kc.a = kc.a || {}; kc.r = kc.r || {}; kc.v = kc.v || {};
    const k = q.mod || q.task, r = s.k && s.k.t && s.k.t[k];
    if (q.k === 'open' && kc.o.indexOf(k) < 0) kc.o.push(k); if (q.k === 'close') kc.o = kc.o.filter(z => z !== k);
    if (q.k === 'acc') { kc.a[k] = today(); delete kc.r[k]; if (r) r.s = r.s.replace(/w/g, 'o'); }
    if (q.k === 'ret') { kc.r[k] = [today(), q.why]; delete kc.a[k]; if (r) { r.s = r.s.replace(/w/g, '-'); delete r.wd; } }
    if (q.k === 'lvl') kc.v[k] = q.v; });
}
/* ---------- расчёты по записи ученика ---------- */
const kRec = (s, id) => (s.k && s.k.t && s.k.t[id]) || null;
const kAcc = (s, id) => ((s.kc && s.kc.a) || {})[id];
const kPts = (id, r) => { const L = K.lib[id]; return L && r && r.d && !/[-n]/.test(r.s) ? Math.round(L.pts * (r.p == null ? 1 : r.p / 100)) : 0; };
const kWait = r => !!r && r.s.indexOf('w') >= 0;
const kOpenM = (s, m) => PREVIEW_OPEN.includes(m.id) || ((s.kc && s.kc.o) || []).includes(m.id);
const kLvl = (s, m) => (s.kc && s.kc.v && s.kc.v[m.id]) || (s.k && s.k.lv && s.k.lv[m.id]) || (parseInt(s.c) <= 6 ? 1 : parseInt(s.c) <= 8 ? 2 : 3);
/* сдано: все шаги пройдены, или тренер засчитал задание */
const kDone = (s, id) => { const r = kRec(s, id); return !!(r && r.d && !/[-n]/.test(r.s)) || !!kAcc(s, id); };
const kGo = r => !!r && /[^-]/.test(r.s);
function kModProg(s, m) { if (!m.tasks) return null; return m.tasks.filter(id => kDone(s, id)).length / m.tasks.length; }
const kAllPts = s => Object.keys(K.lib).reduce((a, id) => a + kPts(id, kRec(s, id)), 0);
/* ждёт проверки: шаг "с тренером" отправлен, не принят и не возвращён после отправки */
function kWaitS(s, id) {
  const r = kRec(s, id); if (!kWait(r) || kAcc(s, id)) return false;
  const rt = ((s.kc && s.kc.r) || {})[id];
  if (rt && rt[0]) { const a = ddm(r.wd), b = ddm(rt[0]); if (!a || (b && a < b)) return false; }
  return true;
}
const kStuck = (s, id) => { const r = kRec(s, id); return !!r && r.s.indexOf('n') >= 0 && !kDone(s, id); };
const allT = () => K.mods.reduce((a, m) => a.concat(m.tasks || []), []);
const waitsOf = L => { const w = []; L.forEach(s => allT().forEach(id => { if (kWaitS(s, id)) w.push([s, id, kRec(s, id)]); })); return w; };
/* даты: 'ДД.ММ' (год - текущий, или прошлый, если дата впереди) или 'ДД.ММ.ГГГГ чч:мм' */
const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
function ddm(v) {
  const m = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/.exec(String(v || '').trim()); if (!m) return null;
  const t = day0(), d = new Date(m[3] ? +m[3] : t.getFullYear(), +m[2] - 1, +m[1]);
  if (!m[3] && d - t > 2 * 864e5) d.setFullYear(d.getFullYear() - 1);
  return d;
}
const daysAgo = v => { const d = ddm(v); return d ? Math.max(0, Math.round((day0() - d) / 864e5)) : null; };
const agoTxt = n => n === 0 ? 'был(а) сегодня' : n === 1 ? 'был(а) вчера' : 'был(а) ' + n + ' дн. назад';
const pcCls = p => p == null ? '' : p >= 70 ? 'g' : p >= 50 ? 'a' : 'r';
const mTag = id => { const m = modOf(id); return m ? `<em class="co-mt">М${m.n}</em>` : ''; };
/* всё про одного ученика - для списка, сводки и страницы ученика */
function coStat(s) {
  const open = K.mods.filter(m => m.tasks && kOpenM(s, m)), A = allT();
  const stuck = A.filter(id => kStuck(s, id)), waits = A.filter(id => kWaitS(s, id));
  const skipped = A.filter(id => { const r = kRec(s, id); return r && r.sk && !kDone(s, id); });
  const ret = A.filter(id => ((s.kc && s.kc.r) || {})[id] && !kWaitS(s, id) && !kDone(s, id));
  const tot = open.reduce((a, m) => a + m.tasks.length, 0), dn = open.reduce((a, m) => a + m.tasks.filter(id => kDone(s, id)).length, 0);
  const started = A.some(id => kRec(s, id) || kAcc(s, id));
  /* "сейчас": модуль, где была последняя работа; если он пройден - следующий открытый */
  let last = -1; open.forEach((m, i) => { if (m.tasks.some(id => kRec(s, id))) last = i; });
  const cur = last >= 0 && kModProg(s, open[last]) < 1 ? open[last] : open.find((m, i) => i > last && kModProg(s, m) < 1) || open.find(m => kModProg(s, m) < 1) || null;
  return { open, stuck, waits, skipped, ret, tot, dn, p: tot ? dn / tot : 0, cur, all: open.length > 0 && !cur, ago: daysAgo(s.upd), started, pts: kAllPts(s) };
}
const DOT = { o: ['ok', 'пройден'], x: ['x', 'через доп. задание'], n: ['n', 'нужно доп. задание'], w: ['w', 'ждёт тренера'], '-': ['no', 'не пройден'] };
const coDots = (L, r) => { const t = L.steps.map((st, i) => stepName(st) + ' - ' + (DOT[(r && r.s[i]) || '-'] || DOT['-'])[1]);
  return `<span class="co-dots" role="img" aria-label="Шаги: ${E(t.join(', '))}">${L.steps.map((st, i) => `<i class="d-${(DOT[(r && r.s[i]) || '-'] || DOT['-'])[0]}" title="${E(t[i])}"></i>`).join('')}</span>`; };
const coLegend = () => `<div class="co-leg" aria-hidden="true">Цвета шагов: ${['o', 'x', 'n', 'w', '-'].map(c => `<span><i class="d-${DOT[c][0]}"></i>${DOT[c][1]}</span>`).join('')}</div>`;
const coChip = (cls, t) => `<span class="co-c ${cls}">${t}</span>`;
const unready = () => { const u = K.mods.filter(m => !m.tasks); return u.length ? `<div class="co-un">🛠 ${u.length > 1 ? 'Модули ' + u[0].n + '-' + u[u.length - 1].n + ' готовятся' : 'Модуль ' + u[0].n + ' готовится'}</div>` : ''; };

function coHead() {
  return `<div class="kr-card top co-hd"><div class="co-hr"><div class="co-ht"><h3>👥 Ученики курса</h3>${CO.demo ? '<span class="co-demo">👀 Пример - не сохраняется</span>' : `<span class="co-upd">${E(CO.busy ? 'обновляю...' : updAgo())}</span>`}</div>
    <div class="co-hb"><button class="kr-btn co-ib" data-k="co-load" aria-label="Обновить" title="Обновить">↻</button><button class="kr-btn co-ib" data-k="co-menu" aria-expanded="${!!CO.menu}" aria-label="Ещё" title="Ещё">⋯</button>${bugBtn()}</div></div>
    <div class="co-tp" data-spk-panel data-club="vzlet" data-coach data-pin-key="vzlet_pin" data-accent="#00d4ff"></div>
    ${CO.menu ? `<div class="co-menu"><button class="kr-btn" data-k="co-demo">${CO.demo ? '✕ Убрать пример' : '👀 Пример с выдуманными учениками'}</button><button class="kr-btn" data-k="co-as">🎓 Курс глазами ученика</button><p class="mut">Нажми на ученика или модуль, чтобы зайти внутрь. Цифры сводки - фильтры списка.</p></div>` : ''}</div>`;
}
function coSum(ST) {
  const w = ST.reduce((a, x) => a + x[1].waits.length, 0), n = ST.filter(x => x[1].stuck.length).length, idle = ST.filter(x => x[1].ago != null && x[1].ago >= 7).length;
  const act = ST.filter(x => x[1].tot), avg = act.length ? Math.round(act.reduce((a, x) => a + x[1].p, 0) / act.length * 100) : 0;
  const tile = (v, num, lab, cls, z) => `<button class="co-t ${cls} ${CO.f === v ? 'on' : ''} ${z ? 'z' : ''}" data-k="co-f" data-v="${v}" aria-pressed="${CO.f === v}"><b>${num}</b><small>${lab}</small></button>`;
  return `<div class="co-sum" role="group" aria-label="Сводка: нажми, чтобы отфильтровать список">${tile('w', w, 'Ждут проверки', 'co-tw', !w)}${tile('n', n, 'Застряли', 'co-tn', !n)}${tile('idle', idle, 'Не заходили 7+ дней', 'co-ti', !idle)}${tile('p', avg + '%', 'Средний прогресс', 'co-tp')}</div>`;
}
function coWaitItem(s, id, r) {
  const wd = r.wd || r.d, n = daysAgo(wd), rt = ((s.kc && s.kc.r) || {})[id];
  return `<div class="co-wi"><div class="co-wl1"><b>${E(s.n)}, ${E(s.c)}</b>${wd ? `<span class="co-wd ${n >= 7 ? 'old' : ''}">ждёт с ${E(String(wd).slice(0, 5))}${n != null ? ' (' + (n ? n + ' дн.' : 'сегодня') + ')' : ''}</span>` : ''}</div>${r.c ? `<div class="co-wl2">💬 "${E(r.c)}"</div>` : ''}${rt ? `<div class="co-wl2 mut">↩ уже возвращали ${E(rt[0])}</div>` : ''}
    <div class="co-wl3"><button class="kr-btn pri" data-k="co-acc" data-s="${s.id}" data-t="${id}">✓ Принять</button><button class="kr-btn" data-k="co-ret" data-s="${s.id}" data-t="${id}">↩ Вернуть</button></div></div>`;
}
const coAccAll = (id, it) => it.length > 1 ? `<button class="kr-btn sm" data-k="co-accall" data-t="${id}" data-ids="${it.map(x => x.id).join(',')}">✓ Принять у всех (${it.length})</button>` : '';
function coWaitCard(waits) {
  const G = []; allT().forEach(id => { const it = waits.filter(w => w[1] === id); if (it.length) G.push([id, it]); });
  return `<div class="kr-card co-wc"><div class="kr-sec">⏳ Ждут проверки (${waits.length})</div>${G.map(([id, it]) => `<div class="co-wg"><div class="co-wgh"><span>${mTag(id)} ${K.lib[id].e} ${E(K.lib[id].t)}</span>${coAccAll(id, it.map(w => w[0]))}</div>${it.map(([s, , r]) => coWaitItem(s, id, r)).join('')}</div>`).join('')}</div>`;
}
function coRow(s, st) {
  const ch = [];
  if (st.stuck.length) { const id = st.stuck[0], r = kRec(s, id); ch.push(coChip('cn', `⚠ Застрял: "${E(K.lib[id].t)}"${r.a ? ' (' + plur(r.a, 'попытка', 'попытки', 'попыток') + ')' : ''}${st.stuck.length > 1 ? ' и ещё ' + (st.stuck.length - 1) : ''}`)); }
  if (st.waits.length) ch.push(coChip('cw', '⏳ ждёт проверки: ' + st.waits.length));
  if (st.ret.length) ch.push(coChip('cr', '↩ возвращено: ' + st.ret.length));
  let line, bar = null;
  if (!st.started) line = '<span class="co-sl2 co-ns">Ещё не начинал(а)</span>';
  else if (!st.open.length) line = '<span class="co-sl2">Модули не открыты</span>';
  else if (st.all) { line = '<span class="co-sl2 co-ok">✓ Все открытые модули пройдены - можно открыть следующий</span>'; bar = 100; }
  else { const m = st.cur, d = m.tasks.filter(id => kDone(s, id)).length; line = `<span class="co-sl2">Сейчас: Модуль ${m.n} · ${d} из ${m.tasks.length} заданий${st.skipped.length ? ` · <span class="co-sk">пропущено ${st.skipped.length}</span>` : ''}</span>`; bar = d / m.tasks.length * 100; }
  const seen = st.ago == null ? '' : `<span class="co-seen ${st.ago >= 7 ? 'old' : ''}">${agoTxt(st.ago)}</span>`;
  return `<button class="co-sr ${st.stuck.length ? 'co-stk' : ''} ${st.started ? '' : 'co-nsr'}" data-k="co-who" data-s="${s.id}"><span class="co-sn"><b>${E(s.n)}</b> <small>${E(s.c)}</small></span><b class="co-sp">⭐ ${st.pts}</b>${ch.length ? `<span class="co-chs">${ch.join('')}</span>` : ''}${line}${bar != null ? `<span class="kr-bar thin"><i style="width:${bar}%"></i></span>` : ''}${seen}</button>`;
}
function coListHtml(ST) {
  const f = CO.f; let R = ST.slice();
  if (f === 'w') R = R.filter(x => x[1].waits.length); else if (f === 'n') R = R.filter(x => x[1].stuck.length); else if (f === 'idle') R = R.filter(x => x[1].ago != null && x[1].ago >= 7);
  const rank = x => x[1].stuck.length ? 0 : x[1].waits.length ? 1 : 2;
  if (f === 'p') R.sort((a, b) => a[1].p - b[1].p); else R.sort((a, b) => rank(a) - rank(b));
  const go = R.filter(x => x[1].started), ns = R.filter(x => !x[1].started);
  const FL = { w: 'ждут проверки', n: 'застряли', idle: 'не заходили 7+ дней', p: 'все, отстающие сверху' };
  let h = f ? `<div class="co-fl"><span>Показаны: ${FL[f]} (${R.length})</span><button class="kr-btn sm" data-k="co-f" data-v="">✕ Все ученики</button></div>` : '';
  if (!R.length) h += '<div class="kr-note">Таких учеников нет 👍</div>';
  if (go.length) h += '<div class="co-list">' + go.map(x => coRow(x[0], x[1])).join('') + '</div>';
  if (ns.length) h += `<div class="kr-sec co-gh">Не начали (${ns.length})</div><div class="co-list">${ns.map(x => coRow(x[0], x[1])).join('')}</div>`;
  return h;
}
function coRate(ST) {
  const R = ST.filter(x => x[1].pts > 0).sort((a, b) => b[1].pts - a[1].pts).slice(0, 10);
  if (!R.length) return '';
  return `<div class="kr-card co-rtc"><button class="co-fold" data-k="co-rt" aria-expanded="${!!CO.rt}"><span>🏆 Рейтинг по курсу</span><small>${CO.rt ? 'свернуть ▴' : 'показать ▾'}</small></button>${CO.rt ? `<ol class="co-rt">${R.map((x, i) => `<li><i>${i + 1}</i><span>${E(x[0].n)}</span><b>⭐ ${x[1].pts}</b></li>`).join('')}</ol>` : ''}</div>`;
}
function coModStat(L, m) {
  const op = L.filter(s => kOpenM(s, m)), ps = [];
  L.forEach(s => m.tasks.forEach(id => { const r = kRec(s, id); if (r && r.p != null) ps.push(r.p); }));
  return { op: op.length, prog: op.length ? op.reduce((a, s) => a + kModProg(s, m), 0) / op.length : 0, res: ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null,
    stuck: L.filter(s => m.tasks.some(id => kStuck(s, id))).length, w: L.reduce((a, s) => a + m.tasks.filter(id => kWaitS(s, id)).length, 0), dn: L.filter(s => kModProg(s, m) === 1).length };
}
const coMS = q => `<div class="co-ms">Средний прогресс <b>${Math.round(q.prog * 100)}%</b> · средний результат проверок <b class="co-pc ${pcCls(q.res)}">${q.res == null ? '-' : q.res + '%'}</b> · застряли <b class="${q.stuck ? 'cn' : ''}">${q.stuck}</b></div><div class="kr-bar thin"><i style="width:${q.prog * 100}%"></i></div>`;
function coModsHtml(L) {
  let h = '<div class="kr-mods">' + K.mods.filter(m => m.tasks).map(m => { const q = coModStat(L, m);
    return `<button class="kr-m on co-mc" data-k="co-cm" data-m="${m.id}"><span class="nn">МОДУЛЬ ${m.n} ›</span><b>${E(m.t)}</b>${coMS(q)}<div class="st">Открыт у ${q.op} из ${L.length} · пройден у ${q.dn}${q.w ? ` · <span class="cw">ждут проверки: ${q.w}</span>` : ''}</div></button>`; }).join('') + '</div>' + unready();
  const lk = {}; L.forEach(s => Object.keys((s.k && s.k.t) || {}).forEach(id => { const v = s.k.t[id].k; if (!v || !K.lib[id]) return; lk[id] = lk[id] || [0, 0]; lk[id][v > 0 ? 0 : 1]++; }));
  const ids = Object.keys(lk).sort((a, b) => lk[b][1] - lk[a][1] || lk[a][0] - lk[b][0]);
  const fbs = []; L.forEach(s => Object.keys((s.k && s.k.t) || {}).forEach(id => { const r = s.k.t[id]; if (r.fb && K.lib[id]) fbs.push([id, s, r]); }));
  fbs.sort((a, b) => { const ia = K.mods.findIndex(m => m.tasks && m.tasks.includes(a[0])), ib = K.mods.findIndex(m => m.tasks && m.tasks.includes(b[0])); return ia - ib || a[0].localeCompare(b[0]); });
  if (fbs.length) h += `<div class="kr-card"><div class="kr-sec">💬 Комментарии тестеров (${fbs.length})</div><ul class="kr-hist">${fbs.map(([id, s, r]) => `<li><span>${mTag(id)} ${E(K.lib[id].t)}<br><small class="mut">${E(s.n)}, ${E(s.c)}${r.k ? ' ' + (r.k > 0 ? '👍' : '👎') : ''}</small></span><span>"${E(r.fb)}"</span></li>`).join('')}</ul></div>`;
  if (ids.length) h += `<div class="kr-card"><div class="kr-sec">Как ученикам задания</div><ul class="kr-hist">${ids.map(id => `<li><span>${mTag(id)} ${E(K.lib[id].t)}</span><span class="co-lk">👎 ${lk[id][1]} · 👍 ${lk[id][0]}</span></li>`).join('')}</ul><p class="mut" style="margin-top:8px;font-size:12.5px">Сверху задания с самым большим числом 👎 - их стоит поправить или заменить.</p></div>`;
  return h;
}

/* ---------- таблица "ученики x модули": модуль - полоска из заданий, цвет - насколько верно ---------- */
/* цвет результата: <50% красный, ~70% жёлтый, от 90% зелёный (плавно) */
function gCol(p) {
  const h = p <= 50 ? 0 : p < 70 ? (p - 50) / 20 * 40 : p < 90 ? 40 + (p - 70) / 20 * 95 : 135;
  return `hsl(${Math.round(h)},${h > 100 ? 62 : 80}%,${h > 100 ? 44 : 52}%)`;
}
/* состояние одного задания у ученика: k - вид, c - цвет, t - подпись */
function gSeg(s, id) {
  const r = kRec(s, id), dn = kDone(s, id), wt = kWaitS(s, id), acc = kAcc(s, id), p = r && r.p != null ? r.p : null;
  if (kStuck(s, id)) return { k: 'n', t: 'застрял(а) - нужно доп. задание' + (p != null ? ' · ' + p + '%' : '') };
  if (wt) return { k: 'd s-w', c: p != null ? gCol(p) : '#60a5fa', t: 'ждёт проверки' + (p != null ? ' · ' + p + '%' : '') };
  if (dn) return p != null ? { k: 'd', c: gCol(p), t: p + '%' } : { k: 'd', c: gCol(100), t: acc && !kGo(r) ? 'засчитано без выполнения' : acc ? 'принято' : 'сдано' };
  if (((s.kc && s.kc.r) || {})[id]) return { k: 'r', t: 'возвращено на доработку' };
  if (r && r.sk) return { k: 'k', t: 'пропущено' };
  if (kGo(r)) return { k: 'p', t: 'в процессе' };
  return { k: 'z', t: 'не начато' };
}
const gSegHtml = (s, m, id, k) => { const g = gSeg(s, id);
  return `<i class="co-sg s-${g.k}"${g.c ? ` style="--c:${g.c}"` : ''} data-k="co-gt" data-s="${s.id}" data-m="${m.id}" data-t="${id}" title="${k + 1}. ${E(K.lib[id].t)} - ${E(g.t)}"></i>`; };
/* строки - как в списке учеников: застряли, ждут проверки, остальные, не начавшие внизу */
function gRows(L) {
  const ST = L.map(s => [s, coStat(s)]), rank = x => !x[1].started ? 3 : x[1].stuck.length ? 0 : x[1].waits.length ? 1 : 2;
  return ST.map((x, i) => [x, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(a => a[0]);
}
function coGridHtml(L) {
  const M = K.mods.filter(m => m.tasks), R = gRows(L);
  const head = M.map(m => { const q = coModStat(L, m);
    return `<th scope="col"><button class="co-gmh" data-k="co-cm" data-m="${m.id}" title="Модуль ${m.n}: ${E(m.t)}"><b>М${m.n} <span>›</span></b><span class="co-ght">${E(m.t)}</span><small>пройдено ${Math.round(q.prog * 100)}%${q.res != null ? ` · <span class="co-pc ${pcCls(q.res)}">верно ${q.res}%</span>` : ''}</small></button></th>`; }).join('');
  const rows = R.map(([s, st]) => `<tr class="${st.started ? '' : 'ns'}"><th scope="row"><button class="co-gn" data-k="co-who" data-s="${s.id}"><b>${E(s.n)}</b><small>${E(s.c)}${st.stuck.length ? ' <span class="cn">⚠</span>' : ''}${st.waits.length ? ' <span class="cw">⏳</span>' : ''}</small></button></th>${M.map(m => {
      const op = kOpenM(s, m), d = m.tasks.filter(id => kDone(s, id)).length, ps = m.tasks.map(id => (kRec(s, id) || {}).p).filter(v => v != null), av = ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null;
      return `<td><button class="co-gcl ${op ? '' : 'lock'}" data-k="co-gc" data-s="${s.id}" data-m="${m.id}" style="--n:${m.tasks.length}" aria-label="${E(s.n)}, модуль ${m.n}: ${d} из ${m.tasks.length} заданий${av != null ? ', верно ' + av + '%' : ''}${op ? '' : ', закрыт'}"><span class="co-gb">${m.tasks.map((id, k) => gSegHtml(s, m, id, k)).join('')}</span><small>${op ? '' : '🔒 '}${d}/${m.tasks.length}${av != null ? ` · <span class="co-pc ${pcCls(av)}">${av}%</span>` : ''}</small></button></td>`; }).join('')}</tr>`).join('');
  const lg = (c, t) => `<span><i class="co-sg ${c}"${c === 's-d' ? ` style="--c:${gCol(100)}"` : ''}></i>${t}</span>`;
  return `<div class="co-gw" tabindex="-1"><table class="co-gt"><thead><tr><th scope="col" class="co-g0">Ученик</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="co-gl"><span><i class="co-gsc"></i>верно: &lt;50% · 70% · 90%+</span>${lg('s-d', 'сдано')}${lg('s-d s-w', 'ждёт проверки')}${lg('s-p', 'в процессе')}${lg('s-n', 'застрял')}${lg('s-r', 'возвращено')}${lg('s-k', 'пропущено')}${lg('s-z', 'не начато')}<span>🔒 модуль закрыт</span></div>
    <p class="mut co-gtip">Нажми на полоску - задания модуля с результатами (мышью можно сразу на клетку задания), на заголовок модуля - сводка по модулю, на имя - страница ученика.</p>${unready()}`;
}
/* окошко со списком заданий модуля у ученика (полоска слишком мелкая для пальца) */
function gPop(sid, mid) {
  const s = CO.list.find(z => z.id === sid), m = mOf(mid); if (!s || !m) return gPopClose();
  let el = document.getElementById('krGp');
  if (!el) {
    el = document.createElement('div'); el.id = 'krGp'; document.body.appendChild(el);
    el.addEventListener('click', e => {
      if (e.target === el) return gPopClose();
      const b = e.target.closest('[data-x]'); if (!b) return;
      const o = el._o; gPopClose(); if (b.dataset.x === 'go') gGo(o.sid, o.mid, b.dataset.t || null);
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') gPopClose(); });
  }
  el._o = { sid, mid };
  const d = m.tasks.filter(id => kDone(s, id)).length;
  el.innerHTML = `<div class="kr-shb" role="dialog" aria-modal="true" aria-labelledby="krGpH" tabindex="-1"><b id="krGpH">${E(s.n)}, ${E(s.c)}</b><p>Модуль ${m.n}: ${E(m.t)} · ${d} из ${m.tasks.length}${kOpenM(s, m) ? '' : ' · 🔒 закрыт'}</p>
    <div class="co-gpl">${m.tasks.map((id, k) => { const g = gSeg(s, id);
      return `<button type="button" data-x="go" data-t="${id}"><i class="co-sg s-${g.k}"${g.c ? ` style="--c:${g.c}"` : ''}></i><span><b>${k + 1}. ${K.lib[id].e} ${E(K.lib[id].t)}</b><small>${E(g.t)}</small></span><em>›</em></button>`; }).join('')}</div>
    <div class="kr-sha"><button type="button" class="kr-btn" data-x="no">Закрыть</button><button type="button" class="kr-btn pri" data-x="go">Все задания модуля ›</button></div></div>`;
  el.className = 'on'; const dg = $('.kr-shb', el); if (dg) dg.focus({ preventScroll: true });
}
/* мышью - сразу в задание по клику на кусочек полоски; пальцем - через окошко со списком */
let gPT = '';
document.addEventListener('pointerdown', e => { gPT = e.pointerType || ''; }, true);
/* предыдущий экран тренера - таблица? тогда кнопка назад ведёт в неё */
function coFromGrid() {
  const j = JSON.stringify(navCur()), i = NAV.h[NAV.i] && NAV.h[NAV.i].j === j ? NAV.i - 1 : NAV.i, d = i >= 0 && NAV.h[i] && NAV.h[i].d;
  return !!(d && d.c && !d.who && !d.cm && (d.tab || 'gr') === 'gr');
}
function gPopClose() { const el = document.getElementById('krGp'); if (el) el.className = ''; }
/* провалиться в задания модуля у ученика, нужное задание - по центру и подсвечено */
function gGo(sid, mid, tid) { CO.who = sid; CO.mod = mid; CO.cm = null; CO.ct = null; CO.hl = tid; coDraw(); if (!tid) scrollTop(); }

function coDraw(quiet) {
  if (!box || !isCoach() || CO.as) return;
  VIEW = { m: null, t: null, step: null, co: 1 };
  if (CO.who) return CO.mod ? coModView(quiet) : coStudView(quiet);
  if (CO.cm) return CO.ct ? coTaskView(quiet) : coModOver(quiet);
  const tab = CO.tab || 'gr';
  let h = coHead();
  if (CO.demo) {}
  else if (CO.st === 'load') h += '<div class="kr-note">⏳ Загружаю учеников...</div>';
  else if (CO.st === 'pin') h += `<div class="kr-card"><b>Вход для тренера</b><p class="mut" style="margin:4px 0 10px">Нужен PIN портала СПЕКТР (тот же, что для заявок).${CO.err ? ' ' + E(CO.err) : ''}</p><form class="kr-in" id="coPin"><label>PIN<input name="pin" type="password" inputmode="numeric" autocomplete="off"></label><button class="kr-btn pri">Войти</button></form></div>`;
  else if (CO.st === 'err') h += `<div class="kr-wait">⚠ ${E(CO.err)}. <button class="kr-btn sm" data-k="co-load">Ещё раз</button></div>`;
  if (CO.st === 'ok' && !CO.demo && !CO.server) h += '<div class="kr-wait">🛠 Сервер ещё не обновлён: список учеников есть, а их прогресс по курсу появится после установки нового файла сервера. Пока можно посмотреть 👀 Пример (кнопка ⋯).</div>';
  const L = CO.list;
  if ((CO.st === 'ok' || CO.demo) && !L.length) h += '<div class="kr-note">Пока нет принятых учеников Взлёта.</div>';
  if ((CO.st === 'ok' || CO.demo) && L.length) {
    const ST = L.map(s => [s, coStat(s)]), waits = waitsOf(L);
    h += coSum(ST);
    h += `<div class="co-tabs"><button data-k="co-tab" data-v="gr" class="${tab === 'gr' ? 'on' : ''}">📊 Обзор</button><button data-k="co-tab" data-v="st" class="${tab === 'st' ? 'on' : ''}">Ученики<small>${L.length}</small></button><button data-k="co-tab" data-v="mo" class="${tab === 'mo' ? 'on' : ''}">Модули<small>${K.mods.filter(m => m.tasks).length}</small></button></div>`;
    if (waits.length && (tab === 'st' || CO.f === 'w')) h += coWaitCard(waits);
    h += tab === 'st' ? coListHtml(ST) + coRate(ST) + coResetAll(L) : tab === 'gr' ? coGridHtml(L) : coModsHtml(L);
  }
  /* тихая перерисовка таблицы: прокрутка вбок остаётся на месте, открытое окошко обновляется */
  const gw = box && $('.co-gw', box), gx = gw ? gw.scrollLeft : 0;
  mount(h, quiet);
  const gw2 = $('.co-gw', box); if (gw2 && gx) gw2.scrollLeft = gx;
  const gp = document.getElementById('krGp'); if (gp && gp.className === 'on' && gp._o) { if (tab === 'gr') gPop(gp._o.sid, gp._o.mid); else gPopClose(); }
}
function coResetAll(L) {
  if (CO.demo) return '';
  return `<div class="kr-card"><div class="kr-sec">↺ Обнулить всех</div><p class="mut" style="margin:6px 0 10px;font-size:13px">Сбросит у всех ${L.length} учеников Взлёта очки, тесты, тренировки и прогресс курса. Ученики, коды и открытые модули останутся. Отменить нельзя.</p><button class="kr-btn" data-k="co-rstall">↺ Обнулить результаты всех</button></div>`;
}
function coStud() { return CO.list.find(s => s.id === CO.who); }
function coStudView(quiet) {
  const s = coStud(); if (!s) { CO.who = null; return coDraw(); }
  const st = coStat(s), ch = [];
  if (st.stuck.length) ch.push(coChip('cn', '⚠ Застрял: ' + st.stuck.map(id => `"${E(K.lib[id].t)}"`).join(', ')));
  if (st.waits.length) ch.push(coChip('cw', '⏳ ждёт проверки: ' + st.waits.length));
  if (st.ret.length) ch.push(coChip('cr', '↩ возвращено: ' + st.ret.length));
  if (st.skipped.length) ch.push(coChip('', '⏭ пропущено: ' + st.skipped.length));
  let h = `<div class="kr-back"><button class="kr-btn sm" data-k="co-back">← ${CO.tab === 'gr' ? 'Обзор' : 'Все ученики'}</button>${CO.demo ? '<span class="co-demo">👀 Пример - не сохраняется</span>' : ''}</div>
    <div class="kr-card top"><h3>${E(s.n)}, ${E(s.c)}</h3><div class="co-ss"><span><b>${st.dn}</b> из ${st.tot} заданий${st.tot ? ' · ' + Math.round(st.p * 100) + '%' : ''}</span><span>⭐ ${st.pts}</span>${st.ago != null ? `<span class="co-seen ${st.ago >= 7 ? 'old' : ''}">${agoTxt(st.ago)}</span>` : '<span class="co-ns">ещё не заходил(а) в курс</span>'}</div>
    <div class="kr-bar thin"><i style="width:${st.p * 100}%"></i></div>${st.all ? '<p class="co-ok" style="margin-top:8px">✓ Все открытые модули пройдены - можно открыть следующий</p>' : ''}${ch.length ? `<div class="co-chs">${ch.join('')}</div>` : ''}</div>`;
  h += '<div class="kr-mods">' + K.mods.filter(m => m.tasks).map(m => {
    const op = kOpenM(s, m), p = kModProg(s, m), lv = kLvl(s, m), w = m.tasks.filter(id => kWaitS(s, id)).length, stk = m.tasks.filter(id => kStuck(s, id)).length, any = m.tasks.some(id => kRec(s, id) || kAcc(s, id));
    const sts = !op ? '🔒 закрыт' : !any ? 'не начато' : p === 1 ? '✓ пройден' : Math.round(p * 100) + '% заданий';
    return `<div class="kr-card co-smc ${op ? '' : 'lock'}"><div class="co-smh"><span class="nn">МОДУЛЬ ${m.n}</span><b>${E(m.t)}</b></div>
      <div class="kr-bar thin"><i style="width:${(p || 0) * 100}%"></i></div><div class="st">${sts}${w ? ` · <span class="cw">⏳ ждёт проверки: ${w}</span>` : ''}${stk ? ` · <span class="cn">⚠ застрял: ${stk}</span>` : ''}</div>
      <label class="co-lvl">Уровень сложности: <select class="kr-lv l${lv}" data-k="co-lvsel" data-m="${m.id}" aria-label="Уровень сложности модуля ${m.n}">${LV.map(v => `<option value="${v.n}" ${v.n === lv ? 'selected' : ''}>${v.e} ${E(v.t)}</option>`).join('')}</select></label>
      <div class="co-sma">${PREVIEW_OPEN.includes(m.id) ? '<span class="mut">открыт всем на время пробы</span>' : op ? `<button class="kr-btn sm" data-k="co-close" data-m="${m.id}">🔒 Закрыть</button>` : `<button class="kr-btn sm pri" data-k="co-open" data-m="${m.id}">🔓 Открыть модуль</button>`}<button class="kr-btn sm ${op ? 'pri' : ''}" data-k="co-mod" data-m="${m.id}">Задания ›</button></div></div>`;
  }).join('') + '</div>' + unready();
  mount(h, quiet);
}
/* задания одного модуля у выбранного ученика */
function coModView(quiet) {
  const s = coStud(), m = mOf(CO.mod); if (!s || !m) { CO.mod = null; return coDraw(); }
  const d = m.tasks.filter(id => kDone(s, id)).length;
  let h = `<div class="kr-back">${coFromGrid() ? `<button class="kr-btn sm" data-k="nav-b">← Обзор</button><button class="kr-btn sm" data-k="co-who" data-s="${s.id}">👤 ${E(s.n)}</button>` : `<button class="kr-btn sm" data-k="co-who" data-s="${s.id}">← ${E(s.n)}</button>`}${CO.demo ? '<span class="co-demo">👀 Пример - не сохраняется</span>' : ''}</div>
    <div class="kr-card top"><div class="mut" style="font-weight:800;font-size:12px;letter-spacing:.08em">МОДУЛЬ ${m.n}</div><h3>${E(m.t)}</h3><p class="mut">${E(s.n)}, ${E(s.c)} · ${d} из ${m.tasks.length} заданий · ${lvChip(kLvl(s, m))}</p>${coLegend()}</div>`;
  h += '<div class="kr-road">' + m.tasks.map((id, k) => coTaskRow(s, id, k, true)).join('') + '</div>';
  const hl = CO.hl; CO.hl = null;
  mount(h, quiet);
  const row = hl && $(`.co-tr[data-tid="${hl}"]`, box);
  if (row) { row.classList.add('co-hl'); const nav = document.getElementById('vtb'), off = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0, r = row.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, scrollY + r.top - off - Math.max(12, (innerHeight - off - r.height) / 3)), behavior: 'auto' }); }
}
function coTaskRow(s, id, k, mine) {
  const L = K.lib[id], r = kRec(s, id), go = kGo(r), dn = kDone(s, id), acc = kAcc(s, id), ret = ((s.kc && s.kc.r) || {})[id], wt = kWaitS(s, id), stk = kStuck(s, id);
  const inf = [];
  if (!go) inf.push(acc ? '✓ засчитано без выполнения ' + E(acc) : '<span class="co-ns">не начато</span>');
  else {
    if (r.p != null) inf.push(`<b class="co-pc ${pcCls(r.p)}">${r.p}%</b>`);
    if (r.a) inf.push(plur(r.a, 'попытка', 'попытки', 'попыток'));
    if (dn && r.d) inf.push('сдано ' + E(r.d)); else if (!dn && !stk) inf.push('в процессе');
    if (r.l) inf.push('уровень ' + E(lvInfo(r.l).t));
  }
  if (r && r.k) inf.push(r.k > 0 ? '👍' : '👎');
  if (r && r.fb) inf.push('💬 "' + E(r.fb) + '"');
  const tags = [];
  if (stk) tags.push(coChip('cn', '⚠ нужно доп. задание'));
  if (r && r.s.indexOf('x') >= 0) tags.push(coChip('', '🔁 было доп. задание'));
  if (r && r.sk && !dn) tags.push(coChip('', '⏭ пропустил(а)'));
  let act = '';
  if (wt) act = `<span class="co-wl3"><button class="kr-btn pri" data-k="co-acc" data-s="${s.id}" data-t="${id}">✓ Принять</button><button class="kr-btn" data-k="co-ret" data-s="${s.id}" data-t="${id}">↩ Вернуть</button></span>`;
  else if (acc && go) act = `<small class="co-okd">✓ принято ${E(acc)}</small>`;
  else if (!go && !dn) act = `<button class="kr-btn sm co-cr" data-k="co-cred" data-s="${s.id}" data-t="${id}">✓ Засчитать без выполнения</button>`;
  return `<div class="kr-t co-tr ${dn ? 'ok' : ''}" data-tid="${id}"><span class="d">${dn ? '✓' : k + 1}</span><span class="e">${mine ? L.e : ''}</span><span class="co-tb"><b>${mine ? E(L.t) : E(s.n) + ', ' + E(s.c)}</b><small class="co-inf">${inf.join(' · ')}</small>${go ? coDots(L, r) : ''}${tags.length ? `<span class="co-chs">${tags.join('')}</span>` : ''}${r && r.f ? `<small>✈ ${E(r.f)}</small>` : ''}${r && r.c ? `<small>💬 "${E(r.c)}"</small>` : ''}${ret && !wt && !dn ? `<small class="co-rt2">↩ возвращено ${E(ret[0])}${ret[1] ? ': ' + E(ret[1]) : ''}</small>` : ''}${act}</span></div>`;
}
/* "чаще всего ошибаются": ключ вопроса -> текст из пулов заданий; созданные по формуле - понятная подпись */
const GENL = { 'g.s': 'Наклейка АКБ: сколько банок (число S)', 'g.full': 'Наклейка АКБ: вольты полностью заряженной АКБ', 'g.land': 'Наклейка АКБ: при каких вольтах садиться', 'g.cap': 'Наклейка АКБ: перевести mAh в ампер-часы',
  'g.chg': 'Наклейка АКБ: ток зарядки 1C', 'g.wh': 'Наклейка АКБ: энергия в ватт-часах', 'g.imax': 'Наклейка АКБ: максимальный ток (C x А·ч)', 'g.bal': 'Наклейка АКБ: сколько проводов у балансира',
  'm.land': 'Расчёт: вольты в очках - пора ли садиться', 'm.full': 'Расчёт: вольты полной АКБ nS' };
let QMAP = null;
function qText(k) {
  if (GENL[k]) return GENL[k];
  if (!QMAP) { QMAP = {}; Object.keys(K.lib).forEach(id => K.lib[id].steps.forEach(st => { if (st.s !== 'quiz') return; [].concat(Array.isArray(st.pool) ? st.pool : [], Array.isArray(st.x) ? st.x : []).forEach(q => { if (q && typeof q.q === 'string') { const h = qh(q.q); if (!QMAP[h]) QMAP[h] = q.q; } }); })); }
  return QMAP[k] || null;
}
function coWeak(L, tasks) {
  const out = [];
  tasks.forEach(tid => { let y = 0; const cnt = {};
    L.forEach(s => { const r = kRec(s, tid); if (!r || (r.p == null && !r.w)) return; y++; Object.keys(r.w || {}).forEach(k => cnt[k] = (cnt[k] || 0) + 1); });
    Object.keys(cnt).forEach(k => { const t = qText(k); if (t) out.push({ tid, x: cnt[k], y: Math.max(y, cnt[k]), t }); }); });
  return out.sort((a, b) => b.x - a.x || b.x / b.y - a.x / a.y).slice(0, 6);
}
/* модуль целиком: сводка, кому открыт, трудные вопросы, задания */
function coModOver(quiet) {
  const m = mOf(CO.cm); if (!m || !m.tasks) { CO.cm = null; return coDraw(); }
  const L = CO.list, q = coModStat(L, m), all = L.length && L.every(x => CO.sel.has(x.id));
  let h = `<div class="kr-back"><button class="kr-btn sm" data-k="co-back">← ${CO.tab === 'gr' ? 'Обзор' : 'Все модули'}</button>${CO.demo ? '<span class="co-demo">👀 Пример - не сохраняется</span>' : ''}</div>
    <div class="kr-card top"><div class="mut" style="font-weight:800;font-size:12px;letter-spacing:.08em">МОДУЛЬ ${m.n}</div><h3>${E(m.t)}</h3>${coMS(q)}<div class="st mut" style="margin-top:6px;font-size:13px">Пройден у ${q.dn} из ${L.length}${q.w ? ` · <span class="cw">ждут проверки: ${q.w}</span>` : ''}</div></div>
    <div class="kr-card co-opc"><button class="co-fold" data-k="co-oped" aria-expanded="${!!CO.opEd}"><span>🔓 Открыт у ${q.op} из ${L.length}</span><small>${CO.opEd ? 'готово ▴' : 'изменить ▾'}</small></button>
    ${PREVIEW_OPEN.includes(m.id) ? '<p class="mut" style="margin-top:6px;font-size:12.5px">В пробной версии этот модуль открыт всем.</p>' : ''}
    ${CO.opEd ? `<p class="mut" style="margin:8px 0">Отметь учеников, потом открой или закрой модуль. Зелёная рамка - уже открыт.</p>
      <div class="co-ch">${L.map(s => `<button data-k="co-sel" data-s="${s.id}" class="${CO.sel.has(s.id) ? 'on' : ''} ${kOpenM(s, m) ? 'op' : ''}" aria-pressed="${CO.sel.has(s.id)}">${kOpenM(s, m) ? '✓ ' : ''}${E(s.n)} ${E(s.c)}</button>`).join('')}</div>
      <div class="kr-back" style="margin-top:10px"><button class="kr-btn sm" data-k="co-all">${all ? 'Снять выбор' : 'Выбрать всех'}</button>${CO.sel.size ? `<button class="kr-btn sm pri" data-k="co-bulk" data-m="${m.id}">Открыть выбранным (${CO.sel.size})</button><button class="kr-btn sm" data-k="co-bulkc" data-m="${m.id}">Закрыть выбранным</button>` : ''}</div>` : ''}</div>`;
  const W = coWeak(L, m.tasks);
  if (W.length) h += `<div class="kr-card co-wk"><div class="kr-sec">❗ Чаще всего ошибаются</div><ul>${W.map(w => `<li><b>${E(w.t)}</b><small><span class="co-pc ${w.x / w.y >= .5 ? 'r' : 'a'}">ошиблись ${w.x} из ${w.y}</span> · ${K.lib[w.tid].e} ${E(K.lib[w.tid].t)}</small></li>`).join('')}</ul><p class="mut" style="margin-top:8px;font-size:12.5px">Эти вопросы стоит разобрать на занятии.</p></div>`;
  h += `<div class="kr-sec">Задания модуля</div><div class="kr-road">${m.tasks.map((id, k) => { const Lb = K.lib[id];
      const done = L.filter(s => kDone(s, id)).length, w = L.filter(s => kWaitS(s, id)).length, sk = L.filter(s => (kRec(s, id) || {}).sk && !kDone(s, id)).length, stuck = L.filter(s => kStuck(s, id)).length;
      const ps = L.map(s => (kRec(s, id) || {}).p).filter(v => v != null), avg = ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null;
      let up = 0, dn = 0; L.forEach(s => { const v = (kRec(s, id) || {}).k; if (v > 0) up++; if (v < 0) dn++; });
      const hard = stuck >= 2 || (avg != null && avg < 70 && ps.length >= 2);
      return `<button class="kr-t co-mt2" data-k="co-ct" data-t="${id}"><span class="d">${k + 1}</span><span class="e">${Lb.e}</span><span class="co-tb"><b>${E(Lb.t)}</b>${hard ? '<em class="co-hard">⚠ трудное задание</em>' : ''}<small>Сдали ${done} из ${L.length}${avg != null ? ` · средний результат <b class="co-pc ${pcCls(avg)}">${avg}%</b>` : ''}${stuck ? ` · <span class="cn">застряли ${stuck}</span>` : ''}${w ? ` · <span class="cw">ждут проверки ${w}</span>` : ''}${sk ? ` · пропустили ${sk}` : ''}${up || dn ? ` · 👍 ${up} 👎 ${dn}` : ''}</small><span class="kr-bar thin"><i style="width:${L.length ? done / L.length * 100 : 0}%"></i></span></span><span class="r">›</span></button>`; }).join('')}</div>`;
  mount(h, quiet);
}
/* одно задание: все ученики по группам */
function coTaskView(quiet) {
  const m = mOf(CO.cm), id = CO.ct, Lb = K.lib[id]; if (!m || !Lb) { CO.ct = null; return coDraw(); }
  const G = { w: [], n: [], p: [], z: [], d: [] };
  CO.list.forEach(s => { const r = kRec(s, id); G[kWaitS(s, id) ? 'w' : kDone(s, id) ? 'd' : kStuck(s, id) ? 'n' : kGo(r) ? 'p' : 'z'].push(s); });
  const H = [['w', '⏳ Ждут проверки'], ['n', '⚠ Застряли'], ['p', '▶ В процессе'], ['z', '○ Не начали'], ['d', '✓ Сдали']];
  let h = `<div class="kr-back"><button class="kr-btn sm" data-k="co-cm" data-m="${m.id}">← Модуль ${m.n}</button>${CO.demo ? '<span class="co-demo">👀 Пример - не сохраняется</span>' : ''}</div>
    <div class="kr-card top"><span style="float:right;font-size:30px">${Lb.e}</span><div class="mut" style="font-weight:800;font-size:12px;letter-spacing:.08em">М${m.n} · ЗАДАНИЕ ${m.tasks.indexOf(id) + 1}</div><h3>${E(Lb.t)}</h3><p class="mut">${E(Lb.sub)}</p><p class="mut" style="margin-top:6px">Шаги: ${Lb.steps.map(st => E(stepName(st))).join(' → ')}</p>${coLegend()}
    <div class="co-gc">${H.map(([g, t]) => `<span class="${G[g].length ? '' : 'z'}">${t.split(' ')[0]} ${G[g].length}</span>`).join('')}</div></div>`;
  H.forEach(([g, t]) => { if (!G[g].length) return;
    h += `<div class="co-gh2"><span class="kr-sec">${t} (${G[g].length})</span>${g === 'w' ? coAccAll(id, G.w) : ''}</div><div class="kr-road">${G[g].map((s, k) => coTaskRow(s, id, k, false)).join('')}</div>`; });
  mount(h, quiet);
}
css.textContent += `
.kpic-e{font-size:60px;line-height:1.15;text-align:center;margin:4px 0 8px;animation:krPop .6s both}
.kchain{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;margin:6px 0 12px}
.kchain span{padding:8px 11px;border-radius:12px;background:rgba(var(--krgb),.14);border:1px solid rgba(var(--krgb),.45);font-weight:800;font-size:13.5px;animation:krIn .5s both}
.kchain i{font-style:normal;opacity:.75;font-weight:800}
.kspin{animation:krSpin .5s linear infinite}.kspin.r{animation-direction:reverse}
.kg-item{padding:18px 14px;border-radius:16px;background:rgba(var(--krgb),.1);border:1px solid rgba(var(--krgb),.4);font-size:17px;font-weight:700;text-align:center;line-height:1.4;margin:8px 0 12px;animation:krIn .4s both}
.kg-ord{margin:0 0 10px;padding-left:24px;display:grid;gap:6px}
.kg-ord li{min-height:42px;padding:10px 12px;border-radius:12px;border:1px dashed rgba(127,127,160,.45);font-weight:700;font-size:14.5px;line-height:1.3}
.kg-ord li.on{border-style:solid;border-color:#22c55e;background:rgba(34,197,94,.12);animation:krPop .35s both}
.kg-pool{display:grid;gap:8px}.kg-pool .gone{display:none}
.kg-mt{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kg-mt>div{display:grid;gap:8px;align-content:start}
.kg-mt .kr-opt{font-size:13.5px;min-height:54px;line-height:1.3;padding:8px 10px}.kg-mt .kr-opt.sel{border-color:var(--ka);background:rgba(var(--krgb),.22)}
#t-kurs.kq .kr-m,#t-kurs.kq .kr-t,#t-kurs.kq .kr-card{animation:none !important}
.kr-gnav{position:sticky;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:40;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:16px;padding:8px;border-radius:18px;background:rgb(12,13,30);border:1px solid rgba(var(--krgb),.35);box-shadow:0 10px 30px -10px rgba(0,0,0,.7)}
.kr-gnav .kr-btn{min-height:48px;padding:0 14px;font-size:15px}
.kr-gnc{min-width:0;text-align:center;line-height:1.25}.kr-gnc b{display:block;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kr-gnc span{display:block;font-size:12px;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kr-svc{position:sticky;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:40;justify-self:center;display:flex;align-items:center;gap:6px;min-height:36px;padding:6px 14px;border-radius:99px;background:rgb(12,13,30);border:1px solid rgba(var(--krgb),.35);box-shadow:0 8px 22px -10px rgba(0,0,0,.8);font-size:13px;font-weight:700}
.kr-svc:empty{display:none}.kr-svc .kr-btn{min-height:36px}
.kr-spin{display:inline-block;width:11px;height:11px;margin-right:6px;border-radius:50%;border:2px solid rgba(var(--krgb),.3);border-top-color:var(--ka);vertical-align:-1px;animation:krSp .8s linear infinite}
@keyframes krSp{to{transform:rotate(360deg)}}
@media (max-width:420px){.kr-gnav .kr-btn{padding:0 10px;font-size:14px}.kr-gnc b{font-size:12.5px}}
/* удобство на телефоне: кнопки от 44 px, шаги переносятся, ничего не прячется под нижней панелью */
.kr-btn.sm{min-height:44px}
.kr-stp{flex-wrap:wrap;overflow:visible}.kr-stp button{min-height:44px}
.kr-like button{min-height:44px}
#t-kurs .kr-end,#t-kurs .kr-why,#t-kurs .kq-r,#t-kurs .kr-x{scroll-margin-bottom:96px}
#krStage{padding-bottom:18px}
.kr-t[hidden]{display:none}
.kr-bug{flex:none;width:44px;height:44px;margin-left:auto;border-radius:13px;border:1px solid rgba(250,204,21,.4);background:rgba(250,204,21,.08);color:#fde68a;font-size:17px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.kr-card>.kr-bug{float:right;margin:-4px -4px 0 8px}
.kr-back .kr-btn.sm+.kr-bug,.kr-back .mut+.kr-bug{margin-left:6px}
.kr-cont{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:64px;padding:10px 18px;text-align:left;font-size:16px;line-height:1.3;border-radius:18px;animation:krIn .45s both}
.kr-cont small{font-size:12.5px;font-weight:700;opacity:.75}
.kr-lvc{padding:10px 12px}
.kr-lvr{display:flex;align-items:center;gap:8px}.kr-lvr .kr-sec{margin:0;flex:none}
.kr-lvs.sm{flex:1;margin:0;gap:6px}.kr-lvs.sm button{min-height:44px;padding:4px 2px;font-size:12.5px}
.kr-lvi summary{cursor:pointer;font-size:12.5px;font-weight:700;opacity:.7;margin-top:8px;min-height:24px}
.kr-lvi p{margin-top:6px}
.kr-lmore{width:100%;min-height:44px;padding:8px 14px;border-radius:14px;border:1px dashed rgba(127,127,160,.4);background:none;color:inherit;opacity:.75;font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer;text-align:left}
@media (max-width:380px){.kr-lvr{flex-wrap:wrap}.kr-lvs.sm{flex-basis:100%}}
/* плавающие кнопки других скриптов во вкладке Курс не закрывают задания */
body.kr-on #toSchool,body.kr-on .spkbug{display:none !important}
body.kr-on #toast{bottom:calc(86px + env(safe-area-inset-bottom,0px)) !important}
body.kr-co #ahero,body.kr-co #pnBeta{display:none !important}
#krUndo{position:fixed;left:50%;bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:9500;display:flex;align-items:center;gap:10px;width:min(92vw,460px);padding:8px 8px 8px 14px;border-radius:16px;background:rgb(16,18,40);border:1px solid rgba(34,197,94,.55);color:#e5e7eb;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 14px 30px -10px rgba(0,0,0,.8);transform:translate(-50%,24px);opacity:0;pointer-events:none;transition:transform .25s,opacity .25s;overflow:hidden}
#krUndo.on{transform:translate(-50%,0);opacity:1;pointer-events:auto}
#krUndo span{flex:1;min-width:0}
#krUndo button{flex:none;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid #facc15;background:rgba(250,204,21,.12);color:#fde68a;font:800 14px system-ui,sans-serif;cursor:pointer}
#krUndo i{position:absolute;left:0;bottom:0;height:3px;width:100%;background:#22c55e;transform-origin:left}
#krUndo.on i{animation:krUndoT 6s linear forwards}
@keyframes krUndoT{to{transform:scaleX(0)}}
#krRet{position:fixed;inset:0;z-index:9600;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,4,14,.6);opacity:0;pointer-events:none;transition:opacity .2s}
#krRet.on{opacity:1;pointer-events:auto}
#krRet .kr-shb{width:min(100%,520px);box-sizing:border-box;padding:18px 16px calc(16px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;background:rgb(16,18,40);border:1px solid rgba(127,127,160,.35);color:#e5e7eb;font:15px/1.45 system-ui,sans-serif;transform:translateY(30px);transition:transform .25s;outline:none}
#krRet.on .kr-shb{transform:none}
#krRet b{font-size:17px}#krRet p{margin:4px 0 12px;opacity:.8;font-size:14px}
#krRet label{display:grid;gap:6px;font-size:13px;font-weight:700}
#krRet textarea{font:inherit;font-size:15px;color:inherit;background:rgba(0,0,0,.3);border:1px solid rgba(127,127,160,.45);border-radius:12px;padding:10px 12px;width:100%;box-sizing:border-box;resize:vertical}
.kr-shc{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}
.kr-shc button{min-height:44px;padding:0 14px;border-radius:99px;border:1px solid rgba(127,127,160,.4);background:rgba(127,127,160,.1);color:inherit;font:700 14px system-ui,sans-serif;cursor:pointer}
.kr-shc button.on{border-color:#facc15;background:rgba(250,204,21,.15)}
.kr-sha{display:grid;grid-template-columns:1fr 1.4fr;gap:8px}
@media (prefers-reduced-motion:reduce){#krUndo,#krRet,#krRet .kr-shb{transition:none}#krUndo.on i{animation:none}}
/* таблица ученики x модули */
.co-gw{overflow-x:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;border-radius:16px;border:1px solid rgba(127,127,160,.26);background:rgba(12,13,30,.86);outline:none}
.co-gt{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}
.co-gt th,.co-gt td{padding:0;border-bottom:1px solid rgba(127,127,160,.16);vertical-align:middle;text-align:left}
.co-gt tbody tr:last-child>*{border-bottom:0}
.co-gt th[scope=row],.co-gt .co-g0{position:sticky;left:0;z-index:2;background:rgb(15,16,34);border-right:1px solid rgba(127,127,160,.22);box-shadow:4px 0 8px -6px rgba(0,0,0,.8)}
.co-g0{padding:8px 10px !important;font-size:12px;font-weight:800;opacity:.75;vertical-align:bottom !important}
.co-gt tr.ns>*{opacity:.62}.co-gt tr.ns th[scope=row]{opacity:1}.co-gt tr.ns th[scope=row] .co-gn{opacity:.62}
.co-gn{display:flex;flex-direction:column;justify-content:center;gap:1px;width:96px;min-height:52px;padding:6px 10px;border:0;background:none;color:inherit;font-family:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.co-gn b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.co-gn small{font-size:12px;opacity:.75}
.co-gmh{display:flex;flex-direction:column;gap:2px;width:100%;min-height:64px;padding:8px 10px;border:0;background:none;color:inherit;font-family:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.co-gmh b{font-size:14px;color:var(--ka)}.co-gmh b span{opacity:.7}
.co-ght{font-size:12px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;opacity:.9}
.co-gmh small{font-size:11.5px;font-weight:700;opacity:.8;white-space:nowrap}
.co-gt td{border-left:1px solid rgba(127,127,160,.1)}
.co-gcl{display:flex;flex-direction:column;justify-content:center;gap:4px;width:100%;min-width:calc(var(--n) * 12px + 18px);min-height:52px;padding:7px 9px;border:0;background:none;color:inherit;font-family:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.co-gcl:active{background:rgba(var(--krgb),.1)}.co-gcl.lock .co-gb{opacity:.4}
.co-gcl small{font-size:11.5px;font-weight:700;opacity:.8;white-space:nowrap}
.co-gb{display:flex;gap:2px;height:22px}
.co-gb .co-sg{flex:1 1 0;min-width:10px;height:100%}
.co-sg{position:relative;display:inline-block;box-sizing:border-box;width:14px;height:14px;border-radius:4px;border:1px solid rgba(160,160,190,.38);background:transparent;flex:none;font-style:normal}
.co-sg.s-d{background:var(--c);border-color:var(--c)}
.co-sg.s-w:after{content:"";position:absolute;right:1px;top:1px;width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 0 1.5px #1e3a8a}
.co-sg.s-p{border-color:rgba(var(--krgb),.7);background:repeating-linear-gradient(135deg,rgba(var(--krgb),.55) 0 3px,transparent 3px 6px)}
.co-sg.s-n{background:#dc2626;border-color:#dc2626}
.co-sg.s-n:after{content:"!";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12px;line-height:1}
.co-sg.s-r{border:2px solid #f87171}
.co-sg.s-k{border:1.5px dashed rgba(200,200,220,.6)}
.co-gl{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:10px;font-size:12px;opacity:.85}.co-gl span{display:inline-flex;align-items:center;gap:5px}
.co-gl .co-sg{width:14px;height:12px}.co-gl .co-sg.s-n:after{font-size:10px}.co-gl .co-sg.s-w:after{width:5px;height:5px}
.co-gsc{display:inline-block;width:42px;height:10px;border-radius:4px;background:linear-gradient(90deg,hsl(0,80%,52%) 0 25%,hsl(40,80%,52%) 50%,hsl(135,62%,44%) 80%)}
.co-gtip{font-size:12.5px;margin-top:6px}
.co-tr.co-hl{border-radius:14px;box-shadow:0 0 0 2px var(--ka);background:rgba(var(--krgb),.1)}
#krGp{position:fixed;inset:0;z-index:9600;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,4,14,.6);opacity:0;pointer-events:none;transition:opacity .2s}
#krGp.on{opacity:1;pointer-events:auto}
#krGp .kr-shb{width:min(100%,520px);max-height:86vh;overflow-y:auto;box-sizing:border-box;padding:18px 16px calc(16px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;background:rgb(16,18,40);border:1px solid rgba(127,127,160,.35);color:#e5e7eb;font:15px/1.45 system-ui,sans-serif;transform:translateY(30px);transition:transform .25s;outline:none}
#krGp.on .kr-shb{transform:none}
#krGp b#krGpH{font-size:17px}#krGp p{margin:2px 0 10px;opacity:.8;font-size:14px}
.co-gpl{display:grid;gap:4px;margin-bottom:12px}
.co-gpl button{display:flex;align-items:center;gap:10px;min-height:48px;padding:6px 10px;border-radius:12px;border:1px solid rgba(127,127,160,.22);background:rgba(127,127,160,.06);color:inherit;font-family:inherit;text-align:left;cursor:pointer}
.co-gpl button .co-sg{width:18px;height:18px}
.co-gpl span{flex:1;min-width:0;display:grid}.co-gpl span b{font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.co-gpl small{font-size:12.5px;opacity:.8}
.co-gpl em{font-style:normal;opacity:.6;font-weight:800}
@media (min-width:700px){.co-gn{width:150px}.co-gb{height:24px}.co-gcl{padding:8px 12px}}
@media (prefers-reduced-motion:reduce){#krGp,#krGp .kr-shb{transition:none}}
/* окно тренера */
.co-hd{padding:12px 14px}
.co-hr{display:flex;align-items:center;gap:8px}.co-ht{flex:1;min-width:0}.co-ht h3{margin:0;font-size:18px}
.co-upd{display:block;font-size:12.5px;opacity:.7;margin-top:2px}
.co-tp{display:flex;margin-top:10px}.co-tp[hidden]{display:none}
.co-hb{display:flex;gap:6px;flex:none}.co-hb .kr-bug{margin:0}
.co-ib{width:44px;min-width:44px;padding:0;font-size:19px}
.co-menu{display:grid;gap:8px;margin-top:10px}.co-menu .kr-btn{justify-content:flex-start}.co-menu p{font-size:12.5px}
.co-demo{display:inline-block;margin-top:4px;padding:3px 10px;border-radius:99px;background:rgba(250,204,21,.14);color:#fde68a;font-size:12.5px;font-weight:800}
.kr-back .co-demo{margin:0 0 0 auto}
.co-sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.co-t{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;min-height:64px;padding:8px 10px;border-radius:14px;border:1px solid rgba(127,127,160,.3);background:rgba(12,13,30,.86);color:inherit;font-family:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.co-t b{font-size:22px;line-height:1.1}.co-t small{font-size:12px;font-weight:700;opacity:.8;line-height:1.2}
.co-t.co-tw b{color:#facc15}.co-t.co-tn b{color:#f87171}.co-t.co-ti b{color:#fdba74}.co-t.co-tp b{color:var(--ka)}
.co-t.z b{color:inherit;opacity:.45}
.co-t.on{border-color:var(--ka);box-shadow:0 0 0 1px var(--ka) inset;background:rgba(var(--krgb),.12)}
@media (max-width:560px){.co-sum{grid-template-columns:1fr 1fr}}
.co-fl{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13.5px;font-weight:700}
.co-tabs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.co-tabs button{min-height:48px;border-radius:14px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.08);color:inherit;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer}
.co-tabs button small{margin-left:6px;opacity:.7;font-weight:700}.co-tabs button.on{border-color:var(--ka);background:rgba(var(--krgb),.18);box-shadow:0 0 0 1px var(--ka) inset}
.co-list{display:grid;gap:8px}
.co-gh{margin:6px 0 -4px}
.co-sr{display:grid;grid-template-columns:1fr auto;gap:5px 10px;align-items:center;text-align:left;width:100%;padding:12px 14px;border-radius:16px;border:1px solid rgba(127,127,160,.26);background:rgba(12,13,30,.86);color:inherit;font-family:inherit;cursor:pointer}
.co-sr:active{transform:scale(.99)}.co-sr.co-stk{border-color:rgba(248,113,113,.55)}.co-sr.co-nsr{opacity:.62}
.co-sn{font-size:16px}.co-sn small{opacity:.7;font-size:13px}.co-sp{grid-row:1;grid-column:2;font-size:14px}
.co-sl2{grid-column:1/3;font-size:13px;opacity:.88;line-height:1.35}
.co-sr .kr-bar,.co-sr .co-chs,.co-sr .co-seen{grid-column:1/3}
.co-ns{color:#9ca3af}.co-ok{color:#86efac;font-weight:700;font-size:13px}.co-sk{color:#fdba74}
.co-seen{font-size:12px;opacity:.65}.co-seen.old{color:#fbbf24;opacity:1;font-weight:700}
.kr-bar.thin{height:5px;margin-top:6px}.co-sr .kr-bar.thin{margin-top:0}
.co-chs{display:flex;flex-wrap:wrap;gap:5px}
.co-c{display:inline-flex;align-items:center;padding:3px 9px;border-radius:99px;font-size:12.5px;font-weight:700;line-height:1.3;background:rgba(127,127,160,.16)}
.co-c.cn{background:rgba(248,113,113,.18);color:#fca5a5}.co-c.cw{background:rgba(250,204,21,.16);color:#fde68a}.co-c.cr{background:rgba(251,146,60,.16);color:#fdba74}
.cn{color:#fca5a5}.cw{color:#facc15}
.co-pc.g{color:#86efac}.co-pc.a{color:#fde68a}.co-pc.r{color:#fca5a5}
.co-mt{font-style:normal;font-size:11.5px;font-weight:800;padding:1px 6px;border-radius:6px;background:rgba(var(--krgb),.16);color:var(--ka);margin-right:2px}
.co-wc{border-color:rgba(250,204,21,.4)}
.co-wg+.co-wg{margin-top:12px}
.co-wgh{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-weight:800;font-size:14px;margin-bottom:6px}
.co-w{display:grid;gap:8px}
.co-wi{padding:10px;border-radius:12px;background:rgba(250,204,21,.07);font-size:14px}.co-wi+.co-wi{margin-top:6px}
.co-wl1{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.co-wd{font-size:12.5px;opacity:.75}.co-wd.old{color:#fbbf24;opacity:1;font-weight:700}
.co-wl2{font-size:13px;margin-top:4px;opacity:.9}
.co-wl3{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;width:100%}
.co-fold{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:44px;padding:0;border:0;background:none;color:inherit;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer;text-align:left}
.co-fold small{font-weight:700;opacity:.7;font-size:13px}
.co-rtc{padding:8px 14px}
.co-rt{margin:6px 0 4px;padding:0;list-style:none;display:grid;gap:4px}
.co-rt li{display:flex;align-items:center;gap:10px;font-size:14px;min-height:30px}.co-rt li i{font-style:normal;width:22px;text-align:center;font-weight:800;opacity:.7}.co-rt li span{flex:1;font-weight:700}
.co-ms{font-size:13px;line-height:1.45;margin-top:6px;opacity:.92}
.co-mc .st{margin-top:8px}
.co-un{padding:10px 14px;border-radius:14px;border:1px dashed rgba(127,127,160,.35);font-size:13.5px;opacity:.7}
.co-lk{white-space:nowrap}
.co-ss{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:14px;margin-top:6px}
.kr-card .co-chs{margin-top:10px}
.co-smc{padding:12px 14px}.co-smc.lock{opacity:.7}
.co-smh .nn{display:block;font-size:11.5px;font-weight:800;letter-spacing:.08em;opacity:.7}.co-smh b{font-size:16px}
.co-smc .st{font-size:13px;font-weight:700;margin-top:6px}
.co-lvl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:13px;font-weight:700;opacity:.95}
.co-lvl select{appearance:auto;min-height:40px;padding:4px 10px;border:1px solid rgba(127,127,160,.4);font:inherit;font-weight:800;font-size:13px;color:inherit;cursor:pointer}
.co-lvl select option{background:#14152b;color:#fff}
.co-sma{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}.co-sma .mut{font-size:12.5px}
.co-leg{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:10px;font-size:12px;opacity:.8}
.co-leg span{display:inline-flex;align-items:center;gap:5px}
.co-dots{display:flex;gap:4px;margin-top:6px}
.co-dots i,.co-leg i{display:inline-block;width:18px;height:8px;border-radius:9px;background:rgba(127,127,160,.35)}
.co-leg i{width:14px}
i.d-ok{background:#22c55e}i.d-x{background:#38bdf8}i.d-n{background:#f87171}i.d-w{background:#facc15}
.co-tr{cursor:default;animation:none;align-items:flex-start}.co-tr .d{top:22px}
.co-tb{min-width:0;flex:1;display:grid;gap:3px}
.co-tb small{margin-top:0}
.kr-t .co-tb small b,.kr-t .co-tb small span,.co-ms b{display:inline;font-size:inherit}
.co-inf{font-size:13px !important;opacity:.9 !important}
.co-okd{color:#86efac;font-weight:700}
.co-rt2{color:#fca5a5}
.co-cr{justify-self:start;margin-top:2px;padding:0 4px !important;border:0 !important;background:none !important;font-weight:700;font-size:12.5px !important;opacity:.6;text-decoration:underline dotted}
.co-mt2{animation:none}
.co-hard{display:inline-block;font-style:normal;font-size:12px;font-weight:800;padding:2px 8px;border-radius:99px;background:rgba(248,113,113,.16);color:#fca5a5;justify-self:start}
.co-wk ul{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.co-wk li{padding:9px 11px;border-radius:12px;background:rgba(248,113,113,.07);border-left:3px solid rgba(248,113,113,.6);font-size:14px;line-height:1.4}
.co-wk li small{display:block;margin-top:3px;font-size:12.5px;opacity:.85}
.co-gc{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:10px;font-size:13px;font-weight:800}.co-gc .z{opacity:.4}
.co-gh2{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:4px}.co-gh2 .kr-sec{margin:0}
.co-ch{display:flex;flex-wrap:wrap;gap:6px}.co-ch button{min-height:44px;padding:0 14px;border-radius:99px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.08);color:inherit;font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer}
.co-ch button.on{background:rgba(var(--krgb),.22);border-color:var(--ka)}.co-ch button.op{border-color:#22c55e}
`;
document.addEventListener('click', e => {
  if (!box || !box.contains(e.target)) return;
  const b = e.target.closest('[data-k^="co-"]'); if (!b) return;
  const k = b.dataset.k, sid = b.dataset.s;
  if (k === 'co-rstall') { const ids = CO.list.map(s => s.id); if (!ids.length || !confirm('Обнулить результаты всех ' + ids.length + ' учеников Взлёта? Отменить нельзя.')) return; b.disabled = true; b.textContent = '⏳ Обнуляю...';
    (async () => { let bad = ''; for (let i = 0; i < ids.length; i += 50) { try { const j = await spkCall({ op: 'sset', act: 'reset', ids: ids.slice(i, i + 50), token: CO.tok }); if (!j.ok) bad = j.error || 'ошибка'; } catch (e) { bad = 'нет связи'; } } toastK(bad ? 'Не получилось: ' + bad : 'Готово: результаты всех обнулены'); coLoad(); })(); return; }
  if (k === 'co-load') { CO.demo = false; CO.menu = false; coLoad(); }
  else if (k === 'co-demo') { undoFlush(); CO.demo = !CO.demo; CO.menu = false; CO.who = null; CO.mod = null; CO.cm = null; CO.ct = null; CO.f = null; CO.sel.clear(); if (CO.demo) coDemo(); else { CO.list = []; coLoad(); return; } coDraw(); }
  else if (k === 'co-menu') { CO.menu = !CO.menu; coDraw(true); }
  else if (k === 'co-f') { const v = b.dataset.v || null; CO.f = CO.f === v ? null : v; CO.tab = 'st'; sesS.set('vz_co_tab', 'st'); coDraw(true); }
  else if (k === 'co-rt') { CO.rt = !CO.rt; coDraw(true); }
  else if (k === 'co-oped') { CO.opEd = !CO.opEd; if (!CO.opEd) CO.sel.clear(); coDraw(true); }
  else if (k === 'co-as') { CO.menu = false; CO.as = true; home(); scrollTop(); }
  else if (k === 'co-home') { CO.as = false; home(); scrollTop(); }
  else if (k === 'co-back') { CO.who = null; CO.mod = null; CO.cm = null; CO.ct = null; coDraw(); scrollTop(); }
  else if (k === 'co-who') { CO.who = sid; CO.mod = null; CO.cm = null; CO.ct = null; coDraw(); scrollTop(); }
  else if (k === 'co-mod') { CO.mod = b.dataset.m; coDraw(); scrollTop(); }
  else if (k === 'co-tab') { CO.tab = b.dataset.v; sesS.set('vz_co_tab', CO.tab); coDraw(true); }
  else if (k === 'co-gt' && gPT === 'mouse') gGo(sid, b.dataset.m, b.dataset.t);
  else if (k === 'co-gt' || k === 'co-gc') gPop(sid, b.dataset.m);
  else if (k === 'co-cm') { CO.cm = b.dataset.m; CO.ct = null; CO.who = null; CO.mod = null; CO.opEd = false; CO.sel.clear(); coDraw(); scrollTop(); }
  else if (k === 'co-ct') { CO.ct = b.dataset.t; coDraw(); scrollTop(); }
  else if (k === 'co-retry') { COQ.bad = false; coSv(); coPump(); }
  else if (k === 'co-all') { const all = CO.list.every(x => CO.sel.has(x.id)); CO.list.forEach(x => all ? CO.sel.delete(x.id) : CO.sel.add(x.id)); coDraw(true); }
  else if (k === 'co-open' || k === 'co-close') coAct(CO.who, { k: k === 'co-open' ? 'open' : 'close', mod: b.dataset.m });
  else if (k === 'co-lvl') coAct(CO.who, { k: 'lvl', mod: b.dataset.m, v: +b.dataset.v });
  else if (k === 'co-acc' || k === 'co-cred') coAccept([sid], b.dataset.t);
  else if (k === 'co-accall') coAccept(String(b.dataset.ids || '').split(',').filter(Boolean), b.dataset.t);
  else if (k === 'co-ret') retOpen([sid], b.dataset.t);
  else if (k === 'co-sel') { CO.sel.has(sid) ? CO.sel.delete(sid) : CO.sel.add(sid); coDraw(true); }
  else if (k === 'co-bulk') { if (CO.sel.size) coAct([...CO.sel], { k: 'open', mod: b.dataset.m }); CO.sel.clear(); coDraw(true); }
  else if (k === 'co-bulkc') { if (CO.sel.size) coAct([...CO.sel], { k: 'close', mod: b.dataset.m }); CO.sel.clear(); coDraw(true); }
});
document.addEventListener('change', e => {
  if (!box || !box.contains(e.target)) return;
  const t = e.target; if (t.dataset && t.dataset.k === 'co-lvsel' && CO.who) coAct(CO.who, { k: 'lvl', mod: t.dataset.m, v: +t.value });
});
document.addEventListener('visibilitychange', () => { if (document.hidden) undoFlush(); });
addEventListener('pagehide', undoFlush);
document.addEventListener('submit', e => {
  if (!box || e.target.id !== 'coPin') return; e.preventDefault();
  const pin = String(new FormData(e.target).get('pin') || '').trim(); if (pin) coLoad(pin);
});

/* ---------- клики ---------- */
document.addEventListener('click', e => {
  if (!box || !box.contains(e.target)) return;
  const b = e.target.closest('[data-k]'); if (!b) return;
  const k = b.dataset.k;
  if (k === 'nav-b') navBack();
  else if (k === 'nav-f') navFwd();
  else if (k === 'skip') { const tid = b.dataset.t; if (!confirm('Пропустить это задание? Откроется следующее. Вернуться к нему можно позже.')) return; T(tid).skip = today(); save(); snd('tap'); const m = modOf(tid), nx = m.tasks[m.tasks.indexOf(tid) + 1]; toastK('Пропущено. К заданию можно вернуться из модуля'); nx ? taskView(nx) : modView(m.id); scrollTop(); }
  else if (k === 'home') { home(); scrollTop(); }
  else if (k === 'mod') { modView(b.dataset.m); scrollTop(); }
  else if (k === 'task') { taskView(b.dataset.t); scrollTop(); }
  else if (k === 'step') { taskView(VIEW.t, +b.dataset.i); scrollTop(); }
  else if (k === 'retry') { const L = K.lib[VIEW.t]; quizStep(VIEW.t, +b.dataset.i, L.steps[+b.dataset.i], $('#krStage', box)); }
  else if (k === 'retryx') { const L = K.lib[VIEW.t]; quizStep(VIEW.t, +b.dataset.i, L.steps[+b.dataset.i], $('#krStage', box), true); }
  else if (k === 'game' || k === 'gamex') { const L = K.lib[VIEW.t]; gameStep(VIEW.t, +b.dataset.i, L.steps[+b.dataset.i], $('#krStage', box), k === 'gamex'); }
  else if (k === 'refly') { const x = stepSt(VIEW.t, +b.dataset.i); x.ok = false; flyStep(VIEW.t, +b.dataset.i, K.lib[VIEW.t].steps[+b.dataset.i], $('#krStage', box)); }
  else if (k === 'reread') { const L = K.lib[VIEW.t], c = L.steps.findIndex(s => s.s === 'cards'); taskView(VIEW.t, c < 0 ? 0 : c); }
  else if (k === 'bug') { const s = document.querySelector('.spkbug'); if (s) s.click(); else toastK('Окно сообщения ещё загружается, попробуй через пару секунд'); }
  else if (k === 'lockmore') { ROADALL[b.dataset.m] = 1; modView(b.dataset.m); }
  else if (k === 'lvl') { S.lvl[b.dataset.m] = +b.dataset.v; save(); snd('tap'); modView(b.dataset.m); toastK('Уровень: ' + lvInfo(+b.dataset.v).t); }
  else if (k === 'fb') { const t = T(b.dataset.t), ta = document.getElementById('fb-' + b.dataset.t), v = ta ? ta.value.replace(/\s+/g, ' ').trim().slice(0, 140) : ''; t.fb = v; save(); b.textContent = v ? '✓ Отправлено, изменить' : 'Отправить тренеру'; snd('tap'); toastK(v ? 'Спасибо! Тренер увидит комментарий' : 'Комментарий убран'); }
  else if (k === 'beta-ok') { try { localStorage.setItem('vz_beta2_seen', '1'); } catch (e) {} const d = b.closest('details'); if (d) d.open = false; window.scrollTo({ top: Math.max(0, (box.getBoundingClientRect().top + scrollY) - 70), behavior: 'smooth' }); }
  else if (k === 'like') { const t = T(b.dataset.t), v = +b.dataset.v; t.like = t.like === v ? 0 : v; save(); $$('.kr-like button', box).forEach(z => z.classList.toggle('on', +z.dataset.v === t.like)); snd('tap'); if (t.like) toastK(v > 0 ? 'Спасибо! 👍 Тренер увидит' : 'Спасибо! Тренер поправит задание'); }
});

/* ---------- старт ---------- */
function init() {
  box = document.getElementById('t-kurs'); if (!box) return;
  home(); kSync();
  bodyCls(); try { new MutationObserver(bodyCls).observe(box, { attributes: true, attributeFilter: ['hidden'] }); } catch (e) {}
  setInterval(coUpd, 30000);
  const nav = document.getElementById('vt');
  if (nav) nav.addEventListener('click', e => { const b = e.target.closest('button[data-t="kurs"]'); if (b && VIEW.t == null && VIEW.m == null) home(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
window.VZ_KURS_STATE = () => S;
window.VZ_KURS_GEN = { genLabel, genMix, buildQs };
})();
