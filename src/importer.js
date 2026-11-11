// Import poznámek z Obsidianu (nebo ze složky content/) do databáze.
import { readdirSync, readFileSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, relative, basename, extname, dirname } from 'node:path';
import { db, tx } from './db.js';
import { parseFrontmatter, stripObsidianNav } from './markdown.js';
import { saveArticle, setParent, resolveTitle } from './articles.js';
import { saveSchematic } from './schematics.js';
import { KINDS } from './subjects.js';

function walk(dir, ext) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, ext));
    else if (extname(name).toLowerCase() === ext) out.push(p);
  }
  return out;
}

/**
 * Naimportuje všechny .md soubory ze složky. Vrací souhrn.
 * @param {string} dir – kořen (např. content/notes nebo Obsidian vault)
 * @param {{overwrite?: boolean, folders?: string[]}} opts
 */
export function importNotes(dir, { overwrite = false, folders = null } = {}) {
  const files = walk(dir, '.md').filter((f) => {
    const top = relative(dir, f).split(/[\\/]/)[0];
    return !folders || folders.includes(top);
  });
  const result = { created: 0, updated: 0, skipped: 0, parents: 0 };
  const pending = [];
  const byTitle = db.prepare('SELECT id FROM articles WHERE title = ? COLLATE NOCASE');

  tx(() => {
    for (const file of files) {
      const raw = readFileSync(file, 'utf8');
      const { data, body } = parseFrontmatter(raw);
      const title = basename(file, '.md');
      const rel = relative(dir, file);
      const existing = byTitle.get(title);
      if (existing && !overwrite) { result.skipped++; continue; }
      const kind = KINDS.includes(data['typ']) ? data['typ'] : 'podtéma';
      const subject = data['předmět'] || rel.split(/[\\/]/)[0];
      const tags = Array.isArray(data.tags) ? data.tags : [];
      const id = saveArticle({
        id: existing?.id,
        title,
        kind,
        subject,
        sort_order: Number(data['pořadí']) || 0,
        body_md: stripObsidianNav(body),
        tags,
        published: data.publikovat === false || data.publikovat === 'false' ? 0 : 1,
        source_path: rel,
      });
      existing ? result.updated++ : result.created++;
      const parent = String(data['nadřazené'] || '').replace(/^\[\[|\]\]$/g, '').split('|')[0].trim();
      pending.push({ id, parent });
    }
  });

  for (const { id, parent } of pending) {
    if (!parent) continue;
    const row = byTitle.get(parent);
    if (row && row.id !== id) { setParent(id, row.id); result.parents++; }
  }
  return result;
}

export function importSchematics(dir, { overwrite = false } = {}) {
  const result = { created: 0, updated: 0, skipped: 0 };
  for (const file of walk(dir, '.json')) {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const slug = data.slug || basename(file, '.json');
    const existing = db.prepare('SELECT id FROM schematics WHERE slug = ?').get(slug);
    if (existing && !overwrite) { result.skipped++; continue; }
    saveSchematic({
      id: existing?.id,
      slug,
      title: data.title,
      category: data.category,
      description: data.description,
      sort_order: data.order ?? 0,
      data,
    });
    existing ? result.updated++ : result.created++;
  }
  return result;
}

/**
 * Zkopíruje vybrané složky z Obsidian vaultu do content/notes a obrázky, na které
 * poznámky odkazují (![[soubor.svg]]), do content/assets.
 */
export function copyFromVault(vault, folders, notesDir, assetsDir) {
  const attachments = new Map();
  for (const f of walk(vault, '.svg').concat(walk(vault, '.png'), walk(vault, '.jpg'), walk(vault, '.webp'))) {
    attachments.set(basename(f), f);
  }
  let notes = 0;
  let assets = 0;
  for (const folder of folders) {
    for (const file of walk(join(vault, folder), '.md')) {
      const dest = join(notesDir, relative(vault, file));
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(file, dest);
      notes++;
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/!\[\[([^\]|#]+)/g)) {
        const src = attachments.get(m[1].trim());
        if (src) {
          mkdirSync(assetsDir, { recursive: true });
          copyFileSync(src, join(assetsDir, basename(src)));
          assets++;
        }
      }
    }
  }
  return { notes, assets };
}

export { resolveTitle };
