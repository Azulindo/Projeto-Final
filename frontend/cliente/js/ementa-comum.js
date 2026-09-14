/**
 * =====================================================================
 * ementa-comum.js — A grelha da ementa, uma vez só
 * =====================================================================
 * A `mesa.html` (pedido à mesa, pelo QR) e a `takeaway.html` (encomenda
 * para levar) mostram a MESMA ementa com o MESMO cartão de produto e o
 * MESMO carrinho. A diferença entre as duas está só no cabeçalho: a mesa
 * identifica-se pelo token do QR, o take away pelo nome e telefone de
 * quem vem buscar.
 *
 * ── PORQUE É QUE ISTO NÃO ESTÁ COPIADO NAS DUAS PÁGINAS ─────────────
 * Porque seria a terceira vez, este mês, que duas cópias da mesma coisa
 * se desencontram e ninguém repara:
 *
 *   · o endpoint `categorias` do cliente tinha a ordem da ementa escrita
 *     à mão num array, e mexer na ordem na gestão não mudava nada no
 *     site (apanhado por um teste na F-51);
 *   · o `gestao/stock` e o `gestao/produtos` liam de sítios diferentes,
 *     e as quantidades do mesmo produto podiam divergir entre dois
 *     ecrãs (fechado com o B-61).
 *
 * Duas cópias de um cartão de produto acabariam da mesma maneira: uma
 * corrige-se, a outra fica, e o cliente vê preços com formatos
 * diferentes em duas páginas do mesmo site.
 *
 * ── A MIGRAÇÃO ESTÁ FEITA (F-69, 14/09) ─────────────────────────────
 * As duas páginas usam isto. A `takeaway.html` desde o primeiro dia; a
 * `mesa.html` tinha a sua própria cópia desde 10/09, porque é uma página
 * de 850 linhas testada ponta a ponta e mexer-lhe ao mesmo tempo que se
 * construía uma página nova era arriscar as duas de uma vez.
 *
 * **Quatro dias bastaram para as duas cópias se desencontrarem**, e não
 * nas funções — essas continuavam iguais, tirando nomes de variáveis.
 * Foi no MARKUP do cartão, que é onde ninguém compara:
 *
 *   · os botões de quantidade da `mesa.html` ficaram a **28×28** (grupo
 *     de 36px) contra os **36×36** daqui (grupo de 44px);
 *   · os rótulos diziam "Aumentar quantidade" em vez de nomearem o
 *     prato — com 25 cartões no ecrã, um leitor de ecrã anunciava 25
 *     botões indistinguíveis;
 *   · o número não tinha `aria-live`, portanto mudava em silêncio.
 *
 * Nenhuma das três se via a olho, e a `mesa.html` é a página para onde
 * os QR Codes apontam — a que se usa de pé e com uma mão. A previsão
 * escrita aqui em cima ("uma corrige-se, a outra fica") aconteceu
 * exactamente, e em quatro dias.
 *
 * O que continua a ser só da `mesa.html` é a **nota por prato** (F-21):
 * essa é construída lá e pendurada no cartão que esta função devolve.
 *
 * Não depende de nada. Usa-se antes do JS da página.
 * =====================================================================
 */

/* Onde estão as fotografias. As páginas do cliente estão dois níveis
   abaixo da raiz, e o `imagem` que a API devolve é relativo à raiz. */
const VPA_RAIZ_SITE = '../../';
const VPA_CAMINHO_IMAGENS = '../../assets/imagens/pratos/';

/* Rede para produtos que venham sem `imagem` preenchida. Desde 03/09 o
   `GET /produtos` traz o campo, por isso isto é só cinto de segurança —
   e é de propósito que não tem preços nem nomes de categoria: dados de
   ementa escritos à mão foram sempre o problema, não a solução. */
