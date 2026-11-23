// =============================================================
// Emergency Medicine Mastery — entry point, router, layout
// =============================================================
import { initStore, streak, get, subscribe } from './core/store.js';
import { $, esc, toast } from './core/util.js';
import { renderPocket } from './pages/pocket.js';
import { dueCount } from './core/srs.js';

const NAV = [
  { group: 'Belajar', items: [
    { href: '#/', ico: '◎', label: 'Dashboard' },
    { href: '#/path', ico: '🧭', label: 'Learning Path' },
    { href: '#/modules/atls', ico: '🩹', label: 'Modul ATLS' },
    { href: '#/modules/acls', ico: '❤️', label: 'Modul ACLS' },
  ]},
  { group: 'Latihan', items: [
    { href: '#/algorithms', ico: '🔀', label: 'Algoritma Interaktif' },
    { href: '#/cases', ico: '🩺', label: 'Simulasi Kasus' },
    { href: '#/quiz', ico: '✅', label: 'Quiz' },
    { href: '#/flashcards', ico: '🗂️', label: 'Flashcards', badge: 'due' },
    { href: '#/tutor', ico: '🤖', label: 'AI Tutor' },
  ]},
  { group: 'Referensi', items: [
    { href: '#/ecg', ico: '📈', label: 'ECG Library' },
    { href: '#/drugs', ico: '💊', label: 'Drug Reference' },
    { href: '#/calculators', ico: '🧮', label: 'Kalkulator' },
    { href: '#/pocket', ico: '⚡', label: 'Pocket Reference' },
    { href: '#/references', ico: '📚', label: 'Sumber & Guideline' },
  ]},
  { group: 'Pribadi', items: [
    { href: '#/notes', ico: '📝', label: 'Catatan & Bookmark' },
    { href: '#/settings', ico: '⚙️', label: 'Pengaturan & Data' },
  ]},
];

const ROUTES = [
  [/^\/$/, 'dashboard'],
  [/^\/path$/, 'path'],
  [/^\/modules(?:\/(atls|acls))?$/, 'modules'],
  [/^\/topic\/([\w-]+)$/, 'topic'],
  [/^\/algorithms(?:\/([\w-]+))?$/, 'algorithms'],
  [/^\/cases(?:\/([\w-]+))?$/, 'cases'],
  [/^\/quiz$/, 'quiz'],
  [/^\/flashcards$/, 'flashcards'],
  [/^\/ecg(?:\/([\w-]+))?$/, 'ecg'],
  [/^\/drugs(?:\/([\w-]+))?$/, 'drugs'],
  [/^\/calculators(?:\/([\w-]+))?$/, 'calculators'],
  [/^\/pocket$/, 'pocketPage'],
  [/^\/tutor$/, 'tutor'],
  [/^\/notes$/, 'notes'],
  [/^\/search$/, 'search'],
  [/^\/settings$/, 'settings'],
  [/^\/references$/, 'references'],
];

function renderSidebar() {
  const cur = location.hash || '#/';
  const due = dueCount();
  $('#sidebar').innerHTML = `
    <div class="brand">
      <img class="brand-logo" src="icons/icon.svg" alt="" width="34" height="34">
      <div><b>EM Mastery</b><small>ATLS & ACLS Learning System</small></div>
    </div>
    ${NAV.map(g => `
      <div class="nav-group"><div class="nav-label">${g.group}</div>
      ${g.items.map(i => {
        const active = i.href === '#/' ? (cur === '#/' || cur === '') : cur.startsWith(i.href);
        const badge = i.badge === 'due' && due ? `<span class="badge primary">${due}</span>` : '';
        return `<a class="nav-link ${active ? 'active' : ''}" href="${i.href}"><span class="ico">${i.ico}</span>${i.label}${badge}</a>`;
      }).join('')}</div>`).join('')}
    <div class="sidebar-foot">Educational tool — bukan pengganti guideline resmi, kursus berinstruktur, atau supervisi klinis.</div>`;
}

function updateBottomNav() {
  const cur = location.hash || '#/';
  document.querySelectorAll('#bottomNav [data-nav]').forEach(a => {
    const keys = a.dataset.nav.split('|');
    a.classList.toggle('active', keys.some(k => k === '#/' ? (cur === '#/' || cur === '') : cur.startsWith(k)));
  });
}

