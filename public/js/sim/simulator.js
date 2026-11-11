// Simulátor třífázového motoru – řízení, fyzikální smyčka a grafy.
import { MOTORS, nameplate, fitMotor, evaluate, breakdown } from './motor.js';
import {
  MCB, MPCB, FuseOLR, MCB_RATINGS, MPCB_RANGES, FUSE_RATINGS, suggestMcb, suggestRange, suggestFuse,
} from './protection.js';
import { Plot, themeColors, fmt } from './plot.js';
import { snackbar, track, syncRange } from '../app.js';

const root = document.querySelector('[data-sim]');
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];
const nf = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString('cs-CZ', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');

const DT = 0.0005; // krok simulace 0,5 ms
const TWO_PI = Math.PI * 2;
const PH = [0, -TWO_PI / 3, TWO_PI / 3]; // fázový posun L1, L2, L3

// --- Ovládací prvky ----------------------------------------------------------------
const form = {
  get(name) {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el) return null;
    if (el.type === 'radio') return root.querySelector(`[name="${name}"]:checked`)?.value;
    return el.value;
  },
  num(name) { return Number(this.get(name)); },
};

const motorSel = $('[data-motor-select]');
for (const m of MOTORS) motorSel.add(new Option(`${String(m.Pn).replace('.', ',')} kW · In ${String(m.In).replace('.', ',')} A`, m.id));
motorSel.value = '4';

// --- Stav simulace ---------------------------------------------------------------------
const S = {
  t: 0,
  paused: false,
  speed: 1,
  omega: 0,
  thetaE: 0,
  km1: false,
  startT: 0,
  ydState: 'star',
  vfdF: 0,
  faults: { loss: [false, false, false], jam: false, short: false },
  I: [0, 0, 0],
  Te: 0,
  phi: 0,
  cos: 0,
  Pin: 0,
  u: 1,
  fF: 1,
  lost: -1,
  energized: false,
  dc: [0, 0, 0],
  dcT0: 0,
  pendingSwitch: false,
  tcc: [],
  tccNext: 0.005,
  prevConnected: false,
};

let M; // štítek
let P; // parametry náhradního schématu
let J; // celkový moment setrvačnosti
let tauDC;
let prot;

// Kruhové buffery
const SCOPE_N = 400; // 200 ms
const scope = { i: [new Float32Array(SCOPE_N), new Float32Array(SCOPE_N), new Float32Array(SCOPE_N)], pos: 0, count: 0 };
const HIST_N = 65536;
const HIST_DT = 0.01;
const hist = { t: new Float64Array(HIST_N), I: new Float32Array(HIST_N), n: new Float32Array(HIST_N), pos: 0, count: 0, next: 0 };

function resetBuffers() {
  scope.pos = 0; scope.count = 0;
  scope.i.forEach((a) => a.fill(0));
  hist.pos = 0; hist.count = 0; hist.next = 0;
}

// --- Záznam událostí --------------------------------------------------------------------------
const logEl = $('[data-sim-log]');
function log(text, cls = '') {
  const li = document.createElement('li');
  const time = document.createElement('time');
  time.textContent = `${nf(S.t, 3)} s`;
  const span = document.createElement('span');
  span.textContent = text;
  if (cls) span.className = cls;
  li.append(time, span);
  logEl.prepend(li);
  while (logEl.children.length > 200) logEl.lastChild.remove();
}

// --- Motor a ochrana ----------------------------------------------------------------------------
function setupMotor() {
  const spec = MOTORS.find((m) => m.id === motorSel.value);
  M = nameplate(spec);
  P = fitMotor(spec);
  J = M.J * (1 + form.num('inertia'));
  const xk1 = P.Xk / (1 + P.d);
  tauDC = (xk1 / (TWO_PI * 50)) / (P.R1 + P.R2 * (1 + P.c));
  $('[data-rating-plate]').innerHTML = `
    <span class="rp-title">3~ MOT · IE3 · ${M.pp * 2}p</span>
    <span><b>${nf(M.Pn, M.Pn < 1 ? 2 : 1)}</b> kW</span><span><b>400</b> V Δ</span><span><b>${nf(M.In, 2)}</b> A</span>
    <span><b>${M.nn}</b> min⁻¹</span><span>cos φ <b>${nf(M.cos, 2)}</b></span><span>η <b>${nf(M.eta, 1)}</b> %</span>
    <span>Ia/In <b>${nf(M.IaIn, 1)}</b></span><span>Ma/Mn <b>${nf(M.TaTn, 1)}</b></span><span>Mk/Mn <b>${nf(M.TkTn, 1)}</b></span>`;
  curveCache.clear();
}

function fillSelect(sel, items, value) {
  sel.innerHTML = '';
  for (const [v, label] of items) sel.add(new Option(label, v));
  sel.value = String(value);
}

