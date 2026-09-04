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
 * =====================================================================
 */

const API_BASE = 'http://localhost:3000/api'; // porta 3000 = PORT por omissão em backend/src/app.js

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

/* Endpoints já disponíveis no back-end real (docs/API.md 4.2) */
const ENDPOINTS_REAIS = [
  /^categorias$/,             // GET /api/categorias
  /^produtos$/,               // GET /api/produtos
  /^produtos\?/,              // GET /api/produtos?categoria=Bebidas
  /^produtos\/\d+$/,          // GET /api/produtos/:id
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
function simulacaoForcada() {
  try {
    return new URLSearchParams(window.location.search).has('simular');
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

function guardarSessao({ token, nome, nivel }) {
  const sessao = { token, nome, nivel, expiraEm: Date.now() + DURACAO_SESSAO_MS };
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
 */
const PAGINA_INICIAL_POR_NIVEL = {
  cozinha:       'cozinha.html',
  balcao:        'dashboard.html',
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
    const lista = PRODUTOS_DEMO.filter(p => p.ativo && (!categoria || p.categoria === categoria));
    return lista.map(p => ({ ...p }));
  }

  /* ── stock (docs/CONTEXTO.md §6.3, regra 21 — F-62, 04/09) ───────
     Endpoint ainda por construir no servidor (B-63); enquanto isso não
     acontece, simula-se aqui com o MESMO formato já combinado com o
     João em `docs/CONTEXTO.md §8.2` (`/api/gestao/stock`), para não
     ser preciso mexer em mais nada quando a API real existir.
     Só os produtos que controlam stock — os outros nunca acabam. O
     campo `baixo` já vem calculado: nem a cozinha nem o gerente têm de
     saber a regra (quantidade_atual <= quantidade_minima), só olhar. */
  if (caminho === 'gestao/stock') {
    return PRODUTOS_DEMO
      .filter(p => p.controla_stock)
      .map(p => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria,
        quantidade_atual: p.quantidade_atual,
        quantidade_minima: p.quantidade_minima,
        baixo: p.quantidade_atual <= p.quantidade_minima,
      }));
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
        const produto = PRODUTOS_DEMO.find(p => p.id === Number(produtoId));
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
