import { html, raw, icon, fmtDate, fmtDateTime, fmtNum } from './html.js';
import { lineChart, hourBars, barList, donut } from './charts.js';
import { SUBJECTS, KINDS } from '../subjects.js';

const TABS = [
  { href: '/admin', label: 'Přehled', icon: 'monitoring' },
  { href: '/admin/clanky', label: 'Články', icon: 'article' },
  { href: '/admin/schemata', label: 'Schémata', icon: 'schema' },
  { href: '/admin/soubory', label: 'Soubory', icon: 'image' },
  { href: '/admin/uzivatele', label: 'Uživatelé', icon: 'group', admin: true },
  { href: '/admin/import', label: 'Import', icon: 'upload_file', admin: true },
];

export function adminShell({ path, user, csrf, body, title }) {
  const tabs = TABS.filter((t) => !t.admin || user.role === 'admin').map((t) => {
    const active = t.href === '/admin' ? path === '/admin' : path.startsWith(t.href);
    return html`<a class="tab${active ? ' active' : ''}" href="${t.href}">${icon(t.icon)}<span>${t.label}</span></a>`;
  });
  return html`
<div class="admin" data-csrf="${csrf}">
  <header class="admin-head">
    <div>
      <span class="eyebrow">${icon('admin_panel_settings')} Administrace</span>
      <h1 class="headline">${title}</h1>
    </div>
    <div class="admin-user">
      <span class="avatar">${user.displayName.slice(0, 1).toUpperCase()}</span>
      <span><b>${user.displayName}</b><small>${user.role === 'admin' ? 'administrátor' : 'editor'}</small></span>
      <form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${csrf}"><button class="icon-btn" title="Odhlásit">${icon('logout')}</button></form>
    </div>
  </header>
  <nav class="tabs" aria-label="Sekce administrace">${tabs}</nav>
  <div class="admin-body">${body}</div>
</div>`;
}

export function loginPage({ error, next, setup }) {
  return html`
<section class="auth-wrap">
  <form class="card elevated auth-card" method="post" action="${setup ? '/admin/setup' : '/admin/login'}">
    <div class="auth-wire" aria-hidden="true"></div>
    <h1 class="headline">${icon(setup ? 'person_add' : 'lock', 'filled')} ${setup ? 'Vytvořit správce' : 'Přihlášení'}</h1>
    <p class="muted">${setup ? 'Web zatím nemá žádný účet. Vytvoř první administrátorský účet.' : 'Přístup do administrace pro správce obsahu.'}</p>
    ${error ? html`<p class="banner error">${icon('error')} ${error}</p>` : ''}
    <input type="hidden" name="next" value="${next || ''}">
    <label class="text-field"><input name="username" required autocomplete="username" placeholder=" " minlength="3" maxlength="40"><span class="tf-label">Uživatelské jméno</span></label>
    ${setup ? html`<label class="text-field"><input name="displayName" placeholder=" " maxlength="60"><span class="tf-label">Zobrazované jméno</span></label>` : ''}
    <label class="text-field"><input type="password" name="password" required autocomplete="${setup ? 'new-password' : 'current-password'}" placeholder=" " ${setup ? raw('minlength="10"') : ''}><span class="tf-label">Heslo${setup ? ' (min. 10 znaků)' : ''}</span></label>
    <button class="btn filled lg block" type="submit">${icon(setup ? 'how_to_reg' : 'login')}${setup ? 'Vytvořit a přihlásit' : 'Přihlásit'}</button>
  </form>
</section>`;
}

function trend(cur, prev) {
  if (!prev) return cur ? html`<span class="trend up">${icon('trending_up')} nové</span>` : '';
  const pct = Math.round(((cur - prev) / prev) * 100);
  return html`<span class="trend ${pct >= 0 ? 'up' : 'down'}">${icon(pct >= 0 ? 'trending_up' : 'trending_down')} ${pct >= 0 ? '+' : ''}${pct} %</span>`;
}

