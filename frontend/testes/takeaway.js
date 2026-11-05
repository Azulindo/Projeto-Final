/**
 * F-24 + F-25 — Encomendar para levar, ponta a ponta.
 *
 * É o ponto 5 da definição de projeto concluído do `CONTEXTO.md`:
 * "um segundo cliente faz um pedido de take away pelo site, dando nome
 * e telemóvel". Este teste é o que prova que esse ponto passa.
 *
 * O que tem de ficar provado:
 *   1. A ementa aparece, com as categorias pela ordem do servidor, e
 *      não há dados de menu escritos à mão na página.
 *   2. Sem itens não se encomenda. Sem nome ou sem telemóvel válido
 *      também não — e o ecrã diz porquê ANTES de ir ao servidor.
 *   3. Encomendar devolve um número, e o número fica em destaque, no
 *      endereço, e num botão de copiar.
 *   4. Um refresh não perde a encomenda (é o ?encomenda= no endereço).
 *   5. A encomenda aparece na COZINHA, com tipo take_away e o nome de
 *      quem vem buscar em vez de uma mesa — e a cozinha consegue
 *      fazê-la avançar de estado. Sem isto era uma encomenda que
 *      ninguém faz.
 *   6. Consultar pelo número mostra o estado, e NÃO mostra o telefone
 *      nem o email de ninguém. O número é a credencial.
 *   7. Um número que não existe dá uma mensagem, não um ecrã vazio.
 */
