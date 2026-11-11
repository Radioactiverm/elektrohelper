// Jednoduché SVG grafy vykreslované na serveru (bez JavaScriptu).
import { html, raw, fmtNum } from './html.js';

function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/**
 * Spojnicový graf s plochou.
 * @param {{labels: string[], series: {name: string, values: number[], cls: string}[]}} d
 */
export function lineChart({ labels, series }, { width = 720, height = 240 } = {}) {
  const pad = { l: 40, r: 12, t: 12, b: 28 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const x = (i) => pad.l + (n <= 1 ? w / 2 : (i * w) / (n - 1));
  const y = (v) => pad.t + h - (v / max) * h;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const gy = y(max * f);
    return `<line x1="${pad.l}" x2="${pad.l + w}" y1="${gy}" y2="${gy}" class="grid"/><text x="${pad.l - 6}" y="${gy + 4}" class="axis" text-anchor="end">${fmtNum(Math.round(max * f))}</text>`;
  }).join('');
  const step = Math.ceil(n / 8);
  const xl = labels.map((l, i) => (i % step === 0 || i === n - 1)
    ? `<text x="${x(i)}" y="${height - 8}" class="axis" text-anchor="middle">${l}</text>` : '').join('');
  const paths = series.map((s) => {
    const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    const area = `M${x(0)},${y(0)} L${pts.join(' L')} L${x(n - 1)},${y(0)} Z`;
    const dots = s.values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" class="dot ${s.cls}"><title>${labels[i]}: ${fmtNum(v)} ${s.name}</title></circle>`).join('');
    return `<path d="${area}" class="area ${s.cls}"/><path d="M${pts.join(' L')}" class="line ${s.cls}"/>${dots}`;
  }).join('');
  return raw(`<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Graf návštěvnosti">${grid}${xl}${paths}</svg>`);
}

// Sloupcový graf po hodinách (0–23).
export function hourBars(rows, { width = 360, height = 120 } = {}) {
  const counts = Array.from({ length: 24 }, (_, h) => rows.find((r) => r.h === h)?.n || 0);
  const max = Math.max(1, ...counts);
  const bw = width / 24;
  const bars = counts.map((c, h) => {
    const bh = (c / max) * (height - 20);
    return `<rect x="${h * bw + 1}" y="${height - 16 - bh}" width="${bw - 2}" height="${Math.max(bh, 1)}" rx="2" class="bar"><title>${h}:00 – ${fmtNum(c)} zobrazení</title></rect>`;
  }).join('');
  const ticks = [0, 6, 12, 18, 23].map((h) => `<text x="${h * bw + bw / 2}" y="${height - 2}" class="axis" text-anchor="middle">${h}</text>`).join('');
  return raw(`<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Návštěvnost podle hodiny">${bars}${ticks}</svg>`);
}

// Horizontální pruhy jako HTML seznam.
export function barList(rows, { label, value, href, empty = 'Zatím žádná data' } = {}) {
  if (!rows.length) return html`<p class="muted small">${empty}</p>`;
  const max = Math.max(...rows.map((r) => r[value]));
  return html`<ul class="bar-list">${rows.map((r) => html`<li>
    <span class="bl-fill" style="width:${((r[value] / max) * 100).toFixed(1)}%"></span>
    <span class="bl-label">${href ? html`<a href="${href(r)}">${r[label] || '–'}</a>` : (r[label] || '–')}</span>
    <span class="bl-value">${fmtNum(r[value])}</span></li>`)}</ul>`;
}

// Prstencový graf.
export function donut(rows, { label, value }) {
  const total = rows.reduce((s, r) => s + r[value], 0);
  if (!total) return html`<p class="muted small">Zatím žádná data</p>`;
  let acc = 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const segs = rows.map((row, i) => {
    const frac = row[value] / total;
    const seg = `<circle r="${r}" cx="60" cy="60" class="donut-seg s${i % 5}" stroke-dasharray="${(frac * c).toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-acc * c).toFixed(2)}"><title>${row[label]}: ${fmtNum(row[value])}</title></circle>`;
    acc += frac;
    return seg;
  }).join('');
  return html`<div class="donut-wrap">${raw(`<svg viewBox="0 0 120 120" class="donut" role="img" aria-label="Podíl zařízení">${segs}<text x="60" y="58" text-anchor="middle" class="donut-total">${fmtNum(total)}</text><text x="60" y="74" text-anchor="middle" class="donut-cap">celkem</text></svg>`)}
    <ul class="donut-legend">${rows.map((row, i) => html`<li><span class="dl-sw s${i % 5}"></span>${row[label]}<b>${Math.round((row[value] / total) * 100)} %</b></li>`)}</ul></div>`;
}
