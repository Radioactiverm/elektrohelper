import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer, parseFrontmatter, extractQuestions } from '../src/markdown.js';

const { render } = createRenderer({ resolve: (t) => (t === 'Ohmův zákon' ? { href: '/kb/ohmuv-zakon', title: t } : null) });

test('frontmatter s českými klíči', () => {
  const { data, body } = parseFrontmatter('---\ntyp: podtéma\npořadí: 2\ntags:\n  - a\n  - b\n---\nTělo');
  assert.equal(data['typ'], 'podtéma');
  assert.equal(Number(data['pořadí']), 2);
  assert.deepEqual(data.tags, ['a', 'b']);
  assert.equal(body.trim(), 'Tělo');
});

test('wikiodkazy se převedou na URL, neexistující se označí', () => {
  const { html } = render('Viz [[Ohmův zákon]] a [[Neexistuje]].');
  assert.match(html, /href="\/kb\/ohmuv-zakon"/);
  assert.match(html, /Neexistuje/);
  assert.doesNotMatch(html, /href="[^"]*Neexistuje/);
});

test('callout a vzorec', () => {
  const { html } = render('> [!vzorec] Ohmův zákon\n> $$U = R \\cdot I$$');
  assert.match(html, /callout/);
  assert.match(html, /katex/);
});

test('otázky „Otestuj se“', () => {
  const qs = extractQuestions('> [!question]- Kolik je 2+2?\n> Čtyři.\n\n> [!question]- Druhá?\n> Ano.');
  assert.equal(qs.length, 2);
  assert.equal(qs[0].question, 'Kolik je 2+2?');
  assert.equal(qs[0].answer, 'Čtyři.');
});

test('HTML ve vstupu se nevykoná', () => {
  const { html } = render('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /<img/);
  assert.match(render('a <b>tučně</b><br/>b').html, /<b>tučně<\/b><br>/);
});
