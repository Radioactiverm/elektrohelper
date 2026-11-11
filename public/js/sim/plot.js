// Lehká knihovna pro grafy na canvasu (lineární i logaritmické osy, barvy z motivu).

export function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  const dark = document.documentElement.dataset.theme === 'dark';
  return {
    dark,
    bg: v('--md-sys-color-surface'),
    grid: v('--md-sys-color-surface-variant'),
    gridStrong: v('--md-sys-color-outline-variant'),
    axis: v('--md-sys-color-on-surface-variant'),
    text: v('--md-sys-color-on-surface'),
    primary: v('--md-sys-color-primary'),
    secondary: v('--md-sys-color-secondary'),
    tertiary: v('--md-sys-color-tertiary'),
    error: v('--md-sys-color-error'),
    l1: v('--wire-l1') || '#8d5a2b',
    l2: dark ? '#e3e3e3' : '#1c1b1f',
    l3: v('--wire-l3') || '#8f9399',
    n: v('--wire-n'),
    peG: v('--wire-pe-g'),
    peY: v('--wire-pe-y'),
    warn: v('--c-warning'),
    formula: v('--c-formula'),
  };
}

const FONT = '500 11px "Roboto Flex", system-ui, sans-serif';
const MONO = '500 11px "Roboto Mono", monospace';

function niceStep(range, target) {
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}

export function fmt(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1000) return `${+(v / 1000).toFixed(a >= 1e4 ? 0 : 1)}k`;
  if (a >= 1) return `${+v.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : 2)}`.replace('.', ',');
  return `${+v.toPrecision(2)}`.replace('.', ',');
}

