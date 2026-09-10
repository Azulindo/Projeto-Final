/**
 * X-16 e X-17 — duas avarias que não se viam.
 *
 * As duas vieram da mesma mensagem do João, a 10/09, e as duas têm a
 * mesma forma: o ecrã fazia uma coisa errada com toda a confiança, e
 * nada apontava para o sítio certo.
 *
 * Eram X-14 e X-15 quando foram escritas. Passaram a X-16 e X-17 no
 * merge: o João numerou os dois bugs de datas dele com os mesmos
 * números, no mesmo dia, sem nenhum de nós ter visto o do outro.
 *
 * ── X-16: a janela abria no canto ──────────────────────────────────
 * O `* { margin: 0 }` do `base.css` apagava o `margin: auto` que o
 * browser usa para centrar um `<dialog>` aberto com `showModal()`. O
 * `::backdrop` continuava a funcionar, por isso a janela PARECIA estar
 * a abrir bem — só estava encostada ao canto superior esquerdo.
 *
 * Testa-se nas QUATRO janelas da app, e não só na do Stock onde foi
 * encontrada: a causa está no reset, portanto atinge-as todas, e uma
 * correção no reset tem de ser verificada onde ela atua.
 *
 * ── X-17: o relógio trocado dizia "agora mesmo" a tudo ─────────────
 * O `minutosDesde()` tinha `Math.max(0, …)`. Com os pedidos uma hora no
 * futuro (o fuso do servidor), todas as diferenças davam negativo, o
 * clamp punha-as a zero, e o ecrã dizia "agora mesmo" até a uma ronda
 * de 28 minutos. A escalada de cor nunca se tinha visto a funcionar.
 *
 * O clamp fica — não se mostra "há -60 min" a ninguém. O que muda é
 * deixar de ser silencioso.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ   = 'file://' + path.resolve(__dirname, '..');
const GESTAO = RAIZ + '/funcionarios';

const falhas = [];
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  if (!c) falhas.push(n);
};

async function entrar(ctx, email) {
  const p = await ctx.newPage();
  p.on('pageerror', e => {
    if (!/tailwind/i.test(e.message)) { console.log('[pageerror]', e.message); falhas.push('pageerror'); }
  });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(`${GESTAO}/login.html?simular=1`);
  await p.fill('#email', email);
  await p.fill('#password', 'abate2026');
  await p.click('#btnEntrar');
  await p.waitForTimeout(1300);
  return p;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });

  const admin = await entrar(ctx, 'admin@vemproabate.pt');

  /* ── X-16: as cinco janelas ──────────────────────────────────────
     Mede-se a folga à esquerda contra a folga à direita. Centrada, as
     duas são iguais; encostada ao canto, a da esquerda é zero. Não se
     compara com um número fixo porque a largura de cada janela é
     diferente — o que tem de ser igual é a folga dos dois lados. */
  const janelas = [
    ['Produtos',     'produtos.html',     '#btnNovo',   '#painelProduto'],
    ['Categorias',   'categorias.html',   '#btnNova',   '#painelCategoria'],
    ['Funcionários', 'funcionarios.html', '#btnNovo',   '#painelFuncionario'],
    ['Stock',        'stock.html',        '.btn-ajustar', '#painelAjuste'],
    ['mínimo',       'stock.html',        '.btn-minimo',  '#painelMinimo'],
  ];

  for (const [nome, pagina, abrir, painel] of janelas) {
    await admin.goto(`${GESTAO}/${pagina}?simular=1`);
    await admin.waitForTimeout(1500);

    // No Stock os botões vivem nas linhas da tabela, não no cabeçalho.
    await admin.locator(abrir).first().click();
    await admin.waitForSelector(`${painel}[open]`, { timeout: 5000 });

    const m = await admin.locator(painel).evaluate(el => {
      const r = el.getBoundingClientRect();
      return {
        esq: Math.round(r.left),
        dir: Math.round(window.innerWidth - r.right),
        topo: Math.round(r.top),
        largura: Math.round(r.width),
      };
    });

    const centrada = Math.abs(m.esq - m.dir) <= 2 && m.esq > 0 && m.topo > 0;
    check(`A janela dos ${nome} abre centrada`, centrada,
          `esq ${m.esq}px · dir ${m.dir}px · topo ${m.topo}px · larg ${m.largura}px`);

    await admin.keyboard.press('Escape');
    await admin.waitForTimeout(350);
  }

  /* A regra tem de estar no base.css e não no CSS de cada página — é
     isso que faz as cinco janelas passarem de uma vez, e é o que este
     teste protege: quem a mova para um ficheiro de página parte quatro.

     Lê-se do DISCO e não do browser. A primeira versão percorria o
     `document.styleSheets`, e em `file://` o acesso ao `cssRules` de uma
     folha ligada é bloqueado por origem cruzada — o `catch` engolia
     tudo e o teste dizia "não encontrada" com a regra lá. Um teste que
     falha por não conseguir ver não é um teste que reprova. */
  const fs = require('fs');
  const base = fs.readFileSync(path.resolve(__dirname, '../funcionarios/css/base.css'), 'utf8');
  check('A regra vive no base.css, para apanhar as janelas todas',
        /dialog:modal\s*\{[^}]*margin:\s*auto/.test(base));

  const emPaginas = ['stock', 'produtos', 'categorias', 'funcionarios']
    .filter(f => {
      try {
        return /dialog:modal/.test(
          fs.readFileSync(path.resolve(__dirname, `../funcionarios/css/${f}.css`), 'utf8'));
      } catch (e) { return false; }
    });
  check('E não está repetida no CSS de nenhuma página', emPaginas.length === 0, emPaginas.join(', '));

  /* ── X-17: o relógio ──────────────────────────────────────────────
     Injeta-se uma encomenda com a data uma hora no FUTURO — exatamente
     o que o fuso do servidor produzia — e vê-se o que o ecrã faz.

     Vai pelo ecrã e não por chamar o `minutosDesde()` à mão, e não é
     por gosto: a função vive dentro do `DOMContentLoaded` do
     `cozinha.js` e não é alcançável de fora. A primeira versão deste
     teste tentou chamá-la e não podia. Mais vale assim — o que interessa
     não é o valor que a função devolve, é o que a pessoa na cozinha lê. */
  const coz = await entrar(ctx, 'cozinha@vemproabate.pt');
  const avisos = [];
  coz.on('console', m => { if (m.type() === 'warning') avisos.push(m.text()); });

  await coz.goto(`${GESTAO}/cozinha.html?simular=1`);
  await coz.evaluate(() => {
    const futuro = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    localStorage.setItem('vpa_takeaway_demo', JSON.stringify({
      'PED-FUTUR': {
        id: 99001, numero: 'PED-FUTUR', estado: 'recebido', tipo: 'take_away',
        nome: 'Relógio Trocado', telefone: '912000000', email: null,
        observacoes: null, total: 3.9, criadoEm: futuro,
        itens: [{ id: 1, produtoId: 1, nome: 'Abatata Frita', categoria: 'Entradas',
                  quantidade: 1, precoUnit: 3.9, subtotal: 3.9, observacao: null }],
      },
    }));
  });
  await coz.reload();
  await coz.waitForSelector('.cartao-ronda', { timeout: 12000 });

  const cartao = coz.locator('.cartao-ronda', { hasText: 'PED-FUTUR' });
  check('O cartão de uma ronda no futuro aparece na mesma', (await cartao.count()) === 1);

  const tempo = (await cartao.locator('.ronda-tempo').textContent() || '').trim();
  check('E mostra "agora mesmo", não um número negativo',
        /agora mesmo/i.test(tempo), tempo);

  check('Mas a consola avisa, em vez de o engolir em silêncio',
        avisos.some(a => /futuro/i.test(a) && /fuso|rel[oó]gio/i.test(a)),
        avisos.length ? avisos[avisos.length - 1].slice(0, 110) : 'nenhum aviso');

  check('E avisa UMA vez, não uma por cartão (a fila tem 15 ao almoço)',
        avisos.filter(a => /futuro/i.test(a)).length === 1,
        `${avisos.filter(a => /futuro/i.test(a)).length} avisos`);

  /* E o caso normal: a escalada de cor, que só se viu a funcionar a
     10/09, depois de os dois bugs de datas serem corrigidos. */
  await coz.evaluate(() => {
    const atras = m => new Date(Date.now() - m * 60 * 1000).toISOString();
    const base = (id, numero, min) => ({
      id, numero, estado: 'recebido', tipo: 'take_away',
      nome: 'Teste Escalada', telefone: '912000000', email: null,
      observacoes: null, total: 3.9, criadoEm: atras(min),
      itens: [{ id: 1, produtoId: 1, nome: 'Abatata Frita', categoria: 'Entradas',
                quantidade: 1, precoUnit: 3.9, subtotal: 3.9, observacao: null }],
    });
    localStorage.setItem('vpa_takeaway_demo', JSON.stringify({
      'PED-VERDE': base(99002, 'PED-VERDE', 4),
      'PED-VERMR': base(99003, 'PED-VERMR', 28),
    }));
  });
  await coz.reload();
  await coz.waitForSelector('.cartao-ronda', { timeout: 12000 });

  const classe = async numero => await coz.locator('.cartao-ronda', { hasText: numero })
    .getAttribute('class');
  const verde = await classe('PED-VERDE');
  const vermelho = await classe('PED-VERMR');

  check('4 minutos ficam no nível normal', /normal/.test(verde || ''), verde);
  check('28 minutos ficam no nível de atraso', /atraso/.test(vermelho || ''), vermelho);

  const t4 = (await coz.locator('.cartao-ronda', { hasText: 'PED-VERDE' }).locator('.ronda-tempo').textContent() || '').trim();
  const t28 = (await coz.locator('.cartao-ronda', { hasText: 'PED-VERMR' }).locator('.ronda-tempo').textContent() || '').trim();
  check('E os minutos que aparecem no cartão são os reais',
        /4 min/.test(t4) && /28 min/.test(t28), `${t4} · ${t28}`);

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('X-16 E X-17 VERIFICADOS ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();
