/**
 * =====================================================================
 *  planoB.js — por o plano B de pe nesta maquina
 * =====================================================================
 *
 *  Usar:   npm run plano-b
 *
 *  PORQUE E QUE ISTO EXISTE
 *
 *  O plano B — tudo a correr no portatil, sem internet — dependia de um
 *  ficheiro que nao viaja. O `backend/.env.local` esta no `.gitignore`,
 *  e bem, porque la dentro ha palavras-passe. Mas isso quer dizer que a
 *  rede de seguranca do dia 16 so existia numa das duas maquinas, e
 *  ninguem tinha reparado porque a pergunta "existe?" so foi feita de
 *  um lado de cada vez (C-25, X-25).
 *
 *  A escolha era entre decidir qual o portatil que vai para a sala — e
 *  ficar refem dessa decisao — ou fazer com que qualquer portatil
 *  consiga por o plano B de pe com um comando. E isto.
 *
 *  O QUE FAZ, E O QUE NAO FAZ
 *
 *  Cria o `.env.local` se nao existir, perguntando SO o que nao
 *  consegue adivinhar: a palavra-passe do MySQL desta maquina. Tudo o
 *  resto e local e sabido, e o JWT_SECRET e gerado aqui.
 *
 *  **Nunca escreve por cima de um `.env.local` que ja exista.** Se ja
 *  la estiver, limita-se a verifica-lo. Num ficheiro com credenciais,
 *  a diferenca entre criar e substituir e a diferenca entre ajudar e
 *  estragar a tarde a alguem.
 *
 *  No fim diz, uma linha por cada, o que esta de pe e o que falta —
 *  com o comando para resolver cada coisa que falte.
 *
 *  TEM DE SER CORRIDO POR UMA PESSOA, E NOS DOIS PORTATEIS.
 *
 *  Por uma pessoa porque escreve um ficheiro com uma palavra-passe
 *  dentro, e as ferramentas por onde trabalhamos recusam-se a tocar em
 *  ficheiros `.env` — por desenho, e ainda bem. Nos dois portateis
 *  porque um comando que resolve o problema e so correu numa maquina e
 *  exatamente a situacao em que ja estavamos, com mais passos.
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const readline = require('readline');

const RAIZ_BACKEND = path.resolve(__dirname, '..');
const CAMINHO = path.join(RAIZ_BACKEND, '.env.local');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;

const resultados = [];
const ok = (t, extra = '') => resultados.push({ bom: true, t, extra });
const mau = (t, comoResolver) => resultados.push({ bom: false, t, comoResolver });


/** Pergunta sem mostrar o que se escreve. */
function perguntarEmSegredo(pergunta) {
  return new Promise((resolve) => {
    const saida = process.stdout;
    const leitor = readline.createInterface({
      input: process.stdin,
      output: saida,
      terminal: true,
    });
    // Enquanto `calado` estiver ligado, nada do que se escreve aparece.
    let calado = false;
    const escreverOriginal = saida.write.bind(saida);
    saida.write = (pedaco, ...resto) => (calado ? true : escreverOriginal(pedaco, ...resto));

    escreverOriginal(pergunta);
    calado = true;
    leitor.question('', (resposta) => {
      calado = false;
      saida.write = escreverOriginal;
      escreverOriginal('\n');
      leitor.close();
      resolve(resposta);
    });
  });
}

/** O porto esta livre? */
function portoLivre(porto) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(porto, '0.0.0.0');
  });
}


