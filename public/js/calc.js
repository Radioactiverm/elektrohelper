// Kalkulačky – vše se přepočítává při psaní.
import { track } from './app.js';

const nf = (v, d = 2) => (Number.isFinite(v)
  ? v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: 0 })
  : '–');

// Hodnota s předponou SI (1 500 → 1,5 k)
function si(v, unit, d = 3) {
  if (!Number.isFinite(v)) return '–';
  const abs = Math.abs(v);
  const pref = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ']];
  for (const [f, p] of pref) {
    if (abs >= f || f === 1e-6) return `${(v / f).toLocaleString('cs-CZ', { maximumSignificantDigits: d })} ${p}${unit}`;
  }
  return `${v} ${unit}`;
}

const res = (label, value, warn = false) => `<div class="res${warn ? ' warn' : ''}"><small>${label}</small><b>${value}</b></div>`;

function read(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  if (!el) return NaN;
  if (el.type === 'radio') return form.querySelector(`[name="${name}"]:checked`)?.value;
  const v = String(el.value).replace(',', '.').trim();
  return v === '' ? NaN : Number(v);
}

const CALCS = {
  ohm(f) {
    let U = read(f, 'U'); let I = read(f, 'I'); let R = read(f, 'R'); let P = read(f, 'P');
    const has = [U, I, R, P].filter(Number.isFinite).length;
    if (has < 2) return '<p class="muted small">Zadej aspoň dvě hodnoty.</p>';
    if (Number.isFinite(U) && Number.isFinite(R)) { I = U / R; P = U * I; }
    else if (Number.isFinite(U) && Number.isFinite(I)) { R = U / I; P = U * I; }
    else if (Number.isFinite(I) && Number.isFinite(R)) { U = I * R; P = U * I; }
    else if (Number.isFinite(P) && Number.isFinite(U)) { I = P / U; R = U / I; }
    else if (Number.isFinite(P) && Number.isFinite(I)) { U = P / I; R = U / I; }
    else if (Number.isFinite(P) && Number.isFinite(R)) { I = Math.sqrt(P / R); U = I * R; }
    return res('Napětí U', si(U, 'V')) + res('Proud I', si(I, 'A')) + res('Odpor R', si(R, 'Ω')) + res('Výkon P', si(P, 'W'));
  },
  p3(f) {
    const P = read(f, 'P') * 1000; const U = read(f, 'U'); const cos = read(f, 'cos'); const eta = read(f, 'eta') / 100;
    const Pin = P / eta;
    const I = Pin / (Math.sqrt(3) * U * cos);
    const S = Math.sqrt(3) * U * I;
    const Q = Math.sqrt(Math.max(S * S - Pin * Pin, 0));
    return res('Proud In', `${nf(I)} A`) + res('Příkon P₁', si(Pin, 'W')) + res('Zdánlivý S', si(S, 'VA')) + res('Jalový Q', si(Q, 'var'))
      + res('Rozběh (≈7×In)', `${nf(I * 7, 0)} A`);
  },
  drop(f) {
    const sys = read(f, 'sys'); const I = read(f, 'I'); const l = read(f, 'l'); const S = read(f, 'S'); const cos = read(f, 'cos');
    const gamma = read(f, 'mat') === 'al' ? 34 : 56; // měrná vodivost m/(Ω·mm²)
    const Un = sys === '3' ? 400 : 230;
    const dU = (sys === '3' ? Math.sqrt(3) : 2) * I * l * cos / (gamma * S);
    const pct = (dU / Un) * 100;
    const Ploss = (sys === '3' ? 3 : 2) * I * I * l / (gamma * S);
    return res('Úbytek ΔU', `${nf(dU)} V`) + res('Úbytek ΔU %', `${nf(pct)} %`, pct > 3)
      + res('Ztráty ve vedení', `${nf(Ploss, 1)} W`)
      + `<p class="muted small" style="grid-column:1/-1">Pro světelné obvody se doporučuje do 3 %, pro ostatní do 5 % (ČSN 33 2000-5-52).</p>`;
  },
  wire(f) {
    const l = read(f, 'l'); const S = read(f, 'S'); const t = read(f, 't'); const mat = read(f, 'mat');
    const { rho, alpha } = { cu: { rho: 0.0178, alpha: 0.0039 }, al: { rho: 0.0286, alpha: 0.004 }, fe: { rho: 0.13, alpha: 0.0057 } }[mat];
    const R20 = (rho * l) / S;
    const R = R20 * (1 + alpha * (t - 20));
    return res('R při 20 °C', si(R20, 'Ω')) + res(`R při ${nf(t, 0)} °C`, si(R, 'Ω')) + res('ρ', `${rho} Ω·mm²/m`);
  },
};

// --- Inicializace ---------------------------------------------------------------------------
for (const form of document.querySelectorAll('[data-calc]')) {
  const kind = form.dataset.calc;
  const out = form.querySelector('[data-out]');
  const update = () => {
    try { out.innerHTML = CALCS[kind](form); } catch { out.innerHTML = ''; }
  };
  let tracked = false;
  form.addEventListener('input', () => {
    update();
    if (!tracked) { tracked = true; track('calc_use', kind); }
  });
  form.addEventListener('change', update);
  update();
}
