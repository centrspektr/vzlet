#!/usr/bin/env bash
# Собирает _site: страница-переход для каждого .html Взлёта (index, new, trener...), 404.html и sw.js.
# Переход ведёт на тот же путь на NEW_SITE, сохраняя ?код и #метку.
# Перед переходом страница берёт из localStorage ключи spk_*, vz_*, vzlet_*, put_*, irtysh_*
# (кроме кэша данных *cache*, он заново скачается с сервера) и кладёт их
# в #perenos=<base64 от UTF-8 JSON>; на новом адресе их принимает perenos.js.
set -euo pipefail
NEW_SITE="${NEW_SITE:-https://centrspektr.gitverse.site}"
mkdir -p _site

page() {
  cat <<HTML
<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Клуб "Взлёт" переехал</title>
<meta name="robots" content="noindex">
<script>
(function () {
  var data = {}, n = 0;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^(spk_|vz_|vzlet_|put_|irtysh_)/.test(k) && !/cache/i.test(k)) { data[k] = localStorage.getItem(k); n++; }
    }
  } catch (e) {}
  var hash = location.hash.replace(/^#/, '');
  if (n) {
    try {
      var bytes = new TextEncoder().encode(JSON.stringify(data)), bin = '';
      for (var j = 0; j < bytes.length; j++) bin += String.fromCharCode(bytes[j]);
      hash = (hash ? hash + '&' : '') + 'perenos=' + encodeURIComponent(btoa(bin));
    } catch (e) {}
  }
  location.replace('$NEW_SITE' + location.pathname + location.search + (hash ? '#' + hash : ''));
})();
</script>
<meta http-equiv="refresh" content="3; url=$NEW_SITE/vzlet/">
<style>body{background:#0d1117;color:#e6edf3;font:16px system-ui,sans-serif;padding:32px 16px;text-align:center}a{color:#00d4ff}</style>
</head><body>
<p>Клуб "Взлёт" переехал на новый адрес.</p>
<p><a href="$NEW_SITE/vzlet/">$NEW_SITE/vzlet/</a></p>
</body></html>
HTML
}

find . -name '*.html' -not -path './.git/*' -not -path './_site/*' | while read -r f; do
  mkdir -p "_site/$(dirname "$f")"
  page > "_site/$f"
done
page > _site/404.html

cat > _site/sw.js <<'JS'
// Снимает старую офлайн-копию Взлёта и отпускает страницы на новый адрес.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
JS
touch _site/.nojekyll
find _site -type f | sort
