/**
 * F-61 — Reservas no painel de gestão.
 *
 * O que tem de ficar provado:
 *   1. A tabela abre e mostra as reservas de hoje até sete dias, pela
 *      ordem do contrato (data, hora, código — docs/API.md 4.14).
 *   2. O aviso de stock baixo aparece na reserva que pré-selecionou um
 *      prato em baixo e NAO aparece na que pre-selecionou um que esta
 *      bem. Um aviso que so se ve a disparar nao ensina quando esta
 *      calado — e o erro que a cozinha fez e que o Joao apanhou.
 *   3. Uma sessao de COZINHA nao ve a seccao: o `gestao/reservas` so
 *      aceita administrador e balcao, e pedi-lo dava 403.
 *   4. Com o `gestao/stock` a dar 403 (que e o que acontece a um
 *      BALCAO a serio), a tabela aparece toda, nao se inventa aviso
 *      nenhum, e o ecra DIZ que o aviso nao esta disponivel. Esta e a
 *      verificacao que interessa: a simulacao nao verifica niveis, por
 *      isso sem forcar o 403 este ramo nunca era tocado.
 *   5. Os codigos sao `RSV-` e usam o alfabeto do gerador a serio.
 *   6. Um codigo copiado da tabela consulta-se na pagina do cliente, e
 *      essa consulta NAO devolve o telemovel.
 *   7. Os 400 do contrato: data malformada, dias fora de 1-90, estado
 *      inexistente.
 *
 * Tudo com `?simular=1`, pela mesma razao dos outros: o `auth/login`
 * fala com o Render a serio desde 04/09, e um teste que precisa da
 * nuvem deixa de se poder correr antes de um commit.
 */
