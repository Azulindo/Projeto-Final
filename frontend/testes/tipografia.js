/**
 * F-74 — Um papel, uma fonte. Nas seis páginas do cliente.
 *
 * O que tem de ficar provado:
 *   1. Cada PAPEL tipográfico usa exactamente **uma** família em todo o
 *      site: título de página, título de secção, subtítulo, rótulo de
 *      botão e corpo de texto.
 *   2. Nenhum `<button>` cai na fonte do sistema.
 *   3. A hierarquia não está invertida **em nenhuma largura**: o
 *      `<h2>` é sempre menor do que o `<h1>` da sua página, e o `<h3>`
 *      menor do que o `<h2>`. A primeira versão desta verificação
 *      media só a **1440px** e dava verde — e a 320px o `<h1>` da
 *      entrada tinha 17,6px contra os 24px do `<h2>`. *Mais uma
 *      verificação a passar por não estar a olhar para a coisa real*,
 *      e a terceira do mesmo dia. Mede agora em sete larguras.
 *   4. Cada página declara `lang="pt"`.
 *   5. Cada página tem **um** `<h1>`.
 *   6. Os quatro botões de MARCA têm o mesmo papel: mesma família,
 *      mesmo peso, mesma caixa, mesmo espaçamento — e todos declaram
 *      a classe `.vpa-rotulo`, que é onde esse papel vive.
 *   7. Os CONTROLOS de interface (o ✕ e as setas do lightbox, o enviar
 *      do chat) são um papel à parte e levam a letra do corpo. Pôr uma
 *      letra de display num ✕ não quer dizer nada, e foi a tentar
 *      meter os dois no mesmo papel que este teste falhou quando o
 *      Nosifer entrou nos botões de marca.
 *
 * ── PORQUE É QUE ISTO EXISTE ────────────────────────────────────────
 * Porque `"Metal Mania", sans-serif` estava escrito **14 vezes em 6
 * ficheiros**, e a medição de 14/09 mostrou o resultado: o H1 tinha
 * duas fontes, o H2 tinha duas fontes, e os botões tinham duas — Inter
 * em quatro e **Arial** nos outros quatro (o ✕ e as setas do lightbox
 * da galeria, e o enviar do chat das reservas), porque um `<button>`
 * não herda `font-family` do `body` e nenhuma folha lho declarava.
 *
 * A `index.html` era a excepção em tudo: os títulos dela nunca tiveram
 * `font-family`, por isso caíam no Inter do corpo. **A página de
 * entrada era a única do site sem a voz do site.** E os `<h2>` dela
 * estavam a 50px contra os 41,6px do `<h1>` — o título de secção
 * gritava mais alto do que o título da página.
 *
 * É a mesma forma do `--gradiente-fogo` (nove cópias em seis ficheiros)
 * e do `--texto-fraco` (corrigido em três ficheiros sem ninguém tocar
 * na variável). A diferença é que estes dois foram apanhados por um
 * teste de contraste e este não tinha teste nenhum: **uma fonte errada
 * não falha, não avisa e não dá erro — só parece de outro site.** Foi o
 * Guilherme que reparou, a olhar para duas páginas.
 *
 * ── E PORQUE É QUE O NÚMERO DE BOTÕES NÃO ESTÁ ESCRITO AQUI ─────────
 * Porque a primeira versão desta verificação dizia *"5 larguras × 3
 * botões"* na linha final e eu acrescentei um quarto botão — a linha
 * continuou a dizer três. Um teste que mente no resumo é pior do que um
 * teste que não existe. O número é contado, não escrito.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = 'file://' + path.resolve(__dirname, '..', 'cliente') + '/';

const PAGINAS = ['index.html', 'menu.html', 'galeria.html',
                 'reservas.html', 'sobre.html', 'contactos.html'];

/* Os botões do site, pelo selector. Se aparecer um quinto, entra aqui
   e o resumo passa a dizer quatro... cinco, sozinho. */
const BOTOES = [
  ['index.html', '.btn'],
  ['index.html', '.reservas'],
  /* O `.galeria-btn` saiu desta lista a 29/10 porque o botão saiu da
     página (era o terceiro caminho para a galeria). Tirar o elemento
     deixou esta suite com 6 falhas — a exigir a presença de uma coisa
     que o dono da página mandou embora — e é por isso que a lista está
     aqui e não espalhada pelas verificações: um sítio para corrigir. */
  ['menu.html', '.takeaway-btn'],
];

