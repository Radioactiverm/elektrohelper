// Editor schémat: JSON vlevo, živý interaktivní náhled vpravo.
import { Schematic } from '/js/schematics/engine.js';
import './admin.js';

const input = document.querySelector('[data-json-input]');
const status = document.querySelector('[data-json-status]');
const host = document.querySelector('[data-schematic]');
const controls = document.querySelector('[data-sch-controls]');

let sch = null;
let timer = null;

function update() {
  let data;
  try {
    data = JSON.parse(input.value);
  } catch (err) {
    status.textContent = `chyba JSON: ${err.message}`;
    status.classList.add('error');
    return;
  }
  try {
    if (!Array.isArray(data.components) || !Array.isArray(data.wires)) throw new Error('chybí pole „components“ nebo „wires“');
    sch?.destroy();
    sch = new Schematic(host, data, { controls, fit: true });
    status.textContent = `${data.components.length} prvků · ${data.wires.length} vodičů · ${Object.keys(data.devices || {}).length} přístrojů`;
    status.classList.remove('error');
  } catch (err) {
    status.textContent = `chyba schématu: ${err.message}`;
    status.classList.add('error');
  }
}

if (input && host) {
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(update, 400);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      input.setRangeText('  ', input.selectionStart, input.selectionEnd, 'end');
    }
  });
  // Formát před odesláním zkontrolujeme, ať se neuloží rozbitý JSON
  input.form.addEventListener('submit', (e) => {
    try { JSON.parse(input.value); } catch (err) {
      e.preventDefault();
      status.textContent = `nelze uložit – chyba JSON: ${err.message}`;
      status.classList.add('error');
      input.focus();
    }
  });
  update();
}
