import { get, set, update, logActivity } from '../core/store.js';
import { esc, md, $, toast } from '../core/util.js';
import { MODES, retrieve, askClaude, errorMessage } from '../lib/ai.js';
import { TOPIC_MAP } from '../data/index.js';

const STARTERS = {
  free: ['Mengapa epinefrin diberikan lebih awal pada PEA dibanding VF?', 'Apa beda definitive airway dan advanced airway?'],
  simple: ['Jelaskan Monro-Kellie doctrine secara sederhana', 'Jelaskan mengapa kardioversi harus sinkron'],
  compare: ['Bandingkan tension pneumothorax, tamponade jantung, dan massive hemothorax', 'Bandingkan Mobitz I vs Mobitz II vs AV block derajat 3'],
  algorithm: ['Bedah algoritma takikardia dewasa AHA langkah demi langkah', 'Bedah algoritma syok hemoragik ATLS'],
  case: ['Wanita 70 th jatuh dari berdiri, minum warfarin, GCS 14, sakit kepala. Bagaimana pendekatan Anda?', 'Pria 50 th nyeri dada, HR 40, TD 80/50, ST elevasi inferior. Diskusikan.'],
};

export function render(el, _p, query) {
  let mode = 'free';
  let busy = false, ctrl = null;
  const topic = query.topic && TOPIC_MAP[query.topic] ? query.topic : null;

  el.innerHTML = `
  <div class="page-head"><div><h1>AI Tutor</h1><p>Diskusi ATLS/ACLS dengan penalaran terstruktur — ditenagai Claude. ${topic ? `Konteks topik: <b>${esc(TOPIC_MAP[topic].title)}</b>` : ''}</p></div>
    <div class="row"><button class="btn sm" id="clear">🗑️ Bersihkan percakapan</button><a class="btn sm" href="#/settings">⚙️ API key</a></div></div>
  <div class="seg mb" id="modes" style="flex-wrap:wrap">${Object.entries(MODES).map(([k, v]) => `<button data-m="${k}" class="${k === mode ? 'active' : ''}">${v.label}</button>`).join('')}</div>
  <div class="card chat">
    <div class="chat-log" id="log"></div>
    <form class="chat-input" id="form"><textarea class="input" id="msg" rows="2" placeholder="Ketik pertanyaan… (Enter kirim, Shift+Enter baris baru)"></textarea><button class="btn primary" id="send">Kirim</button></form>
    <div class="xs muted" id="status" style="margin-top:6px"></div>
  </div>`;

  const log = $('#log', el), status = $('#status', el);
  const drawLog = () => {
    const chat = get('chat');
    if (!chat.length) {
      log.innerHTML = `<div class="empty" style="padding:20px"><div style="font-size:2rem">🤖</div><p><b>${MODES[mode].label}</b> — ${esc(MODES[mode].hint)}</p>
        <div class="stack" style="max-width:560px;margin:0 auto">${STARTERS[mode].map(s => `<button class="btn" data-s="${esc(s)}" style="justify-content:flex-start;text-align:left">${esc(s)}</button>`).join('')}</div>
        ${!get('settings').apiKey ? '<p class="small mt">Belum ada API key — tutor berjalan dalam <b>mode offline</b> (menampilkan materi aplikasi yang relevan). Tambahkan kunci Claude API di Pengaturan untuk diskusi penuh.</p>' : ''}</div>`;
      log.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { $('#msg', el).value = b.dataset.s; $('#msg', el).focus(); });
      return;
    }
    log.innerHTML = chat.map(m => `<div class="msg ${m.role === 'user' ? 'user' : 'ai'}">${m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') : md(m.content)}${m.src?.length ? `<div class="xs muted" style="margin-top:8px">Materi terkait: ${m.src.map(s => `<a href="${s.href}">${esc(s.title)}</a>`).join(' · ')}</div>` : ''}</div>`).join('');
    log.scrollTop = log.scrollHeight;
  };

  const offlineAnswer = (q, hits) => {
    if (!hits.length) return 'Mode offline: tidak menemukan materi yang cocok di aplikasi. Coba kata kunci lain, gunakan **Search**, atau tambahkan API key untuk diskusi dengan AI.';
    const parts = hits.slice(0, 2).map(h => {
      if (h.kind === 'Topik') { const t = h.raw; return `### ${t.title}\n**Konsep:** ${t.concept.replace(/\[\[.*?\]\]/g, '')}\n\n**Manajemen kunci:**\n${t.management.slice(0, 6).map(x => '- ' + x.replace(/\[\[.*?\]\]/g, '')).join('\n')}\n\n**High-yield:**\n${t.highYield.map(x => '- ' + x).join('\n')}`; }
      const d = h.raw; return `### ${d.name}\n- Dewasa: ${d.adult}\n- Pediatrik: ${d.peds}\n- Maks: ${d.max}`;
    });
    return `*Mode offline — ringkasan dari materi aplikasi (bukan jawaban AI).*\n\n${parts.join('\n\n---\n\n')}\n\nTambahkan API key di Pengaturan untuk penjelasan terstruktur, perbandingan, dan diskusi kasus.`;
  };

  const send = async () => {
    const q = $('#msg', el).value.trim();
    if (!q || busy) return;
    if (q.length > 8000) { toast('Pertanyaan terlalu panjang (maks 8.000 karakter)'); return; }
    $('#msg', el).value = '';
    const { hits, text } = retrieve(q, topic);
    const src = hits.map(h => ({ title: h.title, href: h.kind === 'Topik' ? `#/topic/${h.id}` : `#/drugs/${h.id}` }));
    update('chat', c => { c.push({ role: 'user', content: q, ts: Date.now() }); return c; });
    logActivity(1);
    const s = get('settings');
    if (!s.apiKey) {
      update('chat', c => { c.push({ role: 'assistant', content: offlineAnswer(q, hits), src, ts: Date.now() }); return c; });
      drawLog(); return;
    }
    busy = true; ctrl = new AbortController();
    $('#send', el).textContent = 'Stop'; $('#send', el).classList.remove('primary');
    status.textContent = 'Claude sedang berpikir…';
    const chat = get('chat');
    chat.push({ role: 'assistant', content: '', src, ts: Date.now() });
    drawLog();
    const bubble = log.lastElementChild;
    let acc = '';
    try {
      const history = chat.slice(0, -1).slice(-12).map(m => ({ role: m.role, content: m.content })).filter(m => m.content);
      const final = await askClaude({
        apiKey: s.apiKey, model: s.model || 'claude-opus-5-5', effort: s.effort || 'medium', history, mode, context: text, signal: ctrl.signal,
        onText: d => { acc += d; status.textContent = 'Menulis…'; bubble.innerHTML = md(acc); log.scrollTop = log.scrollHeight; },
      });
      if (final.stop_reason === 'refusal') acc += '\n\n⚠ Permintaan ini tidak dapat dijawab oleh model. Coba rumuskan ulang sebagai pertanyaan edukatif.';
      if (final.stop_reason === 'max_tokens') acc += '\n\n_(Jawaban terpotong karena batas panjang — minta "lanjutkan".)_';
      status.textContent = `Selesai · ${final.model} · ${final.usage?.output_tokens ?? '?'} token output`;
    } catch (e) {
      const msg = await errorMessage(e);
      acc += (acc ? '\n\n' : '') + '⚠ ' + msg;
      status.textContent = msg;
    } finally {
      chat[chat.length - 1].content = acc || '(tidak ada jawaban)';
      set('chat', chat);
      busy = false; ctrl = null;
      $('#send', el).textContent = 'Kirim'; $('#send', el).classList.add('primary');
      drawLog();
    }
  };

  $('#form', el).onsubmit = e => { e.preventDefault(); if (busy) { ctrl?.abort(); return; } send(); };
  $('#msg', el).onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('active', x === b)); $('#msg', el).placeholder = MODES[mode].hint; drawLog(); });
  $('#clear', el).onclick = () => { if (confirm('Hapus seluruh percakapan AI tutor?')) { set('chat', []); drawLog(); } };
  if (topic && !get('chat').length) $('#msg', el).value = `Bantu saya memahami topik "${TOPIC_MAP[topic].title}": jelaskan konsep inti, algoritma, dan jebakan ujian.`;
  drawLog();
  return () => ctrl?.abort();
}
