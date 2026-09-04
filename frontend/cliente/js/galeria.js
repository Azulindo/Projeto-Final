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
    btnFechar.focus();
  }

  function fecharLightbox() {
    overlay.classList.remove('aberto');
    document.body.style.overflow = '';
    if (ultimoFoco && typeof ultimoFoco.focus === 'function') {
      ultimoFoco.focus();
    }
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