export function dashboardPage({ s, counts }) {
  const labels = s.series.map((d) => `${Number(d.day.slice(8))}.${Number(d.day.slice(5, 7))}.`);
  const known = s.quiz?.answers ? Math.round((s.quiz.known / s.quiz.answers) * 100) : 0;
  return html`
<div class="range-pick chip-set">
  ${[7, 30, 90].map((d) => html`<a class="chip filter${s.days === d ? ' selected' : ''}" href="/admin?dni=${d}">${d} dní</a>`)}
</div>
<div class="kpi-grid">
  <div class="kpi card filled"><span class="kpi-label">${icon('visibility')} Zobrazení</span><b class="kpi-val">${fmtNum(s.totals.views)}</b>${trend(s.totals.views, s.prev.views)}</div>
  <div class="kpi card filled"><span class="kpi-label">${icon('person')} Návštěvníci</span><b class="kpi-val">${fmtNum(s.totals.visitors)}</b>${trend(s.totals.visitors, s.prev.visitors)}</div>
  <div class="kpi card filled"><span class="kpi-label">${icon('today')} Dnes</span><b class="kpi-val">${fmtNum(s.today.views)}</b><span class="kpi-sub">${fmtNum(s.today.visitors)} návštěvníků</span></div>
  <div class="kpi card filled"><span class="kpi-label">${icon('settings_motion_mode')} Simulace</span><b class="kpi-val">${fmtNum(s.events.sim_start || 0)}</b><span class="kpi-sub">${fmtNum(s.events.sim_trip || 0)} vybavení ochrany</span></div>
  <div class="kpi card filled"><span class="kpi-label">${icon('schema')} Schémata</span><b class="kpi-val">${fmtNum(s.events.schematic_action || 0)}</b><span class="kpi-sub">interakcí · ${fmtNum(s.events.schematic_short || 0)} zkratů</span></div>
  <div class="kpi card filled"><span class="kpi-label">${icon('quiz')} Procvičování</span><b class="kpi-val">${fmtNum(s.quiz?.answers || 0)}</b><span class="kpi-sub">${known} % „umím“</span></div>
</div>

<section class="card outlined admin-card">
  <header class="card-head"><h2 class="title-md">${icon('show_chart')} Návštěvnost</h2>
    <span class="legend"><i class="lg-views"></i>zobrazení <i class="lg-visitors"></i>návštěvníci</span></header>
  ${lineChart({ labels, series: [{ name: 'zobrazení', values: s.series.map((d) => d.views), cls: 'views' }, { name: 'návštěvníků', values: s.series.map((d) => d.visitors), cls: 'visitors' }] })}
</section>

<div class="admin-grid">
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('star')} Nejčtenější články</h2>
    ${barList(s.topArticles, { label: 'title', value: 'views', href: (r) => `/kb/${r.slug}` })}
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('dashboard')} Sekce webu</h2>
    ${barList(s.sections, { label: 'section', value: 'views' })}
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('devices')} Zařízení</h2>
    ${donut(s.devices, { label: 'device', value: 'visitors' })}
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('schedule')} Kdy se učí</h2>
    ${hourBars(s.hours)}
    <p class="muted small">Zobrazení podle hodiny dne.</p>
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('menu_book')} Předměty</h2>
    ${barList(s.subjects, { label: 'subject', value: 'views' })}
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('link')} Odkud přicházejí</h2>
    ${barList(s.referrers, { label: 'referrer', value: 'views', empty: 'Zatím žádné odkazy z jiných webů' })}
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('search')} Hledané výrazy</h2>
    ${barList(s.searches, { label: 'term', value: 'n', href: (r) => `/hledat?q=${encodeURIComponent(r.term)}` })}
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('search_off')} Hledání bez výsledku</h2>
    ${barList(s.zeroSearches, { label: 'term', value: 'n', empty: 'Všechno se našlo 👍' })}
    <p class="muted small">Tipy, o čem napsat nový článek.</p>
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('bolt')} Co vybavilo v simulátoru</h2>
    ${barList(s.trips, { label: 'label', value: 'n' })}
  </section>
  <section class="card outlined admin-card">
    <h2 class="title-md">${icon('touch_app')} Oblíbená schémata</h2>
    ${barList(s.schematics, { label: 'label', value: 'n' })}
  </section>
</div>

<section class="card outlined admin-card">
  <h2 class="title-md">${icon('inventory_2')} Obsah</h2>
  <div class="kpi-grid small">
    <div class="kpi"><span class="kpi-label">Články</span><b class="kpi-val">${fmtNum(counts.articles)}</b></div>
    <div class="kpi"><span class="kpi-label">Koncepty</span><b class="kpi-val">${fmtNum(counts.drafts)}</b></div>
    <div class="kpi"><span class="kpi-label">Otázky</span><b class="kpi-val">${fmtNum(counts.questions)}</b></div>
    <div class="kpi"><span class="kpi-label">Schémata</span><b class="kpi-val">${fmtNum(counts.schematics)}</b></div>
  </div>
</section>`;
}

