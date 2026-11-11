import express from 'express';
import { join, extname, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import { loadUser, purgeExpiredSessions } from './auth.js';
import { publicRouter, notFound } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { layout } from './views/layout.js';
import { errorPage } from './views/pages.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join('; '),
    });
    next();
  });

  const staticOpts = { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0 };
  app.use(express.static(config.publicDir, staticOpts));
  app.use('/vendor/katex', express.static(join(config.root, 'node_modules/katex/dist'), { maxAge: '30d' }));
  app.use('/vendor/mermaid', express.static(join(config.root, 'node_modules/mermaid/dist'), { maxAge: '30d' }));

  // Přílohy: nejdřív nahrané soubory, pak obsah z repozitáře. SVG bez možnosti spouštět skripty.
  app.get('/assets/:name', (req, res, next) => {
    const name = basename(req.params.name);
    for (const dir of [config.uploadsDir, join(config.contentDir, 'assets')]) {
      const p = join(dir, name);
      if (existsSync(p)) {
        if (extname(name).toLowerCase() === '.svg') {
          res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:");
        }
        return res.sendFile(p, { maxAge: '1d' });
      }
    }
    next();
  });

  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(loadUser);

  app.use('/admin', adminRouter);
  app.use(publicRouter);
  app.use(notFound);

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error(err);
    const status = err.status || err.statusCode || 500;
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin/api/')) {
      return res.status(status).json({ error: status === 500 ? 'Chyba serveru' : err.message });
    }
    res.status(status).type('html').send(layout({
      title: 'Chyba', path: req.path, user: req.user,
      body: errorPage(status === 500 ? 'Na serveru nastala chyba. Zkus to prosím znovu.' : err.message),
    }));
  });

  setInterval(purgeExpiredSessions, 6 * 3600e3).unref();
  return app;
}
