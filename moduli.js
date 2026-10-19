/* Взлёт: вкладка "Курс" - модули по шагам (задания и подзадачи из zadaniya-vzlet.js).
   Шаги внутри модуля открываются сами по порядку. Следующий модуль открывает тренер.
   Плохо прошёл проверку (меньше 70%) - обязательное доп.задание "другими словами", без очков.
   Прогресс пока хранится на устройстве (localStorage vz_kurs), очки идут в рейтинг через SPK_PROGRESS.
   Подключение: <div class="vtab" id="t-kurs" hidden></div>, затем zadaniya-vzlet.js и moduli.js. */
(function () {
'use strict';
const K = window.VZ_KURS; if (!K) return;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'vz_kurs', PASS = 0.7;
const PREVIEW_OPEN = ['m3'];   // пробная версия: модуль 3 открыт для проверки, пока нет окна тренера
const isCoach = () => typeof MODE !== 'undefined' && MODE === 'coach';
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const fx = (n, d = 1) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
const today = () => new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

/* ---------- состояние ---------- */
let S = { t: {} };
try { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
S.t = S.t || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (window.SPK && SPK.sync) try { SPK.sync(); } catch (e) {} };
const T = id => (S.t[id] = S.t[id] || { s: {} });
const stepSt = (id, i) => { const t = T(id); return (t.s[i] = t.s[i] || {}); };
const taskDone = id => !!(S.t[id] && S.t[id].done);
function taskOpen(m, k) { return isCoach() || k === 0 || taskDone(m.tasks[k - 1]); }
function modOpen(m) { return !!m.tasks && (isCoach() || PREVIEW_OPEN.includes(m.id) || (S.open || []).includes(m.id)); }
function modProg(m) { if (!m.tasks) return 0; return m.tasks.filter(taskDone).length / m.tasks.length; }
/* очки задания = pts x средний лучший результат проверок задания (доп.задания очков не дают) */
function taskPts(id) {
  const L = K.lib[id], t = S.t[id]; if (!L || !t || !t.done) return 0;
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
const lvlOf = mid => S.lvl[mid] || clsLvl();
const lvInfo = n => LV[(n || 1) - 1];
const lvChip = n => { const v = lvInfo(n); return `<span class="kr-lv l${v.n}">${v.e} ${E(v.t)}</span>`; };

const baseP = window.SPK_PROGRESS;
window.SPK_PROGRESS = function (c) { const r = Object.assign({}, baseP ? baseP(c) : { p: 0, b: 0, l: '' }); r.p = (r.p || 0) + allPts(); return r; };
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
function toastK(m) { const t = $('#toast'); if (!t) return; t.textContent = m; t.className = 'show ok'; clearTimeout(t._k); t._k = setTimeout(() => t.className = '', 2600); }
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
  const V = (b, w) => `<svg viewBox="0 0 ${w || 240} 120" class="kpic" aria-hidden="true">${b}</svg>`;
  switch (k) {
    case 'tank': return V(cellSvg(88, 18, 64, 92, .78, '3,7 В') + '<path d="M160 60h14" class="kp-l"/><text x="178" y="56" class="kp-s">бак</text><text x="178" y="74" class="kp-s">энергии</text>');
    case 'cell': return V('<g class="kroll">' + [44, 36, 28, 20, 12].map((r, i) => `<circle cx="120" cy="62" r="${r}" class="kp-r${i % 2}"/>`).join('') + '</g><text x="186" y="58" class="kp-s">тонкие</text><text x="186" y="76" class="kp-s">слои</text>');
    case 'stack': return V([0, 1, 2, 3].map(i => cellSvg(20 + i * 50, 30, 40, 70, .8, '', i * 120)).join('') + [0, 1, 2].map(i => `<path d="M${60 + i * 50} 65h10" class="kp-w"/>`).join('') + '<text x="120" y="20" class="kp-h">4S = 4 x 3,7 = 14,8 В</text>');
    case 'par': return V([0, 1].map(i => cellSvg(70 + i * 56, 34, 44, 70, .8, '3,7', i * 150)).join('') + '<path d="M92 26h56M92 26v8M148 26v8" class="kp-w"/><text x="120" y="118" class="kp-s2">рядом: 3,7 В, бак в 2 раза больше</text>');
    case 'scale': return V('<rect x="20" y="52" width="200" height="16" rx="8" class="kp-g"/>' + [['3,3', 40, 'kp-red'], ['3,5', 90, 'kp-yel'], ['3,8', 140, 'kp-blu'], ['4,2', 200, 'kp-grn']].map(a => `<circle cx="${a[1]}" cy="60" r="9" class="${a[2]}"/><text x="${a[1]}" y="96" class="kp-s2">${a[0]}</text>`).join('') + '<text x="120" y="30" class="kp-h">вольты одной банки</text>');
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
    default: return '';
  }
}

/* ---------- стили ---------- */
const css = document.createElement('style');
css.textContent = `
#t-kurs{--ka:#00d4ff;--kb:#a78bfa;--krgb:0,212,255}
.kr{max-width:840px;margin:0 auto;padding:4px 0 90px;display:grid;gap:14px}
.kr-card{position:relative;border:1px solid rgba(127,127,160,.28);background:rgba(12,13,30,.86);border-radius:20px;padding:16px;overflow:hidden}
.kr-card.top:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--ka),var(--kb))}
.kr h3{margin:0 0 4px;font-size:20px}.kr p{margin:0;line-height:1.5}
.kr .mut{opacity:.75;font-size:13.5px}
.kr-bar{height:9px;border-radius:99px;background:rgba(127,127,160,.2);overflow:hidden;margin-top:10px}
.kr-bar i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--ka),var(--kb));transition:width 1s cubic-bezier(.2,.8,.2,1)}
.kr-row{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;opacity:.82;margin-top:6px}
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
let box = null, VIEW = { m: null, t: null, step: null };
function mount(html) {
  box.innerHTML = '<div class="kr">' + html + '</div>';
  if (window.tabFx && !RED) window.tabFx(box, 0, false);
}
function scrollTop() {
  const nav = document.getElementById('vtb'), off = (nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0) + 10, r = box.getBoundingClientRect();
  if (Math.abs(r.top - off) > 30) window.scrollTo({ top: scrollY + r.top - off, behavior: RED ? 'auto' : 'smooth' });
}

function home() {
  VIEW = { m: null, t: null, step: null };
  const live = K.mods.filter(m => m.tasks), tot = live.reduce((a, m) => a + m.tasks.length, 0), dn = live.reduce((a, m) => a + m.tasks.filter(taskDone).length, 0);
  let h = `<div class="kr-card top"><h3>🎓 Твой прогресс</h3><p class="mut">Внутри модуля шаги открываются сами. Следующий модуль открывает тренер, когда проверит задания.</p>
    <div class="kr-bar"><i data-w="${tot ? dn / tot * 100 : 0}"></i></div><div class="kr-row"><span>Пройдено заданий: ${dn} из ${tot}</span><span>⭐ ${allPts()} очков</span></div></div>`;
  h += `<div class="kr-note">🧪 Пробная версия: сейчас наполнен модуль 3 "Аккумуляторы", он открыт для проверки. Остальные модули показывают план и наполняются по ходу. В модуле 3 уровня сложности (по классу).${isCoach() ? ' Вы тренер: окно тренера по модулям будет следующим шагом.' : ''}</div>`;
  h += '<div class="kr-mods">' + K.mods.map((m, i) => {
    const op = modOpen(m), p = modProg(m), full = p === 1;
    const st = !m.tasks ? '🛠 готовится' : full ? '✓ модуль пройден' + (S.t[m.tasks[m.tasks.length - 1]] ? '' : '') : op ? '▶ ' + Math.round(p * 100) + '% пройдено' : '🔒 откроет тренер';
    return `<button class="kr-m ${op && !full ? 'on' : ''} ${!op ? 'lock' : ''}" data-k="mod" data-m="${m.id}" style="animation-delay:${i * 60}ms"><span class="e">${m.e}</span><span class="nn">МОДУЛЬ ${m.n}</span><b>${E(m.t)}</b><small>${E(m.sub)}</small>
      ${m.tasks ? `<div class="kr-bar"><i data-w="${p * 100}"></i></div>` : ''}<div class="st">${st}</div></button>`;
  }).join('') + '</div>';
  mount(h); bars();
}
function bars() { requestAnimationFrame(() => requestAnimationFrame(() => $$('.kr-bar i[data-w]', box).forEach(i => i.style.width = i.dataset.w + '%'))); }

function modView(id) {
  const m = K.mods.find(x => x.id === id); if (!m) return home();
  VIEW = { m: id, t: null, step: null };
  let h = `<div class="kr-back"><button class="kr-btn sm" data-k="home">← Все модули</button></div>
    <div class="kr-card top"><span style="float:right;font-size:34px">${m.e}</span><div class="mut" style="font-weight:800;letter-spacing:.08em;font-size:12px">МОДУЛЬ ${m.n} ИЗ ${K.mods.length}</div><h3>${E(m.t)}</h3><p class="mut">${E(m.sub)}</p>`;
  if (!m.tasks) {
    h += `<div class="kr-sec" style="margin-top:14px">План модуля</div><ul class="kr-plan">${m.plan.map(p => `<li>${E(p)}</li>`).join('')}</ul><p class="mut" style="margin-top:10px">🛠 Задания этого модуля готовятся.</p></div>`;
    return mount(h);
  }
  const p = modProg(m);
  h += `<div class="kr-bar"><i data-w="${p * 100}"></i></div><div class="kr-row"><span>${m.tasks.filter(taskDone).length} из ${m.tasks.length} заданий</span><span>⭐ ${m.tasks.reduce((a, t) => a + taskPts(t), 0)} очков</span></div></div>`;
  if (!modOpen(m)) { h += '<div class="kr-wait">🔒 Этот модуль откроет тренер, когда проверит задания предыдущего.</div>'; return mount(h) || bars(); }
  const lv = lvlOf(m.id);
  h += `<div class="kr-card"><div class="kr-sec" style="margin:0">Уровень сложности</div><p class="mut" style="margin-top:4px">Задания те же, но глубже: больше подробностей, сложнее вопросы и расчёты. Уровень ставится по классу${S.lvl[m.id] ? '' : ' (сейчас: ' + E(lvInfo(lv).s) + ')'}, тренер может поменять. В пробной версии можно переключить самому.</p>
    <div class="kr-lvs">${LV.map(v => `<button data-k="lvl" data-m="${m.id}" data-v="${v.n}" class="${v.n === lv ? 'on' : ''}">${v.e} ${E(v.t)}<small>${E(v.s)}</small></button>`).join('')}</div></div>`;
  if (p === 1) h += `<div class="kr-done">🎉 Модуль пройден! ${waitingCoach(m) ? 'Тренер проверит задания на занятии и откроет следующий модуль.' : 'Тренер откроет следующий модуль.'}</div>`;
  let curSet = false;
  h += '<div class="kr-road">' + m.tasks.map((tid, k) => {
    const L = K.lib[tid], t = S.t[tid], done = taskDone(tid), op = taskOpen(m, k), cur = op && !done && !curSet; if (cur) curSet = true;
    const dots = L.steps.map((st, i) => { const x = t && t.s[i]; return `<i class="${x && x.ok ? (x.viaX ? 'x' : 'ok') : ''}"></i>`; }).join('');
    const wait = t && coachWait(tid);
    const r = done ? `<span>✓ ${E(t.done)}<br>⭐ ${taskPts(tid)}</span>` : !op ? '🔒' : '';
    return `<button class="kr-t ${done ? 'ok' : ''} ${cur ? 'cur' : ''} ${!op ? 'lock' : ''}" data-k="task" data-t="${tid}" ${op ? '' : 'disabled'} style="animation-delay:${k * 45}ms">
      <span class="d">${done ? '✓' : k + 1}</span><span class="e">${L.e}</span><span style="min-width:0"><b>${E(L.t)}</b><small>${E(L.sub)}</small>${wait ? '<small class="wait">⏳ ждёт проверки тренера</small>' : ''}<span class="kr-steps">${dots}</span></span><span class="r">${r}</span></button>`;
  }).join('') + '</div>';
  mount(h); bars();
}
const coachWait = tid => { const L = K.lib[tid], t = S.t[tid]; return !!t && L.steps.some((st, i) => st.s === 'coach' && t.s[i] && t.s[i].ok && !t.s[i].acc); };
const waitingCoach = m => m.tasks.some(coachWait);

function taskView(tid, step) {
  const L = K.lib[tid], t = T(tid), m = K.mods.find(x => x.tasks && x.tasks.includes(tid));
  if (step == null) { step = L.steps.findIndex((st, i) => !(t.s[i] && t.s[i].ok)); if (step < 0) step = t.done ? -1 : 0; }
  VIEW = { m: m.id, t: tid, step };
  const okN = L.steps.filter((st, i) => t.s[i] && t.s[i].ok).length;
  let h = `<div class="kr-back"><button class="kr-btn sm" data-k="mod" data-m="${m.id}">← Модуль ${m.n}</button><span class="mut">${okN} из ${L.steps.length} шагов</span></div>
    <div class="kr-card top"><span style="float:right;font-size:30px">${L.e}</span><h3>${E(L.t)}</h3><p class="mut">${E(L.sub)}</p><div style="margin-top:8px">${lvChip(lvlOf(m.id))}</div>
    <div class="kr-stp" style="margin-top:12px">${L.steps.map((st, i) => { const ok = t.s[i] && t.s[i].ok, can = i === 0 || (t.s[i - 1] && t.s[i - 1].ok) || ok || isCoach();
      return `<button data-k="step" data-i="${i}" class="${i === step ? 'on' : ''} ${ok ? 'ok' : ''}" ${can ? '' : 'disabled'}>${ok ? '✓ ' : ''}${i + 1}. ${E(stepName(st))}</button>`; }).join('')}
      <button data-k="step" data-i="-1" class="${step === -1 ? 'on' : ''}" ${t.done ? '' : 'disabled'}>📊 Итог</button></div></div>
    <div class="kr-card" id="krStage"></div>`;
  mount(h);
  const stg = $('#krStage', box);
  if (step === -1) return summary(tid, stg);
  runStep(tid, step, stg);
  const b = $('.kr-stp button.on', box); if (b) b.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function stepName(st) { return { cards: 'Материал', game: 'Тренажёр', quiz: 'Проверка', fly: 'Полёт', coach: 'С тренером' }[st.s] || st.s; }

/* шаг пройден: отмечаем, открываем следующий */
function stepOk(tid, i, res) {
  const L = K.lib[tid], x = stepSt(tid, i);
  Object.assign(x, res || {}); x.ok = true; x.date = x.date || today();
  const t = T(tid);
  const all = L.steps.every((st, k) => t.s[k] && t.s[k].ok);
  let fresh = false;
  if (all && !t.done) { t.done = today(); fresh = true; }
  save();
  if (fresh) { snd('win'); buzz([30, 40, 60]); confetti(); toastK('Задание пройдено! +' + taskPts(tid) + ' очков'); }
  return fresh;
}
function nextBtn(tid, i) {
  const L = K.lib[tid];
  if (i < L.steps.length - 1) return `<button class="kr-btn pri" data-k="step" data-i="${i + 1}">Дальше: ${E(stepName(L.steps[i + 1]))} →</button>`;
  return `<button class="kr-btn pri" data-k="step" data-i="-1">📊 Итог задания</button>`;
}
function likeRow(tid) {
  const v = T(tid).like || 0;
  return `<div class="kr-like"><span class="mut">Как тебе задание?</span><button data-k="like" data-v="1" data-t="${tid}" class="${v === 1 ? 'on' : ''}" aria-label="Класс">👍</button><button data-k="like" data-v="-1" data-t="${tid}" class="${v === -1 ? 'on' : ''}" aria-label="Не очень">👎</button></div>`;
}

function summary(tid, stg) {
  const L = K.lib[tid], t = T(tid), m = K.mods.find(x => x.tasks && x.tasks.includes(tid)), k = m.tasks.indexOf(tid), nx = m.tasks[k + 1];
  const rows = L.steps.map((st, i) => { const x = t.s[i] || {};
    const res = x.best != null ? Math.round(x.best * 100) + '%' + (x.att > 1 ? ' · ' + x.att + ' попыт.' : '') : x.ok ? '✓' : '-';
    const extra = x.viaX ? ' · 🔁 доп.задание' : '';
    const cw = st.s === 'coach' && x.ok ? (x.acc ? ' · ✓ тренер принял' : ' · ⏳ ждёт тренера') : '';
    const fl = st.s === 'fly' && x.v ? ' · ' + E(x.v) : '';
    const lvT = x.lv ? ' · ' + lvInfo(x.lv).e : '';
    return `<li><span>${i + 1}. ${E(stepName(st))}</span><span>${x.date ? E(x.date) + ' · ' : ''}${res}${lvT}${extra}${cw}${fl}</span></li>`; }).join('');
  stg.innerHTML = `<div class="kr-end"><div style="font-size:42px">${L.e}</div><b style="font-size:18px">${t.done ? 'Задание пройдено ' + E(t.done) : 'Задание в процессе'}</b><div class="big">⭐ ${taskPts(tid)}</div><div class="mut">из ${L.pts} возможных очков. Пересдай проверки, чтобы набрать больше.</div><div class="mut" style="margin-top:6px">Уровень: ${lvChip(lvlOf(m.id))} (значок у шага - на каком уровне пройдено)</div></div>
    <ul class="kr-hist">${rows}</ul>${likeRow(tid)}
    <div class="kr-end"><div class="acts">${nx ? `<button class="kr-btn pri" data-k="task" data-t="${nx}">Следующее задание →</button>` : `<button class="kr-btn pri" data-k="mod" data-m="${m.id}">К модулю</button>`}</div></div>`;
}

function runStep(tid, i, stg) {
  const st = K.lib[tid].steps[i];
  const R = { cards: cardsStep, game: gameStep, quiz: quizStep, fly: flyStep, coach: coachStep }[st.s];
  R(tid, i, st, stg);
}

/* ---------- материал карточками ---------- */
function moreHtml(cd, lv) {
  if (!cd.more || lv < 2) return '';
  return [2, 3].filter(n => n <= lv && cd.more[n]).map(n => `<div class="kr-more l${n}"><b>${lvInfo(n).e} ${n === 2 ? 'Глубже' : 'Ещё глубже'}</b>${E(cd.more[n])}</div>`).join('');
}
function cardsStep(tid, i, st, stg) {
  let c = 0; const N = st.cards.length, lv = lvlOf(modOf(tid).id);
  function draw(dir) {
    const cd = st.cards[c];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><div class="kr-cards"><div class="kr-cd" style="${dir < 0 ? 'animation-name:krIn' : ''}">${pic(cd.pic)}<h4>${E(cd.h)}</h4><p>${E(cd.p)}</p>${moreHtml(cd, lv)}</div></div>
      <div class="kr-dots">${st.cards.map((x, k) => `<i class="${k === c ? 'on' : ''}"></i>`).join('')}</div>
      <div class="kr-nav"><button class="kr-btn" data-c="-1" ${c ? '' : 'disabled'}>← Назад</button>${c < N - 1 ? '<button class="kr-btn pri" data-c="1">Понятно, дальше →</button>' : '<button class="kr-btn pri" data-c="ok">✓ Всё понятно</button>'}</div>`;
    $$('[data-c]', stg).forEach(b => b.onclick = () => {
      const v = b.dataset.c; snd('tap');
      if (v === 'ok') { stepOk(tid, i, {}); stg.innerHTML = `<div class="kr-done">✓ Материал прочитан. Можно вернуться к нему в любой момент.</div><div class="kr-end"><div class="acts">${nextBtn(tid, i)}</div></div>`; return; }
      c = Math.max(0, Math.min(N - 1, c + (+v))); draw(+v);
    });
    let x0 = null; const area = $('.kr-cards', stg);
    area.addEventListener('touchstart', e => x0 = e.touches[0].clientX, { passive: true });
    area.addEventListener('touchend', e => { if (x0 == null) return; const d = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(d) < 50) return; const nc = c + (d < 0 ? 1 : -1); if (nc >= 0 && nc < N) { c = nc; draw(d < 0 ? 1 : -1); } }, { passive: true });
  }
  draw(1);
}

