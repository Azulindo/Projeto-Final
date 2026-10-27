/**
 * _instrumentar.js — X-27, passo 1: pôr cada suite a dizer quantas
 * verificações fez.
 * =====================================================================
 * O defeito: a F-69 registou 360 verificações, eu contei 512 com um
 * método que sei estar errado, e uma mensagem de commit chegou a dizer
 * 355. Ninguém sabe de onde veio o 360 — o número foi escrito uma vez e
 * repetido desde então. O conserto não é acertar o número: é cada
 * ficheiro passar a imprimir o SEU total numa linha de formato fixo,
 * para o valor deixar de ser uma afirmação e passar a ser uma medição.
 *
 * O que este programa faz, e só isto:
 *   1. Declara um contador `feitas` ao lado do `const falhas = []`.
 *   2. Acrescenta `feitas++;` dentro do ajudante de verificação.
 *   3. Regista um `process.on('exit')` que imprime a linha padrão.
 *
 * O passo 3 é um `exit` e não uma linha no fim do ficheiro de propósito:
 * cada suite acaba à sua maneira e quase todas chamam `process.exit()`,
 * por isso não há um "fim" fiável onde inserir. O `exit` dispara sempre.
 *
 * NÃO TOCA em ficheiros que já estejam instrumentados (é idempotente) e
 * não toca nos que não tenham a forma esperada — esses ficam na lista de
 * "não mexidos" para serem tratados à mão. Um programa que adivinha num
 * ficheiro de testes estraga a única coisa que nos avisa quando algo
 * parte.
 *
 * Correr:  node frontend/testes/_instrumentar.js
 */
const fs = require('fs');
const path = require('path');

const PASTA = __dirname;
const MARCA = '::VERIFICACOES::';

/* O bloco que se acrescenta. O `feitas` é lido no momento da saída, por
   isso apanha o total final mesmo que a suite morra a meio. */
function blocoSaida() {
  return `
/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(\`\\n${MARCA} \${require('path').basename(__filename)} \${feitas} \${Array.isArray(falhas) ? falhas.length : falhas}\`);
});
`;
}

const relatorio = { feitos: [], jaTinham: [], naoMexidos: [] };

for (const nome of fs.readdirSync(PASTA).sort()) {
  if (!nome.endsWith('.js') || nome.startsWith('_')) continue;
  const caminho = path.join(PASTA, nome);
  let s = fs.readFileSync(caminho, 'utf8');

  if (s.includes(MARCA)) { relatorio.jaTinham.push(nome); continue; }

  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  let mexeu = false;

  /* ── contador, onde ainda não existe ────────────────────────────── */
  const temFeitas = /\b(let|var)\s+feitas\s*=\s*0/.test(s);
  const temTotal = /\b(let|var)\s+total\s*=\s*0/.test(s);

  if (!temFeitas && !temTotal) {
    const decl = s.match(/^(\s*)const falhas = \[\];[ \t]*$/m);
    if (!decl) { relatorio.naoMexidos.push(`${nome} (sem 'const falhas = [];' numa linha só)`); continue; }
    s = s.replace(decl[0], `${decl[0]}${nl}${decl[1]}let feitas = 0;`);
    mexeu = true;

    /* ── incremento dentro do ajudante ────────────────────────────── */
    /* Três formas, e a primeira é a mais comum: em nove suites o
       ajudante está TODO numa linha só. A primeira versão disto exigia
       o `falhas.push` numa linha própria e deixou nove de fora. */
    const umaLinha = s.match(/^.*const check = \([^)]*\) => \{ .*falhas\.push\(n\);.*$/m);
    const proprioLinha = s.match(/^(\s*)if \(!c\) falhas\.push\(n\);[ \t]*$/m);
    const comOk = s.match(/^(\s*)if \(!ok\) falhas\.push\(/m);

    if (umaLinha) {
      s = s.replace(umaLinha[0], umaLinha[0].replace('=> { ', '=> { feitas++; '));
    } else if (proprioLinha) {
      s = s.replace(proprioLinha[0], `${proprioLinha[1]}feitas++;${nl}${proprioLinha[0]}`);
    } else if (comOk) {
      s = s.replace(comOk[0], `${comOk[1]}feitas++;${nl}${comOk[0]}`);
    } else {
      /* Nada foi escrito: o `continue` vem antes do `writeFileSync`. */
      relatorio.naoMexidos.push(`${nome} (ajudante de verificação não reconhecido — tratar à mão)`);
      continue;
    }
  }

  /* ── a linha padrão ─────────────────────────────────────────────── */
  const alvo = temTotal && !temFeitas ? s.replace(/\bfeitas\b/g, 'total') : null;
  s = s + blocoSaida().replace('${feitas}', temTotal && !temFeitas ? '${total}' : '${feitas}');
  if (temTotal && !temFeitas) {
    // nas duas suites minhas o contador chama-se `total`
    s = s.replace(`\${feitas} \${Array.isArray(falhas)`, `\${total} \${Array.isArray(falhas)`);
    s = s.replace('Array.isArray(falhas) ? falhas.length : falhas', 'falhas');
  }
  mexeu = true;

  fs.writeFileSync(caminho, s);
  relatorio.feitos.push(nome);
}

console.log('\nINSTRUMENTADOS');
relatorio.feitos.forEach(n => console.log('  + ' + n));
if (relatorio.jaTinham.length) {
  console.log('\nJA TINHAM A LINHA (nao tocados)');
  relatorio.jaTinham.forEach(n => console.log('  = ' + n));
}
if (relatorio.naoMexidos.length) {
  console.log('\nNAO MEXIDOS — tratar a mao');
  relatorio.naoMexidos.forEach(n => console.log('  ! ' + n));
}
console.log(`\n${relatorio.feitos.length} instrumentados, ${relatorio.jaTinham.length} ja tinham, ${relatorio.naoMexidos.length} por tratar\n`);
