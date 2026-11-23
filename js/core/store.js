// =============================================================
// Store: state in-memory + persistensi ke IndexedDB (db.js)
// =============================================================
import { loadAll, save, clearAll } from './db.js';
import { todayKey } from './util.js';

const DEFAULTS = () => ({
  progress: {},      // { topicId: { read, readAt, mastered, lastVisit, visits } }
  answers: [],       // [{ qid, topic, correct, ts, mode, type }]
  sessions: [],      // [{ ts, mode, score, total }]
  srs: {},           // { cardId: { ef, interval, reps, due, lapses, last } }
  notes: {},         // { key: { text, updated, title } }
  bookmarks: [],     // [{ type, id, title, href, ts }]
  activity: {},      // { 'YYYY-MM-DD': points }
  cases: [],         // [{ caseId, score, max, ts }]
  daily: {},         // { 'YYYY-MM-DD': { done, score, total } }
  chat: [],          // [{ role, content, ts }]
  settings: { apiKey: '', model: 'claude-opus-5-5', effort: 'medium', dailyGoal: 20, name: '' },
});

let state = DEFAULTS();
const listeners = new Set();
const timers = {};

export async function initStore() {
  const saved = await loadAll();
  const def = DEFAULTS();
  for (const k of Object.keys(def)) {
    if (saved[k] !== undefined) state[k] = (k === 'settings') ? { ...def.settings, ...saved[k] } : saved[k];
  }
}

export function get(key) { return state[key]; }

export function set(key, value) {
  state[key] = value;
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => save(key, state[key]), 150);
  listeners.forEach(fn => fn(key));
}

export function update(key, fn) {
  const cur = state[key];
  const next = fn(cur);
  set(key, next === undefined ? cur : next);
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function exportJSON() { return JSON.stringify({ app: 'em-mastery', version: 1, exported: new Date().toISOString(), data: { ...state, settings: { ...state.settings, apiKey: '' } } }, null, 2); }

export async function importJSON(text) {
  const obj = JSON.parse(text);
  if (!obj || obj.app !== 'em-mastery' || !obj.data) throw new Error('File bukan backup EM Mastery');
  const def = DEFAULTS();
  for (const k of Object.keys(def)) {
    if (obj.data[k] !== undefined) {
      const v = k === 'settings' ? { ...state.settings, ...obj.data[k], apiKey: state.settings.apiKey } : obj.data[k];
      state[k] = v; await save(k, v);
    }
  }
  listeners.forEach(fn => fn('*'));
}

export async function resetAll() {
  const keep = state.settings;
  await clearAll();
  state = DEFAULTS();
  state.settings = keep;
  await save('settings', keep);
  listeners.forEach(fn => fn('*'));
}

// ---------- Aktivitas & streak ----------
export function logActivity(points = 1) {
  update('activity', a => { const k = todayKey(); a[k] = (a[k] || 0) + points; return a; });
}

export function streak() {
  const a = state.activity;
  let n = 0;
  const d = new Date();
  // Hari ini belum aktif tidak memutus streak (masih bisa belajar)
  if (!a[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (a[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function bestStreak() {
  const keys = Object.keys(state.activity).sort();
  let best = 0, cur = 0, prev = null;
  for (const k of keys) {
    const d = new Date(k + 'T00:00:00');
    if (prev && (d - prev) / 864e5 === 1) cur++; else cur = 1;
    best = Math.max(best, cur); prev = d;
  }
  return best;
}

// ---------- Progress topik ----------
export function markVisit(topicId) {
  update('progress', p => {
    const t = p[topicId] || {};
    t.visits = (t.visits || 0) + 1; t.lastVisit = Date.now();
    p[topicId] = t; return p;
  });
}
export function markRead(topicId, val = true) {
  update('progress', p => { const t = p[topicId] || {}; t.read = val; t.readAt = val ? Date.now() : null; p[topicId] = t; return p; });
  if (val) logActivity(3);
}
export function markMastered(topicId, val = true) {
  update('progress', p => { const t = p[topicId] || {}; t.mastered = val; if (val) t.read = true; p[topicId] = t; return p; });
  if (val) logActivity(2);
}

// ---------- Jawaban quiz ----------
export function recordAnswer(q, correct, mode) {
  update('answers', a => { a.push({ qid: q.id, topic: q.topic, type: q.type, correct: !!correct, ts: Date.now(), mode }); if (a.length > 5000) a.splice(0, a.length - 5000); return a; });
  logActivity(1);
}
export function recordSession(mode, score, total) {
  update('sessions', s => { s.push({ ts: Date.now(), mode, score, total }); return s; });
}

// ---------- Bookmark ----------
export function isBookmarked(type, id) { return state.bookmarks.some(b => b.type === type && b.id === id); }
export function toggleBookmark(type, id, title, href) {
  let on = false;
  update('bookmarks', b => {
    const i = b.findIndex(x => x.type === type && x.id === id);
    if (i >= 0) b.splice(i, 1); else { b.unshift({ type, id, title, href, ts: Date.now() }); on = true; }
    return b;
  });
  return on;
}

// ---------- Notes ----------
export function getNote(key) { return state.notes[key]?.text || ''; }
export function setNote(key, text, title) {
  update('notes', n => { if (!text.trim()) delete n[key]; else n[key] = { text, title, updated: Date.now() }; return n; });
}
