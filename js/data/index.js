// =============================================================
// Agregator konten. Untuk menambah topik: tambahkan objek ke salah
// satu file topics-*.js mengikuti skema di bawah.
//
// TOPIC_SCHEMA = {
//   id, module: 'atls'|'acls', title, level: 1|2|3, minutes, refs: [REF keys], algo?: algorithmId,
//   summary, objectives[], concept, patho, presentation[], assessment[], diagnosis[],
//   management[], algoSteps[], drugs[drugIds], doses[], indications[], contraindications[],
//   pitfalls[], redFlags[], pearls[], highYield[], cards: [[q, a], ...]
// }
// Teks mendukung **tebal**, `kode`, dan [[VERIFIKASI: catatan]].
// =============================================================
import atls1 from './topics-atls-1.js';
import atls2 from './topics-atls-2.js';
import atls3 from './topics-atls-3.js';
import acls1 from './topics-acls-1.js';
import acls2 from './topics-acls-2.js';

export const TOPICS = [...atls1, ...atls2, ...atls3, ...acls1, ...acls2];
export const TOPIC_MAP = Object.fromEntries(TOPICS.map(t => [t.id, t]));
export const MODULES = {
  atls: { id: 'atls', name: 'ATLS', full: 'Advanced Trauma Life Support', desc: 'Pendekatan sistematis pasien trauma: xABCDE, resusitasi, cedera spesifik, populasi khusus, dan transfer.', ref: 'American College of Surgeons (ATLS 10th ed. 2018; 11th ed. 2025)' },
  acls: { id: 'acls', name: 'ACLS', full: 'Advanced Cardiovascular Life Support', desc: 'BLS, algoritma henti jantung, aritmia, perawatan pasca-henti, ACS, stroke, dan kondisi khusus.', ref: 'American Heart Association (Guidelines 2020, Focused Update 2023, Guidelines 2025)' },
};
export const LEVELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

/** Semua flashcard: dari topik (cards) + kartu tambahan ECG & obat. */
export const ALL_CARDS = [];
for (const t of TOPICS) (t.cards || []).forEach((c, i) => ALL_CARDS.push({ id: `${t.id}#${i}`, topic: t.id, module: t.module, front: c[0], back: c[1], src: 'topic' }));
import { ECGS } from './ecg.js';
import { DRUGS } from './drugs.js';
for (const e of ECGS) ALL_CARDS.push({ id: `ecg#${e.id}`, topic: e.topic, module: 'acls', front: 'Identifikasi ritme ini', ecg: e.id, back: `${e.name} — ${e.features[0]}. Tatalaksana: ${e.mgmt}`, src: 'ecg' });
for (const d of DRUGS) if (d.mnemonic && d.mnemonic !== '—') ALL_CARDS.push({ id: `drug#${d.id}`, topic: null, module: d.module[0], front: `Dosis dewasa & mnemonic: ${d.name}?`, back: `${d.adult}\n\nMnemonic: ${d.mnemonic}`, src: 'drug' });
