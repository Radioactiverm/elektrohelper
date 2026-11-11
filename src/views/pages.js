import { html, raw, icon, fmtDate, fmtNum, plural } from './html.js';
import { subjectMeta, SUBJECTS } from '../subjects.js';

const KIND_LABEL = { 'předmět': 'Předmět', 'téma': 'Téma', 'podtéma': 'Podtéma', 'příklady': 'Příklady' };

export const HERO_ART = raw(`<svg class="hero-art" viewBox="0 0 520 380" role="img" aria-label="Pět vodičů L1, L2, L3, N a PE přivedených do svorkovnice třífázového motoru">
  <defs>
    <pattern id="hero-pe" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="7" height="14" fill="#2e9e3e"/><rect x="7" width="7" height="14" fill="#f2c811"/>
    </pattern>
    <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="var(--md-sys-color-primary)" stop-opacity=".35"/>
      <stop offset="1" stop-color="var(--md-sys-color-primary)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="380" cy="190" r="170" fill="url(#hero-glow)"/>
  <g fill="none" stroke-linecap="round">
    <g class="hw"><path d="M-10 60 C120 60 170 140 300 150" stroke="#8d5a2b"/><path class="flow" d="M-10 60 C120 60 170 140 300 150"/></g>
    <g class="hw"><path d="M-10 120 C110 120 170 170 300 170" stroke="#1c1b1f" class="casing-dark"/><path class="flow" d="M-10 120 C110 120 170 170 300 170"/></g>
    <g class="hw"><path d="M-10 180 C120 180 170 190 300 190" stroke="#8f9399"/><path class="flow" d="M-10 180 C120 180 170 190 300 190"/></g>
    <g class="hw"><path d="M-10 240 C120 240 170 210 300 210" stroke="#1e6fd9"/></g>
    <g class="hw"><path d="M-10 300 C130 300 170 230 300 230" stroke="url(#hero-pe)"/></g>
  </g>
  <g class="hero-labels" font-family="Roboto Mono, monospace" font-size="15" font-weight="700">
    <text x="12" y="50">L1</text><text x="12" y="110">L2</text><text x="12" y="170">L3</text>
    <text x="12" y="230">N</text><text x="12" y="290">PE</text>
  </g>
  <rect x="290" y="132" width="34" height="116" rx="8" class="hero-terminal"/>
  <g class="hero-screws"><circle cx="307" cy="150" r="5"/><circle cx="307" cy="170" r="5"/><circle cx="307" cy="190" r="5"/><circle cx="307" cy="210" r="5"/><circle cx="307" cy="230" r="5"/></g>
  <g transform="translate(410 190)">
    <circle r="86" class="hero-motor"/>
    <circle r="70" class="hero-motor-inner"/>
    <g class="hero-fan">
      <path d="M0 -60 C18 -40 14 -14 0 0 C-6 -20 -18 -40 0 -60Z"/>
      <path d="M0 -60 C18 -40 14 -14 0 0 C-6 -20 -18 -40 0 -60Z" transform="rotate(120)"/>
      <path d="M0 -60 C18 -40 14 -14 0 0 C-6 -20 -18 -40 0 -60Z" transform="rotate(240)"/>
      <circle r="10"/>
    </g>
    <text y="112" text-anchor="middle" class="hero-motor-label">M 3~</text>
  </g>
</svg>`);

function subjectChip(name) {
  const s = subjectMeta(name);
  return html`<a class="chip subject-chip subject-${s.key}" href="/kb#${s.key}">${icon(s.icon)}${s.name}</a>`;
}

const TOPIC_ICONS = {
  'Asynchronní motor': 'settings_motion_mode',
  'Stykačové ovládání': 'electrical_services',
  'Domovní instalace': 'lightbulb',
};

