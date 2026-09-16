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

  /* ── A BARRA MEDE-SE, EM VEZ DE DECLARAR UMA ALTURA (F-79, 16/09)
     O `--topbar` do `nav.css` é um número ESCRITO À MÃO: 108px em
     telemóvel, 112px abaixo dos 380. O comentário que o acompanha diz
     *"a barra passa a ter duas linhas"* — o logótipo em cima, o menu
     por baixo.

     Medido num telemóvel a 390px: **os cinco links partem-se em 3 + 2**,
     portanto a barra tem TRÊS linhas e precisa de ~146px. Com 108px
     declarados, o conteúdo não cabe: o `align-content: center` reparte
     a sobra para os dois lados e **o logótipo fica a -12px — doze
     píxeis acima do topo, cortados.** Foi o Guilherme que o viu numa
     captura do telemóvel dele.

     É o defeito de sempre: um número declarado num sítio e uma
     realidade desenhada noutro, que podem divergir sem avisar. A
     justificação escrita para não haver menu hambúrguer — *"são cinco
     ligações, cabem todas numa linha a 320px"* — também não bate com a
     medição: não cabem.

     O conserto é a barra deixar de declarar e passar a medir. O valor
     do CSS continua lá como rede para quem tenha o JavaScript
     desligado, mas quem manda é esta função. */
  function medirBarra() {
    const barra = document.querySelector('.inline-bar');
    const conteudo = barra && barra.querySelector('.inline-content');
    if (!conteudo) return;

    const filhos = Array.prototype.filter.call(
      conteudo.children, function (e) { return e.getBoundingClientRect().height > 0; });
    if (!filhos.length) return;

    /* A extensão real do conteúdo: do topo do filho mais alto ao fundo
       do mais baixo. Não se usa o `scrollHeight` porque a
       `.inline-content` tem `height: 100%` e vem recortada. */
    let topo = Infinity, fundo = -Infinity;
    filhos.forEach(function (e) {
      const r = e.getBoundingClientRect();
      topo = Math.min(topo, r.top);
      fundo = Math.max(fundo, r.bottom);
    });

    const estilo = getComputedStyle(conteudo);
    const enchimento = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom);
    const preciso = Math.ceil(fundo - topo + enchimento);

    const atual = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--topbar')) || 0;

    /* Escreve-se o valor EXACTO, para cima ou para baixo. A primeira
       versão só crescia, e isso deixava a barra com 148px para 90px de
       conteúdo entre os 480 e os 768px — 58px de ecrã gastos a nada,
       porque a rede do CSS tem de ser generosa o suficiente para o pior
       caso (três linhas) e o pior caso não acontece a todas as
       larguras.

       Não entra em ciclo: mudar a altura da barra muda onde o
       `align-content: center` põe as filas, mas não muda a EXTENSÃO
       delas, que é o que se mede aqui. A segunda medição dá o mesmo
       valor e não há terceira escrita.

       O 1px de tolerância é para o arredondamento de meio píxel não pôr
       isto a escrever a cada `resize`. */
    if (Math.abs(preciso - atual) > 1) {
      document.documentElement.style.setProperty('--topbar', preciso + 'px');
    }
  }

  function arrancar() {
    marcarPaginaAtual();
    ligarBarraQueRecolhe();

    medirBarra();
    /* Outra vez depois de as imagens e as fontes chegarem: o logótipo é
       uma imagem, e até ela carregar não tem altura. */
    window.addEventListener('load', medirBarra);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(medirBarra);
    }
    let adiado;
    window.addEventListener('resize', function () {
      clearTimeout(adiado);
      adiado = setTimeout(medirBarra, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