// ---------- Offline (service worker) ----------
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const notify = w => {
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          const t = $('#toast');
          t.innerHTML = 'Versi baru tersedia — <u style="cursor:pointer;pointer-events:auto">muat ulang</u>';
          t.style.pointerEvents = 'auto'; t.classList.add('show');
          t.onclick = () => w.postMessage('skipWaiting');
        } else if (w.state === 'installed') toast('✔ Siap dipakai offline');
      });
    };
    if (reg.installing) notify(reg.installing);
    reg.addEventListener('updatefound', () => notify(reg.installing));
  }).catch(e => console.warn('SW gagal:', e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

// ---------- Cegah zoom (pinch & double-tap) ----------
function lockZoom() {
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let last = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - last < 300 && !e.target.closest('input, textarea, select')) e.preventDefault();
    last = now;
  }, { passive: false });
}

function updateStreak() { $('#streakPill').textContent = `🔥 ${streak()}`; }

let cleanup = null;
async function route() {
  const hash = location.hash.slice(1) || '/';
  const [path, qs] = hash.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  let page = null, params = [];
  for (const [re, name] of ROUTES) {
    const m = path.match(re);
    if (m) { page = name; params = m.slice(1); break; }
  }
  document.body.classList.remove('nav-open');
  renderSidebar();
  updateBottomNav();
  if (typeof cleanup === 'function') { try { cleanup(); } catch {} }
  cleanup = null;
  const view = $('#view');
  if (!page) { view.innerHTML = `<div class="empty"><h2>Halaman tidak ditemukan</h2><a class="btn" href="#/">Kembali ke Dashboard</a></div>`; return; }
  try {
    const mod = await import(`./pages/${page === 'pocketPage' ? 'pocket' : page}.js`);
    view.innerHTML = '';
    cleanup = await (page === 'pocketPage' ? mod.renderPage(view) : mod.render(view, params, query));
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card"><h2>Terjadi kesalahan</h2><pre class="small">${esc(e.stack || e.message)}</pre></div>`;
  }
}

// ---------- Tema ----------
function applyTheme(t) {
  if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('em-theme', t); } catch {}
}
function cycleTheme() {
  let t = 'system'; try { t = localStorage.getItem('em-theme') || 'system'; } catch {}
  const next = { system: 'light', light: 'dark', dark: 'system' }[t];
  applyTheme(next);
  toast(`Tema: ${{ system: 'ikuti sistem', light: 'terang', dark: 'gelap' }[next]}`);
}

// ---------- Pocket drawer ----------
function togglePocket(force) {
  const d = $('#pocketDrawer');
  const open = force ?? !d.classList.contains('open');
  if (open && !d.dataset.ready) { renderPocket(d, true); d.dataset.ready = '1'; }
  d.classList.toggle('open', open);
  d.setAttribute('aria-hidden', String(!open));
}

async function boot() {
  await initStore();
  updateStreak();
  subscribe(k => { if (k === 'activity' || k === '*') updateStreak(); if (k === 'srs' || k === '*') renderSidebar(); });

  registerSW();
  lockZoom();
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) document.body.classList.add('standalone');
  $('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
  $('#moreBtn').onclick = () => document.body.classList.toggle('nav-open');
  $('#scrim').onclick = () => document.body.classList.remove('nav-open');
  $('#themeBtn').onclick = cycleTheme;
  $('#pocketBtn').onclick = () => togglePocket();
  $('#pocketDrawer').addEventListener('click', e => { if (e.target.closest('[data-close-drawer]')) togglePocket(false); });
  $('#globalSearch').onsubmit = e => {
    e.preventDefault();
    const q = $('#globalSearchInput').value.trim();
    if (q) location.hash = `#/search?q=${encodeURIComponent(q)}`;
  };
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (e.key === 'Escape') { togglePocket(false); document.body.classList.remove('nav-open'); }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); $('#globalSearchInput').focus(); }
    if (e.key === 'p' || e.key === 'P') togglePocket();
  });
  window.addEventListener('hashchange', route);
  route();
}
boot();
