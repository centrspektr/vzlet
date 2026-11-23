/* Взлёт, 23.11.2026: поведение минималистичной шапки (вариант A). Свой файл клуба.
   Меню разделов и шестерёнка, язычок "Спектр", строка выбора площадки, плашка "Бета" внизу, появление блоков. */
(function () {
  'use strict';
  var D = document, $ = function (id) { return D.getElementById(id); };
  var RED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- меню разделов и шестерёнка ---------- */
  var pops = [['mnMenuBtn', 'mnMenu'], ['mnGearBtn', 'mnGear']];
  function closeAll(except) {
    pops.forEach(function (p) { var b = $(p[0]), m = $(p[1]); if (!b || !m || m === except) return; m.hidden = true; b.setAttribute('aria-expanded', 'false'); });
  }
  function rows(m) { [].slice.call(m.querySelectorAll('.mn-row')).filter(function (r) { return r.offsetParent !== null; }).forEach(function (r, i) { r.style.setProperty('--k', i); }); }
  pops.forEach(function (p) {
    var b = $(p[0]), m = $(p[1]); if (!b || !m) return;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = m.hidden; closeAll(m);
      if (open && p[1] === 'mnMenu') fillMenu();
      m.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) rows(m);
    });
    m.addEventListener('click', function (e) { if (e.target.closest('.mn-row')) closeAll(); else e.stopPropagation(); });
  });
  D.addEventListener('click', function () { closeAll(); });
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  /* разделы берём из прежних вкладок: они скрыты, но работают как раньше (замочки, права тренера) */
  function fillMenu() {
    var box = $('mnMenuList'); if (!box) return; box.textContent = '';
    [].slice.call(D.querySelectorAll('#vt button[data-t]')).forEach(function (t) {
      if (t.dataset.t === 'komandy' || t.hidden || t.style.display === 'none') return;   /* команды теперь в блоке "Рейтинг пилотов" */
      var r = D.createElement('button'); r.type = 'button';
      r.className = 'mn-row' + (t.classList.contains('on') ? ' on' : '') + (t.classList.contains('zk') ? ' zk' : '');
      r.textContent = (t.querySelector('b') || t).textContent.trim();
      if (t.classList.contains('zk')) { var s = D.createElement('small'); s.textContent = 'скоро'; r.appendChild(s); }
      r.addEventListener('click', function () { t.click(); scrollTo({ top: 0, behavior: RED ? 'auto' : 'smooth' }); });
      box.appendChild(r);
    });
  }

  /* ---------- язычок "Спектр" сбоку: первое касание выдвигает, второе - переходит ---------- */
  var ts = $('toSchool'), tsT = null;
  if (ts) {
    ts.addEventListener('click', function (e) {
      if (matchMedia('(hover:hover)').matches || ts.classList.contains('out')) return;
      e.preventDefault(); ts.classList.add('out');
      clearTimeout(tsT); tsT = setTimeout(function () { ts.classList.remove('out'); }, 4000);
    });
    D.addEventListener('click', function (e) { if (!ts.contains(e.target)) ts.classList.remove('out'); });
  }

  /* ---------- выбор площадки: строка слов вместо списка ---------- */
  var bar = $('selBar');
  function short(t) {
    t = String(t).replace(/^[^A-Za-zА-Яа-яЁё]+/, '').replace(/^Моя площадка:\s*/, '').replace(/^Другое:\s*/, '');
    return /^Общий/.test(t) ? 'Все площадки' : t;
  }
  function selRow() {
    if (!bar) return; var sel = bar.querySelector('select'); if (!sel || bar.querySelector('.mn-sel')) return;
    var row = D.createElement('div'); row.className = 'mn-sel'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Площадка');
    [].slice.call(sel.options).forEach(function (o) {
      var b = D.createElement('button'); b.type = 'button'; b.textContent = short(o.textContent);
      if (o.selected) { b.className = 'on'; b.setAttribute('aria-pressed', 'true'); }
      b.addEventListener('click', function () { if (o.selected) return; sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); });
      row.appendChild(b);
    });
    bar.insertBefore(row, bar.firstChild); bar.classList.add('mn-on');
  }
  if (bar) { new MutationObserver(selRow).observe(bar, { childList: true }); selRow(); }

  /* ---------- плашка "Бета" - в самый низ ---------- */
  function betaDown() {
    var b = $('pnBeta'), f = $('footer') || D.querySelector('footer'); if (!b) return false;
    b.classList.remove('o');
    if (f && f.parentNode) f.parentNode.insertBefore(b, f); else D.body.appendChild(b);
    return true;
  }
  if (!betaDown()) { var n = 0, iv = setInterval(function () { if (betaDown() || ++n > 40) clearInterval(iv); }, 250); }

  /* ---------- блоки проявляются по мере прокрутки ---------- */
  if (!RED && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (e) { if (!e.isIntersecting) return; e.target.style.setProperty('--d', k++); e.target.classList.add('mn-in'); io.unobserve(e.target);
        setTimeout(function () { e.target.classList.remove('mn-rv', 'mn-in'); e.target.style.removeProperty('--d'); }, 1800); });
    }, { rootMargin: '0px 0px -6% 0px' });
    /* только то, что ниже экрана: видимое не трогаем, чтобы ничего не мигало */
    var arm = function () {
      [].slice.call(D.querySelectorAll('#t-club>.card,#t-club .pult>.card,#t-club>.grid>.card,#t-club>details.card')).forEach(function (el) {
        if (el.dataset.mnRv) return; el.dataset.mnRv = '1';
        if (el.getBoundingClientRect().top < innerHeight) return;
        el.classList.add('mn-rv'); io.observe(el);
      });
    };
    setTimeout(arm, 3200);
  }
})();
