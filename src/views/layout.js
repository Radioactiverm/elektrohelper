import { html, raw, icon } from './html.js';
import { config } from '../config.js';

const NAV = [
  { href: '/', label: 'Domů', icon: 'home', match: (p) => p === '/' },
  { href: '/kb', label: 'Znalosti', icon: 'menu_book', match: (p) => p.startsWith('/kb') || p.startsWith('/hledat') },
  { href: '/simulator', label: 'Simulátor', icon: 'settings_motion_mode', match: (p) => p.startsWith('/simulator') },
  { href: '/schemata', label: 'Schémata', icon: 'schema', match: (p) => p.startsWith('/schemata') },
  { href: '/procvicovani', label: 'Procvičit', icon: 'quiz', match: (p) => p.startsWith('/procvicovani') },
  { href: '/kalkulacky', label: 'Výpočty', icon: 'calculate', match: (p) => p.startsWith('/kalkulacky') },
];

export const LOGO = raw(`<svg class="logo-mark" viewBox="0 0 48 48" aria-hidden="true">
  <rect x="2" y="2" width="44" height="44" rx="14" class="logo-bg"/>
  <path d="M8 34h32" stroke="#8d5a2b" stroke-width="3" stroke-linecap="round"/>
  <path d="M8 39h32" stroke="#1e6fd9" stroke-width="3" stroke-linecap="round"/>
  <path d="M8 29h32" stroke="url(#pe)" stroke-width="3" stroke-linecap="round"/>
  <defs><pattern id="pe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="3" height="6" fill="#2e9e3e"/><rect x="3" width="3" height="6" fill="#f2c811"/></pattern></defs>
  <path d="M27 6 15 24h8l-3 14 13-19h-8z" class="logo-bolt"/>
</svg>`);

/**
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.path – aktuální cesta (pro zvýraznění navigace)
 * @param {*} p.body
 * @param {string} [p.description]
 * @param {string[]} [p.scripts] – moduly JS pro stránku
 * @param {string[]} [p.styles]
 * @param {boolean} [p.katex] – načíst styly KaTeX
 * @param {boolean} [p.mermaid]
 * @param {string} [p.subjectKey] – barevný akcent předmětu
 * @param {object} [p.user]
 * @param {string} [p.query] – předvyplněný hledaný výraz
 */
export function layout(p) {
  const path = p.path || '/';
  const title = p.title ? `${p.title} · ${config.siteName}` : `${config.siteName} – silnoproud srozumitelně`;
  const navItems = NAV.map((n) => {
    const active = n.match(path);
    return html`<a class="nav-item${active ? ' active' : ''}" href="${n.href}"${active ? raw(' aria-current="page"') : ''}>
      <span class="nav-indicator">${icon(n.icon, active ? 'filled' : '')}</span><span class="nav-label">${n.label}</span></a>`;
  });

  return '<!doctype html>' + html`
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${p.description || 'Studijní repozitář pro silnoproudé elektrikáře: odborný výcvik, simulace třífázového motoru s jištěním, interaktivní schémata zapojení a procvičování.'}">
<meta name="theme-color" content="#17130e" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#fff8f4" media="(prefers-color-scheme: light)">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<script src="/js/theme-init.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,300..800&family=Roboto+Mono:wght@400;500;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..600,0..1,-25..0&display=block">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/m3.css">
<link rel="stylesheet" href="/css/app.css">
${p.katex ? raw('<link rel="stylesheet" href="/vendor/katex/katex.min.css">') : ''}
${(p.styles || []).map((s) => html`<link rel="stylesheet" href="${s}">`)}
</head>
<body class="${p.subjectKey ? `subject-${p.subjectKey}` : ''}${p.bodyClass ? ' ' + p.bodyClass : ''}">
<a class="skip-link" href="#main">Přeskočit na obsah</a>
<div class="app-shell">
  <nav class="nav-rail" aria-label="Hlavní navigace">
    <a class="rail-logo" href="/" aria-label="${config.siteName} – domů">${LOGO}</a>
    <div class="rail-items">${navItems}</div>
    <div class="rail-bottom">
      ${p.user ? html`<a class="nav-item${path.startsWith('/admin') ? ' active' : ''}" href="/admin"><span class="nav-indicator">${icon('admin_panel_settings')}</span><span class="nav-label">Správa</span></a>` : ''}
    </div>
  </nav>
  <div class="main-col">
    <header class="top-app-bar">
      <a class="brand" href="/">${LOGO}<span class="brand-name">Elektro<b>Helper</b></span></a>
      <form class="search-bar" action="/hledat" method="get" role="search">
        ${icon('search', 'search-icon')}
        <input type="search" name="q" placeholder="Hledat v poznámkách… (např. jistič, chránič, wattmetr)" value="${p.query || ''}" aria-label="Hledat" autocomplete="off" data-search-input>
        <kbd class="search-kbd">/</kbd>
        <div class="search-suggest" data-search-suggest hidden></div>
      </form>
      <div class="top-actions">
        <button class="icon-btn" type="button" data-theme-toggle aria-label="Přepnout světlý/tmavý režim" title="Světlý / tmavý režim">${icon('dark_mode')}</button>
        ${p.user
          ? html`<a class="icon-btn" href="/admin" aria-label="Administrace" title="Administrace">${icon('admin_panel_settings')}</a>`
          : html`<a class="icon-btn" href="/admin/login" aria-label="Přihlášení správce" title="Přihlášení správce">${icon('login')}</a>`}
      </div>
    </header>
    <div class="cable-strip" aria-hidden="true"><i class="w-l1"></i><i class="w-l2"></i><i class="w-l3"></i><i class="w-n"></i><i class="w-pe"></i></div>
    <main id="main" class="main">${p.body}</main>
    <footer class="site-footer">
      <div class="footer-cables" aria-hidden="true"><span class="w-l1"></span><span class="w-n"></span><span class="w-pe"></span></div>
      <p><b>${config.siteName}</b> – otevřený studijní repozitář pro obor elektrikář silnoproud.
      Obsah je studijní pomůcka, ne náhrada norem ČSN a odborného dozoru. Práce na elektrickém zařízení jen s příslušnou kvalifikací (vyhl. 194/2022 Sb.).</p>
      <p class="footer-links"><a href="/kb">Znalosti</a> · <a href="/simulator">Simulátor motoru</a> · <a href="/schemata">Schémata</a> · <a href="/procvicovani">Procvičování</a> · <a href="https://github.com/Radioactiverm/elektrohelper" target="_blank" rel="noopener">GitHub</a></p>
    </footer>
  </div>
</div>
<nav class="nav-bar" aria-label="Navigace">${navItems}</nav>
<div class="snackbar-host" aria-live="polite"></div>
${p.mermaid ? raw('<script src="/vendor/mermaid/mermaid.min.js" defer></script>') : ''}
<script type="module" src="/js/app.js"></script>
${(p.scripts || []).map((s) => html`<script type="module" src="${s}"></script>`)}
</body>
</html>`;
}
