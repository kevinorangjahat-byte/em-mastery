import { get, streak, bestStreak } from '../core/store.js';
import { esc, pct, todayKey, fmtRel } from '../core/util.js';
import { moduleProgress, quizOverall, weakTopics, recommendations, activityDays, mastery } from '../core/analytics.js';
import { TOPIC_MAP, TOPICS } from '../data/index.js';
import { dueCount, newCards, retention } from '../core/srs.js';
import { DISCLAIMER } from '../data/references.js';

const TYPE_LABEL = { mcq: 'Pilihan ganda', case: 'Berbasis kasus', decision: 'Clinical decision', ecg: 'Interpretasi EKG', dose: 'Kalkulasi dosis', rapid: 'Rapid-fire' };

export function render(el) {
  const all = moduleProgress(); const atls = moduleProgress('atls'); const acls = moduleProgress('acls');
  const q = quizOverall(); const acc = pct(q.correct, q.total);
  const weak = weakTopics(5); const recs = recommendations(4);
  const days = activityDays(30);
  const today = days[days.length - 1].v; const goal = get('settings').dailyGoal || 20;
  const daily = get('daily')[todayKey()];
  const sessions = get('sessions').slice(-5).reverse();
  const cases = get('cases');
  const recent = Object.entries(get('progress')).filter(([, v]) => v.lastVisit).sort((a, b) => b[1].lastVisit - a[1].lastVisit).slice(0, 4);
  const name = get('settings').name;
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';

  el.innerHTML = `
  <div class="page-head">
    <div><h1>${greet}${name ? ', ' + esc(name) : ''} 👋</h1><p>Lanjutkan perjalanan menuju penguasaan ATLS & ACLS.</p></div>
    <div class="row"><a class="btn" href="#/quiz?mode=daily">🎯 Daily challenge</a><a class="btn primary" href="#/flashcards">🗂️ Review kartu (${dueCount()})</a></div>
  </div>

  <div class="grid g4">
    <div class="card stat"><span class="kpi-ico">📘</span><span class="v">${all.avgMastery}%</span><span class="l">Rata-rata penguasaan (${all.read}/${all.total} topik dibaca)</span></div>
    <div class="card stat"><span class="kpi-ico">✅</span><span class="v">${q.total ? acc + '%' : '—'}</span><span class="l">Akurasi quiz (${q.total} jawaban)</span></div>
    <div class="card stat"><span class="kpi-ico">🔥</span><span class="v">${streak()} hari</span><span class="l">Study streak · terbaik ${bestStreak()} hari</span></div>
    <div class="card stat"><span class="kpi-ico">🏅</span><span class="v">${all.mastered}</span><span class="l">Topik ditandai mastered</span></div>
  </div>

  <div class="grid g3 mt">
    <div class="card">
      <h3>Daily learning</h3>
      <div class="row" style="gap:18px">
        <div class="ring" style="--p:${Math.min(100, pct(today, goal))}"><div><b>${today}</b><small>/ ${goal} poin</small></div></div>
        <div class="small stack">
          <div>${daily ? `Daily challenge: <b>${daily.score}/${daily.total}</b> ✔` : 'Daily challenge hari ini belum dikerjakan.'}</div>
          <div>Kartu jatuh tempo: <b>${dueCount()}</b> · kartu baru: ${newCards().length}</div>
          <div class="muted xs">Poin: baca topik +3, mastered +2, jawaban/kartu +1.</div>
        </div>
      </div>
      <div class="mt"><div class="xs muted mb" style="margin-bottom:6px">Aktivitas 30 hari</div>
        <div class="heat">${days.map(d => `<span title="${d.k}: ${d.v} poin" data-l="${d.v === 0 ? 0 : d.v < 5 ? 1 : d.v < 15 ? 2 : 3}"></span>`).join('')}</div>
      </div>
    </div>

    <div class="card">
      <h3>Progress modul</h3>
      ${[['ATLS', atls, 'atls'], ['ACLS', acls, 'acls']].map(([n, m, k]) => `
        <div class="mb"><div class="row between small"><a href="#/modules/${k}"><b>${n}</b></a><span class="muted">${m.read}/${m.total} dibaca · ${m.avgMastery}% mastery</span></div>
        <div class="bar ${k}"><span style="width:${m.avgMastery}%"></span></div></div>`).join('')}
      <div class="small muted">Retensi flashcard: ${retention() ?? '—'}${retention() !== null ? '%' : ''}</div>
      <div class="small muted">Simulasi kasus selesai: ${cases.length}${cases.length ? ` · rata-rata ${Math.round(cases.reduce((s, c) => s + pct(c.score, c.max), 0) / cases.length)}%` : ''}</div>
    </div>

    <div class="card">
      <h3>Statistik kelemahan</h3>
      ${weak.length ? `<div class="stack small">${weak.map(w => `
        <div><div class="row between"><a href="#/topic/${w.id}">${esc(w.title)}</a><span class="badge ${w.acc < 0.5 ? 'bad' : 'warn'}">${Math.round(w.acc * 100)}%</span></div>
        <div class="bar"><span style="width:${Math.round(w.acc * 100)}%;background:var(--${w.acc < 0.5 ? 'bad' : 'warn'})"></span></div></div>`).join('')}</div>
        <a class="btn sm mt" href="#/quiz?mode=weak">Latih topik lemah</a>`
      : `<p class="small muted">Belum cukup data. Kerjakan beberapa quiz — topik dengan akurasi &lt;80% akan muncul di sini.</p>`}
      ${Object.keys(q.byType).length ? `<hr><div class="xs muted">Akurasi per tipe soal</div>${Object.entries(q.byType).map(([k, v]) => `<div class="row between small"><span>${TYPE_LABEL[k] || k}</span><span>${pct(v.c, v.t)}% (${v.t})</span></div>`).join('')}` : ''}
    </div>
  </div>

  <div class="grid g2 mt">
    <div class="card">
      <h3>Rekomendasi untuk Anda</h3>
      <div class="stack">${recs.map(r => { const t = TOPIC_MAP[r.id]; return `
        <a class="card flat card-link" href="#/topic/${t.id}" style="padding:12px">
          <div class="row between"><b>${esc(t.title)}</b><span class="badge ${t.module}">${t.module.toUpperCase()}</span></div>
          <div class="small muted">${esc(r.reason)}</div></a>`; }).join('') || '<p class="muted small">Semua topik sudah dibaca — fokus ke quiz & kasus!</p>'}</div>
    </div>
    <div class="card">
      <h3>Lanjutkan</h3>
      ${recent.length ? recent.map(([id, v]) => { const t = TOPIC_MAP[id]; if (!t) return ''; return `
        <div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--border)"><a href="#/topic/${id}">${esc(t.title)}</a><span class="muted">${fmtRel(v.lastVisit)} · ${mastery(id)}%</span></div>`; }).join('') : '<p class="small muted">Mulai dari <a href="#/path">Learning Path</a> atau buka <a href="#/topic/atls-primary-survey">Primary Survey</a>.</p>'}
      ${sessions.length ? `<h3 class="mt">Sesi quiz terakhir</h3>${sessions.map(s => `<div class="row between small"><span>${esc(s.mode)}</span><span>${s.score}/${s.total} · ${fmtRel(s.ts)}</span></div>`).join('')}` : ''}
    </div>
  </div>

  <div class="grid g4 mt">
    ${[['#/algorithms', '🔀', 'Algoritma interaktif', '10 algoritma'], ['#/cases', '🩺', 'Simulasi kasus', '6 kasus bercabang'], ['#/ecg', '📈', 'ECG library', '20 ritme'], ['#/calculators', '🧮', 'Kalkulator', 'Dosis, GCS, SI, luka bakar']].map(([h, i, t, d]) => `
      <a class="card card-link" href="${h}"><div class="kpi-ico">${i}</div><b>${t}</b><div class="small muted">${d}</div></a>`).join('')}
  </div>

  <p class="disclaimer mt">${esc(DISCLAIMER)}</p>`;
}
