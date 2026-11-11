import { Router } from 'express';
import { db } from '../db.js';
import { layout } from '../views/layout.js';
import {
  homePage, kbIndexPage, articlePage, searchPage, quizPage, schematicsListPage, schematicPage, notFoundPage,
} from '../views/pages.js';
import { simulatorPage } from '../views/simulator.js';
import { calculatorsPage } from '../views/calculators.js';
import {
  getTree, getArticleBySlug, renderArticle, getContext, search, allQuestions, renderMarkdown, renderInline,
} from '../articles.js';
import { listSchematics, getSchematic } from '../schematics.js';
import { recordPageview, recordEvent, articleViews } from '../stats.js';
import { subjectMeta, SUBJECTS } from '../subjects.js';

export const publicRouter = Router();

function page(req, res, opts, status = 200) {
  res.status(status).type('html').send(layout({ ...opts, path: req.path, user: req.user }));
}

function counts() {
  return db.prepare(`SELECT
    (SELECT COUNT(*) FROM articles WHERE published = 1) AS articles,
    (SELECT COUNT(*) FROM questions q JOIN articles a ON a.id = q.article_id WHERE a.published = 1) AS questions,
    (SELECT COUNT(*) FROM schematics WHERE published = 1) AS schematics`).get();
}

publicRouter.get('/', (req, res) => {
  recordPageview(req);
  const recent = db.prepare(`SELECT slug, title, subject, updated_at FROM articles WHERE published = 1
    AND kind != 'předmět' ORDER BY updated_at DESC LIMIT 6`).all();
  page(req, res, {
    body: homePage({ tree: getTree(), counts: counts(), recent, schematics: listSchematics() }),
    bodyClass: 'home',
  });
});

publicRouter.get('/kb', (req, res) => {
  recordPageview(req);
  page(req, res, { title: 'Znalostní báze', body: kbIndexPage({ tree: getTree() }) });
});

publicRouter.get('/kb/:slug', (req, res, next) => {
  const article = getArticleBySlug(req.params.slug, { includeDrafts: !!req.user });
  if (!article) return next();
  recordPageview(req, { articleId: article.id });
  const rendered = renderArticle(article);
  const qn = db.prepare('SELECT COUNT(*) AS n FROM questions WHERE article_id = ?').get(article.id).n;
  let tags = [];
  try { tags = JSON.parse(article.tags); } catch { /* prázdné */ }
  page(req, res, {
    title: article.title,
    description: article.summary || undefined,
    katex: true,
    mermaid: rendered.html.includes('class="mermaid"'),
    subjectKey: subjectMeta(article.subject).key,
    body: articlePage({
      article, rendered, ctx: getContext(article), views: articleViews(article.id), questionCount: qn, tags, user: req.user,
    }),
  });
});

publicRouter.get('/hledat', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  const results = q ? search(q) : [];
  recordPageview(req);
  if (q) recordEvent(req, 'search', q, results.length);
  page(req, res, { title: q ? `Hledání: ${q}` : 'Hledání', query: q, body: searchPage({ q, results }) });
});

publicRouter.get('/simulator', (req, res) => {
  recordPageview(req);
  page(req, res, {
    title: 'Simulátor 3f motoru s jištěním',
    description: 'Interaktivní simulace třífázového asynchronního motoru: rozběh, přetížení, výpadek fáze, zkrat a vypínací charakteristiky jističe, motorového spouštěče a pojistek.',
    body: simulatorPage(),
    scripts: ['/js/sim/simulator.js'],
    bodyClass: 'wide',
  });
});

publicRouter.get('/schemata', (req, res) => {
  recordPageview(req);
  page(req, res, {
    title: 'Schémata zapojení',
    body: schematicsListPage({ items: listSchematics() }),
    scripts: ['/js/schematics/thumbs.js'],
  });
});

publicRouter.get('/schemata/:slug', (req, res, next) => {
  const schematic = getSchematic(req.params.slug, { includeDrafts: !!req.user });
  if (!schematic) return next();
  recordPageview(req);
  page(req, res, {
    title: schematic.title,
    description: schematic.description,
    body: schematicPage({ schematic, descriptionHtml: renderMarkdown(schematic.data.explain || schematic.description).html }),
    scripts: ['/js/schematics/page.js'],
    katex: true,
    bodyClass: 'wide',
  });
});

publicRouter.get('/procvicovani', (req, res) => {
  recordPageview(req);
  const current = SUBJECTS.find((s) => s.name === req.query.predmet)?.name || '';
  const articleSlug = String(req.query.clanek || '');
  const article = articleSlug ? getArticleBySlug(articleSlug) : null;
  const count = article
    ? db.prepare('SELECT COUNT(*) AS n FROM questions WHERE article_id = ?').get(article.id).n
    : allQuestions(current || undefined).length;
  page(req, res, {
    title: 'Procvičování',
    katex: true,
    body: quizPage({ subjects: SUBJECTS, current, articleSlug: article?.slug, articleTitle: article?.title, count }),
    scripts: ['/js/quiz.js'],
  });
});

publicRouter.get('/kalkulacky', (req, res) => {
  recordPageview(req);
  page(req, res, { title: 'Výpočty', body: calculatorsPage(), scripts: ['/js/calc.js'] });
});

// --- JSON API pro klientské skripty --------------------------------------------------
publicRouter.get('/api/questions', (req, res) => {
  let rows;
  if (req.query.clanek) {
    rows = db.prepare(`SELECT q.id, q.question, q.answer_md, a.title AS article_title, a.slug, a.subject
      FROM questions q JOIN articles a ON a.id = q.article_id WHERE a.slug = ? AND a.published = 1`).all(String(req.query.clanek));
  } else {
    rows = allQuestions(req.query.predmet || undefined);
  }
  res.json(rows.map((r) => ({
    id: r.id,
    q: renderInline(r.question),
    a: renderMarkdown(r.answer_md).html,
    from: r.article_title,
    slug: r.slug,
    subject: subjectMeta(r.subject).key,
  })));
});

publicRouter.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  res.json(q.length < 2 ? [] : search(q, 8).map((r) => ({ slug: r.slug, title: r.title, subject: r.subject })));
});

publicRouter.get('/api/schematics', (req, res) => {
  res.json(listSchematics().map((s) => ({ slug: s.slug, data: getSchematic(s.slug).data })));
});

publicRouter.post('/api/event', (req, res) => {
  const { type, label, value } = req.body || {};
  recordEvent(req, String(type || ''), label, value);
  res.status(204).end();
});

export function notFound(req, res) {
  page(req, res, { title: 'Stránka nenalezena', body: notFoundPage() }, 404);
}
