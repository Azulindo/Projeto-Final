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

  /* ── A barra recolhe ao descer e volta ao subir ──────────────────
     Em telemóvel a barra tem 108px fixos e está sempre lá, mesmo a
     meio de uma ementa longa. Recolher ao descer devolve esse espaço
     ao conteúdo; voltar ao subir faz com que não seja preciso ir até
     ao topo da página para chegar ao menu.

     Regras:
     · perto do topo está sempre aberta — é onde se espera vê-la;
     · só reage a movimentos com algum tamanho, senão tremia a cada
       pixel de scroll (e em telemóvel o dedo nunca está quieto);
     · se o foco do teclado entrar na barra, ela abre — ninguém pode
       ficar preso a navegar numa coisa que não vê. */
  function ligarBarraQueRecolhe() {
    const barra = document.querySelector('.inline-bar');
    if (!barra) return;

    let ultimoY = Math.max(0, window.scrollY);
    let agendado = false;

    function avaliar() {
      agendado = false;
      const y = Math.max(0, window.scrollY);   // o "elástico" do iOS dá negativos
      const delta = y - ultimoY;

      // Menos de 6px é tremura, não é intenção de scroll.
      if (Math.abs(delta) < 6) return;

      if (y <= barra.offsetHeight) {
        barra.classList.remove('barra-recolhida');
      } else if (delta > 0) {
        barra.classList.add('barra-recolhida');
      } else {
        barra.classList.remove('barra-recolhida');
      }

      ultimoY = y;
    }

    window.addEventListener('scroll', function () {
      if (!agendado) {
        agendado = true;
        window.requestAnimationFrame(avaliar);
      }
    }, { passive: true });

    barra.addEventListener('focusin', function () {
      barra.classList.remove('barra-recolhida');
    });
  }

  function arrancar() {
    marcarPaginaAtual();
    ligarBarraQueRecolhe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