// --- Domovská stránka ------------------------------------------------------------
export function homePage({ tree, counts, recent, schematics }) {
  return html`
<section class="hero">
  <div class="hero-copy">
    <span class="eyebrow">${icon('electric_bolt')} Odborný výcvik · elektrikář silnoproud</span>
    <h1 class="display">Silnoproud.<br><span class="hl">Srozumitelně.</span></h1>
    <p class="lead">Poznámky z odborného výcviku, interaktivní schémata stykačového ovládání a simulace třífázového motoru s jištěním. Vše na jednom místě a zdarma.</p>
    <div class="hero-actions">
      <a class="btn filled lg" href="/kb">${icon('menu_book')}Začít se učit</a>
      <a class="btn tonal lg" href="/simulator">${icon('settings_motion_mode')}Simulátor motoru</a>
    </div>
    <ul class="hero-stats">
      <li><b>${fmtNum(counts.articles)}</b><span>${plural(counts.articles, 'článek', 'články', 'článků')}</span></li>
      <li><b>${fmtNum(counts.questions)}</b><span>${plural(counts.questions, 'otázka', 'otázky', 'otázek')}</span></li>
      <li><b>${fmtNum(counts.schematics)}</b><span>${plural(counts.schematics, 'schéma', 'schémata', 'schémat')}</span></li>
    </ul>
  </div>
  <div class="hero-visual">${HERO_ART}</div>
</section>

<section class="feature-row">
  <a class="feature-card fc-sim" href="/simulator">
    <div class="fc-art" aria-hidden="true">
      <svg viewBox="0 0 200 80"><path d="M0 70 L20 70 L22 8 L40 14 L60 30 L80 52 L100 60 L200 60" class="fc-curve"/><path d="M0 40 Q 12.5 0 25 40 T 50 40 T 75 40 T 100 40 T 125 40 T 150 40 T 175 40 T 200 40" class="fc-sine"/></svg>
    </div>
    <h3>${icon('settings_motion_mode')} Simulace 3f motoru</h3>
    <p>Rozběh, přetížení, výpadek fáze i zkrat. Sleduj proudy, otáčky a vypínací charakteristiku jističe, motorového spouštěče nebo pojistek.</p>
    <span class="fc-link">Otevřít simulátor ${icon('arrow_forward')}</span>
  </a>
  <a class="feature-card fc-sch" href="/schemata">
    <div class="fc-art" aria-hidden="true">
      <svg viewBox="0 0 200 80"><path d="M20 10 V70 M20 20 H90 V30 M90 50 V60 H20 M140 10 V70" class="fc-wire"/><path d="M84 30 L96 50" class="fc-contact"/><rect x="128" y="32" width="24" height="16" class="fc-coil"/></svg>
    </div>
    <h3>${icon('schema')} Interaktivní schémata</h3>
    <p>${fmtNum(counts.schematics)} připravených zapojení: samodržení, reverzace, hvězda–trojúhelník, schodišťové zapojení… Mačkej tlačítka a sleduj, kudy teče proud.</p>
    <span class="fc-link">Prohlédnout schémata ${icon('arrow_forward')}</span>
  </a>
  <a class="feature-card fc-quiz" href="/procvicovani">
    <div class="fc-art" aria-hidden="true">
      <svg viewBox="0 0 200 80"><rect x="30" y="14" width="90" height="56" rx="10" class="fc-card2"/><rect x="50" y="8" width="90" height="56" rx="10" class="fc-card1"/><path d="M84 28 q10 -8 18 0 q4 8 -8 12 v6 M94 54 v1" class="fc-q"/></svg>
    </div>
    <h3>${icon('quiz')} Procvičování</h3>
    <p>${fmtNum(counts.questions)} kartiček „Otestuj se“ ze všech témat. Ideální na opakování před zkouškou z odborného výcviku.</p>
    <span class="fc-link">Procvičovat ${icon('arrow_forward')}</span>
  </a>
  <a class="feature-card fc-calc" href="/kalkulacky">
    <div class="fc-art" aria-hidden="true">
      <svg viewBox="0 0 200 80"><text x="100" y="47" text-anchor="middle" class="fc-formula">I = P / (√3·U·cos φ)</text></svg>
    </div>
    <h3>${icon('calculate')} Výpočty</h3>
    <p>Ohmův zákon, třífázový výkon a proud motoru, úbytek napětí a odpor vodiče. Výsledky se přepočítávají hned při psaní.</p>
    <span class="fc-link">Počítat ${icon('arrow_forward')}</span>
  </a>
</section>

<section class="section">
  <div class="section-head">
    <h2 class="headline">${icon('menu_book')} Témata</h2>
    <a class="btn text" href="/kb">Celý obsah ${icon('arrow_forward')}</a>
  </div>
  <div class="subject-grid">
    ${tree.subjects.flatMap((s) => s.topics.map((t) => html`
    <article class="subject-card subject-${s.key}">
      <div class="subject-wire" aria-hidden="true"></div>
      <a class="subject-card-head" href="/kb/${t.slug}">
        <span class="subject-icon">${icon(TOPIC_ICONS[t.title] || s.icon, 'filled')}</span>
        <span><h3>${t.title}</h3><span class="subject-count">${t.children.length} ${plural(t.children.length, 'podtéma', 'podtémata', 'podtémat')}</span></span>
      </a>
      ${t.summary ? html`<p>${t.summary}</p>` : ''}
      <div class="chip-set">${t.children.slice(0, 6).map((c) => html`<a class="chip" href="/kb/${c.slug}">${c.title}</a>`)}</div>
    </article>`))}
  </div>
</section>

<section class="section two-col">
  <div class="card outlined safety-card">
    <div class="hazard-band" aria-hidden="true"></div>
    <h2 class="title-lg">${icon('health_and_safety', 'filled')} 5 pravidel bezpečné práce</h2>
    <ol class="safety-list">
      <li><b>Vypnout</b> a odpojit ze všech stran</li>
      <li><b>Zajistit</b> proti opětovnému zapnutí</li>
      <li><b>Ověřit</b> beznapěťový stav</li>
      <li><b>Uzemnit</b> a zkratovat</li>
      <li><b>Zakrýt</b> nebo oddělit sousední živé části</li>
    </ol>
    <p class="muted small">Podle ČSN EN 50110-1. Pořadí se vrací v opačném směru při opětovném zapínání.</p>
  </div>
  <div class="card outlined wires-card">
    <h2 class="title-lg">${icon('cable')} Barvy vodičů</h2>
    <ul class="wire-legend">
      <li><span class="wire-swatch w-l1"></span><b>L1</b> hnědá</li>
      <li><span class="wire-swatch w-l2"></span><b>L2</b> černá</li>
      <li><span class="wire-swatch w-l3"></span><b>L3</b> šedá</li>
      <li><span class="wire-swatch w-n"></span><b>N</b> světle modrá</li>
      <li><span class="wire-swatch w-pe"></span><b>PE</b> zelenožlutá</li>
    </ul>
    <p class="muted small">Pomůcka <b>HČŠ</b>: hnědá → černá → šedá. Zelenožlutá je <b>vždy jen ochranný vodič</b>.</p>
  </div>
</section>

<section class="section two-col">
  <div>
    <div class="section-head"><h2 class="headline">${icon('update')} Naposledy upraveno</h2></div>
    <ul class="list card filled">
      ${recent.map((a) => html`<li><a class="list-item" href="/kb/${a.slug}">
        <span class="li-lead subject-dot subject-${subjectMeta(a.subject).key}"></span>
        <span class="li-text"><span class="li-title">${a.title}</span><span class="li-sub">${a.subject} · ${fmtDate(a.updated_at)}</span></span>
        ${icon('chevron_right', 'li-trail')}</a></li>`)}
    </ul>
  </div>
  <div>
    <div class="section-head"><h2 class="headline">${icon('schema')} Schémata zapojení</h2></div>
    <ul class="list card filled">
      ${schematics.slice(0, 6).map((s) => html`<li><a class="list-item" href="/schemata/${s.slug}">
        <span class="li-lead">${icon('electrical_services')}</span>
        <span class="li-text"><span class="li-title">${s.title}</span><span class="li-sub">${s.category}</span></span>
        ${icon('chevron_right', 'li-trail')}</a></li>`)}
    </ul>
  </div>
</section>`;
}

