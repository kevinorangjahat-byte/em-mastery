// Flashcards dengan spaced repetition (SM-2).
import { esc, fmt, $, shuffle } from '../core/util.js';
import { review, dueCards, newCards, weakCards, intervalLabel, retention } from '../core/srs.js';
import { ALL_CARDS, TOPIC_MAP, TOPICS } from '../data/index.js';
import { renderECG } from '../lib/ecg.js';
import { get } from '../core/store.js';

export function render(el, _p, query) {
  const filter = c => (!query.topic || c.topic === query.topic) && (!query.module || c.module === query.module) && (!query.src || c.src === query.src);
  if (query.start) return session(el, query, filter);
  const due = dueCards(filter).length, nw = newCards(filter).length, weak = weakCards().filter(filter).length;
  const s = get('srs');
  el.innerHTML = `
  <div class="page-head"><div><h1>Flashcards</h1><p>Spaced repetition (SM-2): kartu yang sulit muncul lebih sering, yang dikuasai dijadwalkan makin jarang.</p></div></div>
  ${query.topic ? `<div class="callout blue mb">Filter topik: <b>${esc(TOPIC_MAP[query.topic]?.title)}</b> · <a href="#/flashcards">hapus filter</a></div>` : ''}
  <div class="grid g4">
    <div class="card stat"><span class="v">${due}</span><span class="l">Jatuh tempo</span></div>
    <div class="card stat"><span class="v">${nw}</span><span class="l">Kartu baru</span></div>
    <div class="card stat"><span class="v">${weak}</span><span class="l">Kartu lemah (sering lupa)</span></div>
    <div class="card stat"><span class="v">${retention() ?? '—'}${retention() !== null ? '%' : ''}</span><span class="l">Retensi terakhir</span></div>
  </div>
  <div class="row mt">
    <a class="btn primary" href="#/flashcards?${new URLSearchParams({ ...query, start: 'due' })}">▶ Review jatuh tempo + 10 baru</a>
    <a class="btn" href="#/flashcards?${new URLSearchParams({ ...query, start: 'weak' })}">🎯 Kartu lemah</a>
    <a class="btn" href="#/flashcards?${new URLSearchParams({ ...query, start: 'all' })}">🔀 Acak semua (cram)</a>
  </div>
  <h2 class="mt">Deck</h2>
  <div class="row">
    <a class="badge primary" style="padding:5px 10px" href="#/flashcards?src=ecg">📈 Deck EKG (${ALL_CARDS.filter(c => c.src === 'ecg').length})</a>
    <a class="badge primary" style="padding:5px 10px" href="#/flashcards?src=drug">💊 Deck obat (${ALL_CARDS.filter(c => c.src === 'drug').length})</a>
    <a class="badge atls" style="padding:5px 10px" href="#/flashcards?module=atls">ATLS</a>
    <a class="badge acls" style="padding:5px 10px" href="#/flashcards?module=acls">ACLS</a>
  </div>
  <div class="grid gauto mt">${TOPICS.map(t => { const cs = ALL_CARDS.filter(c => c.topic === t.id); const learned = cs.filter(c => s[c.id]).length; return `<a class="card card-link" href="#/flashcards?topic=${t.id}"><div class="row between"><b class="small">${esc(t.title)}</b><span class="badge ${t.module}">${t.module.toUpperCase()}</span></div><div class="xs muted">${learned}/${cs.length} dipelajari</div><div class="bar ${t.module}" style="margin-top:6px"><span style="width:${cs.length ? Math.round(learned / cs.length * 100) : 0}%"></span></div></a>`; }).join('')}</div>`;
}

function session(el, query, filter) {
  let deck;
  if (query.start === 'weak') deck = shuffle(weakCards().filter(filter));
  else if (query.start === 'all') deck = shuffle(ALL_CARDS.filter(filter));
  else deck = [...dueCards(filter), ...newCards(filter).slice(0, 10)];
  const back = `#/flashcards?${new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([k]) => k !== 'start')))}`;
  if (!deck.length) { el.innerHTML = `<div class="empty"><h2>🎉 Tidak ada kartu untuk saat ini</h2><p>Semua kartu sudah direview. Kembali nanti atau pilih "acak semua".</p><a class="btn" href="${back}">Kembali</a></div>`; return; }
  let i = 0, flipped = false, done = 0;
  const draw = () => {
    if (i >= deck.length) { el.innerHTML = `<div class="empty"><h2>Sesi selesai ✔</h2><p>${done} kartu direview.</p><a class="btn primary" href="${back}">Kembali ke deck</a></div>`; return; }
    const c = deck[i]; flipped = false;
    el.innerHTML = `
    <div style="max-width:720px;margin:0 auto">
      <div class="row between mb"><a class="small" href="${back}">← Selesai</a><span class="small muted">${i + 1}/${deck.length}</span></div>
      <div class="bar mb"><span style="width:${Math.round(i / deck.length * 100)}%"></span></div>
      <div class="flash" id="card"><div class="flash-inner">
        <div class="flash-face"><small>${c.src === 'ecg' ? 'EKG' : c.topic ? esc(TOPIC_MAP[c.topic]?.title || '') : c.src.toUpperCase()}</small>${c.ecg ? `<div class="ecg-wrap w100 mb">${renderECG(c.ecg, { seconds: 5, height: 130 })}</div>` : ''}<div>${fmt(c.front)}</div><div class="xs muted mt">Klik / Spasi untuk membalik</div></div>
        <div class="flash-face back"><small>Jawaban</small><div style="white-space:pre-line;font-size:.98rem">${fmt(c.back)}</div></div>
      </div></div>
      <div class="row mt" id="grades" style="justify-content:center;visibility:hidden">
        ${[['Lagi', 0, 'danger'], ['Sulit', 1, ''], ['Baik', 2, 'primary'], ['Mudah', 3, '']].map(([l, g, cls]) => `<button class="btn ${cls}" data-g="${g}">${l}<span class="xs muted" style="margin-left:4px">${intervalLabel(c.id, g)}</span></button>`).join('')}
      </div>
      <div class="kbd-hint mt" style="text-align:center">Spasi: balik · 1 Lagi · 2 Sulit · 3 Baik · 4 Mudah</div>
    </div>`;
    const flip = () => { flipped = !flipped; $('#card', el).classList.toggle('flipped', flipped); $('#grades', el).style.visibility = 'visible'; };
    $('#card', el).onclick = flip;
    el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => grade(+b.dataset.g));
    el._flip = flip;
  };
  const grade = g => { review(deck[i].id, g); done++; if (g === 0 && query.start !== 'all') deck.push(deck[i]); i++; draw(); };
  const onKey = e => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); el._flip?.(); }
    if (flipped && '1234'.includes(e.key)) grade(+e.key - 1);
  };
  document.addEventListener('keydown', onKey);
  draw();
  return () => document.removeEventListener('keydown', onKey);
}
