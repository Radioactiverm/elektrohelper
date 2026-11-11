// Minimalistické šablonování přes tagged template literals s automatickým escapováním.
import { escapeHtml } from '../markdown.js';

export class Raw {
  constructor(s) { this.s = String(s); }
  toString() { return this.s; }
}

export const raw = (s) => new Raw(s ?? '');

function stringify(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(stringify).join('');
  return escapeHtml(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += stringify(values[i]) + strings[i + 1];
  return new Raw(out);
}

export const icon = (name, cls = '') => raw(`<span class="material-symbols-rounded${cls ? ' ' + cls : ''}" aria-hidden="true">${escapeHtml(name)}</span>`);

const CZ_DATE = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
const CZ_DATETIME = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const CZ_NUM = new Intl.NumberFormat('cs-CZ');

export const fmtDate = (ts) => (ts ? CZ_DATE.format(new Date(ts)) : '–');
export const fmtDateTime = (ts) => (ts ? CZ_DATETIME.format(new Date(ts)) : '–');
export const fmtNum = (n) => CZ_NUM.format(Number(n) || 0);

// Česká plurálová koncovka: plural(3, 'článek', 'články', 'článků')
export function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
