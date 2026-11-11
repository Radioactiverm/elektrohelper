// Interaktivní schémata: vykreslení značek (ČSN EN 60617), síť uzlů a reléová logika.
//
// Schéma = { width, height, devices: {...}, components: [...], wires: [[[x,y],…], …] }
// Vodiče se spojují v bodech, kde se dotýkají (konce, lomy, ležící na jiném vodiči).
// Prvky (kontakty, cívky…) mají vývody v definovaných bodech; kontakty vedou podle stavu přístroje.

const SVGNS = 'http://www.w3.org/2000/svg';
const PHASES = ['L1', 'L2', 'L3'];

// --- Geometrie značek -----------------------------------------------------------------
// Vývody v lokálních souřadnicích (před otočením).
const TERMINALS = {
  src: [[0, 0]],
  fuse: [[0, 0], [0, 60]],
  no: [[0, 0], [0, 60]],
  nc: [[0, 0], [0, 60]],
  pb_no: [[0, 0], [0, 60]],
  pb_nc: [[0, 0], [0, 60]],
  olr_nc: [[0, 0], [0, 60]],
  olr_no: [[0, 0], [0, 60]],
  timer_no: [[0, 0], [0, 60]],
  timer_nc: [[0, 0], [0, 60]],
  switch: [[0, 0], [0, 60]],
  q1p: [[0, 0], [0, 60]],
  coil: [[0, 0], [0, 60]],
  coil_timer: [[0, 0], [0, 60]],
  lamp: [[0, 0], [0, 60]],
  co: [[0, 0], [-12, 60], [12, 60]],
  cross: [[-12, 0], [12, 0], [-12, 60], [12, 60]],
  series5: [[0, 0], [-12, 60], [12, 60]],
  q3: [[0, 0], [20, 0], [40, 0], [0, 60], [20, 60], [40, 60]],
  km3: [[0, 0], [20, 0], [40, 0], [0, 60], [20, 60], [40, 60]],
  fu3: [[0, 0], [20, 0], [40, 0], [0, 60], [20, 60], [40, 60]],
  olr3: [[0, 0], [20, 0], [40, 0], [0, 60], [20, 60], [40, 60]],
  motor3: [[0, 0], [20, 0], [40, 0]],
  motor6: [[0, 0], [20, 0], [40, 0], [0, 110], [20, 110], [40, 110]],
  terminal: [[0, 0]],
  text: [],
  frame: [],
};

function rotate([x, y], rot = 0) {
  switch (((rot % 360) + 360) % 360) {
    case 90: return [-y, x];
    case 180: return [-x, -y];
    case 270: return [y, -x];
    default: return [x, y];
  }
}

export function terminalsOf(c) {
  return (TERMINALS[c.type] || []).map((t) => {
    const [dx, dy] = rotate(t, c.rot);
    return [c.x + dx, c.y + dy];
  });
}

// --- Union-find --------------------------------------------------------------------------
class UF {
  constructor(n = 0) { this.p = Array.from({ length: n }, (_, i) => i); }
  add() { this.p.push(this.p.length); return this.p.length - 1; }
  find(a) { while (this.p[a] !== a) { this.p[a] = this.p[this.p[a]]; a = this.p[a]; } return a; }
  union(a, b) { a = this.find(a); b = this.find(b); if (a !== b) this.p[b] = a; }
  clone() { const u = new UF(); u.p = this.p.slice(); return u; }
}

function onSegment([px, py], [ax, ay], [bx, by]) {
  const eps = 0.6;
  if (px < Math.min(ax, bx) - eps || px > Math.max(ax, bx) + eps || py < Math.min(ay, by) - eps || py > Math.max(ay, by) + eps) return false;
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  return Math.abs(cross) / (Math.hypot(bx - ax, by - ay) || 1) < eps;
}

// Sestaví síť: každému vodiči a vývodu přiřadí uzel.
export function buildNetlist(data) {
  const uf = new UF();
  const keyId = new Map();
  const id = ([x, y]) => {
    const k = `${Math.round(x)},${Math.round(y)}`;
    if (!keyId.has(k)) keyId.set(k, uf.add());
    return keyId.get(k);
  };
  const wires = data.wires.map((pts) => {
    const ids = pts.map(id);
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
    return { pts, root: ids[0] };
  });
  const arms = new Map();
  const addArm = (p, n) => { const k = `${Math.round(p[0])},${Math.round(p[1])}`; arms.set(k, (arms.get(k) || 0) + n); };
  wires.forEach((w) => w.pts.forEach((p, i) => addArm(p, i === 0 || i === w.pts.length - 1 ? 1 : 2)));

  const attach = (pt) => {
    const pid = id(pt);
    for (const w of wires) {
      for (let i = 1; i < w.pts.length; i++) {
        if (onSegment(pt, w.pts[i - 1], w.pts[i])) {
          uf.union(pid, w.root);
          const isVertex = w.pts.some((q) => Math.round(q[0]) === Math.round(pt[0]) && Math.round(q[1]) === Math.round(pt[1]));
          if (!isVertex) addArm(pt, 2);
        }
      }
    }
    return pid;
  };
  // Konce vodičů ležící na jiném vodiči (T-spoj)
  wires.forEach((w) => { attach(w.pts[0]); attach(w.pts[w.pts.length - 1]); });
  const comps = data.components.map((c) => ({ ...c, terms: terminalsOf(c).map(attach) }));
  const junctions = [...arms].filter(([, n]) => n >= 3).map(([k]) => k.split(',').map(Number));
  return { uf, wires, comps, junctions };
}

