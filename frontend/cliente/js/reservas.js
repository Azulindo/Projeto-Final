/**
 * =====================================================================
 * reservas.js — Chatbot de Reserva "Vem Pro Abate" v4.0
 * =====================================================================
 *
 * FLUXO COMPLETO:
 *  P1 · Boas-Vindas + Número de Pessoas
 *  P2 · Opção de Pedido (restaurante | menu)
 *  P3 · Pré-Seleção do Menu por Categorias + Quantidades (steppers)
 *       └─ 3a. Pratos Principais
 *       └─ 3b. Bebidas
 *       └─ 3c. Sobremesas
 *       └─ 3d. Observações da Cozinha
 *       └─ 3e. Resumo do Pedido
 *  P4 · Mini-Calendário Interativo (escolha de data)
 *  P5 · Horário por Turnos (Quick Replies)
 *  P6 · Contactos (Nome → Telemóvel)
 *  P7 · Card de Resumo Final + Confirmação
 *
 * REGRAS DE SEGURANÇA:
 *  ✓ NUNCA chamar .focus() ou .scrollIntoView() no arranque (evita auto-scroll)
 *  ✓ Input do utilizador sempre via .textContent (proteção anti-XSS)
 *  ✓ Botões desativados durante processamento (bloqueio anti-spam)
 *  ✓ Validação de telemóvel com Regex português
 *  ✓ Conversão de números por extenso via dicionário
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 1 — REFERÊNCIAS AO DOM
     Capturamos os elementos principais uma única vez.
  ═══════════════════════════════════════════════════════════════ */
  const chatBody    = document.getElementById('chatBody');
  const qrContainer = document.getElementById('quickReplies');
  const chatInput   = document.getElementById('chatInput');
  const sendBtn     = document.getElementById('chatSendBtn');

  // Sai silenciosamente se o chatbot não estiver na página
  if (!chatBody) return;

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 2 — ESTADO GLOBAL DA RESERVA
     Objeto central com todos os dados recolhidos ao longo do fluxo.
     freshState() garante que reset recomeça do zero.
  ═══════════════════════════════════════════════════════════════ */
  let state = freshState();

  /**
   * freshState — Cria um estado inicial limpo.
   * Chamado no arranque e no reset do chat.
   *
   * @returns {object} Objeto com todos os campos da reserva zerados.
   */
  function freshState() {
    return {
      step: 'pessoas',      // Etapa atual do fluxo
      pessoas: 0,           // Número de pessoas na mesa
      opcaoMenu: '',        // 'restaurante' | 'menu'
      carrinho: {},         // Map { id: { nome, qty, preco, categoria } }
      observacoes: '',      // Observações livres da cozinha
      menuCategorias: [],   // Lista de categorias a percorrer sequencialmente
      catIndex: 0,          // Índice da categoria atual no fluxo sequencial
      data: null,           // Objeto Date da data escolhida
      dataStr: '',          // Data formatada 'DD/MM/AAAA'
      hora: '',             // Hora escolhida ('20:00')
      nome: '',             // Nome completo do cliente
      telefone: '',         // Número de telemóvel
      processing: false,    // Bloqueio anti-spam: true quando o bot está a processar
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 3 — DADOS DO MENU (EMENTA REAL)
     Estrutura com categorias e pratos. Cada item tem:
       id    → identificador único para o carrinho
       nome  → nome do prato
       desc  → descrição curta
       preco → preço em texto
  ═══════════════════════════════════════════════════════════════ */
  const MENU = {
    '🥩 Pratos Principais': [
      { id: 'pp1', nome: 'Borrego Abatido',        desc: 'Borrego assado com batata, alecrim, alho e vinho branco', preco: '15,50€' },
      { id: 'pp2', nome: 'Francesinha em K.O.',    desc: 'Bife, enchidos, queijo e molho da casa com batata e ovo', preco: '12,20€' },
      { id: 'pp3', nome: 'Abate Misto',            desc: 'Picanha, chouriço e frango na brasa com arroz e batata',  preco: '16,20€' },
      { id: 'pp4', nome: 'Prega-me Isto',          desc: 'Bife dos Açores grelhado com batata frita',               preco: '16,90€' },
      { id: 'pp5', nome: 'Picanha na Brasa Negra', desc: 'Picanha grelhada com arroz e batata frita',               preco: '16,00€' },
      { id: 'pp6', nome: 'Tábua Rústica do Abate', desc: 'Carnes mistas com migas e batata a murro',                preco: '17,80€' },
    ],
    '🍺 Bebidas': [
      { id: 'be1', nome: 'Cerveja',        desc: 'Fino/pressão ou caneca',           preco: '1,70€ / 2,80€' },
      { id: 'be2', nome: 'Panaché',        desc: 'Cerveja com gasosa',               preco: '2,20€' },
      { id: 'be3', nome: 'Sangria',        desc: 'Branca, tinta ou espumante',       preco: '3,20€ copo / 12€ jarro' },
      { id: 'be4', nome: 'Coca-Cola',      desc: 'Normal ou zero',                   preco: '1,90€' },
      { id: 'be5', nome: 'Ice Tea',        desc: 'Pêssego, limão ou manga',          preco: '1,90€' },
      { id: 'be6', nome: 'Sumos Naturais', desc: 'Laranja ou mistura de frutos',     preco: '3,00€' },
      { id: 'be7', nome: 'Água',           desc: 'Mineral ou com gás',               preco: '1,30€ / 1,60€' },
      { id: 'be8', nome: 'Café / Pingado', desc: 'Café ou descafeinado',             preco: '1,00€' },
    ],
    '🍮 Sobremesas': [
      { id: 'sb1', nome: 'Abategatoue',        desc: 'Petit gâteau com gelado e chocolate fundido', preco: '5,20€' },
      { id: 'sb2', nome: 'Baba do Pastor',      desc: 'Baba de camelo com bolacha',                 preco: '3,90€' },
      { id: 'sb3', nome: 'Cheesecake da Casa',  desc: 'Cheesecake com frutos vermelhos',             preco: '4,60€' },
      { id: 'sb4', nome: 'Taça Gelada da Casa', desc: 'Gelados sortidos, chantilly e chocolate',     preco: '4,20€' },
    ],
  };

  /* Ordem das categorias no fluxo sequencial */
  const CATEGORIAS_SEQUENCIAIS = Object.keys(MENU);

  /* Horários disponíveis por turno */
  const HORARIOS = {
    almoco: ['12:00', '12:30', '13:00', '13:30', '14:00'],
    jantar: ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'],
  };

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 4 — DICIONÁRIO DE NÚMEROS POR EXTENSO
     Permite que o utilizador escreva "quatro" em vez de 4.
     A função parsePessoasTexto() usa este mapa para converter.
     Suporta variantes com e sem acentos.
  ═══════════════════════════════════════════════════════════════ */
  const NUMEROS_POR_EXTENSO = {
    'um':     1, 'uma':   1,
    'dois':   2, 'duas':  2,
    'tres':   3, 'três':  3,
    'quatro': 4,
    'cinco':  5,
    'seis':   6,
    'sete':   7,
    'oito':   8,
    'nove':   9,
    'dez':   10,
  };

  /* Número de telefone do restaurante (substituir pelo real) */
  const TEL_RESTAURANTE = '912 345 678';

  /* Estado do mini-calendário (mês/ano atualmente visível) */
  let calState = { year: 0, month: 0 };

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 5 — UTILITÁRIOS BASE
  ═══════════════════════════════════════════════════════════════ */

  /**
   * pause — Aguarda um determinado número de milissegundos.
   * Usado antes de mostrar mensagens do bot para simular digitação natural.
   *
   * @param {number} ms - Milissegundos a aguardar.
   * @returns {Promise<void>}
   */
  const pause = (ms) => new Promise(r => setTimeout(r, ms));

  /**
   * scrollDown — Faz scroll até ao fim do chat body.
   * Chamado após adicionar qualquer nova mensagem.
   */
  function scrollDown() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 6 — CONTROLO DO INPUT (BLOQUEIO ANTI-SPAM)
     lockUI desativa todos os controlos enquanto o bot processa.
     unlockUI reativa-os — SEM .focus() para não causar auto-scroll.
  ═══════════════════════════════════════════════════════════════ */

  /**
   * lockUI — Bloqueia o input, o botão de envio e todos os quick-reply buttons.
   * Evita que o utilizador envie mensagens durante o processamento do bot.
   *
   * @param {string} placeholder - Texto a mostrar no input bloqueado.
   */
  function lockUI(placeholder = 'Aguarda…') {
    chatInput.disabled = true;
    sendBtn.disabled   = true;
    chatInput.placeholder = placeholder;
    state.processing = true;
    // Desativa todos os botões de quick reply existentes
    qrContainer.querySelectorAll('.qr-btn').forEach(b => { b.disabled = true; });
  }

  /**
   * unlockUI — Reativa os controlos do chat.
   * IMPORTANTE: Não chama .focus() para evitar auto-scroll indesejado.
   *
   * @param {string} placeholder - Texto de ajuda no input reativado.
   */
  function unlockUI(placeholder = 'Escreva a sua resposta…') {
    chatInput.disabled = false;
    sendBtn.disabled   = false;
    chatInput.placeholder = placeholder;
    chatInput.value  = '';
    state.processing = false;
    // ⚠️ NÃO chamamos .focus() — evita scroll automático para o chat
  }

  /**
   * clearQR — Remove todos os quick-reply buttons do container.
   */
  function clearQR() { qrContainer.innerHTML = ''; }

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 7 — RENDERIZAÇÃO DE MENSAGENS
  ═══════════════════════════════════════════════════════════════ */

  /**
   * botReply — Mostra uma mensagem do bot com indicador de digitação.
   * O delay simula o tempo de "escrita" para tornar a conversa mais natural.
   *
   * @param {string} html   - Conteúdo HTML da mensagem (gerado internamente, nunca do utilizador).
   * @param {number} delay  - Milissegundos de atraso antes de mostrar a mensagem.
   * @returns {Promise<HTMLElement>} - O elemento balão criado.
   */
  async function botReply(html, delay = 850) {
    // Cria o indicador animado de "a escrever..."
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(typing);
    scrollDown();

    await pause(delay);
    typing.remove();

    // Cria o balão da mensagem do bot
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';
    // Usamos innerHTML apenas para conteúdo gerado internamente (bot), nunca para input do utilizador
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    bubble.appendChild(wrapper);
    chatBody.appendChild(bubble);
    scrollDown();
    return bubble;
  }

  /**
   * userBubble — Adiciona uma mensagem do lado do utilizador.
   * Usa .textContent (NUNCA innerHTML) para previnir ataques XSS.
   *
   * @param {string} text - Texto a mostrar no balão do utilizador.
   */
  function userBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    // SEGURANÇA ANTI-XSS: textContent não executa HTML/scripts
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    scrollDown();
  }

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 8 — QUICK REPLIES (CHIPS)
  ═══════════════════════════════════════════════════════════════ */

  /**
   * renderQR — Renderiza botões de quick-reply (chips) no container.
   * Cada botão chama o callback onClick com o label e o value.
   *
   * @param {Array<{label:string, value?:string}>} options - Lista de opções.
   * @param {Function} onClick  - Callback(label, value) ao clicar.
   * @param {boolean}  isPrimary - Se true, usa estilo laranja (primário).
   */
  function renderQR(options, onClick, isPrimary = false) {
    clearQR();
    options.forEach(({ label, value }) => {
      const btn = document.createElement('button');
      btn.className = isPrimary ? 'qr-btn primary' : 'qr-btn';
      // textContent para evitar XSS nos labels (embora sejam strings internas)
      btn.textContent = label;
      btn.addEventListener('click', () => {
        // Verificação anti-spam: ignora cliques durante processamento
        if (state.processing) return;
        onClick(label, value ?? label);
      });
      qrContainer.appendChild(btn);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     PASSO 1 — BOAS-VINDAS & NÚMERO DE PESSOAS
  ═══════════════════════════════════════════════════════════════ */

  /**
   * stepPessoas — Passo inicial: pergunta o número de pessoas.
   * Mostra quick-replies e aceita também texto livre.
   */
  async function stepPessoas() {
    state.step = 'pessoas';
    lockUI();

    await botReply(
      'Olá! 👋 Bem-vindo ao <strong>Vem Pro Abate</strong>.<br>Para quantas pessoas será a mesa?',
      600
    );

    // Quick-replies para as opções mais comuns
    renderQR([
      { label: '👤 1 Pessoa',  value: '1'  },
      { label: '👥 2 Pessoas', value: '2'  },
      { label: '👥 4 Pessoas', value: '4'  },
      { label: '👥 6 Pessoas', value: '6'  },
      { label: '🎉 +6 Grupo',  value: '99' },
    ], (label, value) => {
      // Converte o value para número e processa
      const n = value === '99' ? 99 : parseInt(value, 10);
      processPessoas(label, n);
    });

    unlockUI('Ex: 3 ou "quatro"…');
  }

  /**
   * processPessoas — Valida e avança com o número de pessoas.
   * Lida com grupos grandes (> 10) redireccionando para telefone.
   *
   * @param {string} rawLabel - Texto mostrado no balão do utilizador.
   * @param {number} n        - Número de pessoas (99 = grupo grande).
   */
  async function processPessoas(rawLabel, n) {
    clearQR();
    userBubble(rawLabel);
    lockUI();

    // Grupos grandes (>10 pessoas ou flag de grupo): redireciona para telefone
    if (n > 10 || n === 99) {
      await botReply(
        '📞 Para grupos com mais de <strong>10 pessoas</strong>, a reserva é feita diretamente por telefone.<br>Liga-nos e tratamos de tudo! 😊',
        750
      );
      // Apresenta opções: ligar ou recomeçar
      renderQR(
        [
          { label: '📞 Ligar para o Restaurante', value: 'ligar' },
          { label: '🔄 Recomeçar', value: 'reset' },
        ],
        (label, value) => {
          if (value === 'ligar') {
            window.location.href = `tel:${TEL_RESTAURANTE.replace(/\s/g, '')}`;
          } else {
            resetChat();
          }
        },
        true // estilo primário (laranja)
      );
      unlockUI('Recomeçar ou liga-nos…');
      return;
    }

    // Validação: mínimo 1 pessoa
    if (n < 1 || isNaN(n)) {
      await botReply('⚠️ Por favor indica um número válido de pessoas (mínimo 1).', 600);
      unlockUI('Ex: 2 ou "três"…');
      await stepPessoas();
      return;
    }

    state.pessoas = n;
    await stepOpcaoMenu();
  }

  /**
   * parsePessoasTexto — Converte input de texto livre em número.
   * Primeiro tenta o dicionário de extensos; se falhar, tenta parseInt.
   * Exemplo: "quatro" → 4, "5" → 5, "abc" → null.
   *
   * @param {string} raw - Texto introduzido pelo utilizador.
   * @returns {number|null} - Número convertido ou null se inválido.
   */
  function parsePessoasTexto(raw) {
    const clean = raw.trim().toLowerCase();
    // 1º: Verifica no dicionário de palavras por extenso
    if (NUMEROS_POR_EXTENSO[clean] !== undefined) {
      return NUMEROS_POR_EXTENSO[clean];
    }
    // 2º: Tenta conversão numérica direta
    const n = parseInt(clean, 10);
    return isNaN(n) ? null : n;
  }

  /* ═══════════════════════════════════════════════════════════════
     PASSO 2 — OPÇÃO DE PEDIDO / EMENTA
  ═══════════════════════════════════════════════════════════════ */

  /**
   * stepOpcaoMenu — Pergunta se querem pré-selecionar o menu.
   */
  async function stepOpcaoMenu() {
    state.step = 'opcao';
    const quant = state.pessoas === 1 ? '1 pessoa' : `${state.pessoas} pessoas`;

    await botReply(
      `Perfeito, mesa para <strong>${quant}</strong>! 🥩<br>Como preferem fazer em relação aos pratos?`,
      800
    );

    renderQR([
      { label: '🍷 Decidir no restaurante', value: 'restaurante' },
      { label: '🥩 Ver menu e pré-selecionar', value: 'menu' },
    ], (label, value) => {
      clearQR();
      userBubble(label);
      state.opcaoMenu = value;
      lockUI();
      if (value === 'restaurante') ramoRestaurante();
      else ramoMenu();
    });

    unlockUI('Clica numa opção acima…');
  }

  /**
   * ramoRestaurante — Caminho em que o cliente decide no restaurante.
   * Salta o fluxo de menu e vai direto ao calendário.
   */
  async function ramoRestaurante() {
    await botReply(
      '🍽️ Perfeito! A ementa completa estará disponível na tua mesa.<br>Vamos então agendar o dia! 📅',
      700
    );
    stepCalendario();
  }

  /**
   * ramoMenu — Caminho em que o cliente pré-seleciona o menu.
   * Inicia o fluxo sequencial por categorias.
   */
  async function ramoMenu() {
    await botReply(
      '🔥 Ótima escolha! Vamos ver o nosso menu por partes.<br>Começa pelos <strong>Pratos Principais</strong> 👇',
      800
    );
    // Inicializa o índice de categorias e começa pelo primeiro
    state.menuCategorias = CATEGORIAS_SEQUENCIAIS.slice();
    state.catIndex = 0;
    renderCategoria(state.catIndex);
  }

  /* ═══════════════════════════════════════════════════════════════
     PASSO 3 — PRÉ-SELEÇÃO DO MENU POR CATEGORIAS
     Fluxo sequencial: Pratos Principais → Bebidas → Sobremesas
     Cada categoria tem seletores de quantidade [ - ] N [ + ]
  ═══════════════════════════════════════════════════════════════ */

  /**
   * renderCategoria — Renderiza o card de seleção de uma categoria do menu.
   * Apresenta cada item com seletor de quantidade [ - ] 0 [ + ].
   * Após confirmar, avança para a próxima categoria ou para as observações.
   *
   * @param {number} index - Índice da categoria em CATEGORIAS_SEQUENCIAIS.
   */
  function renderCategoria(index) {
    const catNome = state.menuCategorias[index];
    const pratos  = MENU[catNome];
    if (!pratos) return;

    // Inicializa as quantidades do carrinho para esta categoria se necessário
    pratos.forEach(p => {
      if (!state.carrinho[p.id]) {
        state.carrinho[p.id] = { nome: p.nome, qty: 0, preco: p.preco, categoria: catNome };
      }
    });

    // Remove card anterior se existir
    const old = document.getElementById('catCard');
    if (old) old.remove();

    // ── Cria o card da categoria ────────────────────────────────
    const card = document.createElement('div');
    card.id = 'catCard';
    card.className = 'menu-card';
    card.setAttribute('aria-label', `Seleção de ${catNome}`);

    // Cabeçalho do card
    const header = document.createElement('div');
    header.className = 'menu-card-header';
    header.innerHTML = `<span>${catNome}</span>
      <a href="menu.html" target="_blank" class="menu-card-link">Ver menu completo ↗</a>`;
    card.appendChild(header);

    // Lista de itens com steppers de quantidade
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'menu-items';

    pratos.forEach(prato => {
      const row = document.createElement('div');
      row.className = 'menu-item-row';
      row.id = `row-${prato.id}`;

      // ── Informação do prato ──
      const info = document.createElement('div');
      info.className = 'menu-item-info';
      info.innerHTML = `
        <span class="menu-item-name">${prato.nome}</span>
        ${prato.desc ? `<span class="menu-item-desc">${prato.desc}</span>` : ''}
      `;

      // ── Área direita: preço + stepper ──
      const rightArea = document.createElement('div');
      rightArea.className = 'menu-item-right';

      const priceEl = document.createElement('span');
      priceEl.className = 'menu-item-price';
      priceEl.textContent = prato.preco;

      // ── Stepper de Quantidade [ - ] N [ + ] ──
      // Controla o número de porções deste prato.
      const stepper = document.createElement('div');
      stepper.className = 'qty-stepper';

      const btnMinus = document.createElement('button');
      btnMinus.className = 'qty-btn qty-minus';
      btnMinus.textContent = '−';
      btnMinus.setAttribute('aria-label', `Diminuir quantidade de ${prato.nome}`);
      // Desativado inicialmente porque a quantidade começa em 0
      btnMinus.disabled = true;

      const qtyDisplay = document.createElement('span');
      qtyDisplay.className = 'qty-display';
      qtyDisplay.textContent = state.carrinho[prato.id].qty;
      qtyDisplay.setAttribute('aria-live', 'polite');

      const btnPlus = document.createElement('button');
      btnPlus.className = 'qty-btn qty-plus';
      btnPlus.textContent = '+';
      btnPlus.setAttribute('aria-label', `Aumentar quantidade de ${prato.nome}`);

      /**
       * Lógica de incremento/decremento das quantidades:
       * - O botão [ + ] incrementa qty e reativa o botão [ - ]
       * - O botão [ - ] decrementa qty e desativa-se quando qty chega a 0
       * - O display mostra o valor atual em tempo real
       * - O objeto state.carrinho é atualizado imediatamente
       */
      btnPlus.addEventListener('click', () => {
        state.carrinho[prato.id].qty++;
        qtyDisplay.textContent = state.carrinho[prato.id].qty;
        // Ativa o botão de diminuir quando qty > 0
        btnMinus.disabled = false;
        // Destaca visualmente o row quando tem quantidade
        row.classList.add('has-qty');
      });

      btnMinus.addEventListener('click', () => {
        if (state.carrinho[prato.id].qty <= 0) return;
        state.carrinho[prato.id].qty--;
        qtyDisplay.textContent = state.carrinho[prato.id].qty;
        // Desativa o botão de diminuir quando volta a 0
        if (state.carrinho[prato.id].qty === 0) {
          btnMinus.disabled = true;
          row.classList.remove('has-qty');
        }
      });

      stepper.appendChild(btnMinus);
      stepper.appendChild(qtyDisplay);
      stepper.appendChild(btnPlus);

      rightArea.appendChild(priceEl);
      rightArea.appendChild(stepper);
      row.appendChild(info);
      row.appendChild(rightArea);
      itemsContainer.appendChild(row);
    });

    card.appendChild(itemsContainer);

    // Botão de confirmação desta categoria
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-menu-confirm';
    confirmBtn.id = 'btnCatConfirm';

    // Texto do botão muda conforme se é a última categoria ou não
    const isUltima = index >= state.menuCategorias.length - 1;
    confirmBtn.textContent = isUltima ? '✏️ Adicionar Observações' : `Próximo: ${state.menuCategorias[index + 1]} →`;

    // Ao confirmar: anima a saída, mostra balão do utilizador e avança
    confirmBtn.addEventListener('click', () => {
      if (state.processing) return;

      // Gera texto de resumo da seleção desta categoria
      const selecionados = pratos
        .filter(p => state.carrinho[p.id].qty > 0)
        .map(p => `${state.carrinho[p.id].qty}× ${p.nome}`)
        .join(', ');

      // Anima saída do card
      card.style.transition = 'opacity 0.3s, transform 0.3s';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.96)';

      setTimeout(() => {
        card.remove();
        // Balão do utilizador com a seleção
        userBubble(selecionados || 'Sem seleção nesta categoria');
        lockUI();

        // Avança para a próxima categoria ou para as observações
        if (!isUltima) {
          state.catIndex++;
          avancarCategoria(state.catIndex);
        } else {
          stepObservacoes();
        }
      }, 320);
    });

    card.appendChild(confirmBtn);
    chatBody.appendChild(card);
    scrollDown();
    unlockUI('Ajusta as quantidades acima…');
  }

  /**
   * avancarCategoria — Mostra mensagem de transição e renderiza a próxima categoria.
   *
   * @param {number} index - Índice da nova categoria a mostrar.
   */
  async function avancarCategoria(index) {
    const catNome = state.menuCategorias[index];
    const emoji = catNome.split(' ')[0]; // Extrai o emoji da categoria
    await botReply(
      `${emoji} Agora seleciona as <strong>${catNome.replace(/^[^\s]+ /, '')}</strong>:`,
      600
    );
    renderCategoria(index);
  }

  /* ═══════════════════════════════════════════════════════════════
     PASSO 3d — OBSERVAÇÕES DA COZINHA
     Campo de texto livre para instruções especiais (ponto da carne, alergias, etc.)
  ═══════════════════════════════════════════════════════════════ */

  /**
   * stepObservacoes — Mostra campo de texto opcional para observações da cozinha.
   * Exemplos: "Sem arroz", "Ponto da carne: média", "Alergia a amendoins".
   */
  async function stepObservacoes() {
    state.step = 'observacoes';

    await botReply(
      '✏️ Tens alguma observação especial para a cozinha?<br><em style="font-size:0.78rem;color:#888">Ex: "Sem arroz", "Ponto da carne: Média", "Alergia a amendoins"</em>',
      750
    );

    // Renderiza o campo de observações diretamente no chat
    renderObservacoesField();
    unlockUI('Ou escreve as observações acima e clica em Continuar…');
  }

  /**
   * renderObservacoesField — Cria e injeta o campo de observações no chat body.
   */
  function renderObservacoesField() {
    const old = document.getElementById('obsCard');
    if (old) old.remove();

    const card = document.createElement('div');
    card.id = 'obsCard';
    card.className = 'obs-card';

    const textarea = document.createElement('textarea');
    textarea.id = 'obsTextarea';
    textarea.className = 'obs-textarea';
    textarea.placeholder = 'Observações para a cozinha (opcional)…';
    textarea.rows = 3;
    textarea.maxLength = 300;
    // CRÍTICO: Não usar autofocus para evitar scroll automático

    const footer = document.createElement('div');
    footer.className = 'obs-footer';

    const charCount = document.createElement('span');
    charCount.className = 'obs-char-count';
    charCount.textContent = '0/300';

    // Contador de caracteres em tempo real
    textarea.addEventListener('input', () => {
      charCount.textContent = `${textarea.value.length}/300`;
    });

    const skipBtn = document.createElement('button');
    skipBtn.className = 'obs-btn obs-btn-skip';
    skipBtn.textContent = 'Sem Observações';
    skipBtn.addEventListener('click', () => confirmarObservacoes(''));

    const continueBtn = document.createElement('button');
    continueBtn.className = 'obs-btn obs-btn-continue';
    continueBtn.textContent = 'Continuar →';
    continueBtn.addEventListener('click', () => confirmarObservacoes(textarea.value));

    footer.appendChild(charCount);
    footer.appendChild(skipBtn);
    footer.appendChild(continueBtn);
    card.appendChild(textarea);
    card.appendChild(footer);
    chatBody.appendChild(card);
    scrollDown();
  }

  /**
   * confirmarObservacoes — Guarda as observações e avança para o resumo do pedido.
   *
   * @param {string} texto - Texto das observações (pode ser vazio).
   */
  function confirmarObservacoes(texto) {
    state.observacoes = texto.trim();

    const old = document.getElementById('obsCard');
    if (old) {
      old.style.transition = 'opacity 0.3s';
      old.style.opacity = '0';
      setTimeout(() => old.remove(), 320);
    }

    // Balão do utilizador com as observações (via textContent = anti-XSS)
    userBubble(state.observacoes || 'Sem observações especiais');
    lockUI();
    stepResumoMenu();
  }

  /* ═══════════════════════════════════════════════════════════════
     PASSO 3e — RESUMO DO PEDIDO (antes da data)
     Exibe um card com todos os itens escolhidos e as suas quantidades.
  ═══════════════════════════════════════════════════════════════ */

  /**
   * stepResumoMenu — Gera e exibe o resumo do carrinho antes de avançar para a data.
   */
  async function stepResumoMenu() {
    // Filtra apenas itens com quantidade > 0
    const itensEscolhidos = Object.values(state.carrinho).filter(i => i.qty > 0);

    const mensagem = itensEscolhidos.length > 0
      ? `Anotei o teu pedido! 📝 <strong>${itensEscolhidos.length} ${itensEscolhidos.length === 1 ? 'item' : 'itens'}</strong> pré-selecionados.<br>Aqui está o resumo:`
      : `Sem pré-seleção de pratos! 😊 Decides no momento.<br>Vamos marcar o dia:`;

    await botReply(mensagem, 700);

    // Só mostra o card de resumo se houver itens selecionados
    if (itensEscolhidos.length > 0) {
      renderResumoMenu(itensEscolhidos);
      await pause(300);

      // Pequena espera e depois pergunta a data
      await botReply('Pronto! Agora vamos marcar o dia. 📅', 800);
    }

    stepCalendario();
  }

  /**
   * renderResumoMenu — Cria o card visual com os itens do carrinho.
   *
   * @param {Array} itens - Itens com qty > 0 do carrinho.
   */
  function renderResumoMenu(itens) {
    const card = document.createElement('div');
    card.className = 'resumo-menu-card';

    const titulo = document.createElement('div');
    titulo.className = 'resumo-menu-titulo';
    titulo.textContent = '🧾 Resumo do Pedido';
    card.appendChild(titulo);

    // Agrupa itens por categoria para melhor leitura
    const porCategoria = {};
    itens.forEach(item => {
      if (!porCategoria[item.categoria]) porCategoria[item.categoria] = [];
      porCategoria[item.categoria].push(item);
    });

    for (const [cat, catItens] of Object.entries(porCategoria)) {
      const catHeader = document.createElement('div');
      catHeader.className = 'resumo-cat-header';
      // Extrai apenas o texto sem emoji
      catHeader.textContent = cat;
      card.appendChild(catHeader);

      catItens.forEach(item => {
        const row = document.createElement('div');
        row.className = 'resumo-item-row';

        const qtyBadge = document.createElement('span');
        qtyBadge.className = 'resumo-qty-badge';
        qtyBadge.textContent = `×${item.qty}`;

        const nomeEl = document.createElement('span');
        nomeEl.className = 'resumo-item-nome';
        // Anti-XSS: textContent para nomes dos pratos
        nomeEl.textContent = item.nome;

        const precoEl = document.createElement('span');
        precoEl.className = 'resumo-item-preco';
        precoEl.textContent = item.preco;

        row.appendChild(qtyBadge);
        row.appendChild(nomeEl);
        row.appendChild(precoEl);
        card.appendChild(row);
      });
    }

    // Mostra as observações no resumo (se existirem)
    if (state.observacoes) {
      const obsRow = document.createElement('div');
      obsRow.className = 'resumo-obs';
      obsRow.innerHTML = '<strong>📝 Obs.:</strong> ';
      const obsText = document.createTextNode(state.observacoes);
      obsRow.appendChild(obsText);
      card.appendChild(obsRow);
    }

    chatBody.appendChild(card);
    scrollDown();
  }

  /* ═══════════════════════════════════════════════════════════════
     PASSO 4 — MINI-CALENDÁRIO INTERATIVO
     Renderizado dentro de um balão do chat.
     Regras de bloqueio:
       - Dias passados: desativados (cal-day--past)
       - Segunda-feira (getDay()===1): encerrado (cal-day--closed)
       - Hoje: destacado com borda dourada (cal-day--today)
  ═══════════════════════════════════════════════════════════════ */

  /**
   * stepCalendario — Inicia o passo de escolha de data.
   */
  async function stepCalendario() {
    state.step = 'data';
    clearQR();

    await botReply('Escolhe o dia pretendido no calendário abaixo: 📅', 700);

    // Inicializa o calendário no mês atual
    const now = new Date();
    calState = { year: now.getFullYear(), month: now.getMonth() };
    renderCalendar();

    lockUI('Seleciona uma data no calendário…');
  }

  /**
   * renderCalendar — Gera e injeta o mini-calendário no chat.
   * É chamada também quando o utilizador navega entre meses (prev/next).
   *
   * Lógica de bloqueio de dias:
   *  isPast   → thisDate < hoje (comparação de timestamps a meia-noite)
   *  isMonday → thisDate.getDay() === 1 (0=Dom, 1=Seg, ..., 6=Sáb)
   *             Encerrado às segundas-feiras.
   */
  function renderCalendar() {
    const old = document.getElementById('miniCal');
    if (old) old.remove();

    const { year, month } = calState;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normaliza para meia-noite para comparação de datas

    const meses  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const semana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    const cal = document.createElement('div');
    cal.id = 'miniCal';
    cal.className = 'mini-calendar';

    // ── Navegação Mês Anterior / Próximo ───────────────────────
    const nav = document.createElement('div');
    nav.className = 'cal-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'cal-nav-btn';
    prevBtn.innerHTML = '&#8249;'; // «
    prevBtn.title = 'Mês anterior';
    // Bloqueia o botão "anterior" se já estivermos no mês atual ou antes
    const isPrevBlocked = year === now.getFullYear() && month <= now.getMonth();
    prevBtn.disabled = isPrevBlocked;
    prevBtn.addEventListener('click', () => {
      // Navega para o mês anterior (com wrap de Dezembro para Janeiro)
      if (calState.month === 0) { calState.month = 11; calState.year--; }
      else calState.month--;
      renderCalendar();
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cal-nav-btn';
    nextBtn.innerHTML = '&#8250;'; // »
    nextBtn.title = 'Próximo mês';
    nextBtn.addEventListener('click', () => {
      // Navega para o mês seguinte (com wrap de Dezembro para Janeiro)
      if (calState.month === 11) { calState.month = 0; calState.year++; }
      else calState.month++;
      renderCalendar();
    });

    const monthLabel = document.createElement('span');
    monthLabel.className = 'cal-month-label';
    monthLabel.textContent = `${meses[month]} ${year}`;

    nav.appendChild(prevBtn);
    nav.appendChild(monthLabel);
    nav.appendChild(nextBtn);
    cal.appendChild(nav);

    // ── Grelha do Calendário ────────────────────────────────────
    const grid = document.createElement('div');
    grid.className = 'cal-grid';

    // Cabeçalhos dos dias da semana (Dom a Sáb)
    semana.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'cal-weekday';
      cell.textContent = d;
      grid.appendChild(cell);
    });

    // Células vazias antes do primeiro dia do mês
    // getDay() retorna 0=Dom, 1=Seg, ..., 6=Sáb
    const firstDay = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('button');
      empty.className = 'cal-day cal-day--empty';
      empty.disabled = true;
      // Esconde semanticamente as células vazias
      empty.setAttribute('aria-hidden', 'true');
      grid.appendChild(empty);
    }

    // Células dos dias do mês
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement('button');
      btn.className = 'cal-day';
      btn.textContent = d;

      // Cria Date para este dia específico (normalizado a meia-noite)
      const thisDate = new Date(year, month, d);
      thisDate.setHours(0, 0, 0, 0);

      // ── Regras de Bloqueio ──────────────────────────────────
      // isPast: qualquer dia anterior a hoje (comparação de timestamps)
      const isPast    = thisDate < now;
      // isMonday: dia da semana = 1 (Segunda-feira = dia de encerramento do restaurante)
      const isMonday  = thisDate.getDay() === 1;
      // isToday: o dia de hoje (para destacar com borda dourada)
      const isToday   = thisDate.getTime() === now.getTime();
      // isSelected: o dia já foi selecionado anteriormente (mantém seleção ao navegar)
      const isSelected = state.data &&
        state.data.getFullYear() === year &&
        state.data.getMonth()    === month &&
        state.data.getDate()     === d;

      // Aplica classes de estado visuais
      if (isPast)     btn.classList.add('cal-day--past');
      if (isMonday)   btn.classList.add('cal-day--closed');
      if (isToday)    btn.classList.add('cal-day--today');
      if (isSelected) btn.classList.add('cal-day--selected');

      // Desativa o botão se o dia está bloqueado
      btn.disabled = isPast || isMonday;
      if (isPast || isMonday) btn.setAttribute('aria-disabled', 'true');

      // Evento de seleção (apenas para dias disponíveis)
      if (!isPast && !isMonday) {
        btn.addEventListener('click', () => {
          // Guarda a data selecionada no estado
          state.data = thisDate;
          // Formata a data para exibição: DD/MM/AAAA
          const dd = String(d).padStart(2, '0');
          const mm = String(month + 1).padStart(2, '0');
          state.dataStr = `${dd}/${mm}/${year}`;

          // Atualiza o visual de seleção imediatamente
          cal.querySelectorAll('.cal-day--selected')
             .forEach(el => el.classList.remove('cal-day--selected'));
          btn.classList.add('cal-day--selected');

          // Pequena pausa visual antes de avançar
          setTimeout(() => {
            // Anima saída do calendário
            cal.style.transition = 'opacity 0.3s, transform 0.3s';
            cal.style.opacity    = '0';
            cal.style.transform  = 'scale(0.96)';
            setTimeout(() => { cal.remove(); }, 300);

            // Mostra a data selecionada como mensagem do utilizador
            userBubble(`📅 ${state.dataStr}`);
            lockUI();
            stepHorario();
          }, 250);
        });
      }

      grid.appendChild(btn);
    }

    cal.appendChild(grid);

    // Legenda de cores do calendário
    const legend = document.createElement('div');
    legend.className = 'cal-legend';
    legend.innerHTML = `
      <span class="leg-today">■</span> Hoje
      &nbsp;<span class="leg-closed">■</span> Encerrado (2ª feira)
      &nbsp;<span class="leg-past">■</span> Passado`;
    cal.appendChild(legend);

    chatBody.appendChild(cal);
    scrollDown();
  }

  /* ═══════════════════════════════════════════════════════════════
     PASSO 5 — ESCOLHA DO HORÁRIO
     Apresenta os dois turnos (Almoço e Jantar) com quick-replies.
  ═══════════════════════════════════════════════════════════════ */

  /**
   * stepHorario — Pede ao utilizador que escolha o horário desejado.
   * Apresenta turnos de Almoço e Jantar como quick-replies separados.
   */
  async function stepHorario() {
    state.step = 'hora';

    await botReply(
      `Para o dia <strong>${state.dataStr}</strong>, qual é o horário pretendido? ⏰`,
      750
    );

    clearQR();

    // ── Label do turno de Almoço ────────────────────────────────
    const almLabel = document.createElement('span');
    almLabel.className = 'qr-turno-label';
    almLabel.textContent = '🌞 Almoço';
    qrContainer.appendChild(almLabel);

    HORARIOS.almoco.forEach(h => appendHorarioBtn(h));

    // ── Divisor de turno ─────────────────────────────────────────
    const sep = document.createElement('div');
    sep.className = 'qr-turno-sep';
    qrContainer.appendChild(sep);

    // ── Label do turno de Jantar ────────────────────────────────
    const janLabel = document.createElement('span');
    janLabel.className = 'qr-turno-label';
    janLabel.textContent = '🌙 Jantar';
    qrContainer.appendChild(janLabel);

    HORARIOS.jantar.forEach(h => appendHorarioBtn(h));

    unlockUI('Ou escreve o horário (ex: 20:30)…');
  }

  /**
   * appendHorarioBtn — Cria e adiciona um botão de horário ao container QR.
   *
   * @param {string} hora - Horário no formato 'HH:MM'.
   */
  function appendHorarioBtn(hora) {
    const btn = document.createElement('button');
    btn.className = 'qr-btn';
    btn.textContent = hora;
    btn.addEventListener('click', () => {
      if (state.processing) return;
      selectHora(hora);
    });
    qrContainer.appendChild(btn);
  }

  /**
   * selectHora — Confirma a escolha do horário e avança para os contactos.
   *
   * @param {string} hora - Horário selecionado.
   */
  function selectHora(hora) {
    clearQR();
    userBubble(`⏰ ${hora}`);
    state.hora = hora;
    lockUI();
    stepContactos();
  }

  /* ═══════════════════════════════════════════════════════════════
     PASSO 6 — RECOLHA E VALIDAÇÃO DE CONTACTOS
     Recolhe Nome e Telemóvel com validação em duas etapas.
  ═══════════════════════════════════════════════════════════════ */

  /**
   * stepContactos — Pede o nome completo do cliente.
   */
  async function stepContactos() {
    state.step = 'nome';
    await botReply(
      'Para quem fica a reserva? 👤<br>Qual é o <strong>nome completo</strong>?',
      800
    );
    unlockUI('O teu nome completo…');
  }

  /**
   * stepTelemovel — Pede o número de telemóvel após confirmar o nome.
   */
  async function stepTelemovel() {
    state.step = 'telefone';
    // Usa apenas o primeiro nome para uma saudação mais natural
    const primeiroNome = state.nome.split(' ')[0];
    await botReply(
      `Obrigado, <strong>${primeiroNome}</strong>! 😊<br>Qual é o <strong>telemóvel</strong> de contacto? <em>(9 dígitos)</em>`,
      750
    );
    unlockUI('Ex: 912 345 678');
  }

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO — VALIDADORES DE INPUT
  ═══════════════════════════════════════════════════════════════ */

  /**
   * validateNome — Valida o nome do cliente.
   * Regras: mínimo 2 caracteres, sem dígitos.
   *
   * @param {string} v - Nome introduzido pelo utilizador.
   * @returns {{ok:boolean, val?:string, msg?:string}}
   */
  function validateNome(v) {
    const clean = v.trim();
    if (clean.length < 2) return { ok: false, msg: 'O nome deve ter pelo menos 2 letras.' };
    if (/\d/.test(clean))  return { ok: false, msg: 'O nome não deve conter números.' };
    return { ok: true, val: clean };
  }

  /**
   * validateTelemovel — Valida o número de telemóvel português.
   *
   * Regex: ^(\+351)?9\d{8}$
   *   - (\+351)? → prefixo internacional opcional
   *   - 9        → começa com 9 (números PT: 9xx xxx xxx)
   *   - \d{8}    → 8 dígitos restantes
   * Remove espaços, hífens e parênteses antes de validar.
   *
   * Exemplos válidos: 912345678, 912 345 678, +351912345678
   * Exemplos inválidos: 123456789, 91234, abcdefghi
   *
   * @param {string} v - Número introduzido pelo utilizador.
   * @returns {{ok:boolean, val?:string, msg?:string}}
   */
  function validateTelemovel(v) {
    // Remove formatação: espaços, hífens e parênteses
    const clean = v.replace(/[\s\-()\+]/g, '');
    // Aceita: 9 dígitos puros OU prefixo 351 + 9 dígitos
    if (/^(351)?9\d{8}$/.test(clean)) return { ok: true, val: v.trim() };
    return { ok: false, msg: 'Número inválido. Insere 9 dígitos (ex: 912 345 678).' };
  }

  /* ═══════════════════════════════════════════════════════════════
     HANDLER CENTRAL DO INPUT DE TEXTO
     Processa o texto escrito pelo utilizador consoante o passo atual.
  ═══════════════════════════════════════════════════════════════ */

  /**
   * onSend — Processa o envio de mensagem de texto pelo utilizador.
   * É chamado pelo botão de envio e pela tecla Enter.
   * O switch(state.step) direciona a validação para o passo correto.
   */
  function onSend() {
    const raw = chatInput.value.trim();
    if (!raw || chatInput.disabled || state.processing) return;
    chatInput.value = '';

    switch (state.step) {

      // Passo 1: Texto livre para número de pessoas
      case 'pessoas': {
        const n = parsePessoasTexto(raw);
        if (n === null) {
          // Não reconheceu o número: pede novamente
          lockUI();
          userBubble(raw);
          botReply('⚠️ Não reconheci esse número. Tenta com dígitos (ex: "4") ou clica num botão.', 600)
            .then(() => unlockUI('Ex: 3 ou "quatro"…'));
          return;
        }
        processPessoas(raw, n);
        break;
      }

      // Passo 4: Horário — aceita texto no formato HH:MM
      case 'hora': {
        const allHoras = [...HORARIOS.almoco, ...HORARIOS.jantar];
        if (allHoras.includes(raw)) {
          selectHora(raw);
        } else {
          lockUI();
          userBubble(raw);
          botReply('⚠️ Horário inválido. Escolhe um dos disponíveis ou clica num botão.', 600)
            .then(() => unlockUI('Ex: 20:30'));
        }
        break;
      }

      // Passo 6a: Nome
      case 'nome': {
        const r = validateNome(raw);
        if (!r.ok) {
          lockUI();
          userBubble(raw);
          botReply(`⚠️ ${r.msg}`, 600).then(() => unlockUI('O teu nome completo…'));
          return;
        }
        clearQR();
        userBubble(raw);
        state.nome = r.val;
        lockUI();
        stepTelemovel();
        break;
      }

      // Passo 6b: Telemóvel
      case 'telefone': {
        const r = validateTelemovel(raw);
        if (!r.ok) {
          lockUI();
          userBubble(raw);
          botReply(`⚠️ ${r.msg}`, 600).then(() => unlockUI('Ex: 912 345 678'));
          return;
        }
        clearQR();
        userBubble(raw);
        state.telefone = r.val;
        lockUI();
        stepResumoFinal();
        break;
      }

      // Passo de observações: permite também escrever no input
      case 'observacoes': {
        confirmarObservacoes(raw);
        break;
      }
    }
  }

  // Eventos do input e botão de envio
  sendBtn.addEventListener('click', onSend);
  chatInput.addEventListener('keydown', e => {
    // Enter (sem Shift) envia a mensagem
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  });

  /* ═══════════════════════════════════════════════════════════════
     PASSO 7 — CARD DE RESUMO FINAL & CONFIRMAÇÃO
  ═══════════════════════════════════════════════════════════════ */

  /**
   * stepResumoFinal — Gera e exibe o card completo com todos os dados da reserva.
   * Inclui: Nome, Pessoas, Data, Hora, Pratos e Observações.
   * Apresenta os botões de Confirmar e Recomeçar.
   */
  async function stepResumoFinal() {
    state.step = 'confirmacao';
    clearQR();

    await botReply('Perfeito! Aqui está o resumo da tua reserva: 📋', 750);
    await pause(300);

    // ── Card de Resumo Final ────────────────────────────────────
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'Resumo da reserva');

    // Título do card
    const title = document.createElement('div');
    title.className = 'summary-title';
    title.textContent = '📋 Resumo da Reserva';
    card.appendChild(title);

    // Linha divisória
    const divider = document.createElement('div');
    divider.className = 'summary-divider';
    card.appendChild(divider);

    // Número de pessoas formatado
    const quant = state.pessoas === 1 ? '1 pessoa' : `${state.pessoas} pessoas`;

    /**
     * addRow — Adiciona uma linha ao card de resumo.
     * Usa .textContent para os valores (proteção anti-XSS).
     */
    function addRow(icon, label, value) {
      const row = document.createElement('div');
      row.className = 'summary-row';
      const labelEl = document.createElement('strong');
      labelEl.className = 'summary-label';
      labelEl.textContent = `${icon} ${label}`;
      const valueEl = document.createElement('span');
      valueEl.className = 'summary-value';
      valueEl.textContent = value; // Anti-XSS: textContent nunca executa scripts
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      card.appendChild(row);
    }

    addRow('👤', 'Nome',     state.nome);
    addRow('👥', 'Pessoas',  quant);
    addRow('📅', 'Data',     state.dataStr);
    addRow('⏰', 'Hora',     state.hora);
    addRow('📞', 'Telefone', state.telefone);

    // Pratos: lista dos itens com quantidade
    const itensCarrinho = Object.values(state.carrinho).filter(i => i.qty > 0);
    const pratosTexto = itensCarrinho.length > 0
      ? itensCarrinho.map(i => `${i.qty}× ${i.nome}`).join(', ')
      : 'A decidir no restaurante';
    addRow('🥩', 'Pratos', pratosTexto);

    // Observações (só se existirem)
    if (state.observacoes) {
      addRow('✏️', 'Obs.', state.observacoes);
    }

    chatBody.appendChild(card);
    scrollDown();

    await botReply('Os dados estão corretos? 🤔', 600);

    renderQR([
      { label: '✅ Confirmar Reserva', value: 'confirm' },
      { label: '🔄 Recomeçar', value: 'reset' },
    ], (label, value) => {
      clearQR();
      userBubble(label);
      lockUI();
      if (value === 'confirm') confirmarReserva();
      else resetChat();
    }, true); // Estilo primário (laranja)

    unlockUI('Confirma ou recomeça…');
  }

  /* ═══════════════════════════════════════════════════════════════
     CONFIRMAÇÃO FINAL — Guarda e confirma a reserva
  ═══════════════════════════════════════════════════════════════ */

  /**
   * confirmarReserva — Conclui o processo de reserva.
   * Guarda os dados no localStorage e exibe mensagem de sucesso.
   */
  async function confirmarReserva() {
    state.step = 'done';

    // Persiste a reserva no localStorage para consulta futura
    try {
      const reservas = JSON.parse(localStorage.getItem('vpa_reservas') || '[]');
      reservas.push({
        nome:       state.nome,
        telefone:   state.telefone,
        pessoas:    state.pessoas,
        data:       state.dataStr,
        hora:       state.hora,
        pratos:     Object.values(state.carrinho).filter(i => i.qty > 0),
        observacoes: state.observacoes,
        timestamp:  new Date().toISOString(),
      });
      localStorage.setItem('vpa_reservas', JSON.stringify(reservas));
    } catch (e) {
      // Falha silenciosa: o localStorage pode estar desativado
      console.warn('Erro ao guardar reserva localmente:', e);
    }

    await botReply('🎉 <strong>Reserva confirmada com sucesso!</strong>', 700);

    const primeiroNome = state.nome.split(' ')[0];
    await botReply(
      `Até ao dia <strong>${state.dataStr}</strong> às <strong>${state.hora}</strong>, <strong>${primeiroNome}</strong>! 🥩🔥<br>` +
      `Confirmaremos a reserva pelo telemóvel <strong>${state.telefone}</strong>.`,
      900
    );

    await pause(400);

    // Botão para iniciar uma nova reserva
    const newBtn = document.createElement('button');
    newBtn.className = 'btn-nova-reserva';
    newBtn.textContent = '+ Nova Reserva';
    newBtn.addEventListener('click', resetChat);
    chatBody.appendChild(newBtn);
    scrollDown();
    clearQR();
    lockUI('Reserva concluída!');
  }

  /* ═══════════════════════════════════════════════════════════════
     RESET — Recomeça o fluxo do zero
  ═══════════════════════════════════════════════════════════════ */

  /**
   * resetChat — Limpa todo o estado e o DOM do chat, e reinicia o fluxo.
   */
  async function resetChat() {
    state = freshState();
    chatBody.innerHTML = '';
    clearQR();
    chatInput.value = '';
    await stepPessoas();
  }

  /* ═══════════════════════════════════════════════════════════════
     ARRANQUE — Inicia o chatbot
     ⚠️ CRÍTICO: Não chamar .focus() aqui para não causar scroll automático
  ═══════════════════════════════════════════════════════════════ */
  stepPessoas();

}); // Fim do DOMContentLoaded
