import { db, tx } from './db.js';
import {
  createRenderer, extractQuestions, extractSummary, plainText, slugify,
} from './markdown.js';
import { SUBJECTS } from './subjects.js';

// --- Odkazy mezi články -------------------------------------------------------
let linkIndex = null;

function buildLinkIndex() {
  const map = new Map();
  for (const a of db.prepare('SELECT slug, title FROM articles WHERE published = 1').all()) {
    map.set(a.title.toLowerCase(), { href: `/kb/${a.slug}`, title: a.title });
    map.set(a.slug, { href: `/kb/${a.slug}`, title: a.title });
  }
  return map;
}

export function resolveTitle(title) {
  linkIndex ||= buildLinkIndex();
  const key = String(title).trim().toLowerCase();
  return linkIndex.get(key) || linkIndex.get(slugify(key)) || null;
}

const renderer = createRenderer({ resolve: resolveTitle });
const htmlCache = new Map();

function invalidate() {
  linkIndex = null;
  htmlCache.clear();
}

export function renderMarkdown(md) {
  return renderer.render(md);
}

export function renderInline(md) {
  return renderer.inline(md);
}

export function renderArticle(article) {
  const key = `${article.id}:${article.updated_at}`;
  let hit = htmlCache.get(key);
  if (!hit) {
    hit = renderer.render(article.body_md);
    htmlCache.set(key, hit);
    if (htmlCache.size > 300) htmlCache.delete(htmlCache.keys().next().value);
  }
  return hit;
}

// --- Dotazy -------------------------------------------------------------------
export function getArticleBySlug(slug, { includeDrafts = false } = {}) {
  return db.prepare(`SELECT * FROM articles WHERE slug = ? ${includeDrafts ? '' : 'AND published = 1'}`).get(slug);
}

export function getArticle(id) {
  return db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
}

export function listArticles({ subject, q } = {}) {
  const where = [];
  const args = [];
  if (subject) { where.push('a.subject = ?'); args.push(subject); }
  if (q) { where.push('a.title LIKE ?'); args.push(`%${q}%`); }
  return db.prepare(`
    SELECT a.id, a.slug, a.title, a.kind, a.subject, a.parent_id, a.sort_order, a.published, a.updated_at,
           p.title AS parent_title,
           (SELECT COUNT(*) FROM pageviews v WHERE v.article_id = a.id) AS views
    FROM articles a LEFT JOIN articles p ON p.id = a.parent_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.subject, a.updated_at DESC`).all(...args);
}

// Strom publikovaných článků: předmět → témata → podtémata → příklady.
export function getTree() {
  const rows = db.prepare(`
    SELECT id, slug, title, kind, subject, parent_id, sort_order, summary
    FROM articles WHERE published = 1 ORDER BY sort_order, title`).all();
  const byId = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parent_id && byId.get(node.parent_id);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const order = (name) => {
    const i = SUBJECTS.findIndex((s) => s.name === name);
    return i < 0 ? 99 : i;
  };
  const subjects = SUBJECTS.map((s) => ({ ...s, root: null, items: [] }));
  for (const r of roots) {
    let bucket = subjects.find((s) => s.name === r.subject);
    if (!bucket) {
      bucket = { name: r.subject, key: 'other', icon: 'folder', tagline: '', root: null, items: [] };
      subjects.push(bucket);
    }
    if (r.kind === 'předmět' && !bucket.root) bucket.root = r;
    else bucket.items.push(r);
  }
  for (const s of subjects) {
    s.topics = s.root ? [...s.root.children, ...s.items] : s.items;
    s.count = countNodes(s.topics) + (s.root ? 1 : 0);
  }
  subjects.sort((a, b) => order(a.name) - order(b.name));
  return { subjects: subjects.filter((s) => s.count > 0), byId };
}

function countNodes(nodes) {
  return nodes.reduce((n, x) => n + 1 + countNodes(x.children), 0);
}

// Cesta od předmětu k článku + sourozenci pro navigaci „předchozí / další“.
export function getContext(article) {
  const { byId } = getTree();
  const crumbs = [];
  let cur = byId.get(article.parent_id);
  while (cur) {
    crumbs.unshift(cur);
    cur = byId.get(cur.parent_id);
  }
  const node = byId.get(article.id);
  const children = node ? node.children : [];
  // Lineární pořadí článků v rámci předmětu (pro předchozí/další).
  const flat = [];
  const subjectRoot = crumbs[0] || node;
  const walk = (n) => { flat.push(n); n.children.forEach(walk); };
  if (subjectRoot) walk(subjectRoot);
  const i = flat.findIndex((n) => n.id === article.id);
  return {
    crumbs,
    children,
    prev: i > 0 ? flat[i - 1] : null,
    next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : null,
  };
}

