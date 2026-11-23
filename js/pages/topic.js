import { get, markVisit, markRead, markMastered, isBookmarked, toggleBookmark, getNote, setNote } from '../core/store.js';
import { esc, fmt, toast, debounce, $ } from '../core/util.js';
import { TOPIC_MAP, TOPICS, LEVELS } from '../data/index.js';
import { DRUG_MAP } from '../data/drugs.js';
import { REFS, DISCLAIMER } from '../data/references.js';
import { ALGO_MAP } from '../data/algorithms.js';
import { QUESTIONS } from '../data/quiz.js';
import { mastery, topicQuizStats } from '../core/analytics.js';

const list = (arr, cls = '') => arr?.length ? `<ul class="${cls}">${arr.map(x => `<li>${fmt(x)}</li>`).join('')}</ul>` : '<p class="muted small">—</p>';

const SECTIONS = [
  ['objectives', '🎯 Tujuan pembelajaran', t => list(t.objectives)],
  ['concept', '💡 Konsep dasar', t => `<p>${fmt(t.concept)}</p>`],
  ['patho', '🧬 Patofisiologi', t => `<p>${fmt(t.patho)}</p>`],
  ['presentation', '🩺 Presentasi klinis', t => list(t.presentation)],
  ['assessment', '🔍 Assessment', t => list(t.assessment)],
  ['diagnosis', '🧪 Diagnosis & pemeriksaan', t => list(t.diagnosis)],
  ['management', '🛠️ Manajemen step-by-step', t => `<ol class="steps">${t.management.map(x => `<li>${fmt(x)}</li>`).join('')}</ol>`],
  ['algorithm', '🔀 Algoritma klinis', t => `<div class="algo-trail" style="font-size:.86rem">${t.algoSteps.map((s, i) => `<span>${i + 1}. ${fmt(s)}</span>`).join('<span style="background:none">→</span>')}</div>${t.algo && ALGO_MAP[t.algo] ? `<a class="btn sm primary" href="#/algorithms/${t.algo}">▶ Jalankan algoritma interaktif: ${esc(ALGO_MAP[t.algo].title)}</a>` : ''}`],
  ['drugs', '💊 Dosis obat relevan', t => `${list(t.doses)}${t.drugs?.length ? `<div class="row">${t.drugs.filter(d => DRUG_MAP[d]).map(d => `<a class="badge info" href="#/drugs/${d}">💊 ${esc(DRUG_MAP[d].name)}</a>`).join('')}</div>` : ''}`],
  ['indications', '✅ Indikasi & ⛔ kontraindikasi', t => `<div class="grid g2"><div class="callout green"><b>Indikasi</b>${list(t.indications)}</div><div class="callout red"><b>Kontraindikasi / hindari</b>${list(t.contraindications)}</div></div>`],
  ['pitfalls', '⚠️ Kesalahan yang sering dilakukan', t => `<div class="callout amber">${list(t.pitfalls)}</div>`],
  ['redflags', '🚩 Red flags', t => `<div class="callout red">${list(t.redFlags)}</div>`],
  ['pearls', '💎 Clinical pearls', t => `<div class="callout blue">${list(t.pearls)}</div>`],
  ['highyield', '⭐ Ringkasan high-yield', t => `<div class="callout green">${list(t.highYield)}</div>`],
];

