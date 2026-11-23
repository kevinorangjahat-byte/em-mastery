// =============================================================
// Analitik belajar: mastery per topik, kelemahan, rekomendasi.
// =============================================================
import { get } from './store.js';
import { TOPICS, TOPIC_MAP } from '../data/index.js';
import { QUESTIONS } from '../data/quiz.js';
import { ALL_CARDS } from '../data/index.js';
import { todayKey, seeded, shuffle } from './util.js';

export function topicQuizStats(topicId) {
  const a = get('answers').filter(x => x.topic === topicId);
  const recent = a.slice(-10);
  return { total: a.length, correct: a.filter(x => x.correct).length, recentAcc: recent.length ? recent.filter(x => x.correct).length / recent.length : null };
}

export function topicCardStats(topicId) {
  const s = get('srs'); const cards = ALL_CARDS.filter(c => c.topic === topicId);
  const seen = cards.filter(c => s[c.id]);
  const good = seen.filter(c => s[c.id].lastGrade >= 2).length;
  return { total: cards.length, seen: seen.length, good };
}

/** Skor mastery 0–100: baca 25, quiz 45, flashcard 30; "mastered" manual → minimal 90. */
export function mastery(topicId) {
  const p = get('progress')[topicId] || {};
  let score = p.read ? 25 : (p.visits ? 8 : 0);
  const q = topicQuizStats(topicId);
  if (q.recentAcc !== null) score += 45 * q.recentAcc * Math.min(1, q.total / 3);
  const c = topicCardStats(topicId);
  if (c.total) score += 30 * (c.good / c.total);
  if (p.mastered) score = Math.max(score, 90);
  return Math.round(Math.min(100, score));
}

export function moduleProgress(module) {
  const ts = TOPICS.filter(t => !module || t.module === module);
  const prog = get('progress');
  const read = ts.filter(t => prog[t.id]?.read).length;
  const mastered = ts.filter(t => prog[t.id]?.mastered).length;
  const avgMastery = Math.round(ts.reduce((s, t) => s + mastery(t.id), 0) / ts.length);
  return { total: ts.length, read, mastered, avgMastery };
}

export function quizOverall() {
  const a = get('answers');
  const byType = {};
  for (const x of a) { const k = x.type || 'mcq'; byType[k] = byType[k] || { t: 0, c: 0 }; byType[k].t++; if (x.correct) byType[k].c++; }
  return { total: a.length, correct: a.filter(x => x.correct).length, byType };
}

/** Topik terlemah berdasarkan akurasi quiz (min 2 jawaban). */
export function weakTopics(limit = 5) {
  const map = {};
  for (const x of get('answers')) { if (!x.topic) continue; map[x.topic] = map[x.topic] || { t: 0, c: 0 }; map[x.topic].t++; if (x.correct) map[x.topic].c++; }
  return Object.entries(map).filter(([, v]) => v.t >= 2).map(([id, v]) => ({ id, acc: v.c / v.t, total: v.t, title: TOPIC_MAP[id]?.title || id }))
    .filter(x => x.acc < 0.8).sort((a, b) => a.acc - b.acc).slice(0, limit);
}

/** Pertanyaan yang pernah salah dan belum dijawab benar setelahnya. */
export function missedQuestionIds() {
  const last = {};
  for (const x of get('answers')) last[x.qid] = x.correct;
  return Object.entries(last).filter(([, c]) => !c).map(([id]) => id);
}

/** Rekomendasi materi berikutnya. */
export function recommendations(limit = 4) {
  const recs = [];
  for (const w of weakTopics(3)) recs.push({ id: w.id, reason: `Akurasi quiz ${Math.round(w.acc * 100)}% — ulangi materi`, kind: 'weak' });
  const prog = get('progress');
  for (const lvl of [1, 2, 3]) {
    for (const t of TOPICS.filter(t => t.level === lvl)) {
      if (recs.length >= limit) break;
      if (!prog[t.id]?.read && !recs.some(r => r.id === t.id)) recs.push({ id: t.id, reason: `Learning path: ${['', 'Beginner', 'Intermediate', 'Advanced'][lvl]} — belum dipelajari`, kind: 'next' });
    }
    if (recs.length >= limit) break;
  }
  return recs.slice(0, limit);
}

/** Daily challenge: 5 soal deterministik per hari, condong ke topik lemah. */
export function dailyQuestions(n = 5) {
  const rnd = seeded('daily-' + todayKey());
  const weak = new Set(weakTopics(5).map(w => w.id));
  const weakQs = QUESTIONS.filter(q => weak.has(q.topic));
  const pool = shuffle(QUESTIONS, rnd);
  const pick = [...shuffle(weakQs, rnd).slice(0, 2)];
  for (const q of pool) { if (pick.length >= n) break; if (!pick.includes(q)) pick.push(q); }
  return pick;
}

export function activityDays(n = 30) {
  const a = get('activity'); const out = [];
  const d = new Date(); d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) { const k = todayKey(d); out.push({ k, v: a[k] || 0 }); d.setDate(d.getDate() + 1); }
  return out;
}