// --- Stav přístrojů ------------------------------------------------------------------------
function initDevices(defs) {
  const st = {};
  for (const [id, d] of Object.entries(defs || {})) {
    st[id] = {
      type: d.type,
      on: d.type === 'breaker' ? d.on !== false : !!d.on,
      pressed: false,
      tripped: false,
      blown: false,
      a: false,
      b: false,
      since: null,
      done: false,
    };
  }
  return st;
}

// Které dvojice vývodů prvku jsou vodivě spojené
function conducting(c, dev) {
  const d = dev || {};
  const t = c.terms;
  switch (c.type) {
    case 'no': return d.on ? [[t[0], t[1]]] : [];
    case 'nc': return d.on ? [] : [[t[0], t[1]]];
    case 'pb_no': return d.pressed ? [[t[0], t[1]]] : [];
    case 'pb_nc': return d.pressed ? [] : [[t[0], t[1]]];
    case 'olr_nc': return d.tripped ? [] : [[t[0], t[1]]];
    case 'olr_no': return d.tripped ? [[t[0], t[1]]] : [];
    case 'timer_no': return d.done ? [[t[0], t[1]]] : [];
    case 'timer_nc': return d.done ? [] : [[t[0], t[1]]];
    case 'switch': case 'q1p': return d.on ? [[t[0], t[1]]] : [];
    case 'fuse': return dev && d.blown ? [] : [[t[0], t[1]]];
    case 'co': return d.on ? [[t[0], t[2]]] : [[t[0], t[1]]];
    case 'cross': return d.on ? [[t[0], t[3]], [t[1], t[2]]] : [[t[0], t[2]], [t[1], t[3]]];
    case 'series5': return [...(d.a ? [[t[0], t[1]]] : []), ...(d.b ? [[t[0], t[2]]] : [])];
    case 'q3': case 'km3': return d.on ? [[t[0], t[3]], [t[1], t[4]], [t[2], t[5]]] : [];
    case 'fu3': return dev && d.blown ? [] : [[t[0], t[3]], [t[1], t[4]], [t[2], t[5]]];
    case 'olr3': return [[t[0], t[3]], [t[1], t[4]], [t[2], t[5]]];
    default: return [];
  }
}

// --- Vykreslení značek -------------------------------------------------------------------------
function contactBlade(type, closed) {
  // pevný kontakt nahoře (0,18), pohyblivý z (0,42)
  if (type === 'nc') return closed ? 'M0 42 L10 16' : 'M0 42 L-11 20';
  return closed ? 'M0 42 L0 18' : 'M0 42 L-11 20';
}

