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
 *     GET   gestao/stock                    ← F-62 (04/09); B-63 no João
 *     POST  gestao/stock/:id/movimento      ← F-52 (08/09); B-63 no João
 *     PATCH gestao/stock/:id/minimo         ←  "     "        "     "
 *           (formato proposto em docs/API.md 4.8 — a discutir com ele)
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
const API_BASE = 'https://vem-pro-abate-api.onrender.com/api';

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

  /* Fila de trabalho — com login. */
  /^pedidos\/ativos$/,             // GET   /api/pedidos/ativos
  /^pedidos\/cozinha$/,            // GET   /api/pedidos/cozinha
  /^pedidos\/\d+\/estado$/,        // PATCH /api/pedidos/:id/estado
  /^pedidos\/sessao\/\d+\/fechar$/,// POST  /api/pedidos/sessao/:id/fechar
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

function guardarSessao({ token, nome, nivel }) {
  const expiraEm = validadeDoToken(token) || (Date.now() + DURACAO_SESSAO_MS);
  const sessao = { token, nome, nivel, expiraEm };
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

  /* ── health ────────────────────────────────────────────────────── */
  if (caminho === 'health') return { ok: true, ts: new Date().toISOString() };

  /* ── auth (docs/API.md 4.1 / 4.3) ──────────────────────────────── */
  if (caminho === 'auth/login' && metodo === 'POST') {
    const { email, password } = opcoes.body || {};
    const conta = CONTAS_DEMO.find(c => c.email.toLowerCase() === String(email).toLowerCase());
    if (!conta || conta.password !== password) {
      throw erroSimulado('Email ou palavra-passe incorretos.', 401);
    }
    return {
      token: `demo.${btoa(conta.email)}.${Date.now()}`,
      utilizador: { nome: conta.nome, email: conta.email, nivel: conta.nivel },
    };
  }

  if (caminho === 'auth/eu') {
    const sessao = obterSessao();
    if (!sessao) throw erroSimulado('Sessão inválida ou expirada.', 401);
    return { nome: sessao.nome, nivel: sessao.nivel };
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
    const ordem = ['Entradas', 'Pratos Principais', 'Bebidas', 'Sobremesas'];
    return ordem
      .filter(nome => catalogoDemo().some(p => p.ativo && p.categoria === nome))
      .map((nome, i) => ({ id: i + 1, nome, descricao: '', ordem: i + 1 }));
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
          tipo: 'mesa',   // 'take_away' quando existir (docs/API.md 3.10.1)
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
        const PERMITIDOS = {
          recebido:      ['confirmado', 'cancelado'],
          confirmado:    ['em_preparacao', 'cancelado'],
          em_preparacao: ['pronto', 'cancelado'],
          pronto:        ['entregue'],
          entregue:      [],
          cancelado:     [],
        };
        const permitidos = PERMITIDOS[ronda.estado] || [];
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
