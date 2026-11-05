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
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const RAIZ    = 'file://' + path.resolve(__dirname, '..');
const GESTAO  = RAIZ + '/funcionarios';
const CLIENTE = RAIZ + '/cliente';

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => { feitas++; console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

async function login(ctx, email) {
  const p = await ctx.newPage();
  p.on('pageerror', e => { if (!/tailwind/i.test(e.message)) { console.log('[pageerror]', e.message); falhas.push('pageerror: ' + e.message.slice(0, 60)); } });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => { try { localStorage.removeItem('vpa_sessao_funcionario'); } catch (e) {} });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', PASSWORD_SIMULACAO);
  await p.click('#btnEntrar');
  await p.waitForTimeout(1200);
  return p;
}

const num = t => Number(String(t || '').replace(/[^\d,.-]/g, '').replace(',', '.'));

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
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

  /* ── Gráficos (F-56, F-57) ──────────────────────────────────────── */
  const svgs = await admin.locator('.grafico-svg').count();
  check('Os três gráficos são desenhados', svgs === 3, `contou ${svgs}`);

  const barras = await admin.locator('#graficoDias .grafico-barra').count();
  check('O gráfico dos dias tem uma barra por dia (30)', barras === 30, `contou ${barras}`);
  check('O dos meses tem 6 barras',
        (await admin.locator('#graficoMeses .grafico-barra').count()) === 6);
  check('O dos produtos tem 5 barras',
        (await admin.locator('#graficoProdutos .grafico-barra').count()) === 5);

  /* A tabela não é um extra: é onde estão os números para quem não vê o
     gráfico. Um SVG sem ela seria a coisa menos acessível da app. */
  const linhasTabela = await admin.locator('#graficoDias .tabela-grafico tbody tr').count();
  check('Cada gráfico traz a tabela equivalente, com as mesmas 30 linhas',
        linhasTabela === 30, `contou ${linhasTabela}`);
  check('A tabela dos produtos nomeia os produtos',
        /Abate Misto/.test(await admin.locator('#graficoProdutos .tabela-grafico').textContent() || ''));

  /* O erro que eu próprio meti na primeira versão do graficos.js:
     barras alcançáveis por Tab dentro de um SVG escondido aos leitores
     de ecrã — focáveis e mudas, a mesma classe do lightbox da F-63. */
  const focaveis = await admin.locator('.grafico-svg [tabindex]').count();
  check('Nenhuma barra é alcançável por Tab dentro do SVG',
        focaveis === 0, `contou ${focaveis}`);
  check('Os SVG não estão aria-hidden — têm role="img" com um resumo',
        (await admin.locator('.grafico-svg[aria-hidden="true"]').count()) === 0
        && (await admin.locator('.grafico-svg[role="img"]').count()) === 3);

  const rotulo = await admin.locator('#graficoDias .grafico-svg').getAttribute('aria-label');
  check('E o resumo diz o que o gráfico mostra e onde estão os números',
        /faturação diária/i.test(rotulo || '') && /tabela/i.test(rotulo || ''), rotulo);

  /* Um eixo que acaba em 437,29 € não se lê — tem de ser um número
     redondo. Os rótulos do eixo são os três primeiros <text>, na ordem
     0 → metade → topo; o que interessa é o TERCEIRO. Apanhar o primeiro
     dava sempre "0 €" e a verificação passava por engano. */
  const eixoY = await admin.$$eval('#graficoDias .grafico-svg text',
    els => els.slice(0, 3).map(e => e.textContent.trim()));
  const topo = eixoY[2] || '';
  check('O topo do eixo é um número redondo, não o valor máximo em bruto',
        /^(\d+|\d+,\d)( mil)? €$/.test(topo) && topo !== '0 €',
        `eixo: ${eixoY.join(' · ')}`);

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

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
