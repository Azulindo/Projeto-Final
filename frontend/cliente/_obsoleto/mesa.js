/**
 * =====================================================================
 * mesa.js — Pedido a partir da mesa (QR Code) · "Vem Pro Abate"
 * =====================================================================
 *
 * Ecrã acedido via QR Code na mesa: mostra a ementa por categorias,
 * permite adicionar produtos ao carrinho, enviar o pedido para a
 * cozinha e pedir a conta.
 *
 * DADOS: por agora o catálogo (MENU) está escrito à mão neste ficheiro,
 * tal como em reservas.js — quando o `docs/API.md` (C-03) e o
 * `js/api.js` (F-09) estiverem prontos, isto passa a vir do endpoint
 * GET /api/produtos e o token da mesa passa a ser validado no servidor.
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ═══════════════════════════════════════════════════════════════
     REFERÊNCIAS AO DOM
  ═══════════════════════════════════════════════════════════════ */
  const mesaNumeroEl   = document.getElementById('mesaNumero');
  const btnVerConta    = document.getElementById('btnVerConta');
  const badgeItens     = document.getElementById('badgeItens');
  const estadoBanner   = document.getElementById('estadoBanner');

  const loadingScreen  = document.getElementById('loadingScreen');
  const errorScreen    = document.getElementById('errorScreen');
  const errorMsg       = document.getElementById('errorMsg');

  const mesaMain       = document.getElementById('mesaMain');
  const categoriaTabs  = document.getElementById('categoriaTabs');
  const produtosGrid   = document.getElementById('produtosGrid');

  const carrinhoFab    = document.getElementById('carrinhoFab');
  const fabCount       = document.getElementById('fabCount');
  const fabTotal       = document.getElementById('fabTotal');

  const sidePanel      = document.getElementById('sidePanel');
  const sideOverlay    = document.getElementById('sideOverlay');
  const btnCloseSide   = document.getElementById('btnCloseSide');

  const carrinhoItensEl = document.getElementById('carrinhoItens');
  const carrinhoVazioEl = document.getElementById('carrinhoVazio');
  const btnPedirItens   = document.getElementById('btnPedirItens');

  const pedidosItensEl  = document.getElementById('pedidosItens');
  const pedidosVazioEl  = document.getElementById('pedidosVazio');

  const sideTotalEl    = document.getElementById('sideTotal');
  const btnPedirConta  = document.getElementById('btnPedirConta');

  const toastEl        = document.getElementById('toast');

  // Sai silenciosamente se esta página não tiver o ecrã de mesa
  if (!mesaMain) return;

  /* ═══════════════════════════════════════════════════════════════
     DADOS FALSOS — mesmo catálogo usado em reservas.js
  ═══════════════════════════════════════════════════════════════ */
  const MENU = {
    '🥗 Entradas': [
      { id: 'en1', nome: 'Abatata Frita',    preco: '3,90€', img: 'abatata_frita.png' },
      { id: 'en2', nome: 'Vem Pro Abacate',  preco: '5,80€', img: 'vem_pro_abacate.png' },
      { id: 'en3', nome: "Vem p'ro Alho",    preco: '3,20€', img: 'vem_pro_alho.png' },
      { id: 'en4', nome: 'Abate-Boca',       preco: '4,50€', img: 'abate_boca.png' },
    ],
    '🥩 Pratos Principais': [
      { id: 'pp1', nome: 'Borrego Abatido',        preco: '15,50€', img: 'borrego_abatido.png' },
      { id: 'pp2', nome: 'Francesinha em K.O.',    preco: '12,20€', img: 'francesinha_em_ko.png' },
      { id: 'pp3', nome: 'Abate Misto',            preco: '16,20€', img: 'menu_abate.png' },
      { id: 'pp4', nome: 'Prega-me Isto',          preco: '16,90€', img: 'prego.jpg' },
      { id: 'pp5', nome: 'Picanha na Brasa Negra', preco: '16,00€', img: 'picanha_na_brasa_negra.png' },
      { id: 'pp6', nome: 'Tábua Rústica do Abate', preco: '17,80€', img: 'tabua_rustica_do_abate.png' },
    ],
    '🍺 Bebidas': [
      { id: 'be1a', nome: 'Cerveja (Fino/Pressão)', preco: '1,70€', emoji: '🍺' },
      { id: 'be1b', nome: 'Cerveja (Caneca)',       preco: '2,80€', emoji: '🍺' },
      { id: 'be2',  nome: 'Panaché',                preco: '2,20€', emoji: '🍻' },
      { id: 'be3a', nome: 'Sangria (Copo)',         preco: '3,20€', emoji: '🍷' },
      { id: 'be4',  nome: 'Coca-Cola',              preco: '1,90€', emoji: '🥤' },
      { id: 'be5',  nome: 'Ice Tea',                preco: '1,90€', emoji: '🧊' },
      { id: 'be6',  nome: 'Sumos Naturais',         preco: '3,00€', emoji: '🧃' },
      { id: 'be7a', nome: 'Água (Mineral)',         preco: '1,30€', emoji: '💧' },
      { id: 'be7b', nome: 'Água (Com Gás)',         preco: '1,60€', emoji: '💧' },
      { id: 'be8',  nome: 'Abate Pingado',          preco: '1,00€', emoji: '☕' },
    ],
    '🍮 Sobremesas': [
      { id: 'sb1', nome: 'Abategatoue',        preco: '5,20€', img: 'abategatoue.png' },
      { id: 'sb2', nome: 'Baba do Pastor',      preco: '3,90€', img: 'baba_do_pastor.png' },
      { id: 'sb3', nome: 'Cheesecake da Casa',  preco: '4,60€', img: 'cheesecake_da_casa.png' },
      { id: 'sb4', nome: 'Taça Gelada da Casa', preco: '4,20€', img: 'taca_gelada_da_casa.png' },
    ],
  };

  const CAMINHO_IMAGENS = '../../assets/imagens/pratos/';

  // Mapa rápido id -> produto (para consultas por id)
  const PRODUTOS_POR_ID = {};
  Object.values(MENU).flat().forEach(p => { PRODUTOS_POR_ID[p.id] = p; });

  /* ═══════════════════════════════════════════════════════════════
     ESTADO
  ═══════════════════════════════════════════════════════════════ */
  const state = {
    mesaNumero: null,
    categoriaAtiva: Object.keys(MENU)[0],
    carrinho: {},   // { id: qty }  — ainda não enviado à cozinha
    pedidos: {},    // { id: qty }  — já enviado à cozinha
  };

  let toastTimer = null;

  /* ═══════════════════════════════════════════════════════════════
     INICIALIZAÇÃO — simula leitura do QR Code / token da mesa
  ═══════════════════════════════════════════════════════════════ */
  function init() {
    const params = new URLSearchParams(location.search);
    const tokenInvalido = params.get('token') === 'invalido';
    const mesaParam = (params.get('mesa') || '04').replace(/\D/g, '').padStart(2, '0') || '04';

    setTimeout(() => {
      if (tokenInvalido) {
        mostrarErro('Este QR Code não corresponde a nenhuma mesa ativa. Pede ajuda a um funcionário.');
        return;
      }

      state.mesaNumero = mesaParam;
      mesaNumeroEl.textContent = `📍 Mesa ${state.mesaNumero}`;

      loadingScreen.classList.add('hidden');
      mesaMain.classList.remove('hidden');

      renderTabs();
      renderProdutos();
      atualizarCarrinhoUI();
      renderPedidosSecao();
    }, 650);
  }

  function mostrarErro(msg) {
    loadingScreen.classList.add('hidden');
    errorMsg.textContent = msg;
    errorScreen.classList.remove('hidden');
  }

  /* ═══════════════════════════════════════════════════════════════
     TABS DE CATEGORIA
  ═══════════════════════════════════════════════════════════════ */
  function renderTabs() {
    categoriaTabs.innerHTML = '';
    Object.keys(MENU).forEach(categoria => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (categoria === state.categoriaAtiva ? ' active' : '');
      btn.textContent = categoria;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', categoria === state.categoriaAtiva ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (state.categoriaAtiva === categoria) return;
        state.categoriaAtiva = categoria;
        renderTabs();
        renderProdutos();
      });
      categoriaTabs.appendChild(btn);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     GRID DE PRODUTOS
  ═══════════════════════════════════════════════════════════════ */
  function renderProdutos() {
    produtosGrid.innerHTML = '';
    const produtos = MENU[state.categoriaAtiva] || [];
    produtos.forEach(produto => produtosGrid.appendChild(criarCardProduto(produto)));
  }

  function criarCardProduto(produto) {
    const card = document.createElement('article');
    card.className = 'produto-card';
    card.dataset.id = produto.id;

    // Imagem (ou placeholder de emoji quando não há foto, ex: bebidas)
    if (produto.img) {
      const img = document.createElement('img');
      img.className = 'produto-img';
      img.src = CAMINHO_IMAGENS + produto.img;
      img.alt = produto.nome;
      img.loading = 'lazy';
      card.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'produto-img-placeholder';
      placeholder.textContent = produto.emoji || '🍽️';
      card.appendChild(placeholder);
    }

    const info = document.createElement('div');
    info.className = 'produto-info';
    info.innerHTML = `
      <span class="produto-nome">${escapeHtml(produto.nome)}</span>
      <span class="produto-preco">${produto.preco}</span>
    `;
    card.appendChild(info);

    const acao = document.createElement('div');
    acao.className = 'produto-acao';
    acao.appendChild(criarControloQuantidade(produto.id));
    card.appendChild(acao);

    return card;
  }

  /**
   * criarControloQuantidade — Devolve o botão "+ Adicionar" (quantidade 0)
   * ou o stepper (– qty +) quando o produto já está no carrinho.
   */
  function criarControloQuantidade(id) {
    const qty = state.carrinho[id] || 0;

    if (qty === 0) {
      const btn = document.createElement('button');
      btn.className = 'btn-add';
      btn.textContent = '+ Adicionar';
      btn.addEventListener('click', () => alterarQuantidade(id, 1));
      return btn;
    }

    const wrap = document.createElement('div');
    wrap.className = 'stepper';

    const menos = document.createElement('button');
    menos.textContent = '–';
    menos.setAttribute('aria-label', 'Diminuir quantidade');
    menos.addEventListener('click', () => alterarQuantidade(id, -1));

    const valor = document.createElement('span');
    valor.className = 'qty';
    valor.textContent = qty;

    const mais = document.createElement('button');
    mais.textContent = '+';
    mais.setAttribute('aria-label', 'Aumentar quantidade');
    mais.addEventListener('click', () => alterarQuantidade(id, 1));

    wrap.append(menos, valor, mais);
    return wrap;
  }

  function alterarQuantidade(id, delta) {
    const atual = state.carrinho[id] || 0;
    const nova = Math.max(0, atual + delta);

    if (nova === 0) delete state.carrinho[id];
    else state.carrinho[id] = nova;

    if (delta > 0 && atual === 0) mostrarToast(`${PRODUTOS_POR_ID[id].nome} adicionado ao carrinho`);

    renderProdutos();
    atualizarCarrinhoUI();
  }

  /* ═══════════════════════════════════════════════════════════════
     PAINEL LATERAL — CARRINHO E PEDIDOS JÁ ENVIADOS
  ═══════════════════════════════════════════════════════════════ */
  function atualizarCarrinhoUI() {
    const entradas = Object.entries(state.carrinho);
    const totalItensCarrinho = entradas.reduce((soma, [, qty]) => soma + qty, 0);
    const totalPrecoCarrinho = entradas.reduce((soma, [id, qty]) => soma + parsePreco(PRODUTOS_POR_ID[id].preco) * qty, 0);

    // FAB
    fabCount.textContent = totalItensCarrinho;
    fabTotal.textContent = formatarPreco(totalPrecoCarrinho);

    // Badge no cabeçalho
    if (totalItensCarrinho > 0) {
      badgeItens.textContent = totalItensCarrinho;
      badgeItens.classList.remove('hidden');
    } else {
      badgeItens.classList.add('hidden');
    }

    // Lista "Por Pedir" no painel lateral
    carrinhoItensEl.innerHTML = '';
    if (entradas.length === 0) {
      carrinhoVazioEl.classList.remove('hidden');
    } else {
      carrinhoVazioEl.classList.add('hidden');
      entradas.forEach(([id, qty]) => carrinhoItensEl.appendChild(criarLinhaCarrinho(id, qty)));
    }

    // Total geral da conta = já pedido + por pedir
    const totalPedidos = Object.entries(state.pedidos)
      .reduce((soma, [id, qty]) => soma + parsePreco(PRODUTOS_POR_ID[id].preco) * qty, 0);
    sideTotalEl.textContent = formatarPreco(totalPedidos + totalPrecoCarrinho);
  }

  function criarLinhaCarrinho(id, qty) {
    const produto = PRODUTOS_POR_ID[id];
    const linha = document.createElement('div');
    linha.className = 'side-item';

    const info = document.createElement('div');
    info.className = 'side-item-info';
    info.innerHTML = `
      <span class="side-item-nome">${escapeHtml(produto.nome)}</span>
      <span class="side-item-preco">${produto.preco} cada</span>
    `;

    const stepper = document.createElement('div');
    stepper.className = 'stepper';
    const menos = document.createElement('button');
    menos.textContent = '–';
    menos.addEventListener('click', () => alterarQuantidade(id, -1));
    const valor = document.createElement('span');
    valor.className = 'qty';
    valor.textContent = qty;
    const mais = document.createElement('button');
    mais.textContent = '+';
    mais.addEventListener('click', () => alterarQuantidade(id, 1));
    stepper.append(menos, valor, mais);

    const remover = document.createElement('button');
    remover.className = 'btn-remover-item';
    remover.setAttribute('aria-label', 'Remover item');
    remover.textContent = '✕';
    remover.addEventListener('click', () => {
      delete state.carrinho[id];
      renderProdutos();
      atualizarCarrinhoUI();
    });

    linha.append(info, stepper, remover);
    return linha;
  }

  function renderPedidosSecao() {
    const entradas = Object.entries(state.pedidos);
    pedidosItensEl.innerHTML = '';

    if (entradas.length === 0) {
      pedidosVazioEl.classList.remove('hidden');
      return;
    }
    pedidosVazioEl.classList.add('hidden');

    entradas.forEach(([id, qty]) => {
      const produto = PRODUTOS_POR_ID[id];
      const linha = document.createElement('div');
      linha.className = 'side-item';
      linha.innerHTML = `
        <div class="side-item-info">
          <span class="side-item-nome">${escapeHtml(produto.nome)}</span>
          <span class="side-item-preco">${produto.preco} cada</span>
        </div>
        <span class="qty">x${qty}</span>
      `;
      pedidosItensEl.appendChild(linha);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     AÇÕES — ENVIAR PEDIDO / PEDIR A CONTA
  ═══════════════════════════════════════════════════════════════ */
  function enviarPedido() {
    const entradas = Object.entries(state.carrinho);
    if (entradas.length === 0) {
      mostrarToast('O carrinho está vazio.');
      return;
    }

    entradas.forEach(([id, qty]) => {
      state.pedidos[id] = (state.pedidos[id] || 0) + qty;
    });
    state.carrinho = {};

    renderProdutos();
    atualizarCarrinhoUI();
    renderPedidosSecao();

    mostrarEstadoBanner('🔥 Pedido enviado para a cozinha — aguarda a confirmação.');
    mostrarToast('Pedido enviado com sucesso!');
  }

  function pedirConta() {
    const semNada = Object.keys(state.pedidos).length === 0 && Object.keys(state.carrinho).length === 0;
    if (semNada) {
      mostrarToast('Ainda não fizeste nenhum pedido.');
      return;
    }
    mostrarEstadoBanner('💳 Conta pedida — um funcionário vai já ter contigo.');
    mostrarToast('Conta pedida!');
  }

  function mostrarEstadoBanner(msg) {
    estadoBanner.textContent = msg;
    estadoBanner.classList.remove('hidden');
  }

  /* ═══════════════════════════════════════════════════════════════
     PAINEL LATERAL — ABRIR / FECHAR
  ═══════════════════════════════════════════════════════════════ */
  function abrirPainel() {
    sidePanel.classList.add('open');
    sidePanel.setAttribute('aria-hidden', 'false');
    sideOverlay.classList.remove('hidden');
  }

  function fecharPainel() {
    sidePanel.classList.remove('open');
    sidePanel.setAttribute('aria-hidden', 'true');
    sideOverlay.classList.add('hidden');
  }

  /* ═══════════════════════════════════════════════════════════════
     TOAST
  ═══════════════════════════════════════════════════════════════ */
  function mostrarToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    // força reflow para a transição funcionar mesmo que já estivesse visível
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.classList.add('hidden'), 250);
    }, 2200);
  }

  /* ═══════════════════════════════════════════════════════════════
     UTILITÁRIOS
  ═══════════════════════════════════════════════════════════════ */
  function parsePreco(precoStr) {
    const match = String(precoStr).match(/(\d+)[,.](\d+)/);
    if (!match) return 0;
    return parseFloat(`${match[1]}.${match[2]}`);
  }

  function formatarPreco(valor) {
    return valor.toFixed(2).replace('.', ',') + ' €';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ═══════════════════════════════════════════════════════════════
     EVENTOS
  ═══════════════════════════════════════════════════════════════ */
  btnVerConta.addEventListener('click', abrirPainel);
  carrinhoFab.addEventListener('click', abrirPainel);
  btnCloseSide.addEventListener('click', fecharPainel);
  sideOverlay.addEventListener('click', fecharPainel);
  btnPedirItens.addEventListener('click', enviarPedido);
  btnPedirConta.addEventListener('click', pedirConta);

  init();
});
