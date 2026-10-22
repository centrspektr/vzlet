/* trener-panel.js - общие панели тренера для дашбордов кружков СПЕКТРа: "👥 Заявки" и "⚠ Ошибки".
   Та же логика, что в режиме правки портала (slist / sset, buglist / bugset), тот же общий сервер.

   Подключение:  <script src="trener-panel.js" defer></script>
   Место для кнопок (сколько угодно, можно появляться позже - найдутся сами):
     <span data-spk-panel data-club="vzlet"></span>
       data-club     - кружок (vzlet | studio | agro); по нему фильтр заявок
       data-site     - сайт для фильтра ошибок (по умолчанию = data-club)
       data-coach    - страница уже в режиме тренера: кнопки видны и без токена, по нажатию спросим PIN
       data-pin-key  - ключ sessionStorage с PIN тренера этого сайта: один раз пробуем войти им на общий сервер
       data-tok-key  - куда сохранить токен (по умолчанию vz_spk_tok - его же берут курс и "Доступ учеников" Взлёта)
       data-btn      - доп. класс кнопок (например btn), data-accent - цвет акцента
   Вход: токен из sessionStorage (data-tok-key, vz_spk_tok, spk_tok, сессия портала spectr_sess) - тренер не входит дважды.
   API: SPK_PANEL.open('req'|'bug', {club, site}), SPK_PANEL.close(), SPK_PANEL.refresh().
   После изменений шлёт событие window 'spk-panel-change' {detail:{op, act, id}}. */
