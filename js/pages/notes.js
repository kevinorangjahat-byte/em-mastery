import { get, setNote, toggleBookmark } from '../core/store.js';
import { esc, $, fmtRel, toast } from '../core/util.js';

export function render(el) {
  const draw = () => {
    const notes = Object.entries(get('notes')).sort((a, b) => b[1].updated - a[1].updated);
    const bms = get('bookmarks');
    const KIND = { topic: '📘 Topik', drug: '💊 Obat', ecg: '📈 EKG', algo: '🔀 Algoritma' };
    el.innerHTML = `
    <div class="page-head"><div><h1>Catatan & Bookmark</h1><p>Catatan pribadi per topik dan catatan umum, serta materi yang Anda simpan.</p></div></div>
    <div class="grid g2" style="align-items:start">
      <div class="card">
        <h3>📝 Catatan baru</h3>
        <input class="input mb" id="nt" placeholder="Judul (mis. Protokol MTP RS saya)" maxlength="120">
        <textarea class="input" id="nb" placeholder="Isi catatan…"></textarea>
        <button class="btn primary mt" id="add">Simpan catatan</button>
        <h3 class="mt">Semua catatan (${notes.length})</h3>
        ${notes.length ? notes.map(([k, n]) => `<div class="card flat mb" style="padding:12px">
          <div class="row between"><b class="small">${k.startsWith('topic:') ? `<a href="#/topic/${esc(k.slice(6))}">${esc(n.title || k)}</a>` : esc(n.title || 'Catatan')}</b><span class="xs muted">${fmtRel(n.updated)}</span></div>
          <div class="small" style="white-space:pre-wrap;margin-top:6px">${esc(n.text)}</div>
          <button class="btn sm ghost" data-del="${esc(k)}">Hapus</button></div>`).join('') : '<p class="muted small">Belum ada catatan. Catatan topik juga bisa ditulis langsung di bawah setiap materi.</p>'}
      </div>
      <div class="card">
        <h3>★ Bookmark (${bms.length})</h3>
        ${bms.length ? bms.map(b => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--border)"><span>${KIND[b.type] || b.type} · <a href="${esc(b.href)}">${esc(b.title)}</a></span><button class="btn sm ghost" data-ub="${esc(b.type)}|${esc(b.id)}">✕</button></div>`).join('') : '<p class="muted small">Belum ada bookmark. Klik ☆ Bookmark pada topik, obat, EKG, atau algoritma.</p>'}
      </div>
    </div>`;
    $('#add', el).onclick = () => {
      const t = $('#nt', el).value.trim(), b = $('#nb', el).value.trim();
      if (!b) { $('#nb', el).classList.add('invalid'); toast('Isi catatan masih kosong'); return; }
      setNote('note:' + Date.now(), b, t || 'Catatan'); toast('Catatan disimpan'); draw();
    };
    el.querySelectorAll('[data-del]').forEach(x => x.onclick = () => { if (confirm('Hapus catatan ini?')) { setNote(x.dataset.del, ''); draw(); } });
    el.querySelectorAll('[data-ub]').forEach(x => x.onclick = () => { const [type, id] = x.dataset.ub.split('|'); toggleBookmark(type, id); draw(); });
  };
  draw();
}
