// Náhledy schémat v seznamu – statické vykreslení výchozího stavu.
import { Schematic } from './engine.js';

const thumbs = [...document.querySelectorAll('[data-schematic-thumb]')];
if (thumbs.length) {
  fetch('/api/schematics')
    .then((r) => r.json())
    .then((list) => {
      const bySlug = new Map(list.map((s) => [s.slug, s.data]));
      for (const el of thumbs) {
        const data = bySlug.get(el.dataset.schematicThumb);
        if (!data) continue;
        try {
          new Schematic(el, data, { interactive: false, fit: true });
        } catch (err) {
          console.warn('Náhled schématu selhal', el.dataset.schematicThumb, err);
        }
      }
    })
    .catch(() => {});
}
