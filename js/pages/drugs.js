import { esc, fmt, $ } from '../core/util.js';
import { DRUGS, DRUG_MAP } from '../data/drugs.js';
import { REFS } from '../data/references.js';
import { toggleBookmark, isBookmarked } from '../core/store.js';

export function render(el, [id], query) {
  if (id && DRUG_MAP[id]) return detail(el, DRUG_MAP[id]);
  let filter = query.m || 'all', q = '';
  const draw = () => {
    const list = DRUGS.filter(d => (filter === 'all' || d.module.includes(filter)) && (!q || (d.name + d.cls + d.indications.join(' ')).toLowerCase().includes(q)));
    $('#list', el).innerHTML = list.map(d => `
      <a class="card card-link" href="#/drugs/${d.id}">
        <div class="row between"><b>${esc(d.name)}</b><span>${d.module.map(m => `<span class="badge ${m}">${m.toUpperCase()}</span>`).join(' ')}</span></div>
        <div class="xs muted">${esc(d.cls)}</div>
        <p class="small" style="margin:.5em 0 0">${fmt(d.adult.length > 140 ? d.adult.slice(0, 140) + '…' : d.adult)}</p>
      </a>`).join('') || '<div class="empty">Tidak ditemukan.</div>';
  };
  el.innerHTML = `
  <div class="page-head"><div><h1>Drug Reference</h1><p>${DRUGS.length} obat ATLS & ACLS: indikasi, dosis dewasa/pediatrik, rute, interval, maksimum, kontraindikasi, precautions, mnemonic.</p></div></div>
  <div class="row mb">
    <input class="input" id="q" placeholder="Filter obat / indikasi…" style="max-width:320px">
    <div class="seg">${[['all', 'Semua'], ['acls', 'ACLS'], ['atls', 'ATLS']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'active' : ''}">${l}</button>`).join('')}</div>
    <a class="btn right" href="#/calculators/dose">🧮 Kalkulator dosis</a>
  </div>
  <div class="grid gauto" id="list"></div>
  <p class="disclaimer mt">Dosis disusun dari AHA 2020/2023/2025, ATLS 10, dan guideline terkait. Cocokkan dengan formularium, sediaan, dan protokol rumah sakit Anda. Tanda ⚠ verifikasi = dosis bervariasi antar-protokol.</p>`;
  $('#q', el).oninput = e => { q = e.target.value.toLowerCase(); draw(); };
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b)); draw(); });
  draw();
}

function detail(el, d) {
  const row = (k, v) => `<tr><th style="width:170px">${k}</th><td>${v}</td></tr>`;
  const ul = a => `<ul style="margin:0">${a.map(x => `<li>${fmt(x)}</li>`).join('')}</ul>`;
  const draw = () => {
    el.innerHTML = `
    <div class="row between mb"><a class="small" href="#/drugs">← Drug reference</a><span>${d.module.map(m => `<span class="badge ${m}">${m.toUpperCase()}</span>`).join(' ')}</span></div>
    <div class="page-head"><div><h1>${esc(d.name)}</h1><p>${esc(d.cls)}</p></div>
      <div class="row"><button class="btn" id="bm">${isBookmarked('drug', d.id) ? '★ Tersimpan' : '☆ Bookmark'}</button>${d.calc ? `<a class="btn primary" href="#/calculators/dose?drug=${d.id}">🧮 Hitung dosis</a>` : ''}</div></div>
    ${d.verify ? `<div class="callout amber mb"><span class="verify">⚠ verifikasi</span> ${esc(d.verify)}</div>` : ''}
    <div class="card tbl-wrap"><table class="tbl"><tbody>
      ${row('Indikasi', ul(d.indications))}
      ${row('Dosis dewasa', fmt(d.adult))}
      ${row('Dosis pediatrik', fmt(d.peds))}
      ${row('Rute', esc(d.route))}
      ${row('Interval', esc(d.interval))}
      ${row('Dosis maksimum', esc(d.max))}
      ${row('Kontraindikasi', ul(d.contra))}
      ${row('Precautions', ul(d.precautions))}
    </tbody></table></div>
    <div class="callout blue mt"><b>🧠 Mnemonic:</b> ${fmt(d.mnemonic)}</div>
    <div class="card mt small"><b>Referensi:</b><ul>${d.refs.map(r => REFS[r] ? `<li>${esc(REFS[r].text)}</li>` : '').join('')}</ul></div>`;
    $('#bm', el).onclick = () => { toggleBookmark('drug', d.id, d.name, '#/drugs/' + d.id); draw(); };
  };
  draw();
}