function suggestProtection() {
  fillSelect($('[name="mcbIn"]'), MCB_RATINGS.map((r) => [r, `${r} A`]), suggestMcb(M.In));
  const ri = Math.max(0, suggestRange(M.In));
  fillSelect($('[name="mpcbRange"]'), MPCB_RANGES.map(([a, b], i) => [i, `${nf(a, a < 1 ? 2 : 1)} – ${nf(b, b < 10 ? 1 : 0)} A`]), ri);
  fillSelect($('[name="fuseIn"]'), FUSE_RATINGS.map((r) => [r, `gG ${r} A`]), suggestFuse(M.In));
  fillSelect($('[name="olrRange"]'), MPCB_RANGES.map(([a, b], i) => [i, `${nf(a, a < 1 ? 2 : 1)} – ${nf(b, b < 10 ? 1 : 0)} A`]), ri);
  syncIrSliders(true);
}

function syncIrSliders(setToIn = false) {
  for (const [rangeName, irName] of [['mpcbRange', 'mpcbIr'], ['olrRange', 'olrIr']]) {
    const [a, b] = MPCB_RANGES[form.num(rangeName)] || MPCB_RANGES[0];
    const s = root.querySelector(`[name="${irName}"]`);
    s.min = a; s.max = b; s.step = b <= 4 ? 0.01 : 0.1;
    if (setToIn) s.value = Math.min(b, Math.max(a, M.In));
    else s.value = Math.min(b, Math.max(a, Number(s.value)));
    syncRange(s);
    updateOutput(s);
  }
}

function buildProtection(keepState = false) {
  const type = $('[data-protection-select]').value;
  $$('[data-prot-opts]').forEach((el) => { el.hidden = el.dataset.protOpts !== type; });
  const old = prot;
  if (type === 'mcb') prot = new MCB({ char: form.get('mcbChar'), In: form.num('mcbIn') });
  else if (type === 'mpcb') {
    prot = new MPCB({ range: MPCB_RANGES[form.num('mpcbRange')], Ir: form.num('mpcbIr'), cls: form.num('mpcbClass') });
  } else {
    prot = new FuseOLR({ fuseIn: form.num('fuseIn'), range: MPCB_RANGES[form.num('olrRange')], Ir: form.num('olrIr') });
  }
  if (keepState && old?.thermal && prot.thermal) prot.thermal.theta = old.thermal.theta * ((old.ref / prot.ref) ** 2);
  updateHint();
  curveCache.clear();
}

function updateHint() {
  const hint = $('[data-prot-hint]');
  const type = $('[data-protection-select]').value;
  const ia = M.Ia;
  if (type === 'mcb') {
    const [lo, hi] = prot.mag;
    const ok = ia < lo * prot.In;
    hint.innerHTML = `Záběrový proud ≈ <b>${nf(ia, 0)} A</b> (${nf(M.IaIn, 1)} × In motoru). Zkratová spoušť ${prot.char}${prot.In} vybaví mezi <b>${nf(lo * prot.In, 0)}–${nf(hi * prot.In, 0)} A</b>. ${ok ? '✅ Rozběh by měl projít.' : '⚠️ Při přímém rozběhu hrozí vybavení.'} Jistič chrání hlavně vedení – na ochranu motoru proti přetížení není ideální.`;
  } else if (type === 'mpcb') {
    hint.innerHTML = `Nastav Ir na jmenovitý proud motoru (<b>${nf(M.In, 2)} A</b>). Zkratová spoušť pevně na 13 × ${nf(prot.range[1], 1)} A = <b>${nf(prot.magTrip, 0)} A</b>. Motorový spouštěč chrání proti přetížení, zkratu i výpadku fáze.`;
  } else {
    hint.innerHTML = `Pojistky gG musí přečkat rozběh (≈ ${nf(ia, 0)} A) – volí se zhruba 2–2,5 × In motoru. Proti přetížení chrání tepelné relé F2 nastavené na <b>${nf(M.In, 2)} A</b>.`;
  }
}

// --- Fyzika ---------------------------------------------------------------------------------------------
function phaseAvailable(k) {
  if (S.faults.loss[k]) return false;
  if (prot.type === 'fuse') return prot.closed && prot.phaseOk(k);
  return prot.closed;
}

function controlOk(hold = true) {
  const U = form.num('voltage') / 100;
  if (!phaseAvailable(0)) return { ok: false, why: 'ovládací obvod je napájen z L1, která chybí' };
  if (prot.type === 'fuse' && prot.olrTripped) return { ok: false, why: 'tepelné relé F2 je vybavené (rozepnutý kontakt 95–96)' };
  if (U < (hold ? 0.65 : 0.85)) return { ok: false, why: `nízké napětí (${nf(U * 100, 0)} %) – stykač ${hold ? 'odpadl' : 'nepřitáhne'}` };
  return { ok: true };
}

function loadTorque(omega) {
  const type = form.get('loadType');
  const k = form.num('load') / 100;
  const wn = (M.nn * TWO_PI) / 60;
  const fr = 0.015 * M.Tn * Math.min(1, omega / (0.02 * wn)); // tření ložisek
  if (type === 'none') return fr + 0.01 * M.Tn * (omega / wn);
  if (type === 'fan') return fr + k * M.Tn * (omega / wn) ** 2;
  return fr + k * M.Tn;
}