const LARGURAS_BOTOES = [1440, 768, 480, 375, 320];

/* A hierarquia mede-se em TODAS as larguras, não na do computador.
   Ao computador a ordem estava certa nas cinco páginas; era só ao
   telemóvel que se invertia, e é o telemóvel que o cliente tem. */
const LARGURAS_ESCALA = [1440, 1024, 768, 600, 480, 375, 320];

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

const primeiro = f => f.split(',')[0].replace(/["']/g, '').trim();

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ── 1. Um papel, uma fonte ─────────────────────────────────────── */
  const porPapel = {};   // papel → Map(fonte → [onde])

  console.log('\nPAPÉIS, PÁGINA A PÁGINA');
  for (const pag of PAGINAS) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.goto(RAIZ + pag, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(500);

    const m = await p.evaluate(() => {
      const prim = f => f.split(',')[0].replace(/["']/g, '').trim();
      const visivel = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

      const itens = [];
      for (const el of document.querySelectorAll('h1,h2,h3,h4,button,a,.h1')) {
        if (!visivel(el)) continue;
        const t = el.tagName.toLowerCase();
        let papel = null;
        /* ── DOIS TIPOS DE BOTÃO, E NÃO UM (F-76) ─────────────────────
           Um botão de MARCA ("Ver Menu", "Reservar mesa") leva a letra
           dos títulos; um CONTROLO de interface (o ✕ e as setas do
           lightbox, o enviar do chat) leva a do corpo, porque pôr uma
           letra de display num ✕ não quer dizer nada.

           A distinção lê-se da classe `.vpa-rotulo` no HTML e não de
           uma lista de selectores aqui — assim o teste pergunta pela
           INTENÇÃO declarada, em vez de a adivinhar. E por isso há mais
           abaixo uma verificação de que os quatro botões de marca ainda
           têm a classe: sem ela, tirar a classe a um botão fazia-o
           passar a "controlo" e o teste ficava verde com o botão
           errado. */
        if (/\bvpa-rotulo\b/.test(String(el.className))) papel = 'rótulo de marca';
        else if (t === 'button') papel = 'controlo de interface';
        else if (/^h[1-6]$/.test(t)) papel = t.toUpperCase();
        else if (el.classList.contains('h1')) papel = 'H1';
        if (!papel) continue;
        const cs = getComputedStyle(el);
        itens.push({ papel, fonte: prim(cs.fontFamily), tam: parseFloat(cs.fontSize),
                     onde: t + (el.className ? '.' + String(el.className).split(/\s+/)[0] : '') });
      }
      const corpo = getComputedStyle(document.body);
      itens.push({ papel: 'corpo', fonte: prim(corpo.fontFamily),
                   tam: parseFloat(corpo.fontSize), onde: 'body' });

      const h1s = [...document.querySelectorAll('h1, .h1')].filter(visivel);
      return { itens, lang: document.documentElement.lang, nH1: h1s.length };
    });

    for (const it of m.itens) {
      ((porPapel[it.papel] ??= new Map()).get(it.fonte)
        || porPapel[it.papel].set(it.fonte, []).get(it.fonte)).push(`${pag}:${it.onde}`);
    }

    const resumo = [...new Set(m.itens.map(i => `${i.papel}=${i.fonte}`))].sort().join(' ');
    console.log(`  ${pag.padEnd(15)} ${resumo}`);

    check(`${pag} · lang="pt"`, m.lang === 'pt', `lang="${m.lang}"`);
    check(`${pag} · um só <h1>`, m.nH1 === 1, `${m.nH1} <h1>`);

    await p.close();
  }

  /* ── 1b. A escala, em sete larguras ─────────────────────────────── */
  console.log('\nA ESCALA DOS TÍTULOS, LARGURA A LARGURA');
  for (const pag of PAGINAS) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(RAIZ + pag, { waitUntil: 'domcontentloaded' });
    const fora = [];
    for (const largura of LARGURAS_ESCALA) {
      await p.setViewportSize({ width: largura, height: 900 });
      await p.waitForTimeout(220);
      const m = await p.evaluate(() => {
        const vis = e => e.getBoundingClientRect().width > 0;
        const tam = sel => [...document.querySelectorAll(sel)].filter(vis)
                              .map(e => parseFloat(getComputedStyle(e).fontSize));
        return {
          h1: Math.max(0, ...tam('h1, .h1')),
          h2: Math.max(0, ...tam('h2, .section-title')),
          h3: Math.max(0, ...tam('h3')),
          transbordo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      const ordemOk = (m.h2 === 0 || m.h2 < m.h1) && (m.h3 === 0 || m.h2 === 0 || m.h3 < m.h2);
      if (!ordemOk || m.transbordo > 0) {
        fora.push(`${largura}px (h1 ${m.h1} h2 ${m.h2} h3 ${m.h3}${m.transbordo ? `, transbordo ${m.transbordo}px` : ''})`);
      }
    }
    check(`${pag} · h1 > h2 > h3 nas ${LARGURAS_ESCALA.length} larguras`,
      fora.length === 0, fora.join(' | '));
    await p.close();
  }

  console.log('\nQUANTAS FONTES POR PAPEL');
  for (const [papel, fontes] of Object.entries(porPapel)) {
    const nomes = [...fontes.keys()];
    const detalhe = nomes.map(f => {
      const paginas = [...new Set(fontes.get(f).map(o => o.split(':')[0]))];
      return `${f} (${fontes.get(f).length}× em ${paginas.length} página${paginas.length > 1 ? 's' : ''})`;
    }).join(' + ');
    check(`papel "${papel}" com uma só fonte`, nomes.length === 1, detalhe);
  }

  /* ── 2. Os botões, todos com o mesmo papel e todos legíveis ─────── */
  console.log('\nOS BOTÕES DO SITE');

  /* Sem isto, tirar a `.vpa-rotulo` a um botão tirava-o do papel de
     marca e o teste ficava verde — a passar por não estar a olhar. */
  for (const [pag, sel] of BOTOES) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(RAIZ + pag, { waitUntil: 'domcontentloaded' });
    const tem = await p.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.classList.contains('vpa-rotulo') : null;
    }, sel);
    /* A explicação só se escreve quando FALHA. A primeira versão desta
       linha imprimia "sem a classe" ao lado de um ✅ — uma saída que
       contradiz o próprio veredicto, que é o defeito contra o qual
       este ficheiro tem um parágrafo escrito. */
    check(`${pag} · ${sel} declara .vpa-rotulo`, tem === true,
      tem === true ? '' : (tem === null ? 'não existe' : 'sem a classe'));
    await p.close();
  }
  let medidos = 0;
  for (const largura of LARGURAS_BOTOES) {
    const assinaturas = new Map();
    for (const [pag, sel] of BOTOES) {
      const p = await browser.newPage({ viewport: { width: largura, height: 900 } });
      await p.goto(RAIZ + pag, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(500);
      const b = await p.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          fonte: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
          peso: cs.fontWeight, caixa: cs.textTransform,
          /* Em `em`, para comparar entre tamanhos de letra diferentes. */
          espacoEm: (parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize)).toFixed(3),
          altura: Math.round(r.height),
          transborda: el.scrollWidth - el.clientWidth,
          texto: el.textContent.trim().slice(0, 24),
        };
      }, sel);
      await p.close();

      if (!b) { check(`${largura}px · ${sel} existe`, false); continue; }
      medidos++;
      const assinatura = `${b.fonte}/${b.peso}/${b.caixa}/${b.espacoEm}`;
      (assinaturas.get(assinatura) || assinaturas.set(assinatura, []).get(assinatura)).push(sel);

      check(`${largura}px · ${sel} · rótulo não transborda`,
        b.transborda <= 1, `${b.transborda}px ("${b.texto}")`);
      /* 44px é o alvo de dedo mínimo (WCAG 2.5.5 / Apple). */
      check(`${largura}px · ${sel} · altura de alvo de dedo`,
        b.altura >= 44, `${b.altura}px`);
    }

    check(`${largura}px · os ${BOTOES.length} botões têm o mesmo papel`,
      assinaturas.size === 1,
      [...assinaturas.entries()].map(([a, sels]) => `${a} ← ${sels.join(', ')}`).join('  |  '));
  }

  await browser.close();
  console.log(falhas.length
    ? `\n❌ ${falhas.length} falha(s): ${falhas.slice(0, 6).join(', ')}${falhas.length > 6 ? '…' : ''}`
    : `\n✅ tudo passou — ${PAGINAS.length} páginas, ${BOTOES.length} botões, ${medidos} medições de botão`);
  process.exit(falhas.length ? 1 : 0);
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
