// Zkopíruje poznámky z Obsidian vaultu do content/ (výchozí obsah repozitáře).
// Použití: node scripts/import-obsidian.js /cesta/k/vaultu [Složka1 Složka2 …]
import { join } from 'node:path';
import { copyFromVault } from '../src/importer.js';
import { config } from '../src/config.js';

const [vault, ...folders] = process.argv.slice(2);
if (!vault) {
  console.error('Použití: node scripts/import-obsidian.js /cesta/k/vaultu ["Odborný výcvik" …]');
  process.exit(1);
}
const list = folders.length ? folders : ['Odborný výcvik'];
const r = copyFromVault(vault, list, join(config.contentDir, 'notes'), join(config.contentDir, 'assets'));
console.log(`Zkopírováno ${r.notes} poznámek a ${r.assets} příloh do content/ (${list.join(', ')}).`);
console.log('Do databáze se načtou při prvním spuštění, nebo v administraci → Import → „Načíst content/“.');