function step(dt) {
  S.t += dt;
  const mode = form.get('start');
  const U = form.num('voltage') / 100;

  // Stykač odpadne, když ztratí ovládací napětí.
  if (S.km1) {
    const c = controlOk(true);
    if (!c.ok) {
      S.km1 = false;
      log(`KM1 odpadl – ${c.why}`, 'ev-warn');
    }
  }

  // Způsob spouštění
  let uF = 1;
  let fF = 1;
  let connected = S.km1;
  if (S.km1) {
    const ts = S.t - S.startT;
    if (mode === 'yd') {
      const tsw = form.num('ydTime');
      if (S.ydState === 'star' && ts >= tsw) { S.ydState = 'gap'; log('KT: přepnutí z hvězdy – KM2 (Y) odpadl'); }
      if (S.ydState === 'gap' && ts >= tsw + 0.05) { S.ydState = 'delta'; S.pendingSwitch = true; log('KM3 (Δ) sepnul – motor v trojúhelníku', 'ev-ok'); }
      if (S.ydState === 'gap') connected = false;
      if (S.ydState === 'star') uF = 1 / Math.sqrt(3);
    } else if (mode === 'soft') {
      const u0 = form.num('softU0') / 100;
      uF = Math.min(1, u0 + (1 - u0) * (ts / form.num('softRamp')));
    } else if (mode === 'vfd') {
      const limit = (form.num('vfdLimit') / 100) * M.In;
      if (Math.max(...S.I) < limit) S.vfdF = Math.min(1, S.vfdF + dt / form.num('vfdRamp'));
      fF = Math.max(S.vfdF, 0.005);
      uF = Math.min(1, Math.max(fF, 0.06 + fF * 0.94)); // U/f s boostem
    }
  }
  S.u = U * uF;
  S.fF = fF;

  const avail = [0, 1, 2].map(phaseAvailable);
  const conn = avail.map((a) => a && connected);
  const nConn = conn.filter(Boolean).length;

  if (mode === 'vfd' && S.km1 && nConn < 3 && nConn > 0) {
    S.km1 = false;
    log('Měnič: ztráta vstupní fáze – porucha, motor vypnut', 'ev-trip');
  }

  if (connected && !S.prevConnected && nConn > 0) S.pendingSwitch = true;
  S.prevConnected = connected && nConn > 0;

  const ws = M.ws * fF;
  let slip = ws > 0 ? (ws - S.omega) / ws : 1;
  let res = null;
  let I = [0, 0, 0];
  S.lost = -1;
  if (S.faults.short && nConn >= 2) {
    const ik = form.num('ik') * 1000;
    I = conn.map((c) => (c ? (nConn === 3 ? ik : ik * 0.866) : 0));
    S.Te = 0;
    S.phi = 1.2;
    S.cos = Math.cos(1.2);
    S.Pin = 0;
  } else if (nConn === 3) {
    res = evaluate(P, slip, { u: S.u, fF });
    I = [res.I, res.I, res.I];
  } else if (nConn === 2) {
    S.lost = conn.indexOf(false);
    res = evaluate(P, slip, { u: S.u, fF, lost: S.lost });
    I = conn.map((c) => (c ? res.I : 0));
  }
  if (res) {
    S.Te = res.Te; S.phi = res.phi; S.cos = res.cos; S.Pin = res.Pin;
  } else if (!S.faults.short || nConn < 2) {
    S.Te = 0; S.Pin = 0; S.cos = 0;
  }
  S.energized = nConn >= 2;

  // Stejnosměrná složka při sepnutí – proud v okamžiku sepnutí začíná od nuly.
  S.thetaE += TWO_PI * 50 * fF * dt;
  if (S.pendingSwitch && S.energized) {
    S.pendingSwitch = false;
    S.dcT0 = S.t;
    for (let k = 0; k < 3; k++) S.dc[k] = -instAc(k, I);
  }

  // Mechanika
  const TL = loadTorque(S.omega);
  if (S.faults.jam) {
    S.omega = 0;
  } else {
    const acc = (S.Te - TL) / J;
    S.omega += acc * dt;
    if (S.omega < 0) S.omega = 0;
  }
  slip = ws > 0 ? (ws - S.omega) / ws : 1;
  S.slip = slip;
  S.TL = TL;

  // Ochrana
  const ev = prot.update(dt, I);
  if (ev) {
    log(ev.label, 'ev-trip');
    S.tripFlag = true;
    track('sim_trip', ev.label.replace(/\s*\([^)]*\)/, ''));
    if (ev.kind !== 'fuse') S.km1 = false;
    if (ev.kind === 'mag' || ev.kind === 'thermal') log('Q1 vypnut → KM1 odpadl (ovládání je napájeno za Q1)', 'ev-warn');
    if (ev.kind === 'olr') log('KM1 odpadl – motor je odpojen', 'ev-warn');
  }

  S.I = I;

  // Okamžité proudy pro osciloskop
  const decay = Math.exp(-(S.t - S.dcT0) / tauDC);
  for (let k = 0; k < 3; k++) {
    const v = S.energized || S.faults.short ? instAc(k, I) + S.dc[k] * decay : 0;
    scope.i[k][scope.pos] = v;
  }
  scope.pos = (scope.pos + 1) % SCOPE_N;
  scope.count = Math.min(SCOPE_N, scope.count + 1);

  // Historie
  if (S.t >= hist.next) {
    hist.next = S.t + HIST_DT;
    hist.t[hist.pos] = S.t;
    hist.I[hist.pos] = Math.max(...I);
    hist.n[hist.pos] = (S.omega * 60) / TWO_PI;
    hist.pos = (hist.pos + 1) % HIST_N;
    hist.count = Math.min(HIST_N, hist.count + 1);
  }

  // Body do vypínací charakteristiky (od posledního zapnutí)
  if (S.energized) {
    const ts = S.t - S.startT;
    if (ts >= S.tccNext && S.tcc.length < 400) {
      S.tcc.push([Math.max(...I) / prot.ref, ts]);
      S.tccNext = ts * 1.07;
    }
  }
}