// --- Přehled znalostní báze --------------------------------------------------------
function treeList(nodes, depth = 0) {
  if (!nodes.length) return '';
  return html`<ul class="tree depth-${depth}">${nodes.map((n) => html`
    <li><a href="/kb/${n.slug}" class="tree-link kind-${n.kind}">${n.kind === 'příklady' ? icon('calculate') : ''}${n.title}</a>
    ${treeList(n.children, depth + 1)}</li>`)}</ul>`;
}

export function kbIndexPage({ tree }) {
  return html`
<header class="page-head">
  <h1 class="display-sm">Znalostní báze</h1>
  <p class="lead">Poznámky z odborného výcviku uspořádané podle témat. Každé podtéma začíná <b>V kostce</b> a končí otázkami <b>Otestuj se</b>.</p>
  ${tree.subjects.length > 1 ? html`<div class="chip-set">${tree.subjects.map((s) => html`<a class="chip subject-chip subject-${s.key}" href="#${s.key}">${icon(s.icon)}${s.name}</a>`)}</div>` : ''}
</header>
<div class="kb-grid">
  ${tree.subjects.map((s) => html`
  <section class="card outlined kb-subject subject-${s.key}" id="${s.key}">
    <div class="subject-wire" aria-hidden="true"></div>
    <header class="kb-subject-head">
      <span class="subject-icon">${icon(s.icon, 'filled')}</span>
      <div>
        <h2 class="title-lg">${s.root ? html`<a href="/kb/${s.root.slug}">${s.name}</a>` : s.name}</h2>
        <p class="muted">${s.tagline}</p>
      </div>
    </header>
    ${s.topics.map((t) => html`
      <div class="kb-topic">
        <a class="kb-topic-title" href="/kb/${t.slug}">${icon('folder_open')}${t.title}</a>
        ${t.summary ? html`<p class="kb-topic-sum">${t.summary}</p>` : ''}
        ${treeList(t.children)}
      </div>`)}
  </section>`)}
</div>`;
}

