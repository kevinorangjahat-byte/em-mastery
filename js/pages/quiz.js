// Quiz engine: berbagai mode & tipe soal, feedback langsung, statistik tersimpan.
import { get, update, recordAnswer, recordSession } from '../core/store.js';
import { esc, fmt, shuffle, pct, todayKey, $, toast } from '../core/util.js';
import { QUESTIONS } from '../data/quiz.js';
import { TOPIC_MAP, TOPICS } from '../data/index.js';
import { renderECG } from '../lib/ecg.js';
import { dailyQuestions, weakTopics, missedQuestionIds } from '../core/analytics.js';

const TYPES = { mcq: 'Pilihan ganda', case: 'Berbasis kasus', decision: 'Clinical decision-making', ecg: 'Interpretasi EKG', dose: 'Kalkulasi dosis', rapid: 'Rapid-fire (benar/salah)' };

function buildSet(opts) {
  let pool = QUESTIONS;
  if (opts.mode === 'daily') return { qs: dailyQuestions(5), label: 'Daily challenge ' + todayKey(), timed: false };
  if (opts.mode === 'weak') {
    const w = new Set(weakTopics(6).map(x => x.id)); const missed = new Set(missedQuestionIds());
    pool = QUESTIONS.filter(q => w.has(q.topic) || missed.has(q.id));
    if (!pool.length) pool = QUESTIONS;
    return { qs: shuffle(pool).slice(0, 10), label: 'Latihan kelemahan', timed: false };
  }
  if (opts.topic) pool = pool.filter(q => q.topic === opts.topic);
  if (opts.module) pool = pool.filter(q => q.topic.startsWith(opts.module));
  if (opts.type) pool = pool.filter(q => q.type === opts.type);
  const n = opts.type === 'rapid' ? Math.min(pool.length, 12) : Math.min(pool.length, opts.n || 10);
  return { qs: shuffle(pool).slice(0, n), label: opts.topic ? 'Quiz: ' + (TOPIC_MAP[opts.topic]?.title || '') : opts.type ? TYPES[opts.type] : 'Quiz campuran', timed: opts.type === 'rapid' };
}

export function render(el, _p, query) {
  if (query.mode || query.topic || query.type || query.module) return play(el, query);
  const counts = Object.fromEntries(Object.keys(TYPES).map(k => [k, QUESTIONS.filter(q => q.type === k).length]));
  el.innerHTML = `
  <div class="page-head"><div><h1>Quiz</h1><p>${QUESTIONS.length} soal: pilihan ganda, kasus, clinical decision-making, EKG, kalkulasi dosis, rapid-fire.</p></div></div>
  <div class="grid g3">
    <a class="card card-link" href="#/quiz?mode=daily"><div class="kpi-ico">🎯</div><b>Daily challenge</b><p class="small muted">5 soal per hari, sama sepanjang hari, condong ke topik lemah.</p>${get('daily')[todayKey()] ? `<span class="badge ok">Selesai: ${get('daily')[todayKey()].score}/5</span>` : '<span class="badge warn">Belum dikerjakan</span>'}</a>
    <a class="card card-link" href="#/quiz?mode=weak"><div class="kpi-ico">🎯</div><b>Latih kelemahan</b><p class="small muted">Soal dari topik dengan akurasi rendah & soal yang pernah salah.</p></a>
    <a class="card card-link" href="#/quiz?mode=mixed&n=10"><div class="kpi-ico">🔀</div><b>Campuran 10 soal</b><p class="small muted">Acak dari seluruh bank soal.</p></a>
  </div>
  <h2 class="mt">Berdasarkan tipe soal</h2>
  <div class="grid gauto">${Object.entries(TYPES).map(([k, v]) => `<a class="card card-link" href="#/quiz?type=${k}"><b>${v}</b><div class="small muted">${counts[k]} soal${k === 'rapid' ? ' · berwaktu 15 detik/soal' : ''}</div></a>`).join('')}</div>
  <h2 class="mt">Berdasarkan modul</h2>
  <div class="row"><a class="btn" href="#/quiz?module=atls&n=15">🩹 ATLS (15 soal)</a><a class="btn" href="#/quiz?module=acls&n=15">❤️ ACLS (15 soal)</a></div>
  <h2 class="mt">Berdasarkan topik</h2>
  <div class="row">${TOPICS.filter(t => QUESTIONS.some(q => q.topic === t.id)).map(t => `<a class="badge ${t.module}" href="#/quiz?topic=${t.id}" style="padding:5px 10px">${esc(t.title)}</a>`).join('')}</div>`;
}

