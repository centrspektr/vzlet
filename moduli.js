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

const baseP = window.SPK_PROGRESS;
window.SPK_PROGRESS = function (c) { const r = Object.assign({}, baseP ? baseP(c) : { p: 0, b: 0, l: '' }); r.p = (r.p || 0) + allPts(); return r; };
const baseR = window.SPK_RESET;
window.SPK_RESET = function (c) { S = { t: {} }; try { localStorage.setItem(KEY, '{}'); } catch (e) {} if (baseR) baseR(c); if (box) home(); };

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
.kr{max-width:840px;margin:0 auto;padding:4px 0 28px;display:grid;gap:14px}
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
.kr-m .n{font-size:11.5px;font-weight:800;letter-spacing:.08em;opacity:.7}
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
.y{background:rgba(34,197,94,.22) !important;border-color:#22c55e !important}.n{background:rgba(248,113,113,.2) !important;border-color:#f87171 !important}
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
  h += `<div class="kr-note">🧪 Пробная версия: сейчас наполнен модуль 3 "Аккумуляторы", он открыт для проверки. Остальные модули показывают план и наполняются по ходу.${isCoach() ? ' Вы тренер: окно тренера по модулям будет следующим шагом.' : ''}</div>`;
  h += '<div class="kr-mods">' + K.mods.map((m, i) => {
    const op = modOpen(m), p = modProg(m), full = p === 1;
    const st = !m.tasks ? '🛠 готовится' : full ? '✓ модуль пройден' + (S.t[m.tasks[m.tasks.length - 1]] ? '' : '') : op ? '▶ ' + Math.round(p * 100) + '% пройдено' : '🔒 откроет тренер';
    return `<button class="kr-m ${op && !full ? 'on' : ''} ${!op ? 'lock' : ''}" data-k="mod" data-m="${m.id}" style="animation-delay:${i * 60}ms"><span class="e">${m.e}</span><span class="n">МОДУЛЬ ${m.n}</span><b>${E(m.t)}</b><small>${E(m.sub)}</small>
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
    <div class="kr-card top"><span style="float:right;font-size:30px">${L.e}</span><h3>${E(L.t)}</h3><p class="mut">${E(L.sub)}</p>
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
    return `<li><span>${i + 1}. ${E(stepName(st))}</span><span>${x.date ? E(x.date) + ' · ' : ''}${res}${extra}${cw}${fl}</span></li>`; }).join('');
  stg.innerHTML = `<div class="kr-end"><div style="font-size:42px">${L.e}</div><b style="font-size:18px">${t.done ? 'Задание пройдено ' + E(t.done) : 'Задание в процессе'}</b><div class="big">⭐ ${taskPts(tid)}</div><div class="mut">из ${L.pts} возможных очков. Пересдай проверки, чтобы набрать больше.</div></div>
    <ul class="kr-hist">${rows}</ul>${likeRow(tid)}
    <div class="kr-end"><div class="acts">${nx ? `<button class="kr-btn pri" data-k="task" data-t="${nx}">Следующее задание →</button>` : `<button class="kr-btn pri" data-k="mod" data-m="${m.id}">К модулю</button>`}</div></div>`;
}

function runStep(tid, i, stg) {
  const st = K.lib[tid].steps[i];
  const R = { cards: cardsStep, game: gameStep, quiz: quizStep, fly: flyStep, coach: coachStep }[st.s];
  R(tid, i, st, stg);
}

/* ---------- материал карточками ---------- */
function cardsStep(tid, i, st, stg) {
  let c = 0; const N = st.cards.length;
  function draw(dir) {
    const cd = st.cards[c];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><div class="kr-cards"><div class="kr-cd" style="${dir < 0 ? 'animation-name:krIn' : ''}">${pic(cd.pic)}<h4>${E(cd.h)}</h4><p>${E(cd.p)}</p></div></div>
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
function genLabel(hint) {
  const S_ = pick([2, 3, 4, 4, 6]), mah = pick([450, 650, 850, 1300, 1500, 1800]), C = pick([45, 75, 100, 120]);
  const lbl = `${S_}S ${mah}mAh ${C}C`, A = mah / 1000;
  const typ = pick(['s', 'full', 'cap', 'chg', 'bal', 'land']);
  const num = (v, d) => fx(v, d);
  switch (typ) {
    case 's': { const w = n => n + (n === 1 ? ' банка' : n < 5 ? ' банки' : ' банок'); return [`Наклейка "${lbl}". Сколько банок в АКБ?`, w(S_), w(S_ + 2), w(S_ === 1 ? 2 : 1)]; }
    case 'full': return [`Наклейка "${lbl}". Сколько вольт у полностью заряженной АКБ?${hint ? ' (банка 4,2 В x ' + S_ + ')' : ''}`, num(S_ * 4.2) + ' В', num(S_ * 3.7) + ' В', num(S_ * 4.2 + 4.2) + ' В'];
    case 'land': return [`Наклейка "${lbl}". При каких вольтах всей АКБ пора садиться?${hint ? ' (3,5 В x ' + S_ + ')' : ''}`, num(S_ * 3.5) + ' В', num(S_ * 4.2) + ' В', num(S_ * 3.5 - 3.5) + ' В'];
    case 'cap': return [`Наклейка "${lbl}". Сколько это ампер-часов?${hint ? ' (раздели mAh на 1000)' : ''}`, num(A, 2).replace(/0$/, '') + ' А·ч', num(A * 10, 1) + ' А·ч', num(mah / 100, 0) + ' А·ч'];
    case 'chg': return [`Наклейка "${lbl}". Каким током заряжать при 1C?${hint ? ' (ёмкость в амперах)' : ''}`, num(A, 2).replace(/0$/, '') + ' А', num(A * C / 10, 1) + ' А', num(C, 0) + ' А'];
    default: return [`Наклейка "${lbl}". Сколько проводов у балансировочного разъёма?${hint ? ' (на 1 больше, чем банок)' : ''}`, String(S_ + 1), String(S_), String(S_ * 2)];
  }
}
function genMix() {
  const S_ = pick([1, 2, 3, 4, 6]);
  return pick([
    () => [`В очках ${fx(S_ * 3.5)} В у АКБ ${S_}S на спокойном полёте. Что делаешь?`, 'Сажусь', 'Лечу ещё 5 кругов', 'Ставлю на зарядку в полёте'],
    () => [`Сколько вольт у полной АКБ ${S_}S?`, fx(S_ * 4.2) + ' В', fx(S_ * 3.7) + ' В', fx(S_ * 3.5) + ' В'],
    () => genLabel(false)
  ])();
}
function buildQs(st, extra) {
  const L = K.lib, n = st.n || 5;
  if (st.gen === 'label') return Array.from({ length: n }, () => genLabel(extra));
  if (st.from) {
    let pool = [];
    st.from.forEach(id => L[id].steps.forEach(s => { if (s.s === 'quiz' && s.pool) pool = pool.concat(extra ? (s.x || []) : s.pool); }));
    const q = shuf(pool).slice(0, n - 2); q.push(genMix(), genMix()); return shuf(q);
  }
  return shuf(extra ? st.x : st.pool).slice(0, extra ? Math.min(5, st.x.length) : n);
}
function quizStep(tid, i, st, stg, forceX) {
  const x = stepSt(tid, i), pass = st.pass || PASS;
  const needX = forceX || (x.needX && !x.ok);
  const qs = buildQs(st, needX).map(q => ({ q: q[0], o: shuf(q.slice(1).map((a, k) => ({ a, ok: k === 0 }))) }));
  let k = 0, ok = 0;
  function draw() {
    const it = qs[k];
    stg.innerHTML = `<div class="kr-q">${needX ? '<div class="kr-hint">🔁 Доп.задание: те же темы, вопросы другими словами. Очки за него не начисляются, но без него дальше нельзя.</div>' : ''}
      <div class="kr-sec">${E(needX ? 'Доп.задание' : st.h)}</div><div class="top"><span>Вопрос ${k + 1} из ${qs.length}</span><span>✓ ${ok}</span></div><div class="pr"><i style="width:${k / qs.length * 100}%"></i></div>
      <div class="qq">${E(it.q)}</div><div class="qa">${it.o.map((o, j) => `<button data-j="${j}" style="animation-delay:${j * 50}ms">${E(o.a)}</button>`).join('')}</div></div>`;
    $$('.qa button', stg).forEach(b => b.onclick = () => {
      const o = it.o[+b.dataset.j]; $$('.qa button', stg).forEach(z => { z.disabled = true; if (it.o[+z.dataset.j].ok) z.classList.add('y'); });
      if (o.ok) { ok++; snd('ok'); buzz(15); } else { b.classList.add('n'); snd('bad'); buzz([40, 30, 40]); }
      setTimeout(() => { k++; k < qs.length ? draw() : end(); }, o.ok ? 650 : 1400);
    });
  }
  function end() {
    const r = ok / qs.length, good = r >= pass;
    if (needX) {
      x.xatt = (x.xatt || 0) + 1;
      if (good) { x.needX = false; stepOk(tid, i, { viaX: true }); }
      else save();
      stg.innerHTML = `<div class="kr-end"><div style="font-size:40px">${good ? '💪' : '🧩'}</div><b>Доп.задание: ${ok} из ${qs.length}</b>
        <p class="mut" style="margin-top:6px">${good ? 'Отлично, тема освоена! Можно идти дальше. Основную проверку можно пересдать, чтобы получить больше очков.' : 'Пока не получилось. Перечитай материал и попробуй ещё раз - вопросы будут другие.'}</p>
        <div class="acts">${good ? nextBtn(tid, i) : '<button class="kr-btn" data-k="reread">📖 Материал</button><button class="kr-btn pri" data-k="retryx" data-i="' + i + '">🔁 Ещё раз</button>'}</div></div>`;
      return;
    }
    x.att = (x.att || 0) + 1; x.last = today();
    if (x.best == null || r > x.best) { x.best = r; x.bdate = today(); }
    let fresh = false;
    if (good) fresh = stepOk(tid, i, {}); else { if (!x.ok) x.needX = true; save(); }
    const pct = Math.round(r * 100);
    stg.innerHTML = `<div class="kr-end"><div style="font-size:40px">${good ? (r === 1 ? '🏆' : '✅') : '🤔'}</div><div class="big">${ok} из ${qs.length}</div>
      <p class="mut">${good ? (r === 1 ? 'Без единой ошибки!' : 'Тема освоена. Можно пересдать на 100%.') : 'Меньше ' + Math.round(pass * 100) + '% - тему нужно закрепить.'} Лучший результат: ${Math.round(x.best * 100)}%.</p>
      ${!good && !x.ok ? `<div class="kr-x"><b>🔁 Обязательное доп.задание</b><p class="mut" style="margin-top:4px">Те же темы, вопросы с другой стороны. Без очков, но после него откроется следующий шаг.</p><div class="acts" style="justify-content:flex-start"><button class="kr-btn pri" data-k="retryx" data-i="${i}">Пройти доп.задание</button><button class="kr-btn" data-k="reread">📖 Сначала материал</button></div></div>` : ''}
      <div class="acts">${good ? nextBtn(tid, i) : ''}<button class="kr-btn" data-k="retry" data-i="${i}">↻ Пересдать (${pct}%)</button></div>${good && fresh ? '' : ''}</div>`;
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

/* ---------- тренажёры ---------- */
function gameStep(tid, i, st, stg, forceX) {
  const x = stepSt(tid, i), G = { build: gBuild, light: gLight, calc: gCalc, compare: gCompare, label: gLabel, story: gStory }[st.g];
  const needX = forceX || (x.needX && !x.ok);
  G(stg, st, needX, r => {   // r: доля верных (или 1 для тренажёров без оценки)
    const pass = st.pass || PASS, good = r >= pass;
    if (needX) { x.xatt = (x.xatt || 0) + 1; if (good) { x.needX = false; stepOk(tid, i, { viaX: true }); } else save(); }
    else { x.att = (x.att || 0) + 1; x.last = today(); if (st.g !== 'build' && st.g !== 'label') { if (x.best == null || r > x.best) x.best = r; }
      if (good) stepOk(tid, i, {}); else { if (!x.ok) x.needX = true; save(); } }
    const msg = good ? (needX ? 'Доп.задание пройдено, тема освоена!' : 'Отлично, тренажёр пройден!') : (needX ? 'Пока не вышло - попробуй ещё раз, числа будут другие.' : 'Нужно закрепить: пройди тренажёр ещё раз с подсказками (доп.задание, без очков).');
    stg.insertAdjacentHTML('beforeend', `<div class="kr-end" style="margin-top:12px"><b>${msg}</b><div class="acts">${good ? nextBtn(tid, i) : `<button class="kr-btn pri" data-k="${needX || !x.ok ? 'gamex' : 'game'}" data-i="${i}">🔁 ${!x.ok ? 'Доп.задание с подсказками' : 'Ещё раз'}</button>`}${good && st.g !== 'build' && st.g !== 'label' ? `<button class="kr-btn" data-k="game" data-i="${i}">↻ Ещё раз</button>` : ''}</div></div>`);
    $('.kr-end', stg).scrollIntoView({ behavior: RED ? 'auto' : 'smooth', block: 'nearest' });
  });
}

/* собери АКБ из банок: цели по очереди */
function gBuild(stg, st, hint, done) {
  const goals = [['Собери АКБ 1S, как у Mobula 7', 1, 'ser'], ['Собери 4S - как у гоночного 5-дюймового дрона', 4, 'ser'], ['Собери 6S - самую мощную', 6, 'ser'], ['Поставь 2 банки рядом: бак в 2 раза больше (2P)', 2, 'par']];
  let g = 0, n = 1, mode = 'ser';
  function draw() {
    const [txt, need, nm] = goals[g], ser = mode === 'ser';
    const v = ser ? n * 3.7 : 3.7, vf = ser ? n * 4.2 : 4.2, cap = ser ? 450 : 450 * n;
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · цель ${g + 1} из ${goals.length}</div><div class="kg-goal">🎯 ${E(txt)}</div>
      <div class="kg-stack ${ser ? 'ser' : 'par'}">${Array.from({ length: n }, (_, k) => `<div class="kg-cell" style="animation-delay:${k * 40}ms">3,7</div>`).join('')}</div>
      <div class="kg-read"><div><b>${ser ? n + 'S' : n + 'P'}</b><small>запись</small></div><div><b>${fx(v)} В</b><small>обычное (полная ${fx(vf)})</small></div><div><b>${cap}</b><small>mAh, бак</small></div></div>
      <div class="kg-ctl" style="margin-top:12px"><button class="kr-btn" data-b="-">− банка</button><button class="kr-btn" data-b="+">+ банка</button><button class="kr-btn" data-b="m">${ser ? '⇄ Поставить рядом' : '⇅ Поставить этажами'}</button></div>`;
    $$('[data-b]', stg).forEach(b => b.onclick = () => {
      const a = b.dataset.b; if (a === '+') n = Math.min(6, n + 1); else if (a === '-') n = Math.max(1, n - 1); else mode = ser ? 'par' : 'ser';
      snd('tap'); draw(); check();
    });
  }
  function check() {
    const [, need, nm] = goals[g];
    if (n === need && mode === nm) {
      snd('ok'); buzz(20);
      setTimeout(() => { g++; if (g < goals.length) { n = 1; mode = 'ser'; draw(); toastK('✓ Готово! Следующая цель'); } else { stg.querySelector('.kg-ctl').innerHTML = '<div class="kr-done">✓ Все 4 цели выполнены. Запомни: этажами - вольты растут, рядом - растёт бак.</div>'; done(1); } }, 700);
    }
  }
  draw();
}

/* светофор: лететь или садиться */
function gLight(stg, st, hint, done) {
  const Z = [['Полностью заряжена', [4.2, 4.18, 4.16]], ['Можно летать', [3.95, 3.9, 3.85, 3.8, 3.75, 3.7, 3.65]], ['Пора садиться', [3.55, 3.5, 3.45]], ['Опасно мало', [3.25, 3.2, 3.1, 3.0, 2.9]]];
  const rounds = shuf(Z.flatMap((z, zi) => shuf(z[1]).slice(0, 2).map(v => [v, zi]))).slice(0, 8);
  let k = 0, ok = 0;
  const pos = v => Math.max(0, Math.min(100, (v - 2.9) / (4.25 - 2.9) * 100));
  function draw() {
    const [v, zi] = rounds[k];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · ${k + 1} из ${rounds.length}</div>${hint ? '<div class="kr-hint">Подсказка: 4,2 полная · 3,5 пора садиться · ниже 3,3 опасно</div>' : ''}
      <div class="kg-volt">${fx(v, 2)} В</div><div class="kg-gauge"><i style="left:${pos(4.25)}%"></i></div><p class="mut" style="text-align:center;margin-bottom:10px">одна банка на спокойном полёте</p>
      <div class="kg-opts">${Z.map((z, j) => `<button class="kr-opt" data-j="${j}">${['🟢', '🔵', '🟡', '🔴'][j]} ${E(z[0])}</button>`).join('')}</div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const i = $('.kg-gauge i', stg); if (i) i.style.left = pos(v) + '%'; }));
    $$('.kr-opt', stg).forEach(b => b.onclick = () => {
      const j = +b.dataset.j; $$('.kr-opt', stg).forEach(z => { z.disabled = true; if (+z.dataset.j === zi) z.classList.add('y'); });
      if (j === zi) { ok++; snd('ok'); } else { b.classList.add('n'); snd('bad'); buzz(40); }
      setTimeout(() => { k++; if (k < rounds.length) draw(); else { stg.innerHTML = `<div class="kr-end"><div class="big">${ok} из ${rounds.length}</div></div>`; done(ok / rounds.length); } }, j === zi ? 700 : 1500);
    });
  }
  draw();
}