export function articlesListPage({ items, subject, q }) {
  return html`
<div class="toolbar">
  <form class="chip-set" method="get">
    <label class="text-field dense"><input name="q" value="${q || ''}" placeholder=" "><span class="tf-label">Hledat název</span></label>
    <label class="select-field dense"><select name="predmet" data-autosubmit>
      <option value="">Všechny předměty</option>
      ${SUBJECTS.map((s) => html`<option${s.name === subject ? ' selected' : ''}>${s.name}</option>`)}
    </select></label>
  </form>
  <a class="btn filled" href="/admin/clanky/novy">${icon('add')}Nový článek</a>
</div>
<div class="table-wrap card outlined">
<table class="data-table">
  <thead><tr><th>Název</th><th>Předmět</th><th>Nadřazený</th><th>Typ</th><th class="num">Zobrazení</th><th>Upraveno</th><th></th></tr></thead>
  <tbody>
  ${items.map((a) => html`<tr>
    <td><a href="/admin/clanky/${a.id}"><b>${a.title}</b></a>${a.published ? '' : html` <span class="chip tiny error">koncept</span>`}</td>
    <td>${a.subject}</td><td class="muted">${a.parent_title || '–'}</td><td>${a.kind}</td>
    <td class="num">${fmtNum(a.views)}</td><td class="muted">${fmtDate(a.updated_at)}</td>
    <td class="actions"><a class="icon-btn" href="/kb/${a.slug}" title="Zobrazit">${icon('open_in_new')}</a></td></tr>`)}
  </tbody>
</table>
</div>`;
}

