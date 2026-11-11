// Společné chování administrace: potvrzení, automatické odeslání filtrů, kopírování do schránky.
import { snackbar } from '/js/app.js';

export const csrf = document.querySelector('[data-csrf]')?.dataset.csrf || '';

// Potvrzení nevratných akcí (mazání)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-confirm]');
  if (btn && !window.confirm(btn.dataset.confirm)) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, true);

// Výběr ve filtru hned odešle formulář
document.querySelectorAll('[data-autosubmit]').forEach((el) => {
  el.addEventListener('change', () => el.form?.requestSubmit());
});

// Kopírování textu (např. ![[soubor.svg]])
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    snackbar(`Zkopírováno: ${btn.dataset.copy}`, 'content_copy');
  } catch {
    window.prompt('Zkopíruj ručně:', btn.dataset.copy);
  }
});

// Upozornění na neuložené změny v editorech
const form = document.querySelector('form[data-editor], form[data-sch-editor]');
if (form) {
  let dirty = false;
  form.addEventListener('input', () => { dirty = true; });
  form.addEventListener('submit', () => { dirty = false; });
  window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });
  // Ctrl+S = uložit
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      dirty = false;
      form.requestSubmit();
    }
  });
}
