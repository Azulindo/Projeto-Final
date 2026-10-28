/**
 * =====================================================================
 *  verificarPublicado.js — perguntar ao SITE o que ele serve
 * =====================================================================
 *
 *  Usar:   npm run publicado
 *          npm run publicado -- https://outro-endereco.vercel.app
 *
 *  PORQUE E QUE ISTO EXISTE
 *
 *  A 28/10 o Joao encontrou a password da aplicacao de gestao em texto
 *  simples no site publicado, e com ela o `docs/`, o `database/` e o
 *  `backend/` inteiros. Corrigiu e empurrou em minutos (X-32).
 *
 *  E a password continuou no ar.
 *
 *  Nao por discordancia nenhuma: **o commit estava no GitHub e o site
 *  servia outro.** Medido -- o `docs/TAREFAS.md` servido tinha
 *  exactamente 227 137 bytes, que e o tamanho do blob no `5639db7`, o
 *  penultimo push; os dois commits seguintes, o da correccao incluido,
 *  nao tinham sido construidos. Empurrar e publicar sao duas coisas, e
 *  a unica forma de saber qual das duas aconteceu e perguntar ao site.
 *
 *  E a familia de sempre deste projeto, agora com um servidor pelo
 *  meio: duas fontes que podem discordar em silencio, e a que conta e
 *  a que ninguem estava a olhar. O X-20 foi o esquema contra a base
 *  publicada; o X-22 foi o esquema contra o desenho; este e o
 *  repositorio contra o site.
 *
 *  Pior: nenhum dos dois conseguia ver o que o site servia, porque
 *  quem tinha a conta do Vercel nao era quem estava a olhar.
 *
 *  O QUE MEDE
 *
 *  1. Os caminhos que **nao podem** ser servidos: os testes, o
 *     `backend/`, o `database/`, o `docs/`. Qualquer 200 aqui e falha.
 *  2. Os caminhos que **tem** de ser servidos: as paginas e os assets.
 *     Um 404 aqui quer dizer que o `.vercelignore` cortou demais, que
 *     e o erro simetrico e tao mau como o outro.
 *  3. Se alguma resposta traz a password escrita dentro.
 *  4. Que commit e que esta publicado, comparando o tamanho de um
 *     ficheiro servido com o do blob no Git. Nao e perfeito -- dois
 *     commits podem ter o mesmo tamanho -- mas responde a pergunta que
 *     interessa: *o que esta no ar e o ultimo?*
 *
 *  NAO IMPRIME A PASSWORD. Diz que a encontrou e em que caminho. Um
 *  verificador que escreve o segredo no ecra para provar que ele esta
 *  exposto acrescenta uma copia ao problema -- e os registos das nossas
 *  conversas e das consolas ficam gravados em sitios que nao
 *  controlamos.
 *
 *  SAI COM 1 SE ENCONTRAR ALGO. Ao contrario do `verificarConfig`, que
 *  aponta e nao impede: ali o pior caso e um aviso ignorado, aqui o
 *  pior caso e uma password no ar. As duas escolhas estao certas para o
 *  que cada uma mede.
 * =====================================================================
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

const PADRAO = 'https://vemproabate.vercel.app';
const URL_BASE = (process.argv[2] || PADRAO).replace(/\/+$/, '');
const REPO = path.resolve(__dirname, '..', '..');

/* A agulha fica partida em dois para ESTE ficheiro nao a conter
 * inteira: ele proprio esta no repositorio. */
const AGULHA = 'abate' + '2026';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;
const cinza = (s) => `\x1b[90m${s}\x1b[0m`;

/* Nao pode ser servido. Um por pasta que o `.vercelignore` exclui:
 * chega um ficheiro de cada para saber se a regra pegou. */
const PROIBIDOS = [
  '/frontend/testes/api-base.js',
  '/frontend/testes/contar.js',
  '/backend/src/app.js',
  '/backend/package.json',
  '/database/seed.sql',
  '/database/schema.sql',
  '/docs/TAREFAS.md',
  '/docs/RELATORIO.docx',
  '/frontend/servir.js',
];

/* Tem de ser servido. Se o `.vercelignore` cortar aqui, o site quebra. */
const OBRIGATORIOS = [
  '/frontend/cliente/index.html',
  '/frontend/cliente/mesa.html',
  '/frontend/cliente/reservas.html',
  '/frontend/cliente/takeaway.html',
  '/frontend/funcionarios/login.html',
  '/frontend/js/api.js',
  '/assets/logos/logotipo.jpg',
];

const problemas = [];

async function pedir(caminho) {
  const r = await fetch(URL_BASE + caminho, { redirect: 'manual' });
  const corpo = r.status === 200 ? Buffer.from(await r.arrayBuffer()) : null;
  return {
    estado: r.status,
    bytes: corpo ? corpo.length : 0,
    /* latin1 para nao estragar bytes de ficheiros binarios ao procurar
     * texto; a agulha e toda ASCII, portanto aparece igual. */
    temAgulha: corpo ? corpo.toString('latin1').includes(AGULHA) : false,
  };
}

