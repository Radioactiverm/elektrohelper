import { html, icon } from './html.js';

const num = (name, label, value, unit, attrs = '') => html`
<label class="text-field">
  <input type="number" name="${name}" value="${value}" step="any" inputmode="decimal" placeholder=" " ${attrs}>
  <span class="tf-label">${label}</span>
  <span class="tf-suffix">${unit}</span>
</label>`;

export function calculatorsPage() {
  return html`
<header class="page-head">
  <h1 class="display-sm">Výpočty</h1>
  <p class="lead">Výpočty, které se hodí při zapojování a dimenzování v odborném výcviku. Výsledky se přepočítávají hned při psaní.</p>
</header>
<div class="calc-grid" data-calcs>

  <section class="card outlined calc" data-calc="ohm">
    <h2 class="title-md">${icon('function')} Ohmův zákon a výkon</h2>
    <p class="muted small">Zadej libovolné <b>dvě</b> hodnoty, zbytek se dopočítá. Pole, které chceš dopočítat, nech prázdné.</p>
    <div class="fields">
      ${num('U', 'Napětí U', 230, 'V')}
      ${num('I', 'Proud I', '', 'A')}
      ${num('R', 'Odpor R', 52.9, 'Ω')}
      ${num('P', 'Výkon P', '', 'W')}
    </div>
    <div class="calc-out" data-out></div>
  </section>

  <section class="card outlined calc" data-calc="p3">
    <h2 class="title-md">${icon('electric_meter')} Třífázový výkon a proud motoru</h2>
    <div class="fields">
      ${num('P', 'Výkon na hřídeli Pn', 4, 'kW')}
      ${num('U', 'Sdružené napětí U', 400, 'V')}
      ${num('cos', 'Účiník cos φ', 0.81, '')}
      ${num('eta', 'Účinnost η', 89.6, '%')}
    </div>
    <div class="calc-out" data-out></div>
    <p class="formula small">I = P / (√3 · U · cos φ · η)</p>
  </section>

  <section class="card outlined calc" data-calc="drop">
    <h2 class="title-md">${icon('trending_down')} Úbytek napětí na vedení</h2>
    <div class="segmented" role="radiogroup">
      <label class="seg-btn"><input type="radio" name="sys" value="1" checked><span>1f 230 V</span></label>
      <label class="seg-btn"><input type="radio" name="sys" value="3"><span>3f 400 V</span></label>
    </div>
    <div class="fields">
      ${num('I', 'Proud I', 16, 'A')}
      ${num('l', 'Délka vedení l', 25, 'm')}
      ${num('S', 'Průřez S', 2.5, 'mm²')}
      ${num('cos', 'cos φ', 1, '')}
    </div>
    <div class="segmented" role="radiogroup">
      <label class="seg-btn"><input type="radio" name="mat" value="cu" checked><span>Měď</span></label>
      <label class="seg-btn"><input type="radio" name="mat" value="al"><span>Hliník</span></label>
    </div>
    <div class="calc-out" data-out></div>
    <p class="formula small">1f: ΔU = 2·I·l·cos φ / (γ·S) · 3f: ΔU = √3·I·l·cos φ / (γ·S)</p>
  </section>

  <section class="card outlined calc" data-calc="wire">
    <h2 class="title-md">${icon('cable')} Odpor vodiče</h2>
    <div class="fields">
      ${num('l', 'Délka l', 100, 'm')}
      ${num('S', 'Průřez S', 1.5, 'mm²')}
      ${num('t', 'Teplota ϑ', 20, '°C')}
    </div>
    <div class="segmented" role="radiogroup">
      <label class="seg-btn"><input type="radio" name="mat" value="cu" checked><span>Měď</span></label>
      <label class="seg-btn"><input type="radio" name="mat" value="al"><span>Hliník</span></label>
      <label class="seg-btn"><input type="radio" name="mat" value="fe"><span>Ocel</span></label>
    </div>
    <div class="calc-out" data-out></div>
    <p class="formula small">R = ρ · l / S · (1 + α·(ϑ − 20))</p>
  </section>

</div>`;
}
