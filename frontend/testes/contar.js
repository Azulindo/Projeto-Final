/**
 * contar.js — X-27. Quantas verificações é que a suite faz, mesmo?
 * =====================================================================
 * ── O DEFEITO QUE ISTO APAGA ─────────────────────────────────────────
 * A F-69 registou **360 verificações**. Eu, ao tentar confirmar esse
 * número antes de escrever 525, contei **512** — com um método que
 * sabia estar errado. Uma mensagem de commit chegou a dizer **355**.
 * Não existe em documento nenhum como é que o 360 foi obtido.
 *
 * É o defeito desta casa aplicado a um número nosso: escrito uma vez,
 * repetido desde então, e impossível de recalcular. Se o júri perguntar
 * "quantos testes têm?", a resposta honesta até hoje era "não sabemos".
 *
 * ── O QUE MUDA ───────────────────────────────────────────────────────
 * O conserto não é acertar o número. É cada suite passar a imprimir o
 * SEU total numa linha de formato fixo, e este programa somá-las. O
 * valor deixa de ser uma afirmação e passa a ser uma medição, que
 * qualquer pessoa repete com um comando.
 *
 * ── DUAS UNIDADES, E DIZÊ-LO É METADE DO CONSERTO ────────────────────
 * Nem tudo o que estas suites fazem é uma "verificação":
 *
 *   ::VERIFICACOES::  uma afirmação pass/fail — "este alvo tem 44px",
 *                     "este texto dá 4,8:1", "o foco voltou ao cartão".
 *   ::VARRIMENTOS::   uma página medida numa largura, à procura de
 *                     vários tipos de problema ao mesmo tempo. É o que
 *                     a `varredura.js` e a `auditoria-responsiva.js`
 *                     fazem, e não se somam com as outras.
 *
 * Foi precisamente forçar um número único sobre coisas que se contam de
 * maneiras diferentes que produziu o 360. Por isso aqui são dois totais
 * e não um, e as suites que não reportam nada aparecem nomeadas em vez
 * de desaparecerem na soma.
 *
 * ── RETOMA, E NÃO É LUXO ─────────────────────────────────────────────
 * À primeira tentativa de medir isto a sério, a máquina onde corria
 * reiniciou-se a meio e levou consigo 12 minutos de trabalho: quatro
 * suites medidas, perdidas porque o total só era escrito no fim.
 *
 * Por isso cada suite é gravada no instante em que acaba, numa linha do
 * `.contagem-parcial.jsonl`, e um segundo arranque salta as que já lá
 * estão. Uma medição de meia hora que só sobrevive a meia hora seguida
 * não é uma medição que alguém repita — e uma medição que ninguém
 * repete volta a ser uma afirmação, que é exactamente o defeito que
 * este ficheiro existe para apagar.
 *
 * Correr:  node frontend/testes/contar.js
 *          node frontend/testes/contar.js --rapidas      (só as curtas)
 *          node frontend/testes/contar.js --recomecar    (ignora o parcial)
 *
 * Demora. São 27 suites, cada uma abre um Chromium, e o total anda pela
 * meia hora. É para correr antes de entregar, não a cada alteração.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PASTA = __dirname;
const LIMITE_MS = 10 * 60 * 1000;
const PARCIAL = path.join(PASTA, '.contagem-parcial.jsonl');

/* As que sabemos serem longas, para o `--rapidas` as saltar. */
const LONGAS = new Set(['cortina.js', 'varredura.js', 'auditoria-responsiva.js',
                        'sem-rede.js', 'teclado.js', 'criadores.js']);

const soRapidas = process.argv.includes('--rapidas');
const recomecar = process.argv.includes('--recomecar');

if (recomecar && fs.existsSync(PARCIAL)) fs.unlinkSync(PARCIAL);

