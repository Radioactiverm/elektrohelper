// Model třífázového asynchronního motoru s kotvou nakrátko.
// Náhradní schéma (Γ-článek, na fázi, ekvivalentní hvězda):
//   Uf ── R1 + R2(s)/s + jXk(s) ──┐   R2(s) = R2n · (1 + c·s·f/fn)  … vliv hluboké drážky
//      └────────── jXm ────────────┘   Xk(s) = Xk0 / (1 + d·s)       … nasycení rozptylu při rozběhu
// Parametry se dopočítají ze štítkových hodnot optimalizací (Nelder–Mead).

// --- Komplexní čísla ------------------------------------------------------------
const C = (re, im = 0) => ({ re, im });
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const abs = (a) => Math.hypot(a.re, a.im);
const arg = (a) => Math.atan2(a.im, a.re);
const par = (a, b) => div(mul(a, b), add(a, b));

export const FN = 50; // Hz

// Typické 4pólové motory IE3, 400 V Δ (katalogové hodnoty zaokrouhlené).
export const MOTORS = [
  { id: '0.75', Pn: 0.75, In: 1.75, nn: 1435, cos: 0.76, eta: 82.5, IaIn: 6.0, TaTn: 2.5, TkTn: 2.9, J: 0.0025 },
  { id: '1.5', Pn: 1.5, In: 3.2, nn: 1440, cos: 0.79, eta: 85.3, IaIn: 7.0, TaTn: 2.4, TkTn: 3.2, J: 0.0045 },
  { id: '4', Pn: 4, In: 7.9, nn: 1460, cos: 0.81, eta: 89.6, IaIn: 7.6, TaTn: 2.4, TkTn: 3.3, J: 0.016 },
  { id: '7.5', Pn: 7.5, In: 14.3, nn: 1470, cos: 0.83, eta: 91.4, IaIn: 7.4, TaTn: 2.5, TkTn: 3.2, J: 0.04 },
  { id: '15', Pn: 15, In: 27.8, nn: 1475, cos: 0.84, eta: 92.6, IaIn: 7.6, TaTn: 2.6, TkTn: 3.3, J: 0.1 },
  { id: '37', Pn: 37, In: 66.8, nn: 1482, cos: 0.85, eta: 94.0, IaIn: 7.3, TaTn: 2.4, TkTn: 3.0, J: 0.3 },
];

export function nameplate(m) {
  const Un = 400;
  const pp = Math.round((60 * FN) / m.nn - 0.5) || 1; // počet pólových dvojic
  const ns = (60 * FN) / pp;
  const sn = (ns - m.nn) / ns;
  const Tn = (m.Pn * 1000) / ((2 * Math.PI * m.nn) / 60);
  return { ...m, Un, pp, ns, sn, Tn, ws: (2 * Math.PI * FN) / pp, Ia: m.In * m.IaIn };
}

// Vyhodnocení náhradního schématu.
// s – skluz vůči synchronním otáčkám při frekvenci f; u – poměrné napětí (1 = Un);
// fF – poměrná frekvence (1 = 50 Hz); lost – index chybějící fáze (0..2) nebo -1.
export function evaluate(p, s, { u = 1, fF = 1, lost = -1 } = {}) {
  const se = Math.abs(s) < 1e-6 ? (s < 0 ? -1e-6 : 1e-6) : s;
  const Uph = (p.Un / Math.sqrt(3)) * u;
  const ws = p.ws * fF;
  const r2 = (x) => p.R2 * (1 + p.c * Math.abs(x) * fF);
  const Z2 = (x) => C(p.R1 + r2(x) / x, (p.Xk * fF) / (1 + p.d * Math.min(Math.abs(x), 2)));
  const Zm = C(0, p.Xm * fF);

  if (lost < 0) {
    const z2 = Z2(se);
    const zin = par(z2, Zm);
    const I1 = div(C(Uph), zin);
    const I2 = div(C(Uph), z2);
    const i2 = abs(I2);
    const Te = (3 * i2 * i2 * r2(se)) / se / ws;
    const phi = arg(zin); // proud se zpožďuje o φ
    return { I: abs(I1), phi, Te, Pin: 3 * Uph * abs(I1) * Math.cos(phi), cos: Math.cos(phi) };
  }

  // Výpadek fáze: sousledná + zpětná složka v sérii (Zp + Zn), sdružené napětí.
  const sn = 2 - se;
  const zp = par(Z2(se), Zm);
  const zn = par(Z2(sn), Zm);
  const ztot = add(zp, zn);
  const Ul = Uph * Math.sqrt(3);
  const Iline = Ul / abs(ztot);
  const Iseq = Iline / Math.sqrt(3);
  const I2p = (Iseq * abs(zp)) / abs(Z2(se));
  const I2n = (Iseq * abs(zn)) / abs(Z2(sn));
  const Te = (3 / ws) * ((I2p * I2p * r2(se)) / se - (I2n * I2n * r2(sn)) / sn);
  const phi = arg(ztot);
  return { I: Iline, phi, Te, Pin: Ul * Iline * Math.cos(phi), cos: Math.cos(phi) };
}

