/**
 * F-71 — A moldura das fotografias dos criadores (index.html).
 *
 * O que tem de ficar provado:
 *   1. As duas molduras têm a MESMA medida e a mesma forma (3:4) em
 *      todas as larguras. Era isto que não acontecia: a medida da foto
 *      estava escrita em cinco sítios que discordavam entre si (dois
 *      atributos no HTML e três media queries), e a foto do Guilherme
 *      aparecia 42% mais larga do que a proporção real da imagem.
 *   2. A imagem enche a moldura com `object-fit: cover` — corta, não
 *      estica. Uma imagem esticada não dá erro nenhum: fica só feia,
 *      e nenhum teste de contraste ou de responsividade a vê.
 *   3. O nome não desce abaixo de 24px, que é o limiar de "texto
 *      grande" da WCAG. O dourado sólido `#e8b34f` dá 9,9:1 sobre o
 *      `#0f0f0f` da `.page`; o `--gradiente-fogo` chegava a 3,0:1 no
 *      ponto mais escuro, e a 3,0:1 o tamanho passa a ser obrigatório.
 *   4. O texto não sai da coluna, e a coluna não sai da `.page`.
 *   5. O fio da moldura continua FINO (1 a 2px). A primeira moldura
 *      tinha 6px de gradiente e o Guilherme recusou-a por ser gorda;
 *      sem esta verificação, uma linha de CSS devolvia-a sem aviso.
 *   6. As duas fotografias continuam com o tom único (`grayscale` +
 *      `sepia`). Se alguém tirar o `filter`, o par volta a bater — uma
 *      com fundo de praia e camisola vermelha, a outra com equipamento
 *      verde — e **isso não dá erro nenhum, fica só feio.**
 *
 * O espaço útil da moldura é MEDIDO (padding + borda pelo
 * `getComputedStyle`) e não assumido. Estava aqui escrito à mão como
 * "6px de cada lado", e o passe-partout passou a percentagem para
 * acompanhar os quatro degraus de largura — o teste teria começado a
 * falhar por ter uma cópia do número que vive no CSS.
 *
 * ── PORQUE É QUE ESTE TESTE FAZ SCROLL E ESPERA PELO `onload` ───────
 * Porque sem isso passava a dizer que estava tudo bem quando não
 * estava. As fotografias têm `loading="lazy"`: se se medir a secção
 * sem lá chegar, as imagens ainda não existem, a moldura fica com a
 * altura que o `aspect-ratio` manda, e as onze larguras dão ✅.
 *
 * Com as imagens carregadas, a moldura do Guilherme ia a **575px** em
 * vez de 347px — um flex-item de coluna tem `min-height: auto` e nunca
 * encolhe abaixo do conteúdo, e aquela imagem tem 2048px de altura
 * natural. O defeito que este teste existe para apanhar estava lá, à
 * vista no ecrã, e o teste não o via.
 *
 * É a mesma armadilha da auditoria responsiva a ler um espelho
 * desactualizado e da comparação de fontes que corria offline nos dois
 * lados: **uma verificação que passa por não estar a olhar para a
 * coisa real.** Daí a ordem ser sempre esta — scroll, esperar pelas
 * imagens, e só depois medir.
 */
const { chromium } = require('playwright');
const path = require('path');

const PAGINA = 'file://' + path.resolve(__dirname, '..', 'cliente', 'index.html');

/* Larguras: as três do computador, as duas de tablet, e cada degrau
   das media queries (768, 600, 480, 375, 320). */
const LARGURAS = [1920, 1440, 1366, 1100, 1024, 900, 768, 600, 480, 375, 320];

const RAZAO = 3 / 4;        /* a forma que as duas têm de ter */
const NOME_MIN = 24;        /* px — limiar de "texto grande" da WCAG */

