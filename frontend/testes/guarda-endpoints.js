/**
 * A guarda do recurso meio ligado — `escritaFingidaSobreRecursoReal`.
 *
 * PORQUE É QUE ISTO EXISTE
 * O `ENDPOINTS_REAIS` é uma lista por CAMINHO, mas um ecrã usa vários
 * caminhos do mesmo recurso, e nada garantia que fossem ligados todos ao
 * mesmo tempo. Um recurso meio ligado mente sem dar sinal:
 *
 *     GET  gestao/categorias        → servidor   (verdade)
 *     PUT  gestao/categorias/ordem  → simulação  (mentira: 200 sem gravar)
 *
 * As setas funcionavam à vista, a ordem mudava no ecrã, e voltava tudo
 * atrás ao recarregar a página — sem erro nenhum.
 *
 * ── PORQUE É QUE ESTE TESTE NÃO USA UM CASO REAL (10/09) ────────────
 * A primeira versão testava o `gestao/categorias/ordem`, que era a
 * lacuna do dia. O João fechou-a horas depois (B-74) e o teste passou a
 * falhar — não porque a guarda se estragou, mas porque o exemplo
 * desapareceu. Um teste que morre quando o projeto melhora é um teste
 * que se acaba por apagar em vez de corrigir.
 *
 * Por isso agora o caso é INVENTADO: acrescenta-se um recurso de
 * mentira ao `ENDPOINTS_REAIS` e exercita-se a guarda contra ele. Assim
 * o teste mede o mecanismo, e não o estado de uma lacuna. Os caminhos
 * verdadeiros continuam aqui, mas só para o outro lado: para provar que
 * a guarda NÃO apanha quem não deve.
 *
 * Os outros testes correm todos com `?simular=1`, e a guarda está
 * desligada nesse modo de propósito (numa demonstração é tudo a fingir e
 * é isso que se quer). Daí abrir-se a página sem `?simular=1` e
 * substituir-se a `simulacaoForcada`.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = 'file://' + path.resolve(__dirname, '..');

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('[pageerror]', e.message); falhas.push('pageerror'); });

  await p.goto(`${RAIZ}/funcionarios/login.html`);

  /* Sem `?simular=1`: a `simulacaoForcada` tem de responder que não,
     senão a guarda sai na primeira linha. E acrescenta-se o recurso
     inventado — só nesta página, que morre com o teste. */
  await p.evaluate(() => {
    window.simulacaoForcada = () => false;
    ENDPOINTS_REAIS.push(/^inventado\/recurso$/);
  });

  const g = (caminho, metodo) =>
    p.evaluate(([c, m]) => escritaFingidaSobreRecursoReal(c, m), [caminho, metodo]);

  /* ── O mecanismo ────────────────────────────────────────────────── */
  check('Uma escrita debaixo de um recurso já real é apanhada, e diz qual é o recurso',
        (await g('inventado/recurso/subcaminho', 'PUT')) === 'inventado/recurso',
        String(await g('inventado/recurso/subcaminho', 'PUT')));

  check('Apanha em qualquer método de escrita, não só no PUT',
        (await g('inventado/recurso/x', 'POST')) === 'inventado/recurso' &&
        (await g('inventado/recurso/x', 'PATCH')) === 'inventado/recurso' &&
        (await g('inventado/recurso/x', 'DELETE')) === 'inventado/recurso');

  check('Encontra o antepassado mesmo dois níveis acima',
        (await g('inventado/recurso/a/b', 'POST')) === 'inventado/recurso');

  check('Uma LEITURA passa — dados de demonstração vêem-se, e é para isso que serve o ?simular=1',
        (await g('inventado/recurso/subcaminho', 'GET')) === null);

  check('E o próprio caminho real não é apanhado: vai ao servidor, não à simulação',
        (await g('inventado/recurso', 'POST')) === null);

  check('Um recurso vizinho com o mesmo prefixo de texto não conta como antepassado',
        (await g('inventado/recursos-outro/x', 'POST')) === null,
        String(await g('inventado/recursos-outro/x', 'POST')));

  /* ── O outro lado: não apanhar quem não deve ────────────────────
     Os caminhos que continuam INTEIRAMENTE simulados. Se algum destes
     começar a ser apanhado, é porque alguém ligou metade de um recurso
     e o ecrã dele está a fingir — e é exatamente o aviso que se quer. */
  const simulados = [
    ['mesas/demo-mesa-4/chamar-empregado', 'POST'],
    ['admin/estatisticas',                 'POST'],
    ['gestao/sessoes/7/conta',             'POST'],
  ];
  for (const [caminho, metodo] of simulados) {
    check(`Inteiramente simulado, passa: ${metodo} ${caminho}`,
          (await g(caminho, metodo)) === null, String(await g(caminho, metodo)));
  }

  /* ── E os que JÁ são reais não passam pela simulação ────────────── */
  const reais = [
    ['gestao/produtos/7',           'PATCH'],
    ['gestao/stock/3/movimento',    'POST'],
    ['gestao/categorias/ordem',     'PUT'],
    ['gestao/funcionarios/2',       'PATCH'],
    ['pedidos/takeaway',            'POST'],
  ];
  for (const [caminho, metodo] of reais) {
    check(`Já é real, não é apanhado: ${metodo} ${caminho}`,
          (await g(caminho, metodo)) === null, String(await g(caminho, metodo)));
  }

  /* ── Ponta a ponta: a simulação recusa mesmo ─────────────────────
     Não basta a função devolver o nome do recurso; o `simularEndpoint`
     tem de recusar com 501 em vez de responder que gravou. */
  const resultado = await p.evaluate(async () => {
    try {
      await simularEndpoint('inventado/recurso/subcaminho', { method: 'PUT', body: {} });
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

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