export function search(q, limit = 30) {
  const terms = String(q || '')
    .normalize('NFC')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1)
    .slice(0, 8);
  if (!terms.length) return [];
  const match = terms.map((t) => `"${t.replace(/"/g, '')}"*`).join(' ');
  try {
    return db.prepare(`
      SELECT a.slug, a.title, a.subject, a.kind,
             snippet(articles_fts, 2, '<mark>', '</mark>', ' … ', 18) AS snippet,
             bm25(articles_fts, 8.0, 3.0, 1.0) AS rank
      FROM articles_fts JOIN articles a ON a.id = articles_fts.rowid
      WHERE articles_fts MATCH ? AND a.published = 1
      ORDER BY rank LIMIT ?`).all(match, limit);
  } catch {
    return [];
  }
}

export function allQuestions(subject) {
  return db.prepare(`
    SELECT q.id, q.question, q.answer_md, a.title AS article_title, a.slug, a.subject
    FROM questions q JOIN articles a ON a.id = q.article_id
    WHERE a.published = 1 ${subject ? 'AND a.subject = ?' : ''}
    ORDER BY a.subject, a.sort_order, q.id`).all(...(subject ? [subject] : []));
}

// --- Zápis --------------------------------------------------------------------
export function uniqueSlug(base, exceptId = null) {
  let slug = slugify(base);
  let n = 1;
  const exists = db.prepare('SELECT id FROM articles WHERE slug = ?');
  while (true) {
    const row = exists.get(slug);
    if (!row || row.id === exceptId) return slug;
    slug = `${slugify(base)}-${++n}`;
  }
}

export function saveArticle(input, userId = null) {
  const now = Date.now();
  const fields = {
    title: String(input.title || '').trim() || 'Bez názvu',
    kind: input.kind || 'podtéma',
    subject: String(input.subject || 'Odborný výcvik').trim(),
    parent_id: input.parent_id ? Number(input.parent_id) : null,
    sort_order: Number(input.sort_order) || 0,
    body_md: String(input.body_md ?? ''),
    tags: JSON.stringify(Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(',').map((t) => t.trim()).filter(Boolean)),
    published: input.published === false || input.published === '0' || input.published === 0 ? 0 : 1,
    source_path: input.source_path || null,
  };
  fields.summary = extractSummary(fields.body_md);

  return tx(() => {
    let id = input.id ? Number(input.id) : null;
    if (id) {
      if (fields.parent_id === id) fields.parent_id = null;
      const slug = uniqueSlug(input.slug || fields.title, id);
      db.prepare(`UPDATE articles SET slug=?, title=?, kind=?, subject=?, parent_id=?, sort_order=?, body_md=?,
        summary=?, tags=?, published=?, source_path=COALESCE(?, source_path), updated_at=?, updated_by=? WHERE id=?`)
        .run(slug, fields.title, fields.kind, fields.subject, fields.parent_id, fields.sort_order, fields.body_md,
          fields.summary, fields.tags, fields.published, fields.source_path, now, userId, id);
    } else {
      const slug = uniqueSlug(input.slug || fields.title);
      const info = db.prepare(`INSERT INTO articles (slug, title, kind, subject, parent_id, sort_order, body_md, summary,
        tags, published, source_path, created_at, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(slug, fields.title, fields.kind, fields.subject, fields.parent_id, fields.sort_order, fields.body_md,
          fields.summary, fields.tags, fields.published, fields.source_path, now, now, userId);
      id = Number(info.lastInsertRowid);
    }
    reindex(id, fields);
    invalidate();
    return id;
  });
}

function reindex(id, fields) {
  db.prepare('DELETE FROM articles_fts WHERE rowid = ?').run(id);
  db.prepare('INSERT INTO articles_fts (rowid, title, summary, body) VALUES (?, ?, ?, ?)')
    .run(id, fields.title, fields.summary, plainText(fields.body_md));
  db.prepare('DELETE FROM questions WHERE article_id = ?').run(id);
  const ins = db.prepare('INSERT INTO questions (article_id, question, answer_md) VALUES (?, ?, ?)');
  for (const q of extractQuestions(fields.body_md)) ins.run(id, q.question, q.answer);
}

export function setParent(id, parentId) {
  db.prepare('UPDATE articles SET parent_id = ? WHERE id = ?').run(parentId, id);
  invalidate();
}

export function deleteArticle(id) {
  tx(() => {
    db.prepare('UPDATE articles SET parent_id = NULL WHERE parent_id = ?').run(id);
    db.prepare('DELETE FROM articles_fts WHERE rowid = ?').run(id);
    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  });
  invalidate();
}

export function articleCount() {
  return db.prepare('SELECT COUNT(*) AS n FROM articles WHERE published = 1').get().n;
}
