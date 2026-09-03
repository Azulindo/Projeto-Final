/**
 * Auditoria de responsividade — F-54 e F-59.
 *
 * Mede em vez de opinar. Em cada largura procura os defeitos que
 * estragam mesmo a experiência num telemóvel:
 *
 *   1. Scroll horizontal — a página abana de lado. É o pior de todos.
 *   2. Que elemento é que o causa (não chega dizer que existe).
 *   3. Alvos de toque abaixo de 44×44 px (mínimo da Apple e da WCAG).
 *   4. Texto abaixo de 12 px, ilegível a olho nu.
 *   5. Elementos que se sobrepõem uns aos outros.
 *   6. Peso das imagens que a página vai buscar.
 */
const { chromium } = require('playwright');
const path = require('path');

const RAIZ = 'file://' + path.resolve(__dirname, '..');

/* Larguras reais, não redondas. O iPhone SE ainda é o telemóvel mais
   pequeno que vale a pena suportar; 360 é o Android mediano. */
const ECRAS = [
  { nome: 'iPhone SE',    largura: 320,  altura: 568,  movel: true },
  { nome: 'Android médio', largura: 360, altura: 800,  movel: true },
  { nome: 'iPhone 14',    largura: 390,  altura: 844,  movel: true },
  { nome: 'Tablet',       largura: 768,  altura: 1024, movel: true },
  { nome: 'Portátil',     largura: 1280, altura: 800,  movel: false },
];

const PAGINAS = [
  { url: 'cliente/index.html',      nome: 'Início' },
  { url: 'cliente/menu.html',       nome: 'Ementa' },
  { url: 'cliente/galeria.html',    nome: 'Galeria' },
  { url: 'cliente/sobre.html',      nome: 'Sobre' },
  { url: 'cliente/contactos.html',  nome: 'Contactos' },
  { url: 'cliente/reservas.html',   nome: 'Reservas' },
  { url: 'cliente/mesa.html?mesa=demo-mesa-6', nome: 'Mesa (QR)' },
];

const PAGINAS_GESTAO = [
  { url: 'funcionarios/dashboard.html', nome: 'Dashboard' },
  { url: 'funcionarios/cozinha.html',   nome: 'Cozinha' },
  { url: 'funcionarios/balcao.html',    nome: 'Balcão' },
  { url: 'funcionarios/qrcodes.html',   nome: 'QR Codes' },
];

