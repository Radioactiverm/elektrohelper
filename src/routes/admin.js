import { Router } from 'express';
import express from 'express';
import { readdirSync, statSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { db } from '../db.js';
import { config } from '../config.js';
import { layout } from '../views/layout.js';
import {
  adminShell, loginPage, dashboardPage, articlesListPage, articleEditorPage, schematicsAdminPage,
  schematicEditorPage, assetsPage, usersPage, importPage,
} from '../views/admin.js';
import {
  requireUser, requireAdmin, checkCsrf, findUserByLogin, startSession, endSession, userCount, createUser,
  loginRateLimit, clearLoginAttempts, verifyPassword, hashPassword,
} from '../auth.js';
import {
  listArticles, getArticle, saveArticle, deleteArticle, renderMarkdown,
} from '../articles.js';
import {
  listSchematics, getSchematicById, saveSchematic, deleteSchematic,
} from '../schematics.js';
import { importNotes, importSchematics } from '../importer.js';
import { dashboardStats } from '../stats.js';

export const adminRouter = Router();

function adminPage(req, res, title, body, opts = {}) {
  res.type('html').send(layout({
    title: `${title} – správa`,
    path: req.originalUrl.split('?')[0],
    user: req.user,
    bodyClass: 'admin-page wide',
    scripts: ['/js/admin/admin.js', ...(opts.scripts || [])],
    katex: opts.katex,
    mermaid: opts.mermaid,
    body: adminShell({ path: req.originalUrl.split('?')[0], user: req.user, csrf: req.csrf, title, body }),
  }));
}

function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}

// --- Přihlášení a první spuštění ------------------------------------------------------
adminRouter.get('/login', (req, res) => {
  if (!userCount()) return res.redirect('/admin/setup');
  if (req.user) return res.redirect('/admin');
  res.type('html').send(layout({ title: 'Přihlášení', path: req.path, body: loginPage({ next: req.query.next }) }));
});

adminRouter.post('/login', loginRateLimit, (req, res) => {
  const user = findUserByLogin(req.body.username, req.body.password);
  if (!user) {
    return res.status(401).type('html').send(layout({
      title: 'Přihlášení', path: req.path,
      body: loginPage({ error: 'Nesprávné jméno nebo heslo.', next: req.body.next }),
    }));
  }
  clearLoginAttempts(req);
  startSession(res, user.id);
  res.redirect(safeNext(req.body.next));
});

adminRouter.get('/setup', (req, res) => {
  if (userCount()) return res.redirect('/admin/login');
  res.type('html').send(layout({ title: 'Vytvořit správce', path: req.path, body: loginPage({ setup: true }) }));
});

adminRouter.post('/setup', loginRateLimit, (req, res) => {
  if (userCount()) return res.redirect('/admin/login');
  const { username, password, displayName } = req.body;
  if (!username || String(username).length < 3 || !password || String(password).length < 10) {
    return res.status(400).type('html').send(layout({
      title: 'Vytvořit správce', path: req.path,
      body: loginPage({ setup: true, error: 'Jméno musí mít aspoň 3 znaky a heslo aspoň 10 znaků.' }),
    }));
  }
  const id = createUser({ username, password, displayName, role: 'admin' });
  startSession(res, id);
  res.redirect('/admin');
});

adminRouter.use(requireUser);
adminRouter.use(checkCsrf);

adminRouter.post('/logout', (req, res) => {
  endSession(req, res);
  res.redirect('/');
});

// --- Přehled se statistikami --------------------------------------------------------------
adminRouter.get('/', (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.dni)) ? Number(req.query.dni) : 30;
  const counts = db.prepare(`SELECT
    (SELECT COUNT(*) FROM articles WHERE published = 1) AS articles,
    (SELECT COUNT(*) FROM articles WHERE published = 0) AS drafts,
    (SELECT COUNT(*) FROM questions) AS questions,
    (SELECT COUNT(*) FROM schematics) AS schematics`).get();
  adminPage(req, res, 'Přehled a statistiky', dashboardPage({ s: dashboardStats(days), counts }));
});

// --- Články ------------------------------------------------------------------------------------
adminRouter.get('/clanky', (req, res) => {
  const subject = String(req.query.predmet || '');
  const q = String(req.query.q || '');
  adminPage(req, res, 'Články', articlesListPage({ items: listArticles({ subject, q }), subject, q }));
});