// Okamžitá hodnota střídavé složky proudu fáze k
function instAc(k, I) {
  if (!I[k]) return 0;
  if (S.lost < 0) return Math.SQRT2 * I[k] * Math.sin(S.thetaE + PH[k] - S.phi);
  // Výpadek fáze: proud teče mezi zbylými dvěma fázemi (sdružené napětí).
  const [a, b] = [0, 1, 2].filter((x) => x !== S.lost);
  const re = Math.cos(PH[a]) - Math.cos(PH[b]);
  const im = Math.sin(PH[a]) - Math.sin(PH[b]);
  const psi = Math.atan2(im, re);
  const v = Math.SQRT2 * I[k] * Math.sin(S.thetaE + psi - S.phi);
  return k === a ? v : -v;
}

// --- Příkazy ---------------------------------------------------------------------------------------------
function cmdStart() {
  if (S.km1) return;
  if (prot.type !== 'fuse' && !prot.closed) {
    snackbar('Nejdřív zapni jistič / motorový spouštěč Q1.', 'power_off');
    log('Start nelze – Q1 je vypnutý', 'ev-warn');
    return;
  }
  const c = controlOk(false);
  if (!c.ok) {
    log(`Start nelze – ${c.why}`, 'ev-warn');
    snackbar(`Stykač nesepne: ${c.why}.`, 'block');
    return;
  }
  S.km1 = true;
  S.startT = S.t;
  S.ydState = 'star';
  S.vfdF = 0;
  S.tcc = [];
  S.tccNext = 0.005;
  S.pendingSwitch = true;
  const mode = form.get('start');
  const label = { dol: 'přímé spouštění', yd: 'hvězda → trojúhelník', soft: 'softstartér', vfd: 'frekvenční měnič' }[mode];
  log(`S1 Start: KM1 sepnul (${label})`, 'ev-ok');
  track('sim_start', `${M.Pn} kW ${label}`);
}

function cmdStop() {
  if (!S.km1) return;
  S.km1 = false;
  log('S0 Stop: KM1 odpadl, motor dobíhá');
}

function cmdReset() {
  if (prot.type === 'fuse') {
    const blown = prot.fuses.filter((f) => f.blown).length;
    if (prot.olrTripped && !prot.canReset()) {
      snackbar(`Relé F2 ještě chladne (${nf(prot.level * 100, 0)} %). Reset půjde pod 85 %.`, 'device_thermostat');
      return;
    }
    prot.reset();
    S.tripFlag = false;
    log(blown ? `Vyměněno ${blown} pojistek, relé F2 resetováno` : 'Relé F2 resetováno', 'ev-ok');
    return;
  }
  if (prot.closed) {
    prot.closed = false;
    S.km1 = false;
    log('Q1 ručně vypnut');
    return;
  }
  if (!prot.canReset()) {
    snackbar(`Bimetal ještě chladne (${nf(prot.level * 100, 0)} %). Zapnout půjde pod 85 %.`, 'device_thermostat');
    return;
  }
  prot.reset();
  S.tripFlag = false;
  log('Q1 zapnut', 'ev-ok');
}

function clearSim() {
  S.t = 0; S.omega = 0; S.km1 = false; S.I = [0, 0, 0]; S.Te = 0; S.tcc = []; S.dc = [0, 0, 0];
  S.prevConnected = false;
  S.tripFlag = false;
  resetBuffers();
  buildProtection(false);
  logEl.innerHTML = '';
  log('Simulace vynulována');
}

root.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cmd]');
  if (!b) return;
  const cmd = b.dataset.cmd;
  if (cmd === 'start') cmdStart();
  else if (cmd === 'stop') cmdStop();
  else if (cmd === 'reset-prot') cmdReset();
  else if (cmd === 'pause') {
    S.paused = !S.paused;
    b.querySelector('.material-symbols-rounded').textContent = S.paused ? 'play_arrow' : 'pause';
  } else if (cmd === 'clear') clearSim();
  else if (cmd === 'clear-log') logEl.innerHTML = '';
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'i' || e.key === 'I') cmdStart();
  if (e.key === 'o' || e.key === 'O' || e.key === '0') cmdStop();
  if (e.key === ' ') { e.preventDefault(); root.querySelector('[data-cmd="pause"]').click(); }
});

