// Nastaví motiv ještě před vykreslením stránky (bez probliknutí).
(function () {
  var stored = null;
  try { stored = localStorage.getItem('eh-theme'); } catch (e) { /* soukromé okno */ }
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = stored || (dark ? 'dark' : 'light');
})();
