// Renderer Markdownu kompatibilní s Obsidianem:
// callouty (> [!typ]), vnořené karty, [[wiki odkazy]], ![[vložené obrázky]],
// matematika $…$ / $$…$$ (KaTeX), ==zvýraznění==, mermaid diagramy.
import { Marked } from 'marked';
import katex from 'katex';

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function slugify(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'clanek';
}

// --- Frontmatter (podmnožina YAML, kterou Obsidian používá) ----------------
export function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  const data = {};
  let lastKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && lastKey) {
      if (!Array.isArray(data[lastKey])) data[lastKey] = [];
      data[lastKey].push(unquote(item[1]));
      continue;
    }
    const kv = /^([^:#][^:]*):\s*(.*)$/.exec(line);
    if (kv) {
      lastKey = kv[1].trim();
      data[lastKey] = kv[2] === '' ? [] : unquote(kv[2]);
    }
  }
  return { data, body: src.slice(m[0].length) };
}

function unquote(v) {
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

// Odstraní obsidianovskou drobečkovou navigaci na začátku a šipky na konci –
// web si navigaci generuje sám ze stromu článků.
export function stripObsidianNav(body) {
  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && lines[i].includes('›') && !lines[i].startsWith('>') && !lines[i].startsWith('#')) {
    lines.splice(i, 1);
  }
  let end = lines.length - 1;
  while (end >= 0 && lines[end].trim() === '') end--;
  if (end >= 0 && /^(⬆️|⬅️|➡️)/.test(lines[end].trim())) {
    lines.splice(end, 1);
    end--;
    while (end >= 0 && lines[end].trim() === '') end--;
    if (end >= 0 && lines[end].trim() === '---') lines.splice(end, 1);
  }
  return lines.join('\n').trim() + '\n';
}

// --- Otázky „Otestuj se“ ------------------------------------------------------
export function extractQuestions(md) {
  const out = [];
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^>\s*\[!question\][-+]?\s*(.+)$/.exec(lines[i]);
    if (!m) continue;
    const answer = [];
    let j = i + 1;
    while (j < lines.length && /^>/.test(lines[j])) {
      answer.push(lines[j].replace(/^>\s?/, ''));
      j++;
    }
    out.push({ question: m[1].trim(), answer: answer.join('\n').trim() });
    i = j - 1;
  }
  return out;
}

