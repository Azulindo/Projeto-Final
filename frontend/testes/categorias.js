/**
 * F-51 — Categorias da ementa: ler, criar, editar e reordenar.
 *
 * O que tem de ficar provado:
 *   1. Só o administrador entra.
 *   2. A lista vem pela ordem certa, com o número de produtos de cada.
 *   3. Reordenar funciona, e a ementa do CLIENTE muda com ela. É esta a
 *      prova de que a ordem serve para alguma coisa — sem isto, o botão
 *      só mexe numa lista bonita no ecrã de gestão.
 *   4. As setas das pontas estão desativadas, e o foco segue o botão
 *      que se carregou — senão não se consegue mover duas posições
 *      seguidas com o teclado.
 *   5. Não se pode esconder uma categoria com produtos lá dentro, e o
 *      ecrã diz isso ANTES de deixar tentar.
 *   6. Nomes repetidos são recusados, mesmo com maiúsculas ou acentos
 *      diferentes — duas gavetas com o mesmo nome partem a ementa.
 *   7. Renomear arrasta os produtos, em vez de os deixar órfãos.
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
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', PASSWORD_SIMULACAO);
  await p.click('#btnEntrar');
  await p.waitForTimeout(1200);
  return p;
}

const nomes = p => p.$$eval('.cat-item .cat-nome', els => els.map(e => e.textContent.trim()));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });

  const admin = await login(ctx, 'admin@vemproabate.pt');
  await admin.goto(`${GESTAO}/categorias.html?simular=1`);
  await admin.waitForSelector('.cat-item', { timeout: 8000 });

  /* ── 2. Leitura ─────────────────────────────────────────────────── */
  const ordemInicial = await nomes(admin);
  console.log('   ordem:', ordemInicial.join(' → '), '\n');
  check('As quatro categorias aparecem pela ordem da ementa',
        ordemInicial.join('|') === 'Entradas|Pratos Principais|Bebidas|Sobremesas',
        ordemInicial.join(' → '));

  const contagens = await admin.$$eval('.cat-item .cat-produtos', els => els.map(e => e.textContent.trim()));
  check('Cada categoria mostra quantos produtos tem',
        contagens[0] === '4 produtos' && /\d+ produtos/.test(contagens[1]), contagens.join(' · '));

  /* ── 4. Setas das pontas ────────────────────────────────────────── */
  check('A primeira não sobe',
        await admin.locator('.cat-item').first().locator('.btn-seta').first().isDisabled());
  check('A última não desce',
        await admin.locator('.cat-item').last().locator('.btn-seta').last().isDisabled());

  /* ── 3. Reordenar, e a ementa do cliente a mudar com isso ───────── */
  // Sobremesas (última) sobe uma posição.
  await admin.locator('.cat-item', { hasText: 'Sobremesas' }).locator('.btn-seta').first().click();
  await admin.waitForTimeout(700);

  const depois = await nomes(admin);
  check('Subir as Sobremesas troca-as com as Bebidas',
        depois.join('|') === 'Entradas|Pratos Principais|Sobremesas|Bebidas', depois.join(' → '));

  const focado = await admin.evaluate(() => {
    const a = document.activeElement;
    const li = a && a.closest('.cat-item');
    return li ? li.querySelector('.cat-nome').textContent.trim() : null;
  });
  check('O foco segue a categoria que se moveu (dá para carregar outra vez)',
        focado === 'Sobremesas', `foco em: ${focado}`);

  /* A prova que interessa: a ementa do cliente respeita a ordem. */
  const cliente = await ctx.newPage();
  cliente.on('pageerror', () => {});
  await cliente.goto(`${CLIENTE}/menu.html?simular=1`);
  await cliente.waitForTimeout(2200);
  const textoMenu = await cliente.evaluate(() => document.body.innerText);
  const posSobremesas = textoMenu.indexOf('Sobremesas');
  const posBebidas = textoMenu.indexOf('Bebidas');
  check('E a ementa do cliente passa a mostrar as Sobremesas antes das Bebidas',
        posSobremesas > 0 && posBebidas > 0 && posSobremesas < posBebidas,
        `Sobremesas em ${posSobremesas}, Bebidas em ${posBebidas}`);

  /* ── 5. Esconder uma categoria com produtos ─────────────────────
     Isto era um interruptor bloqueado até 10/09, e estava errado: o
     B-62 aceita a repetição com `confirmar: true`, e o ecrã tapava esse
     caminho — uma funcionalidade que existe e não tem botão é uma
     funcionalidade que não existe. Agora pergunta-se, com o número. */
  await admin.locator('.cat-item', { hasText: 'Entradas' }).locator('.btn-editar').click();
  await admin.waitForSelector('#painelCategoria[open]', { timeout: 4000 });

  check('O interruptor NÃO está bloqueado — pergunta-se, não se proíbe',
        !(await admin.locator('#cAtivo').isDisabled()));

  await admin.uncheck('#cAtivo');
  await admin.waitForTimeout(200);
  check('Ao desligar, o ecrã diz já quantos produtos saem da ementa',
        /4 produto/.test(await admin.locator('#cAtivoDesc').textContent() || ''),
        await admin.locator('#cAtivoDesc').textContent());

  await admin.click('#btnGravarCat');
  await admin.waitForTimeout(800);
  check('O primeiro "Gravar" é recusado e pede confirmação, com o número',
        /4 produto/.test(await admin.locator('#catErro').textContent() || ''),
        await admin.locator('#catErro').textContent());
  check('...e o botão passa a dizer o que vai fazer',
        /mesmo assim/i.test(await admin.locator('#btnGravarCat').textContent() || ''),
        await admin.locator('#btnGravarCat').textContent());

  /* Mexer num campo cancela a confirmação: o "sim" era para o pedido
     que foi recusado, não para outro que se escreveu entretanto. */
  await admin.fill('#cDescricao', 'Para começar, mesmo');
  await admin.waitForTimeout(150);
  check('Mexer num campo cancela a confirmação pendente',
        (await admin.locator('#btnGravarCat').textContent() || '').trim() === 'Gravar',
        await admin.locator('#btnGravarCat').textContent());

  // Repete-se o caminho todo e confirma-se.
  await admin.click('#btnGravarCat');
  await admin.waitForTimeout(800);
  await admin.click('#btnGravarCat');
  await admin.waitForTimeout(900);
  check('O segundo carregar esconde mesmo a categoria',
        /Escondida/.test(await admin.locator('.cat-item', { hasText: 'Entradas' }).textContent() || ''),
        (await admin.locator('.cat-item', { hasText: 'Entradas' }).textContent() || '').replace(/\s+/g, ' '));

  /* A prova que interessa: os 4 produtos saem da ementa do cliente sem
     nenhum deles ter sido alterado. */
  await cliente.goto(`${CLIENTE}/menu.html?simular=1`);
  await cliente.waitForTimeout(2200);
  const menuSemEntradas = await cliente.evaluate(() => document.body.innerText);
  check('E os 4 produtos das Entradas saem da ementa do cliente',
        !/Abatata Frita/.test(menuSemEntradas) && !/Abate-Boca/.test(menuSemEntradas));

  // Voltar a ligar não precisa de confirmação: não esconde nada.
  await admin.locator('.cat-item', { hasText: 'Entradas' }).locator('.btn-editar').click();
  await admin.waitForSelector('#painelCategoria[open]', { timeout: 4000 });
  await admin.check('#cAtivo');
  await admin.click('#btnGravarCat');
  await admin.waitForTimeout(900);
  check('Voltar a ligar a categoria não pede confirmação nenhuma',
        !/Escondida/.test(await admin.locator('.cat-item', { hasText: 'Entradas' }).textContent() || ''));

  await cliente.goto(`${CLIENTE}/menu.html?simular=1`);
  await cliente.waitForTimeout(2200);
  check('E os produtos voltam à ementa, intactos',
        /Abatata Frita/.test(await cliente.evaluate(() => document.body.innerText)));

  /* Um nome repetido é uma recusa mesmo, e NÃO tem caminho de
     confirmação — o 409 não é sempre uma pergunta. */
  const recusa = await admin.evaluate(async () => {
    try {
      await chamarAPI('gestao/categorias/1', { method: 'PATCH', body: { nome: 'Bebidas' } });
      return 'passou';
    } catch (e) { return e && e.status ? String(e.status) : 'erro sem estado'; }
  });
  check('Um nome repetido devolve 409 e não tem confirmação que o desfaça',
        recusa === '409', recusa);

  /* ── 6. Nomes repetidos ─────────────────────────────────────────── */
  await admin.click('#btnNova');
  await admin.waitForSelector('#painelCategoria[open]', { timeout: 4000 });
  await admin.fill('#cNome', 'bebidas');          // minúsculas de propósito
  await admin.click('#btnGravarCat');
  await admin.waitForTimeout(500);
  check('Um nome repetido é recusado mesmo com maiúsculas diferentes',
        /já existe/i.test(await admin.locator('#catErro').textContent() || ''));

  await admin.fill('#cNome', 'Vinhos');
  await admin.fill('#cDescricao', 'Da casa e da região');
  await admin.click('#btnGravarCat');
  await admin.waitForTimeout(600);
  const comVinhos = await nomes(admin);
  check('Criar uma categoria acrescenta-a no fim da lista',
        comVinhos[comVinhos.length - 1] === 'Vinhos', comVinhos.join(' → '));
  check('E nasce vazia', /0 produtos/.test(
        await admin.locator('.cat-item', { hasText: 'Vinhos' }).locator('.cat-produtos').textContent() || ''));

  /* ── 7. Renomear arrasta os produtos ────────────────────────────── */
  await admin.locator('.cat-item', { hasText: 'Entradas' }).locator('.btn-editar').click();
  await admin.waitForSelector('#painelCategoria[open]', { timeout: 4000 });
  await admin.fill('#cNome', 'Para começar');
  await admin.click('#btnGravarCat');
  await admin.waitForTimeout(700);

  check('A categoria renomeada continua com os 4 produtos (não ficaram órfãos)',
        /4 produtos/.test(await admin.locator('.cat-item', { hasText: 'Para começar' }).locator('.cat-produtos').textContent() || ''));

  await admin.goto(`${GESTAO}/produtos.html?simular=1`);
  await admin.waitForSelector('#corpoTabela tr', { timeout: 8000 });
  const catsNoCatalogo = await admin.$$eval('#corpoTabela tr td:nth-child(3)', els => els.map(e => e.textContent.trim()));
  check('E os produtos passaram a ter a categoria nova no catálogo',
        catsNoCatalogo.includes('Para começar') && !catsNoCatalogo.includes('Entradas'),
        [...new Set(catsNoCatalogo)].join(' · '));

  /* ── 1. Quem não entra ──────────────────────────────────────────── */
  const coz = await login(ctx, 'cozinha@vemproabate.pt');
  check('A cozinha não tem o item "Categorias" na barra lateral',
        (await coz.locator('[data-nav-id="categorias"]').count()) === 0);
  await coz.goto(`${GESTAO}/categorias.html?simular=1`);
  await coz.waitForTimeout(1500);
  check('E escrever o endereço à mão devolve-a ao ecrã dela',
        /cozinha\.html/.test(coz.url()), coz.url());

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('F-51 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
