// Interactive algorithm runner + peta algoritma lengkap.
import { esc, fmt, $ } from '../core/util.js';
import { ALGORITHMS, ALGO_MAP } from '../data/algorithms.js';
import { TOPIC_MAP } from '../data/index.js';
import { logActivity, toggleBookmark, isBookmarked } from '../core/store.js';

const TYPE_LABEL = { question: 'Keputusan', action: 'Tindakan', danger: 'Tindakan kritis', end: 'Akhir / disposisi' };
const ICON = { question: '❓', action: '🛠️', danger: '⚡', end: '🏁' };

export function render(el, [id]) {
  if (id && ALGO_MAP[id]) return run(el, ALGO_MAP[id]);
  el.innerHTML = `
  <div class="page-head"><div><h1>Algoritma Interaktif</h1><p>Pilih kondisi pasien, lalu ikuti langkah penanganan satu per satu. Setiap cabang menyesuaikan dengan pilihan Anda.</p></div></div>
  ${['acls', 'atls'].map(m => `
    <h2 class="mt">${m.toUpperCase()}</h2>
    <div class="grid gauto">${ALGORITHMS.filter(a => a.module === m).map(a => `
      <a class="card card-link" href="#/algorithms/${a.id}"><div class="row between"><span class="badge ${a.module}">${a.module.toUpperCase()}</span><span class="xs muted">${esc(a.ref)}</span></div>
      <h3 style="margin:8px 0 4px">${esc(a.title)}</h3><p class="small muted">${esc(a.desc)}</p><span class="xs muted">${Object.keys(a.nodes).length} node</span></a>`).join('')}</div>`).join('')}`;
}

function run(el, a) {
  let cur = a.start; const trail = [];
  const draw = () => {
    const n = a.nodes[cur];
    const nextBtn = !n.options && n.next ? `<button class="btn primary" id="go">Lanjut →</button>` : '';
    el.innerHTML = `
    <div class="row between mb"><a class="small" href="#/algorithms">← Semua algoritma</a><span class="xs muted">${esc(a.ref)}</span></div>
    <div class="page-head"><div><h1>${esc(a.title)}</h1><p>${esc(a.desc)}</p></div>
      <div class="row"><button class="btn" id="bm">${isBookmarked('algo', a.id) ? '★ Tersimpan' : '☆ Bookmark'}</button>${a.topic ? `<a class="btn" href="#/topic/${a.topic}">📘 Materi</a>` : ''}</div></div>
    <div class="grid" style="grid-template-columns:minmax(0,1fr) 280px;align-items:start" id="algoGrid">
      <div>
        <div class="algo-trail">${trail.map(t => `<span>${esc(t.title)}${t.choice ? ' → <b>' + esc(t.choice) + '</b>' : ''}</span>`).join('') || '<span>Mulai</span>'}</div>
        <div class="algo-node ${n.type}">
          <div class="row between"><span class="badge ${n.type === 'danger' ? 'bad' : n.type === 'question' ? 'warn' : n.type === 'end' ? 'ok' : 'info'}">${ICON[n.type]} ${TYPE_LABEL[n.type]}</span><span class="xs muted">Langkah ${trail.length + 1}</span></div>
          <h2 style="margin-top:10px">${fmt(n.title)}</h2>
          ${n.text ? `<p>${fmt(n.text)}</p>` : ''}
          ${n.bullets ? `<ul>${n.bullets.map(b => `<li>${fmt(b)}</li>`).join('')}</ul>` : ''}
          ${n.link ? `<a class="btn sm" href="${n.link}">Buka algoritma terkait →</a>` : ''}
          ${n.options ? `<div class="algo-opts">${n.options.map((o, k) => `<button class="btn" data-k="${k}" style="justify-content:center;padding:12px">${esc(o.label)}</button>`).join('')}</div>` : ''}
          <div class="row mt">${nextBtn}${trail.length ? '<button class="btn ghost" id="back">↶ Kembali</button>' : ''}<button class="btn ghost" id="reset">⟲ Ulang dari awal</button></div>
        </div>
        ${n.type === 'end' ? `<div class="callout green mt">Algoritma selesai. Re-evaluasi pasien secara berkala dan kembali ke langkah awal bila kondisi memburuk.</div>` : ''}
      </div>
      <div class="card algo-map"><div class="xs muted mb">Peta node</div><ol>${Object.entries(a.nodes).map(([k, v]) => `<li class="${k === cur ? 'cur' : ''}">${ICON[v.type]} ${esc(v.title)}</li>`).join('')}</ol></div>
    </div>`;
    if (window.innerWidth < 860) $('#algoGrid', el).style.gridTemplateColumns = 'minmax(0,1fr)';
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const o = n.options[+b.dataset.k]; trail.push({ id: cur, title: n.title, choice: o.label }); cur = o.next; logActivity(0); draw(); });
    $('#go', el) && ($('#go', el).onclick = () => { trail.push({ id: cur, title: n.title }); cur = n.next; draw(); });
    $('#back', el) && ($('#back', el).onclick = () => { const t = trail.pop(); cur = t.id; draw(); });
    $('#reset', el).onclick = () => { trail.length = 0; cur = a.start; draw(); };
    $('#bm', el).onclick = () => { toggleBookmark('algo', a.id, a.title, '#/algorithms/' + a.id); draw(); };
    if (n.type === 'end' && !trail.done) { logActivity(1); trail.done = true; }
  };
  draw();
}
