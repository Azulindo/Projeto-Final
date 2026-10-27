/**
 * =====================================================================
 *  ENSAIO DO CICLO COMPLETO — C-27 (e a metade do C-14 que precisa de
 *  servidor)
 * =====================================================================
 *
 *  ── PORQUE É QUE ISTO EXISTE ────────────────────────────────────────
 *  As 25 suites do `frontend/testes/` correm contra a SIMULAÇÃO: provam
 *  o comportamento dos ecrãs. As secções 1, 4, 5 e 6 da `docs/TESTES.md`
 *  perguntam outra coisa — o que aconteceu na BASE DE DADOS. Se o stock
 *  desceu, se ficou um movimento com quem aceitou, se o total congelou.
 *  Isso não se vê sem a API e o MySQL a correr, e por isso estava tudo
 *  guardado para uma sessão à mão de três horas.
 *
 *  Isto faz a parte que é mecânica, e deixa à sessão o que precisa
 *  mesmo de mãos: o telemóvel a sério, os quatro browsers, duas pessoas
 *  ao mesmo tempo.
 *
 *  ── O QUE ESTE ENSAIO ENCONTROU À PRIMEIRA (15/10) ──────────────────
 *  Antes de chegar a correr, três coisas que nenhum teste automático
 *  podia ter apanhado, porque não são código:
 *
 *    1. A base de dados local **não existia**. O C-24 está marcado como
 *       feito, e o MySQL da máquina tinha só duas bases de outras
 *       cadeiras. Provavelmente levou com uma reinstalação (o servidor
 *       é agora o 9.7, e o esquema diz 8.0).
 *    2. O `backend/.env.local` **não existia**. O C-25 também está
 *       marcado como feito. Como está no `.gitignore`, desapareceu sem
 *       deixar rasto — e sem ele a API não arranca.
 *    3. A porta 3000 **está ocupada** por outro projeto do Guilherme (um
 *       Next.js). No dia da apresentação, com esse servidor a correr, a
 *       API não arranca e a mensagem que aparece é `EADDRINUSE`.
 *
 *  Nenhuma das três se vê a olhar para o repositório. É exactamente por
 *  isto que um ensaio existe: **o plano B não estava executável.**
 *
 *  ── COMO CORRER ─────────────────────────────────────────────────────
 *    1. Garante o MySQL a correr e a base criada:
 *         mysql -u root < database/schema.sql
 *         mysql -u root < database/seed.sql
 *    2. Arranca a API (com o .env.local no sítio):
 *         npm run dev
 *    3. Noutro terminal:
 *         node scripts/ensaioCiclo.js
 *       Se a API estiver noutra porta:
 *         node scripts/ensaioCiclo.js --porta 3100
 *
 *  ── SOBRE A PALAVRA-PASSE ───────────────────────────────────────────
 *  As palavras-passe das contas não estão em ficheiro nenhum, de
 *  propósito — só os hashes bcrypt. Para poder testar a metade da
 *  cozinha, este ensaio **gera uma palavra-passe aleatória ao arrancar**,
 *  troca o hash do administrador por ela, faz o que tem a fazer, e
 *  **repõe o hash original no fim**. A palavra-passe existe só na
 *  memória do processo e não fica escrita em lado nenhum. Se o ensaio
 *  rebentar a meio, corre outra vez: a primeira coisa que ele faz é
 *  repor o hash que encontrar guardado.
 */
'use strict';

/*
 *  Tem de vir ANTES de qualquer leitura de process.env: e ele que
 *  decide qual o .env que manda (.env.local na maquina, .env com
 *  --nuvem) e que o carrega.
 *
 *  Sem esta linha, este programa lia o ambiente do sistema — que nao
 *  tem nada disto — e caia nos valores por omissao mais abaixo,
 *  incluindo `password: ''`. Num MySQL sem palavra-passe isso funciona
 *  e ninguem da por nada; num MySQL com palavra-passe da
 *  "Access denied ... (using password: NO)", que parece um problema de
 *  credenciais e e um problema de configuracao nao carregada.
 *
 *  Acrescentado a 27/10, quando o ensaio rebentou na maquina do Joao
 *  depois de ter corrido na do Guilherme. E a mesma forma de sempre:
 *  funcionava por um acidente local da maquina de quem o escreveu.
 */
require('../src/config/ambiente');

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const argPorta = process.argv.indexOf('--porta');
const PORTA = argPorta > -1 ? Number(process.argv[argPorta + 1]) : (process.env.PORT || 3000);
const BASE = `http://127.0.0.1:${PORTA}/api`;

const BD = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vem_pro_abate',
};

const passos = [];
let falhas = 0;

