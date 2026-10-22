/* СПЕКТР - подключение к кружку (заявка) и общий рейтинг учеников.
   Подключение на сайте кружка:
     <div data-spk-club="vzlet"></div>
     <script src="students.js" defer></script>
   Прогресс сайт отдаёт через window.SPK_PROGRESS = () => ({p: очки, b: значки, l: 'уровень', t: {тест: [лучший балл, попыток]}})
   и сообщает об изменениях вызовом window.SPK && SPK.sync().
   Если педагог обнулил ученика, вызывается window.SPK_RESET(club): сайт стирает свой прогресс на этом устройстве. */
(function () {
  'use strict';
  var API = 'https://functions.yandexcloud.net/d4e4vhndceg7scc0mh3b';
  var NAMES = { vzlet: 'клуба "Взлёт"', studio: 'ИИ-студии', agro: 'Агрокласса' };
  var TO = { vzlet: 'клубу "Взлёт"', studio: 'ИИ-студии', agro: 'Агроклассу' };
  var MAX = { vzlet: 'https://max.ru/join/v0ZfpDIihnow9hdwq3vpjm0KiPFW7A0WDfkNlIt9JVs', studio: 'https://max.ru/join/x7bqQ0ZGLEmvUJso1aof3ylEJv5K-1x_4cbCWCHaf0A' };
  var RED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function api(q) {
    return fetch(API, { method: 'POST', body: JSON.stringify(q) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, net: true, error: 'Нет связи с сервером' }; });
  }
  function pl(n, a, b, c) { n = Math.abs(n) % 100; var m = n % 10; if (n > 10 && n < 20) return c; if (m > 1 && m < 5) return b; if (m === 1) return a; return c; }

  var CSS = '' +
    '.spk{--spk-a:#00d4ff;--spk-b:#0077ff;--spk-on:#04121b;display:grid;gap:14px;color:inherit}' +
    '.spk-card{position:relative;border:1px solid rgba(127,127,160,.28);background:rgba(127,127,160,.08);border-radius:20px;padding:18px;overflow:hidden}' +
    '.spk-card:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--spk-a),var(--spk-b))}' +
    '.spk h4{margin:0 0 6px;font-size:18px;line-height:1.25}' +
    '.spk p{margin:0 0 10px;opacity:.85;font-size:14.5px;line-height:1.5}' +
    '.spk small{opacity:.7}' +
    '.spk-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.spk-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:0 16px;border-radius:13px;border:1px solid rgba(127,127,160,.35);background:rgba(127,127,160,.12);color:inherit;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer;transition:transform .15s,opacity .2s}' +
    '.spk-btn:active{transform:scale(.97)} .spk-btn:disabled{opacity:.55;cursor:default}' +
    '.spk-btn.pri{background:linear-gradient(135deg,var(--spk-a),var(--spk-b));color:var(--spk-on);border:none}' +
    '.spk-btn.ghost{background:none;border:none;text-decoration:underline;min-height:32px;padding:0 4px;opacity:.8}' +
    '.spk-f{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:6px 0 12px}' +
    '.spk-f label{display:grid;gap:4px;font-size:13px;font-weight:700}' +
    '.spk-f label.w{grid-column:1/-1}' +
    '.spk-f input{width:100%;box-sizing:border-box;font-weight:600;font-size:16px;font-family:inherit;padding:11px 12px;border-radius:12px;border:1px solid rgba(127,127,160,.4);background:rgba(0,0,0,.18);color:inherit}' +
    '.spk-f input:focus{outline:2px solid var(--spk-a);outline-offset:1px}' +
    '.spk-code{font:800 26px ui-monospace,Consolas,monospace;letter-spacing:.18em;padding:8px 14px;border-radius:12px;background:rgba(0,0,0,.25);display:inline-block;margin:4px 0 8px;user-select:all}' +
    '.spk-ok{display:flex;gap:10px;align-items:flex-start;margin:0 0 10px;font-size:13.5px;line-height:1.35;cursor:pointer}' +
    '.spk-ok input{flex-shrink:0;width:20px;height:20px;margin:1px 0 0;accent-color:var(--spk-a)}' +
    '.spk-pd{margin:0 0 12px;font-size:13px;line-height:1.45;opacity:.9}' +
    '.spk-pd summary{cursor:pointer;font-weight:700}' +
    '.spk-pd p{margin:6px 0 0}' +
    '.spk-msg{font-size:14px;font-weight:700;min-height:1em;margin:6px 0 0}' +
    '.spk-msg.bad{color:#f87171} .spk-msg.ok{color:#4ade80}' +
    '.spk-me{display:flex;gap:14px;align-items:center;flex-wrap:wrap}' +
    '.spk-ava{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;font-size:26px;background:linear-gradient(135deg,var(--spk-a),var(--spk-b));color:var(--spk-on);font-weight:800;flex:none}' +
    '.spk-stat{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
    '.spk-stat span{font-size:13px;font-weight:700;padding:5px 10px;border-radius:99px;background:rgba(127,127,160,.16)}' +
    '.spk-top ol{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px}' +
    '.spk-top li{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:9px 12px;border-radius:13px;background:rgba(127,127,160,.08);animation:spkIn .45s cubic-bezier(.2,.8,.2,1) both}' +
    '.spk-top li.me{outline:2px solid var(--spk-a);background:rgba(127,127,160,.16)}' +
    '.spk-top li b{font-size:15px} .spk-top li em{font-style:normal;font-weight:800;white-space:nowrap}' +
    '.spk-top .pl{font-weight:800;text-align:center;font-size:15px;opacity:.75}' +
    '.spk-top li:nth-child(1) .pl,.spk-top li:nth-child(2) .pl,.spk-top li:nth-child(3) .pl{font-size:20px;opacity:1}' +
    '.spk-empty{padding:14px;border-radius:13px;background:rgba(127,127,160,.08);font-size:14px;opacity:.85}' +
    '.spk-pulse{display:inline-block;width:9px;height:9px;border-radius:50%;background:#facc15;margin-right:6px;animation:spkP 1.4s infinite}' +
    '@keyframes spkIn{from{opacity:0;transform:translateY(10px)}}' +
    '@keyframes spkP{50%{opacity:.25}}' +
    '@keyframes spkPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.05)}}' +
    '.spk-pop{animation:spkPop .5s cubic-bezier(.2,.8,.2,1)}' +
    '@media (max-width:520px){.spk-f{grid-template-columns:1fr}.spk-card{padding:15px}.spk-code{font-size:22px}}' +
    '@media (prefers-reduced-motion:reduce){.spk *{animation:none !important;transition:none !important}}';

  function Box(el) {
    this.el = el;
    this.club = el.getAttribute('data-spk-club');
    this.key = 'spk_' + this.club;
    this.S = store.get(this.key) || {};
    this.view = '';
    this.top = null; this.me = null; this.rateAt = 0;
    el.classList.add('spk');
    el.innerHTML = '<div class="spk-card spk-mine"></div><div class="spk-card spk-top"></div>';
    this.mine = el.querySelector('.spk-mine');
    this.topEl = el.querySelector('.spk-top');
    var self = this;
    this.render();
    this.refresh(true);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) self.refresh(false); }).observe(el);
    }
    setInterval(function () { if (!document.hidden && self.S.status === 'заявка') self.check(); }, 45000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.refresh(false); });
  }

  Box.prototype.save = function () {
    store.set(this.key, this.S.status ? this.S : null);
    try { document.dispatchEvent(new CustomEvent('spk-status', { detail: { club: this.club, status: this.S.status || '' } })); } catch (e) {}
  };

  Box.prototype.progress = function () {
    try { var p = window.SPK_PROGRESS && window.SPK_PROGRESS(this.club); if (p) return p; } catch (e) {}
    return { p: 0, b: 0, l: '' };
  };

  Box.prototype.refresh = function (force) {
    var self = this;
    if (this.S.status === 'заявка') this.check();
    if (!force && Date.now() - this.rateAt < 60000) return;
    this.rateAt = Date.now();
    if (this.S.code) this.sync(true); else this.loadRate();
  };

  Box.prototype.loadRate = function () {
    var self = this;
    api({ op: 'srate', club: this.club, code: this.S.code || '' }).then(function (j) {
      if (!j.ok) { if (!self.top) self.topEl.innerHTML = '<h4>🏆 Рейтинг ' + esc(NAMES[self.club] || '') + '</h4><div class="spk-empty">' + esc(j.error || 'Рейтинг пока недоступен') + '</div>'; return; }
      self.top = j.top || []; self.me = j.me || null;
      self.renderTop();
      if (self.view === 'in') self.render();
    });
  };

  Box.prototype.check = function () {
    var self = this;
    if (!this.S.id) return;
    api({ op: 'sstatus', id: this.S.id }).then(function (j) {
      if (!j.ok || j.status === self.S.status) return;
      if (j.status === 'нет') { self.S = {}; self.save(); self.render(); return; }
      self.S.status = j.status;
      if (j.status === 'принят') { self.S.code = j.code; self.S.fresh = 1; }
      self.save(); self.render(); self.rateAt = 0; self.refresh(true);
    });
  };

  Box.prototype.sync = function (now) {
    var self = this;
    if (!this.S.code) return;
    clearTimeout(this._t);
    this._t = setTimeout(function () {
      var p = self.progress();
      api({ op: 'ssync', code: self.S.code, club: self.club, pts: p.p, b: p.b, l: p.l, t: p.t, e: self.S.e || 0 }).then(function (j) {
        if (j.gone) { self.S = {}; self.save(); self.render(); return; }
        if (j.retry) { self._t = setTimeout(function () { self.sync(true); }, 9000); return; }
        if (j.reset) {   // педагог обнулил результаты: стираем их и на этом устройстве, потом присылаем заново
          try { if (window.SPK_RESET) window.SPK_RESET(self.club); } catch (e) {}
          self.S.e = j.reset; self.save();
          self.me = Object.assign(self.me || {}, { pts: j.pts, site: j.site, teacher: j.teacher });
          if (self.view === 'in') self.render();
          self.sync(true); return;
        }
        if (!j.ok) { self.loadRate(); return; }
        if (j.ok) {
          self.S.first = j.first; self.S.cls = j.cls; self.save();
          self.me = Object.assign(self.me || {}, { pts: j.pts, site: j.site, teacher: j.teacher });
          if (self.view === 'in') self.render();
          self.loadRate();
        }
      });
    }, now ? 0 : 3000);
  };

  Box.prototype.render = function () {
    var S = this.S, self = this, h = '';
    var club = esc(NAMES[this.club] || ''), to = esc(TO[this.club] || ''), max = MAX[this.club];
    var hasPut = !!document.querySelector('[data-t="put"]');
    if (S.status === 'принят') {
      this.view = 'in';
      var me = this.me || {}, pts = me.pts != null ? me.pts : '...';
      h = '<div class="spk-me' + (S.fresh ? ' spk-pop' : '') + '"><div class="spk-ava">' + esc((S.first || '?').charAt(0)) + '</div><div>' +
        '<h4>' + (S.fresh ? '🎉 Добро пожаловать в группу! ' : '') + esc(S.first) + ', ' + esc(S.cls) + '</h4>' +
        '<div class="spk-stat"><span>⭐ ' + pts + ' ' + pl(+pts || 0, 'очко', 'очка', 'очков') + '</span>' +
        (me.rank ? '<span>🏆 место ' + me.rank + '</span>' : '') +
        (me.teacher ? '<span>📝 задания: ' + me.teacher + '</span>' : '') + '</div></div></div>' +
        '<p style="margin-top:12px">Ты в группе ' + club + '. Тесты, тренировки и значки теперь сами попадают в рейтинг, очки за задания педагога тоже.</p>' +
        ((hasPut || max) ? '<div class="spk-row" style="margin-bottom:12px">' + (hasPut ? '<button class="spk-btn pri" data-a="put">🧭 Путь новичка</button>' : '') +
          (max ? '<a class="spk-btn" href="' + max + '" target="_blank" rel="noopener">💬 Группа в MAX</a>' : '') + '</div>' : '') +
        '<p>Твой личный код - запиши его, чтобы войти с другого телефона:</p><div class="spk-code">' + esc(S.code) + '</div>' +
        '<div class="spk-row"><button class="spk-btn ghost" data-a="out">Выйти на этом устройстве</button></div>';
      if (S.fresh) { delete S.fresh; this.save(); }
    } else if (S.status === 'заявка') {
      this.view = 'wait';
      h = '<h4><span class="spk-pulse"></span>Почти готово!</h4>' +
        '<p>' + esc(S.first) + ', ' + esc(S.cls) + ' - педагог скоро подтвердит, и ты в группе. Тогда здесь появится твой личный код' + (hasPut ? ', а путь новичка начнёт считать очки' : '') + '.</p>' +
        (max ? '<p>А пока можно вступить в группу в MAX - там новости и расписание.</p><div class="spk-row" style="margin-bottom:8px"><a class="spk-btn" href="' + max + '" target="_blank" rel="noopener">💬 Группа в MAX</a></div>' : '') +
        '<div class="spk-row"><button class="spk-btn pri" data-a="check">↻ Проверить</button><button class="spk-btn ghost" data-a="code">У меня уже есть код</button><button class="spk-btn ghost" data-a="cancel">Отменить</button></div><div class="spk-msg"></div>';
    } else if (S.status === 'отклонён') {
      this.view = 'no';
      h = '<h4>Подключение не подтвердили</h4><p>Проверь, правильно ли указаны имя и класс, и отправь ещё раз. Если не получается - спроси на занятии.</p>' +
        '<div class="spk-row"><button class="spk-btn pri" data-a="form">Отправить заново</button><button class="spk-btn ghost" data-a="cancel">Закрыть</button></div>';
    } else if (this.view === 'form') {
      h = '<h4>Подключение к ' + to + '</h4>' +
        '<p>Нужны только имя и класс - фамилию не пиши.</p>' +
        '<div class="spk-f"><label>Имя<input name="first" autocomplete="given-name" maxlength="30"></label>' +
        '<label>Класс<input name="cls" placeholder="например 7Б" maxlength="4" autocapitalize="characters"></label></div>' +
        '<label class="spk-ok"><input type="checkbox" name="pd1"><span>Согласен(на) на обработку имени и класса для занятий и рейтинга ' + club + '. Если мне меньше 14 лет, согласие дал мой родитель.</span></label>' +
        '<label class="spk-ok"><input type="checkbox" name="pd2"><span>Согласен(на), чтобы мои имя и класс были видны в рейтинге на сайте.</span></label>' +
        '<details class="spk-pd"><summary>Как используются данные</summary>' +
        '<p>Данные получает ресурсный центр СПЕКТР, чтобы записать тебя в группу, вести рейтинг кружка и выдать личный код. Публично видны только имя и класс. Данные не передаются другим людям и сайтам.</p>' +
        '<p>Хранятся, пока ты занимаешься в кружке. Чтобы удалить данные и отозвать согласие, скажи педагогу - запись удалят в течение 30 дней.</p></details>' +
        '<div class="spk-row"><button class="spk-btn pri" data-a="send">👋 Подключиться</button><button class="spk-btn ghost" data-a="back">Отмена</button></div><div class="spk-msg"></div>';
    } else if (this.view === 'code') {
      h = '<h4>Вход по личному коду</h4><p>Код выдаётся, когда педагог подтвердит подключение. Он одинаковый на всех твоих устройствах.</p>' +
        '<div class="spk-f"><label class="w">Код<input name="code" maxlength="8" autocapitalize="characters" autocomplete="off" style="letter-spacing:.15em;text-transform:uppercase"></label></div>' +
        '<div class="spk-row"><button class="spk-btn pri" data-a="join">Войти</button><button class="spk-btn ghost" data-a="back">Отмена</button></div><div class="spk-msg"></div>';
    } else {
      this.view = 'none';
      h = '<h4>👋 Подключайся к ' + to + '</h4>' +
        '<p>Впиши имя и класс - педагог подтвердит, и ты в группе.' + (hasPut ? ' Дальше тебя ждёт путь новичка: короткие модули, тренировки и тесты, а очки сами пойдут в твой счёт.' : ' После этого твои очки будут попадать в общий рейтинг.') + '</p>' +
        '<div class="spk-row"><button class="spk-btn pri" data-a="form">👋 Подключиться</button><button class="spk-btn ghost" data-a="code">У меня уже есть код</button></div>';
    }
    this.mine.innerHTML = h;
    var inp = this.mine.querySelector('input'); if (inp && !this._nofocus && matchMedia('(hover:hover)').matches) inp.focus();
    this.mine.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { self.act(b.dataset.a, b); }; });
    this.mine.querySelectorAll('input').forEach(function (i) { i.onkeydown = function (e) { if (e.key === 'Enter') { var b = self.mine.querySelector('.spk-btn.pri'); if (b) b.click(); } }; });
  };

  Box.prototype.msg = function (t, ok) { var m = this.mine.querySelector('.spk-msg'); if (m) { m.textContent = t; m.className = 'spk-msg ' + (ok ? 'ok' : 'bad'); } };
  Box.prototype.val = function (n) { var i = this.mine.querySelector('input[name="' + n + '"]'); return i ? i.value.trim() : ''; };

  Box.prototype.act = function (a, btn) {
    var self = this, S = this.S;
    if (a === 'form' || a === 'code') { if (a === 'form' && S.status === 'отклонён') { this.S = {}; this.save(); } this.view = a; this.render(); return; }
    if (a === 'back') { this.view = ''; this.render(); return; }
    if (a === 'put') { var t = document.querySelector('[data-t="put"]'); if (t) { t.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); } return; }
    if (a === 'cancel') { if (S.status === 'заявка' && !confirm('Отменить подключение на этом устройстве?')) return; this.S = {}; this.save(); this.view = ''; this.render(); return; }
    if (a === 'out') { if (!confirm('Выйти? Чтобы вернуться, понадобится твой код ' + S.code + '.')) return; this.S = {}; this.save(); this.me = null; this.view = ''; this.render(); this.renderTop(); return; }
    if (a === 'check') { btn.disabled = true; this.check(); setTimeout(function () { btn.disabled = false; if (self.view === 'wait') self.msg('Пока ждём подтверждения педагога', true); }, 1500); return; }
    if (a === 'send') {
      var q = { op: 'sapply', club: this.club, first: this.val('first'), cls: this.val('cls') };
      if (q.first.length < 2) return this.msg('Напиши имя');
      if (!/^\d{1,2}\s*[а-яёa-z]?$/i.test(q.cls)) return this.msg('Класс - например 7Б');
      var c1 = this.mine.querySelector('input[name="pd1"]'), c2 = this.mine.querySelector('input[name="pd2"]');
      if (!c1 || !c1.checked || !c2 || !c2.checked) return this.msg('Отметь обе галочки согласия - без них подключить нельзя');
      q.consent = 'pd1,pd2 ' + new Date().toISOString().slice(0, 10);
      btn.disabled = true; btn.textContent = 'Отправляю...';
      api(q).then(function (j) {
        if (!j.ok) { btn.disabled = false; btn.textContent = '👋 Подключиться'; return self.msg(j.error || 'Ошибка'); }
        self.S = { id: j.id, status: j.status, first: j.first, cls: j.cls }; self.save(); self.view = ''; self.render();
      });
      return;
    }
    if (a === 'join') {
      var code = this.val('code').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length < 5) return this.msg('Код - 6 букв и цифр');
      btn.disabled = true; btn.textContent = 'Проверяю...';
      api({ op: 'sjoin', code: code, club: this.club }).then(function (j) {
        if (!j.ok) { btn.disabled = false; btn.textContent = 'Войти'; return self.msg(j.error || 'Ошибка'); }
        self.S = { status: 'принят', code: j.code, first: j.first, cls: j.cls, fresh: 0 }; self.save();
        self.me = { pts: j.pts }; self.view = ''; self.render(); self.rateAt = 0; self.refresh(true);
      });
    }
  };

  Box.prototype.renderTop = function () {
    var T = this.top || [], me = this.me, S = this.S, h = '<h4>🏆 Рейтинг ' + esc(NAMES[this.club] || '') + '</h4>' +
      '<p><small>Очки за тесты, значки и задания. Показаны только имя и класс.</small></p>';
    var medal = ['🥇', '🥈', '🥉'];
    if (!T.length) h += '<div class="spk-empty">Пока в рейтинге никого нет. Стань первым!</div>';
    else {
      h += '<ol>' + T.map(function (r, i) {
        var mine = me && me.rank === i + 1;
        return '<li class="' + (mine ? 'me' : '') + '" style="animation-delay:' + (RED ? 0 : Math.min(i, 12) * 45) + 'ms"><span class="pl">' + (medal[i] || i + 1) + '</span>' +
          '<span><b>' + esc(r.n) + '</b> <small>' + esc(r.c) + (r.l ? ' · ' + esc(r.l) : '') + '</small></span><em>' + r.p + '</em></li>';
      }).join('') + '</ol>';
      if (me && me.rank > T.length) h += '<p style="margin-top:10px"><small>Ты на ' + me.rank + ' месте.</small></p>';
    }
    this.topEl.innerHTML = h;
  };

  var boxes = [];
  window.SPK = {
    sync: function () { boxes.forEach(function (b) { b.sync(false); }); },
    boxes: boxes
  };
  function init() {
    if (!document.getElementById('spk-css')) { var st = document.createElement('style'); st.id = 'spk-css'; st.textContent = CSS; document.head.appendChild(st); }
    document.querySelectorAll('[data-spk-club]').forEach(function (el) { if (!el._spk) { el._spk = 1; boxes.push(new Box(el)); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
