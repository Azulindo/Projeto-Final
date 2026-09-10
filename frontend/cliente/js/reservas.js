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
 *  ✓ Input do utilizador nunca entra em HTML sem passar por escaparHTML();
 *    onde dá, usa-se .textContent, que é mais seguro ainda
 *    (esta linha dizia que era "sempre .textContent" — não era: duas
 *     mensagens punham o nome do cliente dentro de innerHTML. Corrigido
 *     a 03/09, era o problema X-01 da lista do João.)
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
      dataStr: '',          // Data formatada 'DD/MM/AAAA', para mostrar
      dataISO: '',          // A mesma data em 'AAAA-MM-DD', para a API
      horarios: [],         // Slots do servidor: { hora, livres, disponivel }
      hora: '',             // Hora escolhida ('20:00')
      nome: '',             // Nome completo do cliente
      telefone: '',         // Número de telemóvel
      codigo: '',           // Código da reserva — vem do servidor (C-09)
      valorEstimado: null,  // Também do servidor, quando há pré-escolha
      processing: false,    // Bloqueio anti-spam: true quando o bot está a processar
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     SECÇÃO 3 — A EMENTA, VINDA DA API (C-09)
     ═══════════════════════════════════════════════════════════════
     ── AQUI ESTAVAM 25 PRODUTOS ESCRITOS À MÃO ────────────────────
     Nome, descrição e preço de cada um, copiados da ementa. Estiveram
     certos até 10/09 — comparei os 25 com o `seed.sql` e batiam todos.
     Isso não era garantia, era sorte com data de validade:

       · até ao B-61, um preço só mudava editando o `seed.sql`, e quem
         editasse o seed provavelmente lembrava-se deste ficheiro;
       · desde o B-61, um preço muda no ecrã de Produtos, por uma
         pessoa que não tem razão nenhuma para saber que estes 25
         existem.

     O separador foi instalado na manhã de 10/09. Os 25 batiam porque
     nada os tinha separado ainda — não porque houvesse algo a
     mantê-los juntos. É a mesma forma da ordem da ementa escrita à mão
     no endpoint das categorias (apanhada na F-51) e do stock lido de
     dois sítios (fechado no B-61): duas cópias, uma corrige-se, a
     outra fica.

     ── E OS IDs ERAM FALSOS ───────────────────────────────────────
     Havia uma segunda razão, mais dura: os ids eram `en1`, `pp3`,
     `be7a` — inventados aqui. O `POST /reservas` grava `ITEM_RESERVA`
     com o `produtoId` REAL da base, portanto uma pré-seleção feita com
     estes ids não podia sequer ser enviada. O ecrã só funcionava
     enquanto a reserva não saísse do browser.

     Agora vem tudo do `GET /produtos` e do `GET /categorias`: os
     mesmos endpoints que a `menu.html`, a `mesa.html` e a
     `takeaway.html` usam. Sem lista de reserva escrita à mão — com
     `?simular=1` o `api.js` devolve o catálogo de demonstração, que é
     a mesma fonte única, e é isso que cobre o plano B sem rede.
     ═══════════════════════════════════════════════════════════════ */

  /* Emoji de cada categoria, para o cabeçalho do passo. É a única
     coisa que fica escrita aqui, e é de propósito: um emoji não é um
     dado da ementa, é decoração deste ecrã. Categoria que apareça na
     API e não esteja aqui leva 🍽️ e funciona igual. */
  const EMOJI_CATEGORIA = {
    'Entradas': '🥗', 'Pratos Principais': '🥩', 'Bebidas': '🍺', 'Sobremesas': '🍮',
  };

  /* Preenchidos pelo `carregarEmenta()`, no arranque. Vazios até lá —
     e o fluxo da pré-seleção não abre antes de estarem prontos. */
  let MENU = {};
  let CATEGORIAS_SEQUENCIAIS = [];
  let ementaCarregada = false;

  /** Formata como a ementa sempre mostrou: "15,50€". */
  function precoTexto(valor) {
    return Number(valor).toFixed(2).replace('.', ',') + '€';
  }

  /**
   * carregarEmenta — Traz os produtos e as categorias da API.
   *
   * A ordem das categorias é a do servidor (o campo `ordem`, que o ecrã
   * de gestão edita) e não uma lista daqui — foi exatamente esse o erro
   * apanhado na F-51, em que reordenar na gestão não mudava nada no
   * site porque o cliente tinha a ordem escrita à mão.
   *
   * O `id` de cada prato passa a ser o `id_produto` da base. Isso faz
   * com que o `state.carrinho` fique com as chaves certas para o
   * `POST /reservas` sem nenhuma tradução pelo meio.
   */
  async function carregarEmenta() {
    if (ementaCarregada) return;

    const [produtos, categorias] = await Promise.all([
      chamarAPI('produtos'),
      chamarAPI('categorias').catch(function () { return []; }),
    ]);

    const activos = (Array.isArray(produtos) ? produtos : [])
      .filter(p => p.ativo !== false && p.disponivel !== false);

    if (!activos.length) throw new Error('A ementa veio vazia.');

    const comProdutos = new Set(activos.map(p => p.categoria));
    const ordenadas = Array.isArray(categorias) && categorias.length
      ? categorias.filter(c => comProdutos.has(c.nome)).map(c => c.nome)
      : [...comProdutos];

    MENU = {};
    ordenadas.forEach(function (nome) {
      const rotulo = `${EMOJI_CATEGORIA[nome] || '🍽️'} ${nome}`;
      MENU[rotulo] = activos
        .filter(p => p.categoria === nome)
        .map(p => ({
          id: p.id,                       // o id_produto REAL
          nome: p.nome,
          desc: p.descricao || '',
          preco: precoTexto(p.preco),     // texto, como o resto do ecrã espera
          precoNum: Number(p.preco),
        }));
    });

    CATEGORIAS_SEQUENCIAIS = Object.keys(MENU);
    ementaCarregada = true;
  }


  /* Horários disponíveis por turno */
  const HORARIOS = {
    almoco: ['12:00', '12:30', '13:00', '13:30', '14:00'],
    jantar: ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'],
  };

  /* Antecedência máxima aceite para uma reserva (F-32).
     O restaurante não aceita marcações para lá deste horizonte — o
     calendário bloqueia tudo o que passe daqui. */
  const MAX_DIAS_ANTECEDENCIA = 60;

  /* Código de reserva mostrado ao cliente no fim (F-37), ex.: RSV-7K2M9.
     Enquanto não há backend é gerado aqui; quando o POST /api/reservas
     existir, passa a vir do servidor (ver docs/API.md secção 4.5). */
  const PREFIXO_CODIGO_RESERVA = 'RSV';

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
  function scrollDown(elemento) {
    // Ir sempre ao fundo funciona para balões de conversa, que são
    // baixos. Mas os cartões altos — a ementa de uma categoria, o
    // calendário, o resumo final — ficam com o TOPO cortado: o cliente
    // aterra a meio da coisa que acabou de aparecer e tem de subir para
    // perceber o que está a ver.
    //
    // Se o que acabou de entrar não cabe no ecrã, alinha-se o topo dele.
    // Se cabe, mantém-se o comportamento de sempre.
    if (elemento && elemento.offsetHeight > chatBody.clientHeight - 24) {
      chatBody.scrollTop = elemento.offsetTop - 12;
      return;
    }
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
   * apenasBotoes — Passos em que só se responde clicando.
   *
   * O `unlockUI()` reativa a caixa de escrita, e havia três passos (a
   * escolha de pedir ou não, a ementa, e a confirmação final) onde ela
   * ficava ligada mas o `onSend()` não tinha nada para fazer com o que
   * lá se escrevesse: a mensagem desaparecia sem resposta nenhuma.
   *
   * Uma caixa em que se pode escrever e onde escrever não faz nada é
   * pior do que uma caixa desligada — quem escreve fica à espera. Aqui
   * desliga-se a escrita e deixam-se os botões a funcionar, com o
   * placeholder a dizer porquê.
   *
   * @param {string} placeholder - Porque é que a escrita está desligada.
   */
  function apenasBotoes(placeholder) {
    chatInput.disabled = true;
    sendBtn.disabled   = true;
    chatInput.placeholder = placeholder;
    chatInput.value  = '';
    state.processing = false;   // os botões continuam a responder
    qrContainer.querySelectorAll('.qr-btn').forEach(b => { b.disabled = false; });
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
  /**
   * escaparHTML — Torna texto do utilizador seguro dentro de HTML.
   *
   * O `botReply()` escreve com innerHTML, de propósito: as mensagens do
   * bot têm <strong>, <br> e <em>, e é isso que lhes dá forma. Mas duas
   * dessas mensagens metiam o NOME do cliente lá dentro — e o nome vem
   * de uma caixa de texto. Um nome como `Ana<iframe srcdoc=…>` deixava
   * de ser um nome e passava a ser código na página.
   *
   * O `validateNome()` não chega para isto: só recusa números e nomes
   * com menos de duas letras. `<b>` passa à vontade.
   *
   * Regra daqui para a frente: se um valor veio do cliente e vai parar a
   * uma string com HTML, passa por aqui primeiro. Onde der para usar
   * `textContent` (como no userBubble aqui em baixo), usa-se isso, que é
   * melhor ainda — não há nada para esquecer de escapar.
   */
  function escaparHTML(valor) {
    const d = document.createElement('div');
    d.textContent = String(valor ?? '');
    return d.innerHTML;
  }

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
      { label: '🎉 Somos mais', value: 'mais' },
    ], (label, value) => {
      // "Somos mais" PERGUNTA quantos, não assume.
      //
      // Antes este botão mandava 99, o que caía direito na regra dos
      // grupos e despachava a pessoa para o telefone. Quem fosse 7, 8, 9
      // ou 10 ficava sem caminho — apesar de a própria mensagem dizer
      // que só acima de 10 é que era por telefone. E quem escrevesse "8"
      // à mão conseguia reservar: o botão e o texto não diziam o mesmo.
      if (value === 'mais') {
        clearQR();
        userBubble(label);
        lockUI();
        botReply('Quantas pessoas são ao certo? 🤔', 650)
          .then(() => unlockUI('Ex: 8'));
        return;
      }
      processPessoas(label, parseInt(value, 10));
    });

    unlockUI('Ex: 3 ou "quatro"…');
  }

  /**
   * processPessoas — Valida e avança com o número de pessoas.
   * Acima de 10, a reserva é por telefone.
   *
   * @param {string} rawLabel - Texto mostrado no balão do utilizador.
   * @param {number} n        - Número de pessoas.
   */
  async function processPessoas(rawLabel, n) {
    clearQR();
    userBubble(rawLabel);
    lockUI();

    // Grupos com mais de 10: reserva por telefone. A condição é só o
    // número — a bandeira 99 desapareceu com o botão que a enviava.
    if (n > 10) {
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

    apenasBotoes('Escolhe uma das opções acima 👆');
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
    /* A ementa vem da API (C-09) e pode demorar: o Render adormece ao
       fim de 15 minutos e o pedido que o acorda leva quase um minuto.
       Diz-se que se está a buscar, em vez de deixar o ecrã parado —
       é a mesma decisão da F-26 na `menu.html`. */
    if (!ementaCarregada) {
      await botReply('Vou buscar a ementa… 📖', 400);
      try {
        await carregarEmenta();
      } catch (erro) {
        /* Sem ementa não há pré-seleção possível: os preços e os ids
           dos produtos vêm todos de lá. Em vez de mostrar uma lista
           vazia, manda-se a pessoa pelo caminho que não precisa dela —
           escolher à mesa — que é uma reserva perfeitamente válida. */
        await botReply(
          '😕 Não consegui abrir a ementa agora. Fazemos a reserva sem pré-escolha — '
          + 'escolhem à mesa, que é como a maioria faz.',
          700
        );
        state.opcaoMenu = 'restaurante';
        return stepCalendario();
      }
    }

    // Inicializa as categorias ANTES da mensagem: o texto anuncia a
    // primeira categoria e tem de dizer a verdadeira. (Antes estava
    // escrito "Pratos Principais" à mão e mostrava as Entradas.)
    state.menuCategorias = CATEGORIAS_SEQUENCIAIS.slice();
    state.catIndex = 0;

    const primeira = nomeSemEmoji(state.menuCategorias[0]);
    await botReply(
      `🔥 Ótima escolha! Vamos ver o nosso menu por partes.<br>Começa pelas <strong>${primeira}</strong> 👇`,
      800
    );

    renderCategoria(state.catIndex);
  }

  /** nomeSemEmoji — '🥗 Entradas' → 'Entradas' */
  function nomeSemEmoji(nome) {
    return String(nome).replace(/^[^\s]+\s/, '');
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
    // Indicador de progresso (F-38): saber quantas páginas faltam evita
    // a sensação de "isto nunca mais acaba" a meio da ementa.
    header.innerHTML = `<span>${catNome}</span>
      <span class="menu-card-progresso">${index + 1}/${state.menuCategorias.length}</span>
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

    // Navegação (F-40): a partir da 2.ª categoria dá para recuar e
    // corrigir uma quantidade. As escolhas não se perdem — ficam em
    // state.carrinho, que sobrevive à mudança de categoria.
    const navegacao = document.createElement('div');
    navegacao.className = 'menu-card-nav';

    if (index > 0) {
      const voltarBtn = document.createElement('button');
      voltarBtn.className = 'btn-menu-voltar';
      voltarBtn.type = 'button';
      voltarBtn.textContent = `◀ ${nomeSemEmoji(state.menuCategorias[index - 1])}`;
      voltarBtn.addEventListener('click', () => {
        if (state.processing) return;
        state.catIndex = index - 1;
        renderCategoria(state.catIndex);
        scrollDown();
      });
      navegacao.appendChild(voltarBtn);
    }

    navegacao.appendChild(confirmBtn);
    card.appendChild(navegacao);

    chatBody.appendChild(card);
    scrollDown(card);
    apenasBotoes('Ajusta as quantidades no cartão acima 👆');
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
    scrollDown(card);
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

    // ── Total estimado ──────────────────────────────────────────
    const total = calcularTotal(itens);
    if (total > 0) {
      const dividerTotal = document.createElement('div');
      dividerTotal.className = 'resumo-total-divider';
      card.appendChild(dividerTotal);

      const totalRow = document.createElement('div');
      totalRow.className = 'resumo-total-row';

      const totalLabel = document.createElement('span');
      totalLabel.className = 'resumo-total-label';
      totalLabel.textContent = '💰 Total Estimado';

      const totalValue = document.createElement('span');
      totalValue.className = 'resumo-total-value';
      totalValue.textContent = formatarPreco(total);

      totalRow.appendChild(totalLabel);
      totalRow.appendChild(totalValue);
      card.appendChild(totalRow);
    }

    chatBody.appendChild(card);
    scrollDown(card);
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

    // Janela de reservas aceite (F-32 / B-43): de amanhã até 60 dias.
    // Hoje não entra: às 15h já não faz sentido marcar mesa para as 12h.
    const minimo = new Date(now);
    minimo.setDate(minimo.getDate() + 1);

    const limite = new Date(now);
    limite.setDate(limite.getDate() + MAX_DIAS_ANTECEDENCIA);

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
    // Bloqueia o "seguinte" se o mês a seguir já cai todo fora do limite de 60 dias
    const primeiroDiaMesSeguinte = new Date(year, month + 1, 1);
    nextBtn.disabled = primeiroDiaMesSeguinte > limite;
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
      // isPast: hoje e qualquer dia anterior — as reservas começam amanhã
      const isPast    = thisDate < minimo;
      // isMonday: dia da semana = 1 (Segunda-feira = dia de encerramento do restaurante)
      const isMonday  = thisDate.getDay() === 1;
      // isTooFar: para lá da antecedência máxima aceite (F-32)
      const isTooFar  = thisDate > limite;
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
      if (isTooFar)   btn.classList.add('cal-day--far');
      if (isToday)    btn.classList.add('cal-day--today');
      if (isSelected) btn.classList.add('cal-day--selected');

      // Desativa o botão se o dia está bloqueado
      const bloqueado = isPast || isMonday || isTooFar;
      btn.disabled = bloqueado;
      if (bloqueado) btn.setAttribute('aria-disabled', 'true');
      if (isTooFar) btn.title = `Só aceitamos reservas até ${MAX_DIAS_ANTECEDENCIA} dias de antecedência.`;

      // Evento de seleção (apenas para dias disponíveis)
      if (!bloqueado) {
        btn.addEventListener('click', () => {
          // Guarda a data selecionada no estado
          state.data = thisDate;
          // Formata a data para exibição: DD/MM/AAAA
          const dd = String(d).padStart(2, '0');
          const mm = String(month + 1).padStart(2, '0');
          state.dataStr = `${dd}/${mm}/${year}`;
          /* A API pede AAAA-MM-DD (C-09). Constrói-se dos mesmos
             números e NÃO com `toISOString()`: esse converte para UTC,
             e uma data escolhida à noite em Portugal no verão saía o dia
             anterior. É o mesmo género de erro do fuso que o João
             encontrou no back-end — só que aqui bastava um dia de
             diferença para a reserva ir para a véspera. */
          state.dataISO = `${year}-${mm}-${dd}`;

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
      &nbsp;<span class="leg-past">■</span> Indisponível
      &nbsp;<span class="leg-far">■</span> Mais de ${MAX_DIAS_ANTECEDENCIA} dias
      <span class="cal-nota">Reservas de amanhã até ${MAX_DIAS_ANTECEDENCIA} dias.</span>`;
    cal.appendChild(legend);

    chatBody.appendChild(cal);
    scrollDown(cal);
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

    /* ── AS HORAS VÊM DO SERVIDOR (C-09) ─────────────────────────
       Antes eram duas listas escritas à mão aqui, e todas as horas
       pareciam livres sempre. Uma pessoa escolhia as 20:00 de um sábado
       cheio, dava o nome e o telemóvel, e só levava a recusa no fim —
       depois de escrever tudo.

       O `GET /reservas/horarios?data=` traz `livres` e `disponivel` por
       slot, e as cheias aparecem cinzentas e não se podem carregar. A
       recusa passa a estar no sítio onde a decisão se toma.

       Se a consulta falhar, mostram-se as horas todas: mais vale
       arriscar uma recusa no fim do que impedir a reserva por o
       servidor estar a acordar. */
    let slots = [];
    try {
      slots = await chamarAPI(`reservas/horarios?data=${encodeURIComponent(state.dataISO)}`);
    } catch (erro) {
      slots = [];
    }
    state.horarios = Array.isArray(slots) ? slots : [];

    if (state.horarios.length) {
      const porPeriodo = { almoco: [], jantar: [] };
      state.horarios.forEach(function (s) {
        const p = /almo/i.test(s.periodo || '') ? 'almoco' : 'jantar';
        porPeriodo[p].push(s);
      });

      const cheios = state.horarios.filter(s => !s.disponivel).length;
      if (cheios && cheios < state.horarios.length) {
        await botReply(
          `Há ${cheios === 1 ? 'uma hora' : `${cheios} horas`} já sem lugares nesse dia — `
          + 'aparecem a cinzento.', 500);
      } else if (cheios && cheios === state.horarios.length) {
        await botReply(
          '😕 Esse dia está com tudo cheio. Escolhe outro no calendário, '
          + 'ou telefona-nos que a gente vê o que se pode fazer.', 700);
        return stepCalendario();
      }

      desenharTurno('🌞 Almoço', porPeriodo.almoco);
      const sep = document.createElement('div');
      sep.className = 'qr-turno-sep';
      qrContainer.appendChild(sep);
      desenharTurno('🌙 Jantar', porPeriodo.jantar);

      unlockUI('Ou escreve o horário (ex: 20:30)…');
      return;
    }

    /* Sem resposta do servidor: as listas de sempre, todas abertas. */

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
  function appendHorarioBtn(hora, slot) {
    const btn = document.createElement('button');
    btn.className = 'qr-btn';
    btn.textContent = hora;

    /* Uma hora cheia fica visível mas desligada, em vez de desaparecer.
       Desaparecer faz a lista mudar de tamanho entre dias e não diz
       nada; a cinzento diz "existe, mas não hoje" — que é a
       informação. */
    if (slot && !slot.disponivel) {
      btn.disabled = true;
      btn.classList.add('qr-btn--cheio');
      btn.title = 'Sem lugares a esta hora';
      btn.setAttribute('aria-label', `${hora} — sem lugares`);
      qrContainer.appendChild(btn);
      return;
    }

    /* Poucos lugares: diz-se o número. Quem vai em grupo de seis
       precisa de saber que sobram dois antes de escrever o nome. */
    if (slot && slot.livres > 0 && slot.livres <= 4) {
      btn.textContent = `${hora} · ${slot.livres}`;
      btn.title = `${slot.livres} ${slot.livres === 1 ? 'lugar' : 'lugares'} livres`;
      btn.setAttribute('aria-label',
        `${hora}, ${slot.livres} ${slot.livres === 1 ? 'lugar livre' : 'lugares livres'}`);
      btn.classList.add('qr-btn--poucos');
    }

    btn.addEventListener('click', () => {
      if (state.processing) return;
      selectHora(hora);
    });
    qrContainer.appendChild(btn);
  }

  /** desenharTurno — o rótulo do turno e os seus slots. */
  function desenharTurno(rotulo, slots) {
    if (!slots.length) return;
    const label = document.createElement('span');
    label.className = 'qr-turno-label';
    label.textContent = rotulo;
    qrContainer.appendChild(label);
    slots.forEach(s => appendHorarioBtn(s.hora, s));
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
      `Obrigado, <strong>${escaparHTML(primeiroNome)}</strong>! 😊<br>Qual é o <strong>telemóvel</strong> de contacto? <em>(9 dígitos)</em>`,
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

      // Rede de segurança: se um passo novo se esquecer de desligar a
      // escrita, o cliente recebe uma resposta em vez de silêncio.
      default: {
        userBubble(raw);
        botReply('Neste passo é mais fácil clicares num dos botões acima 👆', 500);
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

    // ── Total estimado dos pratos pré-selecionados ──────────────
    const totalFinal = calcularTotal(itensCarrinho);
    if (totalFinal > 0) {
      // Linha divisória antes do total
      const divFinal = document.createElement('div');
      divFinal.className = 'summary-divider';
      card.appendChild(divFinal);

      const totalRow = document.createElement('div');
      totalRow.className = 'summary-total-row';

      const totalLabel = document.createElement('strong');
      totalLabel.className = 'summary-total-label';
      totalLabel.textContent = '💰 Total Estimado';

      const totalValue = document.createElement('span');
      totalValue.className = 'summary-total-value';
      totalValue.textContent = formatarPreco(totalFinal);

      totalRow.appendChild(totalLabel);
      totalRow.appendChild(totalValue);
      card.appendChild(totalRow);
    }

    chatBody.appendChild(card);
    scrollDown(card);

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

    apenasBotoes('Confirma ou recomeça nos botões acima 👆');
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

    /* ── A RESERVA VAI PARA O SERVIDOR (C-09) ────────────────────
       Até 10/09 isto gerava um código no browser e guardava a reserva
       no `localStorage`. Funcionava para mostrar o fluxo, mas:

         · o código não existia em sítio nenhum senão naquele browser,
           portanto o restaurante não o podia confirmar nem encontrar;
         · duas pessoas em dois telemóveis podiam reservar a mesma hora
           num sábado cheio, e as duas viam "confirmada";
         · limpar os dados do browser apagava a reserva.

       Agora o `POST /reservas` grava, e o **código vem na resposta**.
       Continua a haver uma cópia local, mas passou a ser só uma
       comodidade para a pessoa reencontrar o código no mesmo
       telemóvel — a verdade está no servidor, e é o
       `GET /reservas/:codigo` que a lê. */
    const corpo = {
      nome: state.nome,
      telemovel: state.telefone,
      pessoas: Number(state.pessoas),
      data: state.dataISO,
      hora: state.hora,
      modo_ementa: state.opcaoMenu === 'menu' ? 'pre_selecionada' : 'no_restaurante',
    };
    if (state.observacoes) corpo.observacoes = state.observacoes;

    /* Os itens levam o `produtoId` REAL, que agora existe porque a
       ementa vem da API. Com os ids inventados de antes (`en1`, `pp3`)
       isto não podia sequer ser enviado. */
    const escolhidos = Object.entries(state.carrinho)
      .filter(([, i]) => i.qty > 0)
      .map(([id, i]) => ({ produtoId: Number(id), quantidade: i.qty }));
    if (escolhidos.length) corpo.itens = escolhidos;

    await botReply('A guardar a reserva… ⏳', 400);

    let reserva;
    try {
      const r = await chamarAPI('reservas', { method: 'POST', body: corpo });
      reserva = r.reserva || {};
    } catch (erro) {
      /* Uma reserva recusada NÃO pode dizer "confirmada". O caso mais
         provável é a hora ter enchido entre a escolha e o envio — e aí
         o certo é voltar às horas, não deixar a pessoa a olhar para um
         erro no fim de ter escrito tudo. O que ela já preencheu fica. */
      state.step = 'hora';
      await botReply(
        `😕 Não deu para guardar: ${escaparHTML(erro && erro.message ? erro.message : 'erro no servidor')}`,
        700
      );
      await botReply('Vamos tentar outra hora — o resto já está preenchido.', 600);
      return stepHorario();
    }

    const codigo = reserva.codigo || gerarCodigoReserva();
    state.codigo = codigo;
    state.valorEstimado = reserva.valorEstimado;

    /* Cópia local, só para reencontrar o código neste telemóvel. */
    try {
      const reservas = JSON.parse(localStorage.getItem('vpa_reservas') || '[]');
      reservas.push({
        codigo,
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

    /* "Registada" e não "confirmada": a reserva fica em `pendente` e é
       o restaurante que confirma, por telefone. Dizer "confirmada" era
       prometer uma coisa que ainda não aconteceu — e o estado que o
       servidor devolve diz exatamente isso. */
    await botReply('🎉 <strong>Reserva registada!</strong>', 700);

    const primeiroNome = state.nome.split(' ')[0];
    await botReply(
      `Até ao dia <strong>${escaparHTML(state.dataStr)}</strong> às <strong>${escaparHTML(state.hora)}</strong>, ` +
      `<strong>${escaparHTML(primeiroNome)}</strong>! 🥩🔥<br>` +
      `Confirmaremos a reserva pelo telemóvel <strong>${escaparHTML(state.telefone)}</strong>.`,
      900
    );

    /* O valor estimado vem do SERVIDOR (a metade da B-52 que estava
       feita e que eu calculava aqui a partir de preços escritos à mão).
       Mostra-se o que ele diz, não o que este ecrã soma. */
    if (state.valorEstimado != null && Number(state.valorEstimado) > 0) {
      await botReply(
        `Pela pré-escolha, o valor estimado é <strong>${formatarPreco(Number(state.valorEstimado))}</strong>. `
        + 'É uma estimativa — o que conta é a conta no fim.',
        700
      );
    }

    await pause(300);
    renderCodigoReserva(codigo);

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

  /**
   * gerarCodigoReserva — Código curto e legível ao telefone (F-37).
   * Sem caracteres ambíguos (0/O, 1/I) para não haver enganos quando o
   * cliente o lê em voz alta ao restaurante.
   */
  function gerarCodigoReserva() {
    const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let sufixo = '';
    for (let i = 0; i < 5; i++) {
      sufixo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    }
    return `${PREFIXO_CODIGO_RESERVA}-${sufixo}`;
  }

  /**
   * renderCodigoReserva — Mostra o código em destaque, com botão de copiar.
   * O clipboard só funciona em HTTPS ou localhost; se falhar, o código
   * fica selecionado para o utilizador copiar à mão.
   */
  function renderCodigoReserva(codigo) {
    const card = document.createElement('div');
    card.className = 'codigo-card';

    const label = document.createElement('div');
    label.className = 'codigo-label';
    label.textContent = 'O teu código de reserva';

    const valor = document.createElement('div');
    valor.className = 'codigo-valor';
    valor.textContent = codigo; // textContent: nunca innerHTML com dados

    const btn = document.createElement('button');
    btn.className = 'btn-copiar-codigo';
    btn.type = 'button';
    btn.textContent = '📋 Copiar código';
    btn.addEventListener('click', () => copiarCodigo(codigo, btn, valor));

    const nota = document.createElement('div');
    nota.className = 'codigo-nota';
    nota.textContent = 'Guarda este código — é o que precisas para alterar ou cancelar a reserva.';

    card.append(label, valor, btn, nota);
    chatBody.appendChild(card);
    scrollDown(card);
  }

  async function copiarCodigo(codigo, btn, valorEl) {
    const marcarCopiado = () => {
      btn.textContent = '✅ Copiado!';
      btn.classList.add('copiado');
      setTimeout(() => {
        btn.textContent = '📋 Copiar código';
        btn.classList.remove('copiado');
      }, 2000);
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codigo);
        marcarCopiado();
        return;
      }
      throw new Error('clipboard indisponível');
    } catch (e) {
      // Alternativa quando o clipboard está bloqueado (http://, permissões):
      // seleciona o código para o utilizador copiar com Ctrl+C / toque longo.
      try {
        const intervalo = document.createRange();
        intervalo.selectNodeContents(valorEl);
        const selecao = window.getSelection();
        selecao.removeAllRanges();
        selecao.addRange(intervalo);
        btn.textContent = 'Seleciona e copia ↑';
        setTimeout(() => { btn.textContent = '📋 Copiar código'; }, 2600);
      } catch (e2) {
        console.warn('Não foi possível copiar o código:', e2);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     UTILITÁRIOS DE PREÇO
  ═══════════════════════════════════════════════════════════════ */

  /**
   * parsePrecoPrimeiro — Extrai o primeiro valor numérico de uma string de preço.
   * Exemplos:
   *   '15,50€'               → 15.50
   *   '1,70€ / 2,80€'        → 1.70
   *   '3,20€ copo / 12€ jarro' → 3.20
   *
   * @param {string} precoStr - String de preço do menu.
   * @returns {number} - Valor numérico do primeiro preço encontrado.
   */
  function parsePrecoPrimeiro(precoStr) {
    // Extrai o primeiro número com vírgula ou ponto (ex: "15,50" ou "1,70")
    const match = precoStr.replace(/,/g, '.').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * calcularTotal — Calcula o total estimado dos itens do carrinho.
   * Para cada item multiplica a quantidade pelo primeiro preço do produto.
   *
   * @param {Array} itens - Itens com { qty, preco } do carrinho.
   * @returns {number} - Total em euros.
   */
  function calcularTotal(itens) {
    return itens.reduce((acc, item) => {
      const precoUnit = parsePrecoPrimeiro(item.preco);
      return acc + precoUnit * item.qty;
    }, 0);
  }

  /**
   * formatarPreco — Formata um número como string de preço em euros.
   * Exemplo: 32.5 → '32,50 €'
   *
   * @param {number} valor - Valor numérico a formatar.
   * @returns {string} - Preço formatado.
   */
  function formatarPreco(valor) {
    return valor.toFixed(2).replace('.', ',') + ' €';
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