/* посчитай вольты */
function gCalc(stg, st, hint, done) {
  const N = st.n || 6, items = Array.from({ length: N }, () => {
    const s = pick([1, 2, 3, 4, 6]), t = pick(['full', 'land', 'nom', 'per']);
    if (t === 'full') return [`Сколько вольт у полностью заряженной АКБ ${s}S?`, s * 4.2, `${s} x 4,2 = ${fx(s * 4.2)} В`];
    if (t === 'land') return [`При каком напряжении всей АКБ ${s}S пора садиться?`, s * 3.5, `${s} x 3,5 = ${fx(s * 3.5)} В`];
    if (t === 'nom') return [`Какое "обычное" напряжение (номинал) у АКБ ${s}S?`, s * 3.7, `${s} x 3,7 = ${fx(s * 3.7)} В`];
    const per = pick([4.2, 3.9, 3.8, 3.7, 3.5]), s2 = pick([2, 3, 4, 6]);
    return [`В очках ${fx(per * s2)} В у АКБ ${s2}S. Сколько на одну банку?`, per, `${fx(per * s2)} : ${s2} = ${fx(per)} В`];
  });
  let k = 0, ok = 0;
  function draw() {
    const it = items[k];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · ${k + 1} из ${N}</div>${hint ? '<div class="kr-hint">Подсказка: вся АКБ = банка x S. Полная 4,2 · номинал 3,7 · садиться 3,5</div>' : ''}
      <div class="qq" style="font-size:17px;font-weight:700;margin-bottom:12px">${E(it[0])}</div>
      <form class="kr-in"><label>Ответ, вольт<input name="a" inputmode="decimal" autocomplete="off" placeholder="например 14,8" required></label><button class="kr-btn pri">Проверить</button></form><div id="kcR"></div>`;
    const inp = $('input', stg); setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 100);
    $('form', stg).onsubmit = e => {
      e.preventDefault(); const a = parseFloat(String(inp.value).replace(',', '.')); if (isNaN(a)) return;
      const good = Math.abs(a - it[1]) < 0.06; if (good) { ok++; snd('ok'); } else { snd('bad'); buzz(40); }
      $('form button', stg).disabled = true; inp.disabled = true;
      $('#kcR', stg).innerHTML = `<div class="kg-exp ${good ? 'y' : 'n'}">${good ? '✓ Верно!' : '✗ Не совсем.'} ${E(it[2])}</div><div class="kr-end"><div class="acts"><button class="kr-btn pri" id="kcN">${k < N - 1 ? 'Следующий →' : 'Итог'}</button></div></div>`;
      $('#kcN', stg).onclick = () => { k++; if (k < N) draw(); else { stg.innerHTML = `<div class="kr-end"><div class="big">${ok} из ${N}</div></div>`; done(ok / N); } };
    };
  }
  draw();
}

/* сравни две АКБ */
function gCompare(stg, st, hint, done) {
  const N = st.n || 5, R = [];
  for (let i = 0; i < N; i++) {
    const t = pick(['long', 'pow', 'c']); let a, b, q, why;
    if (t === 'long') { const s = pick([1, 4, 6]), m1 = pick([450, 650, 850, 1300]), m2 = m1 + pick([200, 400, 500]); a = [s, m1, 100]; b = [s, m2, 100]; q = 'Какая АКБ даст дольше полёт на том же дроне?'; why = 'Больше mAh - больше бак, дольше полёт (но АКБ тяжелее).'; R.push([q, shuf([[a, 0], [b, 1]]), why]); continue; }
    if (t === 'pow') { const m = pick([850, 1300, 1500]); a = [4, m, 100]; b = [6, m, 100]; q = 'Какая АКБ мощнее (моторы крутятся быстрее)?'; why = 'Больше банок (S) - выше напряжение, мощнее.'; R.push([q, shuf([[a, 0], [b, 1]]), why]); continue; }
    const m = pick([850, 1300, 1500]), s = pick([4, 6]); a = [s, m, pick([25, 45])]; b = [s, m, pick([100, 120])]; q = 'Какая АКБ лучше выдержит полный газ и не "задохнётся"?'; why = 'Больше C - шире "шланг", больше ток сразу.'; R.push([q, shuf([[a, 0], [b, 1]]), why]);
  }
  let k = 0, ok = 0;
  function draw() {
    const [q, pair, why] = R[k];
    stg.innerHTML = `<div class="kr-sec">${E(st.h)} · ${k + 1} из ${N}</div>${hint ? '<div class="kr-hint">Подсказка: mAh - бак, S - сила, C - шланг</div>' : ''}<div class="qq" style="font-size:16.5px;font-weight:700;margin-bottom:12px">${E(q)}</div>
      <div class="kg-cmp">${pair.map((p, j) => `<button class="kg-akb" data-j="${j}" style="animation-delay:${j * 80}ms"><span style="font-size:30px">🔋</span><b>${p[0][0]}S</b><small>${p[0][1]} mAh</small><small>${p[0][2]}C</small></button>`).join('')}</div><div id="kcR"></div>`;
    $$('.kg-akb', stg).forEach(b => b.onclick = () => {
      const j = +b.dataset.j, good = pair[j][1] === 1; $$('.kg-akb', stg).forEach(z => { z.disabled = true; if (pair[+z.dataset.j][1] === 1) z.classList.add('y'); });
      if (good) { ok++; snd('ok'); } else { b.classList.add('n'); snd('bad'); buzz(40); }
      $('#kcR', stg).innerHTML = `<div class="kg-exp">${good ? '✓' : '✗'} ${E(why)}</div><div class="kr-end"><div class="acts"><button class="kr-btn pri" id="kcN">${k < N - 1 ? 'Следующий →' : 'Итог'}</button></div></div>`;
      $('#kcN', stg).onclick = () => { k++; if (k < N) draw(); else { stg.innerHTML = `<div class="kr-end"><div class="big">${ok} из ${N}</div></div>`; done(ok / N); } };
    });
  }
  draw();
}

/* наклейка по частям */
function gLabel(stg, st, hint, done) {
  const P = [['4S', '4 банки "этажами". Полная 4 x 4,2 = 16,8 В, садиться при 4 x 3,5 = 14 В.'], ['1500mAh', 'Ёмкость - размер бака: 1500 mAh = 1,5 А·ч. Заряжаем током 1,5 А (1C).'], ['120C', 'Токоотдача - ширина "шланга": сколько энергии АКБ может отдать сразу на полном газу.'], ['14.8V', 'Номинал всей АКБ: 4 x 3,7 = 14,8 В. Это "обычное" напряжение, не полный заряд.'], ['LiPo', 'Тип банок: литий-полимер. Полная банка 4,2 В. Если написано LiHV - до 4,35 В.']];
  const seen = new Set();
  stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><div class="kg-lbl">${P.map((p, j) => `<button data-j="${j}">${p[0]}</button>`).join('')}</div><div class="kg-exp" id="kgE">👆 Нажимай на части наклейки по очереди. Открыто 0 из ${P.length}.</div>`;
  $$('.kg-lbl button', stg).forEach(b => b.onclick = () => {
    const j = +b.dataset.j; seen.add(j); b.classList.add('ok'); snd('tap');
    $('#kgE', stg).innerHTML = `<b>${P[j][0]}</b> - ${E(P[j][1])}<br><small class="mut">Открыто ${seen.size} из ${P.length}</small>`;
    $('#kgE', stg).style.animation = 'none'; $('#kgE', stg).offsetWidth; $('#kgE', stg).style.animation = '';
    if (seen.size === P.length && !stg._d) { stg._d = 1; snd('ok'); done(1); }
  });
}

/* найди ошибки в истории */
function gStory(stg, st, hint, done) {
  const L = shuf(K.story).slice(0, hint ? 5 : 7), sel = new Set();
  stg.innerHTML = `<div class="kr-sec">${E(st.h)}</div><p class="mut" style="margin-bottom:10px">Нажми на предложения, где Петя ошибся, потом "Проверить".${hint ? ' Подсказка: ошибки про тепло, присмотр и вздутие.' : ''}</p>
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
})();
