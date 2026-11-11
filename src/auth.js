import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { config } from './config.js';

const COOKIE = 'eh_session';

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [algo, saltB64, hashB64] = String(stored).split('$');
  if (algo !== 'scrypt') return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expected, actual);
}

export function userCount() {
  return db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

export function createUser({ username, displayName, password, role = 'editor' }) {
  const info = db.prepare(
    'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(username.trim(), (displayName || username).trim(), hashPassword(password), role, Date.now());
  return Number(info.lastInsertRowid);
}

export function findUserByLogin(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
  if (!user) {
    // Srovnatelná doba odezvy i pro neexistujícího uživatele.
    verifyPassword(password || 'x', 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==');
    return null;
  }
  return verifyPassword(String(password || ''), user.password_hash) ? user : null;
}

export function startSession(res, userId) {
  const id = randomBytes(32).toString('base64url');
  const csrf = randomBytes(24).toString('base64url');
  const now = Date.now();
  const expires = now + config.sessionDays * 864e5;
  db.prepare('INSERT INTO sessions (id, user_id, csrf, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, userId, csrf, now, expires);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now, userId);
  res.cookie(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureCookies,
    expires: new Date(expires),
    path: '/',
  });
}

export function endSession(req, res) {
  const id = readCookie(req, COOKIE);
  if (id) db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  res.clearCookie(COOKIE, { path: '/' });
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

// Načte přihlášeného uživatele (pokud existuje) do req.user.
export function loadUser(req, _res, next) {
  const id = readCookie(req, COOKIE);
  req.user = null;
  if (id) {
    const row = db.prepare(`
      SELECT s.csrf, s.expires_at, u.id, u.username, u.display_name, u.role
      FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`).get(id);
    if (row && row.expires_at > Date.now()) {
      req.user = { id: row.id, username: row.username, displayName: row.display_name, role: row.role };
      req.csrf = row.csrf;
    } else if (row) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    }
  }
  next();
}

export function requireUser(req, res, next) {
  if (req.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Nepřihlášen' });
  res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
}

export function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  res.status(403).send('Tato akce vyžaduje roli administrátora.');
}

// Ochrana proti CSRF: token ze session musí přijít ve formuláři nebo v hlavičce.
export function checkCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.get('x-csrf-token') || req.body?._csrf;
  if (req.csrf && token && token.length === req.csrf.length
    && timingSafeEqual(Buffer.from(token), Buffer.from(req.csrf))) return next();
  res.status(403).send('Neplatný bezpečnostní token formuláře. Obnov stránku a zkus to znovu.');
}

// Jednoduché omezení pokusů o přihlášení (v paměti).
const attempts = new Map();
export function loginRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, reset: now + 15 * 60e3 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 15 * 60e3; }
  if (entry.count >= 10) {
    return res.status(429).send('Příliš mnoho pokusů o přihlášení. Zkus to za 15 minut.');
  }
  entry.count++;
  attempts.set(key, entry);
  next();
}
export function clearLoginAttempts(req) {
  attempts.delete(req.ip);
}

export function purgeExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}