export function articleEditorPage({ article, parents, csrf }) {
  const a = article || { title: '', slug: '', subject: 'Odborný výcvik', kind: 'podtéma', sort_order: 0, body_md: '', tags: '[]', published: 1 };
  const tags = (() => { try { return JSON.parse(a.tags).join(', '); } catch { return ''; } })();
  return html`
<form class="editor" method="post" action="${a.id ? `/admin/clanky/${a.id}` : '/admin/clanky/novy'}" data-editor>
  <input type="hidden" name="_csrf" value="${csrf}">
  <div class="editor-meta card outlined">
    <label class="text-field"><input name="title" value="${a.title}" required placeholder=" "><span class="tf-label">Název</span></label>
    <label class="text-field"><input name="slug" value="${a.slug}" placeholder=" " pattern="[a-z0-9-]*"><span class="tf-label">URL (slug) – nech prázdné pro automatické</span></label>
    <label class="select-field"><span>Předmět</span><select name="subject">
      ${SUBJECTS.map((s) => html`<option${s.name === a.subject ? ' selected' : ''}>${s.name}</option>`)}
    </select></label>
    <label class="select-field"><span>Typ</span><select name="kind">
      ${KINDS.map((k) => html`<option${k === a.kind ? ' selected' : ''}>${k}</option>`)}
    </select></label>
    <label class="select-field"><span>Nadřazený článek</span><select name="parent_id">
      <option value="">— žádný (nejvyšší úroveň) —</option>
      ${parents.filter((p) => p.id !== a.id).map((p) => html`<option value="${p.id}"${p.id === a.parent_id ? ' selected' : ''}>${p.subject} › ${p.title}</option>`)}
    </select></label>
    <label class="text-field"><input type="number" name="sort_order" value="${a.sort_order}" placeholder=" "><span class="tf-label">Pořadí</span></label>
    <label class="text-field"><input name="tags" value="${tags}" placeholder=" "><span class="tf-label">Štítky (oddělené čárkou)</span></label>
    <label class="switch-field"><input type="checkbox" name="published" value="1"${a.published ? ' checked' : ''} role="switch"><span class="switch"></span>Publikováno</label>
  </div>
  <div class="editor-split">
    <div class="editor-pane card outlined">
      <div class="pane-head"><span class="label-lg">${icon('edit_note')} Markdown</span>
        <div class="md-tools" data-md-tools>
          <button type="button" class="icon-btn" data-md="**" title="Tučně">${icon('format_bold')}</button>
          <button type="button" class="icon-btn" data-md="==" title="Zvýraznit">${icon('ink_highlighter')}</button>
          <button type="button" class="icon-btn" data-md-block="> [!kostka] V kostce\n> - " title="V kostce">${icon('bolt')}</button>
          <button type="button" class="icon-btn" data-md-block="> [!pamatuj] Zapamatuj si\n> " title="Zapamatuj si">${icon('lightbulb')}</button>
          <button type="button" class="icon-btn" data-md-block="> [!vzorec] Vzorec\n> $$U = R \\cdot I$$" title="Vzorec">${icon('function')}</button>
          <button type="button" class="icon-btn" data-md-block="> [!warning] Pozor\n> " title="Varování">${icon('warning')}</button>
          <button type="button" class="icon-btn" data-md-block="> [!question]- Otázka?\n> Odpověď." title="Otázka do procvičování">${icon('quiz')}</button>
          <button type="button" class="icon-btn" data-md-block="| Sloupec | Sloupec |\n| --- | --- |\n| | |" title="Tabulka">${icon('table')}</button>
        </div>
      </div>
      <textarea name="body_md" spellcheck="true" data-md-input>${a.body_md}</textarea>
    </div>
    <div class="editor-pane card outlined">
      <div class="pane-head"><span class="label-lg">${icon('visibility')} Náhled</span><span class="muted small" data-preview-status></span></div>
      <div class="prose preview" data-preview></div>
    </div>
  </div>
  <div class="editor-actions">
    ${a.id ? html`<button class="btn text danger" type="submit" formaction="/admin/clanky/${a.id}/smazat" data-confirm="Opravdu smazat článek „${a.title}“? Tuto akci nelze vrátit.">${icon('delete')}Smazat</button>` : ''}
    <span class="spacer"></span>
    ${a.id ? html`<a class="btn outlined" href="/kb/${a.slug}" target="_blank">${icon('open_in_new')}Zobrazit</a>` : ''}
    <button class="btn filled" type="submit">${icon('save')}Uložit</button>
  </div>
  <details class="md-help card filled">
    <summary>${icon('help')} Nápověda k formátování</summary>
    <div class="prose small">
      <p><code>[[Název článku]]</code> odkaz na článek · <code>![[obrazek.svg]]</code> vložený obrázek (nahraj v sekci Soubory) · <code>$U = R \\cdot I$</code> vzorec · <code>==text==</code> zvýraznění.</p>
      <p>Callouty: <code>&gt; [!kostka]</code>, <code>[!pamatuj]</code>, <code>[!vzorec]</code>, <code>[!definice]</code>, <code>[!priklad]</code>, <code>[!tip]</code>, <code>[!warning]</code>. Rozbalovací otázky <code>&gt; [!question]- Otázka?</code> se automaticky přidají do procvičování. Karty vedle sebe: <code>&gt; [!karty]</code> s vnořenými callouty.</p>
    </div>
  </details>
</form>`;
}