/**
 * A medição mais recente que o código permite aproveitar.
 *
 * ── PORQUE É QUE ISTO EXISTE ──────────────────────────────────────────
 * A primeira versão da retoma criou, em meia hora, o defeito que este
 * ficheiro existe para apagar. A `auditoria-responsiva` tinha sido
 * medida com **4 falhas**; corrigi a causa (dez classes de 11px e 10px
 * na `mesa.html`), voltei a correr o contador — e ele **reimprimiu as
 * 4 falhas antigas**, da linha gravada, sem as voltar a medir e sem
 * dizer que não as mediu. Um número guardado a falar de código que já
 * não existe: é literalmente a mesma avaria do "360 verificações",
 * agora dentro da ferramenta de a curar.
 *
 * Por isso a retoma pergunta primeiro **qual é o ficheiro medido mais
 * recente**, e descarta toda a medição anterior a ele. É conservador de
 * propósito: mexer num ficheiro invalida tudo, mesmo o que não dependia
 * dele, porque saber de que ficheiros cada suite depende não é coisa que
 * este programa possa adivinhar. Não custa nada: a retoma serve para
 * uma corrida interrompida, e numa corrida interrompida ninguém editou
 * nada pelo meio.
 */
function alteradoEm() {
  const raiz = path.resolve(PASTA, '..');          // frontend/
  const ignorar = new Set(['node_modules', '_capturas', '.git']);
  let maximo = 0;
  const andar = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      /* O próprio contador fica de fora: ele soma, não é medido. Se
       * entrasse, cada vírgula mudada aqui obrigava a meia hora de
       * remedição — e uma medição que custa meia hora a cada mexida
       * deixa de ser corrida, o que a traz de volta ao ponto de
       * partida. O `_instrumentar.js` NÃO fica de fora, de propósito:
       * esse muda o que as suites contam. */
      if (e.name === 'contar.js') continue;
      if (ignorar.has(e.name) || e.name.startsWith('.contagem-parcial')) continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) andar(f);
      else maximo = Math.max(maximo, fs.statSync(f).mtimeMs);
    }
  };
  andar(raiz);
  return maximo;
}

/**
 * O que já foi medido, do ficheiro parcial.
 *
 * Uma linha estragada (a máquina foi abaixo a meio de a escrever) é
 * **ignorada** e não faz o programa parar: o que se perde é uma suite,
 * que volta a correr. Parar aqui obrigava a apagar o ficheiro à mão.
 */
function jaMedidas(limite) {
  if (!fs.existsSync(PARCIAL)) return { mapa: new Map(), velhas: 0 };
  const mapa = new Map();
  let velhas = 0;
  for (const linha of fs.readFileSync(PARCIAL, 'utf8').split('\n')) {
    if (!linha.trim()) continue;
    try {
      const r = JSON.parse(linha);
      if (!r || !r.ficheiro) continue;
      /* Sem `quando` é de uma versão anterior deste programa: não se
       * sabe de quando é, portanto não se aproveita. */
      if (!r.quando || r.quando < limite) { velhas++; continue; }
      mapa.set(r.ficheiro, r);
    } catch { /* linha truncada: a suite volta a correr */ }
  }
  return { mapa, velhas };
}

function gravar(r) {
  fs.appendFileSync(PARCIAL, JSON.stringify({ ...r, quando: Date.now() }) + '\n');
}

const ficheiros = fs.readdirSync(PASTA)
  .filter(f => f.endsWith('.js') && !f.startsWith('_') && f !== 'contar.js')
  .filter(f => !(soRapidas && LONGAS.has(f)))
  .sort();

function correr(ficheiro) {
  return new Promise(resolve => {
    const inicio = Date.now();
    const filho = spawn(process.execPath, [path.join(PASTA, ficheiro)], {
      cwd: PASTA, env: process.env,
    });
    let saida = '';
    filho.stdout.on('data', d => { saida += d; });
    filho.stderr.on('data', d => { saida += d; });

    const relogio = setTimeout(() => filho.kill('SIGKILL'), LIMITE_MS);

    filho.on('close', codigo => {
      clearTimeout(relogio);
      const seg = Math.round((Date.now() - inicio) / 1000);
      const v = saida.match(/::VERIFICACOES:: \S+ (\d+) (\d+)/);
      const s = saida.match(/::VARRIMENTOS:: \S+ (\d+) (\d+)/);
      resolve({
        ficheiro, codigo, seg,
        verificacoes: v ? Number(v[1]) : null,
        falhas: v ? Number(v[2]) : (s ? Number(s[2]) : null),
        varrimentos: s ? Number(s[1]) : null,
        semLinha: !v && !s,
      });
    });
  });
}

