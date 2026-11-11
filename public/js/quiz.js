// Procvičování kartiček s jednoduchým opakováním: neznámé karty se vrací dřív.
import { track } from './app.js';

const root = document.querySelector('[data-quiz]');
if (root) init(root);

async function init(el) {
  const card = el.querySelector('[data-quiz-card]');
  const qEl = el.querySelector('[data-quiz-q]');
  const aEl = el.querySelector('[data-quiz-a]');
  const fromEl = el.querySelector('[data-quiz-from]');
  const countEl = el.querySelector('[data-quiz-count]');
  const barEl = el.querySelector('[data-quiz-bar]');
  const gradeBtns = el.querySelectorAll('[data-quiz-grade]');
  const done = el.querySelector('[data-quiz-done]');
  const summary = el.querySelector('[data-quiz-summary]');

  const params = new URLSearchParams();
  if (el.dataset.subject) params.set('predmet', el.dataset.subject);
  if (el.dataset.article) params.set('clanek', el.dataset.article);
  const all = await (await fetch(`/api/questions?${params}`)).json();

  let queue;
  let known;
  let total;
  let current;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function start() {
    queue = shuffle([...all]);
    known = 0;
    total = all.length;
    done.hidden = true;
    card.hidden = false;
    el.querySelector('.quiz-actions').hidden = false;
    next();
  }

  function next() {
    card.classList.remove('flipped');
    gradeBtns.forEach((b) => { b.disabled = true; });
    countEl.textContent = `${known} / ${total}`;
    barEl.style.width = `${total ? (known / total) * 100 : 0}%`;
    current = queue.shift();
    if (!current) {
      card.hidden = true;
      el.querySelector('.quiz-actions').hidden = true;
      done.hidden = false;
      summary.textContent = total
        ? `Prošel(a) jsi všech ${total} kartiček. Výborně!`
        : 'V tomto výběru zatím nejsou žádné otázky.';
      return;
    }
    // Text otázky se zobrazí až po otočení zpět, aby nebyla vidět odpověď.
    setTimeout(() => {
      qEl.innerHTML = current.q;
      aEl.innerHTML = current.a;
      fromEl.textContent = `z článku ${current.from}`;
    }, card.classList.contains('flipped') ? 300 : 0);
  }

  function flip() {
    if (!current) return;
    card.classList.toggle('flipped');
    if (card.classList.contains('flipped')) gradeBtns.forEach((b) => { b.disabled = false; });
  }

  function grade(ok) {
    if (!current) return;
    track('quiz_answer', current.subject, ok ? 1 : 0);
    if (ok) known++;
    else queue.splice(Math.min(3, queue.length), 0, current); // vrátí se za 3 karty
    next();
  }

  card.addEventListener('click', flip);
  card.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (!card.classList.contains('flipped')) return;
    if (e.key === '1' || e.key === 'ArrowLeft') grade(false);
    if (e.key === '2' || e.key === 'ArrowRight') grade(true);
  });
  gradeBtns.forEach((b) => b.addEventListener('click', () => grade(b.dataset.quizGrade === '1')));
  el.querySelector('[data-quiz-restart]').addEventListener('click', start);
  start();
}