export function schematicsAdminPage({ items }) {
  return html`
<div class="toolbar"><span></span><a class="btn filled" href="/admin/schemata/nove">${icon('add')}Nové schéma</a></div>
<div class="table-wrap card outlined">
<table class="data-table">
  <thead><tr><th>Název</th><th>Kategorie</th><th class="num">Pořadí</th><th>Upraveno</th><th></th></tr></thead>
  <tbody>${items.map((s) => html`<tr>
    <td><a href="/admin/schemata/${s.id}"><b>${s.title}</b></a>${s.published ? '' : html` <span class="chip tiny error">skryté</span>`}</td>
    <td>${s.category}</td><td class="num">${s.sort_order}</td><td class="muted">${fmtDate(s.updated_at)}</td>
    <td class="actions"><a class="icon-btn" href="/schemata/${s.slug}" title="Zobrazit">${icon('open_in_new')}</a></td></tr>`)}
  </tbody>
</table></div>`;
}

export function schematicEditorPage({ schematic, csrf, error }) {
  const s = schematic || {
    title: '', category: 'Motory', description: '', sort_order: 0, published: 1,
    data: { width: 600, height: 400, devices: {}, components: [], wires: [] },
  };
  return html`
<form class="editor" method="post" action="${s.id ? `/admin/schemata/${s.id}` : '/admin/schemata/nove'}" data-sch-editor>
  <input type="hidden" name="_csrf" value="${csrf}">
  ${error ? html`<p class="banner error">${icon('error')} ${error}</p>` : ''}
  <div class="editor-meta card outlined">
    <label class="text-field"><input name="title" value="${s.title}" required placeholder=" "><span class="tf-label">Název</span></label>
    <label class="text-field"><input name="category" value="${s.category}" placeholder=" " list="sch-cats"><span class="tf-label">Kategorie</span></label>
    <datalist id="sch-cats"><option>Motory</option><option>Domovní instalace</option><option>Ochrany</option></datalist>
    <label class="text-field"><input type="number" name="sort_order" value="${s.sort_order}" placeholder=" "><span class="tf-label">Pořadí</span></label>
    <label class="switch-field"><input type="checkbox" name="published" value="1"${s.published ? ' checked' : ''} role="switch"><span class="switch"></span>Zveřejněno</label>
    <label class="text-field full"><textarea name="description" rows="2" placeholder=" ">${s.description}</textarea><span class="tf-label">Krátký popis (karta v seznamu)</span></label>
  </div>
  <div class="editor-split">
    <div class="editor-pane card outlined">
      <div class="pane-head"><span class="label-lg">${icon('data_object')} Definice (JSON)</span><span class="muted small" data-json-status></span></div>
      <textarea name="data" class="mono" spellcheck="false" data-json-input>${JSON.stringify(s.data, null, 2)}</textarea>
    </div>
    <div class="editor-pane card outlined">
      <div class="pane-head"><span class="label-lg">${icon('visibility')} Živý náhled</span><span class="muted small">klikej na prvky</span></div>
      <div class="schem-canvas preview" data-schematic></div>
      <div class="control-panel" data-sch-controls></div>
    </div>
  </div>
  <div class="editor-actions">
    ${s.id ? html`<button class="btn text danger" type="submit" formaction="/admin/schemata/${s.id}/smazat" data-confirm="Opravdu smazat schéma „${s.title}“?">${icon('delete')}Smazat</button>` : ''}
    <span class="spacer"></span>
    ${s.id ? html`<a class="btn outlined" href="/schemata/${s.slug}" target="_blank">${icon('open_in_new')}Zobrazit</a>` : ''}
    <button class="btn filled" type="submit">${icon('save')}Uložit</button>
  </div>
  <details class="md-help card filled">
    <summary>${icon('help')} Formát schématu</summary>
    <div class="prose small">
      <p><b>components</b>: prvky s <code>type</code> (např. <code>src</code>, <code>fuse</code>, <code>no</code>, <code>nc</code>, <code>pb_no</code>, <code>pb_nc</code>, <code>coil</code>, <code>lamp</code>, <code>q3</code>, <code>km3</code>, <code>olr3</code>, <code>motor3</code>, <code>motor6</code>, <code>co</code>, <code>cross</code>, <code>switch</code>), souřadnicemi <code>x</code>, <code>y</code>, volitelně <code>rot</code> (0/90/180/270), <code>dev</code> (přístroj, ke kterému prvek patří) a <code>label</code>.</p>
      <p><b>wires</b>: lomené čáry <code>[[x,y],[x,y],…]</code>. Vodiče se spojí, když se jejich body nebo konce dotýkají vývodů prvků. <b>devices</b>: stavy přístrojů (<code>contactor</code>, <code>timer</code> s <code>delay</code>, <code>button</code>, <code>switch</code>, <code>breaker</code>, <code>olr</code>, <code>fuse</code>).</p>
    </div>
  </details>
</form>`;
}

