/**
 * F-21 — A observação por item, do dedo do cliente ao destaque da cozinha.
 *
 * ── PORQUE É QUE ISTO NÃO EXISTIA ───────────────────────────────────
 * A F-21 estava marcada 🔁, varrida para o bloco das tarefas do chatbot
 * que a `mesa.html` substituiu. Mas a `mesa.html` nunca teve campo de
 * observações: até 10/09 a palavra "observações" não aparecia uma única
 * vez no ficheiro, e o `enviarPedido()` mandava só
 * `{ produtoId, quantidade }`.
 *
 * **Estava tudo o resto construído à volta:** a coluna na base de dados,
 * o `POST /mesas/:token/pedir` a aceitar `observacao` por item, a
 * simulação daqui a guardá-la, e o ecrã da cozinha a mostrá-la num
 * destaque amarelo. O "Sem cebola" que se via nesse destaque vinha do
 * `seed.sql` e de testes por terminal. **Nenhum cliente à mesa
 * conseguia escrever um.**
 *
 * Um aviso em destaque alimentado por nada, e é o que um restaurante
 * mais precisa de receber: uma alergia, uma vela de aniversário.
 *
 * Este teste segue o caminho inteiro, porque o problema era precisamente
 * ter as pontas feitas e o meio vazio.
 */
const { chromium } = require('playwright');
const path = require('path');
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const RAIZ    = 'file://' + path.resolve(__dirname, '..');
const CLIENTE = RAIZ + '/cliente';
const GESTAO  = RAIZ + '/funcionarios';
const TOKEN    = 'demo-mesa-4';

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

