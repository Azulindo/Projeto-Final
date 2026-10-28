/**
 * =====================================================================
 *  mudarPasswords.js — mudar as passwords das tres contas de gestao
 * =====================================================================
 *
 *  Usar:   npm run mudar-passwords            (a base do .env.local)
 *          npm run mudar-passwords -- --nuvem (a base do .env, o Aiven)
 *
 *  PORQUE E QUE ISTO EXISTE
 *
 *  O X-32: a password das tres contas esteve escrita em texto simples
 *  num ficheiro servido ao publico durante uma semana. Saiu de la a
 *  28/10, mas **uma password que esteve publicada esta queimada** — nao
 *  ha maneira de saber quem a leu, e quem a leu entra no dashboard como
 *  administrador. Tirar o ficheiro do ar fecha a torneira; isto esvazia
 *  o balde.
 *
 *  AS TRES REGRAS QUE ESTE PROGRAMA SEGUE
 *
 *  1. **A password nunca aparece no ecra.** Escreve-se as escuras, como
 *     no `plano-b`. Nem este programa a imprime, nem a escreve numa
 *     mensagem de erro, nem a poe no historico do terminal.
 *
 *  2. **Nao e este programa que a inventa.** Podia gerar uma ao acaso e
 *     mostra-la — e ai ficava no scroll do terminal, e dali para uma
 *     captura de ecra, e de uma captura para um chat. Quem a escolhe e
 *     quem a vai usar, e guarda-a onde guarda as outras.
 *
 *  3. **Nao toca em nenhum ficheiro que va para o Git.** Grava-a no
 *     `backend/.env.local`, que o `.gitignore` apanha. (E o Vercel, a
 *     bem da verdade, nao serve ficheiros que comecem por ponto — foi
 *     o Guilherme que o mediu a 28/10, e e a razao por que o `.env`
 *     nunca esteve em risco mesmo quando tudo o resto estava.)
 *
 *  LIGA-SE PELO `bd.js`, COMO TODA A GENTE
 *
 *  Nao constroi a sua propria ligacao. Foi por ai que o `ensaioCiclo`
 *  escapou a tudo — **quem constroi a sua propria porta nao passa por
 *  nenhuma das fechaduras**: o ambiente, o SSL do Aiven, o fuso em UTC.
 *  Um programa que escreve credenciais e o ultimo que devia entrar pela
 *  janela.
 *
 *  DIZ COM QUEM VAI FALAR, ANTES DE FALAR
 *
 *  Mudar as passwords da base de casa quando se queria mudar as do
 *  Aiven acaba com a demonstracao a dar "palavra-passe incorreta" no
 *  dia 16, e ninguem percebe porque. Por isso a primeira coisa que faz
 *  e dizer a base, e esperar por um "sim".
 * =====================================================================
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const ambiente = require('../src/config/ambiente');
const { pool } = require('../src/config/bd');
const bcrypt = require('bcryptjs');

const CONTAS = [
  'admin@vemproabate.pt',
  'cozinha@vemproabate.pt',
  'balcao@vemproabate.pt',
];

const CUSTO = 12;                 // o mesmo do seed e do gerarHash
const MINIMO = 10;                // caracteres

const RAIZ_BACKEND = path.resolve(__dirname, '..');
const CAMINHO_LOCAL = path.join(RAIZ_BACKEND, '.env.local');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;

/*
 *  UM leitor para o programa todo, e nao um por pergunta.
 *
 *  A primeira versao abria uma `readline` nova em cada pergunta, como o
 *  `planoB.js` faz — e no `planoB.js` esta certo, porque so ha uma
 *  pergunta. Aqui ha tres, e a readline **le a frente**: a primeira
 *  interface engolia o que viesse a seguir no mesmo sopro e levava-o
 *  consigo ao fechar. O programa ficava parado no "nova password:" para
 *  sempre.
 *
 *  Com uma pessoa a escrever devagar nunca se via, porque nao ha nada
 *  adiantado para engolir. Viu-se a tentar prova-lo automaticamente —
 *  **um defeito que so aparece quando se tenta verificar a coisa**, que
 *  e um bom argumento a favor de a tentar verificar.
 */
