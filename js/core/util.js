// Utilitas umum
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Format inline ringan: **tebal**, _miring_, `kode`, dan [[VERIFIKASI]] → badge. Input di-escape dulu. */
export function fmt(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s.,;:)]|$)/g, '$1<i>$2</i>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[\[VERIFIKASI(?::\s*(.+?))?\]\]/g, (_, t) => `<span class="verify" title="${t ? t : 'Perlu verifikasi dengan guideline/protokol terbaru'}">⚠ verifikasi</span>`);
}

/** Markdown minimal untuk jawaban AI tutor (heading, list, bold, code, tabel sederhana). */
export function md(src) {
  const lines = esc(src).split('\n');
  let html = '', inUl = false, inOl = false, inTable = false;
  const close = () => { if (inUl) { html += '</ul>'; inUl = false; } if (inOl) { html += '</ol>'; inOl = false; } if (inTable) { html += '</tbody></table></div>'; inTable = false; } };
  const inline = t => t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/(^|\s)\*(\S.+?)\*(?=\s|$|[.,])/g, '$1<i>$2</i>');
  for (let raw of lines) {
    const l = raw.trimEnd();
    let m;
    if (/^\s*\|.*\|\s*$/.test(l)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) continue;
      const cells = l.trim().slice(1, -1).split('|').map(c => inline(c.trim()));
      if (!inTable) { close(); html += '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>'; inTable = true; }
      else html += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
      continue;
    }
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { close(); html += `<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`; }
    else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (inOl || inTable) close(); if (!inUl) { html += '<ul>'; inUl = true; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (inUl || inTable) close(); if (!inOl) { html += '<ol>'; inOl = true; } html += `<li>${inline(m[1])}</li>`; }
    else if (!l.trim()) { close(); }
    else if (/^---+$/.test(l.trim())) { close(); html += '<hr>'; }
    else { close(); html += `<p>${inline(l)}</p>`; }
  }
  close();
  return html;
}

export function todayKey(d = new Date()) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtRel(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'baru saja';
  if (d < 3600) return `${Math.floor(d / 60)} menit lalu`;
  if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
  return `${Math.floor(d / 86400)} hari lalu`;
}

let toastT;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

export function debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/** PRNG deterministik (untuk daily challenge yang sama sepanjang hari). */
export function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