const falhas = [];
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  if (!c) falhas.push(n);
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  for (const largura of LARGURAS) {
    const p = await browser.newPage({ viewport: { width: largura, height: 900 } });
    await p.goto(PAGINA, { waitUntil: 'domcontentloaded' });

    /* A ordem importa — ver o comentário grande em cima. */
    await p.evaluate(() => document.querySelector('.gerentes').scrollIntoView());
    await p.evaluate(() => Promise.all([...document.images].map(
      i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
    await p.waitForTimeout(400);

    const m = await p.evaluate(() => {
      const range = document.createRange();
      const pagina = document.querySelector('.page').getBoundingClientRect();

      const colunas = [...document.querySelectorAll('.creator')].map(el => {
        const par = el.querySelector('p');
        const moldura = el.querySelector('.creator-moldura');
        const img = el.querySelector('img');
        const nome = el.querySelector('.creator-nome');

        const rc = el.getBoundingClientRect();
        const rp = par.getBoundingClientRect();
        const rm = moldura.getBoundingClientRect();
        const ri = img.getBoundingClientRect();

        /* Onde é que o TEXTO desenhado começa e acaba — e não a caixa
           do parágrafo. Um parágrafo centrado cujas linhas sejam mais
           largas do que ele transborda para os dois lados, e a caixa
           não dá por isso. */
        let esq = Infinity, dir = -Infinity;
        for (const no of par.childNodes) {
          if (no.nodeType !== 3) continue;
          range.selectNodeContents(no);
          for (const r of range.getClientRects()) {
            esq = Math.min(esq, r.left);
            dir = Math.max(dir, r.right);
          }
        }

        return {
          colEsq: rc.left, colDir: rc.right,
          moldW: Math.round(rm.width), moldH: Math.round(rm.height),
          imgW: Math.round(ri.width), imgH: Math.round(ri.height),
          /* O passe-partout está em PERCENTAGEM, por isso o teste tem
             de o medir. Estava aqui escrito à mão como 6px de cada
             lado — mais um número repetido fora do sítio onde vive,
             que é o defeito que esta tarefa veio corrigir. */
          padEsq: parseFloat(getComputedStyle(moldura).paddingLeft),
          padTopo: parseFloat(getComputedStyle(moldura).paddingTop),
          borda: parseFloat(getComputedStyle(moldura).borderLeftWidth),
          filtro: getComputedStyle(img).filter,
          completa: img.complete && img.naturalWidth > 0,
          objFit: getComputedStyle(img).objectFit,
          nomePx: parseFloat(getComputedStyle(nome).fontSize),
          /* POSITIVO = o texto saiu para fora do parágrafo. */
          saiEsq: Math.round(rp.left - esq),
          saiDir: Math.round(dir - rp.right),
        };
      });

      return {
        colunas,
        pagEsq: pagina.left, pagDir: pagina.right,
        transbordo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    const [a, b] = m.colunas;
    const et = `${largura}px`;

    check(`${et} · as duas fotografias carregaram`,
      a.completa && b.completa);

    check(`${et} · molduras com a mesma medida`,
      a.moldW === b.moldW && a.moldH === b.moldH,
      `${a.moldW}×${a.moldH} vs ${b.moldW}×${b.moldH}`);

    m.colunas.forEach((c, i) => {
      const razao = c.moldW / c.moldH;
      check(`${et} · moldura ${i + 1} é 3:4`,
        Math.abs(razao - RAZAO) <= 0.02,
        `${c.moldW}×${c.moldH} = ${razao.toFixed(3)}`);

      /* A imagem enche a caixa de conteúdo: a moldura menos o fio e
         menos o passe-partout, dos dois lados. Medido, não assumido. */
      const dentroW = Math.round(c.moldW - 2 * (c.padEsq + c.borda));
      const dentroH = Math.round(c.moldH - 2 * (c.padTopo + c.borda));
      check(`${et} · imagem ${i + 1} enche a moldura`,
        Math.abs(c.imgW - dentroW) <= 1 && Math.abs(c.imgH - dentroH) <= 1,
        `${c.imgW}×${c.imgH} contra ${dentroW}×${dentroH} de espaço útil`);

      /* O fio de cobre existe e é fino. Uma moldura sem fio não é uma
         moldura, e um fio grosso era a versão que o Guilherme recusou. */
      check(`${et} · moldura ${i + 1} com fio fino`,
        c.borda >= 1 && c.borda <= 2, `${c.borda}px`);

      /* O tom único. Se alguém tirar o `filter`, as duas fotografias
         voltam a bater uma com a outra — e isso não dá erro nenhum. */
      check(`${et} · fotografia ${i + 1} com o tom único`,
        /grayscale/.test(c.filtro) && /sepia/.test(c.filtro), c.filtro.slice(0, 46));

      check(`${et} · imagem ${i + 1} corta em vez de esticar`,
        c.objFit === 'cover', c.objFit);

      check(`${et} · nome ${i + 1} com pelo menos ${NOME_MIN}px`,
        c.nomePx >= NOME_MIN, `${c.nomePx}px`);

      check(`${et} · texto ${i + 1} dentro da coluna`,
        c.saiEsq <= 1 && c.saiDir <= 1,
        `sai ${c.saiEsq}px à esquerda, ${c.saiDir}px à direita`);

      check(`${et} · coluna ${i + 1} dentro da .page`,
        c.colEsq >= m.pagEsq - 1 && c.colDir <= m.pagDir + 1,
        `${Math.round(c.colEsq)}→${Math.round(c.colDir)} contra ${Math.round(m.pagEsq)}→${Math.round(m.pagDir)}`);
    });

    check(`${et} · a página não transborda`,
      m.transbordo === 0, `${m.transbordo}px`);

    if (largura === 1440 || largura === 375) {
      const secao = await p.$('.gerentes');
      await secao.screenshot({
        path: path.resolve(__dirname, '_capturas', `f71-criadores-${largura}.png`),
      });
    }

    await p.close();
  }

  await browser.close();
  console.log(falhas.length
    ? `\n❌ ${falhas.length} falha(s): ${falhas.slice(0, 8).join(', ')}${falhas.length > 8 ? '…' : ''}`
    : `\n✅ tudo passou — ${LARGURAS.length} larguras`);
  process.exit(falhas.length ? 1 : 0);
})();