function symbol(c, d) {
  const base = c.type.replace(/^(pb_|olr_|timer_)/, '');
  const leads = '<path d="M0 0 V18 M0 42 V60"/>';
  switch (c.type) {
    case 'src':
      return `<circle r="3" class="solid"/>`;
    case 'terminal':
      return `<circle r="4" class="fill"/>`;
    case 'fuse':
      return `<path d="M0 0 V15 M0 45 V60"/><rect x="-6" y="15" width="12" height="30" class="fill"/><path d="M0 15 V45"/>${d?.blown ? '<path d="M-9 24 L9 36 M9 24 L-9 36" style="stroke:var(--md-sys-color-error);stroke-width:2.5"/>' : ''}`;
    case 'no': case 'nc': case 'pb_no': case 'pb_nc': case 'olr_nc': case 'olr_no': case 'timer_no': case 'timer_nc': case 'switch': case 'q1p': {
      let closed = false;
      if (c.type === 'no' || c.type === 'switch' || c.type === 'q1p') closed = !!d?.on;
      if (c.type === 'nc') closed = !d?.on;
      if (c.type === 'pb_no') closed = !!d?.pressed;
      if (c.type === 'pb_nc') closed = !d?.pressed;
      if (c.type === 'olr_nc') closed = !d?.tripped;
      if (c.type === 'olr_no') closed = !!d?.tripped;
      if (c.type === 'timer_no') closed = !!d?.done;
      if (c.type === 'timer_nc') closed = !d?.done;
      const isNC = base === 'nc';
      let extra = isNC ? '<path d="M0 18 H10"/>' : '';
      if (c.type === 'q1p') extra += '<path d="M-4 14 L4 22 M4 14 L-4 22"/>';
      const mid = isNC ? (closed ? [5, 29] : [-5, 31]) : (closed ? [0, 30] : [-5, 31]);
      if (c.type.startsWith('pb_')) {
        const off = d?.pressed ? 4 : 0;
        extra += `<path class="link" d="M${mid[0]} ${mid[1]} H${-24 + off}"/><path d="M${-24 + off} 22 H${-30 + off} V38 H${-24 + off}"/>`;
      } else if (c.type.startsWith('olr_')) {
        extra += `<path class="link" d="M${mid[0]} ${mid[1]} H-20"/><path d="M-20 24 H-26 V30 H-32 V36 H-26"/>`;
      } else if (c.type.startsWith('timer_')) {
        extra += `<path class="link" d="M${mid[0]} ${mid[1]} H-22"/><path d="M-22 22 A8 8 0 0 0 -22 38"/>`;
      } else if (c.type === 'switch' || c.type === 'q1p') {
        extra += `<path class="link" d="M${mid[0]} ${mid[1]} H-20"/><path d="M-20 26 V34"/>`;
      }
      return `${leads}${extra}<path class="contact-blade" d="${contactBlade(isNC ? 'nc' : 'no', closed)}"/>`;
    }
    case 'coil': case 'coil_timer':
      return `<path d="M0 0 V22 M0 38 V60"/><rect x="-16" y="22" width="32" height="16" class="fill coil-body"/>${c.type === 'coil_timer' ? '<rect x="-16" y="22" width="9" height="16" class="solid"/>' : ''}`;
    case 'lamp':
      return `<path d="M0 0 V18 M0 42 V60"/><circle cy="30" r="17" class="lamp-glow"/><circle cy="30" r="12" class="fill lamp-body"/><path d="M-8.5 21.5 L8.5 38.5 M8.5 21.5 L-8.5 38.5"/>`;
    case 'co': {
      const end = d?.on ? [12, 42] : [-12, 42];
      return `<path d="M0 0 V18 M-12 42 V60 M12 42 V60"/><circle cx="0" cy="18" r="2.5" class="solid"/><path class="contact-blade" d="M0 18 L${end[0]} ${end[1]}"/>`;
    }
    case 'cross': {
      const inner = d?.on ? 'M-12 18 L12 42 M12 18 L-12 42' : 'M-12 18 V42 M12 18 V42';
      return `<path d="M-12 0 V18 M12 0 V18 M-12 42 V60 M12 42 V60"/><rect x="-20" y="12" width="40" height="36" rx="4" class="link"/><path class="contact-blade" d="${inner}"/>`;
    }
    case 'series5': {
      const a = d?.a ? 'M0 18 L-12 42' : 'M0 18 L-20 36';
      const b = d?.b ? 'M0 18 L12 42' : 'M0 18 L20 36';
      return `<path d="M0 0 V18 M-12 42 V60 M12 42 V60"/><circle cx="0" cy="18" r="2.5" class="solid"/><path class="contact-blade" d="${a} ${b}"/>`;
    }
    case 'q3': case 'km3': case 'fu3': case 'olr3': {
      let s = '';
      const on = !!d?.on;
      for (const x of [0, 20, 40]) {
        if (c.type === 'fu3') {
          s += `<path d="M${x} 0 V15 M${x} 45 V60"/><rect x="${x - 6}" y="15" width="12" height="30" class="fill"/><path d="M${x} 15 V45"/>`;
        } else if (c.type === 'olr3') {
          s += `<path d="M${x} 0 V18 M${x} 42 V60"/><path d="M${x} 18 V24 H${x + 6} V36 H${x} V42"/>`;
        } else {
          s += `<path d="M${x} 0 V18 M${x} 42 V60"/><path class="contact-blade" d="${on ? `M${x} 42 L${x} 18` : `M${x} 42 L${x - 11} 20`}"/>`;
          if (c.type === 'q3') s += `<path d="M${x - 4} 14 L${x + 4} 22 M${x + 4} 14 L${x - 4} 22"/>`;
          else s += `<path d="M${x - 5} 18 A5 5 0 0 0 ${x + 5} 18"/>`;
        }
      }
      if (c.type === 'q3' || c.type === 'km3') s += `<path class="link" d="M${on ? 0 : -5} 30 H${on ? 40 : 34} M${on ? 0 : -5} 30 H-18"/>`;
      if (c.type === 'q3') s += '<path d="M-18 24 V36"/>';
      if (c.type === 'olr3') s += '<path class="link" d="M-2 30 H-16"/>';
      if (c.type === 'fu3' && d?.blown) s += '<path d="M-10 22 L50 38 M50 22 L-10 38" style="stroke:var(--md-sys-color-error);stroke-width:2.5"/>';
      return s;
    }
    case 'motor3':
      return `<path d="M0 0 V24 L8 34 M20 0 V30 M40 0 V24 L32 34"/><circle cx="20" cy="54" r="24" class="fill motor-body"/>
        <g class="rotor"><path d="M20 36 A18 18 0 0 1 38 54" class="link" style="stroke-dasharray:3 5"/><path d="M20 72 A18 18 0 0 1 2 54" class="link" style="stroke-dasharray:3 5"/></g>
        <text x="20" y="54" text-anchor="middle" class="sch-label" style="font-size:17px;stroke:none" dy="2">M</text><text x="20" y="70" text-anchor="middle" class="sch-label" style="font-size:11px;stroke:none">3~</text>`;
    case 'motor6':
      return `<path d="M0 0 V30 M20 0 V26 M40 0 V30 M0 110 V80 M20 110 V84 M40 110 V80"/><circle cx="20" cy="55" r="30" class="fill motor-body"/>
        <g class="rotor"><path d="M20 33 A22 22 0 0 1 42 55" class="link" style="stroke-dasharray:3 5"/><path d="M20 77 A22 22 0 0 1 -2 55" class="link" style="stroke-dasharray:3 5"/></g>
        <text x="20" y="56" text-anchor="middle" class="sch-label" style="font-size:18px;stroke:none" dy="2">M</text><text x="20" y="72" text-anchor="middle" class="sch-label" style="font-size:11px;stroke:none">3~</text>`;
    default:
      return '';
  }
}

