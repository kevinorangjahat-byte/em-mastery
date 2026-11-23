import { get } from '../core/store.js';
import { esc } from '../core/util.js';
import { TOPICS, MODULES, LEVELS } from '../data/index.js';
import { mastery, moduleProgress } from '../core/analytics.js';

export function topicCard(t) {
  const p = get('progress')[t.id] || {};
  const m = mastery(t.id);
  const status = p.mastered ? '<span class="badge ok">✔ Mastered</span>' : p.read ? '<span class="badge primary">Dibaca</span>' : p.visits ? '<span class="badge warn">Sedang</span>' : '';
  return `<a class="card card-link" href="#/topic/${t.id}">
    <div class="row between"><span class="badge ${t.module}">${t.module.toUpperCase()}</span><span class="xs muted">${LEVELS[t.level]} · ${t.minutes} mnt</span></div>
    <h3 style="margin:8px 0 4px">${esc(t.title)}</h3>
    <p class="small muted" style="min-height:3em">${esc(t.summary)}</p>
    <div class="row between xs"><span>${status}</span><span class="muted">Mastery ${m}%</span></div>
    <div class="bar ${t.module}" style="margin-top:6px"><span style="width:${m}%"></span></div>
  </a>`;
}

export function render(el, [mod]) {
  const mods = mod ? [MODULES[mod]] : Object.values(MODULES);
  el.innerHTML = mods.map(M => {
    const pr = moduleProgress(M.id);
    const ts = TOPICS.filter(t => t.module === M.id);
    return `
    <div class="page-head">
      <div><span class="badge ${M.id}">${M.name}</span><h1 style="margin-top:6px">${M.full}</h1><p>${esc(M.desc)}</p><p class="xs muted">Sumber utama: ${esc(M.ref)}</p></div>
      <div class="card" style="min-width:220px"><div class="small muted">Progress modul</div><b style="font-size:1.4rem">${pr.avgMastery}%</b><div class="bar ${M.id}"><span style="width:${pr.avgMastery}%"></span></div><div class="xs muted mt">${pr.read}/${pr.total} dibaca · ${pr.mastered} mastered</div></div>
    </div>
    ${[1, 2, 3].map(l => { const lt = ts.filter(t => t.level === l); return lt.length ? `<h2 class="mt">${LEVELS[l]}</h2><div class="grid gauto">${lt.map(topicCard).join('')}</div>` : ''; }).join('')}
    <hr>`;
  }).join('');
}