export function assetsPage({ files, csrf }) {
  return html`
<div class="upload card outlined" data-upload data-csrf="${csrf}">
  ${icon('cloud_upload', 'upload-icon')}
  <p><b>Přetáhni sem obrázky</b> nebo <label class="link">vyber soubory<input type="file" multiple accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.pdf" hidden data-upload-input></label></p>
  <p class="muted small">SVG, PNG, JPG, WEBP, GIF nebo PDF do 5 MB. V článku je vložíš pomocí <code>![[nazev-souboru.svg]]</code>.</p>
  <div class="upload-progress" data-upload-status></div>
</div>
<div class="asset-grid">
  ${files.map((f) => html`<figure class="asset card outlined">
    <div class="asset-thumb">${/\.(svg|png|jpe?g|webp|gif)$/i.test(f.name) ? html`<img src="/assets/${encodeURIComponent(f.name)}" alt="" loading="lazy">` : icon('description')}</div>
    <figcaption>
      <code class="asset-name" title="${f.name}">${f.name}</code>
      <span class="muted small">${f.size < 1024 ? f.size + ' B' : (f.size / 1024).toFixed(1) + ' kB'} · ${f.source === 'upload' ? 'nahráno' : 'repozitář'}</span>
      <span class="asset-actions">
        <button type="button" class="btn text sm" data-copy="![[${f.name}]]">${icon('content_copy')}Kopírovat</button>
        ${f.source === 'upload' ? html`<form method="post" action="/admin/soubory/smazat"><input type="hidden" name="_csrf" value="${csrf}"><input type="hidden" name="name" value="${f.name}"><button class="icon-btn danger" data-confirm="Smazat soubor ${f.name}?" title="Smazat">${icon('delete')}</button></form>` : ''}
      </span>
    </figcaption>
  </figure>`)}
</div>`;
}

