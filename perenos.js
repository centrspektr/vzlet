/* Клуб Взлёт: приём памяти браузера со старого адреса (centrspektr.github.io/vzlet/).
   Страница-переход на старом адресе кладёт в адрес #perenos=<base64 от UTF-8 JSON {ключ: значение}>.
   Здесь записываем в localStorage только ключи spk_*, vz_*, vzlet_*, put_*, irtysh_*, которых на новом адресе ещё нет
   (новое старым не затираем), и убираем #perenos из адреса.
   Подключать в <head> до остальных скриптов страницы, без defer: тогда вход ученика и тренера
   рисуется уже с перенесёнными ключами. */
(function () {
  var m = /(?:^#|&)perenos=([^&]*)/.exec(location.hash);
  if (!m) return;
  try {
    var b64 = decodeURIComponent(m[1]).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var data = JSON.parse(new TextDecoder().decode(bytes));
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(function (k) {
        if (!/^(spk_|vz_|vzlet_|put_|irtysh_)/.test(k) || typeof data[k] !== 'string') return;
        try { if (localStorage.getItem(k) === null) localStorage.setItem(k, data[k]); } catch (e) {}
      });
    }
  } catch (e) {}
  var rest = location.hash.slice(1).split('&').filter(function (p) { return p.indexOf('perenos=') !== 0; }).join('&');
  try { history.replaceState(null, '', location.pathname + location.search + (rest ? '#' + rest : '')); } catch (e) {}
})();