const VPA_IMAGENS_POR_NOME = {
  'Abatata Frita':            'abatata_frita.jpg',
  'Vem Pro Abacate':          'vem_pro_abacate.jpg',
  "Vem p'ro Alho":            'vem_pro_alho.jpg',
  'Abate-Boca':               'abate_boca.jpg',
  'Borrego Abatido':          'borrego_abatido.jpg',
  'Francesinha em K.O.':      'francesinha_em_ko.jpg',
  'Abate Misto':              'prato_favorito.jpg',
  'Prega-me Isto':            'prego.jpg',
  'Picanha na Brasa Negra':   'picanha_na_brasa_negra.jpg',
  'Tábua Rústica do Abate':   'tabua_rustica_do_abate.jpg',
  'Abategatoue':              'abategatoue.jpg',
  'Baba do Pastor':           'baba_do_pastor.jpg',
  'Cheesecake da Casa':       'cheesecake_da_casa.jpg',
  'Taça Gelada da Casa':      'taca_gelada_da_casa.jpg',
};

/* Emojis para o que não tem fotografia (as bebidas, sobretudo). */
const VPA_EMOJIS_POR_PALAVRA = [
  [/cerveja/i, '🍺'], [/panach/i, '🍻'], [/sangria/i, '🍷'], [/cola/i, '🥤'],
  [/ice tea/i, '🧊'], [/sumo/i, '🧃'], [/água|agua/i, '💧'], [/pingado|caf/i, '☕'],
];

/* Ícone de cada separador. Uma categoria que apareça na API e não esteja
   aqui leva o ícone genérico e aparece na mesma — se o João acrescentar
   uma categoria nova, ela não desaparece por falta de emoji. */
const VPA_ICONES_CATEGORIA = {
  'Pratos Principais': '🥩', 'Entradas': '🥗', 'Bebidas': '🍹', 'Sobremesas': '🍰',
};

/* A ordem de RESERVA, para quando a API não devolve categorias. Não é a
   ordem da ementa: essa vem do campo `ordem` do servidor, e é a única
   que manda. Isto só existe para o caso de a lista vir vazia. */
const VPA_ORDEM_RESERVA = ['Pratos Principais', 'Entradas', 'Bebidas', 'Sobremesas'];

function vpaFormatarPreco(valor) {
  return Number(valor).toFixed(2).replace('.', ',') + ' €';
}

function vpaEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function vpaEscapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}

function vpaOrdenarCategorias(nomes) {
  const conhecidas = VPA_ORDEM_RESERVA.filter(c => nomes.includes(c));
  const novas = nomes.filter(c => !VPA_ORDEM_RESERVA.includes(c)).sort();
  return conhecidas.concat(novas);
}

function vpaFicheiroImagem(produto) {
  if (produto.imagem) return VPA_RAIZ_SITE + produto.imagem;
  const f = VPA_IMAGENS_POR_NOME[produto.nome];
  return f ? VPA_CAMINHO_IMAGENS + f : null;
}

function vpaEmojiProduto(produto) {
  for (const [padrao, emoji] of VPA_EMOJIS_POR_PALAVRA) {
    if (padrao.test(produto.nome)) return emoji;
  }
  return '🍽️';
}

/**
 * vpaDesenharFiltros — os separadores de categoria.
 *
 * @param {HTMLElement} el         onde desenhar
 * @param {string[]}    categorias pela ordem que o servidor deu
 * @param {string}      ativa      a que está selecionada
 * @param {Function}    aoEscolher recebe o nome da categoria
 */
function vpaDesenharFiltros(el, categorias, ativa, aoEscolher) {
  el.innerHTML = '';
  categorias.forEach(function (categoria) {
    const sel = categoria === ativa;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'tab';
    btn.setAttribute('aria-selected', sel ? 'true' : 'false');
    btn.dataset.categoria = categoria;
    btn.className = [
      'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border',
      sel
        ? 'bg-gradient-to-r from-gold to-copper text-carvao border-transparent shadow-soft'
        : 'bg-carvao2 text-neutral-300 border-white/[0.06] hover:border-copper/40',
    ].join(' ');
    btn.innerHTML = `<span aria-hidden="true">${VPA_ICONES_CATEGORIA[categoria] || '🍽️'}</span>`
                  + `<span>${vpaEscapeHtml(categoria)}</span>`;
    btn.addEventListener('click', function () {
      if (categoria !== ativa) aoEscolher(categoria);
    });
    el.appendChild(btn);
  });
}