(function () {
  'use strict';
  if (window.SPK_PANEL) return;
  var API = (window.KURSY && window.KURSY.api) || 'https://functions.yandexcloud.net/d4e4vhndceg7scc0mh3b';
  var CN = { vzlet: 'Взлёт', studio: 'ИИ-студия', agro: 'Агрокласс' };
  var SN = { portal: 'Портал', vzlet: 'Взлёт', studio: 'Гитара и ИИ-студия', agro: 'Агрокласс' };
  var ses = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- настройки страницы: из первого контейнера ---------- */
  var CFG = { club: '', site: '', coach: false, pinKey: '', tokKey: 'vz_spk_tok', btn: '', accent: '' };
  function readCfg() {
    var c = document.querySelector('[data-spk-panel]'); if (!c) return;
    var d = c.dataset;
    CFG.club = d.club || CFG.club; CFG.site = d.site || CFG.site || CFG.club;
    CFG.pinKey = d.pinKey || CFG.pinKey; CFG.tokKey = d.tokKey || CFG.tokKey;
    CFG.btn = d.btn || CFG.btn; CFG.accent = d.accent || CFG.accent;
  }
  function coachHere() { return $$('[data-spk-panel]').some(function (c) { return 'coach' in c.dataset && c.offsetParent !== null; }) || CFG.coach; }

  /* ---------- токен общего сервера ---------- */
  var TOKSRC = '';
  function tok() {
    var keys = [CFG.tokKey, 'vz_spk_tok', 'spk_tok'];
    for (var i = 0; i < keys.length; i++) { var t = keys[i] && ses.get(keys[i]); if (t) { TOKSRC = keys[i]; return t; } }
    try { var P = JSON.parse(ses.get('spectr_sess') || 'null'); if (P && P.token) { TOKSRC = 'spectr_sess'; return P.token; } } catch (e) {}
    TOKSRC = ''; return '';
  }
  function dropTok() {
    [CFG.tokKey, 'vz_spk_tok', 'spk_tok'].forEach(function (k) { if (k) ses.set(k, ''); });
    if (TOKSRC === 'spectr_sess') ses.del('spectr_sess');
    TOKSRC = '';
  }
  function call(q) {
    return fetch(API, { method: 'POST', body: JSON.stringify(q) }).then(function (r) { return r.json(); }, function () { throw new Error('Нет связи с сервером'); });
  }
  /* запрос с токеном; при ошибке входа - сбрасываем токен и просим PIN */
  function api(q) {
    var t = tok(); if (!t) return Promise.reject(authErr(''));
    return call(Object.assign({}, q, { token: t })).then(function (j) {
      if (!j || !j.ok) { if (j && j.auth) { dropTok(); throw authErr(j.error || ''); } throw new Error((j && j.error) || 'Ошибка сервера'); }
      return j;
    });
  }
  function authErr(m) { var e = new Error(m || 'Нужен вход'); e.auth = true; return e; }
  function login(pin) {
    return call({ op: 'login', pin: pin }).then(function (j) {
      if (!j || !j.ok || !j.token) throw new Error((j && j.error) || 'PIN не подошёл');
      ses.set(CFG.tokKey || 'spk_tok', j.token); return j.token;
    });
  }
  /* один раз за вкладку пробуем PIN тренера этого сайта (как курс Взлёта) */
  function tryPin() {
    if (tok() || !CFG.pinKey || ses.get('tp_pin_try') === '1') return Promise.resolve(false);
    var pin = ses.get(CFG.pinKey); if (!pin) return Promise.resolve(false);
    ses.set('tp_pin_try', '1');
    return login(pin).then(function () { return true; }, function () { return false; });
  }

  /* ---------- данные ---------- */
  var ST = null, BG = null, busy = {};
  function loadSt() {
    if (busy.st) return busy.st;
    busy.st = api({ op: 'slist' }).then(function (j) { ST = j; }, function (e) { ST = { list: [], clubs: [], err: e.message, auth: e.auth }; })
      .then(function () { busy.st = null; paint(); });
    return busy.st;
  }
  function loadBg(q) {
    if (busy.bg && !q) return busy.bg;
    var p = api(q || { op: 'buglist' }).then(function (j) { BG = j; }, function (e) { if (q) { toast(e.message); if (e.auth) BG = { bugs: [], err: e.message, auth: true }; return; } BG = { bugs: [], err: e.message, auth: e.auth }; })
      .then(function () { if (!q) busy.bg = null; paint(); });
    if (!q) busy.bg = p; return p;
  }
  function loadAll() { return Promise.all([loadSt(), loadBg()]); }
  var wait = function (club) { return ST && ST.list ? ST.list.filter(function (x) { return x.st === 'заявка' && (!club || x.club === club); }).length : 0; };
  var fresh = function (site) { return BG && BG.bugs ? BG.bugs.filter(function (x) { return x.st === 'новое' && (!site || x.site === site); }).length : 0; };

  /* ---------- стили ---------- */
  function css() {
    if (document.getElementById('tp-css')) return;
    var s = document.createElement('style'); s.id = 'tp-css';
    s.textContent = [
      '.tp-bar{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}.tp-bar[hidden]{display:none!important}',
      '.tp-b{position:relative;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:13px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;font:700 14px/1.1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}',
      '.tp-b:hover{border-color:var(--tp-a,#00d4ff)}.tp-b:focus-visible{outline:2px solid var(--tp-a,#00d4ff);outline-offset:2px}',
      '.tp-n{min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#f85149;color:#fff;font-size:12.5px;line-height:22px;text-align:center}.tp-n:empty{display:none}',
      '.tp-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s}',
      '.tp-ov.on{opacity:1}',
      '.tp-sh{--tp-bg:#11161f;--tp-bg2:#1a212d;--tp-ln:rgba(255,255,255,.12);--tp-tx:#e8edf3;--tp-dim:#9aa5b4;width:100%;max-width:640px;max-height:92vh;max-height:92dvh;display:flex;flex-direction:column;background:var(--tp-bg);color:var(--tp-tx);border:1px solid var(--tp-ln);border-bottom:0;border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.5);font:15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;transform:translateY(24px);transition:transform .22s;padding-bottom:env(safe-area-inset-bottom)}',
      '.tp-ov.on .tp-sh{transform:none}',
      '@media(min-width:700px){.tp-ov{align-items:center}.tp-sh{border-radius:20px;border-bottom:1px solid var(--tp-ln);max-height:86vh}}',
      '.tp-hd{display:flex;align-items:center;gap:10px;padding:12px 12px 10px 18px;border-bottom:1px solid var(--tp-ln)}',
      '.tp-hd h3{flex:1;margin:0;font:800 18px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--tp-tx)}',
      '.tp-x{width:44px;height:44px;flex:none;border-radius:13px;border:1px solid var(--tp-ln);background:var(--tp-bg2);color:var(--tp-tx);font-size:18px;cursor:pointer}',
      '.tp-bd{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:12px 16px 18px}',
      '.tp-sh p{margin:0 0 10px}.tp-dim{color:var(--tp-dim);font-size:13.5px}',
      '.tp-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}',
      '.tp-c{min-height:44px;padding:0 12px;border-radius:12px;border:1px solid var(--tp-ln);background:var(--tp-bg2);color:var(--tp-tx);font:700 13.5px system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer}',
      '.tp-c.on{background:var(--tp-a,#00d4ff);border-color:var(--tp-a,#00d4ff);color:#06121a}',
      '.tp-sw{display:flex;align-items:center;gap:10px;min-height:44px;margin:0 0 6px;font-size:14px;color:var(--tp-dim);cursor:pointer}.tp-sw input{width:22px;height:22px;accent-color:var(--tp-a,#00d4ff)}',
      '.tp-sh h4{display:flex;align-items:center;gap:8px;margin:16px 0 8px;font:800 15px system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--tp-tx)}',
      '.tp-k{min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#f85149;color:#fff;font-size:12.5px;line-height:22px;text-align:center}',
      '.tp-r{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:10px 12px;margin-bottom:8px;border:1px solid var(--tp-ln);border-radius:14px;background:var(--tp-bg2)}',
      '.tp-r.hid{opacity:.6}.tp-ic{font-size:18px;flex:none}',
      '.tp-nm{flex:1 1 170px;min-width:0;display:flex;flex-direction:column;gap:2px}.tp-nm b{font-weight:700;overflow-wrap:anywhere}.tp-nm small{color:var(--tp-dim);font-size:12.5px;overflow-wrap:anywhere}',
      '.tp-t{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}',
      '.tp-code{font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;color:var(--tp-tx)}',
      '.tp-a{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}',
      '.tp-btn{min-width:44px;min-height:44px;padding:0 12px;border-radius:12px;border:1px solid var(--tp-ln);background:transparent;color:var(--tp-tx);font:700 13.5px system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer}',
      '.tp-btn.pri{background:var(--tp-a,#00d4ff);border-color:var(--tp-a,#00d4ff);color:#06121a}.tp-btn:disabled{opacity:.5;cursor:default}',
      '.tp-none{color:var(--tp-dim);font-size:14px;padding:6px 2px}',
      '.tp-sh details{margin-top:14px}.tp-sh summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700;color:var(--tp-dim)}',
      '.tp-ft{display:flex;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid var(--tp-ln)}',
      '.tp-pin{display:flex;gap:8px;margin-top:8px}.tp-pin input{flex:1;min-width:0;height:44px;padding:0 12px;border-radius:12px;border:1px solid var(--tp-ln);background:var(--tp-bg2);color:var(--tp-tx);font-size:16px}',
      '.tp-err{color:#ff8a80;min-height:20px;font-size:14px;margin-top:6px}',
      '.tp-toast{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));z-index:2147483001;transform:translateX(-50%);max-width:calc(100vw - 32px);padding:12px 16px;border-radius:14px;background:#0b0f15;color:#e8edf3;border:1px solid rgba(255,255,255,.18);font:600 14px system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);opacity:0;transition:opacity .2s;pointer-events:none}',
      '.tp-toast.on{opacity:1}',
      '@media(prefers-reduced-motion:reduce){.tp-ov,.tp-sh,.tp-toast{transition:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function toast(m) {
    var t = document.getElementById('tp-toast');
    if (!t) { t = document.createElement('div'); t.id = 'tp-toast'; t.className = 'tp-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2800);
  }

  /* ---------- кнопки в контейнерах ---------- */
  function paintBars() {
    var t = !!tok(), co = t || coachHere();
    $$('[data-spk-panel]').forEach(function (c) {
      var club = c.dataset.club || CFG.club, site = c.dataset.site || club || CFG.site;
      var show = t || 'coach' in c.dataset;
      if (!c.firstElementChild || !c.querySelector('[data-tp-open]')) {
        var bc = 'tp-b' + (c.dataset.btn ? ' ' + c.dataset.btn : '');
        c.innerHTML = '<button type="button" class="' + bc + '" data-tp-open="req"><span aria-hidden="true">👥</span> Заявки<span class="tp-n"></span></button>' +
          '<button type="button" class="' + bc + '" data-tp-open="bug"><span aria-hidden="true">⚠</span> Ошибки<span class="tp-n"></span></button>';
        c.classList.add('tp-bar');
        if (c.dataset.accent) c.style.setProperty('--tp-a', c.dataset.accent);
        $$('[data-tp-open]', c).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); open(b.dataset.tpOpen, { club: club, site: site }); }; });
      }
      if (c.hidden !== !show) c.hidden = !show;
      var nr = t ? wait(club) : 0, nb = t ? fresh(site) : 0, sp = $$('.tp-n', c);
      var t0 = String(nr || ''), t1 = String(nb || ''); if (sp[0].textContent !== t0) sp[0].textContent = t0; if (sp[1].textContent !== t1) sp[1].textContent = t1;
      var bs = $$('[data-tp-open]', c);
      bs[0].setAttribute('aria-label', 'Заявки учеников' + (nr ? ', новых: ' + nr : ''));
      bs[1].setAttribute('aria-label', 'Сообщения об ошибках' + (nb ? ', новых: ' + nb : ''));
    });
    return co;
  }

  /* ---------- панель ---------- */
  var P = { kind: '', club: '', site: '', all: false, bf: 'new', el: null, back: null };
  function open(kind, o) {
    o = o || {}; readCfg(); css();
    P.kind = kind === 'bug' ? 'bug' : 'req'; P.club = o.club || CFG.club; P.site = o.site || P.club || CFG.site;
    if (!P.el) P.all = false;   /* каждый раз начинаем со своего кружка/сайта */
    if (!P.el) {
      P.back = document.activeElement;
      var ov = document.createElement('div'); ov.className = 'tp-ov';
      ov.innerHTML = '<div class="tp-sh" role="dialog" aria-modal="true" aria-labelledby="tpTitle"><div class="tp-hd"><h3 id="tpTitle"></h3><button type="button" class="tp-x" data-tp="close" aria-label="Закрыть">✕</button></div><div class="tp-bd"></div><div class="tp-ft"></div></div>';
      var a = (document.querySelector('[data-spk-panel][data-accent]') || {}).dataset; if (a && a.accent) ov.style.setProperty('--tp-a', a.accent);
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      document.body.appendChild(ov); P.el = ov;
      P.ovf = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(function () { ov.classList.add('on'); });
      document.addEventListener('keydown', onKey, true);
      setTimeout(function () { var x = ov.querySelector('.tp-x'); if (x) x.focus(); }, 30);
    }
    draw(true);
    if (tok()) { if (P.kind === 'req') loadSt(); else loadBg(); }
  }
  function close() {
    if (!P.el) return;
    var ov = P.el; P.el = null; ov.classList.remove('on');
    document.documentElement.style.overflow = P.ovf || '';
    document.removeEventListener('keydown', onKey, true);
    setTimeout(function () { ov.remove(); }, 200);
    if (P.back && P.back.focus && document.contains(P.back)) try { P.back.focus(); } catch (e) {}
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab' && P.el) {   // фокус не уходит из панели
      var f = $$('button:not([disabled]),input,summary', P.el).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  function paint() { paintBars(); if (P.el) draw(); }

  function draw(loading) {
    if (!P.el) return;
    var bd = P.el.querySelector('.tp-bd'), ft = P.el.querySelector('.tp-ft'), ti = P.el.querySelector('#tpTitle');
    ti.textContent = P.kind === 'req' ? '👥 Заявки и ученики' : '⚠ Сообщения об ошибках';
    ft.innerHTML = '<button type="button" class="tp-btn" data-tp="reload">↻ Обновить</button><button type="button" class="tp-btn pri" data-tp="close">Готово</button>';
    var D = P.kind === 'req' ? ST : BG;
    var keep = bd.scrollTop;
    if (!tok() || (D && D.auth)) { bd.innerHTML = pinForm(D && D.auth && D.err && D.err !== 'Нужен вход' ? D.err : ''); ft.innerHTML = '<button type="button" class="tp-btn" data-tp="close">Закрыть</button>'; bindPin(bd); bind(); return; }
    if (!D || (loading && !D)) { bd.innerHTML = '<p class="tp-dim">Загружаю...</p>'; bind(); return; }
    if (D.err) { bd.innerHTML = '<p>' + E(D.err) + '</p>'; bind(); return; }
    bd.innerHTML = P.kind === 'req' ? reqHtml() : bugHtml();
    bd.scrollTop = keep;
    bind();
  }
  function pinForm(err) {
    return '<p class="tp-dim">Чтобы видеть заявки и сообщения об ошибках, войдите PIN-ом портала СПЕКТРа (тот же, что для правки на портале).</p>' +
      '<form class="tp-pin" autocomplete="off"><input type="password" inputmode="numeric" maxlength="8" placeholder="PIN" aria-label="PIN"><button class="tp-btn pri" type="submit">Войти</button></form><div class="tp-err" role="alert">' + E(err || '') + '</div>';
  }
  function bindPin(bd) {
    var f = bd.querySelector('form'), i = f.querySelector('input'), b = f.querySelector('button'), er = bd.querySelector('.tp-err');
    setTimeout(function () { i.focus(); }, 60);
    f.onsubmit = function (e) {
      e.preventDefault(); var pin = i.value.trim(); if (!pin) return;
      b.disabled = true; b.textContent = 'Проверяю...';
      login(pin).then(function () { ST = BG = null; draw(true); loadAll(); }, function (x) { er.textContent = x.message; b.disabled = false; b.textContent = 'Войти'; });
    };
  }
  function sw(on, label) { return '<label class="tp-sw"><input type="checkbox" data-tp="all" ' + (on ? 'checked' : '') + '> ' + label + '</label>'; }

  function reqHtml() {
    var all = !P.club, L = ST.list.filter(function (x) { return all || x.club === P.club; });
    var cn = function (id) { return CN[id] || (ST.clubs || []).reduce(function (a, c) { return c.id === id ? c.name : a; }, '') || id; };
    var pts = function (x) { return (+x.site || 0) + (+x.t || 0); };
    var wt = L.filter(function (x) { return x.st === 'заявка'; }), ok = L.filter(function (x) { return x.st === 'принят'; }).sort(function (a, b) { return pts(b) - pts(a); }), no = L.filter(function (x) { return x.st === 'отклонён'; });
    /* только имя и класс - фамилию не показываем */
    var nm = function (x) { return E(x.first) + ', ' + E(x.cls); };
    var tag = function (x) { return all ? E(cn(x.club)) + ' · ' : ''; };
    var who = function (x) { return '<span class="tp-nm"><b>' + nm(x) + '</b><small>' + tag(x) + E(x.when) + '</small></span>'; };
    var B = function (a, id, t, lab, cls) { return '<button type="button" class="tp-btn' + (cls ? ' ' + cls : '') + '" data-st="' + a + '" data-id="' + E(id) + '"' + (lab ? ' aria-label="' + E(lab) + '" title="' + E(lab) + '"' : '') + '>' + t + '</button>'; };
    var h = '<p class="tp-dim">Ученик нажимает "Подключиться" на сайте кружка. После одобрения он видит свой код и путь новичка, его тесты и значки уходят в рейтинг.</p>';
    /* клуб Взлёт: только свои заявки, без переключателя "Все кружки" */
    h += '<h4>Новые заявки ' + (wt.length ? '<span class="tp-k">' + wt.length + '</span>' : '') + '</h4>';
    h += wt.length ? wt.map(function (x) { return '<div class="tp-r"><span class="tp-ic" aria-hidden="true">🆕</span>' + who(x) + '<span class="tp-a">' + B('ok', x.id, '✓ Принять', '', 'pri') + B('no', x.id, '✕', 'Отклонить заявку') + '</span></div>'; }).join('') : '<p class="tp-none">Новых заявок нет.</p>';
    h += '<h4>В рейтинге · ' + ok.length + '</h4>';
    h += ok.length ? ok.map(function (x, i) {
      return '<div class="tp-r' + (x.hid ? ' hid' : '') + '"><span class="tp-nm"><b>' + (i + 1) + '. ' + nm(x) + '</b><small>' + tag(x) + 'код <span class="tp-code">' + E(x.code) + '</span> · ⭐ ' + pts(x) + (x.hid ? ' · скрыт' : '') + '</small></span><span class="tp-a">' +
        B(x.hid ? 'show' : 'hide', x.id, x.hid ? '👁' : '🙈', x.hid ? 'Показать в рейтинге' : 'Скрыть из рейтинга') + B('newcode', x.id, '🔑', 'Выдать новый код') + B('del', x.id, '🗑', 'Удалить ученика') + '</span></div>';
    }).join('') : '<p class="tp-none">Пока никого. Примите первую заявку.</p>';
    if (no.length) h += '<details><summary>Отклонённые · ' + no.length + '</summary>' + no.map(function (x) { return '<div class="tp-r"><span class="tp-ic" aria-hidden="true">✕</span>' + who(x) + '<span class="tp-a">' + B('ok', x.id, 'Принять') + B('del', x.id, '🗑', 'Удалить') + '</span></div>'; }).join('') + '</details>';
    return h;
  }
  function bugHtml() {
    var all = !P.site, A = BG.bugs.filter(function (x) { return all || x.site === P.site; });
    var g = { new: A.filter(function (x) { return x.st === 'новое'; }), work: A.filter(function (x) { return x.st === 'в работе'; }), done: A.filter(function (x) { return x.st === 'исправлено'; }) }, L = g[P.bf] || [];
    var tabs = [['new', '🆕 Новые'], ['work', '🔧 В работе'], ['done', '✅ Исправлено']].map(function (t) { return '<button type="button" class="tp-c' + (P.bf === t[0] ? ' on' : '') + '" data-bf="' + t[0] + '" aria-pressed="' + (P.bf === t[0]) + '">' + t[1] + ' · ' + g[t[0]].length + '</button>'; }).join('');
    var B = function (a, id, t, cls, lab) { return '<button type="button" class="tp-btn' + (cls ? ' ' + cls : '') + '" data-bg="' + a + '" data-id="' + E(id) + '"' + (lab ? ' aria-label="' + lab + '" title="' + lab + '"' : '') + '>' + t + '</button>'; };
    var row = function (x) {
      return '<div class="tp-r"><span class="tp-ic" aria-hidden="true">' + (x.st === 'исправлено' ? '✅' : x.st === 'в работе' ? '🔧' : '⚠') + '</span><span class="tp-nm"><b>' + E(x.kind) + (all ? ' · ' + E(SN[x.site] || x.site) : '') + '</b>' + (x.text ? '<span class="tp-t">' + E(x.text) + '</span>' : '') +
        '<small>' + E(x.when) + ' · ' + E(x.page) + ' · ' + E(x.dev) + (x.by ? ' · закрыл ' + E(x.by) : '') + '</small></span><span class="tp-a">' +
        (x.st !== 'в работе' && x.st !== 'исправлено' ? B('work', x.id, '🔧 Взять') : '') +
        (x.st !== 'исправлено' ? B('done', x.id, '✓ Исправлено', 'pri') : B('new', x.id, '↺ Снова')) + B('del', x.id, '🗑', '', 'Удалить') + '</span></div>';
    };
    return '<p class="tp-dim">Ученики отправляют их кнопкой "Нашёл ошибку? Жми". Сайт, раздел и устройство подставляются сами.</p>' +
      '<div class="tp-tabs" role="group" aria-label="Статус">' + tabs + '</div>' +
      (L.length ? L.map(row).join('') : '<p class="tp-none">' + (P.bf === 'new' ? 'Новых сообщений нет 🎉' : 'Пока пусто.') + '</p>');
  }
  function changed(d) { try { window.dispatchEvent(new CustomEvent('spk-panel-change', { detail: d })); } catch (e) {} }
  function bind() {
    var el = P.el; if (!el) return;
    $$('[data-tp]', el).forEach(function (b) {
      var a = b.dataset.tp;
      if (a === 'close') b.onclick = close;
      else if (a === 'reload') b.onclick = function () { b.disabled = true; (P.kind === 'req' ? loadSt() : loadBg()); };
      else if (a === 'all') b.onchange = function () { P.all = b.checked; draw(); };
    });
    $$('[data-bf]', el).forEach(function (b) { b.onclick = function () { P.bf = b.dataset.bf; draw(); }; });
    $$('[data-st]', el).forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.st, id = b.dataset.id, x = ST.list.filter(function (y) { return y.id === id; })[0], n = x ? x.first + ', ' + x.cls : '';
        if (a === 'del' && !confirm('Удалить ' + n + ' из списка? Очки пропадут.')) return;
        if (a === 'newcode' && !confirm('Выдать ' + n + ' новый код? Старый перестанет работать, ученику нужно будет войти заново.')) return;
        b.disabled = true;
        api({ op: 'sset', id: id, act: a }).then(function (j) {
          ST = j; paint(); changed({ op: 'sset', act: a, id: id });
          toast({ ok: 'Принят: ' + n + '. Код появится у ученика на сайте', no: 'Заявка отклонена', del: 'Удалено', hide: 'Скрыт из рейтинга', show: 'Снова в рейтинге', newcode: 'Новый код выдан' }[a]);
        }, function (e) { if (e.auth) { ST = { list: [], clubs: [], err: e.message, auth: true }; paint(); } else { b.disabled = false; toast(e.message); } });
      };
    });
    $$('[data-bg]', el).forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.bg;
        if (a === 'del' && !confirm('Удалить это сообщение?')) return;
        b.disabled = true;
        loadBg({ op: 'bugset', id: b.dataset.id, act: a }).then(function () {
          if (BG && !BG.err) { changed({ op: 'bugset', act: a, id: b.dataset.id }); toast({ work: 'Взято в работу', done: 'Отмечено: исправлено', new: 'Снова в новых', del: 'Удалено' }[a]); }
          else b.disabled = false;
        });
      };
    });
  }

  /* ---------- запуск ---------- */
  var started = false;
  function boot() {
    if (!document.querySelector('[data-spk-panel]')) return;
    readCfg(); css();
    var co = paintBars();
    if (!started && co) {
      started = true;
      /* токен есть - сразу; нет - чуть ждём: курс или "Доступ учеников" могли уже войти этим же PIN-ом, чтобы не входить дважды */
      if (tok()) loadAll(); else setTimeout(function () { tryPin().then(function () { if (tok()) loadAll(); else paintBars(); }); }, 1500);
    }
  }
  var q = 0;
  function onMut() { if (q) return; q = 1; (window.queueMicrotask || setTimeout)(function () { q = 0; if ($$('[data-spk-panel]').some(function (c) { return !c.querySelector('[data-tp-open]'); }) || (!started && coachHere())) boot(); }); }
  function init() {
    boot();
    try { new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) if (m[i].addedNodes.length) return onMut(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    setInterval(function () { if (!document.hidden && !P.el && tok() && document.querySelector('[data-spk-panel]')) loadAll(); }, 3 * 60e3);
    /* токен мог появиться позже (вход тренера в курсе или в "Доступ учеников") */
    var had = !!tok();
    setInterval(function () { var t = !!tok(); if (t !== had) { had = t; if (t) { started = true; loadAll(); } else { ST = BG = null; paintBars(); } } }, 4000);
  }

  window.SPK_PANEL = { open: open, close: close, refresh: function () { return tok() ? loadAll() : Promise.resolve(); }, _state: function () { return { ST: ST, BG: BG, tok: !!tok() }; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
