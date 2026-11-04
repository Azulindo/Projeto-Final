/**
 * Remover um item enviado por engano, enquanto a cozinha ainda não o aceitou.
 *
 * O que tem de ficar provado:
 *   1. Cada linha "enviado" tem o botão Remover; "Remover" pergunta
 *      primeiro e "Não" desfaz — nada é apagado à primeira.
 *   2. "Sim, remover" tira a linha da conta, o total desce e a ronda
 *      anulada deixa de aparecer no ecrã da cozinha.
 *   3. Depois de a cozinha aceitar, a linha perde o botão — e se o pedido
 *      ainda assim chegar ao servidor (alguém com a página velha aberta),
 *      dá 409 e o item fica.
 *   4. Com a conta pedida já não se remove nada (409).
 *   5. Um item que não existe dá 404.
 *
 * Tudo com `?simular=1`, como os outros.
 */
const { chromium } = require('playwright');
const path = require('path');
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const CLIENTE = 'file://' + path.resolve(__dirname, '..', 'cliente');
const GESTAO = 'file://' + path.resolve(__dirname, '..', 'funcionarios');

const falhas = [];
let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const tel = await ctx.newPage();
  const erros = [];
  tel.on('pageerror', e => { if (!/tailwind/i.test(e.message)) erros.push(e.message); });
  await tel.goto(`${CLIENTE}/mesa.html?simular=1&mesa=demo-mesa-8`);
  await tel.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await tel.goto(`${CLIENTE}/mesa.html?simular=1&mesa=demo-mesa-8`);
  await tel.waitForSelector('#produtosGrid article', { timeout: 8000 });

  async function pedir(categoria) {
    await tel.click(`[data-categoria="${categoria}"]`);
    await tel.waitForTimeout(400);
    await tel.locator('#produtosGrid article [data-action="mais"]').first().click();
    await tel.click('#btnPedirItens');
    await tel.waitForTimeout(1600);
  }
  await pedir('Bebidas');
  await pedir('Pratos Principais');

  const abrirResumo = async () => {
    const aberto = await tel.locator('#resumoToggle').getAttribute('aria-expanded');
    if (aberto !== 'true') { await tel.click('#resumoToggle'); await tel.waitForTimeout(400); }
  };
  await abrirResumo();

  console.log('\nBOTÃO REMOVER');
  check('as duas linhas enviadas têm o botão Remover',
        (await tel.locator('#resumoLista .linha-remover').count()) === 2);
  const totalAntes = (await tel.locator('#resumoSubtotal').innerText()).trim();

  await tel.locator('#resumoLista .linha-remover .btn-remover').first().click();
  const pergunta = (await tel.locator('#resumoLista .linha-remover').first().innerText());
  check('Remover pergunta primeiro', /Remover este pedido\?/.test(pergunta), pergunta);
  check('e ainda não apagou nada', (await tel.locator('#resumoLista .linha-remover').count()) === 2);

  await tel.locator('#resumoLista .linha-remover .btn-remover-nao').first().click();
  check('"Não" devolve o botão Remover',
        (await tel.locator('#resumoLista .linha-remover .btn-remover-sim').first().innerText()).trim() === 'Remover');
  const alturaBtn = await tel.locator('#resumoLista .btn-remover').first()
    .evaluate(el => el.getBoundingClientRect().height);
  check('o botão tem pelo menos 44px de altura', alturaBtn >= 43.5, `${alturaBtn}px`);

  console.log('\nREMOVER');
  await tel.locator('#resumoLista .linha-remover .btn-remover').first().click();
  await tel.locator('#resumoLista .linha-remover .btn-remover-sim').first().click();   // "Sim, remover"
  await tel.waitForFunction(() => document.querySelectorAll('#resumoLista .linha-remover').length === 1, null, { timeout: 8000 });
  check('a linha saiu da conta', (await tel.locator('#resumoLista .linha-remover').count()) === 1);
  const totalDepois = (await tel.locator('#resumoSubtotal').innerText()).trim();
  check('o total desceu', totalDepois !== totalAntes, `${totalAntes} → ${totalDepois}`);

  /* a cozinha vê só a ronda que ficou */
  const coz = await ctx.newPage();
  await coz.goto(`${GESTAO}/login.html?simular=1`);
  await coz.fill('#email', 'cozinha@vemproabate.pt');
  await coz.fill('#password', PASSWORD_SIMULACAO);
  await coz.click('#btnEntrar');
  await coz.waitForSelector('.cartao-ronda', { timeout: 8000 });
  check('a cozinha só tem 1 ronda (a anulada desapareceu)', (await coz.locator('.cartao-ronda').count()) === 1);

  console.log('\nDEPOIS DE A COZINHA ACEITAR');
  await coz.locator('.btn-accao').first().click();     // recebido -> aceite
  await coz.waitForTimeout(900);
  await tel.reload();
  await tel.waitForSelector('#produtosGrid article', { timeout: 8000 });
  await abrirResumo();
  check('a linha aceite já não tem o botão Remover',
        (await tel.locator('#resumoLista .linha-remover').count()) === 0);

  const TOKEN = 'demo-mesa-8';
  const lerItens = () => tel.evaluate(async (t) => (await chamarAPI(`mesas/${t}/sessao`)).sessao.itens, TOKEN);
  const idRestante = (await lerItens())[0].id;
  const tentar = id => tel.evaluate(async ([t, i]) => {
    try { await chamarAPI(`mesas/${t}/itens/${i}`, { method: 'DELETE' }); return { ok: true }; }
    catch (e) { return { ok: false, status: e.status, msg: e.message }; }
  }, [TOKEN, id]);

  const r409 = await tentar(idRestante);
  check('apagar um item já aceite dá 409', !r409.ok && r409.status === 409, JSON.stringify(r409));
  check('e o item continua lá',
        (await lerItens()).length === 1);
  const r404 = await tentar(999999999);
  check('um item que não existe dá 404', !r404.ok && r404.status === 404, JSON.stringify(r404));

  console.log('\nCONTA PEDIDA');
  await tel.evaluate(async (t) => { await chamarAPI(`mesas/${t}/pedir-conta`, { method: 'POST' }); }, TOKEN);
  const rConta = await tentar(idRestante);
  check('com a conta pedida dá 409', !rConta.ok && rConta.status === 409, JSON.stringify(rConta));

  check('sem erros de JavaScript na página', erros.length === 0, erros.join(' | '));

  await browser.close();
  console.log(`\n${feitas} verificações, ${falhas.length} falhas.`);
  if (falhas.length) { console.log('FALHARAM:\n - ' + falhas.join('\n - ')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
