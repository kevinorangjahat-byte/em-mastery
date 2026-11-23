// =============================================================
// Lapisan database (IndexedDB) — key/value store sederhana.
// Seluruh state aplikasi disimpan lokal di perangkat pengguna.
// Untuk migrasi ke backend (mis. Supabase/Postgres), cukup ganti
// implementasi `load`/`save` di file ini — API di store.js tetap sama.
// =============================================================
const DB_NAME = 'em-mastery';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise = null;
function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB tidak tersedia'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function loadAll() {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const out = {};
      const tx = db.transaction(STORE, 'readonly');
      const cur = tx.objectStore(STORE).openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (c) { out[c.key] = c.value; c.continue(); } else resolve(out);
      };
      cur.onerror = () => reject(cur.error);
    });
  } catch (e) {
    console.warn('[db] fallback ke localStorage:', e);
    try { return JSON.parse(localStorage.getItem('em-fallback') || '{}'); } catch { return {}; }
  }
}

export async function save(key, value) {
  try {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    try {
      const all = JSON.parse(localStorage.getItem('em-fallback') || '{}');
      all[key] = value;
      localStorage.setItem('em-fallback', JSON.stringify(all));
    } catch {}
  }
}

export async function clearAll() {
  try {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
  try { localStorage.removeItem('em-fallback'); } catch {}
}
