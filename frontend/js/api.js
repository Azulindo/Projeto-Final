/**
 * =====================================================================
 * api.js — Ponto único de chamada à API · "Vem Pro Abate"
 * =====================================================================
 * F-09: função única de chamada à API, com o token anexado
 * automaticamente. Usada pela app de gestão (frontend/funcionarios/) e
 * pelo ecrã de mesa do cliente (frontend/cliente/mesa.html).
 *
 * ── PARA LIGAR MAIS UM ENDPOINT AO BACKEND REAL ─────────────────────
 * Acrescenta o caminho dele à lista ENDPOINTS_REAIS, aqui em baixo. Não
 * é preciso mexer em mais nada em ficheiro nenhum: as respostas
 * simuladas têm EXATAMENTE o mesmo formato que as reais, documentado em
 * docs/API.md.
 *
 * Quando a lista cobrir tudo, põe-se MODO_SIMULACAO = false e apaga-se
 * a lista e tudo o que está debaixo do aviso lá em baixo.
 *
 * O `API_BASE` é o outro valor a mexer — muda quando o servidor sair do
 * localhost para o Render.
 *
 * ── ESTADO ATUAL (03/09) ────────────────────────────────────────────
 * O back-end corre em Express + mysql2. O catálogo (categorias e
 * produtos) já está de pé e é servido a sério; o resto está a ser
 * portado pelo João, mantendo os mesmos nomes e formatos (docs/API.md
 * 3.10). Por agora o servidor só existe em localhost:3000.
 *
 * A portar (formatos já acordados, não mudam):
 *     GET   mesas/:token/sessao · POST mesas/:token/pedir
 *     GET   mesas/:token/conta  · POST mesas/:token/pedir-conta
 *     GET   pedidos/ativos      · GET  pedidos/cozinha
 *     PATCH pedidos/:id/estado          ← agora por RONDA, não por item
 *     POST  pedidos/sessao/:id/fechar
 *
 * JÁ LIGADOS AO SERVIDOR REAL (03/09) — ver ENDPOINTS_REAIS:
 *     GET   categorias · GET produtos · GET produtos/:id
 *
 * Ainda por desenhar (simulados aqui, ver docs/API.md secção 4):
 *     POST  auth/login · GET auth/eu        ← bloqueia a app de gestão
 *     POST  mesas/:token/chamar-empregado
 *     GET   gestao/mesas/qrcodes · GET gestao/sessoes/:id/conta
 *
 * O stock (gestao/stock e as duas escritas) saiu desta lista a 09/09:
 * o B-63 ficou pronto e os três caminhos passaram para o
 * ENDPOINTS_REAIS. O formato acordado no docs/API.md 4.8 acertou —
 * não foi preciso mexer numa linha do stock.js.
 *
 * O catálogo seguiu a 09/09 com o B-61: o Stock e os Produtos passaram
 * a ler do mesmo sítio, e acabou a janela em que as quantidades do
 * mesmo produto podiam divergir entre os dois ecrãs.
 *
 * As categorias e os funcionários seguiram a 10/09, com o B-62 e o B-64.
 * Falta ligar do lado da gestão: só o `gestao/categorias/ordem`, que o
 * servidor ainda não tem — ver a nota dentro do ENDPOINTS_REAIS e a
 * guarda `escritaFingidaSobreRecursoReal`, que faz o reordenar falhar
 * às claras em vez de fingir que gravou.
 *
 * Continuam simulados, por não existirem ainda: o `admin/estatisticas`
 * (F-55), o `gestao/mesas/qrcodes` (B-66), o `gestao/sessoes/:id/conta`
 * e o `mesas/:token/chamar-empregado`.
 * =====================================================================
 */

/* A API está publicada no Render (04/09). Deixou de ser preciso ter o
   servidor do João a correr para o site funcionar.
   Notas do plano gratuito, para ninguém andar à procura de erros que
   não existem:
     · a raiz (sem /api/...) responde "not found" — é suposto;
     · o serviço adormece ao fim de 15 minutos sem pedidos, e o pedido
       que o acorda demora à volta de 50 segundos. Não é a rede nem o
       código. Ver o aviso que a menu.html mostra a partir dos 4s;
     · cada push no main faz deploy automático — durante dois ou três
       minutos a seguir a um push, a API pode estar a meio da troca. */
/* ── C-26: o endereço da API decide-se sozinho ──────────────────────
   O plano B da apresentação (C-24 a C-28) é correr tudo no portátil,
   sem rede: base de dados local, API local, site servido de local. Se
   o endereço da API estivesse escrito à mão aqui, entrar em plano B
   obrigava a editar este ficheiro à pressa, à frente do júri, e a
   lembrar de o pôr como estava a seguir. É o género de passo que se
   esquece exatamente no dia em que não se pode esquecer.

   Por isso decide-se pela origem da própria página:

     · página aberta de localhost / 127.0.0.1 / rede local / file://
         → API em http://<mesmo host>:3000/api
     · qualquer outro sítio (o vemproabate.vercel.app)
         → API no Render

   Tudo em http no plano B, tudo em https no normal — nunca uma página
   https a chamar uma API http, que é terreno pantanoso e muda com a
   versão do browser (armadilha nº 2 do João, e tem razão).

   Para forçar à mão, sem editar nada: ?api=http://192.168.1.70:3000/api
   Fica no sessionStorage, como o ?simular=1, para sobreviver ao salto
   que o login dá entre páginas. */
const API_RENDER = 'https://vem-pro-abate-api.onrender.com/api';
const PORTA_API_LOCAL = 3000;
const CHAVE_API = 'vpa_api_base';

function descobrirAPIBase() {
  /* 1. Escolha explícita no endereço, que manda sobre tudo o resto. */
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('api')) {
      const escolhido = params.get('api');
      try {
        if (escolhido) sessionStorage.setItem(CHAVE_API, escolhido);
        else sessionStorage.removeItem(CHAVE_API);
      } catch (e) { /* sessionStorage desligado — vale só para esta página */ }
      if (escolhido) return escolhido;
    }
    const guardado = sessionStorage.getItem(CHAVE_API);
    if (guardado) return guardado;
  } catch (e) { /* fora de um browser (testes em Node) */ }

  /* 2. Pela origem da página. */
  try {
    const proto = window.location.protocol;
    const host  = window.location.hostname;

    // Ficheiro aberto por duplo clique: não há host nenhum de onde partir.
    if (proto === 'file:') return `http://localhost:${PORTA_API_LOCAL}/api`;

    const ehLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);   // 172.16–172.31, a gama privada

    if (ehLocal) return `http://${host}:${PORTA_API_LOCAL}/api`;
  } catch (e) { /* segue para o Render */ }

  return API_RENDER;
}

const API_BASE = descobrirAPIBase();

/**
 * MODO_SIMULACAO — `true` enquanto houver endpoints por fazer.
 *
 * ── PORQUE É QUE ISTO NÃO É SÓ UM SIM/NÃO ────────────────────────────
 * A 03/09 o catálogo passou a existir no servidor, mas o login, a
 * cozinha, o balcão e as sessões de mesa ainda não. Desligar um
 * interruptor global mandaria TUDO para o servidor real e partiria
 * quatro ecrãs para ligar um.
 *
 * Por isso a lista em baixo: são os caminhos que já existem mesmo. Vão
 * ao servidor mesmo com a simulação ligada; todo o resto continua
 * simulado. À medida que o João for entregando endpoints, acrescenta-se
 * uma linha aqui — e no dia em que a lista cobrir tudo, põe-se
 * MODO_SIMULACAO = false e apaga-se a lista.
 */
const MODO_SIMULACAO = true;

/* Endpoints que o front-end consegue mesmo alcançar (docs/API.md 4.2).
 *
 * A regra desta lista: não é "o endpoint existe", é "o front-end chega
 * lá". Estiveram comentados umas horas exatamente por causa disso — o
 * João já os tinha construído, mas o `API_BASE` era `localhost:3000`,
 * portanto só respondiam no portátil dele, e o site publicado no Vercel
 * ficava sem ementa. Com a API no Render, respondem a toda a gente.
 *
 * O resto continua simulado até ao B-19 (login) e aos endpoints de
 * sessão de mesa, que o João está a portar para mysql2.
 */
const ENDPOINTS_REAIS = [
  /^saude$/,                  // GET  /api/saude
  /^categorias$/,             // GET  /api/categorias
  /^produtos$/,               // GET  /api/produtos
  /^produtos\?/,              // GET  /api/produtos?categoria=Bebidas
  /^produtos\/\d+$/,          // GET  /api/produtos/:id
  /^auth\/login$/,            // POST /api/auth/login   ← B-19 (04/09)
  /^auth\/eu$/,               // GET  /api/auth/eu      ← B-22 (04/09)

  /* Sessões de mesa — B-31 a B-36 (07/09). O token do QR é a
     credencial: estes quatro não levam login nenhum. */
  /^mesas\/[^/]+\/sessao$/,        // GET  /api/mesas/:token/sessao
  /^mesas\/[^/]+\/pedir$/,         // POST /api/mesas/:token/pedir
  /^mesas\/[^/]+\/conta$/,         // GET  /api/mesas/:token/conta
  /^mesas\/[^/]+\/pedir-conta$/,   // POST /api/mesas/:token/pedir-conta

  /* Take away — B-35 (10/09). Sem login, como as mesas, e pela mesma
     razão: quem encomenda um frango não vai criar uma conta.
     O que faz de credencial no GET é o NÚMERO da encomenda — mesmo
     raciocínio do token do QR: não há sessão, há uma coisa que só quem
     encomendou tem. Por isso a resposta não traz o telefone nem o email
     de ninguém: quem sabe o número vê o estado, não os contactos. */
  /^pedidos\/takeaway$/,             // POST /api/pedidos/takeaway
  /^pedidos\/takeaway\/[A-Z0-9-]+$/, // GET  /api/pedidos/takeaway/:numero

  /* Fila de trabalho — com login. */
  /^pedidos\/ativos$/,             // GET   /api/pedidos/ativos
  /^pedidos\/cozinha$/,            // GET   /api/pedidos/cozinha
  /^pedidos\/\d+\/estado$/,        // PATCH /api/pedidos/:id/estado
  /^pedidos\/sessao\/\d+\/fechar$/,// POST  /api/pedidos/sessao/:id/fechar

  /* Stock — B-63 (09/09). A F-52 deixa de ser simulada.
     O formato é o que estava proposto no docs/API.md 4.8 e o que a
     simulação daqui já devolvia, por isso não foi preciso mexer numa
     linha do stock.js: só acrescentar estes três caminhos. Era esse o
     objetivo de se acordar o formato antes de construir. */
  /^gestao\/stock$/,               // GET   /api/gestao/stock
  /^gestao\/stock\/\d+\/movimento$/, // POST  /api/gestao/stock/:id/movimento
  /^gestao\/stock\/\d+\/minimo$/,  // PATCH /api/gestao/stock/:id/minimo

  /* Catálogo — B-61 (09/09). Acaba a transição em que o ecrã de Stock
     lia da base e o de Produtos lia da simulação: os dois passam a ler
     do mesmo sítio, e as quantidades do mesmo produto deixam de poder
     divergir entre eles. */
  /^gestao\/produtos$/,            // GET e POST /api/gestao/produtos
  /^gestao\/produtos\/\d+$/,       // PATCH      /api/gestao/produtos/:id

  /* Categorias — B-62 (09/09) e B-74 (10/09). A F-51 fica inteira: o
     reordenar era a única parte que faltava, e era a que dá o nome ao
     ecrã. Esteve um dia a falhar às claras em vez de fingir que
     gravava — ver a guarda `escritaFingidaSobreRecursoReal`, que foi
     escrita exatamente para essa janela.
     O `ordem` saiu do PATCH /:id no B-74 e passa a dar 400 a apontar o
     endereço novo: cada PATCH só sabia da sua categoria, e nada
     impedia duas com `ordem = 2`. Uma sequência só é válida vista por
     inteiro. A simulação daqui já recusava o `ordem` no PATCH desde a
     F-51 — foi o único sítio onde os dois lados já concordavam antes
     de alguém combinar. */
  /^gestao\/categorias$/,          // GET e POST /api/gestao/categorias
  /^gestao\/categorias\/\d+$/,     // PATCH      /api/gestao/categorias/:id
  /^gestao\/categorias\/ordem$/,   // PUT        /api/gestao/categorias/ordem

  /* Funcionários — B-64 (09/09). Três caminhos, sem DELETE: quem sai
     fica `ativo = false`, porque a conta está agarrada ao histórico de
     estados dos pedidos e aos movimentos de stock. */
  /^gestao\/funcionarios$/,        // GET e POST /api/gestao/funcionarios
  /^gestao\/funcionarios\/\d+$/,   // PATCH      /api/gestao/funcionarios/:id

  /* QR Codes das mesas — B-66 (10/09). A qrcodes.html estava construída
     desde 08/09 à espera deste caminho.
     Nível `administrador` e `balcao`, e não "qualquer funcionário" como
     estava escrito na 4.6: o `qr_code` de uma mesa é a credencial dessa
     mesa, e uma lista deles desfaz de uma vez a protecção das dez. O
     balcão entra porque é quem substitui um cartão gasto a meio de um
     serviço; a cozinha fica fora porque nunca precisa de imprimir
     cartões. O critério é a necessidade, não a ausência de perigo — e a
     página já declarava `data-niveis="balcao administrador"`. */
  /^gestao\/mesas\/qrcodes$/,      // GET /api/gestao/mesas/qrcodes
];

