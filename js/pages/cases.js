// Case simulation engine: vignette bertahap, monitor vital, keputusan bercabang, feedback.
import { get, update, logActivity } from '../core/store.js';
import { esc, fmt, pct, $, fmtRel } from '../core/util.js';
import { CASES, CASE_MAP } from '../data/cases.js';
import { TOPIC_MAP, LEVELS } from '../data/index.js';
import { renderECG } from '../lib/ecg.js';
import { ECG_MAP } from '../data/ecg.js';

const PTS = { best: 2, ok: 1, bad: 0 };

function vitalsHTML(v, rhythm) {
  const alarm = { hr: v.hr > 0 && (v.hr < 50 || v.hr > 130), sbp: v.sbp < 90, spo2: v.spo2 < 92, rr: v.rr > 0 && (v.rr < 8 || v.rr > 28), gcs: v.gcs <= 8 };
  const arrest = v.sbp === 0;
  const cell = (k, label, val, unit = '') => `<div class="${alarm[k] || arrest ? 'alarm' : ''}"><small>${label}</small><b>${val}</b> <small style="display:inline">${unit}</small></div>`;
  return `<div class="monitor">
    <div class="vit">
      ${cell('hr', 'HR', arrest ? '—' : v.hr, '/mnt')}
      ${cell('sbp', 'TD', arrest ? '—' : `${v.sbp}/${v.dbp}`, 'mmHg')}
      ${cell('rr', 'RR', arrest ? '—' : v.rr, '/mnt')}
      ${cell('spo2', 'SpO₂', arrest ? '—' : v.spo2, '%')}
      ${cell('gcs', 'GCS', v.gcs)}
      ${v.etco2 !== undefined ? cell('etco2', 'ETCO₂', v.etco2, 'mmHg') : ''}
      ${v.temp ? cell('temp', 'Suhu', v.temp, '°C') : ''}
    </div>
    ${rhythm ? `<div class="ecg-wrap mt" style="background:#0b1210;border-color:#16302a">${renderECG(rhythm, { seconds: 5, height: 120 })}</div><div class="xs" style="opacity:.6;margin-top:4px">Monitor: ${esc(ECG_MAP[rhythm]?.name || rhythm)} (lead II, skematik)</div>` : ''}
  </div>`;
}

export function render(el, [id]) {
  if (id && CASE_MAP[id]) return play(el, CASE_MAP[id]);
  const hist = get('cases');
  el.innerHTML = `
  <div class="page-head"><div><h1>Simulasi Kasus Klinis</h1><p>Vignette bertahap dengan monitor vital, EKG, dan keputusan Anda. Setiap pilihan dievaluasi dan memengaruhi kondisi pasien.</p></div></div>
  <div class="grid gauto">${CASES.map(c => {
    const h = hist.filter(x => x.caseId === c.id); const best = h.length ? Math.max(...h.map(x => pct(x.score, x.max))) : null;
    return `<a class="card card-link" href="#/cases/${c.id}">
      <div class="row between"><span class="badge ${c.module}">${c.module.toUpperCase()}</span><span class="xs muted">${LEVELS[c.level]}</span></div>
      <h3 style="margin:8px 0 4px">${esc(c.title)}</h3><p class="small muted">${esc(c.brief)}</p>
      <div class="xs">${best !== null ? `<span class="badge ${best >= 80 ? 'ok' : 'warn'}">Skor terbaik ${best}%</span> <span class="muted">${h.length}× dimainkan</span>` : '<span class="muted">Belum dimainkan</span>'}</div></a>`;
  }).join('')}</div>
  ${hist.length ? `<h2 class="mt">Riwayat</h2><div class="card">${hist.slice(-8).reverse().map(h => `<div class="row between small" style="padding:4px 0"><span>${esc(CASE_MAP[h.caseId]?.title || h.caseId)}</span><span>${h.score}/${h.max} · ${fmtRel(h.ts)}</span></div>`).join('')}</div>` : ''}`;
}