function bounds(c) {
  switch (c.type) {
    case 'q3': case 'km3': case 'fu3': case 'olr3': return [-24, -2, 72, 64];
    case 'motor3': return [-6, -2, 52, 82];
    case 'motor6': return [-14, -2, 68, 114];
    case 'co': case 'cross': case 'series5': return [-24, -2, 48, 64];
    case 'pb_no': case 'pb_nc': case 'olr_nc': case 'olr_no': case 'timer_no': case 'timer_nc': return [-36, -2, 52, 64];
    case 'src': case 'terminal': return [-10, -10, 20, 20];
    default: return [-20, -2, 40, 64];
  }
}

const INTERACTIVE = new Set(['button', 'switch', 'breaker', 'series']);

// --- Hlavní třída ----------------------------------------------------------------------------------
export class Schematic {
  /**
   * @param {HTMLElement} host
   * @param {object} data
   * @param {object} [opts] – {controls, onLog, onStatus, onEvent, interactive, zoom}
   */
  constructor(host, data, opts = {}) {
    this.host = host;
    this.data = data;
    this.opts = { interactive: true, zoom: 1, ...opts };
    this.zoom = this.opts.zoom;
    this.net = buildNetlist(data);
    this.dev = initDevices(data.devices);
    this.timers = [];
    this.render();
    this.solve(true);
    if (this.opts.controls) this.buildControls(this.opts.controls);
  }

