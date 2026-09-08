/**
 * F-62 — Stock visível na cozinha, e aviso para o gerente.
 *
 * O que tem de ficar provado:
 *   1. A cozinha vê o stock dos produtos com existência limitada, e os
 *      que estão em baixo (quantidade_atual <= quantidade_minima) saem
 *      destacados — os produtos sem controlo de stock nem aparecem.
 *   2. O gerente (administrador) vê um contador de stock baixo na barra
 *      lateral, e esse contador aparece em QUALQUER página da app, não
 *      só no ecrã de stock.
 *   3. A cozinha vê o item "Stock" mas NÃO vê o contador.
 *
 * ── ALTERADO A 08/09, COM A F-52 ────────────────────────────────────
 * Este ficheiro afirmava, no ponto 3, que a cozinha não tinha sequer o
 * item "Stock" na barra lateral. Era verdade e era a decisão certa em
 * 04/09, por uma razão que já não se aplica: nessa altura o item era um
 * botão morto, com a etiqueta "F-52", e não fazia sentido mostrar à
 * cozinha um link que não abria nada.
 *
 * O ecrã existe desde hoje, e quem parte uma garrafa ou deita fora um
 * lombo fora de validade é quem está na cozinha — obrigar a passar pelo
 * gerente para registar uma quebra é a maneira mais certa de a quebra
 * nunca ser registada. Por isso a cozinha passou a ter o item.
 *
 * O que NÃO mudou, e continua verificado aqui, é o contador: esse é só
 * do gerente. A cozinha já vê o stock em detalhe no ecrã dela, e um
 * número vermelho a mais num monitor de cozinha em hora de ponta é
 * ruído, não informação.
 */
/* Todas as páginas de gestão são abertas com `?simular=1`.
   NÃO é decoração: a partir de 04/09 o `auth/login` fala com o servidor
   a sério (B-19), e sem este parâmetro o teste tentava chegar ao Render
   — falhava sem rede, e passaria a depender de uma API de pé para dizer
   se o front-end está bem. Um teste que precisa da nuvem para correr
   deixa de se poder correr antes de um commit. */
const { chromium } = require('playwright');
const path = require('path');

const GESTAO = 'file://' + path.resolve(__dirname, '..', 'funcionarios');

const falhas = [];
const check = (n, c, e = '') => { console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

async function login(ctx, email) {
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('[pageerror]', e.message); falhas.push('pageerror: ' + e.message.slice(0, 60)); });
  // Duas contas no mesmo contexto de browser partilham localStorage (mesma
  // origem file://): limpa a sessão anterior antes de entrar com a nova,
  // senão o login.html vê sessão válida e manda logo para o ecrã de outrem.
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => localStorage.removeItem('vpa_sessao_funcionario'));
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', 'abate2026');
  await p.click('#btnEntrar');
  await p.waitForTimeout(1200);
  return p;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });

  /* ── 1. Cozinha: painel de stock ─────────────────────────────────── */
  const coz = await login(ctx, 'cozinha@vemproabate.pt');
  await coz.goto(`${GESTAO}/cozinha.html?simular=1`);
  await coz.waitForSelector('#painelStock:not(.hidden)', { timeout: 8000 });

  const itensStock = await coz.$$eval('.stock-item', els => els.map(e => e.textContent.trim()));
  console.log('   itens no painel:', itensStock.join(' | '), '\n');

  check('O painel de stock aparece (não está escondido)',
        !(await coz.locator('#painelStock').evaluate(e => e.classList.contains('hidden'))));
  check('Mostra o Borrego Abatido (stock baixo: 3/5)',
        itensStock.some(t => /Borrego Abatido/.test(t) && /3/.test(t)));
  check('Mostra a Tábua Rústica do Abate (stock baixo: 2/4)',
        itensStock.some(t => /Tábua Rústica/.test(t) && /2/.test(t)));
  check('Mostra a Picanha na Brasa Negra, mas SEM destaque (12/6, acima do mínimo)',
        itensStock.some(t => /Picanha na Brasa Negra/.test(t)));
  check('Produto sem controlo de stock (ex.: Coca-Cola) não aparece no painel',
        !itensStock.some(t => /Coca-Cola/.test(t)));

  const baixos = await coz.locator('.stock-item.baixo').count();
  check('Exatamente 2 itens marcados como stock baixo', baixos === 2, `contou ${baixos}`);

  const okCount = await coz.locator('.stock-item:not(.baixo)').count();
  check('Os outros dois produtos com stock aparecem sem destaque', okCount === 2, `contou ${okCount}`);

  /* ── 2. Gerente: aviso na barra lateral, em qualquer página ──────── */
  const admin = await login(ctx, 'admin@vemproabate.pt');
  await admin.goto(`${GESTAO}/dashboard.html?simular=1`);
  await admin.waitForSelector('[data-nav-id="stock"]', { timeout: 8000 });
  await admin.waitForTimeout(700); // avisarStockBaixo() é assíncrono

  const avisoDashboard = await admin.locator('[data-nav-id="stock"] .nav-aviso').textContent().catch(() => null);
  check('O gerente vê o aviso de stock baixo já no dashboard (não é preciso abrir o ecrã de stock)',
        avisoDashboard === '2', `viu: ${avisoDashboard}`);

  // A prova a sério do F-62: o aviso segue o gerente, não fica preso a um ecrã.
  await admin.goto(`${GESTAO}/balcao.html?simular=1`);
  await admin.waitForSelector('[data-nav-id="stock"]', { timeout: 8000 });
  await admin.waitForTimeout(700);
  const avisoBalcao = await admin.locator('[data-nav-id="stock"] .nav-aviso').textContent().catch(() => null);
  check('O mesmo aviso aparece também no ecrã do balcão',
        avisoBalcao === '2', `viu: ${avisoBalcao}`);

  const tooltip = await admin.locator('[data-nav-id="stock"] .nav-aviso').getAttribute('title');
  check('O aviso diz QUAIS produtos, não só um número',
        /Borrego Abatido/.test(tooltip || '') && /Tábua Rústica/.test(tooltip || ''), tooltip);

  /* ── 3. Cozinha: tem o item "Stock" (F-52), mas não tem o contador ── */
  await coz.waitForSelector('.sidebar-nav', { timeout: 8000 });
  await coz.waitForTimeout(700);   // o mesmo tempo que o avisarStockBaixo levaria

  const stockNaCozinha = await coz.locator('[data-nav-id="stock"]').count();
  check('A cozinha tem o item "Stock" na barra lateral (desde a F-52)',
        stockNaCozinha === 1, `contou ${stockNaCozinha}`);

  const linkStockCozinha = await coz.locator('[data-nav-id="stock"] a').getAttribute('href').catch(() => null);
  check('E é um link que abre mesmo, não o botão morto que era antes',
        linkStockCozinha === 'stock.html', `href: ${linkStockCozinha}`);

  const avisoCozinha = await coz.locator('[data-nav-id="stock"] .nav-aviso').count();
  check('Mas o CONTADOR continua a ser só do gerente — a cozinha já vê o stock no ecrã dela',
        avisoCozinha === 0, `contou ${avisoCozinha}`);

  await coz.screenshot({ path: '/tmp/site10-stock-cozinha.png' }).catch(() => {});
  await admin.screenshot({ path: '/tmp/site10-stock-aviso-gerente.png' }).catch(() => {});

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('F-62 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();