function play(el, c) {
  let nodeId = c.start;
  let vitals = { ...c.vitals };
  let rhythm = c.rhythm;
  let score = 0, max = 0;
  const log = [];
  let lastFb = null;
  const attempted = new Set();

  const draw = () => {
    const n = c.nodes[nodeId];
    if (n.end) return end(n);
    el.innerHTML = `
    <div class="row between mb"><a href="#/cases" class="small">← Daftar kasus</a><span class="small">Skor: <b>${score}</b> / ${max}</span></div>
    <div class="grid g2 case-grid" style="align-items:start">
      <div class="stack">
        <div class="card"><span class="badge ${c.module}">${c.module.toUpperCase()}</span> <h2 style="display:inline;margin-left:6px">${esc(c.title)}</h2>
          <p class="small mt"><b>Pasien:</b> ${esc(c.patient)}</p><p class="small"><b>Handover / anamnesis:</b> ${esc(c.mist)}</p></div>
        ${vitalsHTML(vitals, rhythm)}
        <div class="card"><h3>Log keputusan</h3><ol class="case-log">${log.map(l => `<li><span class="badge ${l.q === 'best' ? 'ok' : l.q === 'ok' ? 'warn' : 'bad'}">${l.q === 'best' ? '✔' : l.q === 'ok' ? '~' : '✘'}</span> ${esc(l.text)}</li>`).join('') || '<li class="muted">Belum ada keputusan.</li>'}</ol></div>
      </div>
      <div class="card">
        <div class="badge info">${esc(n.phase)}</div>
        <p style="margin-top:10px">${fmt(n.prompt)}</p>
        ${n.ecg ? `<div class="ecg-wrap mb">${renderECG(n.ecg, { seconds: 6 })}</div>` : ''}
        ${lastFb ? `<div class="fb ${lastFb.q === 'best' ? 'best' : lastFb.q === 'ok' ? 'ok' : 'bad'}"><b>${lastFb.q === 'best' ? 'Keputusan tepat' : lastFb.q === 'ok' ? 'Dapat diterima, tetapi belum optimal' : 'Keputusan kurang tepat'}</b><p class="small" style="margin:.3em 0 0">${fmt(lastFb.fb)}</p>${lastFb.stay ? '<p class="xs" style="margin:.4em 0 0">Kondisi pasien berubah — pilih tindakan lain.</p>' : ''}</div>` : ''}
        <h3 class="mt">Apa tindakan Anda?</h3>
        <div class="q-opts">${n.choices.map((ch, k) => `<button class="q-opt" data-k="${k}"><span class="k">${'ABCDE'[k]}</span><span>${fmt(ch.text)}</span></button>`).join('')}</div>
      </div>
    </div>`;
    el.querySelectorAll('.q-opt').forEach(b => b.onclick = () => choose(n, n.choices[+b.dataset.k]));
  };

  const choose = (n, ch) => {
    // Poin maksimum dihitung sekali per node (keputusan pertama)
    const first = !attempted.has(nodeId);
    if (first) { max += 2; score += PTS[ch.q]; attempted.add(nodeId); }
    log.push({ text: ch.text, q: ch.q });
    if (ch.vitals) vitals = { ...vitals, ...ch.vitals };
    if (ch.rhythm) rhythm = ch.rhythm;
    lastFb = { q: ch.q, fb: ch.fb, stay: !ch.next };
    if (ch.next) { nodeId = ch.next; if (c.nodes[nodeId]?.end) lastFb = { ...lastFb }; }
    logActivity(1);
    draw();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const end = n => {
    update('cases', h => { h.push({ caseId: c.id, score, max, ts: Date.now() }); return h; });
    const p = pct(score, max);
    el.innerHTML = `
    <div style="max-width:820px;margin:0 auto">
      ${lastFb ? `<div class="fb ${lastFb.q === 'best' ? 'best' : lastFb.q === 'ok' ? 'ok' : 'bad'} mb"><b>Keputusan terakhir</b><p class="small" style="margin:.3em 0 0">${fmt(lastFb.fb)}</p></div>` : ''}
      ${vitalsHTML(vitals, rhythm)}
      <div class="card mt">
        <div class="row between"><h2>Kasus selesai</h2><span class="badge ${p >= 80 ? 'ok' : p >= 50 ? 'warn' : 'bad'}">Skor ${score}/${max} (${p}%)</span></div>
        <p>${fmt(n.summary)}</p>
        <h3>Pelajaran kunci</h3><ul>${n.learning.map(l => `<li>${fmt(l)}</li>`).join('')}</ul>
        <h3>Jejak keputusan</h3><ol class="small">${log.map(l => `<li>${l.q === 'best' ? '✔' : l.q === 'ok' ? '~' : '✘'} ${esc(l.text)}</li>`).join('')}</ol>
        <div class="row mt"><a class="btn primary" href="#/cases/${c.id}?r=${Date.now()}">Ulangi kasus</a><a class="btn" href="#/topic/${c.topic}">Pelajari: ${esc(TOPIC_MAP[c.topic]?.title || '')}</a><a class="btn" href="#/cases">Kasus lain</a></div>
      </div>
    </div>`;
  };
  draw();
}