function parentOptions() {
  return db.prepare(`SELECT id, title, subject FROM articles WHERE kind IN ('předmět','téma','podtéma')
    ORDER BY subject, title`).all();
}

adminRouter.get('/clanky/novy', (req, res) => {
  adminPage(req, res, 'Nový článek', articleEditorPage({ parents: parentOptions(), csrf: req.csrf }),
    { scripts: ['/js/admin/editor.js'], katex: true, mermaid: true });
});

adminRouter.post('/clanky/novy', (req, res) => {
  const id = saveArticle({ ...req.body, published: req.body.published ? 1 : 0 }, req.user.id);
  res.redirect(`/admin/clanky/${id}?ulozeno=1`);
});

adminRouter.get('/clanky/:id', (req, res, next) => {
  const article = getArticle(Number(req.params.id));
  if (!article) return next();
  adminPage(req, res, req.query.ulozeno ? `${article.title} ✓ uloženo` : article.title,
    articleEditorPage({ article, parents: parentOptions(), csrf: req.csrf }),
    { scripts: ['/js/admin/editor.js'], katex: true, mermaid: true });
});

adminRouter.post('/clanky/:id', (req, res, next) => {
  const article = getArticle(Number(req.params.id));
  if (!article) return next();
  saveArticle({ ...req.body, id: article.id, published: req.body.published ? 1 : 0 }, req.user.id);
  res.redirect(`/admin/clanky/${article.id}?ulozeno=1`);
});

adminRouter.post('/clanky/:id/smazat', (req, res) => {
  deleteArticle(Number(req.params.id));
  res.redirect('/admin/clanky');
});

adminRouter.post('/api/preview', (req, res) => {
  const { html } = renderMarkdown(String(req.body.md || ''));
  res.json({ html });
});

// --- Schémata -----------------------------------------------------------------------------------
adminRouter.get('/schemata', (req, res) => {
  adminPage(req, res, 'Schémata', schematicsAdminPage({ items: listSchematics({ includeDrafts: true }) }));
});

adminRouter.get('/schemata/nove', (req, res) => {
  adminPage(req, res, 'Nové schéma', schematicEditorPage({ csrf: req.csrf }), { scripts: ['/js/admin/schematic-editor.js'] });
});

function handleSchematicSave(req, res, id) {
  try {
    const newId = saveSchematic({ ...req.body, id, published: req.body.published ? 1 : 0 });
    res.redirect(`/admin/schemata/${newId}`);
  } catch (err) {
    const schematic = id ? getSchematicById(id) : null;
    adminPage(req, res, 'Chyba při ukládání', schematicEditorPage({ schematic, csrf: req.csrf, error: err.message }),
      { scripts: ['/js/admin/schematic-editor.js'] });
  }
}

adminRouter.post('/schemata/nove', (req, res) => handleSchematicSave(req, res, null));

adminRouter.get('/schemata/:id', (req, res, next) => {
  const schematic = getSchematicById(Number(req.params.id));
  if (!schematic) return next();
  adminPage(req, res, schematic.title, schematicEditorPage({ schematic, csrf: req.csrf }), { scripts: ['/js/admin/schematic-editor.js'] });
});

adminRouter.post('/schemata/:id', (req, res) => handleSchematicSave(req, res, Number(req.params.id)));

adminRouter.post('/schemata/:id/smazat', (req, res) => {
  deleteSchematic(Number(req.params.id));
  res.redirect('/admin/schemata');
});

// --- Soubory (obrázky do článků) -----------------------------------------------------------------
const ALLOWED = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf']);

function listFiles() {
  const out = [];
  for (const [dir, source] of [[config.uploadsDir, 'upload'], [join(config.contentDir, 'assets'), 'content']]) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!ALLOWED.has(extname(name).toLowerCase()) || out.some((f) => f.name === name)) continue;
      const st = statSync(join(dir, name));
      out.push({ name, size: st.size, mtime: st.mtimeMs, source });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

adminRouter.get('/soubory', (req, res) => {
  adminPage(req, res, 'Soubory', assetsPage({ files: listFiles(), csrf: req.csrf }), { scripts: ['/js/admin/upload.js'] });
});