// Poruchy
root.querySelectorAll('[data-fault]').forEach((b) => {
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => {
    const f = b.dataset.fault;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    if (f.startsWith('loss-')) {
      const k = Number(f.slice(6)) - 1;
      S.faults.loss[k] = on;
      log(on ? `Porucha: výpadek fáze L${k + 1}` : `Fáze L${k + 1} obnovena`, on ? 'ev-warn' : 'ev-ok');
    } else if (f === 'jam') {
      S.faults.jam = on;
      log(on ? 'Porucha: rotor zablokován' : 'Rotor uvolněn', on ? 'ev-warn' : 'ev-ok');
    } else if (f === 'short') {
      S.faults.short = on;
      S.pendingSwitch = on;
      log(on ? `Porucha: zkrat na svorkách motoru (Ik = ${nf(form.num('ik'), 1)} kA)` : 'Zkrat odstraněn', on ? 'ev-trip' : 'ev-ok');
    }
    if (on) track('sim_fault', b.textContent.trim());
  });
});

// Změny nastavení
function updateOutput(input) {
  const out = root.querySelector(`[data-out="${input.name}"]`);
  if (!out) return;
  const v = Number(input.value);
  const unit = input.dataset.unit;
  const d = input.step && Number(input.step) < 1 ? (Number(input.step) < 0.1 ? 2 : 1) : 0;
  out.textContent = `${nf(v, d)} ${unit}`;
}
root.querySelectorAll('input[type="range"]').forEach((i) => {
  updateOutput(i);
  i.addEventListener('input', () => updateOutput(i));
});

root.addEventListener('change', (e) => {
  const name = e.target.name;
  if (name === 'motor') {
    S.km1 = false;
    setupMotor();
    suggestProtection();
    buildProtection(false);
    S.omega = 0;
    log(`Motor změněn na ${nf(M.Pn, M.Pn < 1 ? 2 : 1)} kW, ochrana nastavena podle In`);
  } else if (['protection', 'mcbChar', 'mcbIn', 'mpcbRange', 'mpcbClass', 'fuseIn', 'olrRange'].includes(name)) {
    if (name === 'mpcbRange' || name === 'olrRange') syncIrSliders(true);
    buildProtection(true);
    log(`Ochrana: ${prot.name}`);
  } else if (name === 'start') {
    $$('[data-start-opts]').forEach((el) => { el.hidden = el.dataset.startOpts !== form.get('start'); });
  } else if (name === 'speed') {
    S.speed = Number(form.get('speed'));
  } else if (name === 'inertia') {
    J = M.J * (1 + form.num('inertia'));
  }
});
root.addEventListener('input', (e) => {
  if (e.target.name === 'mpcbIr' || e.target.name === 'olrIr') {
    if (prot.type !== 'mcb') {
      prot.Ir = Number(e.target.value);
      curveCache.clear();
    }
  }
  if (e.target.name === 'inertia') J = M.J * (1 + form.num('inertia'));
});

// --- Grafy ---------------------------------------------------------------------------------------------
const plots = {
  scope: new Plot($('[data-chart="scope"]'), { x: { min: -80, max: 0, label: 't [ms]', step: 10 }, y: { min: -10, max: 10, label: 'i [A]' } }),
  trend: new Plot($('[data-chart="trend"]'), {
    x: { min: 0, max: 20, label: 't [s]' }, y: { min: 0, max: 10, label: 'I [A]' }, y2: { min: 0, max: 1600, label: 'n [min⁻¹]' },
  }),
  torque: new Plot($('[data-chart="torque"]'), {
    x: { min: 0, max: 1500, label: 'n [min⁻¹]' }, y: { min: -10, max: 100, label: 'M [N·m]' }, y2: { min: 0, max: 8, label: 'I / In' },
  }),
  tcc: new Plot($('[data-chart="tcc"]'), {
    x: { min: 1, max: 1000, log: true, label: 'I / Ir (násobek nastaveného proudu)' }, y: { min: 0.001, max: 10000, log: true, label: 't [s]' },
    pad: { l: 52 },
  }),
};
const motorCanvas = $('[data-chart="motor"]');

// Živá část simulace vyplní obrazovku od své horní hrany dolů (CSS si bere --sim-live-top).
const live = $('[data-sim-live]');
function fitLive() {
  const top = live.getBoundingClientRect().top + window.scrollY;
  document.documentElement.style.setProperty('--sim-live-top', `${Math.round(top)}px`);
}
fitLive();
window.addEventListener('resize', fitLive);
document.fonts?.ready.then(fitLive);

const curveCache = new Map();
function cached(key, fn) {
  if (!curveCache.has(key)) curveCache.set(key, fn());
  return curveCache.get(key);
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function drawScope() {
  const p = plots.scope;
  const c = p.colors;
  const n = Math.min(scope.count, 160);
  let max = 1;
  for (let k = 0; k < 3; k++) for (let j = 0; j < n; j++) max = Math.max(max, Math.abs(scope.i[k][(scope.pos - 1 - j + SCOPE_N) % SCOPE_N]));
  const ym = niceMax(max * 1.1);
  p.o.y.min = -ym; p.o.y.max = ym;
  p.begin();
  const colors = [c.l1, c.l2, c.l3];
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let j = n - 1; j >= 0; j--) pts.push([-j * DT * 1000, scope.i[k][(scope.pos - 1 - j + SCOPE_N) % SCOPE_N]]);
    p.line(pts, { color: colors[k], width: 2 });
  }
  p.legend([{ label: 'L1', color: c.l1 }, { label: 'L2', color: c.l2 }, { label: 'L3', color: c.l3 }]);
  if (!scope.count) p.message('Stiskni I (Start)');
}

