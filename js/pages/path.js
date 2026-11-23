import { get } from '../core/store.js';
import { esc } from '../core/util.js';
import { TOPICS, LEVELS } from '../data/index.js';
import { mastery, recommendations, weakTopics } from '../core/analytics.js';
import { CASES } from '../data/cases.js';

const MILESTONES = {
  1: { goal: 'Fondasi: BLS, CPR berkualitas, xABCDE, airway dasar, GCS.', practice: [['#/quiz?type=rapid', 'Rapid-fire benar/salah'], ['#/algorithms/primary-survey', 'Algoritma primary survey'], ['#/cases/case-svt', 'Kasus: SVT stabil']] },
  2: { goal: 'Algoritma inti: henti jantung, bradi/takikardia, syok hemoragik, TBI, ACS & stroke.', practice: [['#/algorithms/cardiac-arrest', 'Algoritma henti jantung'], ['#/ecg?drill=1', 'Latihan identifikasi EKG'], ['#/cases/case-vf-arrest', 'Kasus: VF arrest'], ['#/cases/case-brady', 'Kasus: blok AV total']] },
  3: { goal: 'Mahir: transfusi masif, toraks lanjut, populasi khusus, perawatan pasca-henti, kondisi khusus.', practice: [['#/cases/case-trauma-mvc', 'Kasus: trauma multipel'], ['#/cases/case-tbi', 'Kasus: EDH'], ['#/cases/case-stemi-rv', 'Kasus: STEMI + infark RV'], ['#/quiz?type=dose', 'Kalkulasi dosis']] },
};

export function render(el) {
  const prog = get('progress');
  const recs = recommendations(5); const recIds = new Set(recs.map(r => r.id));
  const weak = weakTopics(5);
  const lvlPct = l => { const ts = TOPICS.filter(t => t.level === l); return Math.round(ts.reduce((s, t) => s + mastery(t.id), 0) / ts.length); };
  const unlocked = l => l === 1 || lvlPct(l - 1) >= 40;
  el.innerHTML = `
  <div class="page-head"><div><h1>Learning Path</h1><p>Jalur bertahap Beginner → Intermediate → Advanced. Rekomendasi disesuaikan dengan hasil quiz dan kesalahan Anda.</p></div></div>
  <div class="grid g2">
    <div class="card"><h3>🎯 Rekomendasi berikutnya</h3>${recs.map(r => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--border)"><a href="#/topic/${r.id}">${esc(TOPICS.find(t => t.id === r.id).title)}</a><span class="badge ${r.kind === 'weak' ? 'bad' : 'primary'}">${r.kind === 'weak' ? 'Perlu diulang' : 'Berikutnya'}</span></div><div class="xs muted">${esc(r.reason)}</div>`).join('') || '<p class="muted small">Semua topik selesai dibaca 🎉</p>'}</div>
    <div class="card"><h3>📉 Berdasarkan kesalahan Anda</h3>${weak.length ? weak.map(w => `<div class="row between small"><a href="#/topic/${w.id}">${esc(w.title)}</a><span>${Math.round(w.acc * 100)}% dari ${w.total} soal</span></div>`).join('') + '<div class="row mt"><a class="btn sm primary" href="#/quiz?mode=weak">Quiz kelemahan</a><a class="btn sm" href="#/flashcards?start=weak">Kartu lemah</a></div>' : '<p class="small muted">Belum ada pola kesalahan. Kerjakan quiz untuk personalisasi.</p>'}</div>
  </div>
  ${[1, 2, 3].map(l => {
    const ts = TOPICS.filter(t => t.level === l); const p = lvlPct(l); const open = unlocked(l);
    return `<div class="card mt">
      <div class="row between"><div><h2 style="margin:0">${l}. ${LEVELS[l]} ${open ? '' : '<span class="badge">🔒 disarankan setelah level sebelumnya ≥40%</span>'}</h2><p class="small muted" style="margin:4px 0 0">${MILESTONES[l].goal}</p></div><b>${p}%</b></div>
      <div class="bar mt"><span style="width:${p}%"></span></div>
      <ol class="steps mt">${ts.map(t => { const pr = prog[t.id] || {}; const m = mastery(t.id); return `<li><div class="row between"><a href="#/topic/${t.id}">${esc(t.title)}</a><span class="row">${recIds.has(t.id) ? '<span class="badge primary">Rekomendasi</span>' : ''}<span class="badge ${t.module}">${t.module.toUpperCase()}</span>${pr.mastered ? '<span class="badge ok">🏅</span>' : pr.read ? '<span class="badge info">Dibaca</span>' : ''}<span class="xs muted">${m}%</span></span></div></li>`; }).join('')}</ol>
      <div class="xs muted mt">Latihan milestone:</div><div class="row">${MILESTONES[l].practice.map(([h, n]) => `<a class="btn sm" href="${h}">${n}</a>`).join('')}</div>
    </div>`;
  }).join('')}`;
}
