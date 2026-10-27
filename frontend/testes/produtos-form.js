/**
 * F-50 — Formulário de produto: criar, editar, tirar da carta.
 *
 * O que tem de ficar provado:
 *   1. Criar um produto: aparece na tabela E na ementa do site do cliente.
 *      É essa a prova de que o catálogo é um só — se o prato novo não
 *      chegar ao menu.html, o ecrã de gestão está a escrever para o vazio.
 *   2. O preço aceita vírgula. Num teclado português escreve-se "16,20",
 *      e um formulário que só aceite ponto rejeita toda a gente.
 *   3. Editar o preço de um produto muda-o em todo o lado.
 *   4. "Fora da carta" (ativo) e "hoje não há" (disponivel) são coisas
 *      diferentes e o site trata-as de maneira diferente.
 *   5. Ligar o controlo de stock põe o produto no ecrã de stock.
 *   6. Ao editar um produto que JÁ controla stock, o formulário não deixa
 *      escrever a existência — quem manda nela é o ecrã de stock, e dois
 *      ecrãs a escrever o mesmo número perdem vendas em silêncio.
 *   7. Validações: sem nome, sem categoria, preço a zero — todas recusam
 *      com mensagem, e nenhuma grava nada.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ    = 'file://' + path.resolve(__dirname, '..');
const GESTAO  = RAIZ + '/funcionarios';
const CLIENTE = RAIZ + '/cliente';

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => { feitas++; console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`); if (!c) falhas.push(n); };

async function login(ctx, email) {
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('[pageerror]', e.message); falhas.push('pageerror: ' + e.message.slice(0, 60)); });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => {
    localStorage.removeItem('vpa_sessao_funcionario');
    localStorage.removeItem('vpa_stock_demo');
    localStorage.removeItem('vpa_produtos_demo');   // cada corrida parte do catálogo de origem
  });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', 'abate2026');
  await p.click('#btnEntrar');
  await p.waitForTimeout(1200);
  return p;
}

async function lerLinhas(p) {
  return p.$$eval('#corpoTabela tr', linhas => linhas.map(tr => ({
    nome:  tr.querySelector('.produto-nome') ? tr.querySelector('.produto-nome').textContent.trim() : '',
    preco: tr.children[3] ? tr.children[3].textContent.trim() : '',
    stock: tr.children[4] ? tr.children[4].textContent.trim() : '',
    estado: tr.children[5] ? tr.children[5].textContent.trim() : '',
  })));
}

async function abrirEdicao(p, nome) {
  const linha = p.locator('#corpoTabela tr', { hasText: nome }).first();
  await linha.locator('.btn-editar').click();
  await p.waitForSelector('#painelProduto[open]', { timeout: 4000 });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });

  const admin = await login(ctx, 'admin@vemproabate.pt');
  await admin.goto(`${GESTAO}/produtos.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });

  const antes = (await lerLinhas(admin)).length;
  console.log(`   catálogo de origem: ${antes} produtos\n`);

  /* ── 1 e 2. Criar, com o preço escrito à portuguesa ─────────────── */
  await admin.click('#btnNovo');
  await admin.waitForSelector('#painelProduto[open]', { timeout: 4000 });
  await admin.fill('#fNome', 'Bitoque do Abate');
  await admin.fill('#fDescricao', 'Bife com ovo a cavalo, arroz e batata frita');
  await admin.fill('#fPreco', '13,40');            // vírgula, como se escreve cá
  await admin.selectOption('#fCategoria', 'Pratos Principais');
  await admin.click('#btnGravarForm');
  await admin.waitForSelector('#painelProduto[open]', { state: 'detached', timeout: 6000 }).catch(() => {});
  await admin.waitForTimeout(600);

  let linhas = await lerLinhas(admin);
  const novo = linhas.find(l => /Bitoque do Abate/.test(l.nome));
  check('Criar um produto acrescenta-o à tabela', !!novo && linhas.length === antes + 1,
        `${linhas.length} linhas`);
  check('O preço escrito com vírgula ("13,40") é aceite e mostrado como 13,40 €',
        novo && /13,40/.test(novo.preco), novo && novo.preco);

  /* A prova a sério: o prato novo tem de chegar à ementa do cliente. */
  const cliente = await ctx.newPage();
  await cliente.goto(`${CLIENTE}/menu.html?simular=1`);
  await cliente.waitForTimeout(2000);
  const textoMenu = await cliente.evaluate(() => document.body.innerText);
  check('E aparece na ementa do site do cliente, não só no ecrã de gestão',
        /Bitoque do Abate/.test(textoMenu));

  /* ── 3. Editar o preço ──────────────────────────────────────────── */
  await abrirEdicao(admin, 'Abate Misto');
  await admin.fill('#fPreco', '17,50');
  await admin.click('#btnGravarForm');
  await admin.waitForTimeout(600);

  linhas = await lerLinhas(admin);
  const misto = linhas.find(l => /Abate Misto/.test(l.nome));
  check('Editar o preço do Abate Misto: 16,20 → 17,50', misto && /17,50/.test(misto.preco),
        misto && misto.preco);

  await cliente.reload();
  await cliente.waitForTimeout(2000);
  const menuDepois = await cliente.evaluate(() => document.body.innerText);
  check('E o preço novo aparece também na ementa do cliente',
        /17,50/.test(menuDepois) && !/16,20/.test(menuDepois));

  /* ── 4. "Fora da carta" e "hoje não há" são coisas diferentes ──── */
  await abrirEdicao(admin, 'Baba do Pastor');
  await admin.uncheck('#fDisponivel');            // hoje não há
  await admin.click('#btnGravarForm');
  await admin.waitForTimeout(600);

  linhas = await lerLinhas(admin);
  const baba = linhas.find(l => /Baba do Pastor/.test(l.nome));
  check('Desligar "há hoje" marca o produto como "Hoje não há", não como fora da carta',
        baba && /Hoje não há/.test(baba.estado), baba && baba.estado);

  await abrirEdicao(admin, 'Panaché');
  await admin.uncheck('#fAtivo');                 // fora da carta
  await admin.click('#btnGravarForm');
  await admin.waitForTimeout(600);

  linhas = await lerLinhas(admin);
  const panache = linhas.find(l => /Panaché/.test(l.nome));
  check('Desligar "está na carta" marca o produto como "Fora da carta"',
        panache && /Fora da carta/.test(panache.estado), panache && panache.estado);
  check('O produto fora da carta CONTINUA na tabela de gestão (é aí que se reativa)',
        !!panache);

  await cliente.reload();
  await cliente.waitForTimeout(2000);
  const menuFinal = await cliente.evaluate(() => document.body.innerText);
  check('Mas desaparece da ementa do cliente', !/Panaché/.test(menuFinal));

  /* ── 5 e 6. Controlo de stock ───────────────────────────────────── */
  await abrirEdicao(admin, 'Cheesecake da Casa');
  await admin.check('#fControlaStock');
  await admin.waitForTimeout(200);
  check('Ao ligar o controlo de stock num produto que JÁ existe, a existência não é editável',
        await admin.locator('#campoExistencia').isHidden());
  check('...e o formulário diz que começa a zero e a primeira contagem é uma entrada',
        /zero/i.test(await admin.locator('#notaStock').textContent() || ''));
  await admin.fill('#fQtdMinima', '3');
  await admin.click('#btnGravarForm');
  await admin.waitForTimeout(600);

  await admin.goto(`${GESTAO}/stock.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });
  /* Célula a célula, não o texto todo da linha: concatenado, um 9 e um 3
     em colunas diferentes leem-se como "93". */
  const noStock = await admin.$$eval('#corpoTabela tr', ls => ls.map(tr => ({
    nome:   tr.children[0].textContent.trim(),
    atual:  Number(tr.children[2].textContent.trim()),
    minimo: Number(tr.children[3].textContent.trim()),
  })));
  const cheesecake = noStock.find(l => /Cheesecake da Casa/.test(l.nome));
  check('O produto passa a aparecer no ecrã de stock, a ZERO e com mínimo 3',
        cheesecake && cheesecake.atual === 0 && cheesecake.minimo === 3,
        cheesecake ? `${cheesecake.atual}/${cheesecake.minimo}` : 'não apareceu');

  /* A quantidade entra por onde tem de entrar: um movimento, com origem
     registada. É o que faz a cadeia antes/depois começar sempre em 0. */
  const linhaCheese = admin.locator('#corpoTabela tr', { hasText: 'Cheesecake da Casa' }).first();
  await linhaCheese.locator('.btn-ajustar').click();
  await admin.waitForSelector('#painelAjuste[open]', { timeout: 4000 });
  await admin.check('#painelAjuste input[value="entrada"]');
  await admin.fill('#ajusteQtd', '9');
  await admin.click('#btnGravarAjuste');
  await admin.waitForTimeout(600);
  const depoisEntrada = await admin.$$eval('#corpoTabela tr', ls => ls.map(tr => ({
    nome: tr.children[0].textContent.trim(), atual: Number(tr.children[2].textContent.trim()),
  })));
  check('A primeira contagem entra como entrada e leva-o a 9',
        (depoisEntrada.find(l => /Cheesecake/.test(l.nome)) || {}).atual === 9);

  await admin.goto(`${GESTAO}/produtos.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });
  await abrirEdicao(admin, 'Cheesecake da Casa');
  check('Ao EDITAR um produto que já controla stock, a existência não é editável aqui',
        await admin.locator('#campoExistencia').isHidden());
  check('...e o formulário diz porquê: quem manda nela é o ecrã de Stock',
        /Stock/.test(await admin.locator('#notaStock').textContent() || ''));

  /* A prova do cenário das 20h03: mudar SÓ o preço não pode mexer na
     quantidade, mesmo que o painel a tenha lido há dez minutos. */
  await admin.fill('#fPreco', '5,10');
  await admin.click('#btnGravarForm');
  await admin.waitForTimeout(600);
  await admin.goto(`${GESTAO}/stock.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });
  const aposPreco = await admin.$$eval('#corpoTabela tr', ls => ls.map(tr => ({
    nome: tr.children[0].textContent.trim(), atual: Number(tr.children[2].textContent.trim()),
  })));
  check('Mudar só o preço NÃO mexe na existência (o cenário das 20h03 do João)',
        (aposPreco.find(l => /Cheesecake/.test(l.nome)) || {}).atual === 9,
        String((aposPreco.find(l => /Cheesecake/.test(l.nome)) || {}).atual));

  /* E se alguém mandar o campo à mão, o servidor recusa — o ecrã não é
     a única defesa. */
  const recusa = await admin.evaluate(async () => {
    try {
      await chamarAPI('gestao/produtos/24', { method: 'PATCH', body: { quantidade_atual: 999 } });
      return 'passou';
    } catch (e) { return e && e.status ? String(e.status) : 'erro sem estado'; }
  });
  check('Mandar `quantidade_atual` num PATCH de produto devolve 400', recusa === '400', recusa);

  await admin.goto(`${GESTAO}/produtos.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });

  /* ── 7. Validações ──────────────────────────────────────────────── */
  const contagemAntes = (await lerLinhas(admin)).length;

  await admin.click('#btnNovo');
  await admin.waitForSelector('#painelProduto[open]', { timeout: 4000 });
  await admin.click('#btnGravarForm');
  await admin.waitForTimeout(400);
  check('Gravar sem nome recusa e diz porquê',
        await admin.locator('#formErro').isVisible()
        && /nome/i.test(await admin.locator('#formErro').textContent()));

  await admin.fill('#fNome', 'Prato de Teste');
  await admin.fill('#fPreco', '0');
  await admin.selectOption('#fCategoria', 'Entradas');
  await admin.click('#btnGravarForm');
  await admin.waitForTimeout(400);
  check('Preço a zero recusa',
        /maior do que zero/i.test(await admin.locator('#formErro').textContent() || ''));

  await admin.fill('#fPreco', 'muito caro');
  await admin.click('#btnGravarForm');
  await admin.waitForTimeout(400);
  check('Preço que não é número recusa',
        /duas casas|16,20/i.test(await admin.locator('#formErro').textContent() || ''));

  await admin.click('#btnCancelarForm');
  await admin.waitForTimeout(400);
  check('Nenhuma das tentativas recusadas gravou seja o que for',
        (await lerLinhas(admin)).length === contagemAntes,
        `${(await lerLinhas(admin)).length} vs ${contagemAntes}`);

  /* ── 8. O filtro de categorias não duplica ──────────────────────── */
  const opcoes = await admin.$$eval('#filtroCategoria option', os => os.map(o => o.textContent));
  const repetidas = opcoes.filter((o, i) => opcoes.indexOf(o) !== i);
  check('O filtro de categorias não ganha opções repetidas a cada gravação',
        repetidas.length === 0, repetidas.join(', '));

  await admin.screenshot({ path: '/tmp/f50-produtos.png' }).catch(() => {});

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('F-50 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