function drawTrend() {
  const p = plots.trend;
  const c = p.colors;
  const win = Number(form.get('window'));
  const tEnd = Math.max(S.t, win);
  p.o.x.min = tEnd - win; p.o.x.max = tEnd;
  let maxI = M.In * 1.5;
  const pts = [];
  const npts = [];
  const N = hist.count;
  const stride = Math.max(1, Math.floor(N / 1600));
  for (let j = N - 1; j >= 0; j -= stride) {
    const idx = (hist.pos - 1 - j + HIST_N) % HIST_N;
    const t = hist.t[idx];
    if (t < p.o.x.min) continue;
    pts.push([t, hist.I[idx]]);
    npts.push([t, hist.n[idx]]);
    if (hist.I[idx] > maxI) maxI = hist.I[idx];
  }
  p.o.y.max = niceMax(Math.min(maxI * 1.1, M.In * 12));
  p.o.y2.max = niceMax(M.ns * 1.05);
  p.begin();
  p.hline(M.In, { color: c.secondary, label: `In ${nf(M.In, 1)} A` });
  p.line(npts, { color: c.tertiary, width: 2, axis: p.o.y2 });
  p.line(pts, { color: c.primary, width: 2.2 });
  p.legend([{ label: 'proud', color: c.primary }, { label: 'otáčky', color: c.tertiary }]);
}

function drawTorque() {
  const p = plots.torque;
  const c = p.colors;
  const lostKey = S.energized ? S.lost : -1;
  const u = S.energized ? S.u : form.num('voltage') / 100;
  const fF = S.energized ? S.fF : 1;
  const ns = M.ns * fF;
  p.o.x.max = niceMax(M.ns * 1.02) > M.ns * 1.3 ? Math.ceil(M.ns / 100) * 100 : niceMax(M.ns * 1.02);
  const tk = breakdown(P).T;
  p.o.y.max = niceMax(tk * 1.12);
  p.o.y.min = -p.o.y.max * 0.08;
  p.o.y2.max = Math.ceil(M.IaIn + 1);
  const key = `${M.id}|${u.toFixed(3)}|${fF.toFixed(3)}|${lostKey}`;
  const curve = cached(key, () => {
    const out = { T: [], I: [] };
    for (let i = 0; i <= 140; i++) {
      const n = (ns * i) / 140 * 0.999;
      const s = 1 - n / ns;
      const r = evaluate(P, s, { u, fF, lost: lostKey });
      out.T.push([n, r.Te]);
      out.I.push([n, r.I / M.In]);
    }
    return out;
  });
  const nominal = cached(`${M.id}|nom`, () => {
    const out = [];
    for (let i = 0; i <= 140; i++) {
      const n = (M.ns * i) / 140 * 0.999;
      out.push([n, evaluate(P, 1 - n / M.ns).Te]);
    }
    return out;
  });
  const load = [];
  for (let i = 0; i <= 60; i++) {
    const n = (M.ns * i) / 60;
    load.push([n, loadTorque((n * TWO_PI) / 60)]);
  }
  p.begin();
  p.hline(M.Tn, { color: c.secondary, label: `Mn ${nf(M.Tn, 1)} N·m` });
  if (key !== `${M.id}|1.000|1.000|-1`) p.line(nominal, { color: c.axis, width: 1.5, dash: [5, 5], alpha: 0.6 });
  p.line(curve.I, { color: c.l1, width: 1.6, axis: p.o.y2, alpha: 0.75 });
  p.line(load, { color: c.error, width: 2 });
  p.line(curve.T, { color: c.primary, width: 2.6 });
  const n = (S.omega * 60) / TWO_PI;
  p.dot(n, S.Te, { color: c.primary, r: 6 });
  p.dot(n, S.TL, { color: c.error, r: 4 });
  p.legend([{ label: 'motor', color: c.primary }, { label: 'zátěž', color: c.error }, { label: 'I/In', color: c.l1 }]);
}

