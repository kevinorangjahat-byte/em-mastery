// Emergency pocket reference — dapat dibuka cepat sebagai drawer (tombol ⚡ / tombol P) atau halaman penuh.
import { esc, $ } from '../core/util.js';

const P = [
  { t: '❤️ Henti jantung dewasa', tag: 'acls', items: ['CPR 100–120/mnt, 5–6 cm, recoil penuh, CCF ≥80%', '30:2 → advanced airway: 1 napas/6 dtk', 'VF/pVT: shock → CPR 2 mnt → shock + epi → shock + amio 300/lido 1–1,5 mg/kg', 'PEA/asistol: epi 1 mg ASAP, tiap 3–5 mnt', 'Bifasik 120–200 J (atau maks) · monofasik 360 J', 'ETCO₂ <10 → perbaiki CPR; naik mendadak ≥35–40 → ROSC?'] },
  { t: '🔎 5H & 5T', tag: 'acls', items: ['Hipovolemia · Hipoksia · H⁺ asidosis · Hipo/Hiper-K · Hipotermia', 'Tension PTX · Tamponade · Toksin · Trombosis paru · Trombosis koroner'] },
  { t: '🐢 Bradikardia', tag: 'acls', items: ['Atropin 1 mg tiap 3–5 mnt, maks 3 mg', 'Gagal → TCP / dopamin 5–20 mcg/kg/mnt / epi 2–10 mcg/mnt', 'Mobitz II / derajat 3 → siapkan pacing'] },
  { t: '🐇 Takikardia', tag: 'acls', items: ['Tidak stabil → kardioversi sinkron', 'Energi: sempit reg 50–100 J · sempit ireg 120–200 J · lebar reg 100 J · lebar ireg → defib', 'SVT: vagal → adenosin 6 → 12 mg', 'VT stabil: amio 150 mg/10 mnt · procainamide 20–50 mg/mnt (maks 17 mg/kg) · sotalol 100 mg', 'Torsades: Mg 1–2 g', 'Pre-excited AF: hindari AV nodal blocker'] },
  { t: '🔁 Post-ROSC', tag: 'acls', items: ['SpO₂ 92–98% · PaCO₂ 35–45', 'SBP ≥90 · MAP ≥65', 'EKG 12 lead → STEMI → cath', 'Koma → temperature control; cegah demam', 'Prognostikasi ≥72 jam pasca normotermia'] },
  { t: '💔 ACS & 🧠 Stroke', tag: 'acls', items: ['EKG ≤10 mnt · aspirin 162–325 mg kunyah · NTG 0,4 mg SL ×3 (hindari SBP <90, RV infark, PDE5i)', 'D2B ≤90 mnt · door-to-needle fibrinolisis ≤30 mnt', 'Stroke: glukosa, CT, door-to-needle ≤60 mnt', 'Alteplase 0,9 mg/kg (maks 90) · TNK 0,25 mg/kg (maks 25)', 'TD <185/110 sebelum, <180/105 sesudah'] },
  { t: '⚡ Kondisi khusus', tag: 'acls', items: ['HiperK: CaCl 10% 10 mL → insulin 10 U + D 25 g → salbutamol → bikarbonat/dialisis', 'Opioid: ventilasi + nalokson 0,4–2 mg', 'LAST: lipid 20% 1,5 mL/kg', 'TCA: NaHCO₃ 1–2 mEq/kg', 'Hamil: LUD + perimortem CS ~5 mnt'] },
  { t: '🩹 Primary survey', tag: 'atls', items: ['x: perdarahan eksternal → tekan/tourniquet', 'A: jaw thrust + MILS; GCS ≤8 → definitive airway', 'B: tension PTX → dekompresi ICS 4–5 anterior MAL; open PTX → dressing 3 sisi', 'C: 2 IV besar, darah dini, TXA ≤3 jam, binder pelvis', 'D: GCS, pupil, glukosa', 'E: buka semua, log-roll, hangatkan', 'Adjunct: EKG, SpO₂, ETCO₂, AGD, CXR, pelvis, eFAST'] },
  { t: '🩸 Kelas perdarahan (ATLS 10)', tag: 'atls', items: ['I <15%: vital normal', 'II 15–30%: PP ↓, HR normal/↑', 'III 31–40%: HR ↑, TD ↓, GCS ↓ → darah', 'IV >40%: TD ↓↓ → MTP', 'SI >1 → risiko transfusi masif · Skor ABC ≥2 → MTP', 'TXA 1 g/10 mnt + 1 g/8 jam (≤3 jam)'] },
  { t: '🧠 TBI & GCS', tag: 'atls', items: ['GCS E4 V5 M6 · berat ≤8', 'SpO₂ ≥94 · PaCO₂ 35–45', 'SBP ≥100 (50–69 th) / ≥110 (15–49, >70 th)', 'Herniasi: mannitol 0,25–1 g/kg / hipertonik + hiperventilasi singkat', 'Tanpa steroid'] },
  { t: '🔥 Luka bakar', tag: 'atls', items: ['Rule of 9: kepala 9, lengan 9, dada 18, punggung 18, tungkai 18, perineum 1', 'ATLS 10: 2 mL × kg × %TBSA (dewasa) · 3 (anak) · 4 (listrik)', '½ dalam 8 jam dari CEDERA', 'Urin: 0,5 (dewasa) · 1 (anak <30 kg) · 1–1,5 mL/kg/jam (listrik + mioglobin)', 'Inhalasi → intubasi dini'] },
  { t: '👶 Pediatrik cepat', tag: 'atls', items: ['BB ≈ (usia + 4) × 2', 'Hipotensi: SBP < 70 + 2×usia', 'ETT cuff (usia/4)+3,5 · tanpa cuff (usia/4)+4', 'Bolus 20 mL/kg · PRC 10 mL/kg', 'Epi 0,01 mg/kg · amio 5 mg/kg · adenosin 0,1 → 0,2 mg/kg', 'Defib 2 → 4 J/kg (maks 10 J/kg)', 'Urin: bayi 2 · anak 1 mL/kg/jam'] },
];