/**
 * `?simular=1` no URL força a simulação COMPLETA, mesmo nos endpoints já
 * ligados. Serve para duas coisas:
 *   · mostrar o trabalho sem ter o MySQL e o servidor a correr (numa
 *     apresentação, ou no telemóvel de alguém);
 *   · os testes automáticos, que correm sem rede.
 * Sem isto, uma demonstração passava a depender de uma base de dados
 * estar de pé — e não vale a pena arriscar isso à frente de um júri.
 */
const CHAVE_SIMULAR = 'vpa_simular';

/* ── A bandeira tem de sobreviver à navegação (07/09) ────────────────
   Antes lia-se só o URL da página atual, e isso desfazia a razão de ela
   existir: ao fazer login, o próprio código salta para `cozinha.html`
   sem query nenhuma, e a partir daí voltava a chamar o servidor. Numa
   apresentação sem rede, o login corria e o ecrã seguinte não.
   Descobri porque um teste começou a falhar exatamente aí.

   Fica guardada no `sessionStorage`: dura o separador, não contamina
   outros nem a próxima visita. `?simular=0` desliga. */
function simulacaoForcada() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('simular')) {
      const ligar = params.get('simular') !== '0';
      try {
        if (ligar) sessionStorage.setItem(CHAVE_SIMULAR, '1');
        else sessionStorage.removeItem(CHAVE_SIMULAR);
      } catch (e) { /* sessionStorage desativado — vale só para esta página */ }
      return ligar;
    }
    try {
      return sessionStorage.getItem(CHAVE_SIMULAR) === '1';
    } catch (e) {
      return false;
    }
  } catch (e) {
    return false;   // fora de um browser (testes em Node, por exemplo)
  }
}

/** usarServidor — Este caminho já fala com o servidor a sério? */
function usarServidor(caminho) {
  if (simulacaoForcada()) return false;
  if (!MODO_SIMULACAO) return true;
  return ENDPOINTS_REAIS.some(padrao => padrao.test(caminho));
}

/* ── A ARMADILHA DO RECURSO MEIO LIGADO (10/09) ────────────────────
   A lista acima é por CAMINHO, mas um ecrã usa vários caminhos do mesmo
   recurso. Nada garantia que fossem todos ligados ao mesmo tempo — e um
   ecrã meio ligado mente sem dar sinal.

   Foi exatamente o que ia acontecer com as categorias. O B-62 trouxe o
   GET, o POST e o PATCH; não trouxe o `gestao/categorias/ordem`. Sem
   esta guarda a F-51 ficava assim:

     · a lista vinha do servidor           → verdade
     · criar e editar iam ao servidor      → verdade
     · reordenar caía na simulação, que    → MENTIRA
       devolvia a lista trocada e um 200

   As setas funcionavam à vista, a ordem mudava no ecrã, e ao recarregar
   a página voltava tudo atrás. Sem erro nenhum, sem aviso nenhum. É a
   pior forma de falhar: a que parece ter corrido bem.

   A regra, então: não se simula uma ESCRITA sobre um recurso que já é
   real. Se o `gestao/categorias` está na lista, ninguém finge gravar em
   `gestao/categorias/qualquer-coisa`.

   Só escritas. Uma leitura simulada também é falsa, mas mostra-se — são
   dados de demonstração à vista de quem olha, e é para isso que existe
   o `?simular=1`. Uma escrita simulada devolve "gravado" a quem gravou
   nada, e ninguém vê nada. É esta que rebenta em silêncio. */
const METODOS_ESCRITA = ['POST', 'PUT', 'PATCH', 'DELETE'];

function escritaFingidaSobreRecursoReal(caminho, metodo) {
  if (simulacaoForcada()) return null;          // demonstração: é tudo a fingir de propósito
  if (!METODOS_ESCRITA.includes(metodo)) return null;
  if (usarServidor(caminho)) return null;        // já vai ao servidor, não há fingimento

  /* Sobe segmento a segmento à procura de um antepassado já ligado:
     'gestao/categorias/ordem' → 'gestao/categorias' → 'gestao'. */
  const partes = caminho.split('/');
  for (let i = partes.length - 1; i >= 1; i--) {
    const pai = partes.slice(0, i).join('/');
    if (ENDPOINTS_REAIS.some(padrao => padrao.test(pai))) return pai;
  }
  return null;
}

const CHAVE_SESSAO = 'vpa_sessao_funcionario';
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000; // 8h — validade sugerida do JWT (ver docs/API.md 4.1)

/**
 * Estados da SESSÃO — quatro, em minúsculas (confirmado com o João a
 * 03/09; o plano antigo tinha três e em maiúsculas):
 *
 *     aberta → aguarda_pagamento → fechada
 *            ↘ cancelada
 *
 * `cancelada` é uma mesa que foi anulada sem pagar — o cliente foi-se
 * embora, abriu-se a sessão por engano. Não é o mesmo que `fechada`:
 * essa foi paga. Nenhuma das duas aceita pedidos novos.
 *
 * estadoIgual — Compara sem distinguir maiúsculas. Já não é preciso,
 * agora que a convenção está fechada, mas fica: custa nada e o dia em
 * que alguém escrever 'Aberta' numa migração, isto não parte.
 */
function estadoIgual(valor, esperado) {
  return String(valor ?? '').toLowerCase() === String(esperado).toLowerCase();
}

/* ═══════════════════════════════════════════════════════════════════
   SESSÃO DO FUNCIONÁRIO
   Guardada em localStorage e lida automaticamente por chamarAPI().
   ═══════════════════════════════════════════════════════════════════ */

function obterSessao() {
  let bruto;
  try {
    bruto = localStorage.getItem(CHAVE_SESSAO);
  } catch (e) {
    return null; // localStorage pode estar desativado (janela privada, etc.)
  }
  if (!bruto) return null;

  try {
    const sessao = JSON.parse(bruto);
    if (!sessao.token || !sessao.expiraEm) return null;
    if (Date.now() >= sessao.expiraEm) {
      limparSessao();
      return null;
    }
    return sessao;
  } catch (e) {
    return null;
  }
}

/**
 * Lê a data de validade que vem DENTRO do token (04/09).
 *
 * Até aqui a validade era um palpite: `Date.now() + 8h`, calculado no
 * browser no momento do login. Era uma suposição sobre o que o servidor
 * decidiu, não o que ele decidiu — e a contagem decrescente do
 * dashboard mostrava esse palpite a quem estivesse a trabalhar. Se o
 * João mudar a duração do token, ou se o relógio do tablet estiver
 * adiantado, os dois lados discordam sem ninguém dar por isso.
 *
 * Um JWT tem três partes separadas por pontos; a do meio traz o `exp`
 * em segundos. Só se lê — NÃO se verifica nada aqui, e isto nunca pode
 * servir para decidir se alguém entra: quem valida o token é o
 * servidor. Isto é só para mostrar a hora certa no ecrã.
 *
 * Se não der para ler (token simulado, formato diferente), volta-se ao
 * palpite das 8 horas, que é o que havia antes.
 */
function validadeDoToken(token) {
  try {
    const carga = JSON.parse(atob(String(token).split('.')[1]));
    if (carga && typeof carga.exp === 'number') return carga.exp * 1000;
  } catch (e) { /* token não-JWT, ou ilegível — segue o plano B */ }
  return null;
}

function guardarSessao({ token, nome, nivel, idUtilizador }) {
  const expiraEm = validadeDoToken(token) || (Date.now() + DURACAO_SESSAO_MS);
  /* O `idUtilizador` entra aqui a 10/09 (X-11). É só para o ecrã poder
     reconhecer a própria linha na lista de funcionários — NÃO decide
     acesso nenhum, e não podia: quem decide é o servidor, que relê a
     base a cada pedido autenticado. Um número guardado no browser é
     informação para desenhar, nunca para autorizar. */
  const sessao = { token, nome, nivel, idUtilizador: idUtilizador ?? null, expiraEm };
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch (e) {
    console.warn('Não foi possível guardar a sessão localmente:', e);
  }
  return sessao;
}

function limparSessao() {
  try { localStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* nada a fazer */ }
}

/**
 * Onde cada posto deve cair depois do login. A cozinha entra direto no
 * ecrã dela — não faz sentido mandar um monitor de cozinha para um
 * dashboard de gestão.
 * Definido aqui (e só aqui) porque o auth-guard.js, o layout.js e o
 * login.js precisam todos do mesmo mapa.
 *
 * ── CORREÇÃO (04/09) ────────────────────────────────────────────────
 * O `balcao` ia para o `dashboard.html`. Era incoerência, não decisão:
 * o argumento escrito aqui em cima para a cozinha vale igual para o
 * balcão — é um posto de trabalho, não um posto de gestão. E hoje o
 * dashboard é um cartão de "em construção" (o F-55 ainda não existe),
 * por isso um tablet ao balcão fazia login e aterrava num placeholder
 * vazio, tendo o ecrã dele mesmo ao lado no menu.
 * Apanhado ao conferir o mapa contra o que o João esperava do B-19.
 */
const PAGINA_INICIAL_POR_NIVEL = {
  cozinha:       'cozinha.html',
  balcao:        'balcao.html',
  administrador: 'dashboard.html',
};

function paginaInicialDoNivel(nivel) {
  return PAGINA_INICIAL_POR_NIVEL[nivel] || 'dashboard.html';
}

/* ═══════════════════════════════════════════════════════════════════
   chamarAPI — PONTO ÚNICO DE CHAMADA (F-09)
   ═══════════════════════════════════════════════════════════════════
     await chamarAPI('produtos');
     await chamarAPI('mesas/abc-123/pedir', { method: 'POST', body: { itens } });
   Lança um Error com `.status` e `.message` já em português — as
   páginas só têm de mostrar `erro.message`.
   ═══════════════════════════════════════════════════════════════════ */

async function chamarAPI(endpoint, opcoes = {}) {
  if (!usarServidor(endpoint)) return simularEndpoint(endpoint, opcoes);

  const sessao = obterSessao();
  const headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  if (sessao?.token) headers['Authorization'] = `Bearer ${sessao.token}`;

  let resposta;
  try {
    resposta = await fetch(`${API_BASE}/${endpoint}`, {
      method: opcoes.method || 'GET',
      headers,
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
    });
  } catch (e) {
    const erro = new Error('Não foi possível ligar ao servidor. Verifica a tua ligação.');
    erro.status = 0;
    throw erro;
  }

  if (resposta.status === 401) limparSessao();

  let corpo = null;
  try { corpo = await resposta.json(); } catch (e) { /* resposta sem corpo */ }

  if (!resposta.ok) {
    const erro = new Error(corpo?.erro || `Erro ${resposta.status} ao contactar o servidor.`);
    erro.status = resposta.status;
    // O 409 do PATCH de estado traz a lista do que era permitido a
    // partir do estado atual (B-32). Sem isto, essa informação
    // desaparecia aqui e quem apanha o erro só sabia que falhou.
    if (corpo && corpo.permitidos) erro.permitidos = corpo.permitidos;
    /* O 409 do PATCH de categorias traz quantos produtos vão sair da
       ementa (B-62) e como confirmar. É com esse número que o ecrã
       pergunta "queres mesmo?" — sem ele, a pergunta era vaga e a
       resposta um palpite. */
    if (corpo && corpo.produtos !== undefined) erro.produtos = corpo.produtos;
    if (corpo && corpo.comoConfirmar) erro.comoConfirmar = corpo.comoConfirmar;
    throw erro;
  }

  return corpo;
}

/* ═══════════════════════════════════════════════════════════════════
   ▼▼▼  TUDO O QUE VEM A SEGUIR SÓ CORRE EM MODO_SIMULACAO  ▼▼▼
   Quando o backend estiver pronto, isto pode ser apagado por inteiro.
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Contas de demonstração — substituídas por POST /api/auth/login (B-19).
 *
 * O login é POR POSTO DE TRABALHO, não por pessoa: o monitor da cozinha
 * e o tablet do balcão ficam ligados o turno inteiro, ninguém faz
 * logout entre pratos. O que o login decide é QUE ECRÃS aquele
 * dispositivo pode abrir — ver docs/API.md 4.1.
 */
const CONTAS_DEMO = [
  { email: 'cozinha@vemproabate.pt', password: 'abate2026', nome: 'Cozinha',      nivel: 'cozinha' },
  { email: 'balcao@vemproabate.pt',  password: 'abate2026', nome: 'Balcão',       nivel: 'balcao' },
  { email: 'admin@vemproabate.pt',   password: 'abate2026', nome: 'Administração', nivel: 'administrador' },
];

/**
 * Catálogo de demonstração — cópia fiel de backend/prisma/seed.js.
 * Os `id` reproduzem a ordem do seed numa base de dados limpa, mas o
 * front-end NUNCA os deve escrever à mão: usa sempre os que vêm da
 * resposta (ver docs/API.md 4.2).
 *
 * `preco` é NÚMERO, não texto (confirmado com o João a 03/09). O
 * driver mysql2 devolve número; se aqui fosse texto, a simulação e o
 * servidor discordavam no primeiro sítio onde alguém somasse sem
 * converter — é assim que aparece o clássico "16.20" + "1.00" a dar
 * "16.201.00". O Prisma, que serializava Decimal como string, saiu do
 * projeto a 02/09.
 *
 * `controla_stock` + `quantidade_atual` + `quantidade_minima` — só nos
 * 4 produtos onde faz sentido ter existência limitada por dia (regra
 * 6.3 do CONTEXTO.md). Os restantes não têm estes campos, o que aqui e
 * no servidor real quer dizer o mesmo que `controla_stock = 0`: nunca
 * ficam sem stock (regra 25 — só desaparecem se `ativo` for `false`).
 * Duas entradas ficam propositadamente abaixo do mínimo (F-62, 04/09),
 * para o aviso na cozinha e o contador do gerente terem o que mostrar.
 */
