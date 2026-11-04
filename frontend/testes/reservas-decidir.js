/**
 * Confirmar e recusar uma reserva pendente (PATCH /gestao/reservas/:codigo).
 *
 * O que tem de ficar provado:
 *   1. Só as reservas PENDENTES têm botões. Uma confirmada, concluída
 *      ou cancelada não tem nada a decidir, e mostrar-lhe botões era
 *      oferecer um 409 certo.
 *   2. Confirmar muda o estado e o resumo ("por confirmar") desce.
 *   3. Recusar pede uma segunda vez; "Voltar" desfaz; "Sim, recusar"
 *      recusa e a linha fica marcada como morta.
 *   4. A decisão sobrevive a recarregar a página.
 *   5. Decidir duas vezes a mesma reserva dá 409 (o colega do balcão
 *      chegou primeiro); estado inventado dá 400; código que não
 *      existe dá 404. Os mesmos três do servidor.
 *   6. O BALCÃO também decide, e a COZINHA nem vê a secção.
 *
 * Tudo com `?simular=1`, pela mesma razão dos outros testes.
 */
const { chromium } = require('playwright');
const path = require('path');
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const GESTAO = 'file://' + path.resolve(__dirname, '..', 'funcionarios');

const falhas = [];
let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

async function entrar(ctx, email) {
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', PASSWORD_SIMULACAO);
  await p.click('#btnEntrar');
  await p.waitForTimeout(1500);
  p._erros = erros;
  return p;
}

async function abrirPainel(p) {
  await p.goto(`${GESTAO}/dashboard.html?simular=1`);
  await p.waitForSelector('#corpoReservas tr', { timeout: 15000 });
}