// --- Článek -------------------------------------------------------------------------
export function articlePage({ article, rendered, ctx, views, questionCount, tags, user }) {
  const s = subjectMeta(article.subject);
  const text = (article.title + ' ' + tags.join(' ')).toLowerCase();
  const related = [];
  if (/jisti|pojist|motor|nadproud|spoušt|oblouk/.test(text)) related.push({ href: '/simulator', icon: 'settings_motion_mode', label: 'Vyzkoušej v simulátoru motoru' });
  if (/stykač|motor|vypínač|řazení|ovládání|reverz/.test(text)) related.push({ href: '/schemata', icon: 'schema', label: 'Interaktivní schémata zapojení' });
  if (/ohm|odpor|rezistor|výkon|úbyt|průřez/.test(text)) related.push({ href: '/kalkulacky', icon: 'calculate', label: 'Kalkulačky' });

  return html`
<div class="article-layout">
  <article class="article">
    <nav class="breadcrumbs" aria-label="Drobečková navigace">
      <a href="/kb">Znalosti</a>
      ${ctx.crumbs.map((c) => html`${icon('chevron_right')}<a href="/kb/${c.slug}">${c.title}</a>`)}
    </nav>
    <header class="article-head">
      <div class="chip-set">
        ${subjectChip(article.subject)}
        <span class="chip outlined">${KIND_LABEL[article.kind] || article.kind}</span>
        ${article.published ? '' : html`<span class="chip error">Koncept</span>`}
      </div>
      <h1 class="display-sm">${article.title}</h1>
      <p class="meta">${icon('schedule')} ${fmtDate(article.updated_at)} · ${icon('visibility')} ${fmtNum(views)} ${plural(views, 'zobrazení', 'zobrazení', 'zobrazení')}
      ${questionCount ? html` · ${icon('quiz')} ${questionCount} ${plural(questionCount, 'otázka', 'otázky', 'otázek')}` : ''}
      ${user ? html` · <a href="/admin/clanky/${article.id}">${icon('edit')} Upravit</a>` : ''}</p>
    </header>
    <div class="prose">${raw(rendered.html)}</div>
    ${ctx.children.length ? html`
      <section class="children">
        <h2 class="title-lg">${icon('account_tree')} Co patří pod ${article.title}</h2>
        <div class="child-grid">
          ${ctx.children.map((c, i) => html`<a class="child-card" href="/kb/${c.slug}">
            <span class="child-num">${i + 1}</span>
            <span class="child-body"><span class="child-title">${c.title}</span>${c.summary ? html`<span class="child-sum">${c.summary}</span>` : ''}</span>
            ${icon('arrow_forward')}</a>`)}
        </div>
      </section>` : ''}
    <nav class="prev-next">
      ${ctx.prev ? html`<a class="pn prev" href="/kb/${ctx.prev.slug}">${icon('arrow_back')}<span><small>Předchozí</small>${ctx.prev.title}</span></a>` : html`<span></span>`}
      ${ctx.next ? html`<a class="pn next" href="/kb/${ctx.next.slug}"><span><small>Další</small>${ctx.next.title}</span>${icon('arrow_forward')}</a>` : ''}
    </nav>
  </article>
  <aside class="article-aside">
    ${rendered.toc.length > 1 ? html`
    <div class="toc card filled">
      <h2 class="label-lg">${icon('toc')} Obsah</h2>
      <ol>${rendered.toc.map((t) => html`<li class="toc-${t.depth}"><a href="#${t.id}">${t.text}</a></li>`)}</ol>
    </div>` : ''}
    ${questionCount ? html`<a class="btn tonal block" href="/procvicovani?clanek=${article.slug}">${icon('quiz')}Procvičit ${questionCount} ${plural(questionCount, 'otázku', 'otázky', 'otázek')}</a>` : ''}
    ${related.map((r) => html`<a class="btn outlined block" href="${r.href}">${icon(r.icon)}${r.label}</a>`)}
    <div class="aside-wire subject-${s.key}" aria-hidden="true"></div>
  </aside>
</div>`;
}