/* Corre dentro da página. Devolve factos, não juízos. */
function medir() {
  const doc = document.documentElement;
  const larguraJanela = window.innerWidth;

  // 1. Overflow horizontal — e QUEM o causa.
  const transbordam = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const est = getComputedStyle(el);
    // Painéis fechados: ficam de propósito fora do ecrã, empurrados
    // para lá da margem com um transform. Não são transbordo — não
    // causam scroll nenhum. Isto apanha o próprio painel E o que está
    // lá dentro, que era o que me dava quatro falsos positivos no
    // ecrã do balcão, em todas as larguras.
    if (est.position === 'fixed' && r.left >= larguraJanela) return;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const ea = getComputedStyle(a);
      if (ea.position === 'fixed' && a.getBoundingClientRect().left >= larguraJanela - 1) return;
    }
    if (est.visibility === 'hidden' || est.display === 'none') return;
    if (r.right > larguraJanela + 1) {
      transbordam.push({
        etiqueta: el.tagName.toLowerCase() +
                  (el.id ? '#' + el.id : '') +
                  (typeof el.className === 'string' && el.className
                    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
                    : ''),
        direita: Math.round(r.right),
        excesso: Math.round(r.right - larguraJanela),
        texto: (el.textContent || '').trim().slice(0, 40),
      });
    }
  });

  // 2. Alvos de toque pequenos (só os que se veem)
  const alvosPequenos = [];
  document.querySelectorAll('a, button, input, select, [role="button"]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const est = getComputedStyle(el);
    if (est.visibility === 'hidden' || est.display === 'none' || est.opacity === '0') return;
    // Meio píxel de tolerância: um botão de 44 medido como 43,99 por
    // arredondamento do layout não é um alvo pequeno.
    if (r.height < 43.5 || r.width < 43.5) {
      alvosPequenos.push({
        etiqueta: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
        w: Math.round(r.width), h: Math.round(r.height),
        texto: (el.textContent || el.value || '').trim().slice(0, 28),
      });
    }
  });

  // 3. Texto miudinho
  const textoPequeno = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!el.childNodes.length) return;
    const temTextoProprio = [...el.childNodes]
      .some(n => n.nodeType === 3 && n.textContent.trim().length > 3);
    if (!temTextoProprio) return;
    const est = getComputedStyle(el);
    if (est.visibility === 'hidden' || est.display === 'none') return;
    const tam = parseFloat(est.fontSize);
    if (tam < 12) {
      textoPequeno.push({
        etiqueta: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
        px: Math.round(tam * 10) / 10,
        texto: el.textContent.trim().slice(0, 32),
      });
    }
  });

  // Se a página depende de uma folha de estilo externa que não carregou
  // (a mesa.html vai buscar o Tailwind a um CDN), o que se mede é a
  // página EM BRUTO: cada botão fica com a altura do texto e tudo
  // "transborda". Reportar isso são 22 problemas que não existem, e um
  // auditor que grita ao acaso deixa de ser lido. Diz que não sabe.
  const dependeDeCDN = !!document.querySelector('script[src*="cdn."], link[href*="cdn."]');
  const estiloAplicado = (() => {
    const corpo = getComputedStyle(document.body).backgroundColor;
    return corpo !== 'rgba(0, 0, 0, 0)' && corpo !== 'transparent';
  })();

  return {
    naoMedivel: dependeDeCDN && !estiloAplicado,
    scrollHorizontal: doc.scrollWidth > larguraJanela + 1,
    scrollWidth: doc.scrollWidth,
    larguraJanela,
    transbordam: transbordam.slice(0, 6),
    nTransbordam: transbordam.length,
    alvosPequenos: alvosPequenos.slice(0, 6),
    nAlvosPequenos: alvosPequenos.length,
    textoPequeno: textoPequeno.slice(0, 4),
    nTextoPequeno: textoPequeno.length,
    temViewport: !!document.querySelector('meta[name="viewport"]'),
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const problemas = [];
  const naoMedidas = new Set();
  const pesoPorPagina = {};

  async function auditar(paginas, ctxOpts = {}, rotulo = '') {
    for (const pag of paginas) {
      for (const ecra of ECRAS) {
        const ctx = await browser.newContext({
          viewport: { width: ecra.largura, height: ecra.altura },
          deviceScaleFactor: 1,
          isMobile: ecra.movel,
          hasTouch: ecra.movel,
          ...ctxOpts,
        });
        const page = await ctx.newPage();

        // Peso das imagens (só é preciso medir uma vez por página)
        if (!pesoPorPagina[pag.nome]) {
          const bytes = [];
          page.on('response', async r => {
            const t = r.request().resourceType();
            if (t === 'image') {
              try {
                const b = (await r.body()).length;
                bytes.push({ url: r.url().split('/').pop(), b });
              } catch (e) { /* ignora */ }
            }
          });
          page.once('load', () => { pesoPorPagina[pag.nome] = bytes; });
        }

        try {
          await page.goto(`${RAIZ}/${pag.url}`, { waitUntil: 'load', timeout: 15000 });
          await page.waitForTimeout(900);
          const r = await page.evaluate(medir);
          if (!pesoPorPagina[pag.nome]) pesoPorPagina[pag.nome] = [];

          const etiqueta = `${rotulo}${pag.nome} @ ${ecra.largura}px (${ecra.nome})`;
          if (r.naoMedivel) {
            naoMedidas.add(`${rotulo}${pag.nome}`);
            await ctx.close();
            continue;
          }
          if (!r.temViewport) problemas.push({ tipo: 'viewport', onde: etiqueta, detalhe: 'sem meta viewport' });
          if (r.scrollHorizontal) {
            problemas.push({
              tipo: 'overflow', onde: etiqueta,
              detalhe: `scrollWidth ${r.scrollWidth} > ${r.larguraJanela}`,
              culpados: r.transbordam, n: r.nTransbordam,
            });
          }
          if (r.nAlvosPequenos > 0 && ecra.movel) {
            problemas.push({ tipo: 'toque', onde: etiqueta, n: r.nAlvosPequenos, culpados: r.alvosPequenos });
          }
          if (r.nTextoPequeno > 0 && ecra.movel) {
            problemas.push({ tipo: 'texto', onde: etiqueta, n: r.nTextoPequeno, culpados: r.textoPequeno });
          }
        } catch (e) {
          problemas.push({ tipo: 'erro', onde: `${rotulo}${pag.nome} @ ${ecra.largura}px`, detalhe: e.message.slice(0, 120) });
        }
        await ctx.close();
      }
    }
  }

  await auditar(PAGINAS, {}, '');

  // A app de gestão precisa de sessão iniciada
  const sessao = JSON.stringify({
    token: 'demo', nome: 'Administração', nivel: 'administrador',
    expiraEm: Date.now() + 8 * 3600 * 1000,
  });
  await auditar(PAGINAS_GESTAO, {
    storageState: { cookies: [], origins: [] },
  }, 'GESTÃO · ');

  await browser.close();

  /* ── Relatório ─────────────────────────────────────────────── */
  const porTipo = t => problemas.filter(p => p.tipo === t);
  const linha = '─'.repeat(66);

  console.log('\n' + '═'.repeat(66));
  console.log('AUDITORIA DE RESPONSIVIDADE');
  console.log('═'.repeat(66));

  for (const [tipo, titulo] of [
    ['erro', '💥 PÁGINAS QUE NEM CARREGAM'],
    ['viewport', '📐 SEM META VIEWPORT'],
    ['overflow', '↔️  SCROLL HORIZONTAL (a página abana de lado)'],
    ['toque', '👆 ALVOS DE TOQUE ABAIXO DE 44px'],
    ['texto', '🔍 TEXTO ABAIXO DE 12px'],
  ]) {
    const lista = porTipo(tipo);
    console.log(`\n${titulo} — ${lista.length} ocorrência(s)`);
    console.log(linha);
    if (!lista.length) { console.log('  nada a apontar ✅'); continue; }
    lista.forEach(p => {
      console.log(`  ${p.onde}${p.detalhe ? ' — ' + p.detalhe : ''}${p.n ? ` (${p.n} elementos)` : ''}`);
      (p.culpados || []).forEach(c => {
        if (tipo === 'overflow') console.log(`      ↳ ${c.etiqueta} passa ${c.excesso}px  "${c.texto}"`);
        if (tipo === 'toque')    console.log(`      ↳ ${c.etiqueta} ${c.w}×${c.h}  "${c.texto}"`);
        if (tipo === 'texto')    console.log(`      ↳ ${c.etiqueta} ${c.px}px  "${c.texto}"`);
      });
    });
  }

  if (naoMedidas.size) {
    console.log('\n🚫 NÃO FOI POSSÍVEL MEDIR');
    console.log(linha);
    naoMedidas.forEach(n => console.log(`  ${n} — depende de uma folha de estilo externa que não carregou`));
    console.log('  (sem internet, esta página renderiza em bruto; tem de ser vista num browser com rede)');
  }

  console.log('\n🖼️  PESO DAS IMAGENS POR PÁGINA');
  console.log(linha);
  Object.entries(pesoPorPagina).forEach(([nome, imgs]) => {
    const total = imgs.reduce((a, i) => a + i.b, 0);
    const mb = (total / 1048576).toFixed(1);
    const aviso = total > 3 * 1048576 ? '  ⚠️' : '';
    console.log(`  ${nome.padEnd(14)} ${String(imgs.length).padStart(2)} imagens · ${mb.padStart(5)} MB${aviso}`);
    imgs.sort((a, b) => b.b - a.b).slice(0, 2).forEach(i =>
      console.log(`      ↳ ${i.url} — ${(i.b / 1048576).toFixed(2)} MB`));
  });

  console.log('\n' + '═'.repeat(66));
  console.log(`TOTAL: ${problemas.length} problemas em ${PAGINAS.length + PAGINAS_GESTAO.length} páginas × ${ECRAS.length} larguras`);
})();
