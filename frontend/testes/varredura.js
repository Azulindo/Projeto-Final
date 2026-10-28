/**
 * F-77 — Varredura do site inteiro, página a página.
 *
 * As suites que existem verificam cada uma a sua coisa: contraste,
 * responsividade, tipografia, molduras, estados do pedido, stock. Cada
 * uma sabe muito sobre um assunto e **nenhuma passa por todas as
 * páginas a perguntar "está aqui alguma coisa obviamente partida?"**.
 *
 * Esta faz isso. Não é profunda: é larga. Procura as coisas que não dão
 * erro a quem escreve o código e dão um site estranho a quem o abre:
 *
 *   1. erros de JavaScript — os que ninguém vê porque ninguém abre as
 *      ferramentas de desenvolvimento;
 *   2. imagens que não carregam;
 *   3. imagens sem `alt` — um leitor de ecrã anuncia o nome do
 *      ficheiro, ou nada;
 *   4. ligações internas para ficheiros que não existem, resolvidas
 *      contra o disco e não contra um palpite;
 *   5. `id` repetidos no mesmo documento — o `getElementById` devolve
 *      o primeiro e o resto morre em silêncio;
 *   6. ligações e botões sem nome acessível;
 *   7. campos de formulário sem rótulo associado;
 *   8. alvos de toque, em dois limiares: abaixo de 24px falha a WCAG
 *      AA (2.5.8), entre 24 e 44px fica abaixo da recomendação que o
 *      projeto adoptou (2.5.5, que é AAA);
 *   9. transbordo horizontal do documento.
 *
 * ── A GUARDA DO ESPELHO ─────────────────────────────────────────────
 * Uma imagem que não carrega tem duas causas, e só uma é defeito do
 * site: o ficheiro existe e não carrega, OU o ficheiro nem está aqui.
 * Este contentor recebe só os ficheiros que foram trazidos da máquina
 * do Guilherme, por isso a segunda causa é comum e não diz nada.
 *
 * A primeira versão desta varredura reportou **13 imagens partidas na
 * galeria** que estão todas na máquina dele, entre 52 e 155 KB. É o
 * X-26 outra vez, dentro de um teste escrito DEPOIS de o X-26 ter sido
 * aberto. Agora as duas causas vão para baldes diferentes, e o do
 * espelho traz um aviso a dizer que dele não se conclui nada.
 *
 * ── A AUTO-VERIFICAÇÃO ──────────────────────────────────────────────
 * Uma varredura que não encontra nada é indistinguível de uma que não
 * está a olhar — e este projeto teve quatro verificações a passar por
 * essa razão num só dia. Por isso esta começa por correr o detector
 * contra uma **página sintética com um defeito de cada tipo**, e só
 * continua se os encontrar todos.
 *
 * A primeira versão da guarda fixava-se num defeito REAL: "a
 * `index.html` tem seis imagens sem `alt`". Funcionou — disparou logo a
 * seguir — mas pela razão errada: **disparou porque eu corrigi as
 * seis.** Uma guarda amarrada a um defeito concreto quebra no momento
 * em que esse defeito deixa de existir, e passa a impedir o teste de
 * dar verde para sempre. Era o defeito de sempre deste projeto — um
 * número escrito num sítio que não é o dono dele — dentro da própria
 * verificação que existe para o apanhar.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PASSWORD_SIMULACAO } = require('./_credenciais');

const DIR_CLIENTE = path.resolve(__dirname, '..', 'cliente');
const DIR_GESTAO = path.resolve(__dirname, '..', 'funcionarios');
const RAIZ = 'file://' + DIR_CLIENTE + '/';
const RAIZ_GESTAO = 'file://' + DIR_GESTAO + '/';

/* ── AS DUAS METADES DO PROJETO ──────────────────────────────────────
   A primeira versão desta varredura tinha só as 8 páginas do cliente,
   e eu disse ao Guilherme que tinha "varrido o site por todo". **A app
   de gestão são mais dez ecrãs — metade do projeto — e nenhum deles
   tinha sido varrido.** Não foi uma limitação: foi uma lista que eu
   escrevi curta e uma afirmação que eu fiz larga.

   Os ecrãs de gestão precisam de sessão. Entra-se pelo `login.html`
   com `?simular=1`, como as outras suites fazem, e pela mesma razão: o
   `auth/login` fala com o Render a sério desde 04/09, e um teste que
   precisa da nuvem deixa de se poder correr antes de um commit. */
const PAGINAS = ['index.html', 'menu.html', 'galeria.html', 'reservas.html',
                 'sobre.html', 'contactos.html', 'mesa.html', 'takeaway.html'];

