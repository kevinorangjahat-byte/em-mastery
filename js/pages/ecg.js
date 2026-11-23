import { esc, $, shuffle, toast } from '../core/util.js';
import { ECGS, ECG_MAP } from '../data/ecg.js';
import { renderECG } from '../lib/ecg.js';
import { TOPIC_MAP } from '../data/index.js';
import { toggleBookmark, isBookmarked, recordAnswer } from '../core/store.js';

export function render(el, [id], query) {
  if (query.drill) return drill(el);
  if (id && ECG_MAP[id]) return detail(el, ECG_MAP[id]);
  const cats = [...new Set(ECGS.map(e => e.cat))];
  el.innerHTML = `
  <div class="page-head"><div><h1>ECG Learning Library</h1><p>${ECGS.length} ritme & pola emergensi dengan strip skematik, kriteria, penyebab, dan tatalaksana ACLS.</p></div>
    <a class="btn primary" href="#/ecg?drill=1">🎯 Latihan identifikasi ritme</a></div>
  <div class="callout amber small mb">Strip EKG di aplikasi ini dibuat secara sintetis (model matematis) untuk menonjolkan ciri khas tiap ritme — bukan rekaman pasien. Untuk interpretasi klinis gunakan EKG 12 lead asli.</div>
  ${cats.map(c => `<h2 class="mt">${esc(c)}</h2><div class="grid g2">${ECGS.filter(e => e.cat === c).map(e => `
    <a class="card card-link" href="#/ecg/${e.id}">
      <div class="row between"><b>${esc(e.name)}</b>${e.shock ? '<span class="badge bad">⚡ Shockable</span>' : ''}</div>
      <div class="ecg-wrap mt">${renderECG(e.id, { seconds: 4, height: 110 })}</div>
      <div class="xs muted mt">Rate ${esc(e.rate)} · ${esc(e.regular)}</div></a>`).join('')}</div>`).join('')}`;
}

function detail(el, e) {
  const draw = () => {
    el.innerHTML = `
    <div class="row between mb"><a class="small" href="#/ecg">← ECG library</a><span class="badge">${esc(e.cat)}</span></div>
    <div class="page-head"><div><h1>${esc(e.name)}</h1>${e.shock ? '<span class="badge bad">⚡ Shockable (bila tanpa nadi)</span>' : ''}</div>
      <div class="row"><button class="btn" id="bm">${isBookmarked('ecg', e.id) ? '★ Tersimpan' : '☆ Bookmark'}</button>${e.topic ? `<a class="btn" href="#/topic/${e.topic}">📘 ${esc(TOPIC_MAP[e.topic]?.title || '')}</a>` : ''}</div></div>
    <div class="ecg-wrap mb">${renderECG(e.id, { seconds: 6, label: 'II', height: 180 })}</div>
    <div class="grid g2">
      <div class="card"><h3>Kriteria</h3><table class="tbl"><tbody>
        <tr><th>Rate</th><td>${esc(e.rate)}</td></tr><tr><th>Ritme</th><td>${esc(e.regular)}</td></tr>
        <tr><th>Gelombang P</th><td>${esc(e.p)}</td></tr><tr><th>Interval PR</th><td>${esc(e.pr)}</td></tr><tr><th>QRS</th><td>${esc(e.qrs)}</td></tr>
      </tbody></table></div>
      <div class="card"><h3>Ciri kunci</h3><ul>${e.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul><h3>Penyebab</h3><ul>${e.causes.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
    </div>
    <div class="callout green mt"><b>Tatalaksana:</b> ${esc(e.mgmt)}</div>
    <div class="card mt small"><b>Cara membaca strip:</b> kertas 25 mm/detik → 1 kotak kecil = 0,04 detik, 1 kotak besar = 0,2 detik. Rate cepat: 300 ÷ jumlah kotak besar antar-R, atau jumlah QRS dalam 6 detik × 10.</div>`;
    $('#bm', el).onclick = () => { toggleBookmark('ecg', e.id, e.name, '#/ecg/' + e.id); draw(); };
  };
  draw();
}

function drill(el) {
  let score = 0, n = 0, cur, opts, answered;
  const next = () => {
    cur = ECGS[Math.floor(Math.random() * ECGS.length)];
    const distract = shuffle(ECGS.filter(x => x.id !== cur.id && x.cat === cur.cat)).slice(0, 2);
    const more = shuffle(ECGS.filter(x => x.id !== cur.id && !distract.includes(x))).slice(0, 3 - distract.length);
    opts = shuffle([cur, ...distract, ...more]); answered = false;
    el.innerHTML = `
    <div style="max-width:860px;margin:0 auto">
      <div class="row between mb"><a class="small" href="#/ecg">← ECG library</a><span class="small">Skor ${score}/${n}</span></div>
      <div class="card"><h2>Ritme apa ini?</h2><div class="ecg-wrap">${renderECG(cur.id, { seconds: 7 })}</div>
        <div class="q-opts">${opts.map((o, k) => `<button class="q-opt" data-k="${k}"><span class="k">${'ABCD'[k]}</span><span>${esc(o.name)}</span></button>`).join('')}</div>
        <div id="fb"></div></div></div>`;
    el.querySelectorAll('.q-opt').forEach(b => b.onclick = () => {
      if (answered) return; answered = true; n++;
      const pick = opts[+b.dataset.k]; const ok = pick.id === cur.id; if (ok) score++;
      recordAnswer({ id: 'ecgdrill-' + cur.id, topic: cur.topic, type: 'ecg' }, ok, 'ecg-drill');
      el.querySelectorAll('.q-opt').forEach(x => { const o = opts[+x.dataset.k]; x.disabled = true; if (o.id === cur.id) x.classList.add('correct'); else if (o === pick) x.classList.add('wrong'); });
      $('#fb', el).innerHTML = `<div class="fb ${ok ? 'best' : 'bad'}"><b>${ok ? '✔ Benar' : '✘ ' + esc(cur.name)}</b><p class="small" style="margin:.3em 0 0">${esc(cur.features.join(' · '))}</p></div><button class="btn primary mt" id="nx">Strip berikutnya →</button>`;
      $('#nx', el).onclick = next;
    });
  };
  next();
}