function drawTcc() {
  const p = plots.tcc;
  const c = p.colors;
  const cur = prot.curves();
  const key = `${prot.name}|${prot.ref}|${prot.cls || ''}`;
  const data = cached(key, () => {
    const out = { band: [], model: [], hot: [], fuse: [] };
    for (let i = 0; i <= 260; i++) {
      const x = 10 ** (Math.log10(1.01) + (i / 260) * (3 - Math.log10(1.01)));
      const [lo, hi] = cur.band(x);
      out.band.push([x, lo, hi]);
      out.model.push([x, cur.model(x)]);
      if (cur.hot) out.hot.push([x, cur.hot(x)]);
      if (cur.fuse) out.fuse.push([x, cur.fuse(x)]);
    }
    return out;
  });
  p.begin();
  p.band(data.band, c.primary, 0.16);
  p.line(data.model.map(([x, t]) => [x, Math.max(t, 0.0011)]), { color: c.primary, width: 2.2 });
  if (data.hot.length) p.line(data.hot, { color: c.primary, width: 1.4, dash: [5, 4], alpha: 0.8 });
  if (data.fuse.length) p.line(data.fuse, { color: c.tertiary, width: 1.6, dash: [2, 3] });
  // průběh proudu motoru od zapnutí
  for (const [x, t] of S.tcc) p.dot(x, t, { color: c.l1, r: 3, ring: false });
  const x = Math.max(...S.I) / prot.ref;
  if (x > 1) p.vline(x, { color: c.error, label: `${nf(x, 1)} × Ir` });
  p.legend([
    { label: 'pásmo vybavení', color: c.primary },
    ...(data.hot.length ? [{ label: 'zahřátý stav', color: c.primary }] : []),
    ...(data.fuse.length ? [{ label: 'pojistka', color: c.tertiary }] : []),
    { label: 'motor', color: c.l1 },
  ]);
  $('[data-tcc-sub]').textContent = `${prot.name} · Ir = ${nf(prot.ref, 2)} A`;
}

// Animace motoru: osy vinutí, okamžité magnetomotorické napětí, výsledné pole a rotor.
const vis = { field: 0, rotor: 0, last: performance.now() };
function drawMotor(now) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = motorCanvas.clientWidth || 300;
  const h = motorCanvas.clientHeight || 240;
  if (motorCanvas.width !== Math.round(w * dpr) || motorCanvas.height !== Math.round(h * dpr)) {
    motorCanvas.width = Math.round(w * dpr);
    motorCanvas.height = Math.round(h * dpr);
  }
  const ctx = motorCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const c = plots.scope.colors;
  const realDt = Math.min(0.05, (now - vis.last) / 1000);
  vis.last = now;
  const VIS_HZ = 0.4; // zpomalené zobrazení točivého pole
  if (!S.paused) {
    if (S.energized && !S.faults.short) vis.field += TWO_PI * VIS_HZ * S.fF * realDt;
    vis.rotor += TWO_PI * VIS_HZ * (S.omega / M.ws) * realDt;
  }
  const cx = Math.min(w * 0.36, h * 0.55);
  const cy = h / 2;
  const R = Math.min(cx - 12, h / 2 - 14);

  // stator
  ctx.lineWidth = 10;
  ctx.strokeStyle = c.gridStrong;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TWO_PI); ctx.stroke();
  // rotor
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-vis.rotor);
  ctx.fillStyle = c.grid;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.52, 0, TWO_PI); ctx.fill();
  ctx.strokeStyle = c.axis;
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TWO_PI;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); ctx.lineTo(Math.cos(a) * R * 0.48, Math.sin(a) * R * 0.48); ctx.stroke();
  }
  ctx.fillStyle = c.axis;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = c.warn;
  ctx.beginPath(); ctx.arc(R * 0.4, 0, 5, 0, TWO_PI); ctx.fill();
  ctx.restore();

  // osy vinutí a okamžité příspěvky
  const colors = [c.l1, c.l2, c.l3];
  const Imax = Math.max(...S.I, 1e-9);
  const norm = R * 0.85 / Math.SQRT2;
  let bx = 0;
  let by = 0;
  for (let k = 0; k < 3; k++) {
    const axis = Math.PI / 2 - (k * TWO_PI) / 3; // L1 nahoře, další po 120°
    ctx.strokeStyle = colors[k];
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(axis) * R, cy + Math.sin(axis) * R); ctx.lineTo(cx + Math.cos(axis) * R, cy - Math.sin(axis) * R); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    let i = 0;
    if (S.energized && !S.faults.short && S.I[k]) {
      if (S.lost < 0) i = Math.SQRT2 * Math.sin(vis.field + PH[k] - S.phi);
      else {
        const [a] = [0, 1, 2].filter((x) => x !== S.lost);
        i = Math.SQRT2 * Math.sin(vis.field - S.phi) * (k === a ? 1 : -1);
      }
      i *= S.I[k] / Imax;
    }
    const len = i * norm;
    bx += Math.cos(axis) * len;
    by += Math.sin(axis) * len;
    arrow(ctx, cx, cy, cx + Math.cos(axis) * len, cy - Math.sin(axis) * len, colors[k], 3);
  }
  const fieldMag = Math.hypot(bx, by);
  if (fieldMag > 2) arrow(ctx, cx, cy, cx + bx * 0.66, cy - by * 0.66, c.primary, 5);

  // text vpravo
  const tx = cx + R + 24;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = [];
  let fieldTxt = 'žádné';
  if (S.faults.short && S.energized) fieldTxt = 'zkrat!';
  else if (S.energized) fieldTxt = S.lost >= 0 ? 'pulzující (2 fáze)' : 'točivé';
  lines.push(['Magnetické pole', fieldTxt]);
  lines.push(['Skluz s', S.energized ? `${nf(Math.max(0, S.slip) * 100, 1)} %` : '–']);
  lines.push(['Napětí na vinutí', S.energized ? `${nf(S.u * 400, 0)} V${form.get('start') === 'yd' && S.ydState === 'star' ? ' (Y)' : ''}` : '0 V']);
  if (form.get('start') === 'vfd') lines.push(['Frekvence', `${nf(S.fF * 50 * (S.km1 ? 1 : 0), 1)} Hz`]);
  lines.push(['Zátěž', `${nf(S.TL || 0, 1)} N·m`]);
  let y = 12;
  // na nízkém plátně menší písmo, ať se vejdou všechny řádky
  const step = Math.max(24, Math.min(40, (h - 16) / lines.length));
  const small = step < 30;
  for (const [k, v] of lines) {
    if (tx > w - 60) break;
    ctx.font = `600 ${small ? 9.5 : 11}px "Roboto Flex", system-ui, sans-serif`;
    ctx.fillStyle = c.axis;
    ctx.fillText(k.toUpperCase(), tx, y);
    ctx.font = `700 ${small ? 12.5 : 15}px "Roboto Mono", monospace`;
    ctx.fillStyle = k === 'Magnetické pole' && S.lost >= 0 ? c.error : c.text;
    ctx.fillText(v, tx, y + (small ? 11 : 14));
    y += step;
  }
}

