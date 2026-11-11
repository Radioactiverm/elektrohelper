// Editor článků: živý náhled (vykresluje server stejně jako veřejnou stránku) a lišta formátování.
import { renderMermaid } from '/js/app.js';
import { csrf } from './admin.js';

const input = document.querySelector('[data-md-input]');
const preview = document.querySelector('[data-preview]');
const status = document.querySelector('[data-preview-status]');

let timer = null;
let seq = 0;

async function refresh() {
  const my = ++seq;
  status.textContent = 'vykresluji…';
  try {
    const res = await fetch('/admin/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify({ md: input.value }),
    });
    if (!res.ok) throw new Error(res.status);
    const { html } = await res.json();
    if (my !== seq) return; // mezitím přišel novější požadavek
    preview.innerHTML = html;
    status.textContent = `${input.value.length.toLocaleString('cs-CZ')} znaků`;
    if (preview.querySelector('pre.mermaid')) renderMermaid();
  } catch {
    if (my === seq) status.textContent = 'náhled se nepodařilo načíst';
  }
}

if (input && preview) {
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, 350);
  });
  refresh();

  // Tab vloží odsazení místo přeskočení na další pole
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      insert('  ', '');
    }
  });
}

function insert(before, after = before, placeholder = '') {
  const { selectionStart: s, selectionEnd: e, value } = input;
  const sel = value.slice(s, e) || placeholder;
  input.setRangeText(before + sel + after, s, e, 'end');
  if (!value.slice(s, e) && placeholder) {
    input.setSelectionRange(s + before.length, s + before.length + placeholder.length);
  }
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

document.querySelector('[data-md-tools]')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.md) insert(btn.dataset.md, btn.dataset.md, 'text');
  else if (btn.dataset.mdBlock) {
    const block = btn.dataset.mdBlock.replace(/\\n/g, '\n');
    const { selectionStart: s, value } = input;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const prefix = s === lineStart ? '' : '\n';
    const needGap = lineStart > 0 && value[lineStart - 2] !== '\n' ? '\n' : '';
    insert(`${prefix}${needGap}${block}\n`, '');
  }
});
