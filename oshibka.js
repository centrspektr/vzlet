/* СПЕКТР: кнопка "⚠ Сообщить об ошибке" для обучающих дашбордов.
   Подключение: <script src="oshibka.js" data-site="vzlet" defer></script>  (vzlet | studio | agro)
   Сообщение уходит в общий скрипт (лист "Ошибки"), список видно на портале по PIN (кнопка ⚠). */
(function () {
  if (window.SPK_BUG) return; window.SPK_BUG = 1;
  var API = 'https://functions.yandexcloud.net/d4e4vhndceg7scc0mh3b';
  var me = document.currentScript, SITE = (me && me.dataset.site) || '';
  if (!SITE) { var p = location.pathname; SITE = /vzlet/.test(p) ? 'vzlet' : /studio/.test(p) ? 'studio' : /agro/.test(p) ? 'agro' : 'portal'; }
  var NAMES = { portal: 'Портал', vzlet: 'Взлёт', studio: 'Гитара и ИИ-студия', agro: 'Агрокласс' };
  var KINDS = [['🚫', 'Не открывается'], ['✖️', 'Не засчитался ответ'], ['💫', 'Пропали очки'], ['👆', 'Не работает кнопка'], ['✏️', 'Ошибка в тексте'], ['💬', 'Другое']];

  function dev() {
    var u = navigator.userAgent, os = '', br = '', m;
    if ((m = u.match(/Android ([\d.]+)/))) os = 'Android ' + m[1].split('.')[0];
    else if ((m = u.match(/(iPhone|iPad).*OS (\d+)/))) os = m[1] + ' iOS ' + m[2];
    else if (/Windows/.test(u)) os = 'Windows'; else if (/Mac OS X/.test(u)) os = 'Mac'; else if (/Linux/.test(u)) os = 'Linux';
    br = /YaBrowser|YaApp|YaSearch/.test(u) ? 'Яндекс' : /SamsungBrowser/.test(u) ? 'Samsung' : /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Firefox|FxiOS/.test(u) ? 'Firefox' : /CriOS|Chrome\//.test(u) ? 'Chrome' : /Safari/.test(u) ? 'Safari' : 'браузер';
    if (/; wv\)|MAX|VKClient|Telegram/.test(u)) br += ' (в приложении)';
    return (os || 'устройство') + ' · ' + br + ' · ' + innerWidth + 'px';
  }
  function page() {
    var h = (location.hash || '').slice(1, 40), t = '';
    var on = document.querySelector('[aria-selected="true"], .tbt .on, .tabs .on, nav .on, .tab.on');
    if (on) t = (on.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    return [t, h ? '#' + h : ''].filter(Boolean).join(' ') || 'главная';
  }

  var css = '.spkbug{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9000;display:flex;align-items:center;gap:8px;padding:5px 5px 5px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(20,14,36,.8);color:#e9e4ff;font:700 12px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 8px 22px -8px rgba(0,0,0,.6);transition:transform .25s,box-shadow .25s;-webkit-tap-highlight-color:transparent;animation:spkbugIn .6s .8s cubic-bezier(.2,1.4,.4,1) both}'
    + '.spkbug b{padding:5px 11px;border-radius:999px;background:linear-gradient(110deg,#f59e0b,#ec4899);color:#fff;font-weight:800;font-size:12px;letter-spacing:.2px}'
    + '.spkbug:hover{transform:translateY(-2px);box-shadow:0 10px 26px -8px rgba(0,0,0,.6),0 0 0 4px rgba(255,190,60,.18)}'
    + '@keyframes spkbugIn{from{opacity:0;transform:translateY(20px) scale(.7)}}'
    + '.spkbm{position:fixed;inset:0;z-index:9001;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:rgba(6,3,16,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .25s}.spkbm.on{opacity:1}'
    + '@media(min-width:600px){.spkbm{align-items:center}}'
    + '.spkbm .bx{width:min(460px,100%);max-height:calc(100vh - 24px);overflow:auto;padding:20px 18px 16px;border-radius:24px;background:linear-gradient(160deg,#211a3d,#120d24);border:1px solid rgba(255,255,255,.12);color:#f1edff;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 30px 80px -20px rgba(0,0,0,.8);transform:translateY(30px) scale(.97);transition:transform .35s cubic-bezier(.2,1.3,.4,1)}.spkbm.on .bx{transform:none}'
    + '.spkbm h3{margin:0 0 4px;font:800 19px system-ui,sans-serif}.spkbm p{margin:0 0 12px;color:#b9b0d6;font-size:14px}'
    + '.spkbm .kd{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px}'
    + '.spkbm .kd button{display:flex;align-items:center;gap:7px;padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:inherit;font:700 13.5px system-ui,sans-serif;text-align:left;cursor:pointer;transition:background .2s,border-color .2s,transform .2s}'
    + '.spkbm .kd button.on{background:rgba(255,190,60,.18);border-color:#ffc23c;transform:scale(1.02)}'
    + '.spkbm textarea{width:100%;box-sizing:border-box;min-height:92px;resize:vertical;padding:11px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:#fff;font:15px/1.4 system-ui,sans-serif;outline:none}.spkbm textarea:focus{border-color:#ffc23c}'
    + '.spkbm .nt{margin:8px 0 14px;font-size:12.5px;color:#9d94bd}.spkbm .nt b{color:#d9d2f5;font-weight:700}'
    + '.spkbm .br{display:flex;gap:8px;justify-content:flex-end}.spkbm .br button{height:44px;padding:0 18px;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font:800 14.5px system-ui,sans-serif;cursor:pointer}'
    + '.spkbm .br .go{border:none;background:linear-gradient(110deg,#f59e0b,#ec4899);min-width:150px}.spkbm .br .go:disabled{opacity:.6}'
    + '.spkbm .ok{text-align:center;padding:20px 6px 8px}.spkbm .ok i{display:block;font-style:normal;font-size:46px;animation:spkbugIn .6s cubic-bezier(.2,1.6,.4,1)}'
    + '.spkbm .er{color:#fca5a5;font-size:13.5px;margin:-6px 0 10px;min-height:1px}'
    + '@media (prefers-reduced-motion: reduce){.spkbug,.spkbm .bx,.spkbm .ok i{animation:none!important;transition:none!important}}';

  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sentRecently() { try { var a = JSON.parse(localStorage.getItem('spk_bug_t') || '[]'), n = Date.now(); a = a.filter(function (t) { return n - t < 36e5; }); return a; } catch (e) { return []; } }

  function open() {
    var kind = '', m = el('div', 'spkbm'), d = page(), dv = dev();
    m.innerHTML = '<div class="bx" role="dialog" aria-modal="true" aria-label="Сообщить об ошибке"><h3>⚠ Сообщить об ошибке</h3><p>Что-то работает не так? Расскажи - мы проверим и исправим.</p>'
      + '<div class="kd">' + KINDS.map(function (k) { return '<button type="button" data-k="' + k[1] + '"><span>' + k[0] + '</span>' + k[1] + '</button>'; }).join('') + '</div>'
      + '<textarea maxlength="600" placeholder="Что именно случилось? Например: нажал &quot;Проверить&quot;, а очки не добавились"></textarea>'
      + '<div class="nt">Не пиши фамилию и телефон. Сами добавятся: <b>' + esc(NAMES[SITE] + ' · ' + d) + '</b> и <b>' + esc(dv) + '</b></div>'
      + '<div class="er"></div><div class="br"><button type="button" class="cl">Отмена</button><button type="button" class="go">Отправить</button></div></div>';
    document.body.appendChild(m); requestAnimationFrame(function () { m.classList.add('on'); });
    var ta = m.querySelector('textarea'), go = m.querySelector('.go'), er = m.querySelector('.er');
    function close() { m.classList.remove('on'); setTimeout(function () { m.remove(); }, 260); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('.cl').onclick = close;
    [].forEach.call(m.querySelectorAll('.kd button'), function (b) {
      b.onclick = function () { kind = b.dataset.k; [].forEach.call(m.querySelectorAll('.kd button'), function (x) { x.classList.toggle('on', x === b); }); er.textContent = ''; if (kind === 'Другое') ta.focus(); };
    });
    go.onclick = function () {
      var text = ta.value.trim();
      if (!kind) { er.textContent = 'Выбери, что случилось'; return; }
      if (kind === 'Другое' && !text) { er.textContent = 'Напиши пару слов, что не так'; ta.focus(); return; }
      var rec = sentRecently(); if (rec.length >= 5) { er.textContent = 'Ты уже отправил несколько сообщений - спасибо! Попробуй через час.'; return; }
      go.disabled = true; go.textContent = 'Отправляю…'; er.textContent = '';
      fetch(API, { method: 'POST', body: JSON.stringify({ op: 'bugadd', site: SITE, kind: kind, text: text, page: d, dev: dv }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || 'Не получилось отправить');
          try { rec.push(Date.now()); localStorage.setItem('spk_bug_t', JSON.stringify(rec)); } catch (e) {}
          m.querySelector('.bx').innerHTML = '<div class="ok"><i>✅</i><h3>Спасибо!</h3><p>Сообщение отправлено. Мы проверим и исправим.</p></div><div class="br"><button type="button" class="go">Хорошо</button></div>';
          m.querySelector('.go').onclick = close; setTimeout(close, 4000);
        })
        .catch(function (e) { go.disabled = false; go.textContent = 'Отправить'; er.textContent = /fetch|network|Load failed/i.test(e.message) ? 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.' : e.message; });
    };
  }

  function mount() {
    var st = el('style'); st.textContent = css; document.head.appendChild(st);
    var b = el('button', 'spkbug', '<span>Нашёл ошибку?</span><b>Жми</b>');
    b.type = 'button'; b.title = 'Сообщить об ошибке'; b.setAttribute('aria-label', 'Сообщить об ошибке');
    b.onclick = open; document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