function arrow(ctx, x0, y0, x1, y1, color, width) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 3) return;
  const a = Math.atan2(dy, dx);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * 6, y1 - Math.sin(a) * 6); ctx.stroke();
  const hs = 6 + width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.45) * hs, y1 - Math.sin(a - 0.45) * hs);
  ctx.lineTo(x1 - Math.cos(a + 0.45) * hs, y1 - Math.sin(a + 0.45) * hs);
  ctx.closePath();
  ctx.fill();
}

// --- Údaje a kontrolky ----------------------------------------------------------------------------------
const ro = Object.fromEntries($$('[data-ro]').map((el) => [el.dataset.ro, el]));
function updateReadouts() {
  const fmtI = (v) => (v >= 1000 ? nf(v, 0) : nf(v, v >= 100 ? 0 : 1));
  ro.i1.textContent = fmtI(S.I[0]);
  ro.i2.textContent = fmtI(S.I[1]);
  ro.i3.textContent = fmtI(S.I[2]);
  [ro.i1, ro.i2, ro.i3].forEach((el, k) => el.parentElement.classList.toggle('alarm', S.I[k] > prot.ref * 1.15));
  ro.n.textContent = nf((S.omega * 60) / TWO_PI, 0);
  ro.t.textContent = nf(S.Te, 1);
  ro.p.textContent = nf(Math.max(0, S.Pin) / 1000, 2);
  ro.pf.textContent = S.energized && !S.faults.short ? nf(S.cos, 2) : '–';
  ro.time.textContent = nf(S.t, 2);

  const lamp = (name, on) => $(`[data-lamp="${name}"]`).classList.toggle('on', on);
  lamp('run', S.km1);
  lamp('trip', !!S.tripFlag);
  lamp('q1', prot.closed);
  const resetLabel = $('[data-reset-label]');
  if (prot.type === 'fuse') resetLabel.textContent = 'Reset F2 / výměna pojistek';
  else resetLabel.textContent = prot.closed ? 'Vypnout Q1' : 'Zapnout Q1';

  const lvl = prot.level;
  $('[data-thermal-bar]').style.width = `${Math.min(100, (lvl / 1.2) * 100)}%`;
  $('[data-thermal-text]').textContent = `${nf(lvl * 100, 0)} %`;
  const n = (S.omega * 60) / TWO_PI;
  let state = 'Stojí';
  if (S.faults.short && S.energized) state = 'ZKRAT!';
  else if (S.energized && S.faults.jam) state = 'Zablokovaný rotor';
  else if (S.energized && n < M.nn * 0.9 * S.fF) state = 'Rozbíhá se';
  else if (S.energized) state = S.lost >= 0 ? 'Běží na 2 fáze!' : 'Běží';
  else if (n > 5) state = 'Dobíhá';
  $('[data-motor-state]').textContent = state;
}

// --- Hlavní smyčka -------------------------------------------------------------------------------------
let lastFrame = performance.now();
let carry = 0;
function frame(now) {
  const realDt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!S.paused) {
    carry += realDt * S.speed;
    let steps = Math.floor(carry / DT);
    carry -= steps * DT;
    if (steps > 8000) { steps = 8000; carry = 0; }
    for (let i = 0; i < steps; i++) step(DT);
  }
  if (!document.hidden) {
    drawScope();
    drawTrend();
    drawTorque();
    drawTcc();
    drawMotor(now);
    updateReadouts();
  }
  requestAnimationFrame(frame);
}

// --- Start -------------------------------------------------------------------------------------------
setupMotor();
suggestProtection();
buildProtection(false);
log('Připraveno. Stiskni zelené tlačítko I (Start) nebo klávesu I.');
document.addEventListener('themechange', () => curveCache.clear());
requestAnimationFrame(frame);
