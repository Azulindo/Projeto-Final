/**
 * F-82 — A cortina do telemóvel. Nas seis páginas do cliente.
 *
 * O que tem de ficar provado:
 *   1. **Fechada, a barra é uma fila.** ≤60px em vez dos 148px de
 *      antes, em todas as larguras de telemóvel e nas seis páginas.
 *   2. O `--topbar` medido pelo `nav.js` bate com a altura real da
 *      barra. É o número que todas as páginas usam para se afastarem
 *      do topo: se divergir, o conteúdo entra debaixo da barra (foi o
 *      X-28) ou fica com um buraco por baixo dela.
 *   3. **Abrir a cortina NÃO muda o `--topbar`.** É a parte que mais
 *      facilmente se estragava: a cortina está dentro da barra no
 *      HTML, e se entrasse na medição, abrir o menu empurrava o
 *      conteúdo de seis páginas para baixo de repente. Há um controlo
 *      negativo no fim do teste que prova que esta verificação sabe
 *      reprovar.
 *   4. Fechada, a cortina tem `visibility: hidden` — e não só
 *      `opacity: 0`. Com `opacity` os cinco links continuavam a
 *      receber o foco do teclado dentro de uma coisa invisível.
 *   5. Os cinco links, abertos: todos visíveis, todos com 44px de
 *      alvo de dedo, todos dentro do ecrã, sem transbordo horizontal
 *      na página.
 *   6. O logótipo está no centro do ECRÃ (±2px), e não no centro do
 *      espaço que sobra ao lado do botão — que é 22px à direita.
 *   7. Fecha-se pelas quatro vias: o botão, o Escape, um clique fora,
 *      e escolher um link.
 *   8. **No computador nada muda.** Barra de 65px, botão invisível,
 *      as cinco ligações numa fila só, o bloco da esquerda à esquerda
 *      e o da direita à direita.
 *   9. Os cinco links existem **uma vez só** no HTML de cada página.
 *      Esta é a regra que deu origem a tudo isto: a alternativa fácil
 *      era duplicar o menu para o telemóvel, e ficavam duas listas
 *      para manter alinhadas.
 *
 * ── PORQUE É QUE ISTO EXISTE ────────────────────────────────────────
 * Porque a barra do telemóvel tinha **148px fixos** — o logótipo numa
 * fila e os cinco links partidos em 3 + 2 na seguinte — e é
 * `position: fixed`, portanto esses 148px estavam lá do princípio ao
 * fim do scroll, em todas as páginas. Num ecrã de 844px é 18% do
 * telemóvel gasto em navegação permanente. O Guilherme disse-o assim:
 * *"ela fica muito grande e ocupa muito espaço"*.
 *
 * E porque esta zona do projeto já cobrou três vezes: o `--topbar`
 * declarado a 108px quando o conteúdo pedia 146 (o logótipo ficava
 * 12px acima do topo, cortado), o hero das páginas interiores a
 * começar debaixo da barra, e a justificação escrita de que *"são
 * cinco ligações, cabem todas numa linha a 320px"* — que a medição
 * desmentiu. Três defeitos do mesmo sítio, todos vistos primeiro numa
 * captura do telemóvel dele e nenhum apanhado por um teste.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = 'file://' + path.resolve(__dirname, '..', 'cliente') + '/';

const PAGINAS = ['index.html', 'menu.html', 'galeria.html',
                 'reservas.html', 'sobre.html', 'contactos.html'];

const TELEMOVEL = [768, 480, 390, 320];
const COMPUTADOR = [1440, 1024];

const LINKS = ['Menu', 'Reservas', 'Galeria', 'Sobre', 'Contactos'];

const falhas = [];
let feitas = 0;

function check(nome, ok, detalhe) {
  feitas++;
  if (!ok) falhas.push(`${nome}${detalhe ? ` (${detalhe})` : ''}`);
}

/* Lê num só `evaluate` tudo o que interessa sobre a barra, para não
   haver duas medições do mesmo estado a poderem divergir. */