export function usersPage({ users, csrf, me, message, error }) {
  return html`
${message ? html`<p class="banner success">${icon('check_circle')} ${message}</p>` : ''}
${error ? html`<p class="banner error">${icon('error')} ${error}</p>` : ''}
<div class="admin-grid two">
  <div class="table-wrap card outlined">
    <table class="data-table">
      <thead><tr><th>Uživatel</th><th>Role</th><th>Vytvořen</th><th>Poslední přihlášení</th><th></th></tr></thead>
      <tbody>${users.map((u) => html`<tr>
        <td><b>${u.display_name}</b><br><span class="muted small">${u.username}</span></td>
        <td>${u.role === 'admin' ? 'administrátor' : 'editor'}</td>
        <td class="muted">${fmtDate(u.created_at)}</td><td class="muted">${fmtDateTime(u.last_login)}</td>
        <td class="actions">${u.id !== me.id ? html`<form method="post" action="/admin/uzivatele/${u.id}/smazat"><input type="hidden" name="_csrf" value="${csrf}"><button class="icon-btn danger" data-confirm="Smazat uživatele ${u.username}?" title="Smazat">${icon('person_remove')}</button></form>` : html`<span class="chip tiny">to jsi ty</span>`}</td>
      </tr>`)}</tbody>
    </table>
  </div>
  <div class="stack">
    <form class="card outlined form-card" method="post" action="/admin/uzivatele">
      <h2 class="title-md">${icon('person_add')} Přidat uživatele</h2>
      <input type="hidden" name="_csrf" value="${csrf}">
      <label class="text-field"><input name="username" required minlength="3" placeholder=" "><span class="tf-label">Uživatelské jméno</span></label>
      <label class="text-field"><input name="displayName" placeholder=" "><span class="tf-label">Zobrazované jméno</span></label>
      <label class="text-field"><input type="password" name="password" required minlength="10" autocomplete="new-password" placeholder=" "><span class="tf-label">Heslo (min. 10 znaků)</span></label>
      <label class="select-field"><span>Role</span><select name="role"><option value="editor">editor – upravuje obsah</option><option value="admin">administrátor – vše</option></select></label>
      <button class="btn filled" type="submit">${icon('add')}Přidat</button>
    </form>
    <form class="card outlined form-card" method="post" action="/admin/heslo">
      <h2 class="title-md">${icon('key')} Změnit moje heslo</h2>
      <input type="hidden" name="_csrf" value="${csrf}">
      <label class="text-field"><input type="password" name="current" required autocomplete="current-password" placeholder=" "><span class="tf-label">Současné heslo</span></label>
      <label class="text-field"><input type="password" name="password" required minlength="10" autocomplete="new-password" placeholder=" "><span class="tf-label">Nové heslo</span></label>
      <button class="btn tonal" type="submit">Změnit heslo</button>
    </form>
  </div>
</div>`;
}

export function importPage({ csrf, vault, result, folders }) {
  return html`
${result ? html`<p class="banner success">${icon('check_circle')} ${result}</p>` : ''}
<div class="admin-grid two">
  <form class="card outlined form-card" method="post" action="/admin/import">
    <h2 class="title-md">${icon('folder_special')} Import z Obsidian vaultu</h2>
    <input type="hidden" name="_csrf" value="${csrf}">
    <input type="hidden" name="source" value="vault">
    <p class="muted">Načte poznámky přímo ze složky vaultu na serveru (proměnná <code>OBSIDIAN_VAULT</code>). Struktura se převezme z frontmatteru <code>typ</code>, <code>předmět</code>, <code>nadřazené</code> a <code>pořadí</code>.</p>
    ${vault ? html`<p><code>${vault}</code></p>
      <fieldset class="checks"><legend>Složky</legend>${folders.map((f) => html`<label class="check"><input type="checkbox" name="folders" value="${f}" checked>${f}</label>`)}</fieldset>
      <label class="switch-field"><input type="checkbox" name="overwrite" value="1" role="switch"><span class="switch"></span>Přepsat existující články se stejným názvem</label>
      <button class="btn filled" type="submit">${icon('sync')}Importovat z vaultu</button>`
      : html`<p class="banner">${icon('info')} <span>Vault není nastaven. Spusť server s <code>OBSIDIAN_VAULT=/cesta/k/vaultu</code>.</span></p>`}
  </form>
  <form class="card outlined form-card" method="post" action="/admin/import">
    <h2 class="title-md">${icon('inventory')} Obnovit z repozitáře</h2>
    <input type="hidden" name="_csrf" value="${csrf}">
    <input type="hidden" name="source" value="content">
    <p class="muted">Znovu načte výchozí obsah ze složky <code>content/</code> v repozitáři (poznámky i schémata).</p>
    <label class="switch-field"><input type="checkbox" name="overwrite" value="1" role="switch"><span class="switch"></span>Přepsat změny provedené v administraci</label>
    <button class="btn tonal" type="submit">${icon('restore')}Načíst content/</button>
  </form>
</div>`;
}
