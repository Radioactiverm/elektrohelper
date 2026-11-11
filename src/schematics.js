import { db } from './db.js';
import { slugify } from './markdown.js';

export function listSchematics({ includeDrafts = false } = {}) {
  return db.prepare(`SELECT id, slug, title, category, description, sort_order, published, updated_at
    FROM schematics ${includeDrafts ? '' : 'WHERE published = 1'} ORDER BY sort_order, title`).all();
}

export function getSchematic(slug, { includeDrafts = false } = {}) {
  const row = db.prepare(`SELECT * FROM schematics WHERE slug = ? ${includeDrafts ? '' : 'AND published = 1'}`).get(slug);
  return row ? { ...row, data: JSON.parse(row.data) } : null;
}

export function getSchematicById(id) {
  const row = db.prepare('SELECT * FROM schematics WHERE id = ?').get(id);
  return row ? { ...row, data: JSON.parse(row.data) } : null;
}

export function saveSchematic(input) {
  const data = typeof input.data === 'string' ? JSON.parse(input.data) : input.data;
  if (!data || !Array.isArray(data.components) || !Array.isArray(data.wires)) {
    throw new Error('Schéma musí obsahovat pole „components“ a „wires“.');
  }
  const now = Date.now();
  const title = String(input.title || data.title || 'Schéma').trim();
  const slug = slugify(input.slug || data.slug || title);
  const category = String(input.category || data.category || 'Motory');
  const description = String(input.description ?? data.description ?? '');
  const order = Number(input.sort_order ?? data.order ?? 0) || 0;
  const published = input.published === '0' || input.published === 0 || input.published === false ? 0 : 1;
  data.slug = slug;
  data.title = title;
  if (input.id) {
    db.prepare(`UPDATE schematics SET slug=?, title=?, category=?, description=?, data=?, sort_order=?, published=?,
      updated_at=? WHERE id=?`).run(slug, title, category, description, JSON.stringify(data), order, published, now, Number(input.id));
    return Number(input.id);
  }
  const info = db.prepare(`INSERT INTO schematics (slug, title, category, description, data, sort_order, published,
    created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`).run(slug, title, category, description, JSON.stringify(data), order, published, now, now);
  return Number(info.lastInsertRowid);
}

export function deleteSchematic(id) {
  db.prepare('DELETE FROM schematics WHERE id = ?').run(Number(id));
}
