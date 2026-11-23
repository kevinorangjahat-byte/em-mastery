// =============================================================
// Service worker — membuat aplikasi bisa dipakai OFFLINE.
// Semua file aplikasi di-cache saat pertama dibuka. Setelah itu
// aplikasi berjalan dari cache walau server/laptop mati.
// Saat mengubah file aplikasi, NAIKKAN nomor VERSION agar HP
// mengambil versi terbaru.
// =============================================================
const VERSION = 'em-mastery-v2';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js',
  'js/core/analytics.js', 'js/core/db.js', 'js/core/srs.js', 'js/core/store.js', 'js/core/util.js',
  'js/data/algorithms.js', 'js/data/cases.js', 'js/data/drugs.js', 'js/data/ecg.js', 'js/data/index.js',
  'js/data/quiz.js', 'js/data/references.js', 'js/data/topics-acls-1.js', 'js/data/topics-acls-2.js',
  'js/data/topics-atls-1.js', 'js/data/topics-atls-2.js', 'js/data/topics-atls-3.js',
  'js/lib/ai.js', 'js/lib/ecg.js', 'js/lib/search.js',
  'js/pages/algorithms.js', 'js/pages/calculators.js', 'js/pages/cases.js', 'js/pages/dashboard.js',
  'js/pages/drugs.js', 'js/pages/ecg.js', 'js/pages/flashcards.js', 'js/pages/modules.js', 'js/pages/notes.js',
  'js/pages/path.js', 'js/pages/pocket.js', 'js/pages/quiz.js', 'js/pages/references.js', 'js/pages/search.js',
  'js/pages/settings.js', 'js/pages/topic.js', 'js/pages/tutor.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS.map(a => new Request(a, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // API Anthropic tidak pernah di-cache
  if (url.hostname.endsWith('anthropic.com')) return;
  // Halaman → selalu index.html dari cache (routing memakai hash)
  if (req.mode === 'navigate' && url.origin === location.origin) {
    e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    return;
  }
  // File aplikasi: cache dulu, lalu jaringan (dan simpan)
  e.respondWith(
    caches.match(req, { ignoreSearch: url.origin === location.origin }).then(hit => hit || fetch(req).then(res => {
      if (res.ok && (url.origin === location.origin || url.hostname === 'esm.sh')) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