async function main() {
  console.log('');
  console.log('  PLANO B — por isto de pe nesta maquina');
  console.log('  ' + '-'.repeat(58));
  console.log(`  maquina: ${require('os').hostname()}`);
  console.log('');

  /* ---- 1. O ficheiro ------------------------------------------- */
  let criado = false;
  if (fs.existsSync(CAMINHO)) {
    ok('.env.local ja existia', '(nao lhe toquei)');
  } else {
    console.log('  Nao ha .env.local nesta maquina. Vou criar um.');
    console.log('  Preciso da palavra-passe do MySQL local (o utilizador root).');
    console.log('  Nao aparece no ecra e nao vai para o Git.');
    console.log('');
    const senha = await perguntarEmSegredo('  palavra-passe do MySQL: ');

    const conteudo = [
      '# Plano B — tudo local, sem internet.',
      `# Criado pelo "npm run plano-b" em ${new Date().toISOString().slice(0, 16).replace('T', ' ')}.`,
      '#',
      '# Este ficheiro NAO vai para o Git (.gitignore: .env.*) e e por isso',
      '# que tem de ser criado em cada maquina. Nao o copies por email nem',
      '# por chat: corre o comando outra vez, que demora menos.',
      '',
      'DB_HOST=localhost',
      'DB_PORT=3306',
      'DB_USER=root',
      `DB_PASSWORD=${senha}`,
      'DB_NAME=vem_pro_abate',
      '',
      '# Gerado aqui, ao acaso. Nao precisa de ser igual ao da outra',
      '# maquina: so serve para assinar as sessoes desta.',
      `JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`,
      'JWT_EXPIRA=8h',
      '',
      'PORT=3000',
      '',
      '# Sem email no plano B, e de proposito: nao ha internet para o',
      '# enviar. Os avisos continuam a ser gravados na tabela notificacao.',
      '',
    ].join('\n');

    fs.writeFileSync(CAMINHO, conteudo, { encoding: 'utf8', mode: 0o600 });
    criado = true;
    ok('.env.local criado');
  }

  /* ---- 2. A base responde? ------------------------------------- */
  // So agora, para o ficheiro acabado de criar ser o que manda.
  require('../src/config/ambiente');
  let pool;
  let baseDePe = false;
  try {
    const mysql = require('mysql2/promise');
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 1,
    });
    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
      [process.env.DB_NAME]
    );
    baseDePe = true;

    if (n === 0) {
      mau(`a base ${process.env.DB_NAME} existe mas esta vazia`,
        'mysql -u root -p --default-character-set=utf8mb4 -e "source database/schema.sql"');
    } else {
      ok(`base de dados com ${n} tabelas`);
      const [[{ p }]] = await pool.query('SELECT COUNT(*) AS p FROM produto WHERE ativo = 1');
      if (p > 0) ok(`${p} produtos na ementa`);
      else mau('a ementa esta vazia',
        'mysql -u root -p --default-character-set=utf8mb4 -e "source database/seed.sql"');
    }
  } catch (erro) {
    if (erro.code === 'ER_ACCESS_DENIED_ERROR') {
      mau('o MySQL recusou a palavra-passe',
        criado ? 'apaga o backend/.env.local e corre isto outra vez'
               : 'confirma a DB_PASSWORD no backend/.env.local');
    } else if (erro.code === 'ER_BAD_DB_ERROR') {
      mau(`nao existe nenhuma base chamada ${process.env.DB_NAME}`,
        'mysql -u root -p --default-character-set=utf8mb4 -e "source database/schema.sql"');
    } else if (erro.code === 'ECONNREFUSED') {
      mau('o MySQL nao esta a responder nesta maquina',
        'arranca o servico MySQL (services.msc) e corre isto outra vez');
    } else {
      mau(`nao consegui falar com a base (${erro.code || erro.message})`, '');
    }
  }

  /* ---- 3. O porto 3000 ----------------------------------------- */
  /*
   *  Isto ja nos mordeu duas vezes. No dia 16, com outra coisa
   *  sentada no porto 3000, o que aparece e um EADDRINUSE e o plano B
   *  nao arranca — e nessa altura ninguem se lembra do comando.
   */
  const porto = Number(process.env.PORT) || 3000;
  if (await portoLivre(porto)) {
    ok(`porto ${porto} livre`);
  } else {
    mau(`o porto ${porto} esta ocupado`,
      `Stop-Process -Id (Get-NetTCPConnection -LocalPort ${porto} -State Listen).OwningProcess -Force`);
  }

  /* ---- 4. O site existe? --------------------------------------- */
  const paginaMesa = path.join(RAIZ_BACKEND, '..', 'frontend', 'cliente', 'mesa.html');
  if (fs.existsSync(paginaMesa)) ok('as paginas do cliente estao no sitio');
  else mau('nao encontrei a frontend/cliente/mesa.html', 'git pull');

  if (pool) await pool.end();

  /* ---- O resultado --------------------------------------------- */
  console.log('');
  for (const r of resultados) {
    console.log(`  ${r.bom ? verde('ok') : vermelho('!!')}  ${r.t}${r.extra ? '  ' + r.extra : ''}`);
    if (!r.bom && r.comoResolver) console.log(`      ${amarelo('->')} ${r.comoResolver}`);
  }

  const faltas = resultados.filter((r) => !r.bom).length;
  console.log('');
  if (faltas === 0) {
    console.log(verde('  O plano B esta de pe nesta maquina.'));
    console.log('');
    console.log('  Para o usar:   npm run dev     (nesta pasta)');
    console.log('  E confirmar:   http://localhost:3000/api/saude  -> tem de dizer LOCAL');
  } else {
    console.log(vermelho(faltas === 1
      ? '  Falta uma coisa. Resolve-a e corre outra vez.'
      : `  Faltam ${faltas} coisas. Resolve-as e corre outra vez.`));
  }
  console.log('');
  console.log(amarelo('  Lembra-te: isto tem de correr NOS DOIS PORTATEIS.'));
  console.log(amarelo('  Um plano B que so existe numa maquina nao e um plano B.'));
  console.log('');

  process.exitCode = faltas ? 1 : 0;
}

main().catch((e) => { console.error('Rebentou:', e.message); process.exitCode = 1; });
