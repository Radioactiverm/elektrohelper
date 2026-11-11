// Detail schématu: ovládací panel, stav, záznam událostí, zoom a celá obrazovka.
import { Schematic } from './engine.js';
import { track } from '/js/app.js';

const host = document.querySelector('[data-schematic]');
const json = document.querySelector('[data-schematic-json]');
const statusEl = document.querySelector('[data-sch-status]');
const logEl = document.querySelector('[data-sch-log]');
const stage = host?.closest('.schem-stage');

if (host && json) {
  const data = JSON.parse(json.textContent);
  const t0 = performance.now();

  const log = (text, cls = '') => {
    const li = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = `${((performance.now() - t0) / 1000).toFixed(1).replace('.', ',')} s`;
    const span = document.createElement('span');
    span.textContent = text;
    if (cls) span.className = cls;
    li.append(time, span);
    logEl.prepend(li);
    while (logEl.children.length > 80) logEl.lastChild.remove();
  };

  const setStatus = ({ running, lit, fault }) => {
    let iconName = 'power_off';
    let text = 'Klid – nic neběží';
    let cls = '';
    if (fault) { iconName = 'bolt'; text = 'ZKRAT!'; cls = 'fault'; }
    else if (running.length) {
      text = running.join(' · ');
      const hum = running.some((r) => /bručí|neúplné|nejsou/.test(r));
      iconName = hum ? 'warning' : 'autorenew';
      cls = hum ? 'fault' : 'on';
    } else if (lit) { iconName = 'lightbulb'; text = lit === 1 ? 'Světlo svítí' : `Svítí ${lit} světla`; cls = 'on'; }
    statusEl.className = `schem-status ${cls}`;
    statusEl.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${iconName}</span>`;
    statusEl.append(document.createTextNode(` ${text}`));
  };

  // první interakce za návštěvu stačí, víc by zbytečně plnilo statistiky
  let actionSent = false;
  const onEvent = (type, label) => {
    if (type === 'schematic_action') {
      if (actionSent) return;
      actionSent = true;
    }
    track(type, label);
  };

  const fitZoom = () => Math.max(0.6, Math.min(1.5, (host.clientWidth - 16) / (data.width || 600)));
  const sch = new Schematic(host, data, {
    controls: document.querySelector('[data-sch-controls]'),
    onLog: log,
    onStatus: setStatus,
    onEvent,
    zoom: fitZoom(),
  });
  log('Schéma načteno – zapni jistič a zkoušej tlačítka', '');

  document.querySelectorAll('[data-sch-zoom]').forEach((b) => b.addEventListener('click', () => {
    sch.setZoom(sch.zoom * (Number(b.dataset.schZoom) > 0 ? 1.2 : 1 / 1.2));
  }));
  document.querySelector('[data-sch-reset]')?.addEventListener('click', () => sch.reset());

  const fsBtn = document.querySelector('[data-sch-fullscreen]');
  if (stage?.requestFullscreen) {
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else stage.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === stage;
      fsBtn.querySelector('.material-symbols-rounded').textContent = on ? 'fullscreen_exit' : 'fullscreen';
      requestAnimationFrame(() => sch.setZoom(on ? Math.min(2.5, Math.min(host.clientWidth / data.width, host.clientHeight / data.height) * 0.98) : fitZoom()));
    });
  } else fsBtn?.remove();

  // Ctrl + kolečko = zoom
  host.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    sch.setZoom(sch.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });
}