export function render(el, [id]) {
  const t = TOPIC_MAP[id];
  if (!t) { el.innerHTML = '<div class="empty">Topik tidak ditemukan.</div>'; return; }
  markVisit(id);
  const idx = TOPICS.indexOf(t);
  const prev = TOPICS[idx - 1], next = TOPICS[idx + 1];
  const qs = QUESTIONS.filter(q => q.topic === id);

  const draw = () => {
    const p = get('progress')[id] || {};
    const qstat = topicQuizStats(id);
    el.innerHTML = `
    <div class="xs muted mb"><a href="#/modules/${t.module}">${t.module.toUpperCase()}</a> / ${LEVELS[t.level]}</div>
    <div class="page-head">
      <div><h1>${esc(t.title)}</h1><p>${esc(t.summary)}</p>
        <div class="row mt"><span class="badge ${t.module}">${t.module.toUpperCase()}</span><span class="badge">${LEVELS[t.level]}</span><span class="badge">⏱ ${t.minutes} menit</span><span class="badge primary">Mastery ${mastery(id)}%</span>${qstat.total ? `<span class="badge">Quiz ${qstat.correct}/${qstat.total}</span>` : ''}</div>
      </div>
      <div class="row">
        <button class="btn" id="bm">${isBookmarked('topic', id) ? '★ Tersimpan' : '☆ Bookmark'}</button>
        <button class="btn ${p.read ? 'active' : ''}" id="read">${p.read ? '✔ Sudah dibaca' : 'Tandai dibaca'}</button>
        <button class="btn ${p.mastered ? 'active' : 'primary'}" id="master">${p.mastered ? '🏅 Mastered' : 'Tandai mastered'}</button>
      </div>
    </div>
    <div class="topic-layout">
      <div>
        ${SECTIONS.map(([sid, title, fn]) => `<section class="card section" id="s-${sid}"><h2>${title}</h2><div class="prose">${fn(t)}</div></section>`).join('')}
        <section class="card section" id="s-practice"><h2>🧠 Latihan topik ini</h2>
          <div class="row"><a class="btn primary" href="#/quiz?topic=${id}">Quiz topik (${qs.length} soal)</a><a class="btn" href="#/flashcards?topic=${id}">Flashcards (${(t.cards || []).length})</a><a class="btn" href="#/tutor?topic=${id}">🤖 Tanya AI tutor</a></div>
        </section>
        <section class="card section" id="s-notes"><h2>📝 Catatan pribadi</h2>
          <textarea class="input" id="note" placeholder="Tulis catatan, mnemonic pribadi, atau protokol RS Anda…">${esc(getNote('topic:' + id))}</textarea>
          <div class="xs muted" id="noteStat">Tersimpan otomatis.</div>
        </section>
        <section class="card section" id="s-refs"><h2>📚 Referensi</h2>
          <ul class="small">${t.refs.map(r => REFS[r] ? `<li>${esc(REFS[r].text)} ${REFS[r].status === 'check' ? '<span class="verify">⚠ cek edisi</span>' : ''} <a href="${REFS[r].url}" target="_blank" rel="noopener">tautan</a></li>` : '').join('')}</ul>
          <p class="disclaimer">${esc(DISCLAIMER)}</p>
        </section>
        <div class="row between mt">
          ${prev ? `<a class="btn" href="#/topic/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}
          ${next ? `<a class="btn" href="#/topic/${next.id}">${esc(next.title)} →</a>` : ''}
        </div>
      </div>
      <nav class="toc card" aria-label="Daftar isi">
        <div class="xs muted mb">Daftar isi</div>
        ${SECTIONS.map(([sid, title]) => `<a href="#" data-sec="s-${sid}">${title}</a>`).join('')}
        <a href="#" data-sec="s-practice">🧠 Latihan</a><a href="#" data-sec="s-notes">📝 Catatan</a><a href="#" data-sec="s-refs">📚 Referensi</a>
      </nav>
    </div>`;

    $('#bm', el).onclick = () => { const on = toggleBookmark('topic', id, t.title, '#/topic/' + id); toast(on ? 'Ditambahkan ke bookmark' : 'Bookmark dihapus'); draw(); };
    $('#read', el).onclick = () => { markRead(id, !p.read); toast(!p.read ? 'Ditandai sudah dibaca (+3 poin)' : 'Status baca dihapus'); draw(); };
    $('#master', el).onclick = () => { markMastered(id, !p.mastered); toast(!p.mastered ? '🏅 Topik ditandai mastered' : 'Status mastered dihapus'); draw(); };
    const save = debounce(v => { setNote('topic:' + id, v, t.title); $('#noteStat', el).textContent = 'Tersimpan ' + new Date().toLocaleTimeString('id-ID'); }, 500);
    $('#note', el).oninput = e => { $('#noteStat', el).textContent = 'Menyimpan…'; save(e.target.value); };
    el.querySelectorAll('[data-sec]').forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById(a.dataset.sec)?.scrollIntoView({ behavior: 'smooth' }); });
  };
  draw();
}