// --- Hledání -------------------------------------------------------------------------
export function searchPage({ q, results }) {
  return html`
<header class="page-head">
  <h1 class="display-sm">Hledání</h1>
  <form class="search-big" action="/hledat" method="get" role="search">
    ${icon('search')}
    <input type="search" name="q" value="${q}" placeholder="Co hledáš? Např. „tepelná spoušť“" autofocus>
    <button class="btn filled" type="submit">Hledat</button>
  </form>
</header>
${q ? html`<p class="muted">${results.length ? `Nalezeno ${results.length} ${plural(results.length, 'výsledek', 'výsledky', 'výsledků')} pro „${q}“` : `Pro „${q}“ jsme nic nenašli. Zkus jiné slovo nebo kratší tvar (např. „jistič“ místo „jističe“).`}</p>` : ''}
<ul class="search-results">
  ${results.map((r) => html`<li class="card outlined result subject-${subjectMeta(r.subject).key}">
    <a href="/kb/${r.slug}">
      <span class="result-meta">${icon(subjectMeta(r.subject).icon)} ${r.subject} · ${KIND_LABEL[r.kind] || r.kind}</span>
      <span class="result-title">${r.title}</span>
      <span class="result-snippet">${raw(sanitizeSnippet(r.snippet))}</span>
    </a></li>`)}
</ul>`;
}

