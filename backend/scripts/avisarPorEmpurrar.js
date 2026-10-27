/**
 * ---------------------------------------------------------------------
 *  avisarPorEmpurrar.js — ha trabalho no disco que o repositorio nao tem?
 * ---------------------------------------------------------------------
 *
 *  Nao se chama a mao. O npm corre-o sozinho a seguir aos nossos
 *  comandos, pelos ganchos `post<nome>` do package.json:
 *
 *      "diagrama":     "node scripts/gerarDiagramaER.js",
 *      "postdiagrama": "node scripts/avisarPorEmpurrar.js",
 *
 *  PORQUE E QUE ISTO EXISTE
 *
 *  Tres vezes numa semana ficou trabalho escrito no disco e fora do
 *  repositorio: o X-21 (seis semanas), as linhas da B-71 e B-72, e o
 *  proprio `npm run plano-b` — a ferramenta feita para resolver "a rede
 *  de seguranca nao viaja entre maquinas" ficou, ela propria, numa
 *  maquina so.
 *
 *  O `git status` ja dizia tudo isto. O problema nunca foi a informacao
 *  — foi ninguem o escrever. **Posto no fim de uma coisa que ja
 *  corremos, aparece sem ninguem se lembrar dele.** E a mesma ideia do
 *  aviso dos dois portateis dentro do programa do plano B: daqui a tres
 *  semanas ninguem se lembra da conversa, e o programa lembra-se.
 *
 *  CALA-SE QUANDO ESTA TUDO BEM
 *
 *  Se nao ha nada por empurrar, nao imprime uma linha. Um aviso que
 *  aparece sempre deixa de ser lido ao fim de dois dias — e passava a
 *  ser ruido em cima de exatamente o problema que vem resolver.
 *
 *  E NUNCA FALHA O COMANDO QUE O CHAMOU
 *
 *  Sai sempre com 0. Isto e um lembrete, nao um guarda: um `npm run
 *  diagrama` que gerou o diagrama corretamente nao pode passar a dar
 *  erro porque ha um ficheiro por commitar.
 * ---------------------------------------------------------------------
 */

const { execSync } = require('child_process');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;

function git(comando) {
  try {
    return execSync(`git ${comando}`, {
      cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;   // sem git, ou sem ramo de origem: nao e problema nosso
  }
}

function main() {
  const porCommitar = git('status --porcelain');
  if (porCommitar === null) return;   // nao e um repositorio; cala-te

  const ficheiros = porCommitar ? porCommitar.split('\n').filter(Boolean) : [];

  /*
   *  O `@{u}` e o ramo de origem deste, seja ele qual for. Escrever
   *  "origin/main" a mao parecia mais claro e era mais fragil: num
   *  ramo que nao fosse o main, dava sempre um numero errado.
   */
  const porEmpurrarTexto = git('rev-list --count @{u}..HEAD');
  const porEmpurrar = porEmpurrarTexto === null ? 0 : Number(porEmpurrarTexto);

  if (!ficheiros.length && !porEmpurrar) return;   // tudo em dia; silencio

  console.log('');
  console.log(amarelo('  ------------------------------------------------------'));

  if (ficheiros.length) {
    const quantos = ficheiros.length;
    console.log(amarelo(`   ${quantos} ficheiro(s) alterado(s) e ainda por commitar:`));
    for (const l of ficheiros.slice(0, 8)) console.log(amarelo(`     ${l}`));
    if (quantos > 8) console.log(amarelo(`     ... e mais ${quantos - 8}`));
  }

  if (porEmpurrar) {
    console.log(amarelo(`   ${porEmpurrar} commit(s) feito(s) e ainda por empurrar.`));
  }

  console.log(amarelo(''));
  console.log(amarelo('   git add -A  &&  git commit -m "..."  &&  git push'));
  console.log(amarelo(''));
  console.log(amarelo('   O que esta so no teu disco nao existe para o outro.'));
  console.log(amarelo('  ------------------------------------------------------'));
  console.log('');
}

main();
// Sempre 0: isto lembra, nao impede.
process.exitCode = 0;
