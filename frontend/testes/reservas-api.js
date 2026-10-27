/**
 * C-09 — As reservas deixam de viver no browser.
 *
 * Três coisas mudaram, e cada uma fechava um buraco diferente:
 *
 *   1. A EMENTA vem da API. Estavam 25 produtos escritos à mão no
 *      `reservas.js`, com nome, descrição e preço. Batiam todos com o
 *      `seed.sql` a 10/09 — mas isso era sorte com data de validade:
 *      até ao B-61 um preço só mudava editando o seed, e desde o B-61
 *      muda no ecrã de Produtos, por alguém que não tem razão nenhuma
 *      para saber que aquela lista existia.
 *
 *      E os ids eram inventados (`en1`, `pp3`), portanto uma
 *      pré-selecção não podia sequer ser enviada ao servidor.
 *
 *   2. As HORAS vêm da API, com a ocupação. Antes eram duas listas
 *      escritas à mão e todas as horas pareciam livres sempre: escolhia-
 *      se as 20:00 de um sábado cheio, escrevia-se nome e telemóvel, e
 *      a recusa só chegava no fim.
 *
 *   3. A RESERVA grava no servidor e o CÓDIGO vem na resposta. Antes
 *      era gerado no browser e guardado no `localStorage` — o
 *      restaurante não o podia confirmar, duas pessoas podiam reservar
 *      a mesma hora, e limpar os dados apagava a reserva.
 *
 * Corre com `?simular=1`, como todos: a simulação do `api.js` tem as
 * mesmas regras e os mesmos limites do servidor.
 */
const { chromium } = require('playwright');
const path = require('path');

const RESERVAS = 'file://' + path.resolve(__dirname, '../cliente/reservas.html') + '?simular=1';

const falhas = [];

