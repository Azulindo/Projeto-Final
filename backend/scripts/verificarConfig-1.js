/**
 * =====================================================================
 *  verificarConfig.js — procura configuracao com valor por omissao
 * =====================================================================
 *
 *  Usar:   npm run config
 *  Corre tambem sozinho a seguir ao `npm run numeros`.
 *
 *  PORQUE E QUE ISTO EXISTE
 *
 *  O `ensaioCiclo.js` nunca carregava o .env e tinha
 *  `password: process.env.DB_PASSWORD || ''`. Numa maquina cujo MySQL
 *  nao tem palavra-passe aquilo funciona e ninguem da por nada; na
 *  outra da "Access denied (using password: NO)" — uma mensagem que
 *  aponta para as credenciais quando o problema e a configuracao nao
 *  ter sido carregada.
 *
 *  Corrigiu-se com uma linha. E o Guilherme apontou o que faltava:
 *  **a linha resolve aquele ficheiro, nao resolve o proximo.** O `||`
 *  volta no programa que alguem escrever para a semana.
 *
 *  Uma regra que so vive na cabeca das pessoas dura o tempo que a
 *  conversa durar. Esta esta aqui escrita e corre sozinha.
 *
 *  AS DUAS COISAS QUE PROCURA
 *
 *  1. `process.env.DB_* || alguma coisa` e `JWT_SECRET || alguma coisa`
 *
 *     Nestas, um valor por omissao nao e defensivo: e um disfarce. Se
 *     o DB_HOST nao estiver definido, o programa nao deve ligar-se a
 *     "localhost" — deve dizer que falta o DB_HOST. E um JWT_SECRET
 *     com valor por omissao e pior do que nao ter: assina sessoes com
 *     um segredo que esta escrito no codigo.
 *
 *     O PORT e as EMAIL_* NAO entram aqui de proposito: um porto por
 *     omissao e razoavel, e o email desligar-se sozinho sem chave e a
 *     decisao que faz o plano B funcionar.
 *
 *  2. Ligacoes a base construidas fora do `src/config/bd.js`
 *
 *     Foi por aqui que o ensaio escapou a tudo: fez a sua propria
 *     ligacao e com ela saltou o ambiente.js, o SSL, o fuso em UTC e o
 *     `decimalNumbers`. **Quem constroi a sua propria porta nao passa
 *     por nenhuma das fechaduras.** E a mesma razao por que o stock so
 *     se mexe pelo servicos/stock.js.
 *
 *  NAO FALHA O COMANDO QUE O CHAMOU
 *
 *  Sai com 0 mesmo quando encontra coisas. E um apontador, nao um
 *  guarda — ha casos legitimos (o proprio bd.js, o planoB.js que
 *  constroi uma ligacao de proposito para diagnosticar) e um programa
 *  que recusa a entrega por causa de um aviso acaba desligado.
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PASTAS = ['src', 'scripts'];

const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;

/*
 *  Quem pode construir a sua propria ligacao, e porque:
 *    bd.js     — e a porta; e ele que as constroi
 *    migrar.js — precisa de multipleStatements, que o pool nao tem
 *    planoB.js — diagnostica a ligacao; tem de a tentar ele proprio
 */
const PODEM_LIGAR = new Set([
  path.join('src', 'config', 'bd.js'),
  path.join('scripts', 'migrar.js'),
  path.join('scripts', 'planoB.js'),
]);

const PROIBIDO_TER_OMISSAO = /process\.env\.(DB_[A-Z_]+|JWT_SECRET)\s*\|\|/g;
const CONSTROI_LIGACAO = /mysql\.create(Connection|Pool)\s*\(/g;

function ficheiros(dir, acc = []) {
  const abs = path.join(RAIZ, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const nome of fs.readdirSync(abs)) {
    const rel = path.join(dir, nome);
    const st = fs.statSync(path.join(RAIZ, rel));
    if (st.isDirectory()) ficheiros(rel, acc);
    else if (nome.endsWith('.js')) acc.push(rel);
  }
  return acc;
}

/** Em que linha esta este indice do texto. */
const linhaDe = (txt, i) => txt.slice(0, i).split('\n').length;

/**
 * Tira os comentarios, trocando-os por espacos.
 *
 * Na primeira corrida este programa assinalou-se a si proprio: o
 * comentario la em cima **explica** o `process.env.DB_PASSWORD || ''` e
 * o apontador leu a explicacao como se fosse codigo. Um verificador que
 * acusa a propria documentacao treina quem o le a ignora-lo.
 *
 * Os comentarios viram espacos e nao desaparecem, para os numeros de
 * linha continuarem a bater certo com o ficheiro verdadeiro — um aviso
 * que aponta para a linha errada e so um bocado melhor do que nenhum.
 *
 * Limite conhecido e assumido: isto nao percebe de cadeias de texto. Um
 * "//" dentro de uma string faz o resto da linha desaparecer da busca.
 * Para o que isto procura — `process.env.` e `mysql.create` — nao e um
 * problema a serio, e a alternativa era escrever um analisador de
 * JavaScript para apontar dois padroes.
 */
function semComentarios(txt) {
  return txt
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

function main() {
  const achados = [];

  for (const rel of PASTAS.flatMap((p) => ficheiros(p))) {
    const txt = semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));

    for (const m of txt.matchAll(PROIBIDO_TER_OMISSAO)) {
      achados.push({
        rel, linha: linhaDe(txt, m.index),
        o: `${m[0].trim()} ...`,
        porque: 'configuracao com valor por omissao: esconde a falta em vez de a dizer',
      });
    }

    if (PODEM_LIGAR.has(rel)) continue;
    for (const m of txt.matchAll(CONSTROI_LIGACAO)) {
      achados.push({
        rel, linha: linhaDe(txt, m.index),
        o: m[0].trim(),
        porque: 'ligacao a base fora do config/bd.js: salta o ambiente, o SSL e o fuso',
      });
    }
  }

  console.log('');
  if (!achados.length) {
    console.log(verde('  Configuracao: nada a apontar.'));
    console.log('');
    return;
  }

  console.log(amarelo(`  Configuracao: ${achados.length} coisa(s) a olhar`));
  console.log(amarelo('  ' + '-'.repeat(58)));
  for (const a of achados) {
    console.log(`  ${a.rel}:${a.linha}`);
    console.log(`    ${a.o}`);
    console.log(amarelo(`    ${a.porque}`));
  }
  console.log(amarelo('  ' + '-'.repeat(58)));
  console.log('  Se algum destes for mesmo de proposito, acrescenta o ficheiro');
  console.log('  ao PODEM_LIGAR aqui em cima — com a razao escrita ao lado.');
  console.log('');
}

main();
// Aponta, nao impede.
process.exitCode = 0;
