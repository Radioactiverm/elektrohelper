import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export const config = {
  root,
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  dbPath: process.env.DB_PATH || join(root, 'data', 'elektrohelper.db'),
  uploadsDir: process.env.UPLOADS_DIR || join(root, 'data', 'uploads'),
  contentDir: join(root, 'content'),
  publicDir: join(root, 'public'),
  // Cesta k Obsidian vaultu pro import z administrace (volitelné).
  obsidianVault: process.env.OBSIDIAN_VAULT || '',
  siteName: process.env.SITE_NAME || 'ElektroHelper',
  // Za reverzní proxy nastav TRUST_PROXY: počet proxy (1) nebo „loopback“ pro cloudflared/nginx na stejném stroji.
  trustProxy: /^\d+$/.test(process.env.TRUST_PROXY || '') ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY || '',
  secureCookies: process.env.SECURE_COOKIES === '1',
  sessionDays: 14,
};
