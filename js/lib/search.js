// Mesin pencarian lokal sederhana (scoring berbasis token) untuk search & retrieval AI tutor.
import { TOPICS } from '../data/index.js';
import { DRUGS } from '../data/drugs.js';
import { ECGS } from '../data/ecg.js';
import { ALGORITHMS } from '../data/algorithms.js';
import { CASES } from '../data/cases.js';

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[*_`[\]]/g, '');
const flat = v => Array.isArray(v) ? v.map(flat).join(' ') : typeof v === 'object' && v ? Object.values(v).map(flat).join(' ') : String(v ?? '');

let INDEX = null;
function build() {
  INDEX = [
    ...TOPICS.map(t => ({ kind: 'Topik', id: t.id, title: t.title, href: `#/topic/${t.id}`, badge: t.module, title_n: norm(t.title), text: norm(flat([t.summary, t.concept, t.patho, t.presentation, t.assessment, t.diagnosis, t.management, t.doses, t.pitfalls, t.redFlags, t.pearls, t.highYield, t.indications, t.contraindications, t.cards])), raw: t })),
    ...DRUGS.map(d => ({ kind: 'Obat', id: d.id, title: d.name, href: `#/drugs/${d.id}`, badge: d.module[0], title_n: norm(d.name + ' ' + d.cls), text: norm(flat([d.indications, d.adult, d.peds, d.contra, d.precautions, d.mnemonic])), raw: d })),
    ...ECGS.map(e => ({ kind: 'EKG', id: e.id, title: e.name, href: `#/ecg/${e.id}`, badge: 'acls', title_n: norm(e.name + ' ' + e.cat), text: norm(flat([e.features, e.causes, e.mgmt, e.p, e.qrs])), raw: e })),
    ...ALGORITHMS.map(a => ({ kind: 'Algoritma', id: a.id, title: a.title, href: `#/algorithms/${a.id}`, badge: a.module, title_n: norm(a.title), text: norm(flat([a.desc, Object.values(a.nodes).map(n => [n.title, n.text, n.bullets])])), raw: a })),
    ...CASES.map(c => ({ kind: 'Kasus', id: c.id, title: c.title, href: `#/cases/${c.id}`, badge: c.module, title_n: norm(c.title), text: norm(flat([c.brief, c.mist])), raw: c })),
  ];
}

export function search(q, limit = 40) {
  if (!INDEX) build();
  const terms = norm(q).split(/\s+/).filter(w => w.length > 1);
  if (!terms.length) return [];
  const out = [];
  for (const it of INDEX) {
    let s = 0, hit = 0;
    for (const w of terms) {
      const inT = it.title_n.includes(w); const n = it.text.split(w).length - 1;
      if (inT || n) hit++;
      s += (inT ? 10 : 0) + Math.min(n, 6);
    }
    if (hit === terms.length || (terms.length > 2 && hit >= terms.length - 1)) {
      if (it.title_n.includes(norm(q))) s += 15;
      const i = it.text.indexOf(terms[0]);
      out.push({ ...it, score: s, snippet: i >= 0 ? it.text.slice(Math.max(0, i - 60), i + 140) : '' });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
