/**
 * C-27 / F-68 — As 18 páginas sem rede nenhuma.
 *
 * ── PORQUE É QUE ISTO EXISTE ────────────────────────────────────────
 * Porque o plano B da apresentação é servir o site **do portátil, sem
 * internet**, e ninguém tinha medido o que isso faz. A `TESTES.md`
 * pede três coisas na secção 8 e todas eram para fazer à mão no dia:
 *
 *   · que as páginas **não caem** sem as fontes do Google;
 *   · que **nenhum ecrã tenta a nuvem e fica à espera**;
 *   · quanto tempo até cada página estar utilizável.
 *
 * O contentor onde isto corre **não tem acesso à internet** — nem ao
 * `fonts.googleapis.com`, nem ao `onrender.com`, nem à API do GitHub.
 * Isso fez dele, por acidente, o banco de ensaio exacto para esta
 * pergunta: aqui o "sem rede" não é simulado, é o estado normal.
 *
 * O que isto NÃO substitui: o ensaio do C-27 com o Wi-Fi desligado a
 * sério, com a base de dados local e a API local a correr. Aqui não há
 * servidor nenhum — as páginas abrem por `file://` e caem no modo de
 * simulação. O que isto prova é a metade que não depende de servidor:
 * **que nenhuma delas fica pendurada à espera de uma resposta que não
 * vem, e o que se perde quando as fontes não chegam.**
 *
 * ── O QUE ISTO MEDE MESMO NOS ECRÃS DE GESTÃO ───────────────────────
 * **Os dez ecrãs de gestão redirecionam para o `login.html`** quando não
 * há sessão, que é o que a F-14 construiu e o que se quer. Sem servidor
 * não há como fazer login, portanto o que este teste mede nesses dez é
 * **a redirecção**, não o ecrã por trás dela — as dez linhas da tabela
 * mostram o mesmo texto de 244 caracteres porque são, todas, a página
 * de login.
 *
 * Está escrito aqui e é impresso no resumo de propósito. A primeira
 * versão dizia "18 páginas sem rede, tudo verde" e isso teria sido uma
 * frase verdadeira a dar uma ideia falsa — os ecrãs de gestão sem rede
 * **e com a API local a correr** (que é o plano B a sério) continuam
 * por medir, e só o ensaio do C-27 os mede.
 *
 * ── OS FICHEIROS LOCAIS QUE FALHAM AQUI E NÃO NA MÁQUINA DELE ───────
 * As 13 fotografias dos pratos não existem neste contentor e existem na
 * máquina do Guilherme (52 a 155 KB cada, confirmado a 28/09). É o
 * X-26: o espelho é uma cópia anterior. Contam-se e mostram-se, mas não
 * são falha — senão este teste dava vermelho por uma razão que não tem
 * nada que ver com o que ele pergunta.
 *
 * ── O QUE CONTA COMO "FICAR À ESPERA" ───────────────────────────────
 * Não é o pedido falhar — sem rede todos falham, e falhar depressa é o
 * comportamento certo. É a página **ficar num estado de espera que não
 * acaba**: um "a carregar…" que nunca sai, um ecrã em branco, um botão
 * desactivado para sempre. Mede-se isso e não a lista de pedidos
 * falhados, senão o teste dava vermelho por o mundo estar offline, que
 * é precisamente a condição em que ele tem de dar verde.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const RAIZ = 'file://' + path.resolve(__dirname, '..') + '/';

const CLIENTE = ['index.html', 'menu.html', 'galeria.html', 'reservas.html',
                 'sobre.html', 'contactos.html', 'mesa.html', 'takeaway.html'];
const GESTAO = ['login.html', 'dashboard.html', 'balcao.html', 'cozinha.html',
                'produtos.html', 'categorias.html', 'stock.html',
                'funcionarios.html', 'estatisticas.html', 'qrcodes.html'];

/* Palavras que, sozinhas num ecrã, querem dizer "estou à espera". */
const ESPERA = /a carregar|carregando|aguarde|loading|só um momento|a preparar/i;

const falhas = [];
const notas = [];
let feitas = 0;

function check(nome, ok, detalhe) {
  feitas++;
  if (!ok) falhas.push(`${nome}${detalhe ? ` (${detalhe})` : ''}`);
}