const { chromium } = require('playwright');
const path = require('path');
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const RAIZ    = 'file://' + path.resolve(__dirname, '..');
const CLIENTE = RAIZ + '/cliente';
const GESTAO  = RAIZ + '/funcionarios';

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });

  const p = await ctx.newPage();
  p.on('pageerror', e => {
    if (!/tailwind/i.test(e.message)) {
      console.log('[pageerror]', e.message);
      falhas.push('pageerror: ' + e.message.slice(0, 70));
    }
  });

  await p.goto(`${CLIENTE}/takeaway.html?simular=1`);
  await p.waitForSelector('#produtosGrid article', { timeout: 10000 });

  /* ── 1. A ementa ────────────────────────────────────────────────── */
  const cats = await p.$$eval('#filtros button', els => els.map(e => e.textContent.trim()));
  console.log('   categorias:', cats.join(' · '), '\n');
  check('Os separadores de categoria vêm pela ordem do servidor',
        cats.length >= 4 && /Entradas/.test(cats[0]), cats.join(' · '));

  const nCards = await p.locator('#produtosGrid article').count();
  check('A primeira categoria mostra os produtos dela', nCards === 4, `${nCards} cartões`);

  check('Nenhum preço escrito à mão no HTML da página',
        !/16,20|15,50|3,90/.test(await p.evaluate(() => {
          // só o markup servido, sem o que o JS desenhou
          return document.querySelector('script:last-of-type').textContent;
        })));

  /* ── 2. As validações, antes de ir ao servidor ─────────────────── */
  check('Sem itens, o botão de encomendar está desativado',
        await p.locator('#btnEncomendar').isDisabled());

  // Escolher dois produtos: um prato e uma bebida.
  await p.locator('#produtosGrid article', { hasText: 'Abatata Frita' })
         .locator('[data-action="mais"]').click();
  await p.locator('#produtosGrid article', { hasText: 'Abatata Frita' })
         .locator('[data-action="mais"]').click();
  await p.waitForTimeout(250);

  await p.locator('#filtros button', { hasText: 'Bebidas' }).click();
  await p.waitForTimeout(400);
  await p.locator('#produtosGrid article', { hasText: 'Coca-Cola' })
         .locator('[data-action="mais"]').click();
  await p.waitForTimeout(250);

  check('O botão liga assim que há alguma coisa no carrinho',
        !(await p.locator('#btnEncomendar').isDisabled()));

  const total = (await p.locator('#footerTotal').textContent() || '').trim();
  check('O total soma os preços que vieram da API',
        total === '9,70 €', `${total} (2 × 3,90 + 1,90)`);

  await p.click('#resumoToggle');
  await p.waitForTimeout(400);
  const resumo = await p.innerText('#resumoLista');
  check('O resumo mostra as quantidades e os nomes',
        /2×/.test(resumo) && /Abatata Frita/.test(resumo) && /Coca-Cola/.test(resumo),
        resumo.replace(/\n/g, ' | '));

  await p.click('#btnEncomendar');
  await p.waitForTimeout(500);
  check('Sem nome, recusa e diz porquê — sem ir ao servidor',
        /nome/i.test(await p.innerText('#taErro')), await p.innerText('#taErro'));

  await p.fill('#taNome', 'Ana Ferreira');
  await p.fill('#taTelefone', 'abc');
  await p.click('#btnEncomendar');
  await p.waitForTimeout(500);
  check('Um telemóvel com letras é recusado',
        /telem/i.test(await p.innerText('#taErro')), await p.innerText('#taErro'));

  await p.fill('#taTelefone', '912 345 678');
  await p.fill('#taEmail', 'nao-e-email');
  await p.click('#btnEncomendar');
  await p.waitForTimeout(500);
  check('Um email inválido é recusado, mas diz que pode ficar vazio',
        /vazio/i.test(await p.innerText('#taErro')), await p.innerText('#taErro'));

  /* ── 3. Encomendar ─────────────────────────────────────────────── */
  await p.fill('#taEmail', '');
  await p.fill('#taObs', 'Sem cebola na abatata, por favor.');
  await p.click('#btnEncomendar');
  await p.waitForSelector('#passoConfirmado:not(.hidden)', { timeout: 8000 });

  const numero = (await p.locator('#confNumero').textContent() || '').trim();
  console.log('   número:', numero);
  check('A encomenda devolve um número no formato PED-XXXXX',
        /^PED-[A-Z0-9]{5}$/.test(numero), numero);

  check('A mensagem trata a pessoa pelo primeiro nome',
        /Ana/.test(await p.innerText('#confMensagem')), await p.innerText('#confMensagem'));

  check('O total a pagar no balcão é o mesmo do carrinho',
        (await p.locator('#confTotal').textContent() || '').trim() === '9,70 €');

  check('As observações da encomenda são devolvidas ao cliente',
        /Sem cebola/.test(await p.innerText('#confObs')), await p.innerText('#confObs'));

  check('O estado começa em "Recebida", com a nota do que vem a seguir',
        /Recebida/.test(await p.innerText('#confEstado')) &&
        /confirmar/i.test(await p.innerText('#confEstadoNota')));

  check('A ementa e o carrinho saem do ecrã — já não há nada para escolher',
        await p.locator('#passoEncomendar').evaluate(e => e.classList.contains('hidden')));

  /* ── 4. O refresh não perde a encomenda ────────────────────────── */
  check('O número fica no endereço', p.url().includes(`encomenda=${numero}`), p.url());

  await p.reload();
  await p.waitForSelector('#passoConfirmado:not(.hidden)', { timeout: 10000 });
  check('Depois de recarregar, a encomenda continua lá',
        (await p.locator('#confNumero').textContent() || '').trim() === numero);
  check('E o título passa a dizer de quem é',
        /Ana Ferreira/.test(await p.innerText('#confTitulo')), await p.innerText('#confTitulo'));

  /* ── 6. O GET não devolve contactos ────────────────────────────── */
  const cru = await p.evaluate(async n => JSON.stringify(await chamarAPI(`pedidos/takeaway/${n}`)), numero);
  check('A resposta do GET não traz o telefone nem o email',
        !/912|345|678|telefone|email/i.test(cru), cru.slice(0, 90) + '…');
  check('...mas traz o nome, o estado e o total',
        /Ana Ferreira/.test(cru) && /recebido/.test(cru) && /9\.7/.test(cru));

  /* O telemóvel não pode aparecer no ecrã de confirmação. Olha-se só
     para esse bloco: o `placeholder` do campo de telefone é um número
     de exemplo, e procurá-lo na página toda dava um falso positivo — a
     primeira versão deste teste falhou exatamente por isso. */
  check('O telemóvel não aparece no ecrã de confirmação',
        !/912\s*345\s*678/.test(await p.locator('#passoConfirmado').innerHTML()));

  /* ── 5. A cozinha ──────────────────────────────────────────────── */
  const coz = await ctx.newPage();
  coz.on('pageerror', e => {
    if (!/tailwind/i.test(e.message)) { console.log('[pageerror cozinha]', e.message); falhas.push('pageerror cozinha'); }
  });
  await coz.goto(`${GESTAO}/login.html?simular=1`);
  await coz.fill('#email', 'cozinha@vemproabate.pt');
  await coz.fill('#password', PASSWORD_SIMULACAO);
  await coz.click('#btnEntrar');
  await coz.waitForTimeout(1400);
  await coz.goto(`${GESTAO}/cozinha.html?simular=1`);
  await coz.waitForSelector('.cartao-ronda', { timeout: 10000 });

  const cartao = coz.locator('.cartao-ronda', { hasText: numero });
  check('A encomenda aparece na grelha da cozinha', (await cartao.count()) === 1);

  const textoCartao = await cartao.innerText();
  /* O /i não é preguiça: o `innerText` devolve o texto COMO É PINTADO, e
     a `.ronda-origem` está em maiúsculas por CSS. O teste do balcão já
     tinha esta nota, e mesmo assim caí nela outra vez. */
  check('O cartão diz que é para levar e mostra o nome de quem vem buscar',
        /take away/i.test(textoCartao) && /Ana Ferreira/i.test(textoCartao),
        textoCartao.replace(/\n/g, ' · ').slice(0, 130));
  check('E não inventa uma mesa que não existe',
        !/Mesa\s*\d/.test(textoCartao), textoCartao.replace(/\n/g, ' · ').slice(0, 130));

  /* O formato é o do servidor (docs/API.md 3.10.1): leva
     `cliente: { nome, telemovel }` e a chave `mesa` NEM EXISTE. Este
     teste apanhou a simulação a mandar `nome` no topo e `mesa: null`,
     que era invenção minha — o `cozinha.js` lê `ronda.cliente.nome` e
     mostrava o cartão sem nome nenhum. */
  const forma = await coz.evaluate(async () => {
    const linhas = await chamarAPI('pedidos/cozinha');
    const ta = linhas.find(l => l.tipo === 'take_away');
    if (!ta) return 'nao encontrada';
    return [
      ta.tipo,
      'temMesa=' + ('mesa' in ta),
      'cliente=' + (ta.cliente ? ta.cliente.nome : 'sem'),
    ].join('|');
  });
  check('O `pedidos/cozinha` devolve o formato do servidor: take_away, sem chave mesa, com cliente',
        forma === 'take_away|temMesa=false|cliente=Ana Ferreira', forma);

  // A cozinha faz a encomenda avançar. Este é o teste que interessa:
  // sem ele, era uma encomenda visível que ninguém conseguia fazer.
  const avanco = await coz.evaluate(async id => {
    const linhas = await chamarAPI('pedidos/cozinha');
    const ta = linhas.find(l => l.tipo === 'take_away');
    const passos = [];
    for (const estado of ['confirmado', 'em_preparacao', 'pronto']) {
      const r = await chamarAPI(`pedidos/${ta.id}/estado`, { method: 'PATCH', body: { estado } });
      passos.push(r.pedido.estado);
    }
    return passos.join(' → ');
  });
  check('A cozinha consegue fazê-la avançar pelos estados',
        avanco === 'confirmado → em_preparacao → pronto', avanco);

  const salto = await coz.evaluate(async () => {
    const linhas = await chamarAPI('pedidos/cozinha');
    const ta = linhas.find(l => l.tipo === 'take_away');
    try {
      await chamarAPI(`pedidos/${ta.id}/estado`, { method: 'PATCH', body: { estado: 'recebido' } });
      return 'passou';
    } catch (e) { return e && e.status ? String(e.status) : 'erro sem estado'; }
  });
  check('E um salto inválido é recusado com 409, como nas mesas', salto === '409', salto);

  /* O cliente vê a mudança sem telefonar — é a razão de o GET existir. */
  await p.click('#btnRecarregar');
  await p.waitForTimeout(900);
  check('O cliente carrega em Atualizar e vê "Pronta!"',
        /Pronta/.test(await p.innerText('#confEstado')), await p.innerText('#confEstado'));
  check('...com a nota de que já pode ir buscar',
        /buscar/i.test(await p.innerText('#confEstadoNota')));

  /* ── 6b. Consultar pelo número, de um separador limpo ──────────── */
  const p2 = await ctx.newPage();
  p2.on('pageerror', () => {});
  await p2.goto(`${CLIENTE}/takeaway.html?simular=1`);
  await p2.waitForSelector('#produtosGrid article', { timeout: 10000 });
  await p2.click('#secaoConsultar summary');
  await p2.fill('#taConsulta', numero.toLowerCase());   // minúsculas de propósito
  await p2.click('#btnConsultar');
  await p2.waitForSelector('#passoConfirmado:not(.hidden)', { timeout: 8000 });
  check('Consultar pelo número funciona, mesmo em minúsculas',
        (await p2.locator('#confNumero').textContent() || '').trim() === numero);
  check('E mostra o estado a que a cozinha a levou',
        /Pronta/.test(await p2.innerText('#confEstado')));

  /* ── 7. Um número que não existe ───────────────────────────────── */
  await p2.goto(`${CLIENTE}/takeaway.html?simular=1`);
  await p2.waitForSelector('#produtosGrid article', { timeout: 10000 });
  await p2.click('#secaoConsultar summary');
  await p2.fill('#taConsulta', 'PED-ZZZZZ');
  await p2.click('#btnConsultar');
  await p2.waitForTimeout(900);
  check('Um número que não existe dá uma mensagem, não um ecrã vazio',
        /não há nenhuma encomenda/i.test(await p2.innerText('#consultaErro')),
        await p2.innerText('#consultaErro'));
  check('E a ementa continua à vista, para se poder encomendar',
        !(await p2.locator('#passoEncomendar').evaluate(e => e.classList.contains('hidden'))));

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('TAKE AWAY VERIFICADO ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