/** Que commit e que esta no ar, pelo tamanho de um ficheiro servido. */
function commitPublicado(caminho, bytes) {
  let linhas;
  try {
    linhas = execSync('git log --format=%h -40', { cwd: REPO, encoding: 'utf8' })
      .trim().split('\n');
  } catch {
    return null;              // sem Git aqui: nao se adivinha
  }
  const dentro = caminho.replace(/^\//, '');
  const iguais = [];
  for (const h of linhas) {
    let t;
    try {
      t = Number(execSync(`git cat-file -s ${h}:${dentro}`,
        { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    } catch { continue; }
    if (t === bytes) iguais.push(h);
  }
  return { iguais, topo: linhas[0] };
}

(async () => {
  console.log(`\n  ${URL_BASE}`);
  console.log(cinza(`  ${new Date().toLocaleString('pt-PT')}\n`));

  console.log('  NAO PODE SER SERVIDO');
  for (const c of PROIBIDOS) {
    let r;
    try { r = await pedir(c); } catch (e) {
      console.log(`    ${cinza('??')}  ${c}   ${e.message}`);
      continue;
    }
    const mal = r.estado === 200;
    console.log(`    ${mal ? vermelho('SERVIDO') : verde('   ' + r.estado)}  ${c}` +
                (r.temAgulha ? vermelho('   <-- COM A PASSWORD DENTRO') : ''));
    if (mal) problemas.push(`${c} e servido (HTTP 200)`);
    if (r.temAgulha) problemas.push(`${c} traz a password no corpo`);
  }

  console.log('\n  TEM DE SER SERVIDO');
  for (const c of OBRIGATORIOS) {
    let r;
    try { r = await pedir(c); } catch (e) {
      console.log(`    ${cinza('??')}  ${c}   ${e.message}`);
      continue;
    }
    const mal = r.estado !== 200;
    console.log(`    ${mal ? vermelho('  ' + r.estado) : verde('   200')}  ${c}` +
                (r.temAgulha ? vermelho('   <-- COM A PASSWORD DENTRO') : ''));
    if (mal) problemas.push(`${c} devolve ${r.estado} e a pagina precisa dele`);
    if (r.temAgulha) problemas.push(`${c} traz a password no corpo`);
  }

  /* Que versao e que esta no ar. */
  const REFERENCIA = '/frontend/js/api.js';
  try {
    const r = await pedir(REFERENCIA);
    if (r.estado === 200) {
      const q = commitPublicado(REFERENCIA, r.bytes);
      console.log('\n  QUE VERSAO ESTA NO AR');
      if (!q) {
        console.log(cinza('    sem Git aqui: nao da para comparar'));
      } else if (q.iguais.length === 0) {
        console.log(`    ${vermelho('nenhum')} dos ultimos 40 commits tem o ${REFERENCIA}` +
                    ` com ${r.bytes} bytes`);
        console.log(cinza('    (o site serve algo que nao esta no historico local — faz git fetch)'));
        problemas.push('o ficheiro servido nao corresponde a nenhum commit conhecido');
      } else if (q.iguais.includes(q.topo)) {
        console.log(`    ${verde('em dia')} — bate com o ${q.topo}, que e o ultimo commit local`);
      } else {
        /* Só o mais recente dos que batem interessa: o `api.js` pode ter
         * o mesmo tamanho em dezenas de commits seguidos, e listá-los
         * todos dava uma parede de hashes onde o facto que conta é um
         * só — o mais novo que pode estar no ar NÃO é o último. */
        console.log(`    ${vermelho('ATRASADO')} — o que esta no ar e, no melhor dos casos,` +
                    ` o ${q.iguais[0]}` +
                    (q.iguais.length > 1 ? cinza(`  (ou anterior: o tamanho repete-se em ${q.iguais.length} commits)`) : ''));
        console.log(`    o ultimo commit local e o ${q.topo}` +
                    `, e esse ${vermelho('nao esta publicado')}.`);
        console.log(cinza('    Empurrar nao e publicar. Vai ao Vercel -> Deployments e ve'));
        console.log(cinza('    o estado do ultimo; se nao existir, carrega em Redeploy.'));
        problemas.push(`o site serve ${q.iguais[0]} e o ultimo commit e ${q.topo}`);
      }
    }
  } catch { /* ja foi reportado acima */ }

  console.log('\n  ' + '-'.repeat(58));
  if (problemas.length === 0) {
    console.log(verde('   O site serve as paginas e mais nada, e esta na ultima versao.'));
  } else {
    console.log(vermelho(`   ${problemas.length} problema(s):`));
    problemas.forEach((p) => console.log(`     · ${p}`));
  }
  console.log('  ' + '-'.repeat(58) + '\n');

  process.exitCode = problemas.length ? 1 : 0;
})();