const cartao = (p, nome) => p.locator('#produtosGrid article', { hasText: nome });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });

  const mesa = await ctx.newPage();
  mesa.on('pageerror', e => {
    if (!/tailwind/i.test(e.message)) {
      console.log('[pageerror]', e.message);
      falhas.push('pageerror: ' + e.message.slice(0, 70));
    }
  });

  await mesa.goto(`${CLIENTE}/mesa.html?t=${TOKEN}&simular=1`);
  await mesa.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await mesa.goto(`${CLIENTE}/mesa.html?t=${TOKEN}&simular=1`);
  await mesa.waitForSelector('#produtosGrid article', { timeout: 12000 });

  /* ── 1. A nota só aparece depois de o item entrar no carrinho ───── */
  const abatata = cartao(mesa, 'Abatata Frita');
  check('Antes de escolher, o cartão não mostra campo de nota nenhum',
        await abatata.locator('.nota-item').isHidden());

  await abatata.locator('[data-action="mais"]').click();
  await mesa.waitForTimeout(300);
  check('Escolher um item faz aparecer o "＋ Adicionar nota"',
        await abatata.locator('.nota-item').isVisible());

  /* ── 2. Escrever a nota ─────────────────────────────────────────── */
  await abatata.locator('[data-action="abrir-nota"]').click();
  await abatata.locator('textarea').fill('Sem cebola — alergia');
  await abatata.locator('textarea').blur();
  await mesa.waitForTimeout(300);

  check('A nota fica à vista no cartão depois de escrita',
        /Sem cebola/.test(await abatata.locator('[data-nota-lida]').textContent() || ''));
  check('E o botão passa a dizer "Alterar nota", não "Adicionar"',
        /Alterar/.test(await abatata.locator('[data-action="abrir-nota"]').textContent() || ''));

  /* ── 3. E também no resumo, que é o último sítio antes de enviar ── */
  await mesa.click('#resumoToggle');
  await mesa.waitForTimeout(450);
  check('A nota aparece no resumo, antes de carregar em "Pedir Itens"',
        /Sem cebola/.test(await mesa.innerText('#resumoLista')),
        (await mesa.innerText('#resumoLista')).replace(/\n/g, ' | ').slice(0, 110));

  /* ── 4. Uma segunda nota, noutro item e noutra categoria ────────── */
  await mesa.locator('#filtros button', { hasText: 'Sobremesas' }).click();
  await mesa.waitForTimeout(450);
  const taca = cartao(mesa, 'Taça Gelada');
  await taca.locator('[data-action="mais"]').click();
  await mesa.waitForTimeout(250);
  await taca.locator('[data-action="abrir-nota"]').click();
  await taca.locator('textarea').fill('Com vela, é aniversário');
  await taca.locator('textarea').blur();
  await mesa.waitForTimeout(300);

  /* ── 5. Tirar do carrinho apaga a nota ──────────────────────────
     Sem isto, tirar o item e voltar a pô-lo trazia de volta uma nota
     que a pessoa já tinha desistido de pedir — e ia para a cozinha. */
  await mesa.locator('#filtros button', { hasText: 'Entradas' }).click();
  await mesa.waitForTimeout(450);
  const cerveja = cartao(mesa, 'Vem Pro Abacate');
  await cerveja.locator('[data-action="mais"]').click();
  await mesa.waitForTimeout(200);
  await cerveja.locator('[data-action="abrir-nota"]').click();
  await cerveja.locator('textarea').fill('nota que vai ser desistida');
  await cerveja.locator('textarea').blur();
  await mesa.waitForTimeout(250);
  await cerveja.locator('[data-action="menos"]').click();   // volta a zero
  await mesa.waitForTimeout(300);

  check('Tirar o item do carrinho esconde a nota outra vez',
        await cerveja.locator('.nota-item').isHidden());

  await cerveja.locator('[data-action="mais"]').click();
  await mesa.waitForTimeout(300);
  check('E voltar a pô-lo NÃO traz de volta a nota desistida',
        (await cerveja.locator('textarea').inputValue()) === '',
        `"${await cerveja.locator('textarea').inputValue()}"`);
  await cerveja.locator('[data-action="menos"]').click();
  await mesa.waitForTimeout(250);

  /* Um terceiro item SEM nota. É ele que dá sentido ao "só nos que
     têm": sem um item limpo no pedido, essa asserção não prova nada. */
  const alho = cartao(mesa, "Vem p'ro Alho");
  await alho.locator('[data-action="mais"]').click();
  await mesa.waitForTimeout(300);

  /* ── 6. O que vai no pedido ─────────────────────────────────────── */
  const enviado = [];
  await mesa.evaluate(() => {
    window.__corpos = [];
    const original = window.chamarAPI;
    window.chamarAPI = function (caminho, opcoes) {
      if (opcoes && opcoes.method === 'POST' && /\/pedir$/.test(caminho)) {
        window.__corpos.push(JSON.parse(JSON.stringify(opcoes.body)));
      }
      return original.apply(this, arguments);
    };
  });

  await mesa.click('#btnPedirItens');
  await mesa.waitForTimeout(1600);

  const corpo = await mesa.evaluate(() => window.__corpos[0]);
  const comObs = (corpo.itens || []).filter(i => i.observacao);
  check('O pedido leva a `observacao` por item, e só nos que têm',
        comObs.length === 2 && corpo.itens.length === 3,
        `${corpo.itens.length} itens, ${comObs.length} com nota: ` +
        JSON.stringify(corpo.itens));
  check('As duas notas certas, nos dois produtos certos',
        comObs.some(i => /Sem cebola/.test(i.observacao)) &&
        comObs.some(i => /Com vela/.test(i.observacao)),
        comObs.map(i => i.observacao).join(' · '));
  check('E os itens sem nota não levam `observacao: null` a mais',
        !(corpo.itens.some(i => 'observacao' in i && !i.observacao)));

  /* Verifica-se pelo ECRÃ e não pelo `state`: ele vive dentro do
     `DOMContentLoaded` do ficheiro e não é alcançável de fora. Mais vale
     assim — o que interessa é o que a pessoa à mesa vê depois de
     enviar, não o valor de uma variável. */
  await mesa.waitForTimeout(400);
  const totalDepois = (await mesa.locator('#footerTotal').textContent() || '').trim();
  check('Depois de enviar, o carrinho fica a zero', totalDepois === '0,00 €', totalDepois);

  const notasVisiveis = await mesa.locator('.nota-item:visible').count();
  check('E não sobra nenhuma nota à vista nos cartões',
        notasVisiveis === 0, `${notasVisiveis} visíveis`);

  const semPorEnviar = await mesa.innerText('#resumoLista');
  check('O resumo passa a mostrar os itens como enviados, sem notas pendentes',
        !/por enviar/.test(semPorEnviar), semPorEnviar.replace(/\n/g, ' | ').slice(0, 110));

  /* ── 7. A COZINHA ───────────────────────────────────────────────
     O destaque amarelo que estava alimentado por nada. */
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
  await coz.waitForSelector('.cartao-ronda', { timeout: 12000 });

  const texto = await coz.innerText('.cartao-ronda');
  check('A cozinha recebe o "Sem cebola" que o cliente escreveu à mesa',
        /Sem cebola/i.test(texto), texto.replace(/\n/g, ' · ').slice(0, 150));
  check('E o "Com vela" da sobremesa',
        /Com vela/i.test(texto));

  /* O destaque é a razão de isto interessar: uma alergia não pode
     aparecer como texto igual ao resto. */
  const destacadas = await coz.$$eval('.item-observacao, .ronda-obs, [class*="observacao"]',
    els => els.map(e => e.textContent.trim()));
  check('As notas aparecem no destaque próprio, não misturadas no nome do prato',
        destacadas.some(t => /Sem cebola/i.test(t)),
        destacadas.join(' | ').slice(0, 130) || 'nenhum elemento de destaque');

  /* ── 8. XSS: a nota é texto de um desconhecido ───────────────────
     Vem de quem estiver à mesa, e vai para um ecrã interno. É o mesmo
     raciocínio do X-01 com o nome da reserva. */
  await mesa.goto(`${CLIENTE}/mesa.html?t=${TOKEN}&simular=1`);
  await mesa.waitForSelector('#produtosGrid article', { timeout: 12000 });
  const alvo = cartao(mesa, 'Abatata Frita');
  await alvo.locator('[data-action="mais"]').click();
  await mesa.waitForTimeout(250);
  await alvo.locator('[data-action="abrir-nota"]').click();
  await alvo.locator('textarea').fill('<img src=x onerror="window.__xss=1">');
  await alvo.locator('textarea').blur();
  await mesa.waitForTimeout(350);

  check('Uma nota com HTML fica como TEXTO no cartão, não é interpretada',
        (await mesa.evaluate(() => window.__xss)) === undefined &&
        (await alvo.locator('[data-nota-lida]').innerHTML()).includes('&lt;img'),
        (await alvo.locator('[data-nota-lida]').innerHTML()).slice(0, 80));

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('F-21 VERIFICADA ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
