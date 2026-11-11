import { html, icon } from './html.js';

const seg = (name, options, checked) => html`
<div class="segmented" role="radiogroup">
  ${options.map(([value, label, ic]) => html`<label class="seg-btn"><input type="radio" name="${name}" value="${value}"${value === checked ? ' checked' : ''}><span>${ic ? icon(ic) : ''}${label}</span></label>`)}
</div>`;

const slider = (name, label, min, max, step, value, unit) => html`
<label class="slider-field">
  <span class="slider-label">${label}<output data-out="${name}">${value} ${unit}</output></span>
  <input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}">
</label>`;

export function simulatorPage() {
  return html`
<header class="sim-head">
  <h1>Simulátor třífázového motoru</h1>
  <p>Stykač KM1 se samodržením a nadproudová ochrana – sleduj živě proud, otáčky a kdy ochrana vybaví. Nastavení motoru a jištění najdeš <a href="#nastaveni">pod simulací</a>.</p>
</header>

<div class="sim" data-sim>
  <section class="sim-live" data-sim-live>
    <div class="card filled sim-panel">
      <div class="panel-buttons">
        <button class="pushbutton pb-start" type="button" data-cmd="start" aria-label="Start (S1)"><span>I</span></button>
        <button class="pushbutton pb-stop" type="button" data-cmd="stop" aria-label="Stop (S0)"><span>O</span></button>
        <div class="panel-lamps">
          <span class="lamp" data-lamp="run"><i></i>KM1 sepnut</span>
          <span class="lamp red" data-lamp="trip"><i></i>Porucha</span>
          <span class="lamp amber" data-lamp="q1"><i></i>Q1 zapnut</span>
        </div>
      </div>
      <div class="panel-live">
        <div class="chip-set faults" role="group" aria-label="Poruchy">
          <button class="chip filter" type="button" data-fault="loss-L1" title="Výpadek fáze L1">${icon('power_off')}L1</button>
          <button class="chip filter" type="button" data-fault="loss-L2" title="Výpadek fáze L2">${icon('power_off')}L2</button>
          <button class="chip filter" type="button" data-fault="loss-L3" title="Výpadek fáze L3">${icon('power_off')}L3</button>
          <button class="chip filter" type="button" data-fault="jam">${icon('block')}Zablokovat</button>
          <button class="chip filter danger" type="button" data-fault="short">${icon('flash_on')}Zkrat</button>
        </div>
        ${slider('load', 'Zatížení', 0, 200, 5, 80, '% Mn')}
      </div>
      <div class="panel-actions">
        <button class="btn tonal" type="button" data-cmd="reset-prot">${icon('restart_alt')}<span data-reset-label>Zapnout jistič</span></button>
        <div class="segmented speed" role="radiogroup" aria-label="Rychlost simulace">
          ${[['0.05', '×0,05'], ['0.25', '×¼'], ['1', '×1'], ['10', '×10'], ['60', '×60']].map(([v, l]) => html`<label class="seg-btn"><input type="radio" name="speed" value="${v}"${v === '1' ? ' checked' : ''}><span>${l}</span></label>`)}
        </div>
        <button class="icon-btn" type="button" data-cmd="pause" aria-label="Pozastavit" title="Pozastavit / pokračovat (mezerník)">${icon('pause')}</button>
        <button class="icon-btn" type="button" data-cmd="clear" aria-label="Vynulovat simulaci" title="Vynulovat">${icon('restart_alt')}</button>
        <a class="icon-btn" href="#nastaveni" aria-label="Nastavení motoru a jištění" title="Nastavení motoru a jištění">${icon('tune')}</a>
      </div>
    </div>

    <div class="readouts" data-readouts>
      <div class="readout r-l1"><span class="r-label">I L1</span><span class="r-val" data-ro="i1">0,0</span><span class="r-unit">A</span></div>
      <div class="readout r-l2"><span class="r-label">I L2</span><span class="r-val" data-ro="i2">0,0</span><span class="r-unit">A</span></div>
      <div class="readout r-l3"><span class="r-label">I L3</span><span class="r-val" data-ro="i3">0,0</span><span class="r-unit">A</span></div>
      <div class="readout"><span class="r-label">Otáčky</span><span class="r-val" data-ro="n">0</span><span class="r-unit">ot/min</span></div>
      <div class="readout"><span class="r-label">Moment</span><span class="r-val" data-ro="t">0,0</span><span class="r-unit">N·m</span></div>
      <div class="readout"><span class="r-label">Příkon</span><span class="r-val" data-ro="p">0,00</span><span class="r-unit">kW</span></div>
      <div class="readout"><span class="r-label">cos φ</span><span class="r-val" data-ro="pf">–</span><span class="r-unit"></span></div>
      <div class="readout"><span class="r-label">Čas</span><span class="r-val" data-ro="time">0,00</span><span class="r-unit">s</span></div>
    </div>

    <div class="live-grid">
      <section class="card outlined chart-card motor-card">
        <header class="chart-head"><h2 class="title-sm">${icon('autorenew')} Motor a fázory</h2><span class="chart-sub" data-motor-state>Stojí</span></header>
        <div class="chart-box"><canvas data-chart="motor"></canvas></div>
        <div class="thermal">
          <div class="thermal-row"><span>Tepelná ochrana</span><b data-thermal-text>0 %</b></div>
          <div class="progress-linear thermal-bar"><span data-thermal-bar></span><i class="trip-mark" title="Vybavení"></i></div>
        </div>
      </section>
      <section class="card outlined chart-card">
        <header class="chart-head"><h2 class="title-sm">${icon('monitoring')} Průběh v čase</h2>
          <div class="segmented tiny" role="radiogroup" aria-label="Časové okno">
            ${[['5', '5 s'], ['20', '20 s'], ['120', '2 min'], ['600', '10 min']].map(([v, l]) => html`<label class="seg-btn"><input type="radio" name="window" value="${v}"${v === '20' ? ' checked' : ''}><span>${l}</span></label>`)}
          </div>
        </header>
        <div class="chart-box"><canvas data-chart="trend"></canvas></div>
      </section>
      <section class="card outlined chart-card tcc-card">
        <header class="chart-head"><h2 class="title-sm">${icon('timer')} Vypínací charakteristika t(I)</h2><span class="chart-sub" data-tcc-sub>log–log</span></header>
        <div class="chart-box"><canvas data-chart="tcc"></canvas></div>
      </section>
      <section class="card outlined chart-card log-card">
        <header class="chart-head"><h2 class="title-sm">${icon('receipt_long')} Záznam událostí</h2><button class="btn text sm" type="button" data-cmd="clear-log">Vymazat</button></header>
        <ol class="event-log" data-sim-log></ol>
      </section>
      <section class="card outlined chart-card">
        <header class="chart-head"><h2 class="title-sm">${icon('ssid_chart')} Osciloskop – proudy fází</h2><span class="chart-sub">posledních 80 ms</span></header>
        <div class="chart-box"><canvas data-chart="scope"></canvas></div>
      </section>
      <section class="card outlined chart-card">
        <header class="chart-head"><h2 class="title-sm">${icon('show_chart')} Momentová charakteristika M(n)</h2><span class="chart-sub">motor × zátěž</span></header>
        <div class="chart-box"><canvas data-chart="torque"></canvas></div>
      </section>
    </div>
  </section>

  <section class="sim-setup" id="nastaveni">
    <h2 class="headline">${icon('tune')} Nastavení motoru a jištění</h2>
    <div class="setup-grid">
      <section class="card outlined sim-card">
        <h3 class="title-md">${icon('settings_motion_mode')} Motor</h3>
        <label class="select-field"><span>Typ motoru (4pólový, 400 V Δ, IE3)</span>
          <select name="motor" data-motor-select></select>
        </label>
        <div class="rating-plate" data-rating-plate aria-label="Štítek motoru"></div>
      </section>

      <section class="card outlined sim-card">
        <h3 class="title-md">${icon('conveyor_belt')} Zátěž a spouštění</h3>
        ${seg('loadType', [['const', 'Dopravník', 'conveyor_belt'], ['fan', 'Ventilátor', 'mode_fan'], ['none', 'Naprázdno', 'block']], 'const')}
        ${slider('inertia', 'Setrvačnost zátěže', 0, 30, 1, 3, '× J motoru')}
        ${seg('start', [['dol', 'Přímé'], ['yd', 'Y–Δ'], ['soft', 'Softstartér'], ['vfd', 'Měnič']], 'dol')}
        <div class="start-opts" data-start-opts="yd" hidden>${slider('ydTime', 'Přepnutí Y → Δ po', 1, 15, 0.5, 4, 's')}</div>
        <div class="start-opts" data-start-opts="soft" hidden>
          ${slider('softU0', 'Počáteční napětí', 20, 80, 5, 40, '%')}
          ${slider('softRamp', 'Doba rampy', 1, 30, 1, 8, 's')}
        </div>
        <div class="start-opts" data-start-opts="vfd" hidden>
          ${slider('vfdRamp', 'Rampa 0 → 50 Hz', 1, 30, 1, 5, 's')}
          ${slider('vfdLimit', 'Proudové omezení', 100, 200, 10, 150, '% In')}
        </div>
      </section>

      <section class="card outlined sim-card">
        <h3 class="title-md">${icon('shield')} Jištění</h3>
        <label class="select-field"><span>Ochranný přístroj</span>
          <select name="protection" data-protection-select>
            <option value="mcb">Jistič (MCB) + stykač</option>
            <option value="mpcb" selected>Motorový spouštěč (MPCB) + stykač</option>
            <option value="fuse">Pojistky gG + tepelné relé + stykač</option>
          </select>
        </label>
        <div class="prot-opts" data-prot-opts="mcb">
          ${seg('mcbChar', [['B', 'B'], ['C', 'C'], ['D', 'D']], 'C')}
          <label class="select-field"><span>Jmenovitý proud In</span><select name="mcbIn" data-rated-select="mcb"></select></label>
        </div>
        <div class="prot-opts" data-prot-opts="mpcb" hidden>
          <label class="select-field"><span>Rozsah spouštěče</span><select name="mpcbRange" data-rated-select="mpcb"></select></label>
          ${slider('mpcbIr', 'Nastavení Ir', 0, 100, 1, 50, 'A')}
          ${seg('mpcbClass', [['10', 'Třída 10'], ['20', 'Třída 20']], '10')}
        </div>
        <div class="prot-opts" data-prot-opts="fuse" hidden>
          <label class="select-field"><span>Pojistky gG</span><select name="fuseIn" data-rated-select="fuse"></select></label>
          <label class="select-field"><span>Tepelné relé – rozsah</span><select name="olrRange" data-rated-select="olr"></select></label>
          ${slider('olrIr', 'Nastavení relé Ir', 0, 100, 0.1, 50, 'A')}
        </div>
        <p class="hint" data-prot-hint></p>
      </section>

      <section class="card outlined sim-card">
        <h3 class="title-md">${icon('electrical_services')} Síť</h3>
        ${slider('voltage', 'Napětí sítě', 50, 110, 1, 100, '% Un')}
        ${slider('ik', 'Zkratový proud Ik', 0.5, 10, 0.5, 3, 'kA')}
        <p class="hint">Pásmo v grafu t(I) = tolerance přístroje podle normy. Tečky = skutečný průběh proudu motoru od zapnutí. Když se tečky dotknou pásma, ochrana vybaví.</p>
      </section>
    </div>
  </section>
</div>

<section class="section sim-explain">
  <h2 class="headline">${icon('school')} Co si vyzkoušet</h2>
  <div class="callout-grid">
    <div class="callout tone-primary"><div class="callout-title">${icon('bolt', 'callout-icon')}<span class="callout-title-text">Jistič B na motor</span></div><div class="callout-content"><p>Vyber <b>Jistič (MCB)</b>, charakteristiku <b>B</b> a In blízko In motoru. Při přímém spuštění je záběrový proud 6–8 × In – elektromagnetická spoušť B (3–5 × In) vybaví hned. Přepni na <b>C</b> nebo <b>D</b>.</p></div></div>
    <div class="callout tone-pe"><div class="callout-title">${icon('power_off', 'callout-icon')}<span class="callout-title-text">Výpadek fáze</span></div><div class="callout-content"><p>Rozběhni motor a odpoj <b>L1</b>. Motor dál běží, ale proud ve zbylých fázích vzroste asi 1,7×. Tepelná ochrana vybaví za desítky sekund. Zkus pak motor znovu spustit – <b>se dvěma fázemi se nerozběhne</b>.</p></div></div>
    <div class="callout tone-tertiary"><div class="callout-title">${icon('star', 'callout-icon')}<span class="callout-title-text">Hvězda–trojúhelník</span></div><div class="callout-content"><p>Ve hvězdě je proud i moment třetinový. S velkou zátěží se motor ve hvězdě nemusí rozběhnout – sleduj průsečík křivek v grafu M(n).</p></div></div>
    <div class="callout tone-warning"><div class="callout-title">${icon('flash_on', 'callout-icon')}<span class="callout-title-text">Zkrat</span></div><div class="callout-content"><p>Zkrat na svorkách vybaví elektromagnetická spoušť nebo pojistka během milisekund. Tepelná ochrana by byla příliš pomalá.</p></div></div>
  </div>
  <p class="muted small">Model: náhradní schéma asynchronního motoru (Γ-článek) s proměnným odporem rotoru (vliv hluboké drážky), parametry dopočítané ze štítkových hodnot. Výpadek fáze řešen souměrnými složkami. Tepelné spouště jako tepelný model 1. řádu, pojistky podle vypínací charakteristiky. Jde o výukový model – skutečné hodnoty najdeš v katalogu výrobce.</p>
</section>`;
}