// Krátké shrnutí – první odrážky z calloutu „V kostce“, jinak první odstavec.
export function extractSummary(md) {
  const lines = md.split(/\r?\n/);
  const k = lines.findIndex((l) => /^>\s*\[!(kostka|abstract|summary)\]/.test(l));
  let text = '';
  if (k >= 0) {
    const parts = [];
    for (let j = k + 1; j < lines.length && lines[j].startsWith('>'); j++) {
      const t = lines[j].replace(/^>\s?/, '').replace(/^[-*]\s+/, '').trim();
      if (t) parts.push(t);
    }
    text = parts.join(' · ');
  } else {
    text = lines.find((l) => l.trim() && !/^[#>|!-]/.test(l.trim()) && !l.includes('›')) || '';
  }
  return plainText(text).slice(0, 220);
}

export function plainText(md) {
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!\[\[[^\]]*\]\]/g, ' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^>\s*\[![^\]]+\][-+]?/gm, '')
    .replace(/[*_`>#=|]+/g, ' ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Callouty ----------------------------------------------------------------
const CALLOUTS = {
  kostka: { icon: 'bolt', tone: 'primary', label: 'V kostce' },
  abstract: { icon: 'summarize', tone: 'primary', label: 'Shrnutí' },
  summary: { icon: 'summarize', tone: 'primary', label: 'Shrnutí' },
  pamatuj: { icon: 'lightbulb', tone: 'pe', label: 'Zapamatuj si' },
  vzorec: { icon: 'function', tone: 'formula', label: 'Vzorec' },
  definice: { icon: 'menu_book', tone: 'tertiary', label: 'Definice' },
  priklad: { icon: 'calculate', tone: 'example', label: 'Příklad' },
  example: { icon: 'science', tone: 'example', label: 'Příklad' },
  success: { icon: 'check_circle', tone: 'secondary', label: 'Řešení' },
  tip: { icon: 'tips_and_updates', tone: 'secondary', label: 'Tip' },
  info: { icon: 'info', tone: 'tertiary', label: 'Info' },
  note: { icon: 'edit_note', tone: 'tertiary', label: 'Poznámka' },
  warning: { icon: 'warning', tone: 'warning', label: 'Pozor' },
  danger: { icon: 'dangerous', tone: 'error', label: 'Nebezpečí' },
  error: { icon: 'dangerous', tone: 'error', label: 'Chyba' },
  question: { icon: 'quiz', tone: 'question', label: 'Otázka' },
  elektro: { icon: 'bolt', tone: 'subject-elektro', label: 'Elektro' },
  esp: { icon: 'local_fire_department', tone: 'subject-esp', label: 'ESP' },
  emer: { icon: 'speed', tone: 'subject-emer', label: 'Elektrické měření' },
  ov: { icon: 'construction', tone: 'subject-ov', label: 'Odborný výcvik' },
  fyzika: { icon: 'science', tone: 'tertiary', label: 'Fyzika' },
  matematika: { icon: 'calculate', tone: 'formula', label: 'Matematika' },
  domu: { icon: 'home', tone: 'primary', label: '' },
};

function renderKatex(tex, displayMode) {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore' });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

const IMAGE_EXT = /\.(svg|png|jpe?g|gif|webp|avif)$/i;

/**
 * Vytvoří renderer.
 * @param {object} opts
 * @param {(title: string) => ({href: string, title: string} | null)} opts.resolve – převod [[odkazu]] na URL
 * @param {string} [opts.assetBase] – prefix URL pro přílohy
 */
export function createRenderer({ resolve = () => null, assetBase = '/assets/' } = {}) {
  let toc = [];
  const usedIds = new Map();

  const md = new Marked({ gfm: true, breaks: false });

  md.use({
    extensions: [
      {
        name: 'mathBlock',
        level: 'block',
        start: (src) => src.match(/^\$\$/m)?.index,
        tokenizer(src) {
          const m = /^\$\$\s*\n?([\s\S]+?)\n?\s*\$\$[ \t]*(?:\n|$)/.exec(src);
          if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
        },
        renderer: (t) => `<div class="math-display">${renderKatex(t.text, true)}</div>\n`,
      },
      {
        name: 'math',
        level: 'inline',
        start: (src) => src.indexOf('$'),
        tokenizer(src) {
          let m = /^\$\$([\s\S]+?)\$\$/.exec(src);
          if (m) return { type: 'math', raw: m[0], text: m[1].trim(), display: true };
          m = /^\$((?:\\\$|[^$\n])+?)\$(?![0-9])/.exec(src);
          if (m) return { type: 'math', raw: m[0], text: m[1].trim(), display: false };
        },
        renderer: (t) => t.display
          ? `<span class="math-display">${renderKatex(t.text, true)}</span>`
          : renderKatex(t.text, false),
      },
      {
        name: 'embed',
        level: 'inline',
        start: (src) => src.indexOf('![['),
        tokenizer(src) {
          const m = /^!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/.exec(src);
          if (m) return { type: 'embed', raw: m[0], target: m[1].trim(), alias: m[2]?.trim() };
        },
        renderer(t) {
          if (IMAGE_EXT.test(t.target)) {
            const width = /^\d+$/.test(t.alias || '') ? ` style="max-width:${t.alias}px"` : '';
            const alt = escapeHtml(t.target.replace(IMAGE_EXT, '').replace(/[-_]/g, ' '));
            return `<span class="figure"><img src="${assetBase}${encodeURIComponent(t.target)}" alt="${alt}" loading="lazy"${width}></span>`;
          }
          if (/\.(base|canvas)$/i.test(t.target)) return '';
          const hit = resolve(t.target);
          if (!hit) return `<span class="wikilink broken">${escapeHtml(t.target)}</span>`;
          return `<a class="embed-card" href="${hit.href}"><span class="material-symbols-rounded">article</span>${escapeHtml(hit.title)}</a>`;
        },
      },
      {
        name: 'wikilink',
        level: 'inline',
        start: (src) => src.indexOf('[['),
        tokenizer(src) {
          const m = /^\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/.exec(src);
          if (m) return { type: 'wikilink', raw: m[0], target: m[1].trim(), hash: m[2] || '', alias: m[3]?.trim() };
        },
        renderer(t) {
          const hit = resolve(t.target);
          const label = escapeHtml(t.alias || t.target);
          if (!hit) return `<span class="wikilink broken" title="Článek zatím neexistuje">${label}</span>`;
          const hash = t.hash ? '#' + slugify(t.hash.slice(1)) : '';
          return `<a class="wikilink" href="${hit.href}${hash}">${label}</a>`;
        },
      },
      {
        name: 'highlight',
        level: 'inline',
        start: (src) => src.indexOf('=='),
        tokenizer(src) {
          const m = /^==(?=\S)([^=\n]+?)==/.exec(src);
          if (m) return { type: 'highlight', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
        },
        renderer(t) {
          return `<mark>${this.parser.parseInline(t.tokens)}</mark>`;
        },
      },
    ],
    renderer: {
      // Surové HTML escapujeme; projdou jen jednoduché formátovací značky bez atributů.
      html({ text }) {
        return escapeHtml(text).replace(/&lt;(\/?)(b|i|u|em|strong|small|sub|sup|kbd|mark|br)\s*\/?&gt;/gi, '<$1$2>');
      },
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const text = html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, '').trim();
        let id = slugify(text);
        const n = usedIds.get(id) || 0;
        usedIds.set(id, n + 1);
        if (n) id += `-${n}`;
        if (depth === 2 || depth === 3) toc.push({ id, text, depth });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${html}</h${depth}>\n`;
      },
      code({ text, lang }) {
        if (lang === 'mermaid') {
          return `<div class="mermaid-wrap"><pre class="mermaid">${escapeHtml(linkMermaid(text, resolve))}</pre></div>\n`;
        }
        const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
        return `<pre class="code"><code${cls}>${escapeHtml(text)}</code></pre>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        const t = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(href)}"${t}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}${external ? '<span class="material-symbols-rounded ext">open_in_new</span>' : ''}</a>`;
      },
      blockquote(token) {
        const lines = token.text.split('\n');
        const m = /^\[!([a-zA-Z0-9_-]+)\]([-+]?)\s*(.*)$/.exec(lines[0].trim());
        if (!m) return `<blockquote>${this.parser.parse(token.tokens)}</blockquote>\n`;
        const type = m[1].toLowerCase();
        const fold = m[2];
        const rest = lines.slice(1).join('\n');
        const body = rest.trim() ? this.parser.parse(md.lexer(rest)) : '';
        if (type === 'karty') return `<div class="callout-grid">${body}</div>\n`;
        const def = CALLOUTS[type] || { icon: 'info', tone: 'tertiary', label: type };
        const titleHtml = m[3] ? md.parseInline(m[3]) : escapeHtml(def.label);
        const head = `<span class="material-symbols-rounded callout-icon" aria-hidden="true">${def.icon}</span><span class="callout-title-text">${titleHtml}</span>`;
        if (fold) {
          return `<details class="callout tone-${def.tone}" data-callout="${type}"${fold === '+' ? ' open' : ''}>`
            + `<summary class="callout-title">${head}<span class="material-symbols-rounded callout-fold" aria-hidden="true">expand_more</span></summary>`
            + `<div class="callout-content">${body}</div></details>\n`;
        }
        return `<div class="callout tone-${def.tone}" data-callout="${type}"><div class="callout-title">${head}</div>`
          + (body ? `<div class="callout-content">${body}</div>` : '') + '</div>\n';
      },
    },
  });

  return {
    render(src) {
      toc = [];
      usedIds.clear();
      let html = md.parse(src);
      html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
      return { html, toc: [...toc] };
    },
    inline(src) {
      return md.parseInline(src);
    },
  };
}

// Uzly mermaid diagramu označené třídou internal-link dostanou odkaz na článek.
function linkMermaid(src, resolve) {
  const classLine = /^\s*class\s+([\w,]+)\s+internal-link\s*$/m.exec(src);
  if (!classLine) return src;
  const ids = new Set(classLine[1].split(','));
  const labels = new Map();
  const re = /\b([A-Za-z][\w]*)\s*(\(\(|\[\[|\[|\(|\{)\s*"?([^\]\)\}"]+?)"?\s*(\)\)|\]\]|\]|\)|\})/g;
  let m;
  while ((m = re.exec(src))) if (!labels.has(m[1])) labels.set(m[1], m[3].trim());
  const clicks = [];
  for (const id of ids) {
    const hit = labels.has(id) && resolve(labels.get(id));
    if (hit) clicks.push(`    click ${id} href "${hit.href}"`);
  }
  return src.replace(classLine[0], `    class ${classLine[1]} internal-link\n${clicks.join('\n')}`);
}
