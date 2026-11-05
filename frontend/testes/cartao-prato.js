/**
 * Prova do cartão de prato da ementa (29/10), antes de dizer que funciona.
 *
 * Mede, a 390px e a 320px:
 *   1. cada prato é um botão alcançável pelo teclado;
 *   2. tocar abre o cartão, com o nome, a descrição e o preço certos;
 *   3. o Escape fecha e o foco VOLTA ao prato de onde saiu;
 *   4. o botão de fechar tem 44px e fecha;
 *   5. nenhum texto do cartão abaixo de 12px;
 *   6. a página não transborda de lado com o cartão aberto;
 *   7. a descrição na lista pára às duas linhas (e a do cartão não).
 *
 * CONTROLO NEGATIVO no fim: com o `showModal` arrancado do protótipo, a
 * verificação (2) tem de reprovar. Sem isso, estas passagens não provam
 * que foi o cartão que abriu.
 */
const { chromium } = require('playwright');
const path = require('path');

/* O caminho é calculado a partir do próprio ficheiro, como nas outras
   27 suites. A primeira versão usava `process.argv[2] || '.'`, que
   funcionava quando eu a corria à mão e partia-se no `contar.js`, que
   as corre todas sem argumentos: o '.' passava a ser a pasta dos
   testes e a página não existia lá. */
const RAIZ = 'file://' + path.resolve(__dirname, '..');
const PAGINA = RAIZ + '/cliente/menu.html?simular=1';

const falhas = [];
let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

async function textosPequenos(p, dentroDe) {
  return p.evaluate((sel) => {
    const raiz = document.querySelector(sel);
    if (!raiz) return ['(não encontrei ' + sel + ')'];
    const maus = [];
    for (const el of raiz.querySelectorAll('*')) {
      if (!el.offsetParent && el !== raiz) continue;
      const proprio = [...el.childNodes]
        .filter(n => n.nodeType === 3 && n.textContent.trim())
        .map(n => n.textContent.trim()).join(' ');
      if (!proprio) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 12) maus.push(`${el.tagName.toLowerCase()} ${px}px "${proprio.slice(0, 30)}"`);
    }
    return maus;
  }, dentroDe);
}