(async () => {
  const browser = await chromium.launch();
  const linhas = [];

  for (const [grupo, pastas] of [['cliente', CLIENTE], ['funcionarios', GESTAO]]) {
    for (const pag of pastas) {
      const url = `${RAIZ}${grupo}/${pag}${grupo === 'cliente' ? '?simular=1' : ''}`;
      const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });

      const pedidosFalhados = [];
      const erros = [];
      p.on('requestfailed', (r) => pedidosFalhados.push(
        new URL(r.url()).hostname || r.url().slice(0, 40)));
      p.on('pageerror', (e) => erros.push(String(e).split('\n')[0].slice(0, 90)));

      const t0 = Date.now();
      await p.goto(url, { waitUntil: 'load' }).catch(() => {});
      const tCarga = Date.now() - t0;

      /* Três segundos depois do `load` é tempo mais do que suficiente
         para um pedido de rede falhar (sem rede falha em milissegundos)
         e para o JavaScript reagir a essa falha. O que ainda estiver a
         dizer "a carregar" aqui, está a dizê-lo para sempre. */
      await p.waitForTimeout(3000);

      const urlFinal = p.url().split('/').pop().split('?')[0];
      const redirecionou = urlFinal !== pag;

      const estado = await p.evaluate((padrao) => {
        const re = new RegExp(padrao, 'i');
        const texto = (document.body.innerText || '').trim();
        const visivel = (e) => {
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          if (parseFloat(cs.opacity) < 0.05) return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        /* Elementos que ainda anunciam espera, e que se vêem. */
        const aEsperar = [...document.querySelectorAll('body *')]
          .filter((e) => e.children.length === 0)
          .filter((e) => re.test(e.textContent || ''))
          .filter(visivel)
          .map((e) => (e.textContent || '').trim().slice(0, 40));
        /* Spinners: coisas a rodar para sempre. */
        const rodas = [...document.querySelectorAll('[class*=spin],[class*=loader],[class*=carregar]')]
          .filter(visivel).length;
        /* As fontes que realmente chegaram. */
        const fontes = [...(document.fonts || [])]
          .filter((f) => f.status === 'loaded').map((f) => f.family);
        const corpo = document.body ? getComputedStyle(document.body).fontFamily : '';
        const h1 = document.querySelector('h1, .h1, .h1-menu, .h1-sobre, .h1-contactos, .h1-reservas');
        return {
          caracteres: texto.length,
          primeiras: texto.slice(0, 60).replace(/\s+/g, ' '),
          aEsperar,
          rodas,
          fontesCarregadas: [...new Set(fontes)],
          fontePedidaNoCorpo: corpo.split(',')[0].replace(/["']/g, ''),
          fonteDoTitulo: h1 ? getComputedStyle(h1).fontFamily.split(',')[0].replace(/["']/g, '') : null,
          transbordo: document.documentElement.scrollWidth - window.innerWidth,
          botoesMortos: [...document.querySelectorAll('button')]
            .filter((b) => b.disabled && visivel(b)).length,
        };
      }, ESPERA.source);

      const et = `${grupo}/${pag}`;

      /* Os ecrãs de gestão sem sessão têm de ir para o login — e sem
         servidor não há sessão possível. É o comportamento certo, e é
         por isso que se verifica em vez de se ignorar. */
      if (grupo === 'funcionarios' && pag !== 'login.html') {
        check(`${et} · sem sessão vai para o login`,
          redirecionou && urlFinal === 'login.html', `ficou em ${urlFinal}`);
      } else {
        check(`${et} · não foi desviada`, !redirecionou, `foi para ${urlFinal}`);
      }

      // 1. A página tem conteúdo — não é um ecrã em branco
      check(`${et} · tem conteúdo`, estado.caracteres > 120,
        `${estado.caracteres} caracteres: "${estado.primeiras}"`);

      // 2. Não ficou nada à espera
      check(`${et} · nada ficou a dizer "a carregar"`,
        estado.aEsperar.length === 0, estado.aEsperar.join(' | '));
      check(`${et} · nenhuma roda a girar para sempre`,
        estado.rodas === 0, `${estado.rodas}`);

      // 3. Não rebentou
      check(`${et} · sem erros de JavaScript`, erros.length === 0,
        erros.slice(0, 2).join(' | '));

      // 4. E continua a caber no ecrã sem as fontes certas
      check(`${et} · sem transbordo horizontal`,
        estado.transbordo <= 1, `${estado.transbordo}px`);

      linhas.push({
        pagina: et,
        ms: tCarga,
        caracteres: estado.caracteres,
        fontes: estado.fontesCarregadas.length,
        titulo: estado.fonteDoTitulo,
        botoesMortos: estado.botoesMortos,
        hosts: [...new Set(pedidosFalhados)],
        redirecionou,
        urlFinal,
      });

      await p.close();
    }
  }

  await browser.close();

  // ── O RELATÓRIO, que é o que interessa ao Guilherme ────────────────
  const larg = Math.max(...linhas.map((l) => l.pagina.length));
  console.log('\n══ AS 18 PÁGINAS SEM REDE ' + '═'.repeat(46));
  console.log('  (o contentor onde isto corre não tem internet: o "sem rede" é real)\n');
  console.log(`  ${'página'.padEnd(larg)}  ${'ms'.padStart(5)}  ${'texto'.padStart(6)}  fontes  título em`);
  console.log('  ' + '─'.repeat(larg + 40));
  for (const l of linhas) {
    console.log(`  ${l.pagina.padEnd(larg)}  ${String(l.ms).padStart(5)}  `
      + `${String(l.caracteres).padStart(6)}  ${String(l.fontes).padStart(6)}  ${l.titulo || '—'}`);
  }

  const todosOsHosts = [...new Set(linhas.flatMap((l) => l.hosts))];
  console.log(`\n  Servidores que alguma página tentou e não alcançou: `
    + (todosOsHosts.length ? todosOsHosts.join(', ') : 'nenhum'));
  const semFontes = linhas.filter((l) => l.fontes === 0).length;
  console.log(`  Páginas que carregaram ZERO fontes: ${semFontes} de ${linhas.length}`);
  const desviadas = linhas.filter((l) => l.redirecionou);
  console.log(`  Ecrãs que foram para o login por não haver sessão: ${desviadas.length}`
    + ` — nesses o que ficou medido foi a REDIRECÇÃO, não o ecrã`);
  const maisLenta = linhas.reduce((a, b) => (a.ms > b.ms ? a : b));
  console.log(`  A mais demorada: ${maisLenta.pagina}, ${maisLenta.ms}ms`);

  fs.writeFileSync(path.join(__dirname, '_capturas', 'sem-rede.json'),
    JSON.stringify(linhas, null, 1));

  console.log(falhas.length
    ? `\n❌ ${falhas.length} falha(s) em ${feitas}:\n  ${falhas.slice(0, 12).join('\n  ')}`
    : `\n✅ tudo passou — ${feitas} verificações em ${linhas.length} páginas, sem rede nenhuma`);
  if (notas.length) console.log('\n' + notas.join('\n'));
  process.exit(falhas.length ? 1 : 0);
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