const leitor = readline.createInterface({
  input: process.stdin, output: process.stdout, terminal: true,
});

/** Pergunta e mostra o que se escreve. */
function perguntar(texto) {
  return new Promise((r) => leitor.question(texto, (v) => r(v.trim())));
}

/** Pergunta sem mostrar nada. (A ideia e a do planoB.js.) */
function perguntarEmSegredo(texto) {
  return new Promise((resolve) => {
    const saida = process.stdout;
    let calado = false;
    const escrever = saida.write.bind(saida);
    saida.write = (pedaco, ...resto) => (calado ? true : escrever(pedaco, ...resto));
    escrever(texto);
    calado = true;
    leitor.question('', (resposta) => {
      calado = false;
      saida.write = escrever;
      escrever('\n');
      resolve(resposta);
    });
  });
}

/** Fecha o leitor e a base, por qualquer caminho de saida. */
async function terminar(codigo = 0) {
  leitor.close();
  try { await pool.end(); } catch { /* ja estava fechada */ }
  process.exitCode = codigo;
}

/**
 * Poe (ou substitui) uma chave no .env.local, deixando o resto como esta.
 *
 * Reescrever o ficheiro inteiro era mais simples e apagava a password do
 * MySQL de quem ja la a tinha — um programa que resolve um problema e
 * cria outro de igual tamanho.
 */
function gravarNoEnvLocal(chave, valor) {
  const linha = `${chave}=${valor}`;
  if (!fs.existsSync(CAMINHO_LOCAL)) {
    fs.writeFileSync(CAMINHO_LOCAL,
      '# Criado pelo "npm run mudar-passwords".\n'
      + '# Este ficheiro NAO vai para o Git (.gitignore: .env.*).\n\n'
      + linha + '\n', { encoding: 'utf8', mode: 0o600 });
    return 'criado';
  }
  const antes = fs.readFileSync(CAMINHO_LOCAL, 'utf8');
  const linhas = antes.split(/\r?\n/);
  const i = linhas.findIndex((l) => l.trimStart().startsWith(`${chave}=`));
  if (i === -1) {
    const corpo = antes.endsWith('\n') ? antes : antes + '\n';
    fs.writeFileSync(CAMINHO_LOCAL,
      corpo + '\n# A password das contas de gestao, para quem escrever o teste\n'
      + '# do login a serio (C-04). Os testes de hoje correm todos em\n'
      + '# simulacao e nao precisam dela.\n' + linha + '\n', 'utf8');
    return 'acrescentado';
  }
  linhas[i] = linha;
  fs.writeFileSync(CAMINHO_LOCAL, linhas.join('\n'), 'utf8');
  return 'substituido';
}

