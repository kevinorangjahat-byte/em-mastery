import { get, set, exportJSON, importJSON, resetAll } from '../core/store.js';
import { esc, $, toast } from '../core/util.js';

export function render(el) {
  const s = get('settings');
  el.innerHTML = `
  <div class="page-head"><div><h1>Pengaturan & Data</h1><p>Semua progress disimpan di database lokal (IndexedDB) perangkat ini.</p></div></div>
  <div class="grid g2" style="align-items:start">
    <div class="card stack">
      <h3>Profil belajar</h3>
      <label class="field">Nama panggilan<input class="input" id="name" value="${esc(s.name)}" maxlength="40" placeholder="mis. dr. Andi"></label>
      <label class="field">Target poin harian<input class="input" id="goal" type="number" min="5" max="200" value="${s.dailyGoal}"><span class="field-err"></span></label>
      <button class="btn primary" id="saveP">Simpan profil</button>
    </div>
    <div class="card stack">
      <h3>🤖 AI tutor (Claude API)</h3>
      <label class="field">Anthropic API key<input class="input" id="key" type="password" value="${esc(s.apiKey)}" placeholder="sk-ant-…" autocomplete="off"><span class="field-hint">Disimpan hanya di perangkat ini dan dikirim langsung ke api.anthropic.com. Jangan gunakan di perangkat bersama.</span></label>
      <label class="field">Model<select class="input" id="model">
        ${[['claude-opus-5-5', 'Claude Opus 5.5 (default, paling akurat)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (lebih cepat & hemat)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (tercepat)']].map(([v, l]) => `<option value="${v}" ${s.model === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">Kedalaman penalaran (effort)<select class="input" id="effort">${['low', 'medium', 'high'].map(v => `<option ${s.effort === v ? 'selected' : ''}>${v}</option>`).join('')}</select><span class="field-hint">Lebih tinggi = jawaban lebih mendalam, lebih lambat & mahal.</span></label>
      <button class="btn primary" id="saveK">Simpan pengaturan AI</button>
    </div>
    <div class="card stack">
      <h3>💾 Backup & pemulihan</h3>
      <p class="small muted">Ekspor progress (tanpa API key) sebagai file JSON, lalu impor di perangkat lain.</p>
      <div class="row"><button class="btn" id="exp">⬇️ Ekspor JSON</button><label class="btn">⬆️ Impor JSON<input type="file" id="imp" accept="application/json" hidden></label></div>
      <hr><button class="btn danger" id="reset">Reset seluruh progress</button>
      <span class="xs muted">Menghapus progress, quiz, flashcard, catatan, dan riwayat (pengaturan tetap).</span>
    </div>
    <div class="card small">
      <h3>ℹ️ Tentang</h3>
      <p>EM Mastery v1.0 — arsitektur modular: <code>js/data/*</code> (konten), <code>js/core/*</code> (database, store, SRS, analitik), <code>js/pages/*</code> (UI per fitur), <code>js/lib/*</code> (EKG, pencarian, AI).</p>
      <p>Pintasan: <kbd>/</kbd> cari · <kbd>P</kbd> pocket reference · <kbd>Esc</kbd> tutup.</p>
    </div>
  </div>`;
  $('#saveP', el).onclick = () => {
    const g = +$('#goal', el).value;
    if (!Number.isInteger(g) || g < 5 || g > 200) { $('#goal', el).classList.add('invalid'); $('#goal', el).nextElementSibling.textContent = 'Masukkan bilangan bulat 5–200'; return; }
    set('settings', { ...get('settings'), name: $('#name', el).value.trim(), dailyGoal: g }); toast('Profil disimpan');
  };
  $('#saveK', el).onclick = () => {
    const k = $('#key', el).value.trim();
    if (k && !k.startsWith('sk-ant-')) { toast('Format kunci tampak tidak valid (biasanya diawali sk-ant-)'); }
    set('settings', { ...get('settings'), apiKey: k, model: $('#model', el).value, effort: $('#effort', el).value }); toast('Pengaturan AI disimpan');
  };
  $('#exp', el).onclick = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `em-mastery-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#imp', el).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { await importJSON(await f.text()); toast('Backup berhasil diimpor'); render(el); } catch (err) { toast('Gagal impor: ' + err.message); }
  };
  $('#reset', el).onclick = async () => { if (confirm('Yakin menghapus SELURUH progress? Tindakan ini tidak dapat dibatalkan.')) { await resetAll(); toast('Progress direset'); render(el); } };
}
