/**
 * F-83 — O site inteiro pelo teclado. Seis páginas do cliente.
 *
 * ── PORQUE É QUE ISTO EXISTE ────────────────────────────────────────
 * Porque era a **única dimensão deste site que nunca tinha sido
 * medida.** Havia dez suites: contraste de cor, transbordo horizontal,
 * alvos de dedo, tipografia, estados de pedido, a cortina. Nenhuma
 * carregava na tecla Tab. E o site tem um diálogo modal, uma galeria de
 * catorze cartões que só o teclado alcança por `tabindex`, e uma barra
 * `position: fixed` — as três coisas que mais facilmente correm mal
 * para quem não usa rato.
 *
 * O que a primeira passagem encontrou, e que este ficheiro guarda:
 *
 *   1. **Abrir o lightbox com o Enter deixava o foco fora dele.** O
 *      `btnFechar.focus()` corria na mesma linha que punha a classe
 *      `aberto`, e o estado fechado é `visibility: hidden` — um
 *      elemento invisível não aceita foco, e o `.focus()` falha **sem
 *      dar erro**. Com o rato ninguém nota. O diálogo declara
 *      `aria-modal="true"`, portanto um leitor de ecrã dizia que o
 *      resto da página estava indisponível enquanto o foco do
 *      utilizador estava justamente no resto da página.
 *   2. **O Tab saía do diálogo.** Cinco toques e estava na barra da
 *      página de trás. O `aria-modal="true"` é uma promessa que o
 *      JavaScript não cumpria: a declaração e o comportamento diziam
 *      coisas diferentes — o defeito de sempre deste projeto, desta vez
 *      entre o ARIA e o código.
 *   3. **O foco ia para debaixo da barra.** Medido na galeria a andar
 *      para trás com Shift+Tab: três cartões com o topo a **y=-2** numa
 *      barra de 69px. Focados e invisíveis. O browser alinha o elemento
 *      ao topo da janela porque não sabe que há uma barra `fixed` lá.
 *
 * ── E UMA COISA QUE NÃO ERA DEFEITO ─────────────────────────────────
 * A minha primeira sonda disse que **o chat das reservas não estava na
 * ordem de tabulação** — sete elementos em falta, a página onde o
 * cliente faz o pedido. Era mentira: a sonda carregava no Tab 400ms
 * depois de abrir, e os botões do chat são desenhados por JavaScript
 * mais tarde. Medido outra vez com tempo, a ordem está completa e
 * correcta. É a quinta vez neste projeto que uma verificação minha
 * mede antes de a coisa existir; por isso este ficheiro **espera pelos
 * elementos em vez de esperar por um número de milissegundos.**
 *
 * ── QUAIS DESTAS VERIFICAÇÕES JÁ SE VIU REPROVAR ────────────────────
 * Vale dizê-lo, porque uma verificação que nunca esteve vermelha não se
 * sabe se sabe reprovar:
 *   · *"o foco ENTRA no diálogo ao abrir por teclado"* — vermelha duas
 *     vezes: antes do conserto, e outra vez depois de eu tentar
 *     consertá-lo só com um `requestAnimationFrame`. Foi ela que me
 *     obrigou a ir à causa (a `visibility` ser uma propriedade discreta
 *     e o `transition: visibility 0.25s` guardar o valor antigo por
 *     ~125ms) em vez de ficar no sintoma.
 *   · *"Shift+Tab nunca esconde o foco atrás da barra"* — vermelha
 *     antes do `scroll-padding-top`, com três cartões a y=-2.
 *   · *"tem anel de 2px ou mais"* — vermelha em todo o site antes do
 *     anel dourado (era o `1px auto` do Chrome), e nos seis campos das
 *     páginas de QR que tinham `focus:outline-none`.
 *   · *"o foco não sai do diálogo com Tab"* — nunca a vi vermelha num
 *     ciclo completo, porque escrevi a prisão de foco e a verificação
 *     na mesma passagem. O que ela tem a seu favor é medir **os dois
 *     sentidos**: uma prisão que só trate do Tab para a frente reprova
 *     aqui.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = 'file://' + path.resolve(__dirname, '..', 'cliente') + '/';

const PAGINAS = ['index.html', 'menu.html', 'galeria.html',
                 'reservas.html', 'sobre.html', 'contactos.html'];

const falhas = [];
let feitas = 0;

function check(nome, ok, detalhe) {
  feitas++;
  if (!ok) falhas.push(`${nome}${detalhe ? ` (${detalhe})` : ''}`);
}

/* Onde está o foco, e o que se vê dele. */
const FOCO = () => {
  const e = document.activeElement;
  if (!e || e === document.body) return { vazio: true };
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  return {
    tag: e.tagName,
    cls: (e.className || '').toString().slice(0, 30),
    txt: (e.textContent || e.value || e.placeholder || '').trim().slice(0, 20),
    top: Math.round(r.top),
    alto: Math.round(r.height),
    /* A barra é `fixed` e ocupa de 0 a `--topbar`: um elemento focado
       com o topo acima disso está escondido atrás dela. Os elementos
       que VIVEM na barra não contam, obviamente. */
    naBarra: !!e.closest('.inline-bar'),
    anel: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
    anelCor: cs.outlineColor,
    anelLargura: cs.outlineWidth,
    tabindex: e.getAttribute('tabindex'),
    noDialogo: !!e.closest('[role="dialog"]'),
    topbar: parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--topbar')) || 0,
  };
};

