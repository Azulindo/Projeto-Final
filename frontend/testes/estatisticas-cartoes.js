/**
 * F-55 — Cartões de métricas das Estatísticas.
 *
 * O que tem de ficar provado:
 *   1. Só o administrador entra. A cozinha e o balcão são barrados pelo
 *      ecrã E pelo servidor — faturação num monitor de cozinha que fica
 *      ligado o turno inteiro é informação a mais no sítio errado.
 *   2. Os cartões enchem-se com os números que o endpoint devolve.
 *   3. Os números de "hoje" MEXEM quando se faz um pedido à mesa. É esta
 *      a diferença entre um painel de estatísticas e um cartaz — e é o
 *      que se vai fazer à frente do júri.
 *   4. Um dia sem pedidos diz que não houve pedidos, em vez de mostrar
 *      quatro zeros que parecem uma avaria.
 *   5. A comparação com ontem não inventa percentagens impossíveis.
 *   6. O ecrã diz em voz alta que parte dos números é de exemplo.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ    = 'file://' + path.resolve(__dirname, '..');
const GESTAO  = RAIZ + '/funcionarios';
const CLIENTE = RAIZ + '/cliente';

const falhas = [];
const check = (n, c, e = '') => { console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

async function login(ctx, email) {
  const p = await ctx.newPage();
  p.on('pageerror', e => { if (!/tailwind/i.test(e.message)) { console.log('[pageerror]', e.message); falhas.push('pageerror: ' + e.message.slice(0, 60)); } });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => { try { localStorage.removeItem('vpa_sessao_funcionario'); } catch (e) {} });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', 'abate2026');
  await p.click('#btnEntrar');
  await p.waitForTimeout(1200);
  return p;
}

const num = t => Number(String(t || '').replace(/[^\d,.-]/g, '').replace(',', '.'));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });

  /* Estado limpo: sem sessões de mesa, o dia começa a zero. */
  const limpar = await ctx.newPage();
  await limpar.goto(`${GESTAO}/login.html?simular=1`);
  await limpar.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await limpar.close();

  const admin = await login(ctx, 'admin@vemproabate.pt');
  await admin.goto(`${GESTAO}/estatisticas.html?simular=1`);
  await admin.waitForSelector('#conteudo:not([hidden])', { timeout: 8000 });

  /* ── 4. Dia sem pedidos ─────────────────────────────────────────── */
  check('Sem pedidos, os cartões de hoje mostram zero',
        (await admin.locator('#hojePedidos').textContent()).trim() === '0');
  check('...e o ecrã explica que não houve pedidos, em vez de deixar quatro zeros a parecer avaria',
        /não houve pedidos/i.test(await admin.locator('#notaHoje').textContent() || ''));

  /* ── 5. Comparação sem inventar ─────────────────────────────────── */
  const comp = (await admin.locator('#hojeFaturacaoComp').textContent() || '').trim();
  check('A comparação com ontem não mostra uma percentagem impossível a partir de zero',
        !/Infinity|NaN|∞/.test(comp) && comp.length > 0, comp);

  /* ── 6. Honestidade sobre a origem dos números ──────────────────── */
  const nota = await admin.locator('#notaSimulado').textContent() || '';
  check('O ecrã diz que os números do mês são uma série de exemplo',
        /exemplo/i.test(nota) && /B-72/.test(nota));

  /* ── 2. Os cartões do mês vêm preenchidos ───────────────────────── */
  check('Os cartões do mês trazem números do endpoint',
        num(await admin.locator('#mesPedidos').textContent()) > 0
        && num(await admin.locator('#mesFaturacao').textContent()) > 0);
  check('As mesas mostram ocupadas de um total',
        /\d+ de \d+/.test(await admin.locator('#mesasOcupadas').textContent() || ''));

  /* ── 3. A prova que interessa: fazer um pedido move os números ─── */
  const antesPedidos = num(await admin.locator('#hojePedidos').textContent());
  const antesFaturacao = num(await admin.locator('#hojeFaturacao').textContent());

  const mesa = await ctx.newPage();
  mesa.on('pageerror', () => {});   // a mesa.html traz o Tailwind de um CDN
  await mesa.goto(`${CLIENTE}/mesa.html?simular=1&mesa=demo-mesa-6`);
  await mesa.waitForTimeout(2500);

  // Envia uma ronda pelo mesmo caminho que o cliente usa.
  const enviou = await mesa.evaluate(async () => {
    try {
      await chamarAPI('mesas/demo-mesa-6/pedir', {
        method: 'POST',
        body: { itens: [{ produtoId: 7, quantidade: 2 }] },   // 2 × Abate Misto = 32,40
      });
      return 'ok';
    } catch (e) { return (e && e.message) || 'erro'; }
  });
  check('O pedido à mesa foi aceite pela API simulada', enviou === 'ok', enviou);

  await admin.reload();
  await admin.waitForSelector('#conteudo:not([hidden])', { timeout: 8000 });

  const depoisPedidos = num(await admin.locator('#hojePedidos').textContent());
  const depoisFaturacao = num(await admin.locator('#hojeFaturacao').textContent());

  check('Fazer um pedido à mesa faz os pedidos de hoje subir',
        depoisPedidos === antesPedidos + 1, `${antesPedidos} → ${depoisPedidos}`);
  check('E a faturação de hoje sobe 32,40 € (2 × Abate Misto a 16,20)',
        Math.abs((depoisFaturacao - antesFaturacao) - 32.40) < 0.01,
        `${antesFaturacao} → ${depoisFaturacao}`);
  check('A média por pedido passa a ter valor',
        num(await admin.locator('#hojeMedia').textContent()) > 0);
  check('E a mesa passa a contar como ocupada',
        /^[1-9]\d* de \d+/.test(await admin.locator('#mesasOcupadas').textContent() || ''),
        await admin.locator('#mesasOcupadas').textContent());

  /* ── 1. Quem não entra ──────────────────────────────────────────── */
  const coz = await login(ctx, 'cozinha@vemproabate.pt');
  check('A cozinha não tem o item "Estatísticas" na barra lateral',
        (await coz.locator('[data-nav-id="estatisticas"]').count()) === 0);

  await coz.goto(`${GESTAO}/estatisticas.html?simular=1`);
  await coz.waitForTimeout(1500);
  check('E escrever o endereço à mão devolve-a ao ecrã dela',
        /cozinha\.html/.test(coz.url()), coz.url());

  // O ecrã esconder não chega: o servidor tem de recusar na mesma.
  await coz.goto(`${GESTAO}/cozinha.html?simular=1`);
  await coz.waitForTimeout(800);
  const resposta = await coz.evaluate(async () => {
    try { await chamarAPI('admin/estatisticas'); return 'passou'; }
    catch (e) { return e && e.status ? String(e.status) : 'erro sem estado'; }
  });
  check('E chamar o endpoint à mão a partir da cozinha devolve 403', resposta === '403', resposta);

  await admin.screenshot({ path: '/tmp/f55-estatisticas.png' }).catch(() => {});

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('F-55 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();