const ECRAS_GESTAO = ['dashboard.html', 'cozinha.html', 'balcao.html',
                      'produtos.html', 'stock.html', 'estatisticas.html',
                      'categorias.html', 'funcionarios.html', 'qrcodes.html'];

const LARGURAS = [1440, 768, 390];
/* A app de gestão usa-se num portátil ao balcão e numa cozinha, não
   num telemóvel — mas a F-54 tornou-a responsiva, por isso mede-se
   também a 768. */
const LARGURAS_GESTAO = [1440, 768];

/* ── DOIS LIMIARES, PORQUE A NORMA TEM DOIS ─────────────────────────
   A WCAG tem dois critérios para o tamanho de um alvo de toque:

     · 2.5.8 «Target Size (Minimum)» — nível **AA**, mínimo **24px**;
     · 2.5.5 «Target Size (Enhanced)» — nível **AAA**, mínimo 44px.

   Este projeto trabalha para **AA**, e adoptou os 44px como
   recomendação para os alvos principais. Misturar os dois num só
   limiar faz a varredura reportar, com o mesmo ❌, uma falha da norma
   e uma decisão já tomada de propósito.

   O caso concreto: os botões de quantidade da ementa têm **36x36**
   dentro de um grupo de 44px, e isso está escrito e justificado no
   `ementa-comum.js` desde a F-69. Não é um defeito — é uma troca
   consciente que passa o AA com folga. A varredura passou a dizer
   isso, em vez de o pôr ao lado de uma falha a sério. */
const ALVO_AA = 24;               /* falha a norma */
const ALVO_BOM = 44;              /* abaixo da recomendação do projeto */

/* As páginas da mesa e do take away precisam do modo de simulação, e a
   mesa precisa de um token; sem ele mostra (de propósito) o ecrã de
   erro, e não haveria página para varrer. */
const comParametros = pag => {
  if (pag === 'mesa.html') return pag + '?simular=1&mesa=demo-mesa-3';
  if (pag === 'takeaway.html') return pag + '?simular=1';
  return pag;
};

/* ─────────────────────────────────────────────────────────────────────
   O DETECTOR

   Corre dentro da página. Está numa constante, e não escrito à mão em
   dois sítios, porque é usado nas páginas a sério E na página sintética
   da auto-verificação — se fossem duas cópias, a guarda podia estar a
   provar que uma vê enquanto a outra está cega. Seria o defeito deste
   projeto (a mesma coisa escrita duas vezes) aplicado ao teste.
   ──────────────────────────────────────────────────────────────────── */
