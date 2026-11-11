// Společné chování webu: motiv, vlnky, našeptávač hledání, mermaid, obsah článku.

const root = document.documentElement;

// --- Motiv ---------------------------------------------------------------------
function setTheme(theme, persist = true) {
  root.dataset.theme = theme;
  if (persist) {
    try { localStorage.setItem('eh-theme', theme); } catch { /* bez úložiště */ }
  }
  const btn = document.querySelector('[data-theme-toggle] .material-symbols-rounded');
  if (btn) btn.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}
setTheme(root.dataset.theme || 'light', false);
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
});
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let stored = null;
  try { stored = localStorage.getItem('eh-theme'); } catch { /* */ }
  if (!stored) setTheme(e.matches ? 'dark' : 'light', false);
});

// --- Vlnka (ripple) ----------------------------------------------------------------
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.btn, .icon-btn, .chip, .list-item, .tab, .seg-btn span, .ctl');
  if (!el || el.disabled) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const span = document.createElement('span');
  span.className = 'ripple';
  span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.appendChild(span);
  span.addEventListener('animationend', () => span.remove());
});

// --- Horní lišta při posunu -------------------------------------------------------------
const bar = document.querySelector('.top-app-bar');
const onScroll = () => bar?.classList.toggle('scrolled', window.scrollY > 4);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// --- Posuvníky: vyplnění stopy + výstup hodnoty -----------------------------------------
export function syncRange(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const pct = ((Number(input.value) - min) / (max - min)) * 100;
  input.style.setProperty('--fill', `${pct}%`);
}
document.querySelectorAll('input[type="range"]').forEach((i) => {
  syncRange(i);
  i.addEventListener('input', () => syncRange(i));
});

// --- Snackbar -----------------------------------------------------------------------------
export function snackbar(message, icon = 'info', ms = 3500) {
  const host = document.querySelector('.snackbar-host');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'snackbar';
  el.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true"></span><span></span>`;
  el.firstChild.textContent = icon;
  el.lastChild.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove());
  }, ms);
}

// --- Statistiky událostí (anonymní) -----------------------------------------------------------
const sent = new Map();
export function track(type, label, value) {
  const key = `${type}:${label}`;
  const now = Date.now();
  if (sent.has(key) && now - sent.get(key) < 4000) return; // bez zahlcení
  sent.set(key, now);
  const body = JSON.stringify({ type, label, value });
  if (navigator.sendBeacon) navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }));
  else fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
}

// --- Našeptávač hledání ----------------------------------------------------------------------------
const input = document.querySelector('[data-search-input]');
const suggest = document.querySelector('[data-search-suggest]');
if (input && suggest) {
  let timer;
  let active = -1;
  let items = [];
  const close = () => { suggest.hidden = true; active = -1; };
  const render = (results, q) => {
    items = results;
    active = -1;
    suggest.innerHTML = '';
    if (!results.length) {
      const d = document.createElement('div');
      d.className = 'empty';
      d.textContent = `Nic pro „${q}“ – stiskni Enter pro fulltext`;
      suggest.appendChild(d);
    }
    for (const r of results) {
      const a = document.createElement('a');
      a.href = `/kb/${r.slug}`;
      a.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">article</span><span></span><small></small>';
      a.children[1].textContent = r.title;
      a.children[2].textContent = r.subject;
      suggest.appendChild(a);
    }
    suggest.hidden = false;
  };
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) return close();
    timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (input.value.trim() === q) render(await res.json(), q);
      } catch { close(); }
    }, 140);
  });
  input.addEventListener('keydown', (e) => {
    const links = [...suggest.querySelectorAll('a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!links.length) return;
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.classList.toggle('active', i === active));
    } else if (e.key === 'Enter' && active >= 0 && links[active]) {
      e.preventDefault();
      location.href = links[active].href;
    } else if (e.key === 'Escape') {
      close();
      input.blur();
    }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-bar')) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) {
      e.preventDefault();
      input.focus();
    }
  });
  void items;
}

// --- Mermaid diagramy (vykreslí se v barvách motivu) --------------------------------------------------
function cssVar(name) {
  return getComputedStyle(root).getPropertyValue(name).trim();
}
async function renderMermaid() {
  const blocks = document.querySelectorAll('pre.mermaid');
  if (!blocks.length || !window.mermaid) return;
  blocks.forEach((b) => {
    if (!b.dataset.src) b.dataset.src = b.textContent;
    else { b.removeAttribute('data-processed'); b.textContent = b.dataset.src; }
  });
  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    fontFamily: 'Roboto Flex, system-ui, sans-serif',
    flowchart: { curve: 'basis', padding: 12, htmlLabels: true },
    themeVariables: {
      background: 'transparent',
      primaryColor: cssVar('--md-sys-color-surface-container-highest'),
      primaryTextColor: cssVar('--md-sys-color-on-surface'),
      primaryBorderColor: cssVar('--md-sys-color-outline'),
      lineColor: cssVar('--md-sys-color-outline'),
      secondaryColor: cssVar('--md-sys-color-secondary-container'),
      tertiaryColor: cssVar('--md-sys-color-tertiary-container'),
      fontSize: '15px',
    },
  });
  try { await window.mermaid.run({ nodes: blocks }); } catch (err) { console.warn('mermaid', err); }
}
if (document.querySelector('pre.mermaid')) {
  if (window.mermaid) renderMermaid();
  else document.querySelector('script[src*="mermaid"]')?.addEventListener('load', renderMermaid);
  document.addEventListener('themechange', renderMermaid);
}
export { renderMermaid };

// --- Zvýraznění aktuální sekce v obsahu článku ------------------------------------------------------------
const tocLinks = [...document.querySelectorAll('.toc a')];
if (tocLinks.length && 'IntersectionObserver' in window) {
  const map = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const obs = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        tocLinks.forEach((a) => a.classList.remove('active'));
        map.get(en.target.id)?.classList.add('active');
      }
    }
  }, { rootMargin: '-90px 0px -70% 0px' });
  document.querySelectorAll('.prose h2[id], .prose h3[id]').forEach((h) => obs.observe(h));
}