const { chromium } = require('playwright');
const path = require('path');
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const GESTAO = 'file://' + path.resolve(__dirname, '..', 'funcionarios');

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '\u2705' : '\u274c'} ${n}${e ? ' \u2014 ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

async function entrar(ctx, email) {
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', PASSWORD_SIMULACAO);
  await p.click('#btnEntrar');
  await p.waitForTimeout(1500);
  p._erros = erros;
  return p;
}

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  /* ── ADMINISTRADOR ─────────────────────────────────────────────── */
  console.log('\nADMINISTRADOR');
  const admin = await entrar(ctx, 'admin@vemproabate.pt');
  await admin.goto(`${GESTAO}/dashboard.html?simular=1`);
  await admin.waitForSelector('#corpoReservas tr', { timeout: 15000 });

  const linhas = await admin.locator('#corpoReservas tr').count();
  check('a tabela tem linhas', linhas >= 6, `tinha ${linhas}`);

  const secaoVisivel = await admin.locator('#secaoReservas').isVisible();
  check('a secção está visível', secaoVisivel);

  const resumo = (await admin.locator('#resumoReservasTexto').innerText()).trim();
  check('o resumo fala de hoje', /reservas? para hoje/.test(resumo), resumo);
  check('o resumo conta pessoas', /pessoas?/.test(resumo), resumo);
  check('o resumo conta as pendentes', /por confirmar/.test(resumo), resumo);

  /* O aviso tem de aparecer na Tábua (id 10, 2<=4) e NÃO na Picanha
     (id 9, 12>6). É o ponto todo do teste. */
  const linhaAna = admin.locator('#corpoReservas tr', { hasText: 'Ana Loureiro' });
  const linhaBruno = admin.locator('#corpoReservas tr', { hasText: 'Bruno Esteves' });

  const avisoAna = await linhaAna.locator('.res-aviso-stock').count();
  check('a Ana leva aviso (Tábua está em baixo)', avisoAna === 1, `tinha ${avisoAna}`);

  const textoAviso = avisoAna ? await linhaAna.locator('.res-aviso-stock').innerText() : '';
  check('o aviso nomeia o prato', /Tábua/i.test(textoAviso), textoAviso);
  check('o aviso NÃO nomeia a Abatata (não está em baixo)',
        !/Abatata/i.test(textoAviso), textoAviso);

  const avisoBruno = await linhaBruno.locator('.res-aviso-stock').count();
  check('o Bruno NÃO leva aviso (Picanha não está em baixo)',
        avisoBruno === 0, `tinha ${avisoBruno}`);

  /* Um aviso que só se vê a disparar não ensina quando está calado. */
  check('há linhas com aviso e linhas sem',
        avisoAna === 1 && avisoBruno === 0);

  const notaEscondida = await admin.locator('#notaStockReservas').isHidden();
  check('a nota "sem stock" está escondida para o admin', notaEscondida);

  const hoje = admin.locator('#corpoReservas tr.res-hoje');
  check('as de hoje estão marcadas', (await hoje.count()) >= 3,
        `tinha ${await hoje.count()}`);
  const textoHoje = await hoje.first().innerText();
  check('a linha de hoje diz "Hoje"', /Hoje/i.test(textoHoje), textoHoje);

  const morta = await admin.locator('#corpoReservas tr.res-morta').count();
  check('a cancelada está marcada como morta', morta === 1, `tinha ${morta}`);

  const codigos = await admin.locator('#corpoReservas .res-codigo').allInnerTexts();
  check('os códigos dizem RSV- e não RES-',
        codigos.length > 0 && codigos.every(c => /^RSV-/.test(c.trim())),
        codigos.join(' '));

  const tel = admin.locator('#corpoReservas .res-tel').first();
  check('o telemóvel é um link tel:',
        /^tel:/.test(await tel.getAttribute('href')),
        await tel.getAttribute('href'));

  const semEmenta = await admin.locator('#corpoReservas .res-sem-ementa').count();
  check('as sem pré-seleção dizem "No restaurante"', semEmenta >= 3,
        `tinha ${semEmenta}`);

  const valor = await linhaAna.locator('.res-valor').innerText();
  check('o valor estimado leva o ≈ e a vírgula', /≈ \d+,\d{2} €/.test(valor), valor);

  /* A ordem: data, depois hora. */
  const quandos = await admin.locator('#corpoReservas td:first-child').allInnerTexts();
  const horas = quandos.map(t => (t.match(/\d{2}:\d{2}/) || [''])[0]);
  check('as três de hoje saem por hora crescente',
        horas[0] === '13:00' && horas[1] === '20:00' && horas[2] === '21:00',
        horas.slice(0, 3).join(' '));

  /* O texto velho tinha de sair. */
  const falta = await admin.locator('.placeholder-falta').innerText();
  check('o cartão já não diz que a F-61 está por construir',
        !/F-61/.test(falta) && !/por construir/i.test(falta), falta);

  check('sem erros de JavaScript (admin)', admin._erros.length === 0,
        admin._erros.join(' | '));

  /* ── BALCÃO ────────────────────────────────────────────────────── */
  console.log('\nBALCÃO');
  const balcao = await entrar(ctx, 'balcao@vemproabate.pt');
  await balcao.goto(`${GESTAO}/dashboard.html?simular=1`);
  await balcao.waitForSelector('#corpoReservas tr', { timeout: 15000 });

  const linhasB = await balcao.locator('#corpoReservas tr').count();
  check('o balcão vê as reservas', linhasB >= 6, `tinha ${linhasB}`);
  check('sem erros de JavaScript (balcão)', balcao._erros.length === 0,
        balcao._erros.join(' | '));

  /* ── O 403 DO STOCK, A SÉRIO ──────────────────────────────────────
     A simulação NÃO verifica níveis (de propósito — ver o comentário no
     api.js), por isso um balcão simulado lê o `gestao/stock` sem
     problema e a nota nunca aparece. Quer dizer que o teste de cima
     passa sem tocar no ramo que interessa: era mais uma verificação a
     passar por não estar a olhar para a coisa certa.
     Aqui força-se o 403 que o servidor a sério dá, substituindo o
     `chamarAPI` só para o caminho do stock. */
  console.log('\nBALCÃO COM O 403 DO STOCK FORÇADO');
  const b403 = await ctx.newPage();
  const erros403 = [];
  b403.on('pageerror', e => erros403.push(e.message));
  await b403.goto(`${GESTAO}/dashboard.html?simular=1`);
  await b403.evaluate(() => {
    const original = window.chamarAPI;
    window.chamarAPI = function (caminho, opcoes) {
      if (/^gestao\/stock/.test(caminho)) {
        const e = new Error('Não tens permissão para ver o stock.');
        e.status = 403;
        return Promise.reject(e);
      }
      return original(caminho, opcoes);
    };
  });
  await b403.evaluate(() => carregarReservas(obterSessao()));
  await b403.waitForSelector('#corpoReservas tr', { timeout: 15000 });

  const linhas403 = await b403.locator('#corpoReservas tr').count();
  check('o 403 no stock NÃO impede as reservas de aparecer',
        linhas403 >= 6, `tinha ${linhas403}`);

  const notaVisivel = await b403.locator('#notaStockReservas').isVisible();
  check('a nota "o aviso não aparece nesta sessão" aparece', notaVisivel);

  const avisos403 = await b403.locator('#corpoReservas .res-aviso-stock').count();
  check('e não se inventa aviso nenhum', avisos403 === 0, `tinha ${avisos403}`);

  /* A ementa continua a mostrar-se: o que falta é o AVISO, não os
     pratos. Se a célula ficasse vazia perdia-se informação que o
     `gestao/reservas` trouxe e que não depende do stock. */
  const itens403 = await b403.locator('#corpoReservas .res-itens').count();
  check('os pratos pré-selecionados continuam à vista', itens403 === 2,
        `tinha ${itens403}`);

  check('sem erros de JavaScript (403 forçado)', erros403.length === 0,
        erros403.join(' | '));

  await b403.screenshot({ path: path.resolve(__dirname, '_capturas', 'f61-balcao-403.png'), fullPage: true });

  /* ── COZINHA ───────────────────────────────────────────────────── */
  console.log('\nCOZINHA');
  const coz = await entrar(ctx, 'cozinha@vemproabate.pt');
  await coz.goto(`${GESTAO}/dashboard.html?simular=1`);
  await coz.waitForTimeout(1800);

  const secao = await coz.locator('#secaoReservas').count();
  check('a secção é removida para a cozinha', secao === 0, `tinha ${secao}`);
  const corpo = await coz.locator('#conteudoPagina').innerText();
  check('a cozinha não vê a palavra Reservas no conteúdo',
        !/Reservas/i.test(corpo), corpo.slice(0, 160));
  check('a cozinha continua a ver as boas-vindas',
        /Bem-vindo/i.test(corpo));
  check('sem erros de JavaScript (cozinha)', coz._erros.length === 0,
        coz._erros.join(' | '));

  /* ── O código na página do cliente ─────────────────────────────── */
  console.log('\nO MESMO CÓDIGO, VISTO PELO CLIENTE');
  const consulta = await coz.evaluate(async () => {
    try {
      const r = await chamarAPI('reservas/RSV-DEMA2');
      return { ok: true, nome: r.reserva.nome, tel: r.reserva.telemovel,
               itens: r.itens.length, id: r.reserva.id };
    } catch (e) { return { ok: false, erro: e.message }; }
  });
  check('um código da tabela consulta-se na página do cliente',
        consulta.ok && consulta.nome === 'Ana Loureiro', JSON.stringify(consulta));
  check('e NÃO devolve o telemóvel a quem só sabe o código',
        consulta.ok && consulta.tel === undefined, JSON.stringify(consulta));
  check('a reserva fixa tem id', consulta.ok && consulta.id === 90001,
        JSON.stringify(consulta));

  /* ── Os 400 do contrato ────────────────────────────────────────── */
  console.log('\nOS ERROS DO CONTRATO (4.14)');
  const erros400 = await coz.evaluate(async () => {
    const tentar = async cam => {
      try { await chamarAPI(cam); return 'passou'; }
      catch (e) { return e.status; }
    };
    return {
      dataMa:   await tentar('gestao/reservas?data=13-09-2026'),
      diasZero: await tentar('gestao/reservas?dias=0'),
      dias91:   await tentar('gestao/reservas?dias=91'),
      estadoMau: await tentar('gestao/reservas?estado=talvez'),
      diasBom:  await tentar('gestao/reservas?dias=14'),
    };
  });
  check('data malformada dá 400', erros400.dataMa === 400, String(erros400.dataMa));
  check('dias=0 dá 400', erros400.diasZero === 400, String(erros400.diasZero));
  check('dias=91 dá 400', erros400.dias91 === 400, String(erros400.dias91));
  check('estado inexistente dá 400', erros400.estadoMau === 400, String(erros400.estadoMau));
  check('dias=14 passa', erros400.diasBom === 'passou', String(erros400.diasBom));

  await admin.screenshot({ path: path.resolve(__dirname, '_capturas', 'f61-admin.png'), fullPage: true });
  await balcao.screenshot({ path: path.resolve(__dirname, '_capturas', 'f61-balcao.png'), fullPage: true });

  await browser.close();
  console.log(falhas.length
    ? `\n\u274c ${falhas.length} falha(s): ${falhas.join(', ')}`
    : '\n\u2705 tudo passou');
  process.exit(falhas.length ? 1 : 0);
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