const PRODUTOS_DEMO = [
  { id: 1,  nome: 'Abatata Frita',            descricao: 'Batatas rústicas com tempero da casa e maionese de alho', preco: 3.90,  categoria: 'Entradas',          ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/abatata_frita.jpg' },
  { id: 2,  nome: 'Vem Pro Abacate',          descricao: 'Entrada com abacate, guacamole ou tosta',                 preco: 5.80,  categoria: 'Entradas',          ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/vem_pro_abacate.jpg' },
  { id: 3,  nome: "Vem p'ro Alho",            descricao: 'Pão de alho no forno',                                    preco: 3.20,  categoria: 'Entradas',          ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/vem_pro_alho.jpg' },
  { id: 4,  nome: 'Abate-Boca',               descricao: 'Mini croquetes de novilho',                               preco: 4.50,  categoria: 'Entradas',          ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/abate_boca.jpg' },
  { id: 5,  nome: 'Borrego Abatido',          descricao: 'Borrego assado com batata, alecrim, alho e vinho branco', preco: 15.50, categoria: 'Pratos Principais', ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/borrego_abatido.jpg', controla_stock: true, quantidade_atual: 3,  quantidade_minima: 5 },
  { id: 6,  nome: 'Francesinha em K.O.',      descricao: 'Bife, enchidos, queijo e molho da casa com batata e ovo', preco: 12.20, categoria: 'Pratos Principais', ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/francesinha_em_ko.jpg' },
  { id: 7,  nome: 'Abate Misto',              descricao: 'Picanha, chouriço e frango na brasa com arroz e batata',  preco: 16.20, categoria: 'Pratos Principais', ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/prato_favorito.jpg' },
  { id: 8,  nome: 'Prega-me Isto',            descricao: 'Bife dos Açores com batata frita',                        preco: 16.90, categoria: 'Pratos Principais', ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/prego.jpg' },
  { id: 9,  nome: 'Picanha na Brasa Negra',   descricao: 'Picanha grelhada com arroz e batata frita',               preco: 16.00, categoria: 'Pratos Principais', ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/picanha_na_brasa_negra.jpg', controla_stock: true, quantidade_atual: 12, quantidade_minima: 6 },
  { id: 10, nome: 'Tábua Rústica do Abate',   descricao: 'Carnes mistas com migas e batata a murro',                preco: 17.80, categoria: 'Pratos Principais', ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/tabua_rustica_do_abate.jpg', controla_stock: true, quantidade_atual: 2,  quantidade_minima: 4 },
  { id: 11, nome: 'Cerveja (Fino/Pressão)',   descricao: 'Fino ou pressão',                                         preco: 1.70,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 12, nome: 'Cerveja (Caneca)',         descricao: 'Caneca de cerveja',                                       preco: 2.80,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 13, nome: 'Panaché',                  descricao: 'Cerveja com gasosa',                                      preco: 2.20,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 14, nome: 'Sangria (Copo)',           descricao: 'Branca, tinta ou espumante — copo',                       preco: 3.20,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 15, nome: 'Sangria (Jarro)',          descricao: 'Branca, tinta ou espumante — jarro',                      preco: 12.00, categoria: 'Bebidas',           ativo: true, disponivel: true, controla_stock: true, quantidade_atual: 8,  quantidade_minima: 3 },
  { id: 16, nome: 'Coca-Cola',                descricao: 'Normal ou zero',                                          preco: 1.90,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 17, nome: 'Ice Tea',                  descricao: 'Pêssego, limão ou manga',                                 preco: 1.90,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 18, nome: 'Sumos Naturais',           descricao: 'Laranja ou mistura de frutos',                            preco: 3.00,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 19, nome: 'Água (Mineral)',           descricao: 'Água mineral sem gás',                                    preco: 1.30,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 20, nome: 'Água (Com Gás)',           descricao: 'Água com gás',                                            preco: 1.60,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 21, nome: 'Abate Pingado',            descricao: 'Café ou descafeinado',                                    preco: 1.00,  categoria: 'Bebidas',           ativo: true, disponivel: true },
  { id: 22, nome: 'Abategatoue',              descricao: 'Petit gâteau com gelado e chocolate',                     preco: 5.20,  categoria: 'Sobremesas',        ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/abategatoue.jpg' },
  { id: 23, nome: 'Baba do Pastor',           descricao: 'Baba de camelo com bolacha',                              preco: 3.90,  categoria: 'Sobremesas',        ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/baba_do_pastor.jpg' },
  { id: 24, nome: 'Cheesecake da Casa',       descricao: 'Cheesecake com frutos vermelhos',                         preco: 4.60,  categoria: 'Sobremesas',        ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/cheesecake_da_casa.jpg' },
  { id: 25, nome: 'Taça Gelada da Casa',      descricao: 'Gelados, chantilly e chocolate',                          preco: 4.20,  categoria: 'Sobremesas',        ativo: true, disponivel: true, imagem: 'assets/imagens/pratos/taca_gelada_da_casa.jpg' },
];

/* Mesas de demonstração. Na base de dados real o qrToken é um UUID
   gerado pelo seed — aqui usamos tokens legíveis para dar para testar
   à mão: mesa.html?mesa=demo-mesa-4 */
const MESAS_DEMO = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  numero: i + 1,
  lugares: i < 2 ? 2 : 4,
  qrToken: `demo-mesa-${i + 1}`,
}));

/* Sessões simuladas — guardadas no browser para sobreviverem a um
   refresh, tal como a sessão real sobrevive do lado do servidor. */
const CHAVE_SESSOES_DEMO = 'vpa_sessoes_mesa_demo';

function lerSessoesDemo() {
  try { return JSON.parse(localStorage.getItem(CHAVE_SESSOES_DEMO) || '{}'); }
  catch (e) { return {}; }
}

function gravarSessoesDemo(sessoes) {
  try { localStorage.setItem(CHAVE_SESSOES_DEMO, JSON.stringify(sessoes)); }
  catch (e) { /* segue sem persistir */ }
}

/* ── Movimentos de stock simulados (F-52) ──────────────────────────────
   O PRODUTOS_DEMO é uma constante: sem isto, ajustar o stock no ecrã
   funcionava até ao refresh seguinte e depois desfazia-se sozinho, o
   que numa demonstração é pior do que não ter o botão.

   Guarda-se o AJUSTE ACUMULADO por produto, não a quantidade final. É
   a mesma razão pela qual o endpoint real deve receber movimentos e não
   valores absolutos (ver docs/API.md 4.8): o stock também se mexe
   sozinho de cada vez que a cozinha confirma uma ronda, por isso quem
   grava um valor absoluto apaga sem dar por isso o que aconteceu entre
   o momento em que leu o ecrã e o momento em que carregou em gravar.

   Formato: { "<id>": { ajuste: <inteiro>, minimo: <inteiro|null> } } */
const CHAVE_STOCK_DEMO = 'vpa_stock_demo';

function lerStockDemo() {
  try { return JSON.parse(localStorage.getItem(CHAVE_STOCK_DEMO) || '{}'); }
  catch (e) { return {}; }
}

function gravarStockDemo(ajustes) {
  try { localStorage.setItem(CHAVE_STOCK_DEMO, JSON.stringify(ajustes)); }
  catch (e) { /* segue sem persistir */ }
}

/* Apaga os ajustes de um produto. Usado quando o formulário do catálogo
   (F-50) grava uma existência: a partir daí é ELA a base, e um ajuste
   antigo por cima somava-se em silêncio. */
function limparAjusteStockDemo(id) {
  const ajustes = lerStockDemo();
  if (ajustes[String(id)]) { delete ajustes[String(id)]; gravarStockDemo(ajustes); }
}

/* Aplica os ajustes guardados a um produto do PRODUTOS_DEMO e devolve
   as duas quantidades já corrigidas. Nunca deixa a quantidade abaixo de
   zero — no servidor real essa garantia é do lado de lá. */
function stockAtualDemo(produto) {
  const guardado = lerStockDemo()[String(produto.id)] || {};
  const base = Number(produto.quantidade_atual) || 0;
  const atual = Math.max(0, base + (Number(guardado.ajuste) || 0));
  const minimo = guardado.minimo == null
    ? (Number(produto.quantidade_minima) || 0)
    : Number(guardado.minimo);
  return { quantidade_atual: atual, quantidade_minima: minimo };
}

/* ── Catálogo editável simulado (F-50) ─────────────────────────────────
   O PRODUTOS_DEMO continua a ser a lista de origem, intocada. Por cima
   dela vivem as edições e os produtos criados no ecrã, guardados no
   browser — a mesma razão da F-52: um formulário que grava e desfaz no
   refresh seguinte é pior do que não ter formulário nenhum.

   TUDO o que lê produtos passa por aqui, e é de propósito: mudar o
   preço de um prato na gestão tem de o mudar também na ementa do site
   e no ecrã da mesa. Dois sítios a mostrar preços diferentes do mesmo
   prato é o género de erro que só se descobre com o cliente à frente.

   Formato: { edicoes: { "<id>": {campos alterados} }, novos: [ {...} ] } */
const CHAVE_PRODUTOS_DEMO = 'vpa_produtos_demo';

function lerCatalogoDemo() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE_PRODUTOS_DEMO) || '{}');
    return { edicoes: guardado.edicoes || {}, novos: guardado.novos || [] };
  } catch (e) { return { edicoes: {}, novos: [] }; }
}

function gravarCatalogoDemo(estado) {
  try { localStorage.setItem(CHAVE_PRODUTOS_DEMO, JSON.stringify(estado)); }
  catch (e) { /* segue sem persistir */ }
}

/** catalogoDemo — a lista de origem com as edições e os novos aplicados. */
function catalogoDemo() {
  const { edicoes, novos } = lerCatalogoDemo();
  const base = PRODUTOS_DEMO.map(p => {
    const alterado = edicoes[String(p.id)];
    return alterado ? { ...p, ...alterado } : { ...p };
  });
  return base.concat(novos.map(p => ({ ...p })));
}

/* O próximo id livre. Nunca reaproveita um id apagado — no servidor
   real quem os dá é o AUTO_INCREMENT, e um id reaproveitado ligaria
   pedidos antigos ao produto errado. */
function proximoIdDemo() {
  const todos = catalogoDemo().map(p => Number(p.id) || 0);
  return Math.max(0, ...todos) + 1;
}

/* ── Categorias editáveis simuladas (F-51) ─────────────────────────
   Mesmo padrão do catálogo: a lista de origem fica intocada e por cima
   dela vivem as edições e as categorias criadas no ecrã.
   Formato: { edicoes: { "<id>": {...} }, novas: [ {...} ] } */
const CHAVE_CATEGORIAS_DEMO = 'vpa_categorias_demo';

/* As quatro de origem. A `ordem` é o campo que interessa: é ela que põe
   as entradas antes das sobremesas na ementa, e é a razão de as
   categorias serem uma entidade em vez de um texto dentro do produto. */
const CATEGORIAS_DEMO = [
  { id: 1, nome: 'Entradas',          descricao: 'Para começar',              ordem: 1, ativo: true },
  { id: 2, nome: 'Pratos Principais', descricao: 'Carnes na brasa e no forno', ordem: 2, ativo: true },
  { id: 3, nome: 'Bebidas',           descricao: '',                          ordem: 3, ativo: true },
  { id: 4, nome: 'Sobremesas',        descricao: 'Para acabar',               ordem: 4, ativo: true },
];

function lerCategoriasDemo() {
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE_CATEGORIAS_DEMO) || '{}');
    return { edicoes: g.edicoes || {}, novas: g.novas || [] };
  } catch (e) { return { edicoes: {}, novas: [] }; }
}

function gravarCategoriasDemo(estado) {
  try { localStorage.setItem(CHAVE_CATEGORIAS_DEMO, JSON.stringify(estado)); }
  catch (e) { /* segue sem persistir */ }
}

/** categoriasDemo — as de origem com as edições aplicadas, já ordenadas. */
function categoriasDemo() {
  const { edicoes, novas } = lerCategoriasDemo();
  return CATEGORIAS_DEMO
    .map(c => Object.assign({}, c, edicoes[String(c.id)] || {}))
    .concat(novas.map(c => Object.assign({}, c)))
    .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
}

/* Comparação de nomes sem acentos e sem maiúsculas: "Bebidas" e
   "bebidas" são a mesma categoria, e deixar as duas existirem partia a
   ementa em duas gavetas com o mesmo nome. */
function mesmoNome(a, b) {
  const n = t => String(t || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n(a) === n(b);
}

function produtosNaCategoria(nome) {
  return catalogoDemo().filter(p => p.categoria === nome);
}

function linhaCategoriaDemo(c) {
  return {
    id: c.id,
    nome: c.nome,
    descricao: c.descricao || '',
    ordem: c.ordem,
    ativo: c.ativo !== false,
    // Quantos produtos lá estão. É o que decide se se pode desativar.
    produtos: produtosNaCategoria(c.nome).length,
  };
}

function validarCategoriaDemo(corpo, completo) {
  const out = {};
  const tem = c => Object.prototype.hasOwnProperty.call(corpo, c);

  if (completo || tem('nome')) {
    const nome = String(corpo.nome || '').trim();
    if (!nome) throw erroSimulado('O nome é obrigatório.', 400);
    if (nome.length > 40) throw erroSimulado('O nome não pode passar dos 40 caracteres.', 400);
    out.nome = nome;
  }
  if (tem('descricao')) out.descricao = String(corpo.descricao || '').trim().slice(0, 120);
  if (tem('ativo')) out.ativo = corpo.ativo !== false;

  /* A `ordem` não se muda por aqui: muda-se em bloco no
     PUT /gestao/categorias/ordem, para não haver duas categorias na
     mesma posição nem buracos na sequência. */
  if (tem('ordem')) {
    throw erroSimulado('A ordem muda-se em PUT /gestao/categorias/ordem, com a lista completa.', 400);
  }

  return out;
}

/* ── Funcionários simulados (F-53) ─────────────────────────────────
   Formato do B-64, campo por campo. Mesmo padrão dos outros: a lista de
   origem fica intocada e por cima dela vivem as edições e as contas
   criadas no ecrã.

   ── O `password_hash` NÃO EXISTE AQUI ────────────────────────────────
   Não é por não haver base de dados: é para o ecrã nunca poder contar
   com um campo que o servidor não manda. Se a simulação devolvesse um
   hash, alguém acabava por o pôr num ecrã, e só se descobria contra o
   servidor real — onde ele não vem. A senha só viaja no sentido da
   escrita, e nem para lá fica guardada: valida-se o tamanho e
   esquece-se.

   ── O `id` E O `idUtilizador` SÃO DIFERENTES DE PROPÓSITO ────────────
   Na base são duas tabelas (`funcionario` e `utilizador`) e dois ids. Se
   aqui fossem iguais, um ecrã que trocasse um pelo outro funcionava na
   demonstração e falhava contra o servidor. Ficam desencontrados para o
   erro aparecer no sítio onde custa pouco. */
const CHAVE_FUNCIONARIOS_DEMO = 'vpa_funcionarios_demo';

/* Os níveis por cargo, iguais aos do backend/src/routes/gestaoFuncionarios.js.
   Quem entra por aqui tem de sair com um nível que o login reconheça,
   senão criava-se uma conta que nunca consegue entrar. */
const NIVEL_POR_CARGO_DEMO = {
  administrador:  'administrador',
  gerente:        'administrador',
  cozinheiro:     'cozinha',
  empregado_mesa: 'balcao',
};
const CARGOS_DEMO = Object.keys(NIVEL_POR_CARGO_DEMO);

/* Os três primeiros são as contas do CONTAS_DEMO: é preciso que sejam as
   mesmas para a regra do último administrador poder distinguir "estás a
   desativar-te a ti" de "estás a desativar outra pessoa".

   Há UM administrador ativo de propósito — é o que faz a regra morder à
   primeira tentativa, em vez de só morder num cenário que ninguém
   experimenta. A quarta conta está desativada, porque é a ver uma conta
   desativada que se reativa uma. */
const FUNCIONARIOS_DEMO = [
  { id: 1, idUtilizador: 11, nome: 'Administração', email: 'admin@vemproabate.pt',   telefone: '912 000 001', cargo: 'administrador',  ativo: true,  data_contratacao: '2024-01-15' },
  { id: 2, idUtilizador: 12, nome: 'Cozinha',       email: 'cozinha@vemproabate.pt', telefone: '912 000 002', cargo: 'cozinheiro',     ativo: true,  data_contratacao: '2024-03-01' },
  { id: 3, idUtilizador: 13, nome: 'Balcão',        email: 'balcao@vemproabate.pt',  telefone: '912 000 003', cargo: 'empregado_mesa', ativo: true,  data_contratacao: '2024-06-10' },
  { id: 4, idUtilizador: 14, nome: 'Rui Abreu',     email: 'rui@vemproabate.pt',     telefone: '912 000 004', cargo: 'empregado_mesa', ativo: false, data_contratacao: '2023-09-01' },
];

function lerFuncionariosDemo() {
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE_FUNCIONARIOS_DEMO) || '{}');
    return { edicoes: g.edicoes || {}, novos: g.novos || [] };
  } catch (e) { return { edicoes: {}, novos: [] }; }
}

function gravarFuncionariosDemo(estado) {
  try { localStorage.setItem(CHAVE_FUNCIONARIOS_DEMO, JSON.stringify(estado)); }
  catch (e) { /* segue sem persistir */ }
}

/** funcionariosDemo — os de origem com as edições aplicadas.
    Ordem igual à do servidor: ativos primeiro, depois por nome. */
function funcionariosDemo() {
  const { edicoes, novos } = lerFuncionariosDemo();
  return FUNCIONARIOS_DEMO
    .map(f => Object.assign({}, f, edicoes[String(f.id)] || {}))
    .concat(novos.map(f => Object.assign({}, f)))
    .sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return String(a.nome).localeCompare(String(b.nome), 'pt');
    });
}

