// Kalkulator klinis dengan validasi input & penjelasan rumus.
import { esc, $, fmt } from '../core/util.js';
import { DRUGS, DRUG_MAP } from '../data/drugs.js';

const TABS = [
  ['dose', '💊 Dosis berbasis BB'], ['gcs', '🧠 GCS'], ['si', '🩸 Shock index'], ['burns', '🔥 Luka bakar'],
  ['peds', '👶 Pediatrik'], ['map', '📈 MAP & CPP'], ['lytic', '🧪 Trombolitik stroke'],
];

/** Validasi angka. Mengembalikan {ok, v, msg} */
function num(input, { min, max, label, integer = false }) {
  const raw = (input.value || '').trim().replace(',', '.');
  input.classList.remove('invalid');
  const errEl = input.parentElement.querySelector('.field-err');
  if (errEl) errEl.textContent = '';
  const fail = msg => { input.classList.add('invalid'); if (errEl) errEl.textContent = msg; return { ok: false }; };
  if (raw === '') return fail(`${label} wajib diisi`);
  const v = Number(raw);
  if (!isFinite(v)) return fail(`${label} harus berupa angka`);
  if (integer && !Number.isInteger(v)) return fail(`${label} harus bilangan bulat`);
  if (v < min || v > max) return fail(`${label} harus antara ${min}–${max}`);
  return { ok: true, v };
}
const field = (id, label, hint, attrs = '') => `<label class="field">${label}<input class="input" id="${id}" inputmode="decimal" autocomplete="off" ${attrs}><span class="field-err"></span>${hint ? `<span class="field-hint">${hint}</span>` : ''}</label>`;
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;

