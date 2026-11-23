// =============================================================
// Generator strip EKG sintetis (SVG) — skematik untuk edukasi.
// Kertas standar: 25 mm/detik, 10 mm/mV. 1 kotak kecil = 0,04 s.
// Bentuk gelombang disederhanakan (model penjumlahan Gaussian),
// bukan rekaman pasien nyata.
// =============================================================
import { seeded } from '../core/util.js';

const PX_MM = 4;            // 1 mm = 4 px
const MM_S = 25;            // 25 mm/s
const MM_MV = 10;           // 10 mm/mV
const FS = 250;             // sampel per detik

const g = (t, mu, sd, a) => { const x = (t - mu) / sd; return a * Math.exp(-0.5 * x * x); };
const sig = x => 1 / (1 + Math.exp(-x));
const win = (t, a, b, k) => sig((t - a) / k) * sig((b - t) / k);

function beatSignal(t, b) {
  const d = t - b.t;
  if (d < -0.5 || d > 0.8) return 0;
  let v = 0;
  const w = b.wide ? 2.6 : 1;
  if (b.qrs !== false) {
    v += g(t, b.t - 0.022 * w, 0.008 * w, -0.08);
    v += g(t, b.t, 0.011 * w, b.rAmp ?? 1.1);
    v += g(t, b.t + 0.024 * w, 0.009 * w, b.sAmp ?? -0.25);
    if (b.delta) v += g(t, b.t - 0.045, 0.02, 0.28);
    if (b.st) v += b.st * win(t, b.t + 0.035 * w, b.t + (b.tOff ?? 0.26) - 0.02, 0.012);
    v += g(t, b.t + (b.tOff ?? 0.26), b.tSd ?? 0.045, b.tAmp ?? 0.3);
  }
  return v;
}
const pWave = (t, pt, amp = 0.15) => g(t, pt + 0.045, 0.022, amp);

function regularBeats(rate, dur, opts = {}, jitter = 0, rnd = Math.random) {
  const rr = 60 / rate; const out = [];
  const tOff = Math.min(0.34, Math.max(0.17, 0.3 * Math.sqrt(rr)));
  for (let t = 0.35; t < dur + 0.5; t += rr * (1 + (rnd() - 0.5) * jitter)) out.push({ t, tOff, ...opts });
  return out;
}

