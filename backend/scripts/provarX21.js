/**
 * =====================================================================
 *  provarX21.js — o balcao le o stock e nao lhe mexe
 * =====================================================================
 *
 *  Usar, com a API a correr:   npm run provar-x21
 *
 *  O QUE PROVA
 *
 *    GET  /api/gestao/stock              com sessao de balcao  ->  200
 *    POST /api/gestao/stock/:id/movimento com sessao de balcao ->  403
 *
 *  As duas sao precisas. A primeira sozinha so diz que a porta abriu; a
 *  segunda e que diz que nao abriu DEMAIS. Se o POST desse 200, o X-21
 *  tinha dado ao balcao mais do que lhe competia — ler as existencias e
 *  uma coisa, mexer-lhes e outra, e quem conta o que ha em armazem e
 *  quem esta no armazem.
 *
 *  PORQUE E QUE NAO PEDE A PALAVRA-PASSE
 *
 *  Porque nao precisa dela, e porque mexer nas contas de demonstracao a
 *  dois dias da entrega e trocar uma prova por um risco.
 *
 *  O que este programa faz e ASSINAR um token com a mesma chave e a
 *  mesma forma que o /api/auth/login assina — `{ id, nivel }` — para o
 *  utilizador de balcao que ja existe na base. Nao cria contas, nao
 *  troca hashes, nao escreve nada.
 *
 *  E e um token legitimo, nao um atalho: o `exigirNivel` NAO confia no
 *  `nivel` que vem dentro do token. A cada pedido vai a base confirmar
 *  que a conta esta ativa e recalcula o nivel a partir do cargo (foi o
 *  X-11). Ou seja, o que esta a ser testado e exatamente o caminho real
 *  — a unica coisa que este programa salta e a verificacao da
 *  palavra-passe, que nao e o que esta em causa.
 *
 *  **Isto prova a AUTORIZACAO, nao a autenticacao.** Quem entra e quem
 *  sabe a palavra-passe; isso e o B-23 e ja estava provado.
 * =====================================================================
 */

const path = require('path');

// Primeiro: decide qual o .env e carrega-o (JWT_SECRET vem de la).
require('../src/config/ambiente');
const jwt = require('jsonwebtoken');
const { pool } = require('../src/config/bd');

const EMAIL_BALCAO = 'balcao@vemproabate.pt';
const BASE = `http://localhost:${process.env.PORT || 3000}`;

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;

async function main() {
  if (!process.env.JWT_SECRET) {
    console.error('Falta o JWT_SECRET no .env. Sem ele nao se assina nada.');
    process.exit(1);
  }

  /* ---- A API esta de pe? ---------------------------------------- */
  try {
    const saude = await fetch(`${BASE}/api/saude`);
    if (!saude.ok) throw new Error(`respondeu ${saude.status}`);
  } catch (e) {
    console.error('');
    console.error(`A API nao responde em ${BASE}.`);
    console.error('Arranca-a noutra janela com:  npm run dev');
    console.error('');
    process.exit(1);
  }

  /* ---- Quem e o balcao, segundo a base --------------------------- */
  const [[conta]] = await pool.query(
    `SELECT u.id_utilizador, u.nome, u.ativo, f.cargo
       FROM utilizador u
       JOIN funcionario f ON f.id_utilizador = u.id_utilizador
      WHERE u.email = ?`,
    [EMAIL_BALCAO]
  );

  if (!conta) {
    console.error(`Nao ha nenhuma conta com o email ${EMAIL_BALCAO}.`);
    console.error('Corre o seed outra vez, ou confirma o email na base.');
    process.exit(1);
  }
  if (!conta.ativo) {
    console.error(`A conta ${EMAIL_BALCAO} esta desativada. Com ela desativada`);
    console.error('o teste daria 401 e nao provava nada sobre niveis.');
    process.exit(1);
  }

  // A mesma forma do auth.js. O `nivel` aqui dentro e so para o token
  // ficar igual ao verdadeiro — quem manda e o cargo, lido da base.
  const token = jwt.sign(
    { id: conta.id_utilizador, nivel: 'balcao' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }   // cinco minutos: isto e um teste, nao uma sessao
  );

  const comToken = { Authorization: `Bearer ${token}` };

  console.log('');
  console.log(`  conta:  ${conta.nome}  (cargo na base: ${conta.cargo})`);
  console.log(`  API:    ${BASE}`);
  console.log('');

  /* ---- 1. Ler: tem de passar ------------------------------------- */
  const ler = await fetch(`${BASE}/api/gestao/stock`, { headers: comToken });
  const lerOk = ler.status === 200;
  let quantos = '';
  if (lerOk) {
    const linhas = await ler.json();
    quantos = `  (${linhas.length} produtos)`;
  }
  console.log(`  GET  /api/gestao/stock                 ${ler.status}` +
    `   ${lerOk ? verde('PASSA — o balcao le') : vermelho('FALHA — devia ser 200')}${quantos}`);

  /* ---- 2. Escrever: tem de ser recusado -------------------------- */
  /*
   *  O id 23 e a Baba do Pastor, que o seed deixa de proposito abaixo
   *  do minimo. Qualquer produto servia: o pedido tem de ser recusado
   *  ANTES de chegar a tocar em stock nenhum.
   */
  const escrever = await fetch(`${BASE}/api/gestao/stock/23/movimento`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...comToken },
    body: JSON.stringify({ tipo: 'entrada', quantidade: 1 }),
  });
  const escreverOk = escrever.status === 403;
  console.log(`  POST /api/gestao/stock/23/movimento    ${escrever.status}` +
    `   ${escreverOk ? verde('PASSA — e nao lhe mexe') : vermelho('FALHA — devia ser 403')}`);

  /* ---- 3. E o stock ficou intacto? ------------------------------- */
  /*
   *  Nao basta o 403. Um 403 devolvido DEPOIS de a escrita acontecer
   *  era um 403 a mentir — e seria o genero de coisa que passa num
   *  teste de codigos de estado e estraga o armazem.
   */
  const [[antes]] = await pool.query(
    'SELECT quantidade_atual FROM stock WHERE id_produto = 23'
  );
  const [[movimentos]] = await pool.query(
    "SELECT COUNT(*) AS n FROM movimento_stock WHERE id_produto = 23 AND tipo = 'entrada' AND data_movimento > NOW() - INTERVAL 1 MINUTE"
  );
  const intacto = movimentos.n === 0;
  console.log(`  stock do produto 23                    ${antes.quantidade_atual}` +
    `   ${intacto ? verde('PASSA — nenhum movimento entrou') : vermelho('FALHA — entrou um movimento!')}`);

  const todas = lerOk && escreverOk && intacto;
  console.log('');
  console.log(todas
    ? verde('  X-21 provado: o balcao le o stock e nao lhe mexe.')
    : vermelho('  X-21 NAO provado. Ver acima qual das tres falhou.'));
  console.log('');

  process.exitCode = todas ? 0 : 1;
}

main()
  .catch((e) => { console.error('Rebentou:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
