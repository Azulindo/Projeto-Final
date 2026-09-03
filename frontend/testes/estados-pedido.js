/**
 * Seis estados em minúsculas (docs/API.md 3.10, acordado com o João a 02/09).
 * O que tem de ficar provado:
 *   1. Uma ronda percorre recebido → confirmado → em_preparacao → pronto → entregue
 *   2. As quatro colunas da cozinha enchem e esvaziam na ordem certa
 *   3. Anular pede confirmação e só ao segundo toque é que anula
 *   4. Uma ronda anulada NÃO é cobrada ao cliente e ele é avisado
 *   5. O balcão continua a mostrar os estados traduzidos
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// As capturas ficam fora do repositório (ver .gitignore).
fs.mkdirSync(path.join(__dirname, '_capturas'), { recursive: true });

const CLIENTE = 'file://' + path.resolve(__dirname, '../cliente');
const GESTAO  = 'file://' + path.resolve(__dirname, '../funcionarios');

const falhas = [];
const check = (n, c, e = '') => { console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

const naColuna = (p, estado) => p.locator(`[data-lista="${estado}"] .cartao-ronda`);
const contaDe  = (p, estado) => p.textContent(`[data-conta="${estado}"]`);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 980 } });

  /* ── 1. Cliente envia duas rondas ───────────────────────────────── */
  const tel = await ctx.newPage();
  tel.on('pageerror', e => { if (!/tailwind/i.test(e.message)) { console.log('[pageerror mesa]', e.message); falhas.push('pageerror mesa'); } });
  await tel.goto(`${CLIENTE}/mesa.html?simular=1&mesa=demo-mesa-6`);
  await tel.waitForSelector('#produtosGrid article', { timeout: 8000 });

  await tel.click('[data-categoria="Bebidas"]');
  await tel.waitForTimeout(400);
  const bebida = (await tel.locator('#produtosGrid article h3').first().textContent()).trim();
  await tel.locator('#produtosGrid article [data-action="mais"]').first().click();
  await tel.click('#btnPedirItens');
  await tel.waitForTimeout(1600);

  await tel.click('[data-categoria="Pratos Principais"]');
  await tel.waitForTimeout(400);
  const prato = (await tel.locator('#produtosGrid article h3').first().textContent()).trim();
  await tel.locator('#produtosGrid article [data-action="mais"]').first().click();
  await tel.click('#btnPedirItens');
  await tel.waitForTimeout(1600);
  console.log(`   (ronda 1: 1× ${bebida} · ronda 2: 1× ${prato})\n`);

  /* ── 2. Cozinha: quatro colunas ─────────────────────────────────── */
  const coz = await ctx.newPage();
  coz.on('pageerror', e => { console.log('[pageerror cozinha]', e.message); falhas.push('pageerror cozinha'); });
  await coz.goto(`${GESTAO}/login.html`);
  await coz.fill('#email', 'cozinha@vemproabate.pt');
  await coz.fill('#password', 'abate2026');
  await coz.click('#btnEntrar');
  await coz.waitForTimeout(1200);
  await coz.waitForSelector('.cartao-ronda', { timeout: 8000 });

  const titulos = await coz.$$eval('.coluna-topo h2', e => e.map(x => x.textContent.trim()));
  check('Quatro colunas, pela ordem do trabalho',
        titulos.join(' → ') === 'Recebido → Aceite → Em preparação → Pronto', titulos.join(' → '));
  check('As duas rondas entram em "Recebido"', await naColuna(coz, 'recebido').count() === 2,
        `recebido=${await contaDe(coz, 'recebido')}`);

  const numero = (await coz.locator('.ronda-numero').first().textContent()).trim();
  check('Número do pedido no formato PED-XXXXX', /^PED-[A-Z0-9]{5}$/.test(numero), numero);

  /* ── 3. Uma ronda percorre os quatro estados ────────────────────── */
  const passos = [
    ['recebido',      'confirmado'],
    ['confirmado',    'em_preparacao'],
    ['em_preparacao', 'pronto'],
  ];
  for (const [origem, destino] of passos) {
    await naColuna(coz, origem).first().locator('.btn-accao').click();
    await coz.waitForTimeout(900);
    check(`${origem} → ${destino}`,
          await naColuna(coz, destino).count() === 1 && (await contaDe(coz, destino)) === '1',
          `${destino}=${await contaDe(coz, destino)}`);
  }
  check('A outra ronda não se mexeu', await naColuna(coz, 'recebido').count() === 1);
  check('Sem botão de anular quando já está pronto',
        await naColuna(coz, 'pronto').first().locator('.btn-cancelar').count() === 0);

  await coz.screenshot({ path: path.join(__dirname, '_capturas', 'screenshot-cozinha-4colunas.png') });

  await naColuna(coz, 'pronto').first().locator('.btn-accao').click();
  await coz.waitForTimeout(900);
  check('Entregue sai do ecrã da cozinha',
        await coz.locator('.cartao-ronda').count() === 1 && (await contaDe(coz, 'pronto')) === '0');

  /* ── 4. Anular: dois toques ─────────────────────────────────────── */
  const cancelar = naColuna(coz, 'recebido').first().locator('.btn-cancelar');
  check('Botão de anular existe antes de estar pronto', await cancelar.count() === 1);

  await cancelar.click();
  await coz.waitForTimeout(400);
  const textoConfirmar = (await naColuna(coz, 'recebido').first().locator('.btn-cancelar').textContent()).trim();
  check('Primeiro toque pede confirmação, não anula',
        textoConfirmar === 'Confirmar?' && await naColuna(coz, 'recebido').count() === 1, textoConfirmar);

  await naColuna(coz, 'recebido').first().locator('.btn-cancelar').click();
  await coz.waitForTimeout(900);
  check('Segundo toque anula e a ronda sai do ecrã',
        await coz.locator('.cartao-ronda').count() === 0,
        `restam ${await coz.locator('.cartao-ronda').count()}`);

  /* ── 5. Conta do cliente: o anulado não é cobrado ───────────────── */
  await tel.reload();
  await tel.waitForSelector('#produtosGrid article', { timeout: 8000 });
  await tel.click('#resumoToggle');
  await tel.waitForTimeout(600);

  const lista = await tel.innerText('#resumoLista');
  check('O item entregue continua na conta', lista.includes(bebida), lista.replace(/\n/g, ' | '));
  check('O cliente vê QUAL o prato que foi anulado', lista.includes(prato), lista.replace(/\n/g, ' | '));
  check('A linha anulada não tem preço nenhum para somar por engano',
        (await tel.innerText('[data-anulado="sim"]')).includes('não cobrado') &&
        !/€/.test(await tel.innerText('[data-anulado="sim"]')),
        await tel.innerText('[data-anulado="sim"]'));
  check('E é explicado porquê',
        await tel.locator('#resumoAnulados').count() === 1,
        (await tel.locator('#resumoAnulados').count()) ? await tel.innerText('#resumoAnulados') : 'sem nota');
  check('Estado traduzido para o cliente (não "entregue" cru)',
        /servido/i.test(lista), lista.replace(/\n/g, ' | '));

  // O que interessa mesmo: o número do ecrã é o número do servidor.
  const subtotal = (await tel.textContent('#resumoSubtotal')).trim();
  const totalServidor = await tel.evaluate(async () => {
    const p = new URLSearchParams(location.search).get('mesa');
    const r = await chamarAPI(`mesas/${encodeURIComponent(p)}/sessao`);
    return Number(r.sessao.total);
  });
  check('O total do cliente é o total do servidor, não uma soma própria',
        subtotal === totalServidor.toFixed(2).replace('.', ',') + ' €',
        `ecrã=${subtotal} · servidor=${totalServidor.toFixed(2)}`);
  check('O servidor também não conta o anulado',
        totalServidor > 0 && totalServidor < 10,
        `total=${totalServidor} (só a bebida; com o prato passaria dos 10 €)`);

  /* ── 6. Balcão: estados traduzidos ──────────────────────────────── */
  const bal = await ctx.newPage();
  bal.on('pageerror', e => { console.log('[pageerror balcao]', e.message); falhas.push('pageerror balcao'); });
  await bal.goto(`${GESTAO}/login.html`);
  await bal.evaluate(() => localStorage.removeItem('vpa_sessao_funcionario'));
  await bal.goto(`${GESTAO}/login.html`);
  await bal.fill('#email', 'balcao@vemproabate.pt');
  await bal.fill('#password', 'abate2026');
  await bal.click('#btnEntrar');
  await bal.waitForTimeout(1200);
  await bal.goto(`${GESTAO}/balcao.html`);
  await bal.waitForSelector('.cartao-mesa', { timeout: 8000 });
  const cartaoItens = await bal.innerText('.mesa-itens');
  check('O cartão da mesa conta só os itens cobrados', /^1 item$/.test(cartaoItens.trim()), cartaoItens);

  await bal.locator('.cartao-mesa').first().click();
  await bal.waitForSelector('.conta-linha', { timeout: 6000 });

  const estados = await bal.$$eval('.conta-estado', e => e.map(x => x.textContent.trim()));
  check('Balcão traduz os estados (nada de em_preparacao cru)',
        estados.length > 0 && estados.every(t => !/_/.test(t)), estados.join(' | '));
  check('Uma etiqueta de estado por linha COBRADA (a anulada não repete)',
        estados.length === 1 && /entregue/i.test(estados[0]), estados.join(' | '));

  const classes = await bal.$$eval('.conta-estado', e => e.map(x => x.className));
  check('Classe CSS do estado corresponde ao que existe no balcao.css',
        classes.every(c => /estado-(recebido|confirmado|em_preparacao|pronto|entregue|cancelado)/.test(c)),
        classes.join(' | '));

  // O erro que isto apanha: um empregado a somar as linhas do ecrã e a
  // pedir ao cliente mais do que o total diz.
  // innerText devolve o texto como é PINTADO, e o CSS põe-no em
  // maiúsculas — daí o /i.
  const linhaAnulada = await bal.innerText('.conta-linha-anulada');
  check('Balcão mostra a ronda anulada sem preço',
        /não cobrado/i.test(linhaAnulada) && !/€/.test(linhaAnulada),
        linhaAnulada.replace(/\n/g, ' · '));

  const precos = await bal.$$eval('.conta-preco:not(.conta-preco-anulado)',
        e => e.map(x => Number(x.textContent.replace('€', '').replace(',', '.').trim())));
  const totalPainel = Number((await bal.textContent('#painelTotal')).replace('€', '').replace(',', '.').trim());
  const somaLinhas = precos.reduce((a, b) => a + b, 0);
  check('As linhas visíveis somam exatamente o total do painel',
        Math.abs(somaLinhas - totalPainel) < 0.005,
        `linhas=${somaLinhas.toFixed(2)} · total=${totalPainel.toFixed(2)}`);

  await bal.screenshot({ path: path.join(__dirname, '_capturas', 'screenshot-balcao-estados.png') });

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('SEIS ESTADOS VERIFICADOS ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();
