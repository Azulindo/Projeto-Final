/**
 * Chamar empregado: do telemóvel do cliente ao cartão da mesa no balcão.
 *
 * Até 04/11 isto só existia na simulação: com o servidor a sério o botão
 * dizia "QR Code inválido", porque o caminho nunca tinha sido escrito.
 *
 * O que tem de ficar provado:
 *   1. O cliente carrega em "Chamar empregado" e recebe confirmação.
 *   2. O balcão mostra a etiqueta "Chamou empregado" nessa mesa, e só nela,
 *      e a mesa que chamou passa à frente de outra aberta há mais tempo.
 *   3. Chamar de novo não desloca a hora da primeira chamada.
 *   4. Abrir a mesa no balcão conta como atendê-la: a etiqueta desaparece
 *      e fica desaparecida ao atualizar.
 *   5. Com a conta já pedida o botão continua a funcionar.
 *
 * Tudo com `?simular=1`, como os outros. O lado do servidor (401, 403,
 * 404, 409, a primeira hora que se mantém) foi provado à parte, contra
 * uma base simulada.
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
  const erros = [];

  const tel = await ctx.newPage();
  tel.on('pageerror', e => { if (!/tailwind/i.test(e.message)) erros.push(e.message); });
  await tel.goto(`${CLIENTE}/mesa.html?simular=1&mesa=demo-mesa-7`);
  await tel.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  /* A mesa 7 abre primeiro (fica mais antiga); a 6 abre depois e é a que chama. */
  await tel.goto(`${CLIENTE}/mesa.html?simular=1&mesa=demo-mesa-7`);
  await tel.waitForSelector('#produtosGrid article', { timeout: 8000 });
  await tel.waitForTimeout(300);
  await tel.goto(`${CLIENTE}/mesa.html?simular=1&mesa=demo-mesa-6`);
  await tel.waitForSelector('#produtosGrid article', { timeout: 8000 });

  const bal = await ctx.newPage();
  bal.on('pageerror', e => { erros.push('balcao: ' + e.message); });
  await bal.goto(`${GESTAO}/login.html?simular=1`);
  await bal.fill('#email', 'balcao@vemproabate.pt');
  await bal.fill('#password', PASSWORD_SIMULACAO);
  await bal.click('#btnEntrar');
  await bal.waitForTimeout(1200);
  await bal.goto(`${GESTAO}/balcao.html?simular=1`);
  await bal.waitForSelector('.cartao-mesa', { timeout: 8000 });

  console.log('\nANTES DE CHAMAR');
  check('o balcão vê as duas mesas abertas', (await bal.locator('.cartao-mesa').count()) === 2);
  check('nenhuma tem a etiqueta "Chamou empregado"', (await bal.locator('.etiqueta-chamada').count()) === 0);
  check('a mais antiga (mesa 07) vem primeiro',
        /Mesa 07/.test(await bal.locator('.cartao-mesa').first().innerText()));

  console.log('\nO CLIENTE CHAMA');
  const chamar = async () => {
    await tel.click('#btnEmpregado');
    await tel.waitForTimeout(400);
    await tel.click('#btnChamarEmpregado');
    await tel.waitForTimeout(700);
  };
  await chamar();
  const toast = (await tel.locator('#toast').innerText()).trim();
  check('o cliente recebe a confirmação', /avisado/i.test(toast), toast);

  const hora1 = await tel.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('vpa_sessoes_mesa_demo') || '{}')['demo-mesa-6'];
    return s && s.chamouEmpregadoEm;
  });
  check('fica guardada a hora da chamada', !!hora1, String(hora1));
  await tel.waitForTimeout(1100);
  await chamar();
  const hora2 = await tel.evaluate(() => JSON.parse(localStorage.getItem('vpa_sessoes_mesa_demo'))['demo-mesa-6'].chamouEmpregadoEm);
  check('chamar outra vez não desloca a hora da primeira', hora1 === hora2, `${hora1} / ${hora2}`);

  console.log('\nO BALCÃO VÊ');
  await bal.reload();
  await bal.waitForSelector('.cartao-mesa', { timeout: 8000 });
  check('aparece uma só etiqueta "Chamou empregado"', (await bal.locator('.etiqueta-chamada').count()) === 1);
  const primeiro = await bal.locator('.cartao-mesa').first().innerText();
  check('e é a da mesa 06, que passou à frente da 07', /Mesa 06/.test(primeiro) && /Chamou empregado/.test(primeiro), primeiro.replace(/\s+/g, ' '));
  check('o cartão fica destacado', (await bal.locator('.cartao-mesa.mesa-chamou').count()) === 1);

  await bal.setViewportSize({ width: 320, height: 700 });
  await bal.waitForTimeout(300);
  const transbordo = await bal.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const etiquetaFora = await bal.evaluate(() => {
    const c = document.querySelector('.cartao-mesa.mesa-chamou').getBoundingClientRect();
    const e = document.querySelector('.etiqueta-chamada').getBoundingClientRect();
    return e.right - c.right;
  });
  check('a 320px a etiqueta cabe no cartão e a página não transborda', transbordo <= 0 && etiquetaFora <= 0.5, `página +${transbordo}px · etiqueta +${etiquetaFora}px`);
  await bal.setViewportSize({ width: 390, height: 844 });

  console.log('\nO BALCÃO ATENDE');
  await bal.locator('.cartao-mesa.mesa-chamou').click();
  await bal.waitForFunction(() => document.querySelectorAll('.etiqueta-chamada').length === 0, null, { timeout: 6000 });
  check('abrir a mesa tira a etiqueta', (await bal.locator('.etiqueta-chamada').count()) === 0);
  await bal.reload();
  await bal.waitForSelector('.cartao-mesa', { timeout: 8000 });
  check('e ao atualizar continua tirada', (await bal.locator('.etiqueta-chamada').count()) === 0);
  check('a ordem volta à normal (mesa 07 primeiro)', /Mesa 07/.test(await bal.locator('.cartao-mesa').first().innerText()));

  console.log('\nCOM A CONTA PEDIDA');
  await tel.evaluate(async () => { await chamarAPI('mesas/demo-mesa-6/pedir-conta', { method: 'POST' }); });
  await chamar();
  const toast2 = (await tel.locator('#toast').innerText()).trim();
  check('o cliente ainda consegue chamar', /avisado/i.test(toast2), toast2);
  await bal.reload();
  await bal.waitForSelector('.cartao-mesa', { timeout: 8000 });
  const c6 = await bal.locator('.cartao-mesa', { hasText: 'Mesa 06' }).innerText();
  check('o balcão vê "Pediu a conta" e "Chamou empregado" juntos', /Pediu a conta/.test(c6) && /Chamou empregado/.test(c6), c6.replace(/\s+/g, ' '));

  check('sem erros de JavaScript', erros.length === 0, erros.join(' | '));

  await browser.close();
  console.log(`\n${feitas} verificações, ${falhas.length} falhas.`);
  if (falhas.length) { console.log('FALHARAM:\n - ' + falhas.join('\n - ')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });

process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
