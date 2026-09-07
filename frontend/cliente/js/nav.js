// nav.js — marca na barra de cima a página em que se está (04/09)
//
// A barra tinha cinco ligações todas iguais: nada dizia em que página o
// visitante estava. Isto põe `aria-current="page"` na que corresponde ao
// ficheiro aberto, e o `css/nav.css` trata do resto (texto aceso + o
// risco de brasa fixo por baixo).
//
// É `aria-current` e não uma classe qualquer de propósito: é o atributo
// que os leitores de ecrã anunciam ("página atual"), por isso o mesmo
// trabalho serve para quem vê e para quem não vê.
//
// Carregado pelas seis páginas do cliente, a seguir ao css/nav.css.

(function () {
  function marcarPaginaAtual() {
    // `index.html` e a raiz ("/") são a mesma página.
    let atual = window.location.pathname.split('/').pop() || 'index.html';
    if (atual === '') atual = 'index.html';

    document.querySelectorAll('.inline-nav a').forEach(function (a) {
      const destino = (a.getAttribute('href') || '').split('/').pop().split(/[?#]/)[0];
      if (destino && destino === atual) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', marcarPaginaAtual);
  } else {
    marcarPaginaAtual();
  }
})();