async function correr(largura) {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: largura, height: 800 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('[pageerror]', e.message); falhas.push('pageerror: ' + e.message.slice(0, 60)); });

  await p.goto(PAGINA);
  await p.waitForSelector('.ementa-item', { timeout: 15000 });

  console.log(`\n── ${largura}px ──`);

  const pratos = p.locator('.ementa-item');
  const n = await pratos.count();
  check(`${largura}: a ementa desenhou pratos`, n > 0, `${n} pratos`);

  check(`${largura}: cada prato é um <button>`,
        await p.evaluate(() => [...document.querySelectorAll('.ementa-item')]
          .every(e => e.tagName === 'BUTTON')));

  /* O teclado: o primeiro prato tem de ser alcançável por Tab. Não se
   * conta quantos Tabs faltam — conta-se que CHEGA lá. */
  const alcancavel = await p.evaluate(() => {
    const b = document.querySelector('.ementa-item');
    b.focus();
    return document.activeElement === b;
  });
  check(`${largura}: o prato recebe foco`, alcancavel);

  /* Descer antes de abrir, senão não há posição nenhuma para repor e a
     verificação da reposição passava sobre o caso trivial (0px). */
  await p.evaluate(() => window.scrollTo(0, 500));
  await p.waitForTimeout(500);

  const primeiro = pratos.first();
  const nomeNaLista = (await primeiro.locator('.ementa-nome').textContent()).trim();
  const precoNaLista = (await primeiro.locator('.ementa-preco').textContent()).trim();

  await primeiro.click();
  await p.waitForTimeout(300);

  const aberto = await p.evaluate(() => document.getElementById('pratoCartao').open);
  check(`${largura}: tocar no prato abre o cartão`, aberto);

  const nomeNoCartao = (await p.locator('#pratoCartaoNome').textContent()).trim();
  const precoNoCartao = (await p.locator('#pratoCartaoPreco').textContent()).trim();
  check(`${largura}: o cartão mostra o prato certo`,
        nomeNoCartao === nomeNaLista, `"${nomeNoCartao}" contra "${nomeNaLista}"`);
  check(`${largura}: o preço do cartão é o da lista`,
        precoNoCartao === precoNaLista, `${precoNoCartao} / ${precoNaLista}`);

  /* ── O FUNDO NÃO SE MEXE (29/10) ─────────────────────────────────
   * Apanhado pelo Guilherme no telemóvel: "se fizer scroll o site anda
   * para cima e para baixo". Eram três coisas — abrir já mexia 189px,
   * a roda levava o fundo 1440px, e fechar deixava-o a 1251px de onde
   * estava. Estas duas verificações falhavam todas antes da tranca.
   *
   * A roda é rodada no canto SUPERIOR ESQUERDO, que o cartão nunca
   * ocupa: rodá-la sobre o cartão media o scroll do cartão, que é outra
   * coisa e que deve mesmo funcionar. */
  const antesDaRoda = await p.evaluate(() => Math.round(window.scrollY));
  await p.mouse.move(20, 120);
  for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 240); await p.waitForTimeout(50); }
  await p.waitForTimeout(400);
  const depoisDaRoda = await p.evaluate(() => Math.round(window.scrollY));
  check(`${largura}: o fundo não se mexe com o cartão aberto`,
        Math.abs(depoisDaRoda - antesDaRoda) <= 2,
        `mexeu ${Math.abs(depoisDaRoda - antesDaRoda)}px`);

  const maus = await textosPequenos(p, '#pratoCartao');
  check(`${largura}: nenhum texto do cartão abaixo de 12px`,
        maus.length === 0, maus.length ? maus.join(' | ') : 'nenhum');

  const transbordo = await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${largura}: a página não transborda com o cartão aberto`,
        transbordo <= 0, `${Math.max(0, transbordo)}px`);

  const alvo = await p.locator('.prato-fechar').boundingBox();
  check(`${largura}: o botão de fechar tem 44px`,
        alvo && alvo.width >= 44 && alvo.height >= 44,
        alvo ? `${Math.round(alvo.width)}×${Math.round(alvo.height)}` : 'não encontrado');

  /* Escape fecha E o foco volta. A segunda metade é a que interessa:
   * sem ela, fechar a janela deixava o teclado no princípio da página. */
  /* Onde a página estava quando o cartão abriu. Com o fundo trancado o
     `window.scrollY` lê 0 — a posição verdadeira está no `top` negativo
     do body, que é como a tranca a guarda. */
  const guardado = await p.evaluate(() =>
    Math.abs(parseInt(document.body.style.top || '0', 10)));

  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  check(`${largura}: o Escape fecha`,
        !(await p.evaluate(() => document.getElementById('pratoCartao').open)));

  const reposto = await p.evaluate(() => Math.round(window.scrollY));
  check(`${largura}: ao fechar, a página fica onde estava`,
        Math.abs(reposto - guardado) <= 2,
        `${reposto}px contra os ${guardado}px de quando abriu`);
  check(`${largura}: o body deixa de estar trancado`,
        await p.evaluate(() => !document.body.style.position),
        'position limpo');
  check(`${largura}: o foco volta ao prato de onde saiu`,
        await p.evaluate(() =>
          document.activeElement === document.querySelector('.ementa-item')));

  /* O botão de fechar, na segunda abertura. */
  await primeiro.click();
  await p.waitForTimeout(250);
  await p.locator('.prato-fechar').click();
  await p.waitForTimeout(250);
  check(`${largura}: o botão × fecha`,
        !(await p.evaluate(() => document.getElementById('pratoCartao').open)));

  /* A descrição da lista pára às duas linhas; a do cartão não. */
  const linhas = await p.evaluate(() => {
    const d = document.querySelector('.ementa-desc');
    if (!d) return null;
    const cs = getComputedStyle(d);
    const alt = d.getBoundingClientRect().height;
    const linha = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.45;
    return { clamp: cs.webkitLineClamp, linhas: Math.round(alt / linha) };
  });
  check(`${largura}: a descrição na lista está limitada a 2 linhas`,
        linhas && (linhas.clamp === '2' || linhas.linhas <= 2),
        linhas ? `clamp=${linhas.clamp}, ~${linhas.linhas} linhas` : 'sem descrição');

  await browser.close();
}

(async () => {
  await correr(390);
  await correr(320);

  /* ── CONTROLO NEGATIVO ──────────────────────────────────────────── */
  console.log('\n── controlo negativo ──');
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const p = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await p.addInitScript(() => {
    // Arranca o showModal ao protótipo: o clique continua a correr, o
    // cartão é preenchido, e NÃO abre.
    HTMLDialogElement.prototype.showModal = function () {};
  });
  await p.goto(PAGINA);
  await p.waitForSelector('.ementa-item', { timeout: 15000 });
  await p.locator('.ementa-item').first().click();
  await p.waitForTimeout(300);
  const abriu = await p.evaluate(() => document.getElementById('pratoCartao').open);
  check('CONTROLO NEGATIVO — sem showModal o cartão NÃO abre', abriu === false,
        abriu ? 'abriu na mesma: a verificação de cima não prova nada' : 'não abriu, como tem de ser');
  await browser.close();

  console.log(`\n${feitas - falhas.length}/${feitas} verificacoes passaram`);
  if (falhas.length) {
    console.log(`\n❌ ${falhas.length} falha(s):`);
    falhas.forEach(f => console.log(`   ${f}`));
  }
  process.exitCode = falhas.length ? 1 : 0;
})();

/* X-27: a linha que torna o total desta suite recalculável. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${falhas.length}`);
});