const DETECTOR = (min) => {
  const visivel = el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const nomear = el => (String(el.className || '').split(/\s+/)[0] || el.tagName.toLowerCase());

  const imgPartidas = [], imgSemAlt = [];
  for (const i of document.images) {
    const bruto = i.getAttribute('src');
    /* Um `<img src="">` é o espaço do lightbox à espera de uma
       fotografia: não é partida, é vazia de propósito. */
    if (!bruto) continue;
    const ficheiro = bruto.split('/').pop();
    if (i.complete && i.naturalWidth === 0) imgPartidas.push({ ficheiro, bruto });
    if (!i.hasAttribute('alt')) imgSemAlt.push(ficheiro);
  }

  const ligacoes = [...new Set([...document.querySelectorAll('a[href]')]
    .map(a => a.getAttribute('href'))
    .filter(h => h && !/^(https?:|mailto:|tel:|#|javascript:)/.test(h)))];

  const contagem = {};
  for (const el of document.querySelectorAll('[id]')) contagem[el.id] = (contagem[el.id] || 0) + 1;
  const idsRepetidos = Object.entries(contagem).filter(([, n]) => n > 1)
    .map(([id, n]) => `${id} (${n}x)`);

  const semNome = [];
  for (const el of document.querySelectorAll('a, button')) {
    if (!visivel(el)) continue;
    const temTexto = (el.textContent || '').replace(/\s+/g, '').length > 0;
    if (!(temTexto || el.getAttribute('aria-label') || el.getAttribute('title')
          || el.querySelector('img[alt]:not([alt=""])'))) {
      semNome.push(`<${el.tagName.toLowerCase()}> ${nomear(el)}`);
    }
  }

  const semRotulo = [];
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (el.type === 'hidden' || !visivel(el)) continue;
    /* Um `placeholder` NÃO conta: desaparece ao escrever, e os leitores
       de ecrã tratam-no de maneiras diferentes. */
    if (!((el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label')
          || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
          || el.getAttribute('title'))) {
      semRotulo.push(`${el.tagName.toLowerCase()}#${el.id || '(sem id)'}`);
    }
  }

  const falhaAA = [], abaixoDoBom = [];
  for (const el of document.querySelectorAll('a, button, input[type="submit"], [role="button"]')) {
    if (!visivel(el)) continue;
    /* Um link dentro de um parágrafo é texto corrido e não um alvo
       isolado — a norma exclui-o de propósito. */
    if (el.tagName === 'A' && el.closest('p')) continue;
    const r = el.getBoundingClientRect();
    const etiqueta = `${nomear(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || '').trim().slice(0, 14)}"`;
    if (r.width < min.aa || r.height < min.aa) falhaAA.push(etiqueta);
    else if (r.width < min.bom || r.height < min.bom) abaixoDoBom.push(etiqueta);
  }

  return {
    imgPartidas, imgSemAlt, ligacoes, idsRepetidos, semNome, semRotulo,
    falhaAA: [...new Set(falhaAA)],
    abaixoDoBom: [...new Set(abaixoDoBom)],
    transbordo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

/* A página sintética: um defeito de cada tipo, e nada mais. */
const PAGINA_DEFEITUOSA = `
  <img src="nao-existe-de-proposito.jpg" width="40" height="40">
  <div id="repetido"></div><div id="repetido"></div>
  <button></button>
  <input type="text" placeholder="isto nao e um rotulo">
  <button style="width:20px;height:20px">x</button>
  <button style="width:30px;height:30px">y</button>
  <a href="ficheiro-que-nao-existe.html">ligacao</a>
  <div style="width:3000px;height:10px"></div>
`;

const achados = [];

/* ── X-27: ESTA SUITE NÃO CONTA "VERIFICAÇÕES" ─────────────────────
   E dizê-lo é metade do conserto. A varredura não faz afirmações
   pass/fail uma a uma: passa por cada página em cada largura e procura
   oito tipos de problema de uma vez. A unidade dela é o **varrimento**
   — uma página numa largura —, não a verificação.

   Forçar um número único sobre coisas que se contam de maneiras
   diferentes foi exactamente como nasceu o "360 verificações" que
   ninguém consegue recalcular. Por isso esta reporta na sua própria
   unidade, e o `contar.js` soma-as à parte. */
process.on('exit', () => {
  const varrimentos = (global.__varrimentos || 0);
  console.log(`\n::VARRIMENTOS:: ${require('path').basename(__filename)} ` +
              `${varrimentos} ${achados.length}`);
});
const nota = (pag, tipo, detalhe) => achados.push({ pag, tipo, detalhe });
const semEspelho = new Set();

/* Alvos entre 24 e 44px: passam o AA, ficam abaixo da recomendação que
   o projeto adoptou. Não são falhas e não contam para o veredicto. */
const recomendacoes = [];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ── A guarda, antes de tudo ───────────────────────────────────── */
  console.log('AUTO-VERIFICAÇÃO — o detector contra uma página com defeitos de propósito');
  {
    const p = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await p.setContent(PAGINA_DEFEITUOSA);
    await p.waitForTimeout(700);
    const d = await p.evaluate(DETECTOR, { aa: ALVO_AA, bom: ALVO_BOM });
    await p.close();

    const deveVer = {
      'imagem sem alt':          d.imgSemAlt.length,
      'imagem que não carrega':  d.imgPartidas.length,
      'id repetido':             d.idsRepetidos.length,
      'botão sem nome':          d.semNome.length,
      'campo sem rótulo':        d.semRotulo.length,
      'alvo que falha o AA':     d.falhaAA.length,
      'alvo abaixo dos 44px':    d.abaixoDoBom.length,
      'ligação para resolver':   d.ligacoes.length,
      'transbordo':              d.transbordo > 0 ? 1 : 0,
    };
    for (const [k, n] of Object.entries(deveVer)) {
      console.log(`  ${n > 0 ? '✅' : '❌'} ${k}: ${n}`);
    }
    const cegos = Object.entries(deveVer).filter(([, n]) => n === 0).map(([k]) => k);
    if (cegos.length) {
      console.log(`\n❌ O DETECTOR ESTÁ CEGO para: ${cegos.join(', ')}.`);
      console.log('   NÃO se pode ler o resto desta saída como verde.');
      process.exit(2);
    }
    console.log('  → vê os oito tipos\n');
  }

  /* ── As páginas a sério ────────────────────────────────────────── */
  for (const pag of PAGINAS) {
    for (const largura of LARGURAS) {
      const p = await browser.newPage({ viewport: { width: largura, height: 900 } });

      const errosJs = [];
      p.on('pageerror', e => errosJs.push(e.message.split('\n')[0].slice(0, 120)));
      p.on('console', m => {
        if (m.type() !== 'error') return;
        const t = m.text();
        /* As fontes do Google, o Tailwind do CDN e a API não são
           alcançáveis deste contentor (a rede de saída não os deixa
           passar). Isso é do ambiente, não do site. */
        if (/fonts\.googleapis|fonts\.gstatic|cdn\.tailwindcss|onrender\.com|ERR_/.test(t)) return;
        errosJs.push('consola: ' + t.split('\n')[0].slice(0, 120));
      });

      await p.goto(RAIZ + comParametros(pag), { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(900);
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.evaluate(() => Promise.race([
        Promise.all([...document.images].map(i => i.complete ? 0
          : new Promise(r => { i.onload = i.onerror = r; }))),
        new Promise(r => setTimeout(r, 2500)),
      ]));
      await p.waitForTimeout(400);

      global.__varrimentos = (global.__varrimentos || 0) + 1;   // X-27
      const m = await p.evaluate(DETECTOR, { aa: ALVO_AA, bom: ALVO_BOM });

      for (const href of m.ligacoes) {
        const alvo = path.resolve(DIR_CLIENTE, href.split('?')[0].split('#')[0]);
        if (!fs.existsSync(alvo)) nota(pag, 'ligação morta', href);
      }

      /* As duas causas de uma imagem que não carrega, separadas. */
      for (const { ficheiro, bruto } of m.imgPartidas) {
        const alvo = path.resolve(DIR_CLIENTE, bruto.split('?')[0]);
        if (fs.existsSync(alvo)) nota(pag, 'imagem partida', `${ficheiro} — existe e não carrega`);
        else semEspelho.add(path.relative(path.resolve(DIR_CLIENTE, '..', '..'), alvo));
      }

      if (errosJs.length) nota(pag, 'erro de JS', [...new Set(errosJs)].join(' | '));
      if (m.idsRepetidos.length) nota(pag, 'id repetido', m.idsRepetidos.join(', '));
      if (m.semNome.length) nota(pag, 'sem nome acessível', m.semNome.join(', '));
      if (m.semRotulo.length) nota(pag, 'campo sem rótulo', m.semRotulo.join(', '));
      if (m.transbordo > 0) nota(pag, 'transbordo', `${m.transbordo}px a ${largura}px`);

      /* Não depende da largura — contá-lo uma vez só evita três cópias
         do mesmo achado no relatório. */
      if (largura === 1440 && m.imgSemAlt.length) {
        nota(pag, 'imagem sem alt', m.imgSemAlt.join(', '));
      }
      /* Os alvos de toque só interessam ao telemóvel. */
      if (largura === 390) {
        if (m.falhaAA.length) {
          nota(pag, `❌ ALVO ABAIXO DE ${ALVO_AA}px — falha a WCAG AA`,
               m.falhaAA.slice(0, 6).join(' · '));
        }
        if (m.abaixoDoBom.length) {
          recomendacoes.push({ pag, detalhe: m.abaixoDoBom.slice(0, 6).join(' · ')
            + (m.abaixoDoBom.length > 6 ? ` … +${m.abaixoDoBom.length - 6}` : '') });
        }
      }

      await p.close();
    }
  }

  /* ── A app de gestão ──────────────────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const entrada = await ctx.newPage();
    await entrada.goto(`${RAIZ_GESTAO}login.html?simular=1`);
    await entrada.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await entrada.goto(`${RAIZ_GESTAO}login.html?simular=1`);
    await entrada.fill('#email', 'admin@vemproabate.pt');
    await entrada.fill('#password', PASSWORD_SIMULACAO);
    await entrada.click('#btnEntrar');
    await entrada.waitForTimeout(1500);
    const entrou = await entrada.evaluate(() => {
      try { return !!localStorage.getItem('vpa_token') || !location.pathname.endsWith('login.html'); }
      catch (e) { return false; }
    });
    await entrada.close();

    if (!entrou) {
      nota('(gestão)', 'não foi possível entrar', 'o login simulado falhou — os 9 ecrãs de gestão NÃO foram varridos');
    } else {
      for (const ecra of ECRAS_GESTAO) {
        for (const largura of LARGURAS_GESTAO) {
          const p = await ctx.newPage();
          await p.setViewportSize({ width: largura, height: 1000 });

          const errosJs = [];
          p.on('pageerror', e => errosJs.push(e.message.split('\n')[0].slice(0, 120)));
          p.on('console', m => {
            if (m.type() !== 'error') return;
            const t = m.text();
            if (/fonts\.googleapis|fonts\.gstatic|cdn\.tailwindcss|onrender\.com|ERR_/.test(t)) return;
            errosJs.push('consola: ' + t.split('\n')[0].slice(0, 120));
          });

          await p.goto(`${RAIZ_GESTAO}${ecra}?simular=1`, { waitUntil: 'domcontentloaded' });
          await p.waitForTimeout(1400);
          await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await p.waitForTimeout(500);

          global.__varrimentos = (global.__varrimentos || 0) + 1;   // X-27
      const m = await p.evaluate(DETECTOR, { aa: ALVO_AA, bom: ALVO_BOM });
          const etiqueta = 'gestão/' + ecra.replace('.html', '');

          for (const href of m.ligacoes) {
            const alvo = path.resolve(DIR_GESTAO, href.split('?')[0].split('#')[0]);
            if (!fs.existsSync(alvo)) nota(etiqueta, 'ligação morta', href);
          }
          for (const { ficheiro, bruto } of m.imgPartidas) {
            const alvo = path.resolve(DIR_GESTAO, bruto.split('?')[0]);
            if (fs.existsSync(alvo)) nota(etiqueta, 'imagem partida', `${ficheiro} — existe e não carrega`);
            else semEspelho.add(path.relative(path.resolve(DIR_GESTAO, '..', '..'), alvo));
          }
          if (errosJs.length) nota(etiqueta, 'erro de JS', [...new Set(errosJs)].join(' | '));
          if (m.idsRepetidos.length) nota(etiqueta, 'id repetido', m.idsRepetidos.join(', '));
          if (m.semNome.length) nota(etiqueta, 'sem nome acessível', m.semNome.slice(0, 5).join(', '));
          if (m.semRotulo.length) nota(etiqueta, 'campo sem rótulo', m.semRotulo.slice(0, 5).join(', '));
          if (m.transbordo > 0) nota(etiqueta, 'transbordo', `${m.transbordo}px a ${largura}px`);
          if (largura === 1440 && m.imgSemAlt.length) nota(etiqueta, 'imagem sem alt', m.imgSemAlt.join(', '));
          if (largura === 768 && m.falhaAA.length) {
            nota(etiqueta, `❌ ALVO ABAIXO DE ${ALVO_AA}px — falha a WCAG AA`, m.falhaAA.slice(0, 5).join(' · '));
          }

          await p.close();
        }
      }
    }
    await ctx.close();
  }

  await browser.close();

  console.log(`VARRIDAS ${PAGINAS.length} páginas do cliente x ${LARGURAS.length} larguras`);
  console.log(`         ${ECRAS_GESTAO.length} ecrãs de gestão x ${LARGURAS_GESTAO.length} larguras`);
  console.log('-'.repeat(66));

  if (semEspelho.size) {
    console.log(`\n⚠️  ESPELHO INCOMPLETO — ${semEspelho.size} ficheiro(s) que o site pede e que NÃO estão neste contentor.`);
    console.log('   NÃO é defeito do site: é o contentor a não ter os ficheiros.');
    console.log('   Confirmar na máquina de trabalho antes de concluir o que seja.');
    for (const f of [...semEspelho].sort().slice(0, 6)) console.log(`     ${f}`);
    if (semEspelho.size > 6) console.log(`     … +${semEspelho.size - 6}`);
  }

  if (recomendacoes.length) {
    console.log(`\nℹ️  ABAIXO DOS ${ALVO_BOM}px, MAS ACIMA DOS ${ALVO_AA}px DO AA — ${recomendacoes.length}`);
    console.log('   Passam a norma. Ficam abaixo da recomendação que o projeto adoptou');
    console.log('   para os alvos principais — os botões de quantidade da ementa são');
    console.log('   36x36 num grupo de 44px, decidido e justificado na F-69.');
    for (const r of recomendacoes) console.log(`     ${r.pag.padEnd(15)} ${r.detalhe}`);
  }

  if (!achados.length) {
    console.log('\n✅ nada a apontar');
    process.exit(0);
  }

  const porTipo = {};
  for (const a of achados) (porTipo[a.tipo] ??= []).push(a);

  for (const [tipo, lista] of Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n❌ ${tipo.toUpperCase()} — ${lista.length}`);
    for (const a of lista) console.log(`   ${a.pag.padEnd(15)} ${a.detalhe}`);
  }

  console.log(`\n${achados.length} achado(s) em ${Object.keys(porTipo).length} categoria(s)`);
  process.exit(1);
})();
