/**
 * A guarda do recurso meio ligado — `escritaFingidaSobreRecursoReal`.
 *
 * PORQUE É QUE ISTO É UM TESTE À PARTE
 * O ENDPOINTS_REAIS é uma lista por CAMINHO, mas um ecrã usa vários
 * caminhos do mesmo recurso. Nada garantia que fossem ligados todos ao
 * mesmo tempo — e um recurso meio ligado mente sem dar sinal:
 *
 *     GET  gestao/categorias        → servidor   (verdade)
 *     PUT  gestao/categorias/ordem  → simulação  (mentira: 200 sem gravar)
 *
 * As setas funcionavam à vista e a ordem voltava atrás ao recarregar a
 * página, sem erro nenhum. Este teste é o que impede isso de voltar.
 *
 * Os outros testes correm todos com `?simular=1`, e a guarda está
 * desligada nesse modo de propósito (numa demonstração é tudo a fingir e
 * é isso que se quer). Por isso aqui abre-se a página SEM `?simular=1` e
 * substitui-se a `simulacaoForcada` — é a única forma de exercitar a
 * guarda sem precisar de servidor.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = 'file://' + path.resolve(__dirname, '..');

const falhas = [];
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  if (!c) falhas.push(n);
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('[pageerror]', e.message); falhas.push('pageerror'); });

  /* Sem `?simular=1`: é preciso que a `simulacaoForcada` responda que
     não, senão a guarda sai logo à primeira linha. Substitui-se de
     seguida para não depender de sessionStorage nenhum. */
  await p.goto(`${RAIZ}/funcionarios/login.html`);
  await p.evaluate(() => { window.simulacaoForcada = () => false; });

  const g = (caminho, metodo) =>
    p.evaluate(([c, m]) => escritaFingidaSobreRecursoReal(c, m), [caminho, metodo]);

  /* ── O caso que existe hoje ─────────────────────────────────────── */
  check('Uma escrita em gestao/categorias/ordem é apanhada, e diz qual é o recurso já real',
        (await g('gestao/categorias/ordem', 'PUT')) === 'gestao/categorias',
        String(await g('gestao/categorias/ordem', 'PUT')));

  /* ── O que NÃO pode ser apanhado ────────────────────────────────── */
  check('Uma leitura passa — dados de demonstração vêem-se, e é para isso que serve o ?simular=1',
        (await g('gestao/categorias/ordem', 'GET')) === null);

  check('Um recurso inteiramente simulado passa (mesas/:token/chamar-empregado)',
        (await g('mesas/demo-mesa-4/chamar-empregado', 'POST')) === null,
        String(await g('mesas/demo-mesa-4/chamar-empregado', 'POST')));

  check('Um recurso inteiramente simulado passa (admin/estatisticas)',
        (await g('admin/estatisticas', 'POST')) === null);

  check('Um recurso inteiramente simulado passa (gestao/mesas/qrcodes)',
        (await g('gestao/mesas/qrcodes', 'POST')) === null,
        String(await g('gestao/mesas/qrcodes', 'POST')));

  check('Um caminho que JÁ é real não é apanhado — vai ao servidor, não à simulação',
        (await g('gestao/produtos/7', 'PATCH')) === null);

  check('Nem o gestao/stock/3/movimento, que também já é real',
        (await g('gestao/stock/3/movimento', 'POST')) === null);

  /* ── E a ponta a ponta: a simulação recusa mesmo ─────────────────
     Não basta a função devolver o nome do recurso; o simularEndpoint
     tem de recusar. Um 501 e não um 200. */
  const resultado = await p.evaluate(async () => {
    try {
      await simularEndpoint('gestao/categorias/ordem', { method: 'PUT', body: { ids: [1, 2, 3, 4] } });
      return 'passou';
    } catch (e) { return e && e.status ? String(e.status) : 'erro sem estado'; }
  });
  check('A simulação recusa o pedido com 501 em vez de responder que gravou',
        resultado === '501', resultado);

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('GUARDA DE ENDPOINTS VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();
