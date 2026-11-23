// =============================================================
// Spaced repetition (varian SM-2)
// grade: 0 = Lagi, 1 = Sulit, 2 = Baik, 3 = Mudah
// =============================================================
import { get, update, logActivity } from './store.js';
import { ALL_CARDS } from '../data/index.js';

const DAY = 864e5;

export function cardState(id) { return get('srs')[id]; }

export function review(id, grade) {
  update('srs', s => {
    const c = s[id] || { ef: 2.5, interval: 0, reps: 0, lapses: 0 };
    if (grade === 0) {
      c.reps = 0; c.lapses++; c.interval = 0; c.ef = Math.max(1.3, c.ef - 0.2);
      c.due = Date.now() + 10 * 60e3; // ulang 10 menit lagi
    } else {
      if (grade === 1) { c.interval = Math.max(1, Math.round((c.interval || 1) * 1.2)); c.ef = Math.max(1.3, c.ef - 0.15); }
      else {
        if (c.reps === 0) c.interval = grade === 3 ? 3 : 1;
        else if (c.reps === 1) c.interval = grade === 3 ? 6 : 3;
        else c.interval = Math.round(c.interval * c.ef * (grade === 3 ? 1.3 : 1));
        if (grade === 3) c.ef += 0.15;
      }
      c.reps++;
      c.due = Date.now() + c.interval * DAY;
    }
    c.last = Date.now(); c.lastGrade = grade;
    s[id] = c; return s;
  });
  logActivity(1);
}

/** Kartu yang sudah pernah dipelajari dan jatuh tempo. */
export function dueCards(filter = () => true) {
  const s = get('srs') || {}; const now = Date.now();
  return ALL_CARDS.filter(c => filter(c) && s[c.id] && s[c.id].due <= now).sort((a, b) => s[a.id].due - s[b.id].due);
}
export function newCards(filter = () => true) {
  const s = get('srs') || {};
  return ALL_CARDS.filter(c => filter(c) && !s[c.id]);
}
export function dueCount() { try { return dueCards().length; } catch { return 0; } }

/** Kartu "lemah": sering lupa atau ef rendah. */
export function weakCards() {
  const s = get('srs') || {};
  return ALL_CARDS.filter(c => s[c.id] && (s[c.id].lapses >= 2 || s[c.id].ef < 2.0));
}

export function retention() {
  const s = Object.values(get('srs') || {});
  if (!s.length) return null;
  const good = s.filter(c => c.lastGrade >= 2).length;
  return Math.round((good / s.length) * 100);
}

export function intervalLabel(id, grade) {
  const c = get('srs')[id] || { ef: 2.5, interval: 0, reps: 0 };
  if (grade === 0) return '10m';
  let iv;
  if (grade === 1) iv = Math.max(1, Math.round((c.interval || 1) * 1.2));
  else if (c.reps === 0) iv = grade === 3 ? 3 : 1;
  else if (c.reps === 1) iv = grade === 3 ? 6 : 3;
  else iv = Math.round(c.interval * c.ef * (grade === 3 ? 1.3 : 1));
  return iv >= 30 ? `${Math.round(iv / 30)}bln` : `${iv}h`;
}
