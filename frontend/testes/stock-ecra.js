/**
 * F-52 — Ecrã de stock: ler, ajustar e mudar o mínimo.
 *
 * O que tem de ficar provado:
 *   1. O ecrã abre, lista SÓ os produtos que controlam stock, e os que
 *      estão abaixo do mínimo vêm em cima, destacados.
 *   2. Uma ENTRADA soma. É a operação mais comum e a que não pode falhar.
 *   3. Uma QUEBRA subtrai, e nunca deixa o stock negativo.
 *   4. Um ACERTO grava o número contado, tal e qual.
 *   5. Mudar o mínimo muda quem está "baixo" — sem tocar na existência.
 *   6. O que se ajusta aqui aparece igual no catálogo (F-49). Dois ecrãs
 *      a mostrar números diferentes do mesmo produto é pior do que um
 *      ecrã a menos.
 *   7. O aviso da barra lateral segue os ajustes: repor o stock de um
 *      produto baixo faz o contador descer.
 *
 * Todas as páginas são abertas com `?simular=1`, pela mesma razão do
 * stock-cozinha.js: o `auth/login` fala com o Render a sério desde
 * 04/09, e um teste que precisa da nuvem para correr deixa de se poder
 * correr antes de um commit.
 */
const { chromium } = require('playwright');
const path = require('path');
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const GESTAO = 'file://' + path.resolve(__dirname, '..', 'funcionarios');

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => { feitas++; console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

async function login(ctx, email) {
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('[pageerror]', e.message); falhas.push('pageerror: ' + e.message.slice(0, 60)); });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => {
    localStorage.removeItem('vpa_sessao_funcionario');
    // Cada corrida parte do stock de origem: os ajustes ficam guardados
    // no browser (ver CHAVE_STOCK_DEMO no api.js) e um teste que herda o
    // estado da corrida anterior passa ou falha conforme a ordem.
    localStorage.removeItem('vpa_stock_demo');
  });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', PASSWORD_SIMULACAO);
  await p.click('#btnEntrar');
  await p.waitForTimeout(1200);
  return p;
}

/* Lê a tabela como um humano a lê: nome → existência, mínimo, destacado */
async function lerTabela(p) {
  return p.$$eval('#corpoTabela tr', linhas => linhas.map(tr => ({
    nome:   tr.children[0].textContent.trim(),
    atual:  Number(tr.children[2].textContent.trim()),
    minimo: Number(tr.children[3].textContent.trim()),
    baixo:  tr.classList.contains('linha-baixa'),
  })));
}