(async () => {
  const browser = await chromium.launch();

  // ══ 1. A ORDEM DE TABULAÇÃO, EM TODAS AS PÁGINAS ══════════════════
  for (const pag of PAGINAS) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(RAIZ + pag, { waitUntil: 'load' });

    /* Espera pelos elementos, não por um número de milissegundos — ver
       o comentário grande no topo. O chat das reservas só existe depois
       de o JavaScript o desenhar. */
    await p.waitForFunction(() =>
      document.querySelectorAll('a[href], button, input, select, textarea').length > 6,
      { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(300);

    /* Quantos elementos DEVIAM estar na ordem de tabulação: os
       focáveis que se vêem. O `visibility` é herdado, por isso isto
       também exclui os três botões do lightbox enquanto está fechado —
       que é exactamente o que o `galeria.css` quer. */
    const noDom = await p.evaluate(() =>
      [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]')]
        .filter((e) => {
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          if (e.disabled) return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 || r.height > 0;
        }).length);

    // Caminhada
    const paradas = [];
    await p.evaluate(() => document.body.focus());
    for (let i = 0; i < noDom + 4; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(FOCO);
      if (f.vazio) break;               // saiu para o browser: acabou
      paradas.push(f);
    }

    const et = `${pag}`;

    check(`${et} · o Tab chega a todos os elementos visíveis`,
      paradas.length === noDom, `${paradas.length} paradas para ${noDom} elementos`);

    for (const f of paradas) {
      const q = `${f.tag}.${f.cls}${f.txt ? ` "${f.txt}"` : ''}`;

      /* 3. Nada focado fica debaixo da barra.
         Só se exige a elementos que CABEM no ecrã abaixo da barra: um
         elemento mais alto do que isso tem de ficar com o topo acima,
         não há onde o pôr, e acusá-lo seria uma falha inventada. */
      const cabia = f.alto <= 900 - f.topbar;
      if (!f.naBarra && cabia) {
        check(`${et} · ${q} não fica debaixo da barra`,
          f.top >= f.topbar - 1, `topo em y=${f.top}, barra até ${f.topbar}`);
      }

      // O anel de foco existe e é o do site, não o do browser
      check(`${et} · ${q} tem anel de foco`, f.anel, `${f.anelLargura}`);
      check(`${et} · ${q} tem anel de 2px ou mais`,
        parseFloat(f.anelLargura) >= 2, f.anelLargura);
    }

    // Nenhum tabindex positivo: obriga a manter duas ordens alinhadas
    const positivos = await p.evaluate(() =>
      [...document.querySelectorAll('[tabindex]')]
        .filter((e) => parseInt(e.getAttribute('tabindex'), 10) > 0)
        .map((e) => e.tagName + '.' + e.className));
    check(`${et} · nenhum tabindex positivo`, positivos.length === 0, positivos.join(', '));

    // O `scroll-padding-top` reserva a barra
    const enchimento = await p.evaluate(() => ({
      pad: getComputedStyle(document.documentElement).scrollPaddingTop,
      topbar: getComputedStyle(document.documentElement).getPropertyValue('--topbar').trim(),
    }));
    check(`${et} · o scroll reserva o espaço da barra`,
      enchimento.pad !== 'auto' && parseFloat(enchimento.pad) >= parseFloat(enchimento.topbar),
      `scroll-padding-top: ${enchimento.pad}, barra ${enchimento.topbar}`);

    await p.close();
  }

  // ══ 2. O FOCO DEBAIXO DA BARRA, A ANDAR PARA TRÁS ═════════════════
  /* É aqui que o defeito aparecia: para a FRENTE o browser alinha o
     elemento ao fundo da janela e não há problema; para TRÁS alinha-o
     ao topo, que é onde a barra está. A galeria é o caso porque tem
     catorze cartões grandes. */
  for (const pag of ['galeria.html', 'menu.html']) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(RAIZ + pag, { waitUntil: 'load' });
    await p.waitForTimeout(700);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(250);
    await p.evaluate(() => {
      const f = [...document.querySelectorAll('a[href], button, [tabindex="0"]')];
      f[f.length - 1].focus();
    });

    const tapados = [];
    for (let i = 0; i < 16; i++) {
      await p.keyboard.press('Shift+Tab');
      const f = await p.evaluate(FOCO);
      if (f.vazio) break;
      if (!f.naBarra && f.alto <= 900 - f.topbar && f.top < f.topbar - 1) {
        tapados.push(`${f.tag}.${f.cls} "${f.txt}" y=${f.top} < ${f.topbar}`);
      }
    }
    check(`${pag} · Shift+Tab nunca esconde o foco atrás da barra`,
      tapados.length === 0, tapados.slice(0, 3).join(' | '));
    await p.close();
  }

  // ══ 3. O DIÁLOGO DA GALERIA ═══════════════════════════════════════
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(RAIZ + 'galeria.html', { waitUntil: 'load' });
    await p.waitForSelector('.dish-card[role="button"]');
    await p.waitForTimeout(400);

    // Chegar ao primeiro cartão por teclado
    await p.evaluate(() => document.body.focus());
    let cartao = null;
    for (let i = 0; i < 14; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(FOCO);
      if (!f.vazio && f.cls.includes('dish-card')) { cartao = f; break; }
    }
    check('galeria · o Tab chega a um cartão', !!cartao);

    const identidade = () => p.evaluate(() => {
      const e = document.activeElement;
      return { q: e.tagName + '.' + (e.className || '').toString().slice(0, 26),
               dentro: !!(e.closest && e.closest('.lightbox-overlay')) };
    });

    // 1. Enter abre E o foco entra no diálogo
    await p.keyboard.press('Enter');
    await p.waitForTimeout(500);
    const aberto = await p.evaluate(() => {
      const lb = document.querySelector('.lightbox-overlay');
      return { classe: lb.className, vis: getComputedStyle(lb).visibility };
    });
    check('galeria · o Enter abre o diálogo',
      aberto.classe.includes('aberto') && aberto.vis === 'visible', JSON.stringify(aberto));

    const dentroAoAbrir = await identidade();
    check('galeria · o foco ENTRA no diálogo ao abrir por teclado',
      dentroAoAbrir.dentro, dentroAoAbrir.q);

    // 2. O foco não sai com o Tab — dez toques
    const fugas = [];
    for (let i = 0; i < 10; i++) {
      await p.keyboard.press('Tab');
      const d = await identidade();
      if (!d.dentro) fugas.push(`toque ${i + 1}: ${d.q}`);
    }
    check('galeria · o foco não sai do diálogo com Tab',
      fugas.length === 0, fugas.slice(0, 3).join(' | '));

    // E para trás também
    const fugasTras = [];
    for (let i = 0; i < 6; i++) {
      await p.keyboard.press('Shift+Tab');
      const d = await identidade();
      if (!d.dentro) fugasTras.push(`toque ${i + 1}: ${d.q}`);
    }
    check('galeria · nem com Shift+Tab',
      fugasTras.length === 0, fugasTras.slice(0, 3).join(' | '));

    // 3. As setas do teclado mudam de prato
    const antesSeta = await p.evaluate(() =>
      document.querySelector('#lightboxContador').textContent);
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(200);
    const depoisSeta = await p.evaluate(() =>
      document.querySelector('#lightboxContador').textContent);
    check('galeria · a seta direita muda de prato',
      antesSeta !== depoisSeta, `${antesSeta} → ${depoisSeta}`);

    // 4. O Escape fecha E devolve o foco ao cartão do prato que se via
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    const fechado = await p.evaluate(() => {
      const lb = document.querySelector('.lightbox-overlay');
      const e = document.activeElement;
      const cartoes = [...document.querySelectorAll('.dish-card')];
      return {
        fechado: !lb.className.includes('aberto'),
        foco: e.tagName + '.' + (e.className || '').toString().slice(0, 26),
        indiceFocado: cartoes.indexOf(e),
        contador: document.querySelector('#lightboxContador').textContent,
      };
    });
    check('galeria · o Escape fecha', fechado.fechado);
    check('galeria · o foco volta a um cartão, não ao <body>',
      fechado.indiceFocado >= 0, fechado.foco);
    /* E ao cartão CERTO: o contador dizia "N de 14", e o foco tem de
       estar no cartão N-1. Depois de uma seta para a direita, esse não
       é o cartão por onde se entrou. */
    const n = parseInt((fechado.contador || '').split(' ')[0], 10);
    check('galeria · e ao cartão do prato que se estava a ver',
      fechado.indiceFocado === n - 1,
      `contador "${fechado.contador}" mas o foco está no cartão ${fechado.indiceFocado + 1}`);

    await p.close();
  }

  // ══ 4. A CORTINA DO TELEMÓVEL PELO TECLADO ════════════════════════
  {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(RAIZ + 'index.html', { waitUntil: 'load' });
    await p.waitForTimeout(500);

    await p.evaluate(() => document.body.focus());
    await p.keyboard.press('Tab');
    const primeiro = await p.evaluate(FOCO);
    check('cortina · o botão é a primeira parada do Tab no telemóvel',
      primeiro.cls.includes('botao-cortina'), `${primeiro.tag}.${primeiro.cls}`);

    await p.keyboard.press('Enter');
    await p.waitForTimeout(450);
    check('cortina · o Enter abre',
      (await p.evaluate(() => document.querySelector('.botao-cortina')
        .getAttribute('aria-expanded'))) === 'true');

    /* Os cinco links ficam alcançáveis por Tab quando está aberta — e
       é isto que prova que o `visibility: hidden` do estado fechado
       está a fazer o trabalho certo: nas verificações da `cortina.js` o
       mesmo Tab NÃO os alcança. */
    const alcancados = [];
    for (let i = 0; i < 6; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(FOCO);
      if (f.vazio) break;
      if (f.tag === 'A' && f.txt) alcancados.push(f.txt);
    }
    check('cortina · os cinco links alcançam-se por Tab quando aberta',
      alcancados.length >= 5, alcancados.join(', '));

    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    check('cortina · o Escape fecha e o foco volta ao botão',
      await p.evaluate(() => document.activeElement === document.querySelector('.botao-cortina')
        && document.querySelector('.botao-cortina').getAttribute('aria-expanded') === 'false'));

    await p.close();
  }

  // ══ 5. AS DUAS PÁGINAS DE QR ══════════════════════════════════════
  /* A `mesa.html` e a `takeaway.html` não carregam o `css/nav.css` —
     são Tailwind e vivem à parte — por isso o anel dourado do resto do
     site não lhes chega. E são as únicas páginas do projeto onde alguém
     escreveu `focus:outline-none`: seis campos trocavam o anel por uma
     mudança de cor de bordo de 1px. Ficam aqui para não voltar. */
  for (const pag of ['mesa.html', 'takeaway.html']) {
    const p = await browser.newPage({ viewport: { width: 820, height: 1100 } });
    await p.goto(RAIZ + pag + '?simular=1', { waitUntil: 'load' });
    await p.waitForTimeout(1500);   // estas páginas desenham-se por JS

    const sem = [];
    let paradas = 0;
    for (let i = 0; i < 30; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(FOCO);
      if (f.vazio) break;
      paradas++;
      if (!f.anel || parseFloat(f.anelLargura) < 2) {
        sem.push(`${f.tag}.${f.cls} ol=${f.anelLargura} ${f.anelCor}`);
      }
    }
    check(`${pag} · o Tab chega a algum sítio`, paradas > 5, `${paradas} paradas`);
    check(`${pag} · todos os focos têm anel de 2px ou mais`,
      sem.length === 0, sem.slice(0, 4).join(' | '));
    await p.close();
  }

  await browser.close();
  console.log(falhas.length
    ? `\n❌ ${falhas.length} falha(s) em ${feitas}:\n  ${falhas.slice(0, 14).join('\n  ')}`
      + (falhas.length > 14 ? `\n  …e mais ${falhas.length - 14}` : '')
    : `\n✅ tudo passou — ${feitas} verificações: ordem de tabulação e anel de foco `
      + `em ${PAGINAS.length} páginas, o foco atrás da barra em 2, o diálogo da galeria, `
      + 'a cortina pelo teclado, e as duas páginas de QR');
  process.exit(falhas.length ? 1 : 0);
})();

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${feitas} ${Array.isArray(falhas) ? falhas.length : falhas}`);
});