export class Plot {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} o – {x: {min, max, log, label}, y: {...}, y2?: {...}, pad}
   */
  constructor(canvas, o) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = o;
    this.pad = { l: 46, r: o.y2 ? 46 : 14, t: o.y2?.label ? 24 : 12, b: 30, ...(o.pad || {}) };
    this.colors = themeColors();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    document.addEventListener('themechange', () => { this.colors = themeColors(); });
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || 300;
    // V .chart-box určuje výšku kontejner (graf vyplní obrazovku), jinak atribut height.
    const fill = this.canvas.parentElement?.classList.contains('chart-box');
    const h = (fill ? this.canvas.clientHeight : Number(this.canvas.getAttribute('height'))) || 240;
    if (!fill) this.canvas.style.height = `${h}px`;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr) || this.dpr !== dpr) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.dpr = dpr;
    }
    this.w = w;
    this.h = h;
    this.dirty = true;
  }
  get pw() { return this.w - this.pad.l - this.pad.r; }
  get ph() { return this.h - this.pad.t - this.pad.b; }
  sx(x, ax = this.o.x) {
    const f = ax.log ? (Math.log10(x) - Math.log10(ax.min)) / (Math.log10(ax.max) - Math.log10(ax.min)) : (x - ax.min) / (ax.max - ax.min);
    return this.pad.l + f * this.pw;
  }
  sy(y, ax = this.o.y) {
    const f = ax.log ? (Math.log10(y) - Math.log10(ax.min)) / (Math.log10(ax.max) - Math.log10(ax.min)) : (y - ax.min) / (ax.max - ax.min);
    return this.pad.t + (1 - f) * this.ph;
  }
  begin() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.grid();
  }
  ticks(ax, horizontal) {
    const out = [];
    if (ax.log) {
      for (let e = Math.floor(Math.log10(ax.min)); e <= Math.ceil(Math.log10(ax.max)); e++) {
        for (let m = 1; m < 10; m++) {
          const v = m * 10 ** e;
          if (v >= ax.min * 0.999 && v <= ax.max * 1.001) out.push({ v, major: m === 1, label: m === 1 || (horizontal && (m === 2 || m === 5)) });
        }
      }
    } else {
      const step = ax.step || niceStep(ax.max - ax.min, horizontal ? Math.max(3, this.pw / 80) : Math.max(3, this.ph / 45));
      for (let v = Math.ceil(ax.min / step) * step; v <= ax.max + step * 1e-6; v += step) out.push({ v, major: true, label: true });
    }
    return out;
  }
  grid() {
    const { ctx, o, colors } = this;
    ctx.lineWidth = 1;
    ctx.font = FONT;
    for (const t of this.ticks(o.x, true)) {
      const x = Math.round(this.sx(t.v)) + 0.5;
      ctx.strokeStyle = t.major ? colors.gridStrong : colors.grid;
      ctx.beginPath(); ctx.moveTo(x, this.pad.t); ctx.lineTo(x, this.pad.t + this.ph); ctx.stroke();
      if (t.label) {
        ctx.fillStyle = colors.axis; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText((o.x.fmt || fmt)(t.v), x, this.pad.t + this.ph + 6);
      }
    }
    for (const t of this.ticks(o.y, false)) {
      const y = Math.round(this.sy(t.v)) + 0.5;
      ctx.strokeStyle = t.major ? colors.gridStrong : colors.grid;
      ctx.beginPath(); ctx.moveTo(this.pad.l, y); ctx.lineTo(this.pad.l + this.pw, y); ctx.stroke();
      if (t.label) {
        ctx.fillStyle = colors.axis; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText((o.y.fmt || fmt)(t.v), this.pad.l - 6, y);
      }
    }
    if (o.y2) {
      for (const t of this.ticks(o.y2, false)) {
        const y = this.sy(t.v, o.y2);
        ctx.fillStyle = o.y2.color || colors.axis; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText((o.y2.fmt || fmt)(t.v), this.pad.l + this.pw + 6, y);
      }
    }
    // popisky os
    ctx.fillStyle = colors.axis;
    ctx.font = '600 11px "Roboto Flex", system-ui, sans-serif';
    if (o.x.label) { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(o.x.label, this.pad.l + this.pw, this.pad.t + this.ph - 4); }
    if (o.y.label) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(o.y.label, this.pad.l + 6, this.pad.t + 4); }
    if (o.y2?.label) { ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = o.y2.color || colors.axis; ctx.fillText(o.y2.label, this.w - 4, 4); }
  }
  clip(fn) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.pad.l, this.pad.t, this.pw, this.ph);
    ctx.clip();
    fn();
    ctx.restore();
  }
  // Čára z pole bodů [[x, y], …]
  line(points, { color, width = 2, dash = null, axis, alpha = 1 } = {}) {
    const { ctx } = this;
    this.clip(() => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      let pen = false;
      for (const [x, y] of points) {
        if (!Number.isFinite(x) || !Number.isFinite(y) || (this.o.y.log && y <= 0) || (this.o.x.log && x <= 0)) { pen = false; continue; }
        const px = this.sx(x);
        const py = axis ? this.sy(y, axis) : this.sy(y);
        if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });
  }
  // Vyplněné pásmo mezi dvěma křivkami: [[x, yLow, yHigh], …]
  band(rows, color, alpha = 0.18) {
    const { ctx } = this;
    const pts = rows.filter(([x, a, b]) => Number.isFinite(x) && a > 0 && Number.isFinite(a));
    if (pts.length < 2) return;
    const clampY = (v) => Math.min(Math.max(v, this.o.y.min * 0.5), this.o.y.max * 2);
    this.clip(() => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      pts.forEach(([x, a], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, this.sx(x), this.sy(clampY(a))));
      for (let i = pts.length - 1; i >= 0; i--) {
        const [x, , b] = pts[i];
        ctx.lineTo(this.sx(x), this.sy(clampY(Number.isFinite(b) ? b : this.o.y.max * 2)));
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
  dot(x, y, { color, r = 4, ring = true } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const { ctx } = this;
    this.clip(() => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(this.sx(x), this.sy(y), r, 0, Math.PI * 2); ctx.fill();
      if (ring) { ctx.strokeStyle = this.colors.bg; ctx.lineWidth = 2; ctx.stroke(); }
    });
  }
  vline(x, { color, dash = [4, 4], label } = {}) {
    if (!Number.isFinite(x) || x < this.o.x.min || x > this.o.x.max) return;
    const { ctx } = this;
    const px = this.sx(x);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(px, this.pad.t); ctx.lineTo(px, this.pad.t + this.ph); ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.font = MONO; ctx.fillStyle = color; ctx.textAlign = px > this.pad.l + this.pw - 60 ? 'right' : 'left'; ctx.textBaseline = 'top';
      ctx.fillText(label, px + (ctx.textAlign === 'right' ? -4 : 4), this.pad.t + 18);
    }
  }
  hline(y, { color, dash = [4, 4], label } = {}) {
    if (!Number.isFinite(y) || y < this.o.y.min || y > this.o.y.max) return;
    const { ctx } = this;
    const py = this.sy(y);
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(this.pad.l, py); ctx.lineTo(this.pad.l + this.pw, py); ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.font = MONO; ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(label, this.pad.l + this.pw - 4, py - 3);
    }
  }
  legend(items) {
    const { ctx } = this;
    ctx.font = '600 11px "Roboto Flex", system-ui, sans-serif';
    let x = this.pad.l + this.pw - 6;
    ctx.textBaseline = 'middle';
    for (const it of [...items].reverse()) {
      const w = ctx.measureText(it.label).width;
      ctx.fillStyle = this.colors.axis; ctx.textAlign = 'right';
      ctx.fillText(it.label, x, this.pad.t + 10);
      x -= w + 6;
      ctx.fillStyle = it.color;
      ctx.fillRect(x - 12, this.pad.t + 8, 12, 4);
      x -= 22;
    }
  }
  message(text) {
    const { ctx } = this;
    ctx.font = '500 13px "Roboto Flex", system-ui, sans-serif';
    ctx.fillStyle = this.colors.axis; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, this.pad.l + this.pw / 2, this.pad.t + this.ph / 2);
  }
}
