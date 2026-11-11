# ⚡ ElektroHelper

Studijní repozitář pro **odborný výcvik elektrikářů – silnoproud**. Poznámky z odborného výcviku, interaktivní schémata stykačového ovládání a simulace třífázového asynchronního motoru s nadproudovými ochranami. Vše v češtině, v designu Material 3 s barvami vodičů (hnědá L1, černá L2, šedá L3, modrá N, zelenožlutá PE).

## Co umí

- **Znalostní báze** – odborný výcvik: asynchronní motor a jeho ochrana, stykačové ovládání (samodržení, reverzace, hvězda–trojúhelník), domovní instalace a řazení vypínačů. Markdown s wikiodkazy `[[...]]`, callouty z Obsidianu, vzorci (KaTeX) a diagramy (Mermaid). Fulltextové hledání s ignorováním diakritiky.
- **Procvičování** – kartičky a kvíz z otázek „🧠 Otestuj se“ ve všech článcích.
- **Simulátor 3F motoru** – živé ovládání, měřené hodnoty a grafy na jedné obrazovce, nastavení pod nimi. Náhradní schéma asynchronního motoru dopočítané ze štítku, rozběh přímo / Y–Δ / softstartér / měnič, zátěž, výpadek fáze, zablokovaný rotor, zkrat. Ochrana jističem, motorovým spouštěčem nebo pojistkami s tepelným relé a grafy proudu, otáček, momentu a vypínací charakteristiky t = f(I).
- **Interaktivní schémata** – impulsní chod, samodržení, ovládání ze dvou míst, reverzace (s blokováním i bez → zkrat), hvězda–trojúhelník s časovým relé, řazení vypínačů 1, 5, 6 a 7. Mačkáš tlačítka, vodiče se barví podle fáze, stykače přitahují, motor se točí.
- **Výpočty** – Ohmův zákon a výkon, třífázový výkon a proud motoru, úbytek napětí, odpor vodiče.
- **Administrace** – editor článků s živým náhledem, editor schémat (JSON s živým náhledem), nahrávání obrázků, správa uživatelů, import z Obsidianu.
- **Statistiky** – návštěvnost bez cookies (denně rotovaný hash), nejčtenější články, hledané výrazy, úspěšnost v kvízu, používání simulátoru a schémat.

## Spuštění

Potřebuješ **Node.js 22.13+** (používá vestavěné `node:sqlite`).

```bash
pnpm install
pnpm start
```

Web běží na <http://localhost:3000>. Při prvním spuštění se databáze naplní obsahem ze složky `content/`.

Správce vytvoříš na <http://localhost:3000/admin/setup> (funguje jen dokud žádný správce neexistuje), nebo předem přes proměnné `ADMIN_USER` a `ADMIN_PASSWORD`.

Vývoj s automatickým restartem: `pnpm dev`. Testy: `pnpm test`.

## Konfigurace

Viz [`.env.example`](.env.example). Nejdůležitější proměnné:

| Proměnná | Význam |
| --- | --- |
| `PORT` | port serveru (výchozí 3000) |
| `DB_PATH` | cesta k SQLite databázi (výchozí `data/elektrohelper.db`) |
| `UPLOADS_DIR` | nahrané soubory (výchozí `data/uploads`) |
| `OBSIDIAN_VAULT` | cesta k Obsidian vaultu pro import z administrace |
| `TRUST_PROXY=1`, `SECURE_COOKIES=1` | provoz za reverzní proxy s HTTPS |

## Obsah

```
content/
  notes/        Markdown poznámky (složka = předmět), frontmatter: typ, nadřazené, pořadí
  assets/       obrázky a SVG, v textu jako ![[soubor.svg]]
  schematics/   interaktivní schémata (JSON)
```

Poznámky z Obsidianu zkopíruješ do `content/` příkazem (bez názvů složek se kopíruje `Odborný výcvik`):

```bash
node scripts/import-obsidian.js ~/Obsidian "Odborný výcvik"
```

Pak je v administraci (**Import → Načíst content/**) nahraješ do databáze. Články upravené v administraci žijí v databázi; `content/` je výchozí obsah repozitáře.

### Formát schématu

Schéma je JSON s poli `devices` (přístroje a jejich stav), `components` (značky na souřadnicích) a `wires` (vodiče jako lomené čáry). Vodiče se spojují v koncových bodech a tam, kde konec vodiče leží na jiném vodiči. Typy značek: `src`, `fuse`, `no`, `nc`, `pb_no`, `pb_nc`, `olr_nc`, `olr_no`, `timer_no`, `timer_nc`, `coil`, `coil_timer`, `lamp`, `switch`, `q1p`, `co`, `cross`, `series5`, `q3`, `km3`, `fu3`, `olr3`, `motor3`, `motor6`. Přístroje: `breaker`, `fuse`, `button`, `switch`, `series`, `contactor`, `timer`, `olr`. Nejlíp se začíná úpravou některého z hotových schémat v administraci.

## Technologie

Node.js + Express 5, SQLite (`node:sqlite`, FTS5), marked, KaTeX, Mermaid. Žádný build krok – klient je čisté ES moduly. Barevné tokeny Material 3 generuje `scripts/gen-theme.js` (`@material/material-color-utilities`).

## Licence

MIT