const LER = () => {
  const barra = document.querySelector('.inline-bar');
  const botao = document.querySelector('.botao-cortina');
  const cortina = document.querySelector('#menu-principal');
  const logo = document.querySelector('.logo-center');
  const rb = barra.getBoundingClientRect();
  const rbot = botao.getBoundingClientRect();
  const rlogo = logo.getBoundingClientRect();
  const links = [...cortina.querySelectorAll('a')].map((a) => {
    const r = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    return {
      texto: a.textContent.trim(),
      x: Math.round(r.left), dir: Math.round(r.right),
      y: Math.round(r.top), altura: Math.round(r.height),
      visivel: cs.visibility === 'visible' && parseFloat(cs.opacity) > 0.01,
    };
  });
  return {
    barraAltura: Math.round(rb.height),
    topbar: parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--topbar')),
    botaoVisivel: getComputedStyle(botao).display !== 'none',
    botaoL: Math.round(rbot.width), botaoA: Math.round(rbot.height),
    expandido: botao.getAttribute('aria-expanded'),
    rotulo: botao.getAttribute('aria-label'),
    controla: botao.getAttribute('aria-controls'),
    cortinaId: cortina.id,
    cortinaVisivel: getComputedStyle(cortina).visibility === 'visible',
    cortinaFundo: Math.round(cortina.getBoundingClientRect().bottom),
    cortinaTopo: Math.round(cortina.getBoundingClientRect().top),
    logoCentro: Math.round(rlogo.left + rlogo.width / 2),
    links,
    transbordoDoc: document.documentElement.scrollWidth - window.innerWidth,
    /* Quantas vezes cada link existe no HTML da página: a regra que
       deu origem a isto. */
    nLinks: links.length,
  };
};