adminRouter.post('/api/upload', express.raw({ type: '*/*', limit: '5mb' }), (req, res) => {
  const raw = String(req.get('x-filename') || '');
  let name;
  try { name = decodeURIComponent(raw); } catch { name = raw; }
  name = basename(name).normalize('NFC').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+/, '');
  const ext = extname(name).toLowerCase();
  if (!name || !ALLOWED.has(ext)) return res.status(400).json({ error: 'Nepovolený typ souboru.' });
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Prázdný soubor.' });
  mkdirSync(config.uploadsDir, { recursive: true });
  writeFileSync(join(config.uploadsDir, name), req.body);
  res.json({ name, embed: `![[${name}]]` });
});

adminRouter.post('/soubory/smazat', (req, res) => {
  const name = basename(String(req.body.name || ''));
  const p = join(config.uploadsDir, name);
  if (name && existsSync(p)) unlinkSync(p);
  res.redirect('/admin/soubory');
});

// --- Uživatelé ---------------------------------------------------------------------------------------
function users() {
  return db.prepare('SELECT id, username, display_name, role, created_at, last_login FROM users ORDER BY created_at').all();
}

adminRouter.get('/uzivatele', requireAdmin, (req, res) => {
  adminPage(req, res, 'Uživatelé', usersPage({ users: users(), csrf: req.csrf, me: req.user, message: req.query.ok }));
});

adminRouter.post('/uzivatele', requireAdmin, (req, res) => {
  const { username, password, displayName, role } = req.body;
  let error;
  if (!username || String(username).length < 3) error = 'Uživatelské jméno musí mít aspoň 3 znaky.';
  else if (!password || String(password).length < 10) error = 'Heslo musí mít aspoň 10 znaků.';
  else if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) error = 'Takový uživatel už existuje.';
  if (error) return adminPage(req, res, 'Uživatelé', usersPage({ users: users(), csrf: req.csrf, me: req.user, error }));
  createUser({ username, password, displayName, role: role === 'admin' ? 'admin' : 'editor' });
  res.redirect(`/admin/uzivatele?ok=${encodeURIComponent(`Uživatel ${username} přidán.`)}`);
});

adminRouter.post('/uzivatele/:id/smazat', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id !== req.user.id) db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.redirect('/admin/uzivatele');
});

adminRouter.post('/heslo', (req, res) => {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const { current, password } = req.body;
  const isAdmin = req.user.role === 'admin';
  const render = (opts) => isAdmin
    ? adminPage(req, res, 'Uživatelé', usersPage({ users: users(), csrf: req.csrf, me: req.user, ...opts }))
    : res.redirect('/admin');
  if (!verifyPassword(String(current || ''), row.password_hash)) return render({ error: 'Současné heslo nesouhlasí.' });
  if (!password || String(password).length < 10) return render({ error: 'Nové heslo musí mít aspoň 10 znaků.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), req.user.id);
  render({ message: 'Heslo změněno.' });
});

// --- Import --------------------------------------------------------------------------------------------
function vaultFolders() {
  if (!config.obsidianVault || !existsSync(config.obsidianVault)) return [];
  return readdirSync(config.obsidianVault)
    .filter((n) => !n.startsWith('.') && statSync(join(config.obsidianVault, n)).isDirectory());
}

adminRouter.get('/import', requireAdmin, (req, res) => {
  adminPage(req, res, 'Import obsahu', importPage({
    csrf: req.csrf, vault: config.obsidianVault, folders: vaultFolders(), result: req.query.ok,
  }));
});

adminRouter.post('/import', requireAdmin, (req, res) => {
  const overwrite = !!req.body.overwrite;
  let msg;
  if (req.body.source === 'vault' && config.obsidianVault) {
    const folders = [].concat(req.body.folders || []);
    const r = importNotes(config.obsidianVault, { overwrite, folders });
    msg = `Vault: ${r.created} nových, ${r.updated} aktualizovaných, ${r.skipped} přeskočeno.`;
  } else {
    const r = importNotes(join(config.contentDir, 'notes'), { overwrite });
    const s = importSchematics(join(config.contentDir, 'schematics'), { overwrite });
    msg = `Články: ${r.created} nových, ${r.updated} aktualizovaných, ${r.skipped} přeskočeno. Schémata: ${s.created} nových, ${s.updated} aktualizovaných.`;
  }
  res.redirect(`/admin/import?ok=${encodeURIComponent(msg)}`);
});