function ok(nome, condicao, detalhe) {
  passos.push({ nome, ok: !!condicao, detalhe: detalhe || '' });
  if (!condicao) falhas++;
  const marca = condicao ? '  ok  ' : '  !!  ';
  console.log(marca + nome + (detalhe ? `   (${detalhe})` : ''));
}

async function chamar(caminho, opcoes = {}) {
  const r = await fetch(BASE + caminho, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
  });
  let corpo = null;
  try { corpo = await r.json(); } catch (e) { corpo = null; }
  return { estado: r.status, corpo };
}

(async () => {
  const con = await mysql.createConnection(BD);
  let hashOriginal = null;
  let emailAdmin = null;

  try {
    // ══ 1 · A API está de pé e ligada à base LOCAL ══════════════════
    const saude = await chamar('/saude');
    ok('a API responde', saude.estado === 200, `HTTP ${saude.estado}`);
    if (saude.estado !== 200) {
      throw new Error(`A API não respondeu em ${BASE}. Arranca-a primeiro (npm run dev).`);
    }
    ok('a base é a LOCAL e não a nuvem',
      saude.corpo?.baseDados?.origem === 'LOCAL', saude.corpo?.baseDados?.origem);
    ok('18 tabelas e 1 vista',
      saude.corpo?.baseDados?.tabelas === 18 && saude.corpo?.baseDados?.vistas === 1,
      `${saude.corpo?.baseDados?.tabelas} tabelas, ${saude.corpo?.baseDados?.vistas} vista(s)`);

    // ══ 2 · Credencial de ensaio, temporária ════════════════════════
    const [[admin]] = await con.query(
      `SELECT u.id_utilizador, u.email, u.password_hash
         FROM utilizador u JOIN funcionario f ON f.id_utilizador = u.id_utilizador
        WHERE f.cargo = 'administrador' AND u.ativo = 1 LIMIT 1`);
    if (!admin) throw new Error('Não há administrador activo na base.');
    hashOriginal = admin.password_hash;
    emailAdmin = admin.email;

    const senha = crypto.randomBytes(24).toString('base64url');
    await con.query('UPDATE utilizador SET password_hash = ? WHERE id_utilizador = ?',
      [await bcrypt.hash(senha, 12), admin.id_utilizador]);

    const entrada = await chamar('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailAdmin, password: senha }),
    });
    ok('o login devolve um token', entrada.estado === 200 && !!entrada.corpo?.token,
      `HTTP ${entrada.estado}`);
    const comToken = { Authorization: `Bearer ${entrada.corpo?.token}` };

    // ══ 3 · O cliente lê o QR de uma mesa ═══════════════════════════
    const [[mesa]] = await con.query(
      `SELECT id_mesa, numero_mesa, qr_code FROM mesa
        WHERE id_mesa NOT IN (SELECT id_mesa FROM sessao_mesa WHERE estado = 'aberta')
        ORDER BY numero_mesa LIMIT 1`);
    if (!mesa) throw new Error('Não há nenhuma mesa sem sessão aberta.');

    const abertura = await chamar(`/mesas/${mesa.qr_code}/sessao`);
    ok('ler o QR abre uma sessão', abertura.estado === 200, `HTTP ${abertura.estado}`);
    const [[sessaoBD]] = await con.query(
      `SELECT id_sessao, estado FROM sessao_mesa
        WHERE id_mesa = ? ORDER BY id_sessao DESC LIMIT 1`, [mesa.id_mesa]);
    ok('e a sessão ficou mesmo gravada, aberta',
      sessaoBD && sessaoBD.estado === 'aberta', `sessão ${sessaoBD?.id_sessao}`);

    // Um QR inventado não revela nada (secção 1 da TESTES.md)
    const inventado = await chamar(`/mesas/${mesa.qr_code.slice(0, -1)}X/sessao`);
    ok('um QR inventado é recusado', inventado.estado === 404 || inventado.estado === 400,
      `HTTP ${inventado.estado}`);
    const textoErro = JSON.stringify(inventado.corpo || {}).toLowerCase();
    ok('e a recusa não revela mesas nem tokens',
      !textoErro.includes('token_qr') && !textoErro.includes(String(mesa.numero_mesa)),
      textoErro.slice(0, 70));

    // ══ 4 · Uma ronda, com um produto que controla stock ════════════
    const [[prod]] = await con.query(
      `SELECT p.id_produto, p.nome, p.preco, s.quantidade_atual
         FROM produto p JOIN stock s ON s.id_produto = p.id_produto
        WHERE p.ativo = 1 AND p.controla_stock = 1 AND s.quantidade_atual >= 5
        ORDER BY s.quantidade_atual DESC LIMIT 1`);
    if (!prod) throw new Error('Não há produto com stock suficiente para o ensaio.');
    const stockAntes = Number(prod.quantidade_atual);

    const ronda = await chamar(`/mesas/${mesa.qr_code}/pedir`, {
      method: 'POST',
      body: JSON.stringify({ itens: [{ produtoId: prod.id_produto, quantidade: 2,
        observacao: 'ensaio automático — C-27' }] }),
    });
    ok('a ronda é aceite', ronda.estado === 200 || ronda.estado === 201,
      `HTTP ${ronda.estado} ${JSON.stringify(ronda.corpo || {}).slice(0, 80)}`);

    const [[pedidoBD]] = await con.query(
      `SELECT id_pedido, estado, valor_total FROM pedido
        WHERE id_sessao = ? ORDER BY id_pedido DESC LIMIT 1`, [sessaoBD.id_sessao]);
    ok('o pedido ficou gravado', !!pedidoBD, `pedido ${pedidoBD?.id_pedido}`);
    const [[itens]] = await con.query(
      `SELECT COUNT(*) AS n, SUM(quantidade) AS q, SUM(subtotal) AS soma
         FROM item_pedido WHERE id_pedido = ?`, [pedidoBD.id_pedido]);
    ok('com os itens certos', Number(itens.q) === 2, `quantidade ${itens.q}`);
    ok('e o total do pedido bate com a soma dos itens',
      Math.abs(Number(pedidoBD.valor_total) - Number(itens.soma)) < 0.005,
      `${pedidoBD.valor_total} contra ${itens.soma}`);

    // A observação do cliente chegou inteira (F-21)
    const [[obs]] = await con.query(
      `SELECT observacoes FROM item_pedido WHERE id_pedido = ? LIMIT 1`, [pedidoBD.id_pedido]);
    ok('a observação do cliente chegou à cozinha',
      (obs?.observacoes || '').includes('ensaio automático'), obs?.observacoes);

    // Pedir sem nada no carrinho é recusado
    const vazia = await chamar(`/mesas/${mesa.qr_code}/pedir`,
      { method: 'POST', body: JSON.stringify({ itens: [] }) });
    ok('uma ronda vazia é recusada', vazia.estado === 400, `HTTP ${vazia.estado}`);

    // ══ 5 · A cozinha vê a ronda e aceita-a ═════════════════════════
    const fila = await chamar('/pedidos/cozinha', { headers: comToken });
    ok('a ronda aparece na fila da cozinha',
      fila.estado === 200 && JSON.stringify(fila.corpo).includes(String(pedidoBD.id_pedido)),
      `HTTP ${fila.estado}`);

    const aceitar = await chamar(`/pedidos/${pedidoBD.id_pedido}/estado`, {
      method: 'PATCH', headers: comToken,
      body: JSON.stringify({ estado: 'confirmado' }),
    });
    ok('a cozinha confirma a ronda', aceitar.estado === 200,
      `HTTP ${aceitar.estado} ${JSON.stringify(aceitar.corpo || {}).slice(0, 70)}`);

    // ══ 6 · O stock desceu, E ficou um movimento com quem aceitou ═══
    const [[stockDepois]] = await con.query(
      'SELECT quantidade_atual FROM stock WHERE id_produto = ?', [prod.id_produto]);
    ok('o stock desceu exactamente a quantidade pedida',
      Number(stockDepois.quantidade_atual) === stockAntes - 2,
      `${stockAntes} → ${stockDepois.quantidade_atual}`);

    const [[mov]] = await con.query(
      `SELECT quantidade, quantidade_antes, quantidade_depois, id_utilizador, tipo, id_pedido
         FROM movimento_stock WHERE id_produto = ?
        ORDER BY id_movimento DESC LIMIT 1`, [prod.id_produto]);
    ok('ficou um movimento de stock', !!mov, JSON.stringify(mov || {}).slice(0, 90));
    ok('e o movimento diz QUEM o fez',
      mov && Number(mov.id_utilizador) === Number(admin.id_utilizador),
      `id_utilizador ${mov?.id_utilizador}`);
    ok('a conta do movimento fecha',
      mov && Number(mov.quantidade_antes) - Number(mov.quantidade_depois) === 2,
      `${mov?.quantidade_antes} → ${mov?.quantidade_depois}`);
    ok('e o movimento aponta para o pedido que o causou',
      mov && Number(mov.id_pedido) === Number(pedidoBD.id_pedido),
      `id_pedido ${mov?.id_pedido} contra ${pedidoBD.id_pedido}`);
    ok('classificado como consumo', mov && mov.tipo === 'consumo', mov?.tipo);

    // ══ 7 · Recuar um estado é recusado, e diz quais são válidos ════
    for (const e of ['em_preparacao', 'pronto', 'entregue']) {
      const r = await chamar(`/pedidos/${pedidoBD.id_pedido}/estado`, {
        method: 'PATCH', headers: comToken, body: JSON.stringify({ estado: e }) });
      ok(`avança para ${e}`, r.estado === 200, `HTTP ${r.estado}`);
    }
    const recuar = await chamar(`/pedidos/${pedidoBD.id_pedido}/estado`, {
      method: 'PATCH', headers: comToken, body: JSON.stringify({ estado: 'pronto' }) });
    ok('recuar de entregue para pronto é recusado', recuar.estado === 409 || recuar.estado === 400,
      `HTTP ${recuar.estado}`);
    ok('e a recusa diz quais os estados válidos',
      /v[aá]lido|permitid|seguinte/i.test(JSON.stringify(recuar.corpo || {})),
      JSON.stringify(recuar.corpo || {}).slice(0, 90));

    // ══ 8 · A conta, e o total que congela ══════════════════════════
    const conta = await chamar(`/mesas/${mesa.qr_code}/conta`);
    ok('a conta da mesa abre', conta.estado === 200, `HTTP ${conta.estado}`);

    const pedirConta = await chamar(`/mesas/${mesa.qr_code}/pedir-conta`, { method: 'POST' });
    ok('pedir a conta é aceite', pedirConta.estado === 200, `HTTP ${pedirConta.estado}`);

    const fechar = await chamar(`/pedidos/sessao/${sessaoBD.id_sessao}/fechar`,
      { method: 'POST', headers: comToken });
    ok('a sessão fecha', fechar.estado === 200, `HTTP ${fechar.estado}`);

    const [[sessaoFechada]] = await con.query(
      'SELECT estado, valor_total FROM sessao_mesa WHERE id_sessao = ?', [sessaoBD.id_sessao]);
    ok('e fica fechada na base', sessaoFechada?.estado === 'fechada', sessaoFechada?.estado);
    const totalCongelado = Number(sessaoFechada?.valor_total);
    ok('com um total gravado', totalCongelado > 0, String(totalCongelado));

    /* O teste do congelamento: muda-se o PREÇO do produto e volta-se a
       ler a sessão. Se o total fosse calculado à chegada em vez de
       gravado, mudava com o preço — e a conta de ontem passava a dizer
       outra coisa. */
    const precoOriginal = prod.preco;
    await con.query('UPDATE produto SET preco = preco + 5 WHERE id_produto = ?', [prod.id_produto]);
    const [[sessaoDepois]] = await con.query(
      'SELECT valor_total FROM sessao_mesa WHERE id_sessao = ?', [sessaoBD.id_sessao]);
    await con.query('UPDATE produto SET preco = ? WHERE id_produto = ?',
      [precoOriginal, prod.id_produto]);
    ok('o total congelou — mudar o preço não o mexe',
      Math.abs(Number(sessaoDepois.valor_total) - totalCongelado) < 0.005,
      `${totalCongelado} → ${sessaoDepois.valor_total}`);

    // ══ 9 · As portas fechadas (secção 5 da TESTES.md) ══════════════
    const semSessao = await chamar('/pedidos/ativos');
    ok('sem sessão, a fila de trabalho dá 401', semSessao.estado === 401,
      `HTTP ${semSessao.estado}`);
    const maQuantidade = await chamar(`/gestao/produtos/${prod.id_produto}`, {
      method: 'PATCH', headers: comToken,
      body: JSON.stringify({ quantidade_atual: 999, preco: 1.11 }) });
    ok('mandar quantidade_atual no PATCH do produto dá 400', maQuantidade.estado === 400,
      `HTTP ${maQuantidade.estado}`);
    const [[precoAgora]] = await con.query(
      'SELECT preco FROM produto WHERE id_produto = ?', [prod.id_produto]);
    ok('e o preço que vinha no mesmo pedido também não passou',
      Math.abs(Number(precoAgora.preco) - Number(precoOriginal)) < 0.005,
      `${precoOriginal} → ${precoAgora.preco}`);

  } catch (e) {
    console.log('\n  !!  ' + e.message);
    falhas++;
  } finally {
    if (hashOriginal) {
      await con.query('UPDATE utilizador SET password_hash = ? WHERE email = ?',
        [hashOriginal, emailAdmin]);
      console.log('\n  (hash do administrador reposto)');
    }
    await con.end();
  }

  console.log('\n' + '─'.repeat(62));
  console.log(falhas
    ? `  ${falhas} de ${passos.length} verificações falharam.`
    : `  CICLO COMPLETO VERIFICADO — ${passos.length} verificações, contra a base a sério.`);
  console.log('─'.repeat(62));
  console.log('  O que isto NÃO cobre e fica para a sessão à mão: telemóvel real,');
  console.log('  os quatro browsers, e duas pessoas a mexer ao mesmo tempo.');
  process.exit(falhas ? 1 : 0);
})();
