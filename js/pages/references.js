import { esc } from '../core/util.js';
import { REFS, DISCLAIMER } from '../data/references.js';

export function render(el) {
  const list = Object.entries(REFS).sort((a, b) => b[1].year - a[1].year);
  el.innerHTML = `
  <div class="page-head"><div><h1>Sumber & Guideline</h1><p>Referensi yang digunakan untuk menyusun konten, tahun publikasi, dan status verifikasi.</p></div></div>
  <div class="callout amber mb"><b>Disclaimer.</b> ${esc(DISCLAIMER)}</div>
  <div class="card mb small">
    <h3>Catatan versi guideline</h3>
    <ul>
      <li><b>ACLS:</b> dosis & algoritma inti mengikuti AHA 2020 dan Focused Update 2023 yang dipertahankan dalam AHA 2025. Perubahan 2025 yang disebut di aplikasi (mis. tersedak dewasa, temperature control) ditandai <span class="verify">⚠ verifikasi</span> agar dicek ke dokumen asli.</li>
      <li><b>ATLS:</b> angka (kelas syok, formula luka bakar, lokasi dekompresi, cairan awal) mengikuti edisi 10 (2018). Edisi 11 (2025) memperkenalkan xABCDE dan penekanan resusitasi berbasis darah; bagian yang mungkin berbeda ditandai.</li>
      <li>Bila ada perbedaan antara aplikasi dan guideline/protokol institusi Anda, ikuti guideline resmi terbaru dan protokol institusi.</li>
    </ul>
  </div>
  <div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Sumber</th><th>Tahun</th><th>Status</th><th>Sitasi</th></tr></thead><tbody>
    ${list.map(([k, r]) => `<tr><td><b>${esc(r.short)}</b></td><td>${r.year}</td><td>${r.status === 'verified' ? '<span class="badge ok">Rujukan primer</span>' : '<span class="verify">⚠ cek edisi</span>'}</td><td class="small">${esc(r.text)} <a href="${r.url}" target="_blank" rel="noopener">↗</a></td></tr>`).join('')}
  </tbody></table></div>`;
}