/* Abre o painel de ajuste do produto, escolhe o tipo, escreve e grava */
async function ajustar(p, nomeProduto, tipo, quantidade) {
  const linha = p.locator('#corpoTabela tr', { hasText: nomeProduto }).first();
  await linha.locator('.btn-ajustar').click();
  await p.waitForSelector('#painelAjuste[open]', { timeout: 4000 });
  await p.check(`#painelAjuste input[value="${tipo}"]`);
  await p.fill('#ajusteQtd', String(quantidade));
  const previsao = (await p.locator('#ajustePrevisao').textContent() || '').trim();
  await p.click('#btnGravarAjuste');
  await p.waitForSelector('#painelAjuste[open]', { state: 'detached', timeout: 6000 }).catch(() => {});
  await p.waitForTimeout(500);
  return previsao;
}

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });

  const admin = await login(ctx, 'admin@vemproabate.pt');
  await admin.goto(`${GESTAO}/stock.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });

  /* ── 1. Leitura ──────────────────────────────────────────────────── */
  let tabela = await lerTabela(admin);
  console.log('   tabela:', tabela.map(l => `${l.nome} ${l.atual}/${l.minimo}${l.baixo ? ' ⚠' : ''}`).join(' | '), '\n');

  check('Lista os 4 produtos que controlam stock', tabela.length === 4, `contou ${tabela.length}`);
  check('Não lista produtos sem controlo de stock (ex.: Coca-Cola)',
        !tabela.some(l => /Coca-Cola/.test(l.nome)));
  check('Os que estão baixos aparecem em cima',
        tabela[0].baixo && tabela[1].baixo && !tabela[2].baixo && !tabela[3].baixo);
  check('Borrego Abatido em 3, mínimo 5, marcado como baixo',
        tabela.some(l => /Borrego/.test(l.nome) && l.atual === 3 && l.minimo === 5 && l.baixo));

  const resumo = (await admin.locator('#resumoTexto').textContent() || '').trim();
  check('O resumo do topo diz quantos e quais', /2 produtos/.test(resumo) && /Borrego/.test(resumo), resumo);

  /* ── 2. Entrada soma ─────────────────────────────────────────────── */
  const previsaoEntrada = await ajustar(admin, 'Borrego Abatido', 'entrada', 10);
  check('A previsão avisa em que número vai ficar ANTES de gravar',
        /13/.test(previsaoEntrada), previsaoEntrada);

  tabela = await lerTabela(admin);
  const borrego = tabela.find(l => /Borrego/.test(l.nome));
  check('Entrada de 10 no Borrego: 3 → 13', borrego && borrego.atual === 13, `ficou ${borrego && borrego.atual}`);
  check('E deixa de estar baixo (13 > 5)', borrego && !borrego.baixo);

  /* ── 3. Quebra subtrai, e não passa abaixo de zero ──────────────── */
  await ajustar(admin, 'Picanha na Brasa Negra', 'quebra', 4);
  tabela = await lerTabela(admin);
  let picanha = tabela.find(l => /Picanha/.test(l.nome));
  check('Quebra de 4 na Picanha: 12 → 8', picanha && picanha.atual === 8, `ficou ${picanha && picanha.atual}`);

  await ajustar(admin, 'Picanha na Brasa Negra', 'quebra', 999);
  tabela = await lerTabela(admin);
  picanha = tabela.find(l => /Picanha/.test(l.nome));
  check('Quebra maior do que a existência para em 0, não fica negativo',
        picanha && picanha.atual === 0, `ficou ${picanha && picanha.atual}`);

  /* ── 4. Acerto grava o número contado ───────────────────────────── */
  await ajustar(admin, 'Sangria (Jarro)', 'acerto', 25);
  tabela = await lerTabela(admin);
  const sangria = tabela.find(l => /Sangria/.test(l.nome));
  check('Acerto de contagem grava 25, tal e qual', sangria && sangria.atual === 25, `ficou ${sangria && sangria.atual}`);

  /* ── 5. O mínimo muda quem está baixo, sem mexer na existência ─── */
  const linhaTabua = admin.locator('#corpoTabela tr', { hasText: 'Tábua Rústica' }).first();
  await linhaTabua.locator('.btn-minimo').click();
  await admin.waitForSelector('#painelMinimo[open]', { timeout: 4000 });
  await admin.fill('#minimoQtd', '1');
  await admin.click('#btnGravarMinimo');
  await admin.waitForTimeout(600);

  tabela = await lerTabela(admin);
  const tabua = tabela.find(l => /Tábua Rústica/.test(l.nome));
  check('Baixar o mínimo da Tábua para 1 tira-a do estado "baixo" (tem 2)',
        tabua && tabua.minimo === 1 && !tabua.baixo, `${tabua && tabua.atual}/${tabua && tabua.minimo}`);
  check('...e não mexeu na existência (continua em 2)', tabua && tabua.atual === 2, `ficou ${tabua && tabua.atual}`);

  /* ── 6. O catálogo (F-49) mostra os mesmos números ──────────────── */
  await admin.goto(`${GESTAO}/produtos.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });
  const noCatalogo = await admin.$$eval('#corpoTabela tr', linhas => linhas.map(tr => ({
    nome: tr.querySelector('.produto-nome') ? tr.querySelector('.produto-nome').textContent.trim() : '',
    stock: tr.querySelector('.col-stock') ? tr.querySelector('.col-stock').textContent.trim() : '',
  })));
  const borregoCat = noCatalogo.find(l => /Borrego/.test(l.nome));
  check('O catálogo mostra o Borrego já com os 13 ajustados, não com os 3 de origem',
        borregoCat && /13/.test(borregoCat.stock), borregoCat && borregoCat.stock);

  /* ── 7. O aviso da barra lateral acompanha, nos dois sentidos ────
     Depois dos ajustes acima, quem está baixo TROCOU: o Borrego (3→13)
     e a Tábua (mínimo 4→1) saíram da lista, e a Picanha entrou — a
     quebra de 999 deixou-a em 0, e 0 está abaixo do mínimo dela, que é
     6. O número volta a dar 1, mas por outra razão e outro produto, e é
     isso que este teste tem de apanhar: um contador que só soubesse
     descer passaria à mesma. */
  await admin.waitForTimeout(700);   // avisarStockBaixo() é assíncrono
  const aviso = await admin.locator('[data-nav-id="stock"] .nav-aviso').textContent().catch(() => null);
  check('O contador do gerente continua a marcar 1 — mas agora é a Picanha, não o Borrego',
        aviso === '1', `viu: ${aviso}`);

  const dica = await admin.locator('[data-nav-id="stock"] .nav-aviso').getAttribute('title').catch(() => '');
  check('E o aviso diz o nome certo: a Picanha entrou, o Borrego saiu',
        /Picanha/.test(dica || '') && !/Borrego/.test(dica || ''), dica);

  /* ── 8. A cozinha entra, o balcão não ───────────────────────────── */
  const coz = await login(ctx, 'cozinha@vemproabate.pt');
  await coz.goto(`${GESTAO}/stock.html?simular=1`);
  await coz.waitForSelector('#corpoTabela tr', { timeout: 8000 });
  check('A cozinha abre o ecrã de stock (é quem dá pelas quebras)',
        (await coz.locator('#corpoTabela tr').count()) === 4);

  /* O balcão tem sessão válida, só não tem acesso a esta página — por
     isso o auth-guard manda-o para o ecrã DELE, não para o login.
     Mandá-lo para o login seria pedir a password a alguém que já a
     tinha dado. */
  /* O acerto é só do administrador (08/09). A cozinha regista entradas e
     quebras — factos que vê acontecer — mas não apaga a contabilidade. */
  const acertoBloqueado = await coz.locator('#tipoAcerto input').isDisabled().catch(() => null);
  await coz.locator('.btn-ajustar').first().click();
  await coz.waitForSelector('#painelAjuste[open]', { timeout: 4000 });
  check('Para a cozinha, o "Acerto" está desativado', acertoBloqueado === true);
  check('...mas continua à vista, com o motivo escrito (não desaparece sem explicação)',
        await coz.locator('#tipoAcerto').isVisible()
        && /administra/i.test(await coz.locator('#acertoDesc').textContent() || ''));

  const entradaCozinha = await coz.locator('#painelAjuste input[value="entrada"]').isDisabled();
  check('A entrada e a quebra continuam ao alcance da cozinha', entradaCozinha === false);

  /* E o bloqueio não vive só no ecrã: esconder um botão não impede
     ninguém de chamar o endpoint à mão. */
  const respostaDireta = await coz.evaluate(async () => {
    try {
      await chamarAPI('gestao/stock/5/movimento', { method: 'POST', body: { tipo: 'acerto', quantidade: 999 } });
      return 'passou';
    } catch (e) { return e && e.status ? String(e.status) : 'erro sem estado'; }
  });
  check('E chamar o endpoint à mão a partir da cozinha devolve 403',
        respostaDireta === '403', respostaDireta);

  await coz.click('#btnCancelarAjuste');
  await coz.waitForTimeout(300);

  const balcao = await login(ctx, 'balcao@vemproabate.pt');
  await balcao.goto(`${GESTAO}/stock.html?simular=1`);
  await balcao.waitForTimeout(1500);
  check('O balcão é barrado no ecrã de stock e devolvido ao ecrã dele',
        /balcao\.html/.test(balcao.url()), balcao.url());
  check('...e não fica com a tabela de stock à vista',
        (await balcao.locator('#corpoTabela tr').count()) === 0);

  await admin.screenshot({ path: '/tmp/f52-stock-admin.png' }).catch(() => {});

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('F-52 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