export function renderPocket(container, drawer = false) {
  container.innerHTML = `
    <div class="row between mb"><h2 style="margin:0">⚡ Emergency Pocket Reference</h2>${drawer ? '<button class="icon-btn" data-close-drawer aria-label="Tutup">✕</button>' : ''}</div>
    <div class="row mb"><input class="input" id="pocketQ" placeholder="Filter cepat…" style="flex:1"><div class="seg" id="pocketSeg"><button data-t="all" class="active">Semua</button><button data-t="acls">ACLS</button><button data-t="atls">ATLS</button></div></div>
    <div id="pocketList" class="${drawer ? '' : 'grid g2'}"></div>
    <p class="xs muted mt">Ringkasan untuk belajar — verifikasi dengan guideline & protokol lokal. ${drawer ? '<a href="#/pocket" data-close-drawer>Buka halaman penuh</a> · Esc untuk menutup.' : ''}</p>`;
  let tag = 'all', q = '';
  const draw = () => {
    const list = P.filter(p => (tag === 'all' || p.tag === tag) && (!q || (p.t + p.items.join(' ')).toLowerCase().includes(q)));
    $('#pocketList', container).innerHTML = list.map(p => `<div class="pocket-card"><h4>${esc(p.t)} <span class="badge ${p.tag}">${p.tag.toUpperCase()}</span></h4><ul>${p.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('') || '<p class="muted small">Tidak ditemukan.</p>';
  };
  $('#pocketQ', container).oninput = e => { q = e.target.value.toLowerCase(); draw(); };
  container.querySelectorAll('#pocketSeg button').forEach(b => b.onclick = () => { tag = b.dataset.t; container.querySelectorAll('#pocketSeg button').forEach(x => x.classList.toggle('active', x === b)); draw(); });
  draw();
}

export function renderPage(view) {
  const wrap = document.createElement('div');
  view.appendChild(wrap);
  renderPocket(wrap, false);
  wrap.insertAdjacentHTML('beforeend', '<div class="row mt"><button class="btn" onclick="window.print()">🖨️ Cetak / simpan PDF</button></div>');
}