// --- Nelder–Mead ------------------------------------------------------------------
function nelderMead(f, x0, { iters = 2500, step = 0.3 } = {}) {
  const n = x0.length;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const x = x0.slice();
    x[i] += step;
    simplex.push(x);
  }
  let vals = simplex.map(f);
  for (let k = 0; k < iters; k++) {
    const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
    simplex = idx.map((i) => simplex[i]);
    vals = idx.map((i) => vals[i]);
    if (vals[n] - vals[0] < 1e-14) break;
    const cen = Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cen[j] += simplex[i][j] / n;
    const pt = (t) => cen.map((c, j) => c + t * (simplex[n][j] - c));
    const xr = pt(-1);
    const fr = f(xr);
    if (fr < vals[0]) {
      const xe = pt(-2);
      const fe = f(xe);
      if (fe < fr) { simplex[n] = xe; vals[n] = fe; } else { simplex[n] = xr; vals[n] = fr; }
    } else if (fr < vals[n - 1]) {
      simplex[n] = xr; vals[n] = fr;
    } else {
      const xc = pt(fr < vals[n] ? -0.5 : 0.5);
      const fc = f(xc);
      if (fc < Math.min(fr, vals[n])) { simplex[n] = xc; vals[n] = fc; } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          vals[i] = f(simplex[i]);
        }
      }
    }
  }
  return { x: simplex[0], fx: vals[0] };
}

const SLIPS = Array.from({ length: 160 }, (_, i) => 0.002 * (1.0 / 0.002) ** (i / 159)); // 0,002 … 1 log.

export function breakdown(p, opts) {
  let best = { s: 0, T: -Infinity };
  for (const s of SLIPS) {
    const T = evaluate(p, s, opts).Te;
    if (T > best.T) best = { s, T };
  }
  return best;
}

const cache = new Map();

export function fitMotor(spec) {
  const m = nameplate(spec);
  if (cache.has(m.id)) return cache.get(m.id);
  const Uph = m.Un / Math.sqrt(3);
  const Zb = Uph / m.In;
  const base = {
    Un: m.Un, ws: m.ws,
  };
  const unpack = (x) => ({
    ...base, R1: Math.exp(x[0]), R2: Math.exp(x[1]), c: Math.exp(x[2]), Xk: Math.exp(x[3]), Xm: Math.exp(x[4]),
    d: Math.exp(x[5]),
  });
  const sq = (a, b) => Math.log(a / b) ** 2;
  const cost = (x) => {
    const p = unpack(x);
    const rn = evaluate(p, m.sn);
    const ra = evaluate(p, 1);
    const bk = breakdown(p);
    if (!Number.isFinite(rn.Te) || rn.Te <= 0 || ra.Te <= 0) return 1e9;
    // Kromě štítku držíme i fyzikální realitu: skluz zvratu podle Klossova vztahu,
    // účiník při záběru ~0,4 a poměr R1/R2 ~1,2.
    return sq(rn.Te, m.Tn) * 4 + sq(bk.T, m.Tn * m.TkTn) + sq(ra.Te, m.Tn * m.TaTn)
      + sq(ra.I, m.Ia) + sq(rn.I, m.In) * 2 + 0.3 * sq(rn.cos, m.cos)
      + 0.3 * sq(bk.s, skTarget) + 0.3 * sq(ra.cos, 0.42) + 0.1 * sq(p.R1 / p.R2, 1.2);
  };
  const skTarget = m.sn * (m.TkTn + Math.sqrt(m.TkTn ** 2 - 1));
  const x0 = [Math.log(0.03 * Zb), Math.log(m.sn * Zb * 0.8), Math.log(2), Math.log(Uph / m.Ia * 0.9), Math.log(Uph / (0.45 * m.In)), Math.log(0.4)];
  let r = nelderMead(cost, x0);
  r = nelderMead(cost, r.x, { step: 0.1 });
  const p = { ...unpack(r.x), spec: m, fitError: r.fx };
  cache.set(m.id, p);
  return p;
}