export function render(el, [tab = 'dose'], query) {
  el.innerHTML = `
  <div class="page-head"><div><h1>Kalkulator Klinis</h1><p>Validasi input, rumus, dan penjelasan. Hasil adalah alat bantu belajar — selalu periksa ulang secara independen.</p></div></div>
  <div class="tabs">${TABS.map(([k, l]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#/calculators/${k}">${l}</a>`).join('')}</div>
  <div id="calc"></div>`;
  const c = $('#calc', el);
  ({ dose, gcs, si, burns, peds, map, lytic }[tab] || dose)(c, query);
}

function dose(c, query) {
  const drugs = DRUGS.filter(d => d.calc);
  c.innerHTML = `
  <div class="grid g2" style="align-items:start">
    <div class="card stack">
      <label class="field">Obat<select class="input" id="drug">${drugs.map(d => `<option value="${d.id}" ${query.drug === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>
      <label class="field">Indikasi / konteks<select class="input" id="ctx"></select></label>
      ${field('wt', 'Berat badan (kg)', 'Rentang valid 0,5–300 kg. Pada anak gunakan BB aktual atau pita panjang badan.')}
      <button class="btn primary" id="go">Hitung</button>
    </div>
    <div class="card" id="out"><p class="muted">Pilih obat, konteks, dan isi berat badan.</p></div>
  </div>`;
  const fillCtx = () => { const d = DRUG_MAP[$('#drug', c).value]; $('#ctx', c).innerHTML = d.calc.map((r, i) => `<option value="${i}">${esc(r.ctx)} — ${r.perKg} ${esc(r.unit.split('/')[0])}/kg${r.unit.includes('/') ? '/' + r.unit.split('/')[1] : ''} (${r.pop === 'peds' ? 'pediatrik' : 'dewasa'})</option>`).join(''); };
  $('#drug', c).onchange = fillCtx; fillCtx();
  const calc = () => {
    const w = num($('#wt', c), { min: 0.5, max: 300, label: 'Berat badan' }); if (!w.ok) return;
    const d = DRUG_MAP[$('#drug', c).value]; const r = d.calc[+$('#ctx', c).value];
    let raw = r.perKg * w.v; let capped = false;
    if (r.max != null && raw > r.max) { raw = r.max; capped = true; }
    const val = r2(raw);
    const vol = r.conc ? r2(val / r.conc) : null;
    const warn = r.pop === 'peds' && w.v > 60 ? '<div class="callout amber small mt">BB >60 kg dengan dosis pediatrik — umumnya gunakan dosis dewasa.</div>' : (r.pop === 'adult' && w.v < 30 ? '<div class="callout amber small mt">BB <30 kg dengan aturan dewasa — pertimbangkan dosis pediatrik.</div>' : '');
    $('#out', c).innerHTML = `
      <div class="xs muted">${esc(d.name)} · ${esc(r.ctx)}</div>
      <div style="font-size:2rem;font-weight:800;margin:6px 0">${val.toLocaleString('id-ID')} ${esc(r.unit)}</div>
      ${vol !== null ? `<div class="badge primary" style="font-size:.85rem">Volume ≈ ${vol.toLocaleString('id-ID')} mL (sediaan ${esc(r.concLabel)})</div>` : ''}
      ${capped ? `<div class="callout amber small mt">Dibatasi dosis maksimum ${r.max} ${esc(r.unit)}.</div>` : ''}
      ${warn}
      <h3 class="mt">Rumus</h3><p class="small"><code>${r.perKg} ${esc(r.unit)}/kg × ${w.v} kg = ${r2(r.perKg * w.v)} ${esc(r.unit)}</code>${r.max != null ? ` → maks ${r.max}` : ''}${vol !== null ? `<br><code>Volume = dosis ÷ konsentrasi = ${val} ÷ ${r.conc} = ${vol} mL</code>` : ''}</p>
      <h3>Referensi dosis</h3><p class="small">${fmt(r.pop === 'peds' ? d.peds : d.adult)}</p>
      <a class="small" href="#/drugs/${d.id}">Buka monografi obat →</a>
      <p class="disclaimer mt">Periksa ulang dosis, sediaan, dan pengenceran sesuai formularium rumah sakit.</p>`;
  };
  $('#go', c).onclick = calc;
  $('#wt', c).onkeydown = e => e.key === 'Enter' && calc();
}

function gcs(c) {
  const E = [[4, 'Spontan'], [3, 'Terhadap suara'], [2, 'Terhadap tekanan/nyeri'], [1, 'Tidak ada']];
  const V = [[5, 'Orientasi baik'], [4, 'Bingung'], [3, 'Kata-kata tidak tepat'], [2, 'Suara tidak bermakna'], [1, 'Tidak ada']];
  const M = [[6, 'Mengikuti perintah'], [5, 'Melokalisasi nyeri'], [4, 'Fleksi normal (menarik)'], [3, 'Fleksi abnormal (dekortikasi)'], [2, 'Ekstensi (deserebrasi)'], [1, 'Tidak ada']];
  const grp = (id, title, arr) => `<div class="card"><h3>${title}</h3>${arr.map(([v, l]) => `<label class="row small" style="padding:4px 0;cursor:pointer"><input type="radio" name="${id}" value="${v}"> <b>${v}</b> ${l}</label>`).join('')}${id === 'v' ? '<label class="row small" style="padding:4px 0"><input type="radio" name="v" value="T"> <b>T</b> Terintubasi (tidak dapat dinilai)</label>' : ''}</div>`;
  c.innerHTML = `<div class="grid g3">${grp('e', 'Eye (E)', E)}${grp('v', 'Verbal (V)', V)}${grp('m', 'Motor (M)', M)}</div><div class="card mt" id="out"><p class="muted">Pilih satu nilai di setiap komponen.</p></div>`;
  const upd = () => {
    const g = n => c.querySelector(`input[name="${n}"]:checked`)?.value;
    const e = g('e'), v = g('v'), m = g('m');
    if (!e || !v || !m) { $('#out', c).innerHTML = `<p class="muted">Lengkapi: ${[!e && 'Eye', !v && 'Verbal', !m && 'Motor'].filter(Boolean).join(', ')}.</p>`; return; }
    if (v === 'T') { $('#out', c).innerHTML = `<div style="font-size:1.8rem;font-weight:800">E${e} VT M${m}</div><p class="small">Total tidak dapat dijumlahkan karena komponen verbal tidak dapat dinilai — laporkan per komponen (mis. "GCS 2T + 5"). Motor ${m} memiliki nilai prognostik terkuat.</p>`; return; }
    const t = +e + +v + +m;
    const cls = t <= 8 ? ['Berat', 'bad', 'Pertimbangkan definitive airway (GCS ≤8). Cegah hipoksia & hipotensi; konsultasi bedah saraf.'] : t <= 12 ? ['Sedang', 'warn', 'CT kepala, observasi ketat, re-evaluasi berkala.'] : ['Ringan', 'ok', 'Gunakan aturan klinis (Canadian CT Head Rule) untuk indikasi CT.'];
    $('#out', c).innerHTML = `<div class="row"><div style="font-size:2rem;font-weight:800">GCS ${t}</div><span class="badge ${cls[1]}">TBI ${cls[0]}</span></div><div class="small">E${e} V${v} M${m}</div><p class="small mt">${cls[2]}</p><p class="xs muted">Rumus: GCS = E + V + M (3–15). Laporkan komponen terpisah. Nilai sisi motorik terbaik.</p>`;
  };
  c.querySelectorAll('input').forEach(i => i.onchange = upd);
}

function si(c) {
  c.innerHTML = `<div class="grid g2" style="align-items:start"><div class="card stack">
    ${field('hr', 'Heart rate (kali/menit)', '20–250')}${field('sbp', 'Tekanan darah sistolik (mmHg)', '30–300')}
    ${field('age', 'Usia (tahun) — opsional, untuk Age Shock Index', '0–120')}
    <button class="btn primary" id="go">Hitung</button></div><div class="card" id="out"><p class="muted">Isi HR dan SBP.</p></div></div>`;
  $('#go', c).onclick = () => {
    const hr = num($('#hr', c), { min: 20, max: 250, label: 'HR' }); const sbp = num($('#sbp', c), { min: 30, max: 300, label: 'SBP' });
    if (!hr.ok || !sbp.ok) return;
    const ageIn = $('#age', c); let age = null;
    if (ageIn.value.trim()) { const a = num(ageIn, { min: 0, max: 120, label: 'Usia' }); if (!a.ok) return; age = a.v; }
    const s = r2(hr.v / sbp.v);
    const band = s < 0.7 ? ['Normal (0,5–0,7)', 'ok'] : s < 1 ? ['Meningkat — waspadai syok tersamar', 'warn'] : s < 1.4 ? ['≥1: risiko tinggi transfusi/ transfusi masif', 'bad'] : ['≥1,4: syok berat', 'bad'];
    $('#out', c).innerHTML = `<div style="font-size:2rem;font-weight:800">SI ${s}</div><span class="badge ${band[1]}">${band[0]}</span>
      ${age !== null && age >= 16 ? `<p class="small mt">Age Shock Index (usia × SI) = <b>${r1(age * s)}</b> — nilai ≥50 dikaitkan peningkatan mortalitas pada trauma lansia [⚠ verifikasi ambang].</p>` : ''}
      ${age !== null && age < 16 ? `<p class="small mt">Anak: gunakan SI yang disesuaikan usia (SIPA) — ambang berbeda per kelompok usia (mis. 4–6 th >1,22; 7–12 th >1,0; 13–16 th >0,9) [⚠ verifikasi].</p>` : ''}
      <h3 class="mt">Rumus</h3><p class="small"><code>SI = HR ÷ SBP = ${hr.v} ÷ ${sbp.v} = ${s}</code></p>
      <p class="small">SI normal 0,5–0,7. SI >1 berhubungan dengan kehilangan darah signifikan dan kebutuhan transfusi masif. Interpretasi hati-hati pada beta-blocker, pacemaker, kehamilan, dan lansia.</p>`;
  };
}

function burns(c) {
  const areas = [['Kepala & leher', 9, 18], ['Dada & abdomen (depan)', 18, 18], ['Punggung', 18, 18], ['Lengan kanan', 9, 9], ['Lengan kiri', 9, 9], ['Tungkai kanan', 18, 14], ['Tungkai kiri', 18, 14], ['Perineum', 1, 1]];
  c.innerHTML = `<div class="grid g2" style="align-items:start">
    <div class="card stack">
      <div class="seg" id="pop"><button data-p="adult" class="active">Dewasa</button><button data-p="child">Anak</button><button data-p="infant">Bayi</button></div>
      <div><div class="small"><b>Rule of nines</b> — centang area yang terkena partial/full-thickness (proporsi persen area tersebut)</div>
        <div id="areas" class="stack" style="margin-top:8px"></div></div>
      ${field('tbsa', '%TBSA total (partial + full thickness)', 'Terisi otomatis dari rule of nines; boleh diubah manual (1–100). Jangan hitung luka bakar superfisial.')}
      ${field('wt', 'Berat badan (kg)', '1–300 kg')}
      ${field('hrs', 'Jam sejak cedera', '0–24 jam (waktu dihitung dari CEDERA, bukan kedatangan)')}
      <label class="field">Formula<select class="input" id="fx"><option value="2">ATLS 10 / ABA — dewasa 2 mL/kg/%TBSA</option><option value="3">ATLS 10 — anak ≤14 th 3 mL/kg/%TBSA</option><option value="4">Listrik / Parkland klasik 4 mL/kg/%TBSA</option></select></label>
      <button class="btn primary" id="go">Hitung</button>
    </div>
    <div class="card" id="out"><p class="muted">Lengkapi data.</p></div></div>`;
  let pop = 'adult';
  const drawAreas = () => {
    $('#areas', c).innerHTML = areas.map(([n, a, ch], i) => { const v = pop === 'adult' ? a : pop === 'child' ? (i === 0 ? 14 : i >= 5 && i <= 6 ? 16 : ch) : ch; return `<div class="row small"><span style="flex:1">${n} <span class="muted">(${v}%)</span></span><input type="range" min="0" max="100" step="25" value="0" data-v="${v}" style="width:140px"><span class="xs" style="width:40px">0%</span></div>`; }).join('');
    $('#areas', c).querySelectorAll('input').forEach(r => r.oninput = () => { r.nextElementSibling.textContent = r.value + '%'; const sum = [...$('#areas', c).querySelectorAll('input')].reduce((s, x) => s + (+x.dataset.v * +x.value / 100), 0); $('#tbsa', c).value = r1(sum); });
  };
  c.querySelectorAll('#pop button').forEach(b => b.onclick = () => { pop = b.dataset.p; c.querySelectorAll('#pop button').forEach(x => x.classList.toggle('active', x === b)); $('#fx', c).value = pop === 'adult' ? '2' : '3'; drawAreas(); });
  drawAreas();
  $('#go', c).onclick = () => {
    const t = num($('#tbsa', c), { min: 1, max: 100, label: '%TBSA' }); const w = num($('#wt', c), { min: 1, max: 300, label: 'Berat badan' });
    const h = num($('#hrs', c), { min: 0, max: 24, label: 'Jam sejak cedera' });
    if (!t.ok || !w.ok || !h.ok) return;
    const k = +$('#fx', c).value; const total = k * w.v * t.v; const first8 = total / 2;
    const remain8 = Math.max(0, 8 - h.v);
    const rate1 = remain8 > 0 ? first8 / remain8 : null;
    const uo = k === 4 ? '1–1,5 mL/kg/jam (luka bakar listrik dengan mioglobinuria — sampai urin jernih)' : (pop !== 'adult' && w.v < 30 ? '1 mL/kg/jam' : '0,5 mL/kg/jam');
    $('#out', c).innerHTML = `
      <div class="xs muted">Total 24 jam pertama</div><div style="font-size:2rem;font-weight:800">${Math.round(total)} mL RL</div>
      <table class="tbl mt"><tbody>
        <tr><th>8 jam pertama (dari cedera)</th><td><b>${Math.round(first8)} mL</b>${rate1 ? ` → sisa ${r1(remain8)} jam: <b>${Math.round(rate1)} mL/jam</b>` : ' → <span class="badge bad">periode 8 jam telah lewat — konsultasi, titrasi berdasarkan urin</span>'}</td></tr>
        <tr><th>16 jam berikutnya</th><td><b>${Math.round(first8)} mL</b> → ${Math.round(first8 / 16)} mL/jam</td></tr>
        <tr><th>Target urin output</th><td>${uo} = ${k === 4 ? `${r1(w.v)}–${r1(w.v * 1.5)}` : r1(w.v * (pop !== 'adult' && w.v < 30 ? 1 : 0.5))} mL/jam</td></tr>
      </tbody></table>
      ${pop !== 'adult' && w.v < 30 ? '<div class="callout amber small mt">Anak kecil: tambahkan cairan rumatan mengandung dekstrosa (lihat kalkulator pediatrik 4-2-1).</div>' : ''}
      ${t.v < 20 && pop === 'adult' ? '<div class="callout blue small mt">TBSA <20% pada dewasa sering tidak memerlukan resusitasi formal IV — sesuaikan klinis.</div>' : ''}
      <h3 class="mt">Rumus</h3><p class="small"><code>${k} mL × ${w.v} kg × ${t.v}% = ${Math.round(total)} mL</code><br>Setengah dalam 8 jam pertama sejak cedera, setengah sisanya dalam 16 jam. Rumus hanyalah titik awal — titrasi berdasarkan urin output untuk menghindari over-resuscitation ("fluid creep").</p>
      <p class="xs muted">Sumber: ATLS 10th ed. (2018) & ABA. Formula Parkland klasik menggunakan 4 mL/kg/%TBSA.</p>`;
  };
}

function peds(c) {
  c.innerHTML = `<div class="grid g2" style="align-items:start"><div class="card stack">
    ${field('age', 'Usia (tahun)', '1–10 tahun untuk rumus estimasi BB & ETT; 0 = bayi')}
    ${field('wt', 'Berat badan (kg) — opsional', 'Kosongkan untuk memakai estimasi APLS (usia + 4) × 2')}
    <button class="btn primary" id="go">Hitung</button></div><div class="card" id="out"><p class="muted">Isi usia.</p></div></div>`;
  $('#go', c).onclick = () => {
    const a = num($('#age', c), { min: 0, max: 16, label: 'Usia' }); if (!a.ok) return;
    let w; const wi = $('#wt', c);
    if (wi.value.trim()) { const x = num(wi, { min: 1, max: 120, label: 'Berat badan' }); if (!x.ok) return; w = x.v; }
    else w = (a.v + 4) * 2;
    const est = !wi.value.trim();
    const ettU = r1(a.v / 4 + 4), ettC = r1(a.v / 4 + 3.5);
    const maint = w <= 10 ? 4 * w : w <= 20 ? 40 + 2 * (w - 10) : 60 + (w - 20);
    const hypo = a.v >= 1 && a.v <= 10 ? 70 + 2 * a.v : a.v < 1 ? 70 : 90;
    const uo = a.v < 1 ? 2 : a.v >= 13 ? 0.5 : 1;
    const rows = [
      ['Berat badan', `${r1(w)} kg ${est ? '<span class="badge warn">estimasi (usia+4)×2</span>' : ''}`],
      ['Hipotensi bila SBP <', `${hypo} mmHg ${a.v >= 1 && a.v <= 10 ? '(70 + 2×usia)' : a.v < 1 ? '(bayi: 70)' : '(>10 th: 90)'}`],
      ['ETT tanpa cuff / dengan cuff', a.v >= 1 ? `${ettU} / ${ettC} mm ID · kedalaman ≈ ${r1(ettC * 3)} cm (3 × ID)` : 'Bayi: gunakan tabel/pita (umumnya 3,0–3,5 cuff)'],
      ['Bolus kristaloid 20 mL/kg', `${Math.round(20 * w)} mL`],
      ['PRC 10 mL/kg', `${Math.round(10 * w)} mL`],
      ['Rumatan (4-2-1)', `${Math.round(maint)} mL/jam`],
      ['Epinefrin henti jantung 0,01 mg/kg', `${r2(Math.min(1, 0.01 * w))} mg = ${r1(Math.min(10, 0.1 * w))} mL (0,1 mg/mL)`],
      ['Amiodarone 5 mg/kg', `${Math.round(Math.min(300, 5 * w))} mg`],
      ['Adenosin 0,1 / 0,2 mg/kg', `${r2(Math.min(6, 0.1 * w))} mg / ${r2(Math.min(12, 0.2 * w))} mg`],
      ['Atropin 0,02 mg/kg (maks 0,5)', `${r2(Math.min(0.5, 0.02 * w))} mg`],
      ['Defibrilasi 2 → 4 J/kg', `${Math.round(2 * w)} J → ${Math.round(4 * w)} J (maks 10 J/kg / dosis dewasa)`],
      ['Kardioversi 0,5–1 → 2 J/kg', `${r1(0.5 * w)}–${Math.round(w)} J → ${Math.round(2 * w)} J`],
      ['Target urin output', `${uo} mL/kg/jam = ${r1(uo * w)} mL/jam`],
    ];
    $('#out', c).innerHTML = `<table class="tbl"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>
      <p class="small mt"><b>Rumus:</b> BB (APLS) = (usia + 4) × 2 · ETT cuff = usia/4 + 3,5 · rumatan 4-2-1 = 4 mL/kg untuk 10 kg pertama, 2 mL/kg untuk 10 kg berikutnya, 1 mL/kg sisanya.</p>
      <p class="xs muted">Sumber: ATLS 10, AHA PALS 2020, APLS. Pita berbasis panjang badan (Broselow) lebih akurat daripada estimasi usia.</p>`;
  };
}

function map(c) {
  c.innerHTML = `<div class="grid g2" style="align-items:start"><div class="card stack">
    ${field('sbp', 'SBP (mmHg)', '30–300')}${field('dbp', 'DBP (mmHg)', '10–200')}${field('icp', 'ICP (mmHg) — opsional, untuk CPP', '0–80')}
    <button class="btn primary" id="go">Hitung</button></div><div class="card" id="out"><p class="muted">Isi tekanan darah.</p></div></div>`;
  $('#go', c).onclick = () => {
    const s = num($('#sbp', c), { min: 30, max: 300, label: 'SBP' }); const d = num($('#dbp', c), { min: 10, max: 200, label: 'DBP' });
    if (!s.ok || !d.ok) return;
    if (d.v >= s.v) { $('#dbp', c).classList.add('invalid'); $('#dbp', c).parentElement.querySelector('.field-err').textContent = 'DBP harus lebih kecil dari SBP'; return; }
    const m = r1(d.v + (s.v - d.v) / 3);
    let cpp = '';
    if ($('#icp', c).value.trim()) { const i = num($('#icp', c), { min: 0, max: 80, label: 'ICP' }); if (!i.ok) return; const v = r1(m - i.v); cpp = `<div class="mt"><div style="font-size:1.6rem;font-weight:800">CPP ${v} mmHg</div><span class="badge ${v >= 60 && v <= 70 ? 'ok' : v < 60 ? 'bad' : 'warn'}">${v < 60 ? 'Di bawah target' : v <= 70 ? 'Dalam target 60–70 (BTF)' : 'Di atas target'}</span><p class="small"><code>CPP = MAP − ICP = ${m} − ${i.v}</code></p></div>`; }
    $('#out', c).innerHTML = `<div style="font-size:2rem;font-weight:800">MAP ${m} mmHg</div><span class="badge ${m >= 65 ? 'ok' : 'bad'}">${m >= 65 ? '≥65 mmHg' : '<65 mmHg — di bawah target umum (mis. pasca-ROSC)'}</span>
      <p class="small mt"><code>MAP = DBP + (SBP − DBP)/3 = ${d.v} + (${s.v} − ${d.v})/3</code></p>${cpp}`;
  };
}

function lytic(c) {
  c.innerHTML = `<div class="grid g2" style="align-items:start"><div class="card stack">
    ${field('wt', 'Berat badan (kg)', '30–250 kg (gunakan BB aktual/estimasi terbaik)')}
    <button class="btn primary" id="go">Hitung</button></div><div class="card" id="out"><p class="muted">Isi berat badan.</p></div></div>`;
  $('#go', c).onclick = () => {
    const w = num($('#wt', c), { min: 30, max: 250, label: 'Berat badan' }); if (!w.ok) return;
    const tot = Math.min(90, 0.9 * w.v), bol = r1(tot * 0.1), inf = r1(tot - bol);
    const tnk = Math.min(25, r2(0.25 * w.v));
    $('#out', c).innerHTML = `
      <h3>Alteplase (stroke iskemik ≤4,5 jam)</h3>
      <table class="tbl"><tbody><tr><th>Total</th><td><b>${r1(tot)} mg</b> ${0.9 * w.v > 90 ? '<span class="badge warn">dibatasi 90 mg</span>' : ''}</td></tr>
      <tr><th>Bolus 10% (1 menit)</th><td>${bol} mg</td></tr><tr><th>Infus 60 menit</th><td>${inf} mg (${r1(inf)} mL/jam pada 1 mg/mL)</td></tr></tbody></table>
      <p class="small"><code>0,9 mg/kg × ${w.v} kg = ${r1(0.9 * w.v)} mg</code> (maks 90 mg)</p>
      <h3 class="mt">Tenecteplase (stroke) <span class="verify">⚠ verifikasi posisi guideline</span></h3>
      <p><b>${tnk} mg</b> bolus tunggal IV ${0.25 * w.v > 25 ? '<span class="badge warn">dibatasi 25 mg</span>' : ''}</p>
      <p class="small"><code>0,25 mg/kg × ${w.v} kg</code> (maks 25 mg)</p>
      <div class="callout amber small mt">Pastikan: tidak ada perdarahan pada CT, TD <185/110 sebelum dan <180/105 setelah, tanpa kontraindikasi. Dosis STEMI berbeda — lihat monografi obat.</div>`;
  };
}
