/**
 * =====================================================================
 * api.js — Ponto único de chamada à API · "Vem Pro Abate"
 * =====================================================================
 * F-09: função única de chamada à API, com o token anexado
 * automaticamente. Usada pela app de gestão (frontend/funcionarios/) e
 * pelo ecrã de mesa do cliente (frontend/cliente/mesa.html).
 *
 * ── PARA LIGAR AO BACKEND REAL ──────────────────────────────────────
 * Só há dois valores a mexer, aqui em baixo:
 *     API_BASE       → o URL do servidor
 *     MODO_SIMULACAO → false
 * Mais nada precisa de ser alterado em nenhum outro ficheiro: todas as
 * respostas simuladas têm EXATAMENTE o mesmo formato que as reais,
 * documentado em docs/API.md.
 *
 * ── ESTADO ATUAL ────────────────────────────────────────────────────
 * Já existem no backend (backend/src/routes/):
 *     GET   mesas/:token/sessao
 *     POST  mesas/:token/pedir
 *     GET   mesas/:token/conta
 *     POST  mesas/:token/pedir-conta
 *     GET   pedidos/ativos · pedidos/cozinha
 *     PATCH pedidos/item/:id/estado
 *     POST  pedidos/sessao/:id/fechar
 * Ainda NÃO existem (simulados aqui, ver docs/API.md secção 4):
 *     GET   produtos                        ← bloqueia o menu do mesa.html
 *     POST  auth/login · GET auth/eu        ← bloqueia a app de gestão
 *     POST  mesas/:token/chamar-empregado
 * =====================================================================
 */

const API_BASE = 'http://localhost:3001/api'; // porta 3001 = PORT por omissão em backend/src/server.js
const MODO_SIMULACAO = true;

const CHAVE_SESSAO = 'vpa_sessao_funcionario';
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000; // 8h — validade sugerida do JWT (ver docs/API.md 4.1)

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
  if (MODO_SIMULACAO) return simularEndpoint(endpoint, opcoes);

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
 * resposta (ver docs/API.md 4.2). `preco` é string de propósito — é
 * assim que o Prisma serializa Decimal.
 */
