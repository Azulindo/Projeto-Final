/**
 * X-30 — A `mesa.html` nos estados que a auditoria não vê.
 *
 * ── O DEFEITO QUE ISTO FECHA ─────────────────────────────────────────
 * A `auditoria-responsiva.js` mede cada página **no estado em que ela
 * carrega**. Para quinze das dezesseis páginas isso é quase tudo o que
 * elas têm. A `mesa.html` é o contrário: é uma página só que é seis
 * ecrãs — lista de produtos, carrinho, nota, resumo, pedido enviado,
 * erro — e a auditoria só chega ao primeiro e ao de erro.
 *
 * Em consequência, a 27/10 a auditoria apanhou **4 textos abaixo de
 * 12px** (no bloco "Detalhes técnicos" do ecrã de erro, que é o X-24)
 * e não podia apanhar os outros **5 que estavam no fluxo**, entre eles
 * a própria nota que o cliente escreve, mostrada de volta a 11px:
 *
 *     p 11px "“Sem cebola — alergia”"
 *     span 10px "por enviar"
 *     button 11px "✏️ Alterar nota"
 *     span#resumoCount 11px "1"
 *
 * **As duas metades do defeito tinham a mesma causa** (dez classes
 * `text-[11px]`/`text-[10px]` no mesmo ficheiro) e só uma delas era
 * alcançável por uma verificação. É a armadilha desta casa outra vez,
 * agora na forma mais incómoda: *um teste que passa porque não olha*.
 *
 * ── O QUE MEDE ───────────────────────────────────────────────────────
 * Percorre o fluxo a 320px — o ecrã mais apertado que suportamos — e
 * em cada estado mede duas coisas:
 *
 *   1. texto visível abaixo de 12px (o piso que a auditoria usa);
 *   2. transbordo horizontal da página.
 *
 * **O (2) é o controlo do (1), e não um extra.** Duas das etiquetas
 * eram `whitespace-nowrap` a 10px ("anulado · não cobrado"); subi-las
 * a 12px podia fazer a linha passar a largura do ecrã, e nesse caso a
 * correcção de legibilidade comprava um defeito de layout. Medir só o
 * tamanho da letra dava "arrumado" a uma página a abanar de lado.
 *
 * ── CONTROLO NEGATIVO ────────────────────────────────────────────────
 * No fim, o teste **volta a pôr 11px** nos mesmos elementos, por CSS
 * injetado, e exige que a medição os acuse. Sem isto, este ficheiro
 * passava igual numa página sem texto nenhum — que é exactamente como
 * a auditoria passava nestes estados.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = 'file://' + path.resolve(__dirname, '..');
const CLIENTE = RAIZ + '/cliente';
const TOKEN = 'demo-mesa-4';
const PISO = 12;          // px; o mesmo piso da auditoria-responsiva
const LARGURA = 320;      // o ecrã mais apertado que suportamos

const falhas = [];
let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

/**
 * Mede a página como ela está agora.
 *
 * Só conta o texto que o elemento tem como seu (nós de texto filhos
 * directos): sem isso, o `<body>` seria acusado do conteúdo inteiro e
 * cada frase apareceria tantas vezes quantos os antepassados que tem.
 */
async function medir(p) {
  return p.evaluate(piso => {
    const maus = [];
    for (const el of document.querySelectorAll('*')) {
      if (!el.offsetParent && el.tagName !== 'BODY') continue;
      const cx = el.getBoundingClientRect();
      if (cx.width === 0 || cx.height === 0) continue;
      const proprio = [...el.childNodes]
        .filter(n => n.nodeType === 3 && n.textContent.trim())
        .map(n => n.textContent.trim()).join(' ');
      if (!proprio) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < piso) {
        maus.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} ` +
                  `${px}px "${proprio.slice(0, 40)}"`);
      }
    }
    return {
      maus,
      transbordo: document.documentElement.scrollWidth -
                  document.documentElement.clientWidth,
    };
  }, PISO);
}

async function estado(p, nome) {
  const r = await medir(p);
  check(`${nome} · nenhum texto abaixo de ${PISO}px`,
        r.maus.length === 0,
        r.maus.length ? `${r.maus.length}: ${r.maus.join(' | ')}` : 'nenhum');
  check(`${nome} · a página não transborda`,
        r.transbordo <= 0, `${Math.max(0, r.transbordo)}px`);
  return r;
}

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: LARGURA, height: 800 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => {
    if (!/tailwind/i.test(e.message)) {
      console.log('[pageerror]', e.message);
      falhas.push('pageerror: ' + e.message.slice(0, 70));
    }
  });

  console.log(`\nmesa.html a ${LARGURA}px, estado a estado\n`);

  /* Duas idas à página: a primeira só para poder limpar o
   * `localStorage` da origem, senão um carrinho de uma corrida
   * anterior mudava o estado inicial. */
  await p.goto(`${CLIENTE}/mesa.html?t=${TOKEN}&simular=1`);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(`${CLIENTE}/mesa.html?t=${TOKEN}&simular=1`);
  await p.waitForSelector('#produtosGrid article', { timeout: 15000 });
  await estado(p, '1. lista de produtos');

  const cartao = p.locator('#produtosGrid article', { hasText: 'Abatata Frita' });
  await cartao.locator('[data-action="mais"]').click();
  await p.waitForTimeout(400);
  await estado(p, '2. um item no carrinho');

  await cartao.locator('[data-action="abrir-nota"]').click();
  await p.waitForTimeout(300);
  await cartao.locator('textarea').fill('Sem cebola — alergia');
  await cartao.locator('textarea').blur();
  await p.waitForTimeout(400);
  await estado(p, '3. nota escrita e mostrada de volta');

  /* O resumo é um painel que abre dentro da própria página. */
  await p.locator('#resumoToggle').click();
  await p.waitForTimeout(600);
  check('o painel de resumo abriu mesmo',
        await p.locator('#resumoLista').isVisible());
  await estado(p, '4. resumo aberto com a nota');

  /* ── CONTROLO NEGATIVO ─────────────────────────────────────────────
   * Põe 11px de volta nos elementos que foram corrigidos e exige que a
   * medição os acuse. Se isto não acusar, as quatro passagens acima não
   * valem nada. */
  await p.addStyleTag({
    content: '#resumoCount, .linha-obs, [data-nota-lida], ' +
             '[data-action="abrir-nota"] { font-size: 11px !important; }',
  });
  await p.waitForTimeout(200);
  const neg = await medir(p);
  check('CONTROLO NEGATIVO — com 11px forçados, a medição acusa',
        neg.maus.length > 0,
        neg.maus.length ? `${neg.maus.length} apanhados` : 'NÃO APANHOU NADA');

  await browser.close();

  console.log(`\n${feitas - falhas.length}/${feitas} verificacoes passaram`);
  if (falhas.length) {
    console.log(`\n❌ ${falhas.length} falha(s):`);
    falhas.forEach(f => console.log(`   ${f}`));
  }
  process.exitCode = falhas.length ? 1 : 0;
})();

/* X-27: a linha que torna o total desta suite recalculável. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${falhas.length}`);
});