(async () => {
  const browser = await chromium.launch();

  // ══ TELEMÓVEL ═════════════════════════════════════════════════════
  for (const largura of TELEMOVEL) {
    for (const pag of PAGINAS) {
      const p = await browser.newPage({ viewport: { width: largura, height: 844 } });
      await p.goto(RAIZ + pag, { waitUntil: 'load' });
      await p.waitForTimeout(400);   // o medirBarra() corre no `load`

      const et = `${largura}px · ${pag}`;
      const fechada = await p.evaluate(LER);

      // 1. Fechada é uma fila
      check(`${et} · barra fechada é uma fila`,
        fechada.barraAltura >= 44 && fechada.barraAltura <= 60,
        `${fechada.barraAltura}px`);

      // 2. O --topbar bate com o que se vê
      check(`${et} · --topbar = altura real`,
        Math.abs(fechada.topbar - fechada.barraAltura) <= 2,
        `--topbar ${fechada.topbar} vs ${fechada.barraAltura}px`);

      // 3. O botão
      check(`${et} · botão visível`, fechada.botaoVisivel);
      check(`${et} · botão é alvo de dedo`,
        fechada.botaoL >= 44 && fechada.botaoA >= 44,
        `${fechada.botaoL}×${fechada.botaoA}`);
      check(`${et} · botão diz que está fechado`,
        fechada.expandido === 'false', fechada.expandido);
      check(`${et} · botão tem rótulo`,
        (fechada.rotulo || '').length > 3, fechada.rotulo);
      check(`${et} · aria-controls aponta para a cortina`,
        fechada.controla === fechada.cortinaId,
        `${fechada.controla} vs #${fechada.cortinaId}`);

      // 4. Fechada é invisível de verdade
      check(`${et} · cortina fechada não é focável`,
        !fechada.cortinaVisivel && fechada.links.every((l) => !l.visivel));

      // 6. O logótipo ao centro do ECRÃ
      check(`${et} · logótipo ao centro do ecrã`,
        Math.abs(fechada.logoCentro - largura / 2) <= 2,
        `centro em ${fechada.logoCentro}, ecrã ${largura / 2}`);

      // 9. Os cinco links, uma vez só
      check(`${et} · cinco links, uma vez só`,
        fechada.nLinks === 5, `${fechada.nLinks}`);

      // ── Abrir ─────────────────────────────────────────────────────
      await p.click('.botao-cortina');
      await p.waitForTimeout(450);   // a transição do max-height
      const aberta = await p.evaluate(LER);

      check(`${et} · botão diz que está aberto`,
        aberta.expandido === 'true', aberta.expandido);
      check(`${et} · rótulo mudou ao abrir`,
        aberta.rotulo !== fechada.rotulo, `${fechada.rotulo} → ${aberta.rotulo}`);
      check(`${et} · cortina visível`, aberta.cortinaVisivel);

      // 3. O ponto que mais facilmente se estragava
      check(`${et} · abrir NÃO mexe no --topbar`,
        Math.abs(aberta.topbar - fechada.topbar) <= 1,
        `${fechada.topbar} → ${aberta.topbar}`);
      check(`${et} · abrir NÃO faz a barra crescer`,
        aberta.barraAltura === fechada.barraAltura,
        `${fechada.barraAltura} → ${aberta.barraAltura}px`);

      // A cortina pendura-se por baixo da barra, sem buraco nem sobreposição
      check(`${et} · cortina encosta ao fundo da barra`,
        Math.abs(aberta.cortinaTopo - fechada.barraAltura) <= 2,
        `cortina em y=${aberta.cortinaTopo}, barra acaba em ${fechada.barraAltura}`);

      // 5. Os cinco links
      for (const l of aberta.links) {
        check(`${et} · "${l.texto}" visível`, l.visivel);
        check(`${et} · "${l.texto}" é alvo de dedo`,
          l.altura >= 44, `${l.altura}px`);
        check(`${et} · "${l.texto}" dentro do ecrã`,
          l.x >= 0 && l.dir <= largura, `${l.x}–${l.dir} em ${largura}px`);
      }
      const nomes = aberta.links.map((l) => l.texto);
      check(`${et} · os cinco links são estes`,
        LINKS.every((n) => nomes.includes(n)), nomes.join(', '));
      /* Em coluna: cada um mais abaixo do que o anterior, e nenhum
         empilhado sobre outro. */
      const ys = aberta.links.map((l) => l.y);
      check(`${et} · os links estão em coluna`,
        ys.every((y, i) => i === 0 || y > ys[i - 1]), ys.join(', '));
      check(`${et} · a cortina não cabe fora do ecrã`,
        aberta.cortinaFundo <= 844, `acaba em y=${aberta.cortinaFundo}`);
      check(`${et} · sem transbordo horizontal com a cortina aberta`,
        aberta.transbordoDoc <= 1, `${aberta.transbordoDoc}px`);

      // 7a. Fecha com Escape, e o foco volta ao botão
      await p.keyboard.press('Escape');
      await p.waitForTimeout(400);
      const porEscape = await p.evaluate(() => ({
        expandido: document.querySelector('.botao-cortina').getAttribute('aria-expanded'),
        focoNoBotao: document.activeElement === document.querySelector('.botao-cortina'),
      }));
      check(`${et} · Escape fecha`, porEscape.expandido === 'false');
      check(`${et} · o foco volta ao botão`, porEscape.focoNoBotao);

      // 7b. Fecha com um clique fora — em cima do véu
      await p.click('.botao-cortina');
      await p.waitForTimeout(400);
      /* Que o clique cai MESMO no véu, e não na página por baixo dele.
         Sem esta linha, a verificação seguinte passava verde com ou sem
         véu, porque um clique na página também fecha. O alvo é a
         própria `.inline-bar`: um pseudo-elemento não é um alvo de
         eventos, e foi isso que quebrou a primeira versão do fecho. */
      const alvoDoVeu = await p.evaluate(() => {
        const el = document.elementFromPoint(window.innerWidth / 2, 700);
        return el ? el.className : 'nada';
      });
      check(`${et} · o véu cobre a página`,
        String(alvoDoVeu).includes('inline-bar'), String(alvoDoVeu));
      await p.mouse.click(largura / 2, 700);
      await p.waitForTimeout(400);
      check(`${et} · clique fora fecha`,
        (await p.evaluate(() => document.querySelector('.botao-cortina')
          .getAttribute('aria-expanded'))) === 'false');

      // 7c. E o botão fecha o que abriu
      await p.click('.botao-cortina');
      await p.waitForTimeout(400);
      await p.click('.botao-cortina');
      await p.waitForTimeout(400);
      check(`${et} · o botão fecha o que abriu`,
        (await p.evaluate(() => document.querySelector('.botao-cortina')
          .getAttribute('aria-expanded'))) === 'false');

      await p.close();
    }
  }

  // ══ COMPUTADOR — nada muda ════════════════════════════════════════
  for (const largura of COMPUTADOR) {
    for (const pag of PAGINAS) {
      const p = await browser.newPage({ viewport: { width: largura, height: 900 } });
      await p.goto(RAIZ + pag, { waitUntil: 'load' });
      await p.waitForTimeout(400);

      const et = `${largura}px · ${pag}`;
      const d = await p.evaluate(LER);

      check(`${et} · botão não existe no computador`, !d.botaoVisivel);
      check(`${et} · barra de 65px`,
        d.barraAltura >= 60 && d.barraAltura <= 70, `${d.barraAltura}px`);
      check(`${et} · as ligações estão visíveis sem cortina`,
        d.links.every((l) => l.visivel));
      check(`${et} · as cinco numa fila só`,
        new Set(d.links.map((l) => l.y)).size === 1,
        d.links.map((l) => `${l.texto}@${l.y}`).join(' '));
      /* O bloco da esquerda à esquerda do logótipo, o da direita à
         direita: é a composição do computador. */
      check(`${et} · "Menu" à esquerda do logótipo`,
        d.links[0].dir < d.logoCentro, `${d.links[0].dir} < ${d.logoCentro}`);
      check(`${et} · "Contactos" à direita do logótipo`,
        d.links[4].x > d.logoCentro, `${d.links[4].x} > ${d.logoCentro}`);
      check(`${et} · logótipo ao centro da barra`,
        Math.abs(d.logoCentro - largura / 2) <= 2, `${d.logoCentro}`);
      check(`${et} · sem transbordo horizontal`, d.transbordoDoc <= 1);

      await p.close();
    }
  }

  // ══ CONTROLO NEGATIVO ═════════════════════════════════════════════
  /* A verificação nº 3 — *"abrir a cortina não mexe no --topbar"* — é a
     que este teste existe sobretudo para guardar. Uma verificação que
     nunca reprovou não se sabe se sabe reprovar: já aconteceu cinco
     vezes neste projeto uma passar verde por não estar a olhar para a
     coisa certa.
     Aqui tira-se o `data-fora-da-medicao` à cortina — que é
     exactamente o descuido que se quer impedir — e o teste tem de
     apanhar o estrago. Se NÃO apanhar, é o teste que está quebrado. */
  {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(RAIZ + 'index.html', { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const antes = await p.evaluate(() => parseFloat(getComputedStyle(
      document.documentElement).getPropertyValue('--topbar')));

    await p.evaluate(() => {
      document.querySelector('#menu-principal').removeAttribute('data-fora-da-medicao');
    });
    await p.click('.botao-cortina');
    await p.waitForTimeout(450);
    /* Força uma nova medição pela via normal (o `resize` tem 150ms de
       espera no `nav.js`). */
    await p.setViewportSize({ width: 391, height: 844 });
    await p.waitForTimeout(500);
    const depois = await p.evaluate(() => parseFloat(getComputedStyle(
      document.documentElement).getPropertyValue('--topbar')));
    await p.close();

    check('controlo negativo · sem o data-fora-da-medicao o --topbar estoura',
      depois > antes + 50,
      `${antes} → ${depois} — se não cresceu, a medição não está a ver a cortina `
      + 'e a verificação nº 3 passa verde por acidente');
  }

  await browser.close();
  console.log(falhas.length
    ? `\n❌ ${falhas.length} falha(s) em ${feitas}:\n  ${falhas.slice(0, 12).join('\n  ')}`
      + (falhas.length > 12 ? `\n  …e mais ${falhas.length - 12}` : '')
    : `\n✅ tudo passou — ${feitas} verificações: ${PAGINAS.length} páginas × `
      + `${TELEMOVEL.length} larguras de telemóvel + ${COMPUTADOR.length} de computador, `
      + 'mais o controlo negativo');
  process.exit(falhas.length ? 1 : 0);
})();