  destroy() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.host.innerHTML = '';
    if (this.opts.controls) this.opts.controls.innerHTML = '';
  }

  log(text, cls) { this.opts.onLog?.(text, cls); }

  // --- Vykreslení -------------------------------------------------------------------------------
  render() {
    const { data } = this;
    const w = data.width || 600;
    const h = data.height || 400;
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', data.title || 'Schéma zapojení');
    svg.classList.add('sch');
    this.svg = svg;
    this.setZoom(this.zoom);
    const uid = Math.random().toString(36).slice(2, 8);
    let html = `<defs><pattern id="g${uid}" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r=".9" fill="var(--sch-grid)"/></pattern></defs>`;
    if (data.grid !== false) html += `<rect width="${w}" height="${h}" fill="url(#g${uid})"/>`;
    // rámečky a texty pod vším
    for (const c of data.components) {
      if (c.type === 'frame') {
        html += `<g class="sch-frame"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="8" fill="none" stroke="var(--md-sys-color-outline-variant)" stroke-dasharray="6 5"/>${c.label ? `<text x="${c.x + 10}" y="${c.y + 18}" class="sch-pin" style="font-size:11px;font-weight:700">${esc(c.label)}</text>` : ''}</g>`;
      }
    }
    html += '<g class="wires"></g><g class="junctions"></g><g class="comps"></g><g class="texts"></g>';
    svg.innerHTML = html;
    this.gWires = svg.querySelector('.wires');
    this.gComps = svg.querySelector('.comps');
    const gTexts = svg.querySelector('.texts');
    const gJ = svg.querySelector('.junctions');

    this.wireEls = this.net.wires.map((wr) => {
      const p = document.createElementNS(SVGNS, 'polyline');
      p.setAttribute('points', wr.pts.map((q) => q.join(',')).join(' '));
      p.setAttribute('class', 'sch-wire');
      this.gWires.appendChild(p);
      return p;
    });
    for (const [x, y] of this.net.junctions) {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 3.5);
      c.setAttribute('class', 'sch-dot');
      gJ.appendChild(c);
    }

    this.compEls = this.net.comps.map((c) => {
      if (c.type === 'frame') return null;
      if (c.type === 'text') {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', c.x); t.setAttribute('y', c.y);
        t.setAttribute('class', c.cls || 'sch-pin');
        if (c.size) t.style.fontSize = `${c.size}px`;
        if (c.anchor) t.setAttribute('text-anchor', c.anchor);
        t.textContent = c.text;
        gTexts.appendChild(t);
        return null;
      }
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'sch-comp');
      g.setAttribute('transform', `translate(${c.x} ${c.y})`);
      const devDef = c.dev && this.data.devices?.[c.dev];
      const clickable = this.opts.interactive && devDef && INTERACTIVE.has(devDef.type);
      if (clickable) {
        g.classList.add('clickable');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', devDef.label || c.dev);
        this.bindPointer(g, c);
      }
      const [bx, by, bw, bh] = bounds(c);
      const rot = c.rot ? ` transform="rotate(${c.rot})"` : '';
      g.innerHTML = `<rect class="sch-hit" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8"${rot}/><g class="sch-sym"${rot}></g>`;
      // popisky (neotáčejí se)
      if (c.type === 'src') {
        const t = document.createElementNS(SVGNS, 'text');
        const [lx, ly] = c.labelAt || [0, -10];
        t.setAttribute('x', lx); t.setAttribute('y', ly); t.setAttribute('text-anchor', 'middle');
        t.setAttribute('class', `sch-src p-${c.net}`);
        t.textContent = c.label || c.net;
        g.appendChild(t);
      } else if (c.label) {
        const t = document.createElementNS(SVGNS, 'text');
        const def = { q3: [-26, 34], km3: [-26, 34], olr3: [-20, 34], fu3: [-12, 34], motor3: [50, 60], motor6: [58, 60], co: [18, 34], cross: [24, 34], series5: [18, 34], src: [0, -10], lamp: [18, 34], coil: [21, 34], coil_timer: [21, 34] }[c.type] || [14, 36];
        const [lx, ly] = c.labelAt || def;
        t.setAttribute('x', lx); t.setAttribute('y', ly);
        t.setAttribute('class', 'sch-label');
        if ((['q3', 'km3', 'olr3', 'fu3'].includes(c.type) && !c.labelAt) || c.labelAt?.[0] < 0) t.setAttribute('text-anchor', 'end');
        t.textContent = c.label;
        g.appendChild(t);
      }
      if (c.pins) {
        const pts = TERMINALS[c.type];
        c.pins.forEach((pin, i) => {
          if (!pin || !pts[i]) return;
          const [px, py] = rotate(pts[i], c.rot);
          const t = document.createElementNS(SVGNS, 'text');
          t.setAttribute('x', px + 5); t.setAttribute('y', py + (py > 30 ? -4 : 12));
          t.setAttribute('class', 'sch-pin');
          t.textContent = pin;
          g.appendChild(t);
        });
      }
      if (c.type === 'coil_timer' || c.type === 'coil') {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', 21); t.setAttribute('y', 52);
        t.setAttribute('class', 'sch-timer');
        g.appendChild(t);
        g._timerText = t;
      }
      this.gComps.appendChild(g);
      return g;
    });
    this.host.innerHTML = '';
    this.host.appendChild(svg);
  }

  setZoom(z) {
    this.zoom = Math.min(2.5, Math.max(0.5, z));
    const w = this.data.width || 600;
    const h = this.data.height || 400;
    if (this.opts.fit) {
      this.svg.setAttribute('width', '100%');
      this.svg.removeAttribute('height');
    } else {
      this.svg.setAttribute('width', w * this.zoom);
      this.svg.setAttribute('height', h * this.zoom);
    }
  }

  bindPointer(g, c) {
    const devId = c.dev;
    const d = this.data.devices[devId];
    if (d.type === 'button') {
      const down = (e) => { e.preventDefault(); g.setPointerCapture?.(e.pointerId); this.press(devId, true); };
      const up = () => this.press(devId, false);
      g.addEventListener('pointerdown', down);
      g.addEventListener('pointerup', up);
      g.addEventListener('pointercancel', up);
      g.addEventListener('lostpointercapture', up);
      g.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); this.press(devId, true); } });
      g.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') this.press(devId, false); });
    } else if (d.type === 'series') {
      g.addEventListener('click', (e) => {
        const r = g.getBoundingClientRect();
        this.toggle(devId, e.clientX < r.left + r.width / 2 ? 'a' : 'b');
      });
      g.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.toggle(devId, 'a'); } });
    } else {
      g.addEventListener('click', () => this.toggle(devId));
      g.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.toggle(devId); } });
    }
  }

  // --- Ovládání ----------------------------------------------------------------------------------
  name(id) { return this.data.devices?.[id]?.label || id; }

  press(id, down) {
    const d = this.dev[id];
    if (!d || d.pressed === down) return;
    d.pressed = down;
    if (down) {
      this.log(`${this.name(id)} stisknuto`);
      this.opts.onEvent?.('schematic_action', this.data.title);
    }
    this.solve();
  }

  toggle(id, part) {
    const d = this.dev[id];
    if (!d) return;
    if (part) d[part] = !d[part];
    else d.on = !d.on;
    if (d.on) d.tripped = false;
    const def = this.data.devices[id];
    if (def.type === 'breaker') this.log(`${this.name(id)} ${d.on ? 'zapnut' : 'vypnut'}`, d.on ? 'ev-ok' : '');
    else if (def.type === 'series') this.log(`${this.name(id)}: kolébka ${part === 'a' ? 'A' : 'B'} ${d[part] ? 'zapnuta' : 'vypnuta'}`);
    else this.log(`${this.name(id)} přepnut ${d.on ? '(poloha 2)' : '(poloha 1)'}`);
    this.opts.onEvent?.('schematic_action', this.data.title);
    this.solve();
  }

  trip(id, on = true) {
    const d = this.dev[id];
    if (!d) return;
    d.tripped = on;
    this.log(on ? `${this.name(id)}: přetížení – rozepnul kontakt 95–96` : `${this.name(id)} resetováno`, on ? 'ev-trip' : 'ev-ok');
    this.solve();
  }

  replaceFuse(id) {
    const d = this.dev[id];
    if (!d) return;
    d.blown = false;
    this.log(`${this.name(id)}: pojistka vyměněna`, 'ev-ok');
    this.solve();
  }

  reset() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.dev = initDevices(this.data.devices);
    this.log('Výchozí stav');
    this.solve(true);
  }

  // --- Výpočet ------------------------------------------------------------------------------------
  groups(extraOpen = null) {
    const uf = this.net.uf.clone();
    for (const c of this.net.comps) {
      if (extraOpen && c.dev === extraOpen) continue;
      for (const [a, b] of conducting(c, c.dev ? this.dev[c.dev] : null)) uf.union(a, b);
    }
    const pot = new Map(); // kořen → množina potenciálů
    for (const c of this.net.comps) {
      if (c.type !== 'src') continue;
      const r = uf.find(c.terms[0]);
      if (!pot.has(r)) pot.set(r, new Set());
      pot.get(r).add(c.net);
    }
    return { uf, pot };
  }

  static isShort(set) {
    if (!set || set.size < 2) return false;
    const ph = [...set].filter((p) => PHASES.includes(p));
    return ph.length >= 2 || (ph.length === 1 && (set.has('N') || set.has('PE')));
  }

  solve(silent = false) {
    const note = (text, cls) => { if (!silent) this.log(text, cls); };
    let g;
    for (let iter = 0; iter < 25; iter++) {
      g = this.groups();
      // Zkrat → vybaví první ochrana v cestě zkratového proudu
      const shorted = [...g.pot.values()].some((s) => Schematic.isShort(s));
      if (shorted) {
        // selektivita: nejdřív vybaví ochrana s nejmenším jmenovitým proudem (nejblíž poruše)
        const prot = Object.entries(this.data.devices || {})
          .filter(([id, d]) => (d.type === 'breaker' && this.dev[id].on) || (d.type === 'fuse' && !this.dev[id].blown))
          .sort((a, b) => (a[1].rating ?? 1e3) - (b[1].rating ?? 1e3));
        let cleared = false;
        for (const [id, d] of prot) {
          const test = this.groups(id);
          if (![...test.pot.values()].some((s) => Schematic.isShort(s))) {
            if (d.type === 'breaker') { this.dev[id].on = false; this.dev[id].tripped = true; }
            else this.dev[id].blown = true;
            this.log(`⚡ ZKRAT! ${d.type === 'breaker' ? 'Vybavil' : 'Přetavila se'} ${this.name(id)}`, 'ev-trip');
            this.opts.onEvent?.('schematic_short', this.data.title);
            this.flashShort();
            cleared = true;
            break;
          }
        }
        if (cleared) continue;
        this.shortActive = true;
      } else this.shortActive = false;

      let changed = false;
      const energizedCoils = new Map();
      for (const c of this.net.comps) {
        if ((c.type === 'coil' || c.type === 'coil_timer') && c.dev) {
          const on = this.loadOn(g, c);
          energizedCoils.set(c.dev, (energizedCoils.get(c.dev) || false) || on);
        }
      }
      const now = performance.now();
      for (const [id, on] of energizedCoils) {
        const d = this.dev[id];
        const def = this.data.devices[id];
        if (def.type === 'contactor' && d.on !== on) {
          d.on = on; changed = true;
          note(`${this.name(id)} ${on ? 'sepnul' : 'odpadl'}`, on ? 'ev-ok' : '');
        }
        if (def.type === 'timer') {
          if (on && d.since === null) {
            d.since = now;
            note(`${this.name(id)} odměřuje ${String(def.delay ?? 3).replace('.', ',')} s`, '');
            this.timers.push(setTimeout(() => this.solve(), (def.delay ?? 3) * 1000 + 5));
          }
          if (!on && d.since !== null) { d.since = null; if (d.done) { d.done = false; changed = true; } }
          if (on && !d.done && now - d.since >= (def.delay ?? 3) * 1000) {
            d.done = true; changed = true;
            note(`${this.name(id)}: čas uplynul, kontakty přepnuly`, 'ev-ok');
          }
        }
      }
      if (!changed) break;
    }
    this.state = g;
    this.paint(g);
  }

  // Napětí na zátěži: oba vývody mají různé potenciály a aspoň jeden je fáze
  loadOn(g, c) {
    const pa = g.pot.get(g.uf.find(c.terms[0]));
    const pb = g.pot.get(g.uf.find(c.terms[1]));
    if (!pa || !pb) return false;
    for (const a of pa) for (const b of pb) {
      if (a !== b && a !== 'PE' && b !== 'PE' && (PHASES.includes(a) || PHASES.includes(b))) return true;
    }
    return false;
  }

  phaseAt(g, node) {
    const s = g.pot.get(g.uf.find(node));
    if (!s || s.size !== 1) return null;
    const v = [...s][0];
    return PHASES.includes(v) ? v : null;
  }

  motorState(g, c) {
    const t = c.terms;
    if (c.type === 'motor3') {
      const ph = t.map((n) => this.phaseAt(g, n));
      const distinct = new Set(ph.filter(Boolean));
      if (distinct.size === 3) {
        const idx = ph.map((p) => PHASES.indexOf(p));
        const fwd = (idx[1] - idx[0] + 3) % 3 === 1;
        return { run: true, dir: fwd ? 1 : -1, text: fwd ? 'běží vpravo' : 'běží vlevo (reverzace)' };
      }
      if (distinct.size === 2) return { run: false, hum: true, text: 'bručí – chybí fáze!' };
      return { run: false };
    }
    // motor6: U1 V1 W1 nahoře, U2 V2 W2 dole (pořadí vývodů v definici)
    const top = t.slice(0, 3).map((n) => this.phaseAt(g, n));
    const bot = t.slice(3, 6);
    if (new Set(top.filter(Boolean)).size < 3) {
      if (top.some(Boolean)) return { run: false, hum: true, text: 'neúplné napájení' };
      return { run: false };
    }
    const botPh = bot.map((n) => this.phaseAt(g, n));
    const botRoot = bot.map((n) => g.uf.find(n));
    const star = botRoot[0] === botRoot[1] && botRoot[1] === botRoot[2] && !g.pot.get(botRoot[0]);
    const delta = botPh.every((p, i) => p && p !== top[i]);
    const idx = top.map((p) => PHASES.indexOf(p));
    const fwd = (idx[1] - idx[0] + 3) % 3 === 1;
    if (star) return { run: true, slow: true, dir: fwd ? 1 : -1, text: 'běží do hvězdy (Y)' };
    if (delta) return { run: true, dir: fwd ? 1 : -1, text: 'běží do trojúhelníku (Δ)' };
    return { run: false, hum: true, text: 'vinutí nejsou propojena' };
  }

  paint(g) {
    this.net.wires.forEach((wr, i) => {
      const set = g.pot.get(g.uf.find(wr.root));
      const el = this.wireEls[i];
      let cls = 'sch-wire';
      if (set && set.size) {
        if (Schematic.isShort(set)) cls += ' live p-short';
        else {
          const p = [...set].find((x) => PHASES.includes(x)) || [...set][0];
          cls += ` live p-${p}`;
        }
      }
      el.setAttribute('class', cls);
    });

    const status = { running: [], lit: 0, fault: this.shortActive };
    this.net.comps.forEach((c, i) => {
      const el = this.compEls[i];
      if (!el) return;
      const d = c.dev ? this.dev[c.dev] : null;
      el.querySelector('.sch-sym').innerHTML = symbol(c, d);
      el.classList.toggle('pressed', !!d?.pressed);
      el.classList.toggle('tripped', !!d?.tripped);
      el.classList.toggle('blown', !!d?.blown);
      if (c.type === 'coil' || c.type === 'coil_timer') {
        const on = this.loadOn(g, c);
        el.classList.toggle('energized', on);
        if (el._timerText) {
          const def = this.data.devices?.[c.dev];
          if (def?.type === 'timer' && d?.since !== null && !d.done) {
            el._timerText.textContent = `${String(def.delay ?? 3).replace('.', ',')} s ⏱`;
          } else el._timerText.textContent = '';
        }
      }
      if (c.type === 'lamp') {
        const on = this.loadOn(g, c);
        el.classList.toggle('lit', on);
        if (on) status.lit++;
      }
      if (c.type === 'motor3' || c.type === 'motor6') {
        const ms = this.motorState(g, c);
        el.classList.toggle('running', !!ms.run);
        el.classList.toggle('slow', !!ms.slow);
        el.classList.toggle('rev', ms.dir === -1);
        if (ms.text) status.running.push(`${c.label || 'M'} ${ms.text}`);
        const prev = this.motorTexts?.[i];
        if (ms.text !== prev && this.motorTexts) this.log(ms.text ? `${c.label || 'Motor'} ${ms.text}` : `${c.label || 'Motor'} stojí`, ms.run ? 'ev-ok' : (ms.hum ? 'ev-warn' : ''));
        (this.motorTexts ||= {})[i] = ms.text;
      }
    });
    this.opts.onStatus?.(status);
    this.updateControls();
  }

  flashShort() {
    this.svg.classList.add('flash');
    setTimeout(() => this.svg.classList.remove('flash'), 600);
  }

  // --- Ovládací panel (mimo SVG, přístupný i z klávesnice) -------------------------------------------
  buildControls(host) {
    host.innerHTML = '';
    this.ctlEls = {};
    for (const [id, d] of Object.entries(this.data.devices || {})) {
      const mk = (label, sub, cap, capText) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ctl';
        b.innerHTML = `<span class="ctl-cap ${cap}"></span><span><span class="ctl-name"></span><small></small></span>`;
        b.querySelector('.ctl-cap').textContent = capText;
        b.querySelector('.ctl-name').textContent = label;
        b.querySelector('small').textContent = sub;
        host.appendChild(b);
        return b;
      };
      const label = d.label || id;
      if (d.type === 'button') {
        const b = mk(label, 'podrž = stisk', d.color || 'black', d.cap || (d.color === 'red' ? 'O' : d.color === 'green' ? 'I' : '•'));
        const down = (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); this.press(id, true); };
        const up = () => this.press(id, false);
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('lostpointercapture', up);
        b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); this.press(id, true); } });
        b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.press(id, false); } });
        b.addEventListener('click', (e) => e.preventDefault());
        this.ctlEls[id] = b;
      } else if (d.type === 'switch' || d.type === 'breaker') {
        const b = mk(label, '', d.type === 'breaker' ? 'amber' : 'grey', d.type === 'breaker' ? 'Q' : '⇅');
        b.addEventListener('click', () => this.toggle(id));
        this.ctlEls[id] = b;
      } else if (d.type === 'series') {
        for (const part of ['a', 'b']) {
          const b = mk(`${label} – ${part.toUpperCase()}`, '', 'grey', part.toUpperCase());
          b.addEventListener('click', () => this.toggle(id, part));
          this.ctlEls[`${id}:${part}`] = b;
        }
      } else if (d.type === 'olr') {
        const b = mk(label, '', 'red', 'ϑ');
        b.addEventListener('click', () => this.trip(id, !this.dev[id].tripped));
        this.ctlEls[id] = b;
      } else if (d.type === 'fuse') {
        const b = mk(label, '', 'grey', 'F');
        b.addEventListener('click', () => { if (this.dev[id].blown) this.replaceFuse(id); });
        this.ctlEls[id] = b;
      }
    }
    this.updateControls();
  }

  updateControls() {
    if (!this.ctlEls) return;
    for (const [key, b] of Object.entries(this.ctlEls)) {
      const [id, part] = key.split(':');
      const d = this.dev[id];
      const def = this.data.devices[id];
      const small = b.querySelector('small');
      b.classList.toggle('pressed', !!d.pressed);
      if (def.type === 'switch') { b.classList.toggle('on', d.on); small.textContent = d.on ? 'poloha 2 – klik přepne' : 'poloha 1 – klik přepne'; }
      if (def.type === 'breaker') { b.classList.toggle('on', d.on); b.classList.toggle('tripped', !d.on); small.textContent = d.on ? 'zapnuto – klik vypne' : 'vypnuto – klik zapne'; }
      if (def.type === 'series') { b.classList.toggle('on', d[part]); small.textContent = d[part] ? 'zapnuto' : 'vypnuto'; }
      if (def.type === 'olr') { b.classList.toggle('tripped', d.tripped); small.textContent = d.tripped ? 'vybaveno – klik = reset' : 'klik = simulovat přetížení'; }
      if (def.type === 'fuse') { b.classList.toggle('tripped', d.blown); b.disabled = !d.blown; small.textContent = d.blown ? 'přetavená – klik = vyměnit' : 'v pořádku'; }
    }
  }
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}
