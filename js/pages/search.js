import { esc } from '../core/util.js';
import { search } from '../lib/search.js';

export function render(el, _p, query) {
  const q = query.q || '';
  document.getElementById('globalSearchInput').value = q;
  const res = search(q);
  const terms = q.toLowerCase().split(/\s+/).filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const hl = s => terms.length ? esc(s).replace(new RegExp(`(${terms.join('|')})`, 'gi'), '<mark>$1</mark>') : esc(s);
  const groups = {};
  res.forEach(r => (groups[r.kind] = groups[r.kind] || []).push(r));
  el.innerHTML = `
  <div class="page-head"><div><h1>Hasil pencarian</h1><p>${res.length} hasil untuk "<b>${esc(q)}</b>"</p></div></div>
  ${res.length ? Object.entries(groups).map(([k, items]) => `<h2 class="mt">${k} <span class="badge">${items.length}</span></h2><div class="stack">${items.map(r => `
    <a class="card card-link" href="${r.href}"><div class="row between"><b>${hl(r.title)}</b><span class="badge ${r.badge}">${(r.badge || '').toUpperCase()}</span></div>
    ${r.snippet ? `<div class="small muted" style="margin-top:4px">…${hl(r.snippet)}…</div>` : ''}</a>`).join('')}</div>`).join('')
  : `<div class="empty">Tidak ada hasil. Coba kata kunci lain (mis. "adenosin", "tension", "luka bakar", "VF"). <br><br><a class="btn" href="#/tutor">Tanya AI tutor</a></div>`}`;
}