// Snippet z FTS je prostý text s <mark>; vše ostatní escapujeme.
function sanitizeSnippet(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>');
}

// --- Procvičování ------------------------------------------------------------------
export function quizPage({ subjects, current, articleSlug, articleTitle, count }) {
  return html`
<header class="page-head">
  <h1 class="display-sm">Procvičování</h1>
  <p class="lead">Kartičky z oddílů <b>Otestuj se</b>. Zkus si odpovědět, otoč kartu a ohodnoť se. Kartičky, které neumíš, se vrátí dřív.</p>
  <div class="chip-set" role="group" aria-label="Filtr předmětu">
    <a class="chip filter${!current && !articleSlug ? ' selected' : ''}" href="/procvicovani">${icon('done_all')}Vše</a>
    ${subjects.length > 1 ? subjects.map((s) => html`<a class="chip filter subject-chip subject-${s.key}${current === s.name ? ' selected' : ''}" href="/procvicovani?predmet=${encodeURIComponent(s.name)}">${icon(s.icon)}${s.name}</a>`) : ''}
    ${articleSlug ? html`<span class="chip filter selected">${icon('article')}${articleTitle}</span>` : ''}
  </div>
</header>
<div class="quiz" data-quiz data-subject="${current || ''}" data-article="${articleSlug || ''}">
  <div class="quiz-progress"><div class="progress-linear"><span data-quiz-bar></span></div><span class="quiz-count" data-quiz-count>0 / ${count}</span></div>
  <div class="flashcard" data-quiz-card tabindex="0" aria-live="polite">
    <div class="flashcard-inner">
      <div class="flashcard-face front"><span class="fc-label">${icon('help')} Otázka</span><div class="fc-q" data-quiz-q>Načítám…</div><span class="fc-from" data-quiz-from></span><span class="fc-hint">Klepni nebo stiskni mezerník pro otočení</span></div>
      <div class="flashcard-face back"><span class="fc-label">${icon('lightbulb')} Odpověď</span><div class="fc-a prose" data-quiz-a></div></div>
    </div>
  </div>
  <div class="quiz-actions">
    <button class="btn outlined lg" type="button" data-quiz-grade="0" disabled>${icon('close')}Ještě neumím</button>
    <button class="btn filled lg" type="button" data-quiz-grade="1" disabled>${icon('check')}Umím</button>
  </div>
  <div class="quiz-done card filled" data-quiz-done hidden>
    <h2 class="headline">${icon('celebration', 'filled')} Hotovo!</h2>
    <p data-quiz-summary></p>
    <button class="btn filled" type="button" data-quiz-restart>${icon('replay')}Znovu</button>
  </div>
</div>`;
}

// --- Schémata -------------------------------------------------------------------------
export function schematicsListPage({ items }) {
  const groups = new Map();
  for (const s of items) {
    if (!groups.has(s.category)) groups.set(s.category, []);
    groups.get(s.category).push(s);
  }
  return html`
<header class="page-head">
  <h1 class="display-sm">Schémata zapojení</h1>
  <p class="lead">Interaktivní schémata z odborného výcviku. Mačkej tlačítka, přepínej vypínače a sleduj, kde je fáze (hnědá, černá, šedá), nulák (modrá) a jak reagují stykače a motor.</p>
</header>
${[...groups].map(([cat, list]) => html`
<section class="section">
  <h2 class="headline">${icon(cat === 'Motory' ? 'settings_motion_mode' : 'lightbulb')} ${cat}</h2>
  <div class="schem-grid">
    ${list.map((s) => html`<a class="schem-card card elevated" href="/schemata/${s.slug}">
      <div class="schem-thumb" data-schematic-thumb="${s.slug}" aria-hidden="true"></div>
      <div class="schem-body"><h3 class="title-md">${s.title}</h3><p>${s.description}</p></div>
    </a>`)}
  </div>
</section>`)}`;
}