/** Definisi ritme → { beats: [...], ps: [p times], base: fn(t) } */
const RHYTHMS = {
  nsr: () => ({ beats: regularBeats(75, 6, { pr: 0.16 }, 0.03) }),
  'sinus-brady': () => ({ beats: regularBeats(44, 6, { pr: 0.17 }, 0.02) }),
  'sinus-tachy': () => ({ beats: regularBeats(125, 6, { pr: 0.13 }, 0.02) }),
  avb1: () => ({ beats: regularBeats(68, 6, { pr: 0.32 }, 0.02) }),
  mobitz1: () => {
    const beats = []; const ps = []; let t = 0.3; const prs = [0.16, 0.25, 0.31, null];
    for (let i = 0; t < 6.5; i++) {
      const pr = prs[i % 4];
      ps.push(t);
      if (pr) beats.push({ t: t + pr, p: false, tOff: 0.28 });
      t += 0.78;
    }
    return { beats, ps };
  },
  mobitz2: () => {
    const beats = []; const ps = []; let t = 0.3;
    for (let i = 0; t < 6.5; i++) { ps.push(t); if (i % 3 !== 2) beats.push({ t: t + 0.17, p: false, tOff: 0.28 }); t += 0.75; }
    return { beats, ps };
  },
  avb3: () => {
    const ps = []; for (let t = 0.2; t < 6.5; t += 0.72) ps.push(t);
    const beats = []; for (let t = 0.6; t < 6.5; t += 1.55) beats.push({ t, p: false, wide: true, rAmp: 0.9, sAmp: -0.4, tAmp: -0.35, tOff: 0.36 });
    return { beats, ps };
  },
  junctional: () => ({ beats: regularBeats(48, 6, { p: false }, 0.01) }),
  af: (rnd) => {
    const beats = []; let t = 0.3;
    while (t < 6.5) { beats.push({ t, p: false, tOff: 0.22, tAmp: 0.22 }); t += 0.38 + rnd() * 0.55; }
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    return { beats, base: tt => 0.035 * Math.sin(2 * Math.PI * 6.3 * tt + ph[0]) + 0.025 * Math.sin(2 * Math.PI * 8.7 * tt + ph[1]) + 0.02 * Math.sin(2 * Math.PI * 4.9 * tt + ph[2]) };
  },
  aflutter: () => {
    const fw = 0.2; // 300/menit
    const beats = []; for (let t = 0.32; t < 6.5; t += fw * 4) beats.push({ t, p: false, tOff: 0.24, tAmp: 0.0 });
    return { beats, base: tt => { const ph = ((tt % fw) / fw); return ph < 0.75 ? 0.12 - (ph / 0.75) * 0.32 : -0.2 + ((ph - 0.75) / 0.25) * 0.32; } };
  },
  svt: () => ({ beats: regularBeats(185, 6, { p: false, tOff: 0.17, tAmp: 0.22, st: -0.05 }, 0) }),
  vt: () => ({ beats: regularBeats(175, 6, { p: false, wide: true, rAmp: 1.3, sAmp: -0.5, tAmp: -0.45, tOff: 0.2, tSd: 0.05 }, 0) }),
  torsades: () => ({ beats: [], base: tt => { const env = 0.15 + 0.85 * Math.abs(Math.sin(Math.PI * tt / 2.2)); return env * 0.75 * Math.sin(2 * Math.PI * 4 * tt) * (1 + 0.15 * Math.sin(2 * Math.PI * 9 * tt)); } }),
  vf: (rnd) => { const f = [4.1 + rnd(), 5.6 + rnd(), 7.3 + rnd()]; const ph = [rnd() * 6, rnd() * 6, rnd() * 6]; return { beats: [], base: tt => (0.25 + 0.15 * Math.sin(tt * 1.3 + ph[0])) * Math.sin(2 * Math.PI * f[0] * tt + ph[0]) + 0.15 * Math.sin(2 * Math.PI * f[1] * tt + ph[1]) + 0.08 * Math.sin(2 * Math.PI * f[2] * tt + ph[2]) }; },
  asystole: (rnd) => { const ph = rnd() * 6; return { beats: [], base: tt => 0.015 * Math.sin(tt * 1.7 + ph) + 0.006 * Math.sin(tt * 23 + ph) }; },
  pea: () => ({ beats: regularBeats(52, 6, { pr: 0.18, rAmp: 0.8, tAmp: 0.2 }, 0.02) }),
  stemi: () => ({ beats: regularBeats(82, 6, { pr: 0.16, st: 0.38, tAmp: 0.5, sAmp: -0.03, tOff: 0.27 }, 0.02) }),
  nstemi: () => ({ beats: regularBeats(88, 6, { pr: 0.16, st: -0.18, tAmp: -0.18, tOff: 0.27 }, 0.02) }),
  hyperk: () => ({ beats: regularBeats(62, 6, { pr: 0.22, pAmp: 0.04, wide: true, rAmp: 0.8, sAmp: -0.35, tAmp: 0.95, tSd: 0.03, tOff: 0.3 }, 0.01) }),
  wpw: () => ({ beats: regularBeats(80, 6, { pr: 0.1, delta: true, tOff: 0.28 }, 0.02) }),
};
export const RHYTHM_IDS = Object.keys(RHYTHMS);

export function renderECG(id, { seconds = 6, label = '', height = 150 } = {}) {
  const make = RHYTHMS[id];
  if (!make) return '';
  const rnd = seeded('ecg-' + id);
  const r = make(rnd);
  const W = seconds * MM_S * PX_MM, H = height, base = H * 0.58;
  const scale = MM_MV * PX_MM;
  let d = '';
  for (let i = 0; i <= seconds * FS; i++) {
    const t = i / FS;
    let v = r.base ? r.base(t) : 0;
    for (const b of r.beats) {
      v += beatSignal(t, b);
      if (b.p !== false) v += pWave(t, b.t - (b.pr || 0.16), b.pAmp ?? 0.15);
    }
    if (r.ps) for (const pt of r.ps) if (Math.abs(t - pt) < 0.2) v += pWave(t, pt);
    const x = (t * MM_S * PX_MM).toFixed(1), y = (base - v * scale).toFixed(1);
    d += (i ? 'L' : 'M') + x + ' ' + y;
  }
  const uid = 'g' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMid meet" role="img" aria-label="Strip EKG ${label || id}">
    <defs>
      <pattern id="${uid}s" width="${PX_MM}" height="${PX_MM}" patternUnits="userSpaceOnUse"><path d="M ${PX_MM} 0 L 0 0 0 ${PX_MM}" class="ecg-g1" fill="none"/></pattern>
      <pattern id="${uid}b" width="${PX_MM * 5}" height="${PX_MM * 5}" patternUnits="userSpaceOnUse"><rect width="${PX_MM * 5}" height="${PX_MM * 5}" fill="url(#${uid}s)"/><path d="M ${PX_MM * 5} 0 L 0 0 0 ${PX_MM * 5}" class="ecg-g2" fill="none"/></pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#${uid}b)"/>
    <path d="${d}" class="ecg-line"/>
    ${label ? `<text x="8" y="16" font-size="12" fill="currentColor" opacity=".7" font-family="ui-monospace,monospace">${label}</text>` : ''}
    <text x="${W - 8}" y="${H - 8}" font-size="10" text-anchor="end" fill="currentColor" opacity=".5" font-family="ui-monospace,monospace">25 mm/s · 10 mm/mV · skematik</text>
  </svg>`;
}
