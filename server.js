import { join } from 'node:path';
import { config } from './src/config.js';
import { db } from './src/db.js';
import { createApp } from './src/app.js';
import { importNotes, importSchematics } from './src/importer.js';
import { userCount, createUser } from './src/auth.js';

// Při prvním spuštění naplníme databázi obsahem z repozitáře (content/).
if (!db.prepare('SELECT COUNT(*) AS n FROM articles').get().n) {
  const r = importNotes(join(config.contentDir, 'notes'));
  console.log(`Načteno ${r.created} článků z content/notes`);
}
if (!db.prepare('SELECT COUNT(*) AS n FROM schematics').get().n) {
  const r = importSchematics(join(config.contentDir, 'schematics'));
  console.log(`Načteno ${r.created} schémat z content/schematics`);
}

// Volitelně: správce z proměnných prostředí (užitečné pro nasazení bez prohlížeče).
if (!userCount() && process.env.ADMIN_USER && process.env.ADMIN_PASSWORD) {
  createUser({ username: process.env.ADMIN_USER, password: process.env.ADMIN_PASSWORD, role: 'admin' });
  console.log(`Vytvořen administrátor ${process.env.ADMIN_USER}`);
}

const app = createApp();
app.listen(config.port, config.host, () => {
  console.log(`⚡ ${config.siteName} běží na http://localhost:${config.port}`);
  if (!userCount()) console.log('   Žádný správce zatím neexistuje – vytvoř ho na http://localhost:' + config.port + '/admin/setup');
});