/* ---------- проверка (вопросы) + доп.задание ---------- */
/* вопрос = { l: уровень, q: вопрос, e: пояснение, a: [верный, неверные...] } */
const ah = v => fx(v, 2).replace(/0$/, '');     // 0,45 · 1,5 · 1,3
function genLabel(hint, lv) {
  lv = lv || 1;
  const S_ = pick(lv === 1 ? [2, 3, 4, 4] : [2, 3, 4, 4, 6]), mah = pick([450, 650, 850, 1300, 1500, 1800]), C = pick([45, 75, 100, 120]);
  const lbl = `${S_}S ${mah}mAh ${C}C`, A = mah / 1000;
  const types = ['s', 'full', 'land', 'bal'].concat(lv >= 2 ? ['cap', 'chg', 'cap', 'chg'] : [], lv >= 3 ? ['wh', 'imax', 'wh', 'imax'] : []);
  const typ = pick(types), n = (v, d) => fx(v, d == null ? 1 : d);
  const Qo = (q, e, ...a) => ({ l: lv, q: `Наклейка "${lbl}". ${q}`, e, a });
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
    () => ({ l: 1, q: `В очках ${fx(S_ * 3.5)} В у АКБ ${S_}S, дрон летит спокойно, без полного газа. Что делаешь?`, e: `${fx(S_ * 3.5)} : ${S_} = 3,5 В на банку - пора садиться.`, a: ['Сажусь', 'Лечу ещё 5 кругов', 'Даю полный газ'] }),
    () => ({ l: 1, q: `Сколько вольт у полной АКБ ${S_}S?`, e: `${S_} x 4,2 = ${fx(S_ * 4.2)} В. ${fx(S_ * 3.7)} В - номинал, ${fx(S_ * 3.5)} В - пора садиться.`, a: [fx(S_ * 4.2) + ' В', fx(S_ * 3.7) + ' В', fx(S_ * 3.5) + ' В'] }),
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
    const q = byLevel(pool, n - 2, lv); q.push(genMix(lv), genMix(lv)); return shuf(q);
  }
  const src = extra ? st.x : st.pool;
  return byLevel(src, extra ? Math.min(5, src.length) : n, lv);
}
function quizStep(tid, i, st, stg, forceX) {
  const x = stepSt(tid, i), pass = st.pass || PASS, lv = lvlOf(modOf(tid).id);
  const needX = forceX || (x.needX && !x.ok);
  const qs = buildQs(st, needX, lv).map(q => ({ q: q.q, e: q.e, l: q.l || 1, right: q.a[0], o: shuf(q.a.map((a, k) => ({ a, ok: k === 0 }))) }));
  let k = 0, ok = 0; const wrong = [];
  function draw() {
    const it = qs[k];
    stg.innerHTML = `<div class="kr-q">${needX ? '<div class="kr-hint">🔁 Доп.задание: те же темы, вопросы другими словами. Очки за него не начисляются, но без него дальше нельзя.</div>' : ''}
      <div class="kr-sec">${E(needX ? 'Доп.задание' : st.h)}</div><div class="top"><span>Вопрос ${k + 1} из ${qs.length}${it.l > 1 ? ' · ' + lvInfo(it.l).e : ''}</span><span>✓ ${ok}</span></div><div class="pr"><i style="width:${k / qs.length * 100}%"></i></div>
      <div class="qq">${E(it.q)}</div><div class="qa">${it.o.map((o, j) => `<button data-j="${j}" style="animation-delay:${j * 50}ms">${E(o.a)}</button>`).join('')}</div><div class="kq-r"></div></div>`;
    $$('.qa button', stg).forEach(b => b.onclick = () => {
      const o = it.o[+b.dataset.j]; $$('.qa button', stg).forEach(z => { z.disabled = true; if (it.o[+z.dataset.j].ok) z.classList.add('y'); });
      const nxt = () => { k++; k < qs.length ? draw() : end(); };
      if (o.ok) { ok++; snd('ok'); buzz(15); setTimeout(nxt, 650); return; }
      b.classList.add('n'); snd('bad'); buzz([40, 30, 40]); wrong.push(it);
      /* ошибся: показываем пояснение и ждём "Дальше" */
      const r = $('.kq-r', stg);
      r.innerHTML = `<div class="kr-why"><b>✗ Правильно: ${E(it.right)}</b>${E(it.e || '')}<button class="kr-btn pri">${k < qs.length - 1 ? 'Понятно, дальше →' : 'Понятно, к итогу →'}</button></div>`;
      $('button', r).onclick = nxt;
      r.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'center' });
    });
  }
  const errList = () => wrong.length ? `<details class="kr-err"><summary>📝 Разбор ошибок (${wrong.length})</summary><ul>${wrong.map(w => `<li><b>${E(w.q)}</b><br>✓ ${E(w.right)}. ${E(w.e || '')}</li>`).join('')}</ul></details>` : '';
  function end() {
    const r = ok / qs.length, good = r >= pass;
    const lvR = Math.max(x.lv || 0, lv);
    if (needX) {
      x.xatt = (x.xatt || 0) + 1;
      if (good) { x.needX = false; stepOk(tid, i, { viaX: true, lv: lvR }); }
      else save();
      stg.innerHTML = `<div class="kr-end"><div style="font-size:40px">${good ? '💪' : '🧩'}</div><b>Доп.задание: ${ok} из ${qs.length}</b>
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
      ${!good && !x.ok ? `<div class="kr-x"><b>🔁 Обязательное доп.задание</b><p class="mut" style="margin-top:4px">Те же темы, вопросы с другой стороны. Без очков, но после него откроется следующий шаг.</p><div class="acts" style="justify-content:flex-start"><button class="kr-btn pri" data-k="retryx" data-i="${i}">Пройти доп.задание</button><button class="kr-btn" data-k="reread">📖 Сначала материал</button></div></div>` : ''}
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
  stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><p style="font-size:15px;margin-bottom:12px">✋ ${E(st.p)}</p><form class="kr-in"><label>Комментарий для тренера (по желанию)<textarea name="c" rows="2" maxlength="140" placeholder="коротко: что сделал"></textarea></label><button class="kr-btn pri">✓ Сделал, на проверку</button></form>`;
  $('form', stg).onsubmit = e => { e.preventDefault(); stepOk(tid, i, { c: String(new FormData(e.target).get('c') || '').slice(0, 140) }); snd('ok'); coachStep(tid, i, st, stg); };
}

/* ---------- тренажёры (сложность растёт с уровнем модуля) ---------- */
function gameStep(tid, i, st, stg, forceX) {
  const x = stepSt(tid, i), G = { build: gBuild, light: gLight, calc: gCalc, compare: gCompare, label: gLabel, story: gStory }[st.g];
  const needX = forceX || (x.needX && !x.ok), lv = lvlOf(modOf(tid).id);
  G(stg, st, needX, r => {   // r: доля верных (или 1 для тренажёров без оценки)
    const pass = st.pass || PASS, good = r >= pass, lvR = Math.max(x.lv || 0, lv);
    if (needX) { x.xatt = (x.xatt || 0) + 1; if (good) { x.needX = false; stepOk(tid, i, { viaX: true, lv: lvR }); } else save(); }
    else { x.att = (x.att || 0) + 1; x.last = today(); if (st.g !== 'build' && st.g !== 'label') { if (x.best == null || r > x.best) x.best = r; }
      if (good) stepOk(tid, i, { lv: lvR }); else { if (!x.ok) x.needX = true; save(); } }
    const msg = good ? (needX ? 'Доп.задание пройдено, тема освоена!' : 'Отлично, тренажёр пройден!') : (needX ? 'Пока не вышло - попробуй ещё раз, числа будут другие.' : 'Нужно закрепить: пройди тренажёр ещё раз с подсказками (доп.задание, без очков).');
    stg.insertAdjacentHTML('beforeend', `<div class="kr-end" style="margin-top:12px"><b>${msg}</b><div class="acts">${good ? nextBtn(tid, i) : `<button class="kr-btn pri" data-k="${needX || !x.ok ? 'gamex' : 'game'}" data-i="${i}">🔁 ${!x.ok ? 'Доп.задание с подсказками' : 'Ещё раз'}</button>`}${good && st.g !== 'build' && st.g !== 'label' ? `<button class="kr-btn" data-k="game" data-i="${i}">↻ Ещё раз</button>` : ''}</div></div>`);
    $('.kr-end:last-child', stg).scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'nearest' });
  }, lv);
}
/* общий блок "ошибся - пояснение - Дальше" для тренажёров */
function whyBox(el, good, txt, last, go) {
  el.innerHTML = `<div class="kr-why ${good ? 'ok' : ''}"><b>${good ? '✓ Верно!' : '✗ Не совсем.'}</b>${E(txt)}<button class="kr-btn pri">${last ? 'Итог' : 'Дальше →'}</button></div>`;
  $('button', el).onclick = go;
  if (!good) el.scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'center' });
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
      <div class="kg-volt">${fx(R.v, 2)} В</div><div class="kg-gauge"><i style="left:${pos(4.4)}%"></i></div><p class="mut" style="text-align:center;margin-bottom:10px">одна банка ${R.t === 'LiHV' ? '<b>LiHV</b>' : lv >= 3 ? 'обычная LiPo' : ''}, без газа (дрон стоит или висит)</p>
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
  const n = Math.min(K.story.length, [6, 7, 9][(lv || 1) - 1] - (hint ? 1 : 0));
  /* в каждой истории хотя бы 2 ошибки и 2 верных шага */
  let L; do { L = shuf(K.story).slice(0, n); } while (L.filter(s => s[1]).length < 2 || L.filter(s => !s[1]).length < 2);
  const sel = new Set();
  stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><p class="mut" style="margin-bottom:10px">Нажми на предложения, где Петя ошибся, потом "Проверить".${hint ? ' Подсказка: ошибки про тепло, присмотр, вздутие и режим зарядки.' : ''}</p>
    <div class="kg-story">${L.map((s, j) => `<button data-j="${j}">${E(s[0])}</button>`).join('')}</div><div class="kr-end"><div class="acts"><button class="kr-btn pri" id="kgC">Проверить</button></div></div>`;
  $$('.kg-story button', stg).forEach(b => b.onclick = () => { const j = +b.dataset.j; sel.has(j) ? sel.delete(j) : sel.add(j); b.classList.toggle('sel'); snd('tap'); });
  $('#kgC', stg).onclick = function () {
    let ok = 0; this.parentNode.parentNode.remove();
    $$('.kg-story button', stg).forEach(b => { const j = +b.dataset.j, err = L[j][1] === 1, good = err === sel.has(j); if (good) ok++; b.disabled = true; b.classList.remove('sel'); b.classList.add(good ? 'y' : 'n'); b.insertAdjacentHTML('beforeend', `<small>${err ? '❌ ошибка: ' : '✓ верно: '}${E(L[j][2])}</small>`); });
    stg.insertAdjacentHTML('beforeend', `<div class="kr-end"><div class="big">${ok} из ${L.length}</div></div>`); snd(ok === L.length ? 'win' : 'ok'); done(ok / L.length);
  };
}

/* ---------- клики ---------- */
document.addEventListener('click', e => {
  if (!box || !box.contains(e.target)) return;
  const b = e.target.closest('[data-k]'); if (!b) return;
  const k = b.dataset.k;
  if (k === 'home') { home(); scrollTop(); }
  else if (k === 'mod') { modView(b.dataset.m); scrollTop(); }
  else if (k === 'task') { taskView(b.dataset.t); scrollTop(); }
  else if (k === 'step') { taskView(VIEW.t, +b.dataset.i); scrollTop(); }
  else if (k === 'retry') { const L = K.lib[VIEW.t]; quizStep(VIEW.t, +b.dataset.i, L.steps[+b.dataset.i], $('#krStage', box)); }
  else if (k === 'retryx') { const L = K.lib[VIEW.t]; quizStep(VIEW.t, +b.dataset.i, L.steps[+b.dataset.i], $('#krStage', box), true); }
  else if (k === 'game' || k === 'gamex') { const L = K.lib[VIEW.t]; gameStep(VIEW.t, +b.dataset.i, L.steps[+b.dataset.i], $('#krStage', box), k === 'gamex'); }
  else if (k === 'refly') { const x = stepSt(VIEW.t, +b.dataset.i); x.ok = false; flyStep(VIEW.t, +b.dataset.i, K.lib[VIEW.t].steps[+b.dataset.i], $('#krStage', box)); }
  else if (k === 'reread') { const L = K.lib[VIEW.t], c = L.steps.findIndex(s => s.s === 'cards'); taskView(VIEW.t, c < 0 ? 0 : c); }
  else if (k === 'lvl') { S.lvl[b.dataset.m] = +b.dataset.v; save(); snd('tap'); modView(b.dataset.m); toastK('Уровень: ' + lvInfo(+b.dataset.v).t); }
  else if (k === 'like') { const t = T(b.dataset.t), v = +b.dataset.v; t.like = t.like === v ? 0 : v; save(); $$('.kr-like button', box).forEach(z => z.classList.toggle('on', +z.dataset.v === t.like)); snd('tap'); if (t.like) toastK(v > 0 ? 'Спасибо! 👍 Тренер увидит' : 'Спасибо! Тренер поправит задание'); }
});

/* ---------- старт ---------- */
function init() {
  box = document.getElementById('t-kurs'); if (!box) return;
  home();
  const nav = document.getElementById('vt');
  if (nav) nav.addEventListener('click', e => { const b = e.target.closest('button[data-t="kurs"]'); if (b && VIEW.t == null && VIEW.m == null) home(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
window.VZ_KURS_STATE = () => S;
window.VZ_KURS_GEN = { genLabel, genMix, buildQs };
})();