async function main() {
  console.log('');
  console.log('  MUDAR AS PASSWORDS DAS CONTAS DE GESTAO');
  console.log('  ' + '-'.repeat(58));
  console.log(`  ficheiro lido: ${ambiente.nomeFicheiro}`);
  console.log(`  base de dados: ${verde(ambiente.NOME_AMBIENTE)}  (${process.env.DB_NAME} em ${process.env.DB_HOST})`);
  if (ambiente.avisoTrocado) console.log(amarelo(ambiente.avisoTrocado));
  console.log('');
  console.log('  Vai mudar a password destas tres contas:');
  for (const c of CONTAS) console.log(`    · ${c}`);
  console.log('');

  const sim = await perguntar('  E esta a base que queres mudar? (escreve "sim"): ');
  if (sim.toLowerCase() !== 'sim') {
    console.log('\n  Nao mudei nada.');
    console.log('  Para a outra base:  npm run mudar-passwords -- --nuvem\n');
    await terminar(0);
    return;
  }

  /* ---- A password ---------------------------------------------- */
  console.log('');
  console.log('  Escolhe a nova password. Nao aparece no ecra.');
  console.log(`  Minimo ${MINIMO} caracteres. Guarda-a onde guardas as outras —`);
  console.log('  este programa grava-a no .env.local e mais nada.');
  console.log('');

  const nova = await perguntarEmSegredo('  nova password: ');
  if (nova.length < MINIMO) {
    console.log(vermelho(`\n  Tem menos de ${MINIMO} caracteres. Nao mudei nada.\n`));
    await terminar(1);
    return;
  }
  const outraVez = await perguntarEmSegredo('  outra vez:     ');
  if (nova !== outraVez) {
    console.log(vermelho('\n  As duas nao sao iguais. Nao mudei nada.\n'));
    await terminar(1);
    return;
  }

  /* ---- O hash --------------------------------------------------- */
  console.log('');
  console.log(`  A calcular o hash (bcrypt, custo ${CUSTO} — demora um segundo)...`);
  const hash = await bcrypt.hash(nova, CUSTO);

  /* ---- A base --------------------------------------------------- */
  /*
   *  Tudo ou nada. Tres contas mudadas e uma por mudar e pior do que
   *  nenhuma: a demonstracao funciona em dois ecras e falha no
   *  terceiro, e ninguem liga uma coisa a outra.
   */
  const ligacao = await pool.getConnection();
  let mudadas = 0;
  try {
    await ligacao.beginTransaction();
    for (const email of CONTAS) {
      const [r] = await ligacao.query(
        'UPDATE utilizador SET password_hash = ? WHERE email = ?', [hash, email]);
      if (r.affectedRows !== 1) {
        throw new Error(`a conta ${email} nao existe nesta base (mexeu em ${r.affectedRows} linhas)`);
      }
      mudadas += 1;
    }
    await ligacao.commit();
  } catch (erro) {
    await ligacao.rollback();
    console.log(vermelho(`\n  Falhou: ${erro.message}`));
    console.log('  Desfiz tudo — nenhuma das tres ficou mudada.\n');
    ligacao.release();
    await terminar(1);
    return;
  }
  ligacao.release();

  /* ---- Provar que ficou ----------------------------------------- */
  /*
   *  Nao basta o UPDATE dizer que mexeu numa linha: isso prova que
   *  escreveu, nao prova que o que escreveu abre a porta. Le-se de
   *  volta e compara-se com o bcrypt, que e o que o login faz.
   */
  let provadas = 0;
  for (const email of CONTAS) {
    const [[linha]] = await pool.query(
      'SELECT password_hash FROM utilizador WHERE email = ?', [email]);
    if (linha && await bcrypt.compare(nova, linha.password_hash)) provadas += 1;
  }

  /* ---- O .env.local --------------------------------------------- */
  const oQueFez = gravarNoEnvLocal('PASSWORD_TESTE', nova);

  await terminar(provadas === CONTAS.length ? 0 : 1);

  console.log('');
  console.log(`  ${verde('ok')}  ${mudadas} contas mudadas em ${ambiente.NOME_AMBIENTE}`);
  console.log(`  ${provadas === CONTAS.length ? verde('ok') : vermelho('!!')}  ` +
    `${provadas} de ${CONTAS.length} verificadas a ler de volta e a comparar com o bcrypt`);
  console.log(`  ${verde('ok')}  PASSWORD_TESTE ${oQueFez} no backend/.env.local`);
  console.log('');
  console.log(amarelo('  FALTA FAZER, E NENHUMA DESTAS E AUTOMATICA:'));
  console.log('');
  console.log('   1. Correr isto na OUTRA base — a de casa e a da nuvem sao');
  console.log('      duas, e o plano B usa a de casa:');
  console.log(`        npm run mudar-passwords${ambiente.eLocal ? ' -- --nuvem' : ''}`);
  console.log('');
  console.log('   2. O Guilherme tem de correr no portatil dele, senao o');
  console.log('      plano B dele continua com a password velha.');
  console.log('');
  console.log('   3. Escrever a password a mao na FOLHA-EMERGENCIA impressa');
  console.log('      (seccao 7). As linhas ficam em branco no ficheiro de');
  console.log('      proposito, porque o ficheiro vai para o GitHub.');
  console.log('');
  console.log('   4. O seed.sql continua a ter os hashes velhos. Quem o');
  console.log('      correr de novo repoe a password antiga — e essa esta');
  console.log('      publicada. Trata-se disso no X-32.');
  console.log('');
}

main().catch(async (e) => {
  console.error(vermelho(`\n  Rebentou: ${e.message}\n`));
  await terminar(1);
});
