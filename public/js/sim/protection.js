// Modely nadproudových ochran.
// Tepelná spoušť (bimetal): tepelný model 1. řádu  dθ/dt = (x² − θ)/τ,  vybaví při θ ≥ k².
//   Pro studený stav z toho plyne doba vybavení  t = τ · ln(x² / (x² − k²)).
// Elektromagnetická spoušť: okamžité vybavení nad násobkem jmenovitého proudu.
// Pojistka: vypínací charakteristika (tabulka) + součet poškození Σ dt / t(x) ≥ 1.

export const MCB_RATINGS = [1, 2, 4, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
export const MCB_MAG = { B: [3, 5], C: [5, 10], D: [10, 20] };
export const MPCB_RANGES = [
  [0.63, 1], [1, 1.6], [1.6, 2.5], [2.5, 4], [4, 6.3], [6.3, 10], [9, 14], [13, 18], [17, 23], [20, 25],
  [23, 32], [30, 40], [37, 50], [48, 65], [63, 80],
];
export const FUSE_RATINGS = [2, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160];

const coldTime = (x, k, tau) => (x <= k ? Infinity : tau * Math.log((x * x) / (x * x - k * k)));

// --- Tepelný článek (bimetal) ------------------------------------------------------------
class Thermal {
  constructor({ k, tau, kLo, tauLo, kHi, tauHi }) {
    Object.assign(this, { k, tau, kLo, tauLo, kHi, tauHi });
    this.theta = 0;
  }
  update(dt, x) {
    this.theta += ((x * x - this.theta) / this.tau) * dt;
    if (this.theta < 0) this.theta = 0;
    return this.theta >= this.k * this.k;
  }
  get level() { return this.theta / (this.k * this.k); }
  curve(x) { return coldTime(x, this.k, this.tau); }
  hotCurve(x) {
    // z ustáleného stavu při jmenovitém proudu (θ = 1)
    if (x <= this.k) return Infinity;
    return this.tau * Math.log((x * x - 1) / (x * x - this.k * this.k));
  }
  band(x) { return [coldTime(x, this.kLo, this.tauLo), coldTime(x, this.kHi, this.tauHi)]; }
}

// --- Pojistka gG -------------------------------------------------------------------------------
// Střední tavná charakteristika (násobek In → čas v s), odvozeno z mezí IEC 60269.
const GG_CURVE = [
  [1.3, 3e4], [1.6, 3600], [2, 400], [2.5, 70], [3, 20], [4, 4.5], [5, 1.5], [6, 0.6], [8, 0.13],
  [10, 0.045], [15, 0.009], [20, 0.004], [40, 0.001], [1000, 1e-5],
];
function ggTime(x) {
  if (x < GG_CURVE[0][0]) return Infinity;
  for (let i = 1; i < GG_CURVE.length; i++) {
    const [x1, t1] = GG_CURVE[i];
    if (x <= x1) {
      const [x0, t0] = GG_CURVE[i - 1];
      const f = Math.log(x / x0) / Math.log(x1 / x0);
      return Math.exp(Math.log(t0) + f * (Math.log(t1) - Math.log(t0)));
    }
  }
  return 1e-5;
}

class Fuse {
  constructor(In, spread) {
    this.In = In;
    this.spread = spread; // výrobní rozptyl (každá pojistka je trochu jiná)
    this.damage = 0;
    this.blown = false;
  }
  update(dt, I) {
    if (this.blown) return false;
    const x = (I / this.In) * this.spread;
    const t = ggTime(x);
    if (Number.isFinite(t)) this.damage += dt / t;
    else this.damage = Math.max(0, this.damage - (dt / 120) * this.damage);
    if (this.damage >= 1) { this.blown = true; return true; }
    return false;
  }
}

// --- Přístroje -------------------------------------------------------------------------------------
// Každý přístroj: update(dt, [I1, I2, I3], ctx) → null | {kind, label}; reset(); stav; křivky pro graf.

export class MCB {
  constructor({ char = 'C', In = 16 }) {
    this.type = 'mcb';
    this.char = char;
    this.In = In;
    this.mag = MCB_MAG[char];
    this.magTrip = (this.mag[0] + this.mag[1]) / 2;
    this.thermal = new Thermal({ k: 1.3, tau: 40, kLo: 1.13, tauLo: 15, kHi: 1.45, tauHi: 100 });
    this.closed = true;
    this.magTimer = 0;
  }
  get name() { return `Jistič ${this.char}${this.In}`; }
  get ref() { return this.In; }
  update(dt, I) {
    if (!this.closed) { this.thermal.update(dt, 0); return null; }
    const x = Math.max(...I) / this.In;
    if (x >= this.magTrip) {
      this.magTimer += dt;
      if (this.magTimer >= 0.008) { this.closed = false; return { kind: 'mag', label: `${this.name}: elektromagnetická spoušť (${x.toFixed(1)} × In)` }; }
    } else this.magTimer = 0;
    if (this.thermal.update(dt, x)) {
      this.closed = false;
      return { kind: 'thermal', label: `${this.name}: tepelná spoušť – přetížení` };
    }
    return null;
  }
  canReset() { return true; }
  reset() { this.closed = true; this.magTimer = 0; }
  get level() { return this.thermal.level; }
  curves() {
    return {
      ref: this.In,
      model: (x) => Math.min(this.thermal.curve(x), x >= this.magTrip ? 0.008 : Infinity),
      band: (x) => {
        const [lo, hi] = this.thermal.band(x);
        return [x >= this.mag[0] ? 0.005 : lo, x >= this.mag[1] ? 0.02 : hi];
      },
      magBand: this.mag,
    };
  }
}

export class MPCB {
  constructor({ range = [6.3, 10], Ir = 8, cls = 10 }) {
    this.type = 'mpcb';
    this.range = range;
    this.Ir = Ir;
    this.cls = cls;
    this.magTrip = 13 * range[1];
    // Třída 10: při 7,2 × Ir vybaví za 4–10 s; třída 20: 6–20 s.
    const tMid = cls === 20 ? 14 : 7;
    const [tLo, tHi] = cls === 20 ? [6, 20] : [4, 10];
    const tauFor = (t, k) => t / Math.log(51.84 / (51.84 - k * k));
    this.thermal = new Thermal({
      k: 1.125, tau: tauFor(tMid, 1.125), kLo: 1.05, tauLo: tauFor(tLo, 1.05), kHi: 1.2, tauHi: tauFor(tHi, 1.2),
    });
    this.closed = true;
    this.magTimer = 0;
  }
  get name() { return `Motorový spouštěč ${this.range[0]}–${this.range[1]} A`; }
  get ref() { return this.Ir; }
  update(dt, I) {
    if (!this.closed) { this.thermal.update(dt, 0); return null; }
    const max = Math.max(...I);
    const min = Math.min(...I);
    if (max >= this.magTrip) {
      this.magTimer += dt;
      if (this.magTimer >= 0.006) { this.closed = false; return { kind: 'mag', label: `${this.name}: zkratová spoušť (${Math.round(max)} A)` }; }
    } else this.magTimer = 0;
    // Citlivost na výpadek fáze (diferenciální mechanismus bimetalů).
    const imbalance = max > 0.3 * this.Ir && min < 0.5 * max;
    const x = (max / this.Ir) * (imbalance ? 1.15 : 1);
    if (this.thermal.update(dt, x)) {
      this.closed = false;
      return { kind: 'thermal', label: `${this.name}: tepelná spoušť${imbalance ? ' – nesymetrie / výpadek fáze' : ' – přetížení'}` };
    }
    return null;
  }
  canReset() { return this.thermal.level < 0.85; }
  reset() { this.closed = true; this.magTimer = 0; }
  get level() { return this.thermal.level; }
  curves() {
    return {
      ref: this.Ir,
      model: (x) => Math.min(this.thermal.curve(x), x * this.Ir >= this.magTrip ? 0.006 : Infinity),
      hot: (x) => this.thermal.hotCurve(x),
      band: (x) => {
        const [lo, hi] = this.thermal.band(x);
        const xi = this.magTrip / this.Ir;
        return [x >= xi * 0.8 ? 0.004 : lo, x >= xi * 1.2 ? 0.02 : hi];
      },
      magBand: [(this.magTrip * 0.8) / this.Ir, (this.magTrip * 1.2) / this.Ir],
    };
  }
}

// Pojistky gG ve všech třech fázích + tepelné nadproudové relé (třída 10A).
export class FuseOLR {
  constructor({ fuseIn = 20, range = [6.3, 10], Ir = 8 }) {
    this.type = 'fuse';
    this.fuseIn = fuseIn;
    this.range = range;
    this.Ir = Ir;
    const spread = [1, 0.97, 1.03].sort(() => Math.random() - 0.5);
    this.fuses = spread.map((s) => new Fuse(fuseIn, s));
    const tauFor = (t, k) => t / Math.log(51.84 / (51.84 - k * k));
    this.thermal = new Thermal({ k: 1.125, tau: tauFor(7, 1.125), kLo: 1.05, tauLo: tauFor(2, 1.05), kHi: 1.2, tauHi: tauFor(10, 1.2) });
    this.olrTripped = false;
    this.closed = true; // hlavní vypínač Q1
  }
  get name() { return `Pojistky gG ${this.fuseIn} A + relé ${this.range[0]}–${this.range[1]} A`; }
  get ref() { return this.Ir; }
  phaseOk(k) { return !this.fuses[k].blown; }
  update(dt, I) {
    let ev = null;
    this.fuses.forEach((f, k) => {
      if (f.update(dt, I[k])) ev = { kind: 'fuse', label: `Přetavila se pojistka F1 ve fázi L${k + 1} (${Math.round(I[k])} A)` };
    });
    if (ev) return ev;
    const max = Math.max(...I);
    const min = Math.min(...I);
    const imbalance = max > 0.3 * this.Ir && min < 0.5 * max;
    const x = (max / this.Ir) * (imbalance ? 1.15 : 1);
    const trip = this.thermal.update(dt, x);
    if (trip && !this.olrTripped) {
      this.olrTripped = true;
      return { kind: 'olr', label: `Tepelné relé F2 rozepnulo 95–96${imbalance ? ' – výpadek fáze' : ' – přetížení'}` };
    }
    return null;
  }
  canReset() { return this.thermal.level < 0.85; }
  reset() {
    this.olrTripped = false;
    this.fuses.forEach((f) => { if (f.blown) { f.blown = false; f.damage = 0; } });
  }
  get level() { return Math.max(this.thermal.level, ...this.fuses.map((f) => f.damage)); }
  curves() {
    const r = this.fuseIn / this.Ir;
    return {
      ref: this.Ir,
      model: (x) => Math.min(this.thermal.curve(x), ggTime(x / r)),
      hot: (x) => this.thermal.hotCurve(x),
      band: (x) => {
        const [lo, hi] = this.thermal.band(x);
        const f = ggTime(x / r);
        return [Math.min(lo, f * 0.5), Math.min(hi, f * 1.8)];
      },
      fuse: (x) => ggTime(x / r),
    };
  }
}

export function suggestMcb(In) {
  return MCB_RATINGS.find((r) => r >= In * 1.05) || MCB_RATINGS.at(-1);
}
export function suggestRange(In) {
  return MPCB_RANGES.findIndex(([a, b]) => In >= a && In <= b * 0.98);
}
export function suggestFuse(In) {
  return FUSE_RATINGS.find((r) => r >= In * 2) || FUSE_RATINGS.at(-1);
}