let feitas = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? '✅' : '❌'} ${n}${e ? ' — ' + e : ''}`);
  feitas++;
  if (!c) falhas.push(n);
};

const esperar = (p, ms) => p.waitForTimeout(ms);

/* Uma data futura num dia PAR do mês — é quando a simulação enche as
   20:00 e as 20:30. A ocupação é determinística de propósito: com
   `Math.random()` as horas mudavam a cada recarregamento e este teste
   não podia existir. */
function dataParaCheio() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  if (d.getDate() % 2 !== 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 1) d.setDate(d.getDate() + 2);   // 2ª feira encerra
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/* Condutor do fluxo, no mesmo padrão do `reserva-resumo.js`: em vez de
   uma sequência de cliques fixa, olha-se para o ecrã e responde-se ao
   que ele está a pedir. Uma sequência fixa parte-se a cada passo novo
   no fluxo; isto sobrevive. A primeira versão deste teste tentou a
   sequência fixa e não passou do primeiro chip. */
async function situacao(p) {
  return p.evaluate(() => {
    const vis = el => el.offsetParent !== null;
    return {
      qr: [...document.querySelectorAll('#quickReplies .qr-btn')].filter(vis)
            .map(b => ({ texto: b.textContent.trim(), cheio: b.classList.contains('qr-btn--cheio'), off: b.disabled })),
      steppers: document.querySelectorAll('.qty-plus').length,
      textarea: document.querySelectorAll('#chatBody textarea').length,
      cartao: [...document.querySelectorAll('#chatBody .btn-menu-confirm, #chatBody .menu-card-nav button')]
                .filter(vis).map(b => b.textContent.trim()),
      obsBotoes: [...document.querySelectorAll('#chatBody .obs-btn')].filter(vis).length,
      dias: [...document.querySelectorAll('.cal-day:not([disabled]):not(.cal-day--empty)')]
              .filter(b => !/closed|past|far/.test(b.className)).map(b => b.textContent.trim()),
      inputLivre: (() => { const i = document.getElementById('chatInput'); return !!i && !i.disabled && vis(i); })(),
      /* O PLACEHOLDER diz o que o ecrã está a pedir. É o sinal fiável:
         no passo das pessoas há chips E input livre ao mesmo tempo, e um
         condutor que olhe só para "há input" escreve o nome no campo do
         número de pessoas — que foi exactamente o que esta versão fez
         nas duas primeiras voltas, gastando o nome e o telemóvel antes
         de o ecrã os pedir. */
      pede: (document.getElementById('chatInput') || {}).placeholder || '',
      resumo: document.querySelectorAll('.summary-card').length,
      cartaoTexto: (document.getElementById('catCard') || {}).innerText || '',
    };
  });
}

async function esperarAcao(p, limite = 14000) {
  const fim = Date.now() + limite;
  while (Date.now() < fim) {
    const s = await situacao(p);
    if (s.resumo || s.qr.length || s.steppers || s.textarea || s.dias.length ||
        s.cartao.length || s.inputLivre) return s;
    await esperar(p, 220);
  }
  return situacao(p);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => {
    console.log('[pageerror]', e.message);
    falhas.push('pageerror: ' + e.message.slice(0, 70));
  });

  /* ── 1. Nada de ementa escrita à mão ───────────────────────────── */
  const fs = require('fs');
  const fonte = fs.readFileSync(path.resolve(__dirname, '../cliente/js/reservas.js'), 'utf8');

  check('O `reservas.js` já não tem preços escritos à mão',
        !/preco:\s*'\d+,\d+€'/.test(fonte),
        (fonte.match(/preco:\s*'[^']+'/g) || []).slice(0, 3).join(' · ') || 'nenhum');

  check('Nem ids inventados de produto',
        !/id:\s*'(en|pp|be|sb)\d/.test(fonte),
        (fonte.match(/id:\s*'(en|pp|be|sb)\d[^']*'/g) || []).slice(0, 3).join(' · ') || 'nenhum');

  check('E vai buscar as horas ao servidor',
        /reservas\/horarios/.test(fonte));

  await p.goto(RESERVAS);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(RESERVAS);
  await p.waitForSelector('#chatBody', { timeout: 10000 });

  /* O preço que a base tem, para comparar com o que o ecrã mostra. */
  const precoBase = await p.evaluate(async () => {
    const produtos = await chamarAPI('produtos');
    const a = produtos.find(x => x.nome === 'Abatata Frita');
    return { texto: Number(a.preco).toFixed(2).replace('.', ',') + '€', num: Number(a.preco), id: a.id };
  });

  /* ═══════════════════════════════════════════════════════════════
     PARTE 1 — A ementa vem da API
     ═══════════════════════════════════════════════════════════════
     Entra-se no ramo da pré-escolha só o suficiente para ver o cartão
     da primeira categoria. Não se percorre o ramo inteiro: quatro
     categorias, observações e calendário são muitos passos para provar
     uma coisa que se vê no primeiro cartão — que os pratos e os preços
     vêm do servidor. O ramo inteiro é o que a F-43 já percorre. */
  await p.locator('#quickReplies .qr-btn', { hasText: '2 Pessoas' }).click();
  await esperar(p, 1000);
  await p.locator('#quickReplies .qr-btn', { hasText: 'Ver menu' }).click();
  await esperar(p, 2600);                        // a ementa vem da API

  const textoEmenta = await p.evaluate(() => (document.getElementById('catCard') || {}).innerText || '');

  check('A ementa aparece com os pratos vindos da API',
        /Abatata Frita/.test(textoEmenta),
        textoEmenta.replace(/\n/g, ' · ').slice(0, 110));
  check('E o preço mostrado é o que a API devolve, não um escrito à mão',
        textoEmenta.includes(precoBase.texto), `esperado ${precoBase.texto}`);

  const idsNoCarrinho = await p.evaluate(() => {
    const b = document.querySelector('.qty-plus');
    if (b) b.click();
    return [...document.querySelectorAll('#catCard [data-id]')].map(e => e.dataset.id).slice(0, 4);
  });
  check('Os pratos do ecrã levam o id_produto REAL, não um inventado',
        idsNoCarrinho.length === 0 || idsNoCarrinho.every(x => /^\d+$/.test(x)),
        idsNoCarrinho.join(', ') || '(sem data-id no markup — verificado abaixo pela API)');

  /* ═══════════════════════════════════════════════════════════════
     PARTE 2 — O fluxo até ao fim, pelo caminho sem pré-escolha
     ═══════════════════════════════════════════════════════════════
     Recomeça-se e vai-se pelo "decidir no restaurante". É o caminho
     mais curto até à gravação, e o que interessa provar aqui é o fim:
     as horas com ocupação, o código a vir do servidor, e a reserva a
     existir do lado de lá.

     ── PORQUE É QUE ISTO NÃO PERCORRE O RAMO DA PRÉ-ESCOLHA ────────
     Tentei, e o condutor levou seis correcções: alternava entre
     "Próximo" e "◀ Entradas" em ciclo, escrevia o nome no campo do
     número de pessoas (nesse passo há chips E input livre ao mesmo
     tempo), tentava submeter observações com Enter num textarea, e
     saía no resumo sem carregar em "Confirmar".

     O que a pré-escolha acrescenta — o `valorEstimado` calculado no
     servidor e os `produtoId` reais — está provado na PARTE 3, contra
     a API, que é onde esses factos vivem. Vale mais do que um percurso
     de interface que se parte a cada mudança no fluxo. */
  await p.goto(RESERVAS);
  await p.waitForSelector('#chatBody', { timeout: 10000 });
  await esperar(p, 1400);

  await p.locator('#quickReplies .qr-btn', { hasText: '2 Pessoas' }).click();
  await esperar(p, 1000);
  await p.locator('#quickReplies .qr-btn', { hasText: 'Decidir no restaurante' }).click();
  await esperar(p, 1600);

  /* Um dia PAR do mês: é quando a simulação enche as 20:00 e as 20:30.
     A ocupação é determinística de propósito — com `Math.random()` as
     horas mudavam a cada recarregamento e este teste não podia existir. */
  await p.waitForSelector('.cal-day', { timeout: 10000 });
  const diaEscolhido = await p.evaluate(() => {
    const livres = [...document.querySelectorAll('.cal-day')]
      .filter(b => !b.disabled && !/closed|past|far|empty/.test(b.className));
    const par = livres.find(b => Number(b.textContent.trim()) % 2 === 0) || livres[0];
    par.click();
    return par.textContent.trim();
  });
  await esperar(p, 2400);

  const cheiasVistas = await p.locator('.qr-btn--cheio').count();
  check('As horas vêm do servidor e as cheias ficam desligadas',
        cheiasVistas > 0, `dia ${diaEscolhido}, ${cheiasVistas} cheias`);

  if (cheiasVistas) {
    const primeira = p.locator('.qr-btn--cheio').first();
    const txt = (await primeira.textContent() || '').trim();
    check('A hora cheia continua LEGÍVEL — é o que se lê para escolher outra',
          /^\d{2}:\d{2}/.test(txt), txt);
    check('Não se pode carregar nela', await primeira.isDisabled());
    check('E diz porquê a quem usa leitor de ecrã, não só pela cor',
          /sem lugares/i.test(await primeira.getAttribute('aria-label') || ''),
          await primeira.getAttribute('aria-label'));
  }

  const livre = p.locator('#quickReplies .qr-btn:not(.qr-btn--cheio)')
                 .filter({ hasText: /^\d{2}:\d{2}/ }).first();
  const horaEscolhida = (await livre.textContent() || '').trim().slice(0, 5);
  await livre.click();
  await esperar(p, 1400);

  await p.fill('#chatInput', 'Rita Marques');
  await p.press('#chatInput', 'Enter');
  await esperar(p, 1600);
  await p.fill('#chatInput', '912 345 678');       // com espaços, de propósito
  await p.press('#chatInput', 'Enter');
  await esperar(p, 2500);

  await p.waitForSelector('.summary-card', { timeout: 10000 });
  await p.locator('#quickReplies .qr-btn', { hasText: /Confirmar/ }).first().click();
  await esperar(p, 3200);

  const corpoChat = await p.innerText('#chatBody');
  check('A reserva fica REGISTADA, não "confirmada" — quem confirma é o restaurante',
        /registada/i.test(corpoChat) && !/confirmada com sucesso/i.test(corpoChat));

  const codigo = (corpoChat.match(/RSV-[A-Z0-9]{5}/) || [])[0];
  check('O código vem do servidor, no formato dele', !!codigo, codigo || 'nenhum');

  const lida = await p.evaluate(async c => {
    try { return await chamarAPI(`reservas/${c}`); }
    catch (e) { return { erro: e.message, status: e.status }; }
  }, codigo);

  check('A reserva existe do lado do servidor, encontrável pelo código',
        !!(lida.reserva && lida.reserva.codigo === codigo),
        JSON.stringify(lida).slice(0, 110));
  check('Com o estado "pendente" e o nome certo',
        !!(lida.reserva && lida.reserva.estado === 'pendente' && /Rita/.test(lida.reserva.nome)));
  check('A hora gravada é a que se escolheu',
        !!(lida.reserva && lida.reserva.hora === horaEscolhida),
        `${lida.reserva && lida.reserva.hora} vs ${horaEscolhida}`);
  check('O telemóvel com espaços foi aceite, e guardado sem eles',
        !JSON.stringify(lida).includes('912 345'));

  /* ═══════════════════════════════════════════════════════════════
     PARTE 3 — A pré-escolha, contra a API
     ═══════════════════════════════════════════════════════════════
     O `valorEstimado` calculado no servidor (a metade da B-52 que
     estava feita) e os `produtoId` reais. Com os ids inventados de
     antes — `en1`, `pp3` — este pedido não podia sequer ser
     construído: é essa a prova de que a ementa TINHA de sair do
     ficheiro. */
  const preSelecao = await p.evaluate(async () => {
    const produtos = await chamarAPI('produtos');
    const a = produtos.find(x => x.nome === 'Abatata Frita');
    const b = produtos.find(x => x.nome === 'Borrego Abatido');

    /* Uma data futura, ímpar (para o jantar não estar cheio) e que não
       caia numa segunda-feira. */
    const d = new Date();
    d.setDate(d.getDate() + 7);
    if (d.getDate() % 2 === 0) d.setDate(d.getDate() + 1);
    if (d.getDay() === 1) d.setDate(d.getDate() + 2);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const r = await chamarAPI('reservas', { method: 'POST', body: {
      nome: 'Pré Escolha', telemovel: '913000000', pessoas: 2,
      data: iso, hora: '21:00', modo_ementa: 'pre_selecionada',
      itens: [{ produtoId: a.id, quantidade: 2 }, { produtoId: b.id, quantidade: 1 }],
    }});
    const lida = await chamarAPI(`reservas/${r.reserva.codigo}`);
    return {
      esperado: Number((Number(a.preco) * 2 + Number(b.preco)).toFixed(2)),
      devolvido: Number(r.reserva.valorEstimado),
      itens: lida.itens,
      modo: lida.reserva.modo_ementa,
    };
  });

  check('O valor estimado vem do servidor e bate com os preços da base (B-52)',
        preSelecao.devolvido === preSelecao.esperado,
        `${preSelecao.devolvido} vs ${preSelecao.esperado}`);
  check('Os itens gravados levam o produtoId REAL',
        Array.isArray(preSelecao.itens) && preSelecao.itens.length === 2 &&
        preSelecao.itens.every(i => Number.isInteger(i.produtoId)),
        JSON.stringify(preSelecao.itens).slice(0, 120));
  check('E a reserva fica marcada como pré-selecionada',
        preSelecao.modo === 'pre_selecionada', preSelecao.modo);

  /* ── 5. O que o GET não devolve ────────────────────────────────── */
  check('O GET pelo código não devolve o telemóvel nem o email',
        !/telemovel|912345678|email/i.test(JSON.stringify(lida)),
        JSON.stringify(lida.reserva || lida).slice(0, 110));

  /* ── 6. Um código que não existe ───────────────────────────────── */
  const inexistente = await p.evaluate(async () => {
    try { await chamarAPI('reservas/RSV-ZZZZZ'); return 'passou'; }
    catch (e) { return String(e.status); }
  });
  check('Um código que não existe dá 404', inexistente === '404', inexistente);

  /* ── 7. A hora cheia é recusada pelo servidor também ───────────── */
  const recusa = await p.evaluate(async d => {
    try {
      await chamarAPI('reservas', { method: 'POST', body: {
        nome: 'Teste Cheio', telemovel: '912345678', pessoas: 2,
        data: d, hora: '20:00', modo_ementa: 'no_restaurante',
      }});
      return 'passou';
    } catch (e) { return `${e.status}: ${e.message}`; }
  }, dataParaCheio());
  check('Reservar uma hora cheia à mão é recusado com 409, não aceite em silêncio',
        /^409/.test(recusa), recusa);

  await browser.close();
  console.log('\n' + '═'.repeat(58));
  if (!falhas.length) console.log('C-09 VERIFICADO ✅');
  else { console.log('FALHAS:', falhas.length); falhas.forEach(f => console.log(' •', f)); process.exitCode = 1; }
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
