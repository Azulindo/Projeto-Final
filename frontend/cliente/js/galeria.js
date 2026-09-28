// JavaScript for Galeria page — legenda sempre visível + lightbox (04/09)
//
// Antes disto, a única forma de ver a foto de um prato era pairar o rato
// em cima do cartão (ver galeria.css) — não funciona em ecrãs de toque, e
// foi exatamente essa a queixa de clientes: "não é intuitivo ter que
// passar com o rato por cima". Agora a foto está sempre visível no
// cartão; clicar/tocar abre-a maior num lightbox, com nome do prato e
// navegação entre todos os pratos da galeria (setas, teclado ou deslizar
// no telemóvel).

document.addEventListener('DOMContentLoaded', function () {
  const cartoes = Array.from(document.querySelectorAll('.dish-card'));
  if (!cartoes.length) return;

  const pratos = cartoes.map(function (cartao) {
    const img = cartao.querySelector('.dish-image img');
    const nomeEl = cartao.querySelector('.dish-name');
    return {
      src: img ? img.getAttribute('src') : '',
      alt: img ? img.getAttribute('alt') : '',
      nome: nomeEl ? nomeEl.textContent.trim() : '',
    };
  });

  // Cada cartão passa a comportar-se como um botão acessível (antes só
  // reagia ao :hover, que nem sequer é alcançável por teclado).
  cartoes.forEach(function (cartao, indice) {
    cartao.setAttribute('tabindex', '0');
    cartao.setAttribute('role', 'button');
    cartao.setAttribute('aria-haspopup', 'dialog');
    cartao.setAttribute('aria-label', 'Ver ' + pratos[indice].nome + ' em destaque');

    const dica = document.createElement('span');
    dica.className = 'dish-zoom-hint';
    dica.setAttribute('aria-hidden', 'true');
    dica.textContent = '🔍';
    cartao.appendChild(dica);

    cartao.addEventListener('click', function () {
      abrirLightbox(indice);
    });

    cartao.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        abrirLightbox(indice);
      }
    });
  });

  // ── Lightbox — estrutura criada uma vez e reutilizada ────────────
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Foto do prato em destaque');
  overlay.innerHTML =
    '<div class="lightbox-caixa">' +
      '<button type="button" class="lightbox-fechar" aria-label="Fechar">✕</button>' +
      '<button type="button" class="lightbox-seta anterior" aria-label="Prato anterior">‹</button>' +
      '<div class="lightbox-imagem-wrap"><img id="lightboxImagem" src="" alt=""></div>' +
      '<div class="lightbox-nome" id="lightboxNome"></div>' +
      '<div class="lightbox-contador" id="lightboxContador"></div>' +
      '<button type="button" class="lightbox-seta seguinte" aria-label="Prato seguinte">›</button>' +
    '</div>';
  document.body.appendChild(overlay);

  const imagemEl = overlay.querySelector('#lightboxImagem');
  const nomeEl = overlay.querySelector('#lightboxNome');
  const contadorEl = overlay.querySelector('#lightboxContador');
  const btnFechar = overlay.querySelector('.lightbox-fechar');
  const btnAnterior = overlay.querySelector('.lightbox-seta.anterior');
  const btnSeguinte = overlay.querySelector('.lightbox-seta.seguinte');

  let indiceAtual = 0;
  let ultimoFoco = null;

  function desenharPrato(indice) {
    const prato = pratos[indice];
    imagemEl.src = prato.src;
    imagemEl.alt = prato.alt || prato.nome;
    nomeEl.textContent = prato.nome;
    contadorEl.textContent = (indice + 1) + ' de ' + pratos.length;
  }

  function abrirLightbox(indice) {
    indiceAtual = indice;
    ultimoFoco = document.activeElement;
    desenharPrato(indiceAtual);
    overlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';

    /* ── O `requestAnimationFrame` não é superstição (F-83, 16/09) ──
       A versão anterior chamava `btnFechar.focus()` aqui, na mesma
       linha, e **falhava em silêncio**: o estado fechado do
       `.lightbox-overlay` é `visibility: hidden` (de propósito, para os
       três botões saírem da ordem de tabulação enquanto está fechado),
       e **um elemento com `visibility: hidden` não aceita foco.** A
       classe `aberto` acabou de ser posta, o estilo ainda não foi
       aplicado, e o `.focus()` cai no vazio sem dar erro.

       O resultado, medido: abrir a galeria com o Enter deixava o foco
       no CARTÃO, fora de um diálogo que declara `aria-modal="true"` —
       isto é, um leitor de ecrã dizia ao utilizador que o resto da
       página estava indisponível, e o foco dele estava justamente no
       resto da página. Com o rato ninguém notava, porque o foco do
       rato não interessa a ninguém.

       O conserto de fundo está no `galeria.css`: a `visibility` é uma
       propriedade DISCRETA e o `transition: visibility 0.25s` fazia o
       browser guardar o valor antigo durante ~125ms. Passou a
       `visibility 0s linear 0.25s` — instantânea a abrir, atrasada a
       fechar. Este quadro de espera fica como cinto e suspensórios:
       garante que o estilo já foi aplicado quando se pede o foco.

       (Medido: só com o `requestAnimationFrame` o teste continuava a
       reprovar — 16ms de espera contra 125 de `visibility` presa. Foi
       o teste que me obrigou a ir à causa em vez de ficar no sintoma.)

       E é por isso que o foco se pede **já**, e não dentro do quadro de
       espera: com a `visibility` a trocar de imediato, o `.focus()`
       directo funciona — medido no site publicado. O
       `requestAnimationFrame` ficou só como segunda tentativa, porque
       **ele próprio não corre numa página que não está a ser
       desenhada**: com o separador em segundo plano (`document.hidden`)
       o Chrome não chama os callbacks de animação, e um foco que
       dependesse dele nunca acontecia. Apanhei isso a medir o site
       publicado num painel oculto — o mesmo alçapão que já me tinha
       dado um susto falso com a cortina, desta vez a mostrar uma
       fragilidade a sério no meu próprio conserto. */
    btnFechar.focus();
    if (document.activeElement !== btnFechar) {
      requestAnimationFrame(function () { btnFechar.focus(); });
    }
  }

  function fecharLightbox() {
    overlay.classList.remove('aberto');
    document.body.style.overflow = '';

    /* Devolve-se o foco ao cartão do prato que se estava a ver — e não
       àquele por onde se entrou (F-83). Quem abriu o primeiro prato e
       andou dez setas para a frente está a olhar para o décimo: mandar
       o foco de volta ao primeiro obrigava a atravessar a galeria outra
       vez. O `ultimoFoco` continua a ser a rede para quando a entrada
       não foi por um cartão. */
    const destino = cartoes[indiceAtual] ||
      (ultimoFoco && typeof ultimoFoco.focus === 'function' ? ultimoFoco : null);
    if (destino) destino.focus();
  }

  function irPara(deslocamento) {
    indiceAtual = (indiceAtual + deslocamento + pratos.length) % pratos.length;
    desenharPrato(indiceAtual);
  }

  btnFechar.addEventListener('click', fecharLightbox);
  btnAnterior.addEventListener('click', function () { irPara(-1); });
  btnSeguinte.addEventListener('click', function () { irPara(1); });

  overlay.addEventListener('click', function (evento) {
    if (evento.target === overlay) fecharLightbox();
  });

  document.addEventListener('keydown', function (evento) {
    if (!overlay.classList.contains('aberto')) return;
    if (evento.key === 'Escape') fecharLightbox();
    if (evento.key === 'ArrowLeft') irPara(-1);
    if (evento.key === 'ArrowRight') irPara(1);

    /* ── O FOCO FICA DENTRO DO DIÁLOGO (F-83) ──────────────────────
       `aria-modal="true"` é uma PROMESSA: diz ao leitor de ecrã que
       nada fora deste diálogo está disponível. Medido, o Tab saía para
       a barra de navegação da página de trás em cinco toques — a
       declaração e o comportamento diziam coisas diferentes, que é o
       defeito de sempre deste projeto, desta vez entre o ARIA e o
       JavaScript.

       Três botões, um ciclo: no último, o Tab volta ao primeiro; no
       primeiro, o Shift+Tab vai ao último. Não se listam os botões à
       mão — perguntam-se ao diálogo, senão acrescentar um quarto botão
       um dia deixava-o de fora sem ninguém reparar. */
    if (evento.key === 'Tab') {
      const focaveis = Array.prototype.filter.call(
        overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]'),
        function (e) { return !e.disabled && e.getAttribute('tabindex') !== '-1'; });
      if (!focaveis.length) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      /* Se o foco tiver escapado (ou nunca tiver entrado), o próximo
         Tab trá-lo de volta em vez de continuar a fugir. */
      if (!overlay.contains(atual)) {
        evento.preventDefault();
        primeiro.focus();
      } else if (evento.shiftKey && atual === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  });

  // Deslizar no telemóvel — as setas escondem-se em ecrãs pequenos
  // (galeria.css) precisamente para dar lugar a este gesto.
  let toqueInicioX = null;

  overlay.addEventListener('touchstart', function (evento) {
    toqueInicioX = evento.touches[0].clientX;
  }, { passive: true });

  overlay.addEventListener('touchend', function (evento) {
    if (toqueInicioX === null) return;
    const deslocamento = evento.changedTouches[0].clientX - toqueInicioX;
    if (Math.abs(deslocamento) > 40) {
      irPara(deslocamento > 0 ? -1 : 1);
    }
    toqueInicioX = null;
  });
});
