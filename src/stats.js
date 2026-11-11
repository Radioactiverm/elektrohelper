// Statistiky návštěvnosti bez cookies: návštěvník = hash(IP + prohlížeč + denní sůl).
import { createHash, randomBytes } from 'node:crypto';
import { db, getSetting, setSetting } from './db.js';

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|curl|wget|python-requests|httpclient|monitor/i;

let salt = { day: null, value: null };
function dailySalt(day) {
  if (salt.day !== day) {
    const secret = getSetting('stats_secret') || (() => {
      const s = randomBytes(32).toString('hex');
      setSetting('stats_secret', s);
      return s;
    })();
    salt = { day, value: createHash('sha256').update(secret + day).digest('hex') };
  }
  return salt.value;
}

export function today(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function visitorId(req) {
  const day = today();
  return createHash('sha256')
    .update(dailySalt(day) + (req.ip || '') + (req.get('user-agent') || ''))
    .digest('base64url').slice(0, 16);
}

function device(ua) {
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobi|android|iphone/i.test(ua)) return 'mobil';
  return 'počítač';
}

function sectionOf(path) {
  if (path === '/') return 'domů';
  const first = path.split('/')[1];
  return {
    kb: 'znalosti', hledat: 'hledání', simulator: 'simulátor', schemata: 'schémata',
    procvicovani: 'procvičování', kalkulacky: 'kalkulačky',
  }[first] || first;
}

export function isBot(req) {
  const ua = req.get('user-agent') || '';
  return !ua || BOT_RE.test(ua) || req.get('purpose') === 'prefetch' || req.get('sec-purpose')?.includes('prefetch');
}

export function recordPageview(req, { articleId = null } = {}) {
  if (isBot(req) || req.user) return;
  const ua = req.get('user-agent') || '';
  let ref = null;
  try {
    const r = req.get('referer');
    if (r) {
      const u = new URL(r);
      if (u.host !== req.get('host')) ref = u.host.replace(/^www\./, '');
    }
  } catch { /* neplatný referer */ }
  const ts = Date.now();
  db.prepare(`INSERT INTO pageviews (ts, day, path, section, article_id, visitor, referrer, device)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(ts, today(ts), req.path.slice(0, 200), sectionOf(req.path), articleId, visitorId(req), ref, device(ua));
}

const EVENT_TYPES = new Set([
  'sim_start', 'sim_trip', 'sim_fault', 'schematic_action', 'schematic_short',
  'quiz_answer', 'search', 'calc_use',
]);

export function recordEvent(req, type, label = null, value = null) {
  if (!EVENT_TYPES.has(type) || isBot(req) || req.user) return false;
  const ts = Date.now();
  db.prepare('INSERT INTO events (ts, day, type, label, value, visitor) VALUES (?, ?, ?, ?, ?, ?)')
    .run(ts, today(ts), type, label ? String(label).slice(0, 120) : null,
      Number.isFinite(Number(value)) ? Number(value) : null, visitorId(req));
  return true;
}

// --- Agregace pro administraci -------------------------------------------------
function daysBack(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(today(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).getTime()));
  return out;
}

export function dashboardStats(range = 30) {
  const days = daysBack(range);
  const from = days[0];
  const prevFrom = daysBack(range * 2)[0];
  const q = (sql, ...a) => db.prepare(sql).all(...a);
  const one = (sql, ...a) => db.prepare(sql).get(...a);

  const perDay = new Map(q(`SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
    FROM pageviews WHERE day >= ? GROUP BY day`, from).map((r) => [r.day, r]));
  const series = days.map((d) => ({ day: d, views: perDay.get(d)?.views || 0, visitors: perDay.get(d)?.visitors || 0 }));

  const totals = one(`SELECT COUNT(*) AS views, COUNT(DISTINCT visitor || day) AS visitors FROM pageviews WHERE day >= ?`, from);
  const prev = one(`SELECT COUNT(*) AS views, COUNT(DISTINCT visitor || day) AS visitors FROM pageviews WHERE day >= ? AND day < ?`, prevFrom, from);
  const t = today();
  const todayRow = one('SELECT COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM pageviews WHERE day = ?', t);

  const eventCounts = Object.fromEntries(q(`SELECT type, COUNT(*) AS n FROM events WHERE day >= ? GROUP BY type`, from)
    .map((r) => [r.type, r.n]));

  return {
    days: range,
    series,
    totals,
    prev,
    today: todayRow,
    events: eventCounts,
    topArticles: q(`SELECT a.title, a.slug, a.subject, COUNT(*) AS views, COUNT(DISTINCT v.visitor) AS visitors
      FROM pageviews v JOIN articles a ON a.id = v.article_id WHERE v.day >= ?
      GROUP BY v.article_id ORDER BY views DESC LIMIT 10`, from),
    sections: q(`SELECT section, COUNT(*) AS views FROM pageviews WHERE day >= ? GROUP BY section ORDER BY views DESC`, from),
    subjects: q(`SELECT a.subject, COUNT(*) AS views FROM pageviews v JOIN articles a ON a.id = v.article_id
      WHERE v.day >= ? GROUP BY a.subject ORDER BY views DESC`, from),
    devices: q(`SELECT device, COUNT(DISTINCT visitor || day) AS visitors FROM pageviews WHERE day >= ? GROUP BY device ORDER BY visitors DESC`, from),
    referrers: q(`SELECT referrer, COUNT(*) AS views FROM pageviews WHERE day >= ? AND referrer IS NOT NULL
      GROUP BY referrer ORDER BY views DESC LIMIT 8`, from),
    searches: q(`SELECT lower(label) AS term, COUNT(*) AS n, MIN(value) AS results FROM events
      WHERE type = 'search' AND day >= ? GROUP BY lower(label) ORDER BY n DESC LIMIT 10`, from),
    zeroSearches: q(`SELECT lower(label) AS term, COUNT(*) AS n FROM events
      WHERE type = 'search' AND day >= ? AND value = 0 GROUP BY lower(label) ORDER BY n DESC LIMIT 8`, from),
    trips: q(`SELECT label, COUNT(*) AS n FROM events WHERE type = 'sim_trip' AND day >= ?
      GROUP BY label ORDER BY n DESC LIMIT 8`, from),
    schematics: q(`SELECT label, COUNT(*) AS n FROM events WHERE type IN ('schematic_action') AND day >= ?
      GROUP BY label ORDER BY n DESC LIMIT 8`, from),
    quiz: one(`SELECT COUNT(*) AS answers, SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) AS known
      FROM events WHERE type = 'quiz_answer' AND day >= ?`, from),
    hours: q(`SELECT CAST(strftime('%H', ts / 1000, 'unixepoch', 'localtime') AS INTEGER) AS h, COUNT(*) AS n
      FROM pageviews WHERE day >= ? GROUP BY h`, from),
  };
}

export function publicCounters() {
  return db.prepare(`SELECT
    (SELECT COUNT(*) FROM pageviews) AS views,
    (SELECT COUNT(DISTINCT visitor || day) FROM pageviews) AS visitors,
    (SELECT COUNT(*) FROM events WHERE type = 'sim_start') AS simRuns`).get();
}

export function articleViews(articleId) {
  return db.prepare('SELECT COUNT(*) AS n FROM pageviews WHERE article_id = ?').get(articleId).n;
}