const linha = (p, nome) => p.locator('#corpoReservas tr', { hasText: nome });

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  console.log('\nADMINISTRADOR');
  const admin = await entrar(ctx, 'admin@vemproabate.pt');
  await abrirPainel(admin);

  /* As fixas: Bruno e Diogo pendentes; Ana e Eduarda confirmadas;
     Catarina concluída; Filipe cancelada. */
  const pendentes = await admin.locator('#corpoReservas tr .res-acoes').count();
  check('só as 2 pendentes têm botões', pendentes === 2, `tinha ${pendentes}`);
  check('a Ana (confirmada) NÃO tem botões',
        (await linha(admin, 'Ana Loureiro').locator('.res-acoes').count()) === 0);
  check('a Catarina (concluída) NÃO tem botões',
        (await linha(admin, 'Catarina Pinho').locator('.res-acoes').count()) === 0);
  check('o Filipe (cancelada) NÃO tem botões',
        (await linha(admin, 'Filipe Abreu').locator('.res-acoes').count()) === 0);
  check('o Bruno tem Confirmar e Recusar',
        (await linha(admin, 'Bruno Esteves').locator('.btn-res-confirmar').count()) === 1
        && (await linha(admin, 'Bruno Esteves').locator('.btn-res-recusar').count()) === 1);

  const resumoAntes = (await admin.locator('#resumoReservasTexto').innerText());
  check('o resumo diz "2 por confirmar"', /2 por confirmar/.test(resumoAntes), resumoAntes);

  /* alvo de toque: 44px, como a F-54 exige da app de gestão */
  const alturaBtn = await linha(admin, 'Bruno Esteves').locator('.btn-res-confirmar')
    .evaluate(el => el.getBoundingClientRect().height);
  check('o botão tem pelo menos 44px de altura', alturaBtn >= 43.5, `${alturaBtn}px`);

  console.log('\nCONFIRMAR');
  await linha(admin, 'Bruno Esteves').locator('.btn-res-confirmar').click();
  await admin.waitForFunction(() => {
    const trs = [...document.querySelectorAll('#corpoReservas tr')];
    const t = trs.find(x => x.textContent.includes('Bruno Esteves'));
    return t && /Confirmada/.test(t.textContent);
  }, null, { timeout: 8000 });
  const estadoBruno = (await linha(admin, 'Bruno Esteves').locator('.etiqueta').innerText()).trim();
  check('o Bruno ficou Confirmada', estadoBruno === 'Confirmada', estadoBruno);
  check('o Bruno já não tem botões',
        (await linha(admin, 'Bruno Esteves').locator('.res-acoes').count()) === 0);
  const resumo1 = (await admin.locator('#resumoReservasTexto').innerText());
  check('o resumo desceu para "1 por confirmar"', /1 por confirmar/.test(resumo1), resumo1);

  console.log('\nRECUSAR (com segunda pergunta)');
  await linha(admin, 'Diogo Matias').locator('.btn-res-recusar').click();
  const pergunta = (await linha(admin, 'Diogo Matias').locator('.res-acoes').innerText());
  check('Recusar pergunta primeiro', /Recusar esta reserva\?/.test(pergunta), pergunta);
  const aindaPendente = (await linha(admin, 'Diogo Matias').locator('.etiqueta').innerText()).trim();
  check('e ainda não recusou nada', aindaPendente === 'Pendente', aindaPendente);

  await linha(admin, 'Diogo Matias').locator('.btn-res-voltar').click();
  check('"Voltar" devolve os dois botões',
        (await linha(admin, 'Diogo Matias').locator('.btn-res-confirmar').count()) === 1
        && (await linha(admin, 'Diogo Matias').locator('.btn-res-recusar').count()) === 1);

  await linha(admin, 'Diogo Matias').locator('.btn-res-recusar').click();
  await linha(admin, 'Diogo Matias').locator('.btn-res-recusar').click();   // "Sim, recusar"
  await admin.waitForFunction(() => {
    const trs = [...document.querySelectorAll('#corpoReservas tr')];
    const t = trs.find(x => x.textContent.includes('Diogo Matias'));
    return t && /Recusada/.test(t.textContent);
  }, null, { timeout: 8000 });
  const estadoDiogo = (await linha(admin, 'Diogo Matias').locator('.etiqueta').innerText()).trim();
  check('o Diogo ficou Recusada', estadoDiogo === 'Recusada', estadoDiogo);
  check('a linha recusada fica marcada como morta',
        (await admin.locator('#corpoReservas tr.res-morta', { hasText: 'Diogo Matias' }).count()) === 1);
  const resumo2 = (await admin.locator('#resumoReservasTexto').innerText());
  check('já não há "por confirmar" no resumo', !/por confirmar/.test(resumo2), resumo2);

  console.log('\nPERSISTÊNCIA');
  await abrirPainel(admin);
  check('depois de recarregar, o Bruno continua Confirmada',
        (await linha(admin, 'Bruno Esteves').locator('.etiqueta').innerText()).trim() === 'Confirmada');
  check('depois de recarregar, o Diogo continua Recusada',
        (await linha(admin, 'Diogo Matias').locator('.etiqueta').innerText()).trim() === 'Recusada');

  console.log('\nOS TRÊS ERROS DO CONTRATO');
  const tentar = (codigo, corpo) => admin.evaluate(async ([c, b]) => {
    try { await chamarAPI(`gestao/reservas/${c}`, { method: 'PATCH', body: b }); return { ok: true }; }
    catch (e) { return { ok: false, status: e.status, msg: e.message }; }
  }, [codigo, corpo]);

  const r409 = await tentar('RSV-DEMB3', { estado: 'recusada' });
  check('decidir uma já confirmada dá 409', !r409.ok && r409.status === 409, JSON.stringify(r409));
  check('o 409 diz em que estado está', /confirmada/.test(r409.msg || ''), r409.msg);
  const r400 = await tentar('RSV-DEMD5', { estado: 'concluida' });
  check('um estado fora de confirmada/recusada dá 400', !r400.ok && r400.status === 400, JSON.stringify(r400));
  const r404 = await tentar('RSV-NAOEXISTE', { estado: 'confirmada' });
  check('um código que não existe dá 404', !r404.ok && r404.status === 404, JSON.stringify(r404));

  check('sem erros de JavaScript na página', admin._erros.length === 0, admin._erros.join(' | '));

  console.log('\nBALCÃO');
  const balcao = await entrar(ctx, 'balcao@vemproabate.pt');
  await abrirPainel(balcao);
  /* o armazém é do browser, e o `entrar` limpou-o: voltam as fixas */
  check('o balcão vê os botões nas pendentes',
        (await balcao.locator('#corpoReservas tr .res-acoes').count()) === 2);
  await linha(balcao, 'Bruno Esteves').locator('.btn-res-confirmar').click();
  await balcao.waitForFunction(() => {
    const t = [...document.querySelectorAll('#corpoReservas tr')].find(x => x.textContent.includes('Bruno Esteves'));
    return t && /Confirmada/.test(t.textContent);
  }, null, { timeout: 8000 });
  check('o balcão consegue confirmar', true);

  console.log('\nCOZINHA');
  const cozinha = await entrar(ctx, 'cozinha@vemproabate.pt');
  await cozinha.goto(`${GESTAO}/dashboard.html?simular=1`);
  await cozinha.waitForTimeout(1500);
  check('a cozinha não tem a secção das reservas',
        (await cozinha.locator('#secaoReservas').count()) === 0);
  check('nem botões', (await cozinha.locator('.res-acoes').count()) === 0);

  await browser.close();
  console.log(`\n${feitas} verificações, ${falhas.length} falhas.`);
  if (falhas.length) { console.log('FALHARAM:\n - ' + falhas.join('\n - ')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