function play(el, query) {
  const set = buildSet(query);
  const qs = set.qs.map(q => q.type === 'rapid' ? q : { ...q });
  if (!qs.length) { el.innerHTML = '<div class="empty">Belum ada soal untuk pilihan ini. <a href="#/quiz">Kembali</a></div>'; return; }
  let i = 0, score = 0, answered = false, timer = null, left = 15;
  const results = [];
  const mode = query.mode || query.type || (query.topic ? 'topic' : 'module');

  const finish = () => {
    clearInterval(timer);
    recordSession(set.label, score, qs.length);
    if (query.mode === 'daily') update('daily', d => { d[todayKey()] = { done: true, score, total: qs.length }; return d; });
    const wrong = results.filter(r => !r.correct);
    el.innerHTML = `
      <div class="card" style="max-width:760px;margin:0 auto;text-align:center">
        <div class="ring" style="--p:${pct(score, qs.length)};margin:0 auto"><div><b>${pct(score, qs.length)}%</b><small>${score}/${qs.length}</small></div></div>
        <h2 class="mt">${pct(score, qs.length) >= 80 ? 'Luar biasa! 🎉' : pct(score, qs.length) >= 60 ? 'Bagus — terus asah!' : 'Ayo ulangi materi kunci 💪'}</h2>
        <p class="muted">${esc(set.label)}</p>
        <div class="row" style="justify-content:center"><a class="btn primary" href="#/quiz?${new URLSearchParams(query)}&r=${Date.now()}">Ulangi</a><a class="btn" href="#/quiz">Menu quiz</a><a class="btn" href="#/">Dashboard</a></div>
      </div>
      ${wrong.length ? `<h2 class="mt">Tinjau jawaban salah</h2>${wrong.map(r => `<div class="card mb"><div class="small muted">${esc(TOPIC_MAP[r.q.topic]?.title || '')}</div><p><b>${fmt(r.q.q)}</b></p><p class="small">Jawaban benar: <b>${esc(r.q.type === 'dose' ? r.q.answer + ' ' + r.q.unit : r.q.opts[r.q.ans])}</b></p><p class="small">${fmt(r.q.exp)}</p><a class="small" href="#/topic/${r.q.topic}">Pelajari topik →</a></div>`).join('')}` : ''}`;
  };

  const draw = () => {
    clearInterval(timer);
    const q = qs[i]; answered = false;
    const t = TOPIC_MAP[q.topic];
    el.innerHTML = `
      <div style="max-width:820px;margin:0 auto">
        <div class="row between mb"><a href="#/quiz" class="small">← Keluar</a><span class="small muted">${esc(set.label)}</span><span class="small"><b>${i + 1}</b>/${qs.length} · Skor ${score}</span></div>
        <div class="bar mb"><span style="width:${pct(i, qs.length)}%"></span></div>
        <div class="card">
          <div class="row between"><span class="badge info">${TYPES[q.type]}</span>${t ? `<span class="badge ${t.module}">${esc(t.title)}</span>` : ''}${set.timed ? `<span class="timer" id="timer">⏱ 15</span>` : ''}</div>
          ${q.ecg ? `<div class="ecg-wrap mt">${renderECG(q.ecg, { seconds: 6 })}</div>` : ''}
          <p style="font-size:1.05rem;margin-top:12px"><b>${fmt(q.q)}</b></p>
          ${q.type === 'dose' ? `
            <form class="row" id="doseForm"><input class="input" id="doseIn" inputmode="decimal" placeholder="Jawaban" style="max-width:200px" autocomplete="off"><span>${esc(q.unit)}</span><button class="btn primary">Periksa</button></form>
            <div class="xs muted mt">Gunakan titik atau koma untuk desimal. <a href="#/calculators" target="_blank">Buka kalkulator</a></div>`
          : `<div class="q-opts">${q.opts.map((o, k) => `<button class="q-opt" data-k="${k}"><span class="k">${'ABCDE'[k]}</span><span>${fmt(o)}</span></button>`).join('')}</div>`}
          <div id="fb"></div>
        </div>
        <div class="kbd-hint mt">Tip keyboard: tekan 1–5 / A–E untuk memilih, Enter untuk lanjut.</div>
      </div>`;

    const answer = (correct, chosenK) => {
      if (answered) return; answered = true; clearInterval(timer);
      if (correct) score++;
      results.push({ q, correct });
      recordAnswer(q, correct, mode);
      if (q.type !== 'dose') el.querySelectorAll('.q-opt').forEach(b => { b.disabled = true; const k = +b.dataset.k; if (k === q.ans) b.classList.add('correct'); else if (k === chosenK) b.classList.add('wrong'); });
      $('#fb', el).innerHTML = `<div class="fb ${correct ? 'best' : 'bad'}"><b>${correct ? '✔ Benar' : chosenK === -1 ? '⏱ Waktu habis' : '✘ Kurang tepat'}</b>${q.type === 'dose' ? ` — jawaban: <b>${q.answer} ${esc(q.unit)}</b>` : ''}<p class="small" style="margin:.4em 0 0">${fmt(q.exp)}</p>${t ? `<a class="small" href="#/topic/${t.id}">Buka materi: ${esc(t.title)} →</a>` : ''}</div>
        <div class="row mt"><button class="btn primary" id="nextBtn">${i + 1 < qs.length ? 'Soal berikutnya →' : 'Lihat hasil'}</button></div>`;
      $('#nextBtn', el).onclick = () => { i++; i < qs.length ? draw() : finish(); };
      $('#nextBtn', el).focus();
    };

    if (q.type === 'dose') {
      $('#doseForm', el).onsubmit = e => {
        e.preventDefault();
        const raw = $('#doseIn', el).value.trim().replace(',', '.');
        const v = parseFloat(raw);
        if (raw === '' || isNaN(v)) { $('#doseIn', el).classList.add('invalid'); toast('Masukkan angka yang valid'); return; }
        answer(Math.abs(v - q.answer) <= (q.tol || 0) + 1e-9, null);
      };
      $('#doseIn', el).focus();
    } else {
      el.querySelectorAll('.q-opt').forEach(b => b.onclick = () => answer(+b.dataset.k === q.ans, +b.dataset.k));
    }
    if (set.timed) {
      left = 15;
      timer = setInterval(() => { left--; const tEl = $('#timer', el); if (tEl) tEl.textContent = '⏱ ' + left; if (left <= 0) answer(false, -1); }, 1000);
    }
  };

  const onKey = e => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    const k = '12345'.indexOf(e.key) >= 0 ? '12345'.indexOf(e.key) : 'abcde'.indexOf(e.key.toLowerCase());
    if (!answered && k >= 0) { const b = el.querySelector(`.q-opt[data-k="${k}"]`); b?.click(); }
  };
  document.addEventListener('keydown', onKey);
  draw();
  return () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
}