const PRODUTOS_DEMO = [
  { id: 1,  nome: 'Abatata Frita',            descricao: 'Batatas rústicas com tempero da casa e maionese de alho', preco: '3.90',  categoria: 'Entradas',          ativo: true },
  { id: 2,  nome: 'Vem Pro Abacate',          descricao: 'Entrada com abacate, guacamole ou tosta',                 preco: '5.80',  categoria: 'Entradas',          ativo: true },
  { id: 3,  nome: "Vem p'ro Alho",            descricao: 'Pão de alho no forno',                                    preco: '3.20',  categoria: 'Entradas',          ativo: true },
  { id: 4,  nome: 'Abate-Boca',               descricao: 'Mini croquetes de novilho',                               preco: '4.50',  categoria: 'Entradas',          ativo: true },
  { id: 5,  nome: 'Borrego Abatido',          descricao: 'Borrego assado com batata, alecrim, alho e vinho branco', preco: '15.50', categoria: 'Pratos Principais', ativo: true },
  { id: 6,  nome: 'Francesinha em K.O.',      descricao: 'Bife, enchidos, queijo e molho da casa com batata e ovo', preco: '12.20', categoria: 'Pratos Principais', ativo: true },
  { id: 7,  nome: 'Abate Misto',              descricao: 'Picanha, chouriço e frango na brasa com arroz e batata',  preco: '16.20', categoria: 'Pratos Principais', ativo: true },
  { id: 8,  nome: 'Prega-me Isto',            descricao: 'Bife dos Açores com batata frita',                        preco: '16.90', categoria: 'Pratos Principais', ativo: true },
  { id: 9,  nome: 'Picanha na Brasa Negra',   descricao: 'Picanha grelhada com arroz e batata frita',               preco: '16.00', categoria: 'Pratos Principais', ativo: true },
  { id: 10, nome: 'Tábua Rústica do Abate',   descricao: 'Carnes mistas com migas e batata a murro',                preco: '17.80', categoria: 'Pratos Principais', ativo: true },
  { id: 11, nome: 'Cerveja (Fino/Pressão)',   descricao: 'Fino ou pressão',                                         preco: '1.70',  categoria: 'Bebidas',           ativo: true },
  { id: 12, nome: 'Cerveja (Caneca)',         descricao: 'Caneca de cerveja',                                       preco: '2.80',  categoria: 'Bebidas',           ativo: true },
  { id: 13, nome: 'Panaché',                  descricao: 'Cerveja com gasosa',                                      preco: '2.20',  categoria: 'Bebidas',           ativo: true },
  { id: 14, nome: 'Sangria (Copo)',           descricao: 'Branca, tinta ou espumante — copo',                       preco: '3.20',  categoria: 'Bebidas',           ativo: true },
  { id: 15, nome: 'Sangria (Jarro)',          descricao: 'Branca, tinta ou espumante — jarro',                      preco: '12.00', categoria: 'Bebidas',           ativo: true },
  { id: 16, nome: 'Coca-Cola',                descricao: 'Normal ou zero',                                          preco: '1.90',  categoria: 'Bebidas',           ativo: true },
  { id: 17, nome: 'Ice Tea',                  descricao: 'Pêssego, limão ou manga',                                 preco: '1.90',  categoria: 'Bebidas',           ativo: true },
  { id: 18, nome: 'Sumos Naturais',           descricao: 'Laranja ou mistura de frutos',                            preco: '3.00',  categoria: 'Bebidas',           ativo: true },
  { id: 19, nome: 'Água (Mineral)',           descricao: 'Água mineral sem gás',                                    preco: '1.30',  categoria: 'Bebidas',           ativo: true },
  { id: 20, nome: 'Água (Com Gás)',           descricao: 'Água com gás',                                            preco: '1.60',  categoria: 'Bebidas',           ativo: true },
  { id: 21, nome: 'Abate Pingado',            descricao: 'Café ou descafeinado',                                    preco: '1.00',  categoria: 'Bebidas',           ativo: true },
  { id: 22, nome: 'Abategatoue',              descricao: 'Petit gâteau com gelado e chocolate',                     preco: '5.20',  categoria: 'Sobremesas',        ativo: true },
  { id: 23, nome: 'Baba do Pastor',           descricao: 'Baba de camelo com bolacha',                              preco: '3.90',  categoria: 'Sobremesas',        ativo: true },
  { id: 24, nome: 'Cheesecake da Casa',       descricao: 'Cheesecake com frutos vermelhos',                         preco: '4.60',  categoria: 'Sobremesas',        ativo: true },
  { id: 25, nome: 'Taça Gelada da Casa',      descricao: 'Gelados, chantilly e chocolate',                          preco: '4.20',  categoria: 'Sobremesas',        ativo: true },
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

function totalDemo(itens) {
  return itens.reduce((acc, i) => acc + Number(i.precoUnit) * i.quantidade, 0).toFixed(2);
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
      if (!sessoes[token] || sessoes[token].estado === 'FECHADA') {
        sessoes[token] = {
          id: Math.floor(Date.now() / 1000) % 100000,
          estado: 'ABERTA',
          abertaEm: new Date().toISOString(),
          itens: [],
        };
        gravarSessoesDemo(sessoes);
      }
      const s = sessoes[token];
      return {
        mesa: { id: mesa.id, numero: mesa.numero, lugares: mesa.lugares },
        sessao: { id: s.id, estado: s.estado, abertaEm: s.abertaEm, itens: s.itens, total: totalDemo(s.itens) },
      };
    }

    const sessao = sessoes[token];
    if (!sessao || sessao.estado === 'FECHADA') {
      throw erroSimulado(accao === 'pedir' ? 'Sem sessão ativa. Refresca a página.' : 'Sem sessão ativa.', accao === 'pedir' ? 409 : 404);
    }

    if (accao === 'pedir' && metodo === 'POST') {
      const itens = (opcoes.body || {}).itens;
      if (!Array.isArray(itens) || itens.length === 0) {
        throw erroSimulado('Envia pelo menos um item.', 400);
      }

      const criados = itens.map(({ produtoId, quantidade = 1, observacao }) => {
        const produto = PRODUTOS_DEMO.find(p => p.id === Number(produtoId));
        if (!produto || !produto.ativo) throw erroSimulado(`Produto #${produtoId} não disponível.`, 400);
        return {
          id: Math.floor(Math.random() * 1e6),
          sessaoId: sessao.id,
          produtoId: produto.id,
          quantidade: Number(quantidade),
          precoUnit: produto.preco,
          observacao: observacao || null,
          estado: 'PENDENTE',
          criadoEm: new Date().toISOString(),
          produto: { ...produto },
        };
      });

      sessao.itens.push(...criados);
      gravarSessoesDemo(sessoes);
      return { mensagem: `${criados.length} item(ns) adicionado(s)!`, itens: criados };
    }

    if (accao === 'conta') {
      const porCategoria = {};
      sessao.itens.forEach(item => {
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
        total: totalDemo(sessao.itens),
        numItens: sessao.itens.reduce((a, i) => a + i.quantidade, 0),
      };
    }

    if (accao === 'pedir-conta' && metodo === 'POST') {
      if (sessao.estado !== 'ABERTA') throw erroSimulado('Sessão não está aberta.', 409);
      sessao.estado = 'AGUARDA_PAGAMENTO';
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
      .filter(([, s]) => s.estado === 'ABERTA' || s.estado === 'AGUARDA_PAGAMENTO')
      .map(([token, s]) => {
        const mesa = MESAS_DEMO.find(m => m.qrToken === token);
        return {
          sessaoId: s.id,
          estado: s.estado,
          abertaEm: s.abertaEm,
          mesa: { id: mesa?.id, numero: mesa?.numero, lugares: mesa?.lugares },
          numItens: s.itens.reduce((a, i) => a + i.quantidade, 0),
          total: totalDemo(s.itens),
          temPendentes: s.itens.some(i => i.estado === 'PENDENTE'),
        };
      })
      .sort((a, b) => new Date(a.abertaEm) - new Date(b.abertaEm));
  }

  if (caminho === 'pedidos/cozinha') {
    const sessoes = lerSessoesDemo();
    const linhas = [];
    Object.entries(sessoes).forEach(([token, s]) => {
      const mesa = MESAS_DEMO.find(m => m.qrToken === token);
      s.itens
        .filter(i => i.estado === 'PENDENTE' || i.estado === 'EM_PREPARACAO')
        .forEach(i => linhas.push({
          id: i.id,
          estado: i.estado,
          quantidade: i.quantidade,
          observacao: i.observacao,
          criadoEm: i.criadoEm,
          produto: { nome: i.produto.nome, categoria: i.produto.categoria },
          mesa: { numero: mesa?.numero, sessaoId: s.id },
        }));
    });
    return linhas.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
  }

  const itemMatch = caminho.match(/^pedidos\/item\/(\d+)\/estado$/);
  if (itemMatch && metodo === 'PATCH') {
    const idItem = Number(itemMatch[1]);
    const { estado } = opcoes.body || {};
    const validos = ['PENDENTE', 'EM_PREPARACAO', 'PRONTO', 'SERVIDO'];
    if (!validos.includes(estado)) {
      throw erroSimulado(`Estado inválido. Use: ${validos.join(', ')}`, 400);
    }

    const sessoes = lerSessoesDemo();
    for (const s of Object.values(sessoes)) {
      const item = s.itens.find(i => i.id === idItem);
      if (item) {
        item.estado = estado;
        gravarSessoesDemo(sessoes);
        return { mensagem: `Item #${idItem} → ${estado}`, item };
      }
    }
    throw erroSimulado('Registo não encontrado.', 404);
  }

  const fecharMatch = caminho.match(/^pedidos\/sessao\/(\d+)\/fechar$/);
  if (fecharMatch && metodo === 'POST') {
    const idSessao = Number(fecharMatch[1]);
    const sessoes = lerSessoesDemo();
    for (const s of Object.values(sessoes)) {
      if (s.id === idSessao) {
        if (s.estado === 'FECHADA') throw erroSimulado('Sessão já está fechada.', 409);
        s.estado = 'FECHADA';
        s.fechadaEm = new Date().toISOString();
        gravarSessoesDemo(sessoes);
        return { mensagem: 'Mesa fechada com sucesso! ✅', sessao: s };
      }
    }
    throw erroSimulado('Sessão não encontrada.', 404);
  }

  throw erroSimulado(`[simulação] Endpoint ainda não implementado: ${metodo} ${endpoint}`, 501);
}