/**
 * vpaCartaoProduto — um cartão de produto com o seletor de quantidade.
 *
 * O seletor tem 44 px de altura no conjunto: é para ser tocado com uma
 * mão, de pé. (Este comentário citava a F-54, que é a responsividade da
 * app de GESTÃO e não tem nada a ver com esta página — corrigido a
 * 14/09. O número está certo, a referência estava trocada.)
 *
 * @param {Object}   produto
 * @param {number}   quantidade  a que está no carrinho
 * @param {Function} aoAlterar   recebe (produtoId, delta)
 */
function vpaCartaoProduto(produto, quantidade, aoAlterar) {
  const qty = quantidade || 0;
  const caminho = vpaFicheiroImagem(produto);

  const card = document.createElement('article');
  card.className = 'card-enter flex gap-3 bg-carvao2 border border-white/[0.06] rounded-2xl p-3 shadow-soft';
  card.dataset.id = produto.id;

  const media = caminho
    ? `<img src="${vpaEscapeAttr(caminho)}" alt="${vpaEscapeAttr(produto.nome)}" loading="lazy"
           class="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover flex-shrink-0 bg-carvao3"
           onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'w-24 h-24 sm:w-28 sm:h-28 rounded-xl flex-shrink-0 placeholder-icon flex items-center justify-center text-3xl',textContent:'🍽️'}))">`
    : `<div class="w-24 h-24 sm:w-28 sm:h-28 rounded-xl flex-shrink-0 placeholder-icon flex items-center justify-center text-3xl" aria-hidden="true">${vpaEmojiProduto(produto)}</div>`;

  card.innerHTML = `
    ${media}
    <div class="flex-1 min-w-0 flex flex-col justify-between">
      <div>
        <h3 class="font-semibold text-white text-[15px] leading-snug">${vpaEscapeHtml(produto.nome)}</h3>
        <p class="text-xs text-neutral-400 mt-0.5 line-clamp-2">${vpaEscapeHtml(produto.descricao || '')}</p>
      </div>
      <div class="flex items-center justify-between mt-2.5">
        <span class="text-gold font-bold text-[15px]">${vpaFormatarPreco(Number(produto.preco))}</span>
        <div class="flex items-center gap-0.5 bg-carvao3 rounded-full p-1">
          <button type="button" data-action="menos" aria-label="Menos um ${vpaEscapeAttr(produto.nome)}"
                  class="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" ${qty === 0 ? 'disabled' : ''}>−</button>
          <span class="qty-value w-6 text-center text-sm font-bold text-white" aria-live="polite">${qty}</span>
          <button type="button" data-action="mais" aria-label="Mais um ${vpaEscapeAttr(produto.nome)}"
                  class="w-9 h-9 rounded-full flex items-center justify-center bg-copper text-white hover:bg-gold hover:text-carvao transition-colors">+</button>
        </div>
      </div>
    </div>
  `;

  card.querySelector('[data-action="menos"]').addEventListener('click', function () { aoAlterar(produto.id, -1); });
  card.querySelector('[data-action="mais"]').addEventListener('click', function () { aoAlterar(produto.id, 1); });
  return card;
}

/** Atualiza só o cartão afetado, para não perder o scroll da lista. */
function vpaAtualizarCartao(grelha, produtoId, nova) {
  const card = grelha.querySelector(`[data-id="${produtoId}"]`);
  if (!card) return;
  card.querySelector('.qty-value').textContent = nova;
  card.querySelector('[data-action="menos"]').disabled = nova === 0;
}
