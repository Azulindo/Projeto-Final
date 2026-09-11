/**
 * =====================================================================
 *  migrar.js — correr um ficheiro .sql contra a base que o .env aponta
 * =====================================================================
 *
 *  Porque isto existe:
 *
 *  O schema.sql corre UMA VEZ, quando se cria a base. Tudo o que se lhe
 *  acrescenta depois entra na base local de quem o escreveu e nao entra
 *  em mais lado nenhum. Foi assim que a movimento_stock ficou a existir
 *  no esquema e a faltar na Aiven, com o servicos/stock.js a escrever
 *  numa tabela que, em producao, nao existia.
 *
 *  Nao havia forma de aplicar uma alteracao a base publicada sem abrir
 *  um cliente de base de dados a mao, configurar a ligacao, encontrar o
 *  certificado e escrever a palavra-passe outra vez. Cada um desses
 *  passos e uma oportunidade de nao fazer nada.
 *
 *  Isto reaproveita a ligacao que a API ja usa. A palavra-passe nao se
 *  escreve nem se ve: esta no .env, que e onde ja estava.
 *
 *      npm run migrar -- database/migracao-2026-09-11-movimento-stock.sql --nuvem
 *      npm run migrar -- database/migracao-2026-09-11-movimento-stock.sql
 *
 *  Sem --nuvem vai a base local; com --nuvem vai a Aiven. Quem decide e
 *  o config/ambiente.js, o mesmo que a API usa, para nao haver duas
 *  maneiras diferentes de escolher a mesma coisa.
 *
 *  DIZ SEMPRE A QUE BASE SE VAI LIGAR ANTES DE CORRER SEJA O QUE FOR,
 *  e o nome sai do DB_HOST e nao do nome do ficheiro — um indicador que
 *  mente e pior do que nao haver indicador nenhum.
 * =====================================================================
 */

const path = require('path');
const fs = require('fs');

// Tem de vir primeiro: e ele que decide qual o .env que manda.
const { NOME_AMBIENTE, nomeFicheiro } = require('../src/config/ambiente');
const mysql = require('mysql2/promise');

const RAIZ = path.resolve(__dirname, '..', '..');

async function main() {
  const alvo = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!alvo) {
    console.error('Falta dizer que ficheiro correr. Por exemplo:');
    console.error('  npm run migrar -- database/migracao-2026-09-11-movimento-stock.sql --nuvem');
    process.exit(1);
  }

  /*
   *  O caminho e procurado em dois sitios: primeiro a partir de onde se
   *  esta, depois a partir da raiz do projeto.
   *
   *  So estava a procurar a partir da raiz, e a primeira pessoa a usar
   *  isto escreveu "../database/..." estando dentro do backend — que e
   *  a coisa natural a fazer — e foi parar a um nivel acima do projeto.
   *  Um programa que so aceita a forma em que o autor pensou faz
   *  parecer que o ficheiro nao existe quando o que nao existe e a
   *  suposicao dele.
   */
  const tentativas = [
    path.resolve(process.cwd(), alvo),
    path.resolve(RAIZ, alvo),
  ];
  const caminho = tentativas.find((c) => fs.existsSync(c));
  if (!caminho) {
    console.error('Nao encontrei o ficheiro. Procurei em:');
    for (const t of tentativas) console.error(`  ${t}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(caminho, 'utf8');

  console.log('');
  console.log('  ------------------------------------------------------');
  console.log(`   BASE DE DADOS: ${NOME_AMBIENTE}`);
  console.log(`   servidor:      ${process.env.DB_HOST}`);
  console.log(`   base:          ${process.env.DB_NAME}`);
  console.log(`   ficheiro .env: ${nomeFicheiro}`);
  console.log(`   a correr:      ${path.relative(RAIZ, caminho)}`);
  console.log('  ------------------------------------------------------');
  console.log('');

  /*
   *  multipleStatements: true — normalmente isto NAO se liga.
   *
   *  Com ele ligado, uma consulta que junte texto vindo de fora deixa
   *  de poder executar so uma instrucao: quem conseguir meter um ";" no
   *  meio passa a executar o que quiser. E por isso que a API nunca o
   *  usa, e que todas as consultas dela vao com "?".
   *
   *  Aqui liga-se porque o que se executa e um ficheiro do repositorio,
   *  escrito por nos e lido do disco — nao ha texto de utilizador
   *  nenhum nesta ligacao. E e ligado nesta ligacao so, que morre no
   *  fim, e nao no pool que serve os pedidos.
   */
  const ligacao = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ssl: process.env.DB_SSL_CA
      ? { ca: fs.readFileSync(path.resolve(process.env.DB_SSL_CA)) }
      : undefined,
  });

  try {
    await ligacao.query("SET time_zone = '+00:00'");
    const resultados = await ligacao.query(sql);

    /*
     *  Um ficheiro com varias instrucoes devolve um vetor de
     *  resultados. So interessam os que trazem linhas — os SELECT de
     *  verificacao. Os CREATE e os INSERT nao devolvem nada de ler.
     */
    const blocos = Array.isArray(resultados[0]) ? resultados[0] : [resultados[0]];
    let mostrados = 0;
    for (const bloco of blocos) {
      if (!Array.isArray(bloco) || !bloco.length) continue;
      mostrados++;
      console.table(bloco);
    }
    if (!mostrados) console.log('  (o ficheiro correu e nao devolveu nada para mostrar)');

    console.log('');
    console.log(`  Feito, contra ${NOME_AMBIENTE}.`);
    console.log('');
  } catch (erro) {
    console.error('');
    console.error('  A MIGRACAO PAROU.');
    console.error(`  ${erro.code || erro.name}: ${erro.sqlMessage || erro.message}`);
    console.error('');
    console.error('  Nada do que vem depois da instrucao que falhou foi aplicado.');
    console.error('  Le a mensagem, corrige o ficheiro e corre outra vez — as');
    console.error('  migracoes deste projeto sao escritas para poderem repetir-se.');
    console.error('');
    process.exitCode = 1;
  } finally {
    await ligacao.end();
  }
}

main();