(async () => {
  console.log(`\nA correr ${ficheiros.length} suites${soRapidas ? ' (só as curtas)' : ''}.`);
  console.log('Cada uma abre um Chromium; isto demora.\n');

  const limite = alteradoEm();
  const { mapa: feitas, velhas } = jaMedidas(limite);
  if (velhas) {
    console.log(`(${velhas} medição(ões) guardadas são anteriores à última`);
    console.log(` alteração do frontend — ${new Date(limite).toLocaleString('pt-PT')} —`);
    console.log(' e vão ser refeitas: um total medido sobre código que já mudou');
    console.log(' é a avaria que este programa existe para apagar.)\n');
  }
  if (feitas.size) {
    console.log(`(${feitas.size} já medidas num arranque anterior; ` +
                '`--recomecar` para as refazer)\n');
  }

  const r = [];
  for (const f of ficheiros) {
    process.stdout.write(`  ${f.padEnd(26)} `);
    let x = feitas.get(f);
    const retomada = Boolean(x);
    if (!retomada) {
      x = await correr(f);
      gravar(x);
    }
    r.push(x);
    const n = x.verificacoes !== null ? `${x.verificacoes} verificações`
            : x.varrimentos !== null ? `${x.varrimentos} varrimentos`
            : 'NÃO REPORTA';
    console.log(`${String(x.seg).padStart(3)}s  ${n}` +
                (x.falhas ? `  ❌ ${x.falhas} falha(s)` : '') +
                (x.codigo !== 0 && !x.falhas ? `  (saiu com ${x.codigo})` : '') +
                (retomada ? '   (do arranque anterior)' : ''));
  }

  const comV = r.filter(x => x.verificacoes !== null);
  const comS = r.filter(x => x.varrimentos !== null);
  const sem = r.filter(x => x.semLinha);
  const totalV = comV.reduce((a, x) => a + x.verificacoes, 0);
  const totalS = comS.reduce((a, x) => a + x.varrimentos, 0);
  const totalF = r.reduce((a, x) => a + (x.falhas || 0), 0);

  console.log('\n' + '═'.repeat(66));
  console.log(`VERIFICAÇÕES   ${String(totalV).padStart(5)}   em ${comV.length} suites`);
  /* De onde vem o total, e não é enfeite.
   *
   * O `contraste.js` mede um elemento de texto de cada vez e sozinho
   * vale mais do que todas as outras juntas. O número está certo, mas
   * quem o leia sem saber isto fica com a ideia de que há centenas de
   * casos pensados um a um — e há centenas de MEDIÇÕES, feitas por um
   * varrimento, mais umas dezenas de casos escritos à mão. Dizer
   * "X verificações" sem dizer de onde vêm era repetir o 360 com um
   * número melhor apurado: um valor verdadeiro que se lê a mais do que
   * vale. Por isso o programa nomeia as três maiores e a sua parte. */
  const maiores = [...comV].sort((a, b) => b.verificacoes - a.verificacoes).slice(0, 3);
  if (totalV > 0 && maiores.length) {
    const partes = maiores.map(x =>
      `${x.ficheiro.replace(/\.js$/, '')} ${x.verificacoes} ` +
      `(${Math.round(100 * x.verificacoes / totalV)} %)`);
    console.log(`               de onde vêm: ${partes.join(', ')}`);
  }
  console.log(`VARRIMENTOS    ${String(totalS).padStart(5)}   em ${comS.length} suites (página × largura)`);
  console.log(`FALHAS         ${String(totalF).padStart(5)}`);
  if (sem.length) {
    console.log(`\nSEM LINHA DE TOTAL — ${sem.length}, e é por isso que o número`);
    console.log('não fecha. Não as some de cabeça: instrumente-as.');
    sem.forEach(x => console.log(`   ${x.ficheiro}`));
  } else {
    console.log('\nTodas as suites reportaram. O número acima é uma medição,');
    console.log('não uma afirmação: volta a correr isto e dá o mesmo.');
  }
  console.log('═'.repeat(66) + '\n');

  process.exitCode = sem.length ? 1 : 0;
})();