export function schematicPage({ schematic, descriptionHtml }) {
  return html`
<nav class="breadcrumbs"><a href="/schemata">Schémata</a>${icon('chevron_right')}<span>${schematic.category}</span></nav>
<header class="page-head compact">
  <h1 class="display-sm">${schematic.title}</h1>
</header>
<div class="schem-layout">
  <section class="schem-stage card outlined">
    <div class="schem-toolbar">
      <div class="schem-status" data-sch-status>${icon('power_off')} Připraveno</div>
      <div class="schem-tools">
        <button class="icon-btn" type="button" data-sch-zoom="-1" aria-label="Oddálit">${icon('zoom_out')}</button>
        <button class="icon-btn" type="button" data-sch-zoom="1" aria-label="Přiblížit">${icon('zoom_in')}</button>
        <button class="icon-btn" type="button" data-sch-reset aria-label="Výchozí stav" title="Výchozí stav">${icon('restart_alt')}</button>
        <button class="icon-btn" type="button" data-sch-fullscreen aria-label="Celá obrazovka">${icon('fullscreen')}</button>
      </div>
    </div>
    <div class="schem-canvas" data-schematic tabindex="0"></div>
    <script type="application/json" data-schematic-json>${raw(JSON.stringify(schematic.data).replace(/</g, '\\u003c'))}</script>
  </section>
  <aside class="schem-side">
    <div class="card filled schem-controls">
      <h2 class="title-md">${icon('touch_app')} Ovládání</h2>
      <div class="control-panel" data-sch-controls></div>
    </div>
    <div class="card outlined">
      <h2 class="title-md">${icon('info')} Jak to funguje</h2>
      <div class="prose small">${raw(descriptionHtml)}</div>
    </div>
    <div class="card outlined legend-card">
      <h2 class="title-md">${icon('palette')} Legenda</h2>
      <ul class="wire-legend compact">
        <li><span class="wire-swatch w-l1"></span>L1 – fáze</li>
        <li><span class="wire-swatch w-l2"></span>L2 – fáze</li>
        <li><span class="wire-swatch w-l3"></span>L3 – fáze</li>
        <li><span class="wire-swatch w-n"></span>N – nulový vodič</li>
        <li><span class="wire-swatch w-pe"></span>PE – ochranný</li>
        <li><span class="wire-swatch w-dead"></span>bez napětí</li>
      </ul>
    </div>
    <div class="card outlined">
      <h2 class="title-md">${icon('history')} Události</h2>
      <ol class="event-log" data-sch-log></ol>
    </div>
  </aside>
</div>`;
}

// --- Chyby ---------------------------------------------------------------------------------
export function notFoundPage() {
  return html`
<section class="empty-state">
  <svg viewBox="0 0 240 120" class="broken-wire" aria-hidden="true">
    <path d="M0 60 H95" stroke="#8d5a2b" stroke-width="10" stroke-linecap="round"/>
    <path d="M145 60 H240" stroke="#8d5a2b" stroke-width="10" stroke-linecap="round"/>
    <path d="M95 60 l8 -10 M95 60 l10 6" stroke="var(--md-sys-color-outline)" stroke-width="3" stroke-linecap="round"/>
    <path d="M145 60 l-8 10 M145 60 l-10 -6" stroke="var(--md-sys-color-outline)" stroke-width="3" stroke-linecap="round"/>
    <path d="M112 40 l6 12 -8 0 8 14" class="spark" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <h1 class="display-sm">404 – přerušený obvod</h1>
  <p class="lead">Tahle stránka neexistuje nebo byla přesunuta.</p>
  <div class="hero-actions"><a class="btn filled" href="/">${icon('home')}Domů</a><a class="btn tonal" href="/kb">${icon('menu_book')}Znalosti</a></div>
</section>`;
}

export function errorPage(message) {
  return html`<section class="empty-state"><h1 class="display-sm">Něco vybavilo</h1><p class="lead">${message}</p><a class="btn filled" href="/">Domů</a></section>`;
}

export { SUBJECTS };