function linhaFuncionarioDemo(f) {
  return {
    id: f.id,
    idUtilizador: f.idUtilizador,
    nome: f.nome,
    email: f.email,
    telefone: f.telefone,
    cargo: f.cargo,
    // Deriva do cargo — não se guarda nem se aceita à parte, senão
    // podiam discordar e ninguém saberia qual manda.
    nivel: NIVEL_POR_CARGO_DEMO[f.cargo] || null,
    ativo: f.ativo !== false,
    data_contratacao: f.data_contratacao,
  };
}

/** Quem está com a sessão aberta, pelo email escondido no token demo. */
function emailDaSessaoDemo() {
  try {
    const sessao = obterSessao();
    if (!sessao || !sessao.token) return null;
    const partes = String(sessao.token).split('.');
    if (partes[0] !== 'demo' || !partes[1]) return null;
    return atob(partes[1]).toLowerCase();
  } catch (e) { return null; }
}

/** Administradores ativos que não são este. Ver a regra mais abaixo. */
function outrosAdminsAtivosDemo(idExcluido) {
  return funcionariosDemo().filter(f =>
    f.id !== idExcluido &&
    f.ativo !== false &&
    NIVEL_POR_CARGO_DEMO[f.cargo] === 'administrador'
  ).length;
}

function validarFuncionarioDemo(corpo, completo) {
  const out = {};
  const tem = c => Object.prototype.hasOwnProperty.call(corpo, c);

  if (completo || tem('nome')) {
    const nome = String(corpo.nome || '').trim();
    if (nome.length < 2) throw erroSimulado('Falta o nome.', 400);
    if (nome.length > 120) throw erroSimulado('O nome não pode passar dos 120 caracteres.', 400);
    out.nome = nome;
  }

  if (completo || tem('email')) {
    const email = String(corpo.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw erroSimulado('Email inválido.', 400);
    out.email = email;
  }

  if (completo || tem('telefone')) {
    const tel = String(corpo.telefone || '').trim();
    if (tel.length < 6) throw erroSimulado('Falta o telefone.', 400);
    out.telefone = tel;
  }

  if (completo || tem('cargo')) {
    const cargo = String(corpo.cargo || '').trim();
    if (!CARGOS_DEMO.includes(cargo)) {
      throw erroSimulado(`O cargo tem de ser um de: ${CARGOS_DEMO.join(', ')}.`, 400);
    }
    out.cargo = cargo;
  }

  /* A senha é obrigatória a criar e opcional a editar — só muda a senha
     quem mandar uma senha. O mínimo de 10 é o do servidor; ter o mesmo
     número dos dois lados evita o ecrã aceitar o que o servidor recusa. */
  if (completo || tem('password')) {
    const pw = String(corpo.password || '');
    if (pw.length < 10) throw erroSimulado('A palavra-passe tem de ter pelo menos 10 caracteres.', 400);
    if (pw.length > 200) throw erroSimulado('Palavra-passe demasiado longa.', 400);
    // Validada e esquecida. Não se guarda em sítio nenhum.
  }

  if (tem('ativo')) out.ativo = corpo.ativo !== false;

  if (tem('data_contratacao')) {
    const d = String(corpo.data_contratacao || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw erroSimulado('Data no formato AAAA-MM-DD.', 400);
    out.data_contratacao = d;
  }

  /* O `nivel` deriva do cargo. Aceitá-lo aqui deixava-o discordar do
     cargo, e depois nenhum dos dois manda. */
  if (tem('nivel')) {
    throw erroSimulado('O nível vem do cargo — não se manda à parte.', 400);
  }

  return out;
}

/* ── Encomendas de take away simuladas (B-35 / F-24) ───────────────
   Uma encomenda de take away NÃO pertence a sessão nenhuma: é um pedido
   único, e paga-se no balcão ao levantar. Por isso vive num sítio
   separado das sessões de mesa em vez de ser enfiada numa sessão falsa.

   Guardadas por número, que é a credencial: o `GET` procura por número
   e mais nada, igual ao servidor. */
const CHAVE_TAKEAWAY_DEMO = 'vpa_takeaway_demo';

function lerTakeawayDemo() {
  try { return JSON.parse(localStorage.getItem(CHAVE_TAKEAWAY_DEMO) || '{}'); }
  catch (e) { return {}; }
}

function gravarTakeawayDemo(todas) {
  try { localStorage.setItem(CHAVE_TAKEAWAY_DEMO, JSON.stringify(todas)); }
  catch (e) { /* segue sem persistir */ }
}

/* Formato do `lerItens` do backend/src/servicos/pedidos.js, campo por
   campo — é o que o ecrã lê, e discordar aqui era descobrir só contra o
   servidor real. */
function itensTakeawayDemo(pedidos) {
  return pedidos.map(function (linha, i) {
    const p = catalogoDemo().find(x => x.id === Number(linha.produtoId));
    if (!p) throw erroSimulado(`O produto ${linha.produtoId} não existe.`, 400);
    if (p.ativo === false || p.disponivel === false) {
      throw erroSimulado(`O "${p.nome}" não está disponível hoje.`, 400);
    }
    const qtd = Math.max(1, Number(linha.quantidade) || 1);
    return {
      id: i + 1,
      produtoId: p.id,
      nome: p.nome,
      categoria: p.categoria,
      quantidade: qtd,
      precoUnit: Number(p.preco),
      subtotal: Number((Number(p.preco) * qtd).toFixed(2)),
      observacao: linha.observacao ? String(linha.observacao).trim().slice(0, 300) : null,
    };
  });
}

/* Uma linha do `gestao/produtos` (docs/API.md 4.9). As quantidades
   passam pelo stockAtualDemo para o catálogo (F-49) e o ecrã de stock
   (F-52) nunca mostrarem números diferentes do mesmo produto. */
function linhaProdutoDemo(p) {
  const stock = p.controla_stock ? stockAtualDemo(p) : null;
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao || '',
    preco: p.preco,
    categoria: p.categoria,
    imagem: p.imagem || null,
    ativo: p.ativo !== false,
    disponivel: p.disponivel !== false,
    controla_stock: !!p.controla_stock,
    quantidade_atual:  stock ? stock.quantidade_atual  : null,
    quantidade_minima: stock ? stock.quantidade_minima : null,
  };
}

/* Valida o corpo de um POST/PATCH de produto e devolve só os campos
   aceites. `completo` distingue criar (o nome, o preço e a categoria
   são obrigatórios) de editar (só se valida o que vier).

   Esta validação é a MESMA que o servidor tem de fazer, não um
   substituto dela: o front-end valida para dar uma mensagem útil de
   imediato, o servidor valida porque é ele que decide. */
function validarProdutoDemo(corpo, completo) {
  const out = {};
  const tem = c => Object.prototype.hasOwnProperty.call(corpo, c);

  if (completo || tem('nome')) {
    const nome = String(corpo.nome || '').trim();
    if (!nome) throw erroSimulado('O nome é obrigatório.', 400);
    if (nome.length > 80) throw erroSimulado('O nome não pode passar dos 80 caracteres.', 400);
    out.nome = nome;
  }

  if (completo || tem('preco')) {
    const preco = Number(corpo.preco);
    if (!isFinite(preco) || preco <= 0) throw erroSimulado('O preço tem de ser maior do que zero.', 400);
    // Duas casas, sempre. Um preço com três casas entra na base e sai
    // arredondado noutro sítio qualquer, e as contas deixam de fechar.
    out.preco = Math.round(preco * 100) / 100;
  }

  if (completo || tem('categoria')) {
    const cat = String(corpo.categoria || '').trim();
    if (!cat) throw erroSimulado('A categoria é obrigatória.', 400);
    out.categoria = cat;
  }

  if (tem('descricao')) out.descricao = String(corpo.descricao || '').trim().slice(0, 300);
  if (tem('imagem'))    out.imagem    = String(corpo.imagem || '').trim() || null;
  if (tem('ativo'))      out.ativo      = corpo.ativo !== false;
  if (tem('disponivel')) out.disponivel = corpo.disponivel !== false;

  /* ── A quantidade NÃO se muda por aqui (08/09, decisão do João) ────
     Este endpoint recusa `quantidade_atual` num PATCH. Não a converte
     num acerto, não a ignora em silêncio: devolve 400 e diz onde é.

     Eu tinha proposto tratá-la como um `acerto`. Estava errado, e o
     argumento dele é o meu levado até ao fim. O cenário:

       20h03  o gerente abre o formulário do bitoque; a caixa da
              quantidade traz 20
       20h05  a cozinha confirma duas rondas — saem 4
       20h07  ele corrige o PREÇO e grava

     O formulário manda os 20 que trazia desde as 20h03, e isso apagava
     os 4 que saíram — desta vez com data, carimbo e o nome dele, com ar
     de decisão. Um erro invisível é mau; um erro invisível com ar de
     deliberado é pior, porque ninguém volta a pô-lo em causa.

     Um acerto tem de ser um ato com motivo, nunca um efeito secundário
     de mudar um preço. */
  if (!completo && tem('quantidade_atual')) {
    throw erroSimulado(
      'A existência não se muda aqui. Usa o ecrã de Stock (POST /gestao/stock/:id/movimento).', 400);
  }

  if (tem('controla_stock')) {
    out.controla_stock = !!corpo.controla_stock;
    if (out.controla_stock) {
      const minimo = Number(corpo.quantidade_minima);
      if (!Number.isInteger(minimo) || minimo < 0) throw erroSimulado('O mínimo tem de ser um inteiro não negativo.', 400);
      out.quantidade_minima = minimo;

      /* Num produto NOVO a existência inicial é aceite — não há nada que
         ela possa apagar, porque o produto não existia há um segundo. O
         servidor grava-a como movimento nº 1 do tipo `entrada`, para a
         cadeia começar sempre em 0 e não haver quantidade nenhuma no
         sistema sem origem registada (ponto do João, 08/09).

         Ligar o controlo de stock a um produto que já existia começa em
         0: a primeira contagem entra como `entrada` no ecrã de Stock,
         que é onde as entradas se registam. */
      if (completo) {
        const atual = Number(corpo.quantidade_atual ?? 0);
        if (!Number.isInteger(atual) || atual < 0) throw erroSimulado('A existência inicial tem de ser um inteiro não negativo.', 400);
        out.quantidade_atual = 0;          // a cadeia começa em zero…
        out.entrada_inicial   = atual;     // …e o resto é movimento nº 1
      }
      /* Num PATCH não se escreve quantidade nenhuma aqui — nem sequer um
         zero. Quem decide se há alguma coisa a fazer é o handler, e só
         quando o `controla_stock` MUDA de facto.
         Sem isto, reenviar `controla_stock: true` sem o alterar (que é o
         que qualquer formulário faz ao gravar) punha o produto a zero e
         apagava os movimentos — o cenário das 20h03, entrado por outra
         porta. Foi o teste da F-50 que o apanhou. */
    } else {
      // Deixar de controlar stock não guarda uma quantidade órfã: o
      // produto passa a "nunca acaba", que é o que a bandeira quer dizer.
      out.quantidade_atual = null;
      out.quantidade_minima = null;
    }
  }

  return out;
}

/* Uma linha do `gestao/stock`, no formato combinado no docs/API.md 4.8.
   O `baixo` vem calculado de propósito: nem a cozinha nem o gerente têm
   de saber a regra (regra 21 do CONTEXTO), só olhar. */
function linhaStockDemo(produto) {
  const { quantidade_atual, quantidade_minima } = stockAtualDemo(produto);
  return {
    id: produto.id,
    nome: produto.nome,
    categoria: produto.categoria,
    quantidade_atual,
    quantidade_minima,
    baixo: quantidade_atual <= quantidade_minima,
  };
}

function erroSimulado(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

/**
 * totalDemo / numItensDemo — O cálculo do total, feito UMA vez só.
 *
 * No backend real isto é a vista `vw_total_sessao` (ideia do João, 02/09):
 * em vez de cada endpoint somar por sua conta, todos leem o mesmo cálculo.
 * Assim os dois lados não "concordam por sorte" — é impossível
 * discordarem. Aqui na simulação a ideia é a mesma: nenhum sítio deste
 * ficheiro soma itens à mão, chamam todos estas duas funções.
 *
 * Rondas em `cancelado` ficam de fora: a cozinha não fez, o cliente não
 * paga (docs/API.md 3.10.4). Os itens continuam a ir no payload — só não
 * contam para o dinheiro.
 */
function itensQueContam(sessao) {
  return itensComEstado(sessao).filter(i => i.estado !== 'cancelado');
}

function totalDemo(sessao) {
  return itensQueContam(sessao)
    .reduce((acc, i) => acc + Number(i.precoUnit) * i.quantidade, 0)
    .toFixed(2);
}

function numItensDemo(sessao) {
  return itensQueContam(sessao).reduce((acc, i) => acc + i.quantidade, 0);
}

/* ── RONDAS (docs/API.md 3.10) ────────────────────────────────────
   O estado é do pedido (a ronda), não do item. Mas a sessão continua
   a devolver os itens em lista simples, cada um com o estado da ronda
   a que pertence — é isso que mantém o mesa.html a funcionar sem
   mexer numa linha. */

let contadorRondas = 0;

function proximoNumeroRonda() {
  contadorRondas += 1;
  const id = (Math.floor(Date.now() / 1000) % 10000) + contadorRondas;
  // Curto e legivel para se gritar no balcao. Sem 0/O/1/I, que se
  // confundem quando alguem le o numero em voz alta.
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let sufixo = '';
  for (let i = 0; i < 5; i++) sufixo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return { id, numero: `PED-${sufixo}` };
}

/* Que estados se podem seguir a cada estado (B-32, 07/09). O servidor
   recusa os saltos inválidos com 409 e diz quais eram os permitidos.

   Estava escrito dentro do handler das rondas de mesa, e passou para
   aqui a 10/09 quando o take away precisou das MESMAS transições: duas
   cópias desta tabela era uma encomenda para levar a poder saltar do
   "recebido" para o "entregue" só porque a segunda cópia se esqueceu de
   uma linha. Um borrego para levar passa pelos mesmos estados que um
   borrego para a mesa 4 — a tabela é uma. */
const TRANSICOES_RONDA = {
  recebido:      ['confirmado', 'cancelado'],
  confirmado:    ['em_preparacao', 'cancelado'],
  em_preparacao: ['pronto', 'cancelado'],
  pronto:        ['entregue'],
  entregue:      [],
  cancelado:     [],
};

/** estadoDaRonda — Estado da ronda a que um item pertence. */
function estadoDaRonda(sessao, item) {
  const ronda = (sessao.rondas || []).find(r => r.id === item.pedidoId);
  return ronda ? ronda.estado : 'recebido';
}

/** itensComEstado — Itens da sessão já com o estado da respetiva ronda. */
function itensComEstado(sessao) {
  return (sessao.itens || []).map(item => ({ ...item, estado: estadoDaRonda(sessao, item) }));
}

async function simularEndpoint(endpoint, opcoes) {
  await new Promise(r => setTimeout(r, 350)); // simula latência de rede
  const metodo = (opcoes.method || 'GET').toUpperCase();
  const [caminho, queryString] = endpoint.split('?');
  const query = new URLSearchParams(queryString || '');

  /* Ver a nota da armadilha do recurso meio ligado, lá em cima. */
  const recursoReal = escritaFingidaSobreRecursoReal(caminho, metodo);
  if (recursoReal) {
    console.warn(
      `[api] ${metodo} ${caminho} recusado: o "${recursoReal}" já é servido a sério, `
      + 'mas este caminho ainda não. Simulá-lo dizia "gravado" sem gravar nada.'
    );
    throw erroSimulado(
      `O servidor ainda não tem o "${caminho}". Enquanto não tiver, esta alteração `
      + 'não fica gravada — por isso não a damos por feita.', 501);
  }

  /* ── health ────────────────────────────────────────────────────── */
  if (caminho === 'health') return { ok: true, ts: new Date().toISOString() };

  /* ── auth (docs/API.md 4.1 / 4.3) ──────────────────────────────── */
  if (caminho === 'auth/login' && metodo === 'POST') {
    const { email, password } = opcoes.body || {};
    const conta = CONTAS_DEMO.find(c => c.email.toLowerCase() === String(email).toLowerCase());
    if (!conta || conta.password !== password) {
      throw erroSimulado('Email ou palavra-passe incorretos.', 401);
    }
    /* O `idUtilizador` entrou a 10/09 com o X-11: o servidor passou a
       devolvê-lo no login e no /auth/eu, e chamou-lhe exatamente o nome
       que a linha do `gestao/funcionarios` usa — dois nomes para o mesmo
       número era um convite a comparar os campos errados.
       Aqui sai do FUNCIONARIOS_DEMO em vez de ser um número à parte:
       duas fontes para o mesmo id davam um ecrã a marcar "a tua conta"
       na pessoa errada, que é precisamente o problema que ele resolve. */
    const eu = FUNCIONARIOS_DEMO.find(f => f.email === conta.email);
    return {
      token: `demo.${btoa(conta.email)}.${Date.now()}`,
      utilizador: {
        nome: conta.nome, email: conta.email, nivel: conta.nivel,
        idUtilizador: eu ? eu.idUtilizador : null,
      },
    };
  }

  if (caminho === 'auth/eu') {
    const sessao = obterSessao();
    if (!sessao) throw erroSimulado('Sessão inválida ou expirada.', 401);
    /* O id vem do email escondido no token demo, e não do que ficou
       guardado na sessão: é o mesmo raciocínio do servidor, que relê a
       base em vez de acreditar no token (X-11). */
    const email = emailDaSessaoDemo();
    const eu = email ? FUNCIONARIOS_DEMO.find(f => f.email === email) : null;
    return {
      nome: sessao.nome,
      nivel: sessao.nivel,
      idUtilizador: eu ? eu.idUtilizador : null,
    };
  }

  /* ── produtos (docs/API.md 4.2) ────────────────────────────────── */
  if (caminho === 'produtos') {
    const categoria = query.get('categoria');
    const lista = catalogoDemo().filter(p => p.ativo && (!categoria || p.categoria === categoria));
    return lista.map(p => ({ ...p }));
  }

  /* ── gestao/produtos (F-49, 04/09) ─────────────────────────────────
     O `produtos` aqui em cima é a vista do CLIENTE: esconde os inativos
     e, no servidor real, também os que estão sem stock (docs/API.md 4.2,
     regra 25 do CONTEXTO.md). Serve o site e a mesa, e está certo assim.

     Mas um ecrã de administração precisa exatamente do contrário: é a
     ver os inativos que se reativa um produto, e é a ver os que estão a
     zero que se dá por eles. Se o F-49 lesse do `produtos`, o
     administrador via um catálogo incompleto e não tinha como saber.

     Por isso este endpoint devolve TUDO, com as bandeiras à vista, e
     fica à espera do B-61 no João — mesmo formato, é só trocar a
     origem. Enquanto isso, a lista de demonstração está toda ativa, por
     isso as colunas de estado mostram sempre "ativo/disponível"; a
     lógica que desenha os outros estados está lá e acende sozinha
     quando os dados reais os trouxerem. */
  if (caminho === 'gestao/produtos' && metodo === 'GET') {
    return catalogoDemo().map(p => linhaProdutoDemo(p));
  }

  /* ── Escrita no catálogo — F-50 / B-61 (docs/API.md 4.9) ───────────
     Criar e editar. NÃO há apagar, e é de propósito: um produto que já
     apareceu num pedido não pode desaparecer sem levar consigo o
     histórico — a linha do `item_pedido` ficava a apontar para o nada,
     e as estatísticas do F-57 passavam a mentir. Quem sai da carta
     fica `ativo: false`: continua a existir para o passado e deixa de
     aparecer para o futuro. */
  if (caminho === 'gestao/produtos' && metodo === 'POST') {
    const campos = validarProdutoDemo(opcoes.body || {}, true);
    const estado = lerCatalogoDemo();
    const entradaInicial = campos.entrada_inicial || 0;
    delete campos.entrada_inicial;

    const novo = { id: proximoIdDemo(), ...campos };
    estado.novos.push(novo);
    gravarCatalogoDemo(estado);

    /* O produto nasce a zero e a existência inicial entra como movimento
       nº 1, do tipo `entrada` — assim a cadeia antes/depois começa
       sempre em 0 e nenhuma quantidade aparece no sistema sem origem
       registada. Aqui simula-se com o mesmo ajuste que o ecrã de stock
       usa; no servidor (B-63) é uma linha na tabela de movimentos. */
    limparAjusteStockDemo(novo.id);
    if (novo.controla_stock && entradaInicial > 0) {
      const ajustes = lerStockDemo();
      ajustes[String(novo.id)] = { ajuste: entradaInicial, minimo: null };
      gravarStockDemo(ajustes);
    }

    return linhaProdutoDemo(novo);
  }

  const prodMatch = caminho.match(/^gestao\/produtos\/(\d+)$/);
  if (prodMatch && metodo === 'PATCH') {
    const id = Number(prodMatch[1]);
    const atual = catalogoDemo().find(p => p.id === id);
    if (!atual) throw erroSimulado('Produto não encontrado.', 404);

    // Só valida o que vem — um PATCH que só muda o `disponivel` não tem
    // de reenviar o nome e o preço.
    const campos = validarProdutoDemo(opcoes.body || {}, false);
    const estado = lerCatalogoDemo();

    const indiceNovo = estado.novos.findIndex(p => p.id === id);
    if (indiceNovo !== -1) {
      estado.novos[indiceNovo] = { ...estado.novos[indiceNovo], ...campos };
    } else {
      estado.edicoes[String(id)] = { ...(estado.edicoes[String(id)] || {}), ...campos };
    }
    gravarCatalogoDemo(estado);

    /* Só se mexe no stock quando o `controla_stock` MUDA mesmo.

       Reenviar `controla_stock: true` sem o alterar é o que qualquer
       formulário faz ao gravar — se isso limpasse os movimentos, mudar
       o preço punha o produto a zero. É o cenário das 20h03 outra vez,
       por outra porta.

       Desligar deita fora os movimentos (o produto passa a "nunca
       acaba"; uma quantidade órfã só confundia quem a encontrasse).
       Ligar começa em zero, e a primeira contagem entra como `entrada`
       no ecrã de Stock, com quem a fez e quando. */
    const controlavaAntes = !!atual.controla_stock;
    if (Object.prototype.hasOwnProperty.call(campos, 'controla_stock')
        && campos.controla_stock !== controlavaAntes) {
      limparAjusteStockDemo(id);
      const registo = estado.novos.findIndex(p => p.id === id) !== -1
        ? estado.novos[estado.novos.findIndex(p => p.id === id)]
        : estado.edicoes[String(id)];
      registo.quantidade_atual = campos.controla_stock ? 0 : null;
      gravarCatalogoDemo(estado);
    }

    return linhaProdutoDemo(catalogoDemo().find(p => p.id === id));
  }

  /* ── categorias (docs/API.md 4.2) ──────────────────────────────────
     Faltava aqui: o `categorias` estava na lista ENDPOINTS_REAIS mas não
     tinha resposta simulada nenhuma. Com `?simular=1` — que é como
     correm os testes e as demonstrações sem servidor — a chamada
     rebentava e as páginas caíam sempre no plano B (derivar a ordem dos
     produtos). Funcionava, mas escondia o caminho que corre a sério.
     O que importa aqui é o campo `ordem`: é ele que manda na ementa. */
  if (caminho === 'categorias') {
    /* ── A ordem estava escrita à mão aqui (corrigido a 09/09) ─────
       Havia um array fixo com os quatro nomes, e a ordem da ementa
       saía dele. Resultado: mexer na ordem no ecrã de Categorias
       (F-51) não mudava nada no site — duas fontes de verdade para a
       mesma coisa, e a que o cliente vê era justamente a que ninguém
       podia editar. Foi o teste da F-51 que deu por isso.

       Continua a esconder do cliente as categorias desligadas e as que
       não tenham nenhum produto ativo: uma gaveta vazia na ementa é
       pior do que uma gaveta a menos. */
    return categoriasDemo()
      .filter(c => c.ativo !== false)
      .filter(c => catalogoDemo().some(p => p.ativo && p.categoria === c.nome))
      .map(c => ({ id: c.id, nome: c.nome, descricao: c.descricao || '', ordem: c.ordem }));
  }

  /* ── gestao/categorias — F-51 / B-62 (docs/API.md 4.11) ───────────
     O `categorias` público esconde as que não têm produtos ativos; um
     ecrã de administração precisa do contrário, pela mesma razão do
     `gestao/produtos`: é a ver uma categoria vazia que se percebe que
     ela existe e não serve para nada.

     Traz o número de produtos de cada uma. Não é enfeite — é o que
     decide se a categoria se pode desativar sem deixar pratos órfãos,
     e mostrar esse número é mais honesto do que descobrir só ao gravar. */
  if (caminho === 'gestao/categorias' && metodo === 'GET') {
    return categoriasDemo().map(c => linhaCategoriaDemo(c));
  }

  if (caminho === 'gestao/categorias' && metodo === 'POST') {
    const campos = validarCategoriaDemo(opcoes.body || {}, true);
    const estado = lerCategoriasDemo();
    const todas = categoriasDemo();
    if (todas.some(c => mesmoNome(c.nome, campos.nome))) {
      throw erroSimulado('Já existe uma categoria com esse nome.', 409);
    }
    const nova = {
      id: Math.max(0, ...todas.map(c => Number(c.id) || 0)) + 1,
      ordem: Math.max(0, ...todas.map(c => Number(c.ordem) || 0)) + 1,
      ativo: true,
      ...campos,
    };
    estado.novas.push(nova);
    gravarCategoriasDemo(estado);
    return linhaCategoriaDemo(nova);
  }

  const catMatch = caminho.match(/^gestao\/categorias\/(\d+)$/);
  if (catMatch && metodo === 'PATCH') {
    const id = Number(catMatch[1]);
    const atual = categoriasDemo().find(c => c.id === id);
    if (!atual) throw erroSimulado('Categoria não encontrada.', 404);

    const campos = validarCategoriaDemo(opcoes.body || {}, false);

    if (campos.nome && categoriasDemo().some(c => c.id !== id && mesmoNome(c.nome, campos.nome))) {
      throw erroSimulado('Já existe uma categoria com esse nome.', 409);
    }

    /* Desativar uma categoria com produtos deixaria os pratos numa
       gaveta que já não aparece — somem da ementa sem ninguém ter
       decidido isso prato a prato. Recusa-se À PRIMEIRA e diz-se quantos
       são; quem quiser mesmo repete com `confirmar: true`.

       Isto era diferente até 10/09: aqui recusava-se sempre, e o B-62
       trouxe a porta de saída. Uma simulação mais restritiva que o
       servidor é tão má como uma mais permissiva — nesta, o ecrã que se
       constrói contra ela nunca aprende o caminho que existe mesmo, e a
       funcionalidade fica lá enterrada sem ninguém lhe chegar. */
    if (campos.ativo === false && atual.ativo !== false) {
      const quantos = produtosNaCategoria(atual.nome).length;
      if (quantos > 0 && (opcoes.body || {}).confirmar !== true) {
        const erro = erroSimulado(
          `A categoria "${atual.nome}" tem ${quantos} produto${quantos === 1 ? '' : 's'} ` +
          'ativo(s). Desligá-la tira-os todos da ementa do cliente.', 409);
        erro.produtos = quantos;
        erro.comoConfirmar = 'Repete o pedido com "confirmar": true.';
        throw erro;
      }
    }

    const estado = lerCategoriasDemo();
    const iNova = estado.novas.findIndex(c => c.id === id);
    if (iNova !== -1) estado.novas[iNova] = { ...estado.novas[iNova], ...campos };
    else estado.edicoes[String(id)] = { ...(estado.edicoes[String(id)] || {}), ...campos };

    /* Renomear tem de arrastar os produtos. Aqui os produtos guardam o
       NOME da categoria; na base de dados guardam o id, e por isso lá
       este problema não existe. É uma diferença da simulação, não do
       desenho — ver a nota no docs/API.md 4.11. */
    if (campos.nome && campos.nome !== atual.nome) {
      const cat = lerCatalogoDemo();
      catalogoDemo().forEach(function (p) {
        if (p.categoria !== atual.nome) return;
        const iP = cat.novos.findIndex(x => x.id === p.id);
        if (iP !== -1) cat.novos[iP].categoria = campos.nome;
        else cat.edicoes[String(p.id)] = { ...(cat.edicoes[String(p.id)] || {}), categoria: campos.nome };
      });
      gravarCatalogoDemo(cat);
    }

    gravarCategoriasDemo(estado);
    return linhaCategoriaDemo(categoriasDemo().find(c => c.id === id));
  }

  /* Reordenar: a ordem é a razão de as categorias existirem como
     entidade em vez de um texto no produto — é ela que põe as entradas
     antes das sobremesas na ementa. Manda-se a lista inteira de ids
     pela ordem nova, e não "sobe esta uma posição": assim não há dois
     pedidos a trocarem posições ao mesmo tempo e a deixarem buracos. */
  if (caminho === 'gestao/categorias/ordem' && metodo === 'PUT') {
    const ids = (opcoes.body || {}).ids;
    const todas = categoriasDemo();
    if (!Array.isArray(ids) || ids.length !== todas.length) {
      throw erroSimulado('Manda a lista completa de ids, pela ordem nova.', 400);
    }
    const conhecidos = new Set(todas.map(c => c.id));
    if (!ids.every(id => conhecidos.has(Number(id)))) {
      throw erroSimulado('Há ids que não existem.', 400);
    }

    const estado = lerCategoriasDemo();
    ids.forEach(function (id, i) {
      const n = Number(id);
      const iNova = estado.novas.findIndex(c => c.id === n);
      if (iNova !== -1) estado.novas[iNova].ordem = i + 1;
      else estado.edicoes[String(n)] = { ...(estado.edicoes[String(n)] || {}), ordem: i + 1 };
    });
    gravarCategoriasDemo(estado);
    return categoriasDemo().map(c => linhaCategoriaDemo(c));
  }

  /* ── gestao/funcionarios — F-53 / B-64 ───────────────────────────
     Nível administrador, e só. Um ecrã que cria contas e muda cargos é
     o ecrã que decide quem entra onde: se a cozinha lhe chegasse,
     bastava mudar o próprio cargo para ter tudo.

     Traz os desativados também. É a ver uma conta desativada que se
     reativa uma — esconder-los deixava o "readmitir alguém" sem ecrã. */
  if (caminho === 'gestao/funcionarios' && metodo === 'GET') {
    const s = obterSessao();
    if (!s) throw erroSimulado('Sessão inválida ou expirada.', 401);
    if (s.nivel !== 'administrador') {
      throw erroSimulado('Só a administração vê as contas dos funcionários.', 403);
    }
    return funcionariosDemo().map(f => linhaFuncionarioDemo(f));
  }

  if (caminho === 'gestao/funcionarios' && metodo === 'POST') {
    const s = obterSessao();
    if (!s || s.nivel !== 'administrador') {
      throw erroSimulado('Só a administração cria contas.', 403);
    }
    const campos = validarFuncionarioDemo(opcoes.body || {}, true);
    const todos = funcionariosDemo();

    /* O email é a credencial de entrada. Dois iguais e o login deixa de
       saber quem é quem — e quem escolhe qual dos dois entra é a ordem
       da consulta, que é dizer: ninguém. */
    if (todos.some(f => String(f.email).toLowerCase() === campos.email)) {
      throw erroSimulado('Já existe uma conta com esse email.', 409);
    }

    const estado = lerFuncionariosDemo();
    const proximoId = Math.max(0, ...todos.map(f => Number(f.id) || 0)) + 1;
    const novo = {
      id: proximoId,
      // Dois ids diferentes, como na base. Ver a nota no FUNCIONARIOS_DEMO.
      idUtilizador: Math.max(0, ...todos.map(f => Number(f.idUtilizador) || 0)) + 1,
      ativo: true,
      data_contratacao: new Date().toISOString().slice(0, 10),
      ...campos,
    };
    estado.novos.push(novo);
    gravarFuncionariosDemo(estado);
    return linhaFuncionarioDemo(novo);
  }

  const funcMatch = caminho.match(/^gestao\/funcionarios\/(\d+)$/);
  if (funcMatch && metodo === 'PATCH') {
    const s = obterSessao();
    if (!s || s.nivel !== 'administrador') {
      throw erroSimulado('Só a administração muda contas.', 403);
    }

    const id = Number(funcMatch[1]);
    const atual = funcionariosDemo().find(f => f.id === id);
    if (!atual) throw erroSimulado('Esse funcionário não existe.', 404);

    const campos = validarFuncionarioDemo(opcoes.body || {}, false);

    if (campos.email && funcionariosDemo().some(
      f => f.id !== id && String(f.email).toLowerCase() === campos.email)) {
      throw erroSimulado('Já existe uma conta com esse email.', 409);
    }

    /* ── A REGRA DO ÚLTIMO ADMINISTRADOR (B-64) ────────────────────
       Desativar o último administrador — ou baixar-lhe o cargo — fecha
       a porta da aplicação de gestão por dentro. Não há ecrã para
       desfazer, porque o ecrã que desfazia é este, e este acabou de
       ficar inacessível: a partir daí só se resolve com SQL à mão.

       A conta que faz o pedido não está isenta. Ser quem manda não muda
       o resultado — muda só a frase, porque quem se desativa a si
       próprio merece ouvir o que lhe vai acontecer, não uma nota sobre
       uma terceira pessoa.

       Regra do João, e não estava pedida. Vale a pena dizer isso: é
       exatamente o género de coisa que só aparece quando quem constrói
       o servidor pensa no ecrã, em vez de entregar os endpoints e
       esperar que alguém se lembre. */
    const vaiDesativar = campos.ativo === false && atual.ativo !== false;
    const vaiTirarAdmin = campos.cargo !== undefined
      && NIVEL_POR_CARGO_DEMO[atual.cargo] === 'administrador'
      && NIVEL_POR_CARGO_DEMO[campos.cargo] !== 'administrador';

    if ((vaiDesativar || vaiTirarAdmin)
        && NIVEL_POR_CARGO_DEMO[atual.cargo] === 'administrador'
        && outrosAdminsAtivosDemo(id) === 0) {
      const proprio = String(atual.email).toLowerCase() === emailDaSessaoDemo();
      const erro = erroSimulado(proprio
        ? 'És o único administrador ativo. Se te desativares, ninguém consegue '
          + 'entrar na aplicação de gestão — nem tu.'
        : `"${atual.nome}" é o único administrador ativo. Promove outra pessoa `
          + 'a administrador antes de o desativar.', 409);
      erro.ultimoAdmin = true;
      erro.proprio = proprio;
      throw erro;
    }

    const estado = lerFuncionariosDemo();
    const iNovo = estado.novos.findIndex(f => f.id === id);
    if (iNovo !== -1) estado.novos[iNovo] = { ...estado.novos[iNovo], ...campos };
    else estado.edicoes[String(id)] = { ...(estado.edicoes[String(id)] || {}), ...campos };
    gravarFuncionariosDemo(estado);

    return linhaFuncionarioDemo(funcionariosDemo().find(f => f.id === id));
  }

  /* ── stock (docs/CONTEXTO.md §6.3, regra 21 — F-62, 04/09) ───────
     Endpoint ainda por construir no servidor (B-63); enquanto isso não
     acontece, simula-se aqui com o MESMO formato já combinado com o
     João em `docs/CONTEXTO.md §8.2` (`/api/gestao/stock`), para não
     ser preciso mexer em mais nada quando a API real existir.
     Só os produtos que controlam stock — os outros nunca acabam. O
     campo `baixo` já vem calculado: nem a cozinha nem o gerente têm de
     saber a regra (quantidade_atual <= quantidade_minima), só olhar. */
  if (caminho === 'gestao/stock' && metodo === 'GET') {
    return catalogoDemo()
      .filter(p => p.controla_stock)
      .map(p => linhaStockDemo(p));
  }

  /* ── Escrita no stock — F-52 / B-63 (docs/API.md 4.8) ──────────────
     Três motivos em vez de um campo "quantidade" que se sobrepõe:

       entrada  → chegou mercadoria         (+)
       quebra   → partiu-se, estragou-se    (−)
       acerto   → contámos e é este o número (=)

     Porquê separar: um campo único perde o PORQUÊ, e sem o porquê não
     há forma de distinguir mais tarde uma encomenda de uma perda. E
     porque `entrada` e `quebra` somam do lado do servidor em vez de
     gravarem um total, duas pessoas a ajustar ao mesmo tempo — ou um
     ajuste feito enquanto a cozinha confirma uma ronda — somam-se em
     vez de se apagarem. O `acerto` é o único absoluto, e é suposto
     ser: é uma contagem física, manda sobre o que o sistema julgava.

     Enquanto o B-63 não existir, isto corre aqui e guarda no browser. */
  const movMatch = caminho.match(/^gestao\/stock\/(\d+)\/movimento$/);
  if (movMatch && metodo === 'POST') {
    const produto = catalogoDemo().find(p => p.id === Number(movMatch[1]) && p.controla_stock);
    if (!produto) throw erroSimulado('Produto sem controlo de stock.', 404);

    const { tipo, quantidade } = opcoes.body || {};
    const qtd = Number(quantidade);
    if (!Number.isInteger(qtd) || qtd < 0) {
      throw erroSimulado('A quantidade tem de ser um número inteiro não negativo.', 400);
    }
    if (!['entrada', 'quebra', 'acerto'].includes(tipo)) {
      throw erroSimulado('Tipo de movimento desconhecido.', 400);
    }

    /* O `acerto` é só do administrador — decisão do João, 08/09, e é a
       certa. A `entrada` e a `quebra` são factos que quem está na
       cozinha vê acontecer; o `acerto` é o único que apaga a
       contabilidade e a substitui por uma afirmação. E é precisamente a
       diferença entre o que o sistema julgava e o que lá está que
       interessa à gestão — deixar quem está mais perto do stock apagar
       essa diferença é retirar o único controlo que existe.

       Esta verificação está aqui e não só no ecrã de propósito:
       esconder um botão não impede ninguém de chamar o endpoint. No
       servidor real (B-63) tem de ser repetida, e é lá que manda. */
    const sessaoStock = typeof obterSessao === 'function' ? obterSessao() : null;
    if (tipo === 'acerto' && (!sessaoStock || sessaoStock.nivel !== 'administrador')) {
      throw erroSimulado('Só a administração pode fazer acertos de inventário.', 403);
    }

    const ajustes = lerStockDemo();
    const chave = String(produto.id);
    const guardado = ajustes[chave] || { ajuste: 0, minimo: null };
    const base = Number(produto.quantidade_atual) || 0;
    const antes = Math.max(0, base + (Number(guardado.ajuste) || 0));

    let depois;
    if (tipo === 'entrada')      depois = antes + qtd;
    else if (tipo === 'quebra')  depois = Math.max(0, antes - qtd);
    else                         depois = qtd;          // acerto

    guardado.ajuste = depois - base;
    ajustes[chave] = guardado;
    gravarStockDemo(ajustes);

    return linhaStockDemo(produto);
  }

  const minMatch = caminho.match(/^gestao\/stock\/(\d+)\/minimo$/);
  if (minMatch && metodo === 'PATCH') {
    const produto = catalogoDemo().find(p => p.id === Number(minMatch[1]) && p.controla_stock);
    if (!produto) throw erroSimulado('Produto sem controlo de stock.', 404);

    const novo = Number((opcoes.body || {}).quantidade_minima);
    if (!Number.isInteger(novo) || novo < 0) {
      throw erroSimulado('O mínimo tem de ser um número inteiro não negativo.', 400);
    }

    const ajustes = lerStockDemo();
    const chave = String(produto.id);
    ajustes[chave] = { ...(ajustes[chave] || { ajuste: 0 }), minimo: novo };
    gravarStockDemo(ajustes);

    return linhaStockDemo(produto);
  }

  /* ── admin/estatisticas — F-55/F-56/F-57 · B-72 (docs/API.md 4.10) ──
     Só administrador. A cozinha e o balcão não veem faturação: o
     monitor da cozinha fica ligado o turno inteiro num sítio por onde
     passa gente, e o balcão não tem decisão nenhuma a tomar com estes
     números.

     ── DE ONDE VÊM OS NÚMEROS AQUI ──
     O "hoje" é calculado a partir das sessões de demonstração que estão
     no browser — as mesmas que o mesa.html escreve. Não é enfeite: quer
     dizer que, numa apresentação, fazer um pedido à mesa faz este ecrã
     mexer à frente de quem está a ver. Um painel de estatísticas com
     números fixos é um cartaz; este responde ao que se acabou de fazer.

     O histórico (dias e meses) não dá para inventar assim — não há
     passado nenhum no browser. Fica uma série fixa e plausível, marcada
     como tal, que a F-56 e a F-57 desenham. Quando o B-72 existir, vem
     do `historico_estado_pedido` e do `item_pedido` a sério. */
  if (caminho === 'admin/estatisticas') {
    const sessao = obterSessao();
    if (!sessao) throw erroSimulado('Sessão inválida ou expirada.', 401);
    if (sessao.nivel !== 'administrador') {
      throw erroSimulado('Só a administração vê as estatísticas.', 403);
    }

    const sessoes = lerSessoesDemo();
    const abertas = Object.values(sessoes).filter(s => estadoIgual(s.estado, 'aberta'));

    let pedidosHoje = 0, faturacaoHoje = 0, porFazer = 0;
    Object.values(sessoes).forEach(s => {
      const rondas = s.rondas || [];
      rondas.forEach(r => {
        if (estadoIgual(r.estado, 'cancelado')) return;   // não se cobra o que não se fez
        pedidosHoje += 1;
        if (!estadoIgual(r.estado, 'entregue')) porFazer += 1;
      });
      faturacaoHoje += Number(totalDemo(s)) || 0;
    });

    const stock = catalogoDemo().filter(p => p.controla_stock)
      .map(p => stockAtualDemo(p))
      .filter(q => q.quantidade_atual <= q.quantidade_minima).length;

    /* Série fixa, e é preciso que se saiba que é fixa: 30 dias e 6 meses
       inventados para a F-56 e a F-57 terem o que desenhar. Os valores
       oscilam à volta de uma média com fins de semana mais fortes, que é
       como um restaurante se comporta — mas são inventados. */
    const hoje = new Date();
    const porDia = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje.getTime() - i * 86400000);
      const fds = d.getDay() === 5 || d.getDay() === 6;      // sexta e sábado
      const base = fds ? 420 : 240;
      const oscila = ((d.getDate() * 37) % 100) / 100;        // determinista, não aleatório
      porDia.push({
        dia: d.toISOString().slice(0, 10),
        total: Math.round((base + oscila * 160) * 100) / 100,
      });
    }
    const porMes = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const oscila = ((d.getMonth() * 53) % 100) / 100;
      porMes.push({
        mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        total: Math.round((7200 + oscila * 2600) * 100) / 100,
      });
    }

    const totalMes = porDia.reduce((a, d) => a + d.total, 0);
    const pedidosMes = 243;

    return {
      simulado: true,          // o ecrã diz-o em voz alta; ver estatisticas.js
      hoje: {
        pedidos: pedidosHoje,
        faturacao: Math.round(faturacaoHoje * 100) / 100,
        media_por_pedido: pedidosHoje ? Math.round((faturacaoHoje / pedidosHoje) * 100) / 100 : 0,
        tempo_medio_preparacao_min: 13,
      },
      ontem: { pedidos: 9, faturacao: 141.20 },
      mes: {
        pedidos: pedidosMes,
        faturacao: Math.round(totalMes * 100) / 100,
        media_por_pedido: Math.round((totalMes / pedidosMes) * 100) / 100,
      },
      servico: {
        mesas_ocupadas: abertas.length,
        mesas_total: MESAS_DEMO.length,
        rondas_por_fazer: porFazer,
      },
      stock_baixo: stock,
      faturacao_por_dia: porDia,
      faturacao_por_mes: porMes,
      mais_vendidos: [
        { id: 7,  nome: 'Abate Misto',            quantidade: 38, total: 615.60 },
        { id: 8,  nome: 'Prega-me Isto',          quantidade: 31, total: 523.90 },
        { id: 9,  nome: 'Picanha na Brasa Negra', quantidade: 27, total: 432.00 },
        { id: 6,  nome: 'Francesinha em K.O.',    quantidade: 24, total: 292.80 },
        { id: 1,  nome: 'Abatata Frita',          quantidade: 22, total:  85.80 },
      ],
    };
  }

  /* ── mesas + tokens para imprimir os QR Codes (docs/API.md 4.6) ── */
  if (caminho === 'gestao/mesas/qrcodes') {
    return MESAS_DEMO.filter(m => m.ativa !== false).map(m => ({ ...m }));
  }

  /* ── mesas/:token/... (docs/API.md 3.2 a 3.5) ──────────────────── */
  const mesaMatch = caminho.match(/^mesas\/([^/]+)\/(sessao|conta|pedir|pedir-conta|chamar-empregado)$/);
  if (mesaMatch) {
    const [, token, accao] = mesaMatch;
    const mesa = MESAS_DEMO.find(m => m.qrToken === token);
    if (!mesa) throw erroSimulado('QR Code inválido.', 404);

    const sessoes = lerSessoesDemo();

    if (accao === 'sessao') {
      const morta = sessoes[token] &&
        (estadoIgual(sessoes[token].estado, 'fechada') || estadoIgual(sessoes[token].estado, 'cancelada'));
      if (!sessoes[token] || morta) {
        sessoes[token] = {
          id: Math.floor(Date.now() / 1000) % 100000,
          estado: 'aberta',
          abertaEm: new Date().toISOString(),
          itens: [],
          rondas: [],
        };
        gravarSessoesDemo(sessoes);
      }
      const s = sessoes[token];
      s.rondas = s.rondas || [];
      return {
        mesa: { id: mesa.id, numero: mesa.numero, lugares: mesa.lugares },
        sessao: {
          id: s.id, estado: s.estado, abertaEm: s.abertaEm,
          itens: itensComEstado(s),   // formato igual ao de antes
          total: totalDemo(s),
        },
      };
    }

    const sessao = sessoes[token];
    if (!sessao || estadoIgual(sessao.estado, 'fechada') || estadoIgual(sessao.estado, 'cancelada')) {
      throw erroSimulado(accao === 'pedir' ? 'Sem sessão ativa. Refresca a página.' : 'Sem sessão ativa.', accao === 'pedir' ? 409 : 404);
    }

    if (accao === 'pedir' && metodo === 'POST') {
      const itens = (opcoes.body || {}).itens;
      if (!Array.isArray(itens) || itens.length === 0) {
        throw erroSimulado('Envia pelo menos um item.', 400);
      }

      // Cada envio cria uma RONDA com estado próprio (docs/API.md 3.10)
      const ronda = {
        ...proximoNumeroRonda(),
        estado: 'recebido',       // docs/API.md 3.10 — minusculas
        criadoEm: new Date().toISOString(),
      };

      const criados = itens.map(({ produtoId, quantidade = 1, observacao }) => {
        const produto = catalogoDemo().find(p => p.id === Number(produtoId));
        if (!produto || !produto.ativo) throw erroSimulado(`Produto #${produtoId} não disponível.`, 400);
        return {
          id: Math.floor(Math.random() * 1e6),
          sessaoId: sessao.id,
          pedidoId: ronda.id,
          produtoId: produto.id,
          quantidade: Number(quantidade),
          precoUnit: produto.preco,
          observacao: observacao || null,
          estado: ronda.estado,     // espelho do estado da ronda
          criadoEm: ronda.criadoEm,
          produto: { ...produto },
        };
      });

      sessao.rondas = sessao.rondas || [];
      sessao.rondas.push(ronda);
      sessao.itens.push(...criados);
      gravarSessoesDemo(sessoes);

      return {
        mensagem: `${criados.length} item(ns) adicionado(s)!`,
        pedido: { id: ronda.id, numero: ronda.numero },
        itens: criados,
      };
    }

    if (accao === 'conta') {
      const porCategoria = {};
      itensComEstado(sessao).forEach(item => {
        const cat = item.produto.categoria;
        (porCategoria[cat] ||= []).push({
          id: item.id,
          nome: item.produto.nome,
          quantidade: item.quantidade,
          precoUnit: Number(item.precoUnit),
          subtotal: Number(item.precoUnit) * item.quantidade,
          estado: item.estado,
          observacao: item.observacao,
          criadoEm: item.criadoEm,
        });
      });
      return {
        mesa: { numero: mesa.numero },
        sessao: { id: sessao.id, estado: sessao.estado, abertaEm: sessao.abertaEm },
        porCategoria,
        total: totalDemo(sessao),
        numItens: numItensDemo(sessao),
      };
    }

    if (accao === 'pedir-conta' && metodo === 'POST') {
      if (!estadoIgual(sessao.estado, 'aberta')) throw erroSimulado('Sessão não está aberta.', 409);
      sessao.estado = 'aguarda_pagamento';
      gravarSessoesDemo(sessoes);
      return { mensagem: 'Conta pedida! Um empregado irá ter consigo em breve. 🧾' };
    }

    if (accao === 'chamar-empregado' && metodo === 'POST') {
      return { mensagem: 'Um empregado foi avisado e vem já à mesa. 🛎️' };
    }
  }

  /* ── pedidos/... — ecrãs do balcão e da cozinha (docs/API.md 3.6 a 3.9)
     Lêem as MESMAS sessões que o mesa.html escreve, por isso um pedido
     feito no telemóvel aparece mesmo no ecrã da cozinha. ──────────── */

  if (caminho === 'pedidos/ativos') {
    const sessoes = lerSessoesDemo();
    return Object.entries(sessoes)
      .filter(([, s]) => estadoIgual(s.estado, 'aberta') || estadoIgual(s.estado, 'aguarda_pagamento'))
      .map(([token, s]) => {
        const mesa = MESAS_DEMO.find(m => m.qrToken === token);
        return {
          sessaoId: s.id,
          estado: s.estado,
          abertaEm: s.abertaEm,
          mesa: { id: mesa?.id, numero: mesa?.numero, lugares: mesa?.lugares },
          numItens: numItensDemo(s),
          total: totalDemo(s),
          temPendentes: (s.rondas || []).some(r => ['recebido', 'confirmado', 'em_preparacao'].includes(r.estado)),
        };
      })
      .sort((a, b) => new Date(a.abertaEm) - new Date(b.abertaEm));
  }

  /* Rondas por fazer (docs/API.md 3.10.1) */
  /* ── take away (docs/API.md 4.13 / B-35) ───────────────────────
     Sem login, como as mesas. O número é a credencial do GET. */
  if (caminho === 'pedidos/takeaway' && metodo === 'POST') {
    const d = opcoes.body || {};

    /* As mesmas regras do servidor, com os mesmos limites. Uma
       simulação mais tolerante do que a realidade é pior do que não
       ter simulação: mente na direção que engana. */
    const nome = String(d.nome || '').trim();
    if (nome.length < 2) throw erroSimulado('Escreve o teu nome, para te chamarmos.', 400);
    if (nome.length > 120) throw erroSimulado('Nome demasiado longo.', 400);

    const telefone = String(d.telefone || '').trim();
    if (!/^[0-9+\s]{9,20}$/.test(telefone)) {
      throw erroSimulado('Telefone inválido. Usa só números.', 400);
    }

    const email = d.email ? String(d.email).trim().toLowerCase() : null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw erroSimulado('Email inválido.', 400);
    }

    if (!Array.isArray(d.itens) || d.itens.length === 0) {
      throw erroSimulado('A lista de itens está vazia.', 400);
    }
    if (d.itens.length > 50) throw erroSimulado('Demasiados itens de uma vez.', 400);

    const itens = itensTakeawayDemo(d.itens);
    const total = Number(itens.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
    const { id, numero } = proximoNumeroRonda();

    const todas = lerTakeawayDemo();
    todas[numero] = {
      id, numero, estado: 'recebido', tipo: 'take_away',
      nome, telefone, email,
      observacoes: d.observacoes ? String(d.observacoes).trim().slice(0, 500) : null,
      total, itens, criadoEm: new Date().toISOString(),
    };
    gravarTakeawayDemo(todas);

    /* O stock não desce aqui — desce quando a cozinha confirmar, como
       nos pedidos à mesa (B-58). Descontar no "recebido" descontava
       coisas que a cozinha ainda pode recusar. */
    return {
      mensagem: `Encomenda registada, ${nome.split(' ')[0]}! `
              + `Guarda o número ${numero} — é por ele que te vamos chamar.`,
      pedido: { id, numero, estado: 'recebido', tipo: 'take_away', total, nome },
      itens,
    };
  }

  const taMatch = caminho.match(/^pedidos\/takeaway\/([^/]+)$/);
  if (taMatch && metodo === 'GET') {
    const numero = decodeURIComponent(taMatch[1]).trim().toUpperCase();
    const enc = lerTakeawayDemo()[numero];
    if (!enc) throw erroSimulado('Não há nenhuma encomenda com esse número.', 404);

    /* NÃO devolve telefone nem email, igual ao servidor: quem sabe o
       número vê o estado, não os contactos de ninguém. */
    return {
      pedido: {
        id: enc.id, numero: enc.numero, estado: enc.estado,
        nome: enc.nome, total: enc.total,
        observacoes: enc.observacoes, hora: enc.criadoEm,
      },
      itens: enc.itens,
    };
  }

  if (caminho === 'pedidos/cozinha') {
    const sessoes = lerSessoesDemo();
    const linhas = [];
    Object.entries(sessoes).forEach(([token, s]) => {
      const mesa = MESAS_DEMO.find(m => m.qrToken === token);
      (s.rondas || [])
        .filter(r => ['recebido', 'confirmado', 'em_preparacao', 'pronto'].includes(r.estado))
        .forEach(r => linhas.push({
          id: r.id,
          numero: r.numero,
          estado: r.estado,
          criadoEm: r.criadoEm,
          tipo: 'mesa',   // e 'take_away' logo a seguir (docs/API.md 3.10.1)
          mesa: { numero: mesa?.numero, sessaoId: s.id },
          itens: s.itens
            .filter(i => i.pedidoId === r.id)
            .map(i => ({
              id: i.id,
              nome: i.produto.nome,
              categoria: i.produto.categoria,
              quantidade: i.quantidade,
              observacao: i.observacao,
            })),
        }));
    });

    /* As encomendas de take away entram na MESMA fila, e é isso que
       interessa: para quem está na grelha não há diferença entre fazer
       um borrego para a mesa 4 e fazer um para levar — o prato é o
       mesmo e a ordem de chegada é a mesma. A diferença está só no
       cabeçalho do cartão, e é o `tipo` que a diz.
       Sem sessão nem mesa: em vez disso vai o nome de quem vem buscar,
       que é o que o balcão grita quando estiver pronta. */
    /* Formato do `pedidos.js` do servidor, campo por campo (docs/API.md
       3.10.1): leva `cliente: { nome, telemovel }` e **não leva `mesa`
       nenhuma** — a chave nem existe, em vez de existir a `null`. A
       diferença conta: o `cozinha.js` lê `ronda.mesa?.numero`, e um
       `mesa: null` passaria pelo mesmo caminho mas um `mesa: {}` vindo
       de outro lado escreveria "Mesa —". Chave ausente é a única forma
       que não deixa dúvida. */
    Object.values(lerTakeawayDemo())
      .filter(e => ['recebido', 'confirmado', 'em_preparacao', 'pronto'].includes(e.estado))
      .forEach(e => linhas.push({
        id: e.id,
        numero: e.numero,
        estado: e.estado,
        criadoEm: e.criadoEm,
        tipo: 'take_away',
        observacao: e.observacoes,
        cliente: { nome: e.nome, telemovel: e.telefone },
        itens: e.itens.map(i => ({
          id: i.id,
          nome: i.nome,
          categoria: i.categoria,
          quantidade: i.quantidade,
          observacao: i.observacao,
        })),
      }));

    return linhas.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
  }

  /* Estado de uma RONDA (docs/API.md 3.10.2) */
  const rondaMatch = caminho.match(/^pedidos\/(\d+)\/estado$/);
  if (rondaMatch && metodo === 'PATCH') {
    const idRonda = Number(rondaMatch[1]);
    const { estado } = opcoes.body || {};
    const validos = ['recebido', 'confirmado', 'em_preparacao', 'pronto', 'entregue', 'cancelado'];
    if (!validos.includes(estado)) {
      throw erroSimulado(`Estado inválido. Use: ${validos.join(', ')}`, 400);
    }

    const sessoes = lerSessoesDemo();
    for (const s of Object.values(sessoes)) {
      const ronda = (s.rondas || []).find(r => r.id === idRonda);
      if (ronda) {
        /* O servidor recusa saltos inválidos com 409 e diz quais são os
           permitidos (B-32, 07/09). A simulação era mais permissiva do
           que o servidor: aceitava qualquer estado com nome válido, e
           por isso um caminho que rebentava a sério passava aqui sem
           ninguém dar por ele. Um simulador mais tolerante do que a
           realidade é pior do que não ter simulador — mente na direção
           que engana. Formato igual ao real, incluindo o `permitidos`. */
        const permitidos = TRANSICOES_RONDA[ronda.estado] || [];
        if (estado !== ronda.estado && !permitidos.includes(estado)) {
          const erro = erroSimulado(
            `Um pedido em "${ronda.estado}" nao pode passar a "${estado}".`, 409);
          erro.permitidos = permitidos;
          throw erro;
        }

        ronda.estado = estado;
        // Espelha nos itens, para quem lê a lista simples ver o mesmo
        s.itens.forEach(i => { if (i.pedidoId === idRonda) i.estado = estado; });
        gravarSessoesDemo(sessoes);
        return { mensagem: `Pedido ${ronda.numero} → ${estado}`, pedido: ronda };
      }
    }

    /* Não estava nas sessões: pode ser uma encomenda de take away.
       Sem isto, a cozinha via a encomenda na grelha e levava 404 ao
       tocar nela — pior do que não a mostrar, porque parecia avaria.
       As transições são as mesmas: um borrego para levar passa pelos
       mesmos estados que um borrego para a mesa 4. */
    const encomendas = lerTakeawayDemo();
    const chave = Object.keys(encomendas).find(n => encomendas[n].id === idRonda);
    if (chave) {
      const enc = encomendas[chave];
      const permitidos = TRANSICOES_RONDA[enc.estado] || [];
      if (estado !== enc.estado && !permitidos.includes(estado)) {
        const erro = erroSimulado(
          `Um pedido em "${enc.estado}" nao pode passar a "${estado}".`, 409);
        erro.permitidos = permitidos;
        throw erro;
      }
      enc.estado = estado;
      gravarTakeawayDemo(encomendas);
      return { mensagem: `Encomenda ${enc.numero} → ${estado}`, pedido: enc };
    }

    throw erroSimulado('Registo não encontrado.', 404);
  }

  /* Conta de uma sessão pelo ID (docs/API.md 4.7).
     O ecrã do balcão sabe o ID da sessão mas não o qrToken da mesa — e
     não deve saber: o token é a credencial de acesso da mesa. */
  const contaSessaoMatch = caminho.match(/^gestao\/sessoes\/(\d+)\/conta$/);
  if (contaSessaoMatch) {
    const idSessao = Number(contaSessaoMatch[1]);
    const sessoes = lerSessoesDemo();
    for (const [token, s] of Object.entries(sessoes)) {
      if (s.id !== idSessao) continue;
      const mesa = MESAS_DEMO.find(m => m.qrToken === token);
      const porCategoria = {};
      itensComEstado(s).forEach(item => {
        const cat = item.produto.categoria;
        (porCategoria[cat] ||= []).push({
          id: item.id,
          nome: item.produto.nome,
          quantidade: item.quantidade,
          precoUnit: Number(item.precoUnit),
          subtotal: Number(item.precoUnit) * item.quantidade,
          estado: item.estado,
          observacao: item.observacao,
          criadoEm: item.criadoEm,
        });
      });
      return {
        mesa: { numero: mesa?.numero },
        sessao: { id: s.id, estado: s.estado, abertaEm: s.abertaEm },
        porCategoria,
        total: totalDemo(s),
        numItens: numItensDemo(s),
      };
    }
    throw erroSimulado('Sessão não encontrada.', 404);
  }

  const fecharMatch = caminho.match(/^pedidos\/sessao\/(\d+)\/fechar$/);
  if (fecharMatch && metodo === 'POST') {
    const idSessao = Number(fecharMatch[1]);
    const sessoes = lerSessoesDemo();
    for (const s of Object.values(sessoes)) {
      if (s.id === idSessao) {
        if (estadoIgual(s.estado, 'fechada'))   throw erroSimulado('Sessão já está fechada.', 409);
        if (estadoIgual(s.estado, 'cancelada')) throw erroSimulado('Sessão foi cancelada.', 409);
        s.estado = 'fechada';
        s.fechadaEm = new Date().toISOString();
        gravarSessoesDemo(sessoes);
        return { mensagem: 'Mesa fechada com sucesso! ✅', sessao: s };
      }
    }
    throw erroSimulado('Sessão não encontrada.', 404);
  }

  throw erroSimulado(`[simulação] Endpoint ainda não implementado: ${metodo} ${endpoint}`, 501);
}
