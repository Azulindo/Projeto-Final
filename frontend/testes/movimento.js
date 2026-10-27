/**
 * movimento.js — F-88. Quem pede menos movimento recebe menos movimento?
 * =====================================================================
 * O site tem onze animacoes `infinite` espalhadas por sete folhas. Antes
 * de 27/10 declarava respeitar o `prefers-reduced-motion` em tres sitios
 * — e cada um cobria UMA coisa: o sublinhado do menu, a moldura dos
 * criadores, o spinner da ementa. As outras oito corriam na mesma.
 *
 * Tres declaracoes parciais sao piores do que nenhuma: fazem a coisa
 * parecer tratada. Este teste existe para isso nao voltar a acontecer
 * em silencio quando alguem acrescentar a decima segunda animacao.
 *
 * ── O QUE MEDE ───────────────────────────────────────────────────────
 * Abre as seis paginas do cliente com `prefers-reduced-motion: reduce`
 * e, para cada elemento (e cada `::before`) com uma animacao infinita,
 * le as propriedades animadas CINCO vezes em intervalos desiguais. Se
 * algum valor mudar, a animacao esta viva.
 *
 * **Cinco amostras e nao duas, e em intervalos desiguais, de proposito.**
 * A primeira versao desta sonda comparava duas leituras com 1,2s de
 * intervalo — e num valor periodico duas leituras podem coincidir por
 * sorte. Deu a `index` por "parada" quando ela estava era sem animacao
 * nenhuma (ver o X-29 do heatGlow em falta).
 *
 * ── O QUE FICA DE FORA, E PORQUE ─────────────────────────────────────
 * O `typingDot` — "o bot esta a escrever" — e informacao, nao decoracao.
 * Movimento que responde a uma accao e que diz o que esta a acontecer
 * pode ficar. O `ementaGira` idem: e um indicador de carregamento.
 *
 * ── CONTROLO NEGATIVO ────────────────────────────────────────────────
 * No fim, o teste CORRE OUTRA VEZ com a preferencia desligada e exige
 * que as mesmas animacoes estejam a mexer. Sem isso, um teste que nao
 * encontrasse animacao nenhuma — porque o seletor mudou, porque a folha
 * nao carregou, porque a pagina rebentou — passava a verde a dizer que
 * estava tudo parado. Uma verificacao que nunca esteve vermelha nao se
 * sabe se sabe reprovar.
 *
 * Correr:  node frontend/testes/movimento.js
 * (precisa do Playwright com um Chromium, como os outros desta pasta)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..', '..');
const PORTA = 8188;
const BASE = `http://127.0.0.1:${PORTA}`;

const PAGINAS = ['index', 'menu', 'reservas', 'galeria', 'sobre', 'contactos'];

/* Animacoes que CONTAM COMO INFORMACAO e por isso continuam a mexer. */
const INFORMATIVAS = /typingDot|ementaGira/;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

let falhas = 0;
let total = 0;

function conferir(nome, ok, detalhe) {
  total++;
  if (!ok) falhas++;
  console.log(`  ${ok ? '✅' : '❌'} ${nome}${detalhe ? '  — ' + detalhe : ''}`);
}

function servidor() {
  return http.createServer((req, res) => {
    const ficheiro = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
    if (!ficheiro.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
    fs.readFile(ficheiro, (erro, dados) => {
      if (erro) { res.writeHead(404).end('nao ha'); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ficheiro)] || 'application/octet-stream' });
      res.end(dados);
    });
  });
}

/** As propriedades animadas de tudo o que tem animacao infinita. */
async function fotografar(pagina) {
  return pagina.evaluate(() => {
    const fora = {};
    for (const el of document.querySelectorAll('*')) {
      for (const pseudo of ['', '::before', '::after']) {
        const c = getComputedStyle(el, pseudo || undefined);
        if (!c.animationName || c.animationName === 'none') continue;
        if (c.animationIterationCount !== 'infinite') continue;
        const classe = (typeof el.className === 'string' && el.className.trim())
          ? '.' + el.className.trim().split(/\s+/)[0]
          : el.tagName.toLowerCase();
        fora[`${classe}${pseudo} [${c.animationName}]`] =
          [c.opacity, c.filter, c.transform, c.boxShadow].join(' | ');
      }
    }
    return fora;
  });
}

/** Cinco leituras em intervalos desiguais; devolve o que mudou. */
async function oQueMexe(pagina) {
  const amostras = [await fotografar(pagina)];
  for (const espera of [370, 640, 910, 1130]) {
    await pagina.waitForTimeout(espera);
    amostras.push(await fotografar(pagina));
  }
  const primeira = amostras[0];
  const mexem = new Set();
  for (const chave of Object.keys(primeira)) {
    if (amostras.some(a => a[chave] !== primeira[chave])) mexem.add(chave);
  }
  return { todas: Object.keys(primeira), mexem };
}

async function medirPaginas(navegador, reduzido) {
  const ctx = await navegador.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: reduzido ? 'reduce' : 'no-preference',
  });
  const porPagina = {};
  for (const pg of PAGINAS) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/frontend/cliente/${pg}.html`, { waitUntil: 'load' });
    await p.waitForTimeout(500);
    porPagina[pg] = await oQueMexe(p);
    await p.close();
  }
  await ctx.close();
  return porPagina;
}

(async () => {
  const srv = servidor();
  await new Promise(r => srv.listen(PORTA, '127.0.0.1', r));
  const navegador = await chromium.launch();

  console.log('\nCOM "REDUZIR MOVIMENTO" LIGADO — nada decorativo pode mexer');
  console.log('─'.repeat(66));
  const comReduce = await medirPaginas(navegador, true);

  let decorativasVistas = 0;
  for (const pg of PAGINAS) {
    const { todas, mexem } = comReduce[pg];
    const decorativas = todas.filter(k => !INFORMATIVAS.test(k));
    decorativasVistas += decorativas.length;
    const vivas = decorativas.filter(k => mexem.has(k));
    conferir(`${pg.padEnd(10)} ${decorativas.length} decorativa(s) parada(s)`,
      vivas.length === 0, vivas.length ? `ainda mexem: ${vivas.join(', ')}` : '');
  }

  /* O teste tem de ter encontrado animacoes: zero animacoes tambem dava
     "nada mexe", e isso nao e a mesma coisa que estar tudo parado. */
  conferir(`encontrou animacoes decorativas para medir (${decorativasVistas})`,
    decorativasVistas >= 8, decorativasVistas < 8
      ? 'esperava pelo menos 8 — o seletor ou as folhas mudaram?' : '');

  console.log('\nCONTROLO NEGATIVO — com a preferencia DESLIGADA tem de mexer');
  console.log('─'.repeat(66));
  const semReduce = await medirPaginas(navegador, false);
  for (const pg of PAGINAS) {
    const { todas, mexem } = semReduce[pg];
    const decorativas = todas.filter(k => !INFORMATIVAS.test(k));
    if (!decorativas.length) continue;
    const paradas = decorativas.filter(k => !mexem.has(k));
    conferir(`${pg.padEnd(10)} ${decorativas.length} decorativa(s) a mexer`,
      paradas.length === 0, paradas.length
        ? `paradas quando deviam mexer: ${paradas.join(', ')}` : '');
  }

  await navegador.close();
  srv.close();

  console.log(`\n${total - falhas}/${total} verificacoes passaram`);
  if (falhas) {
    console.log('\nSe falhou a primeira metade: ha uma animacao nova que o bloco de');
    console.log('prefers-reduced-motion do nav.css nao cobre. Os @keyframes dela');
    console.log('precisam de ser redefinidos la dentro, como o heatGlow e o zoomIn.');
  }
  process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO:', e); process.exit(2); });

/* X-27: a linha que torna o total desta suite recalculável. Impressa na
   saída do processo, porque cada suite acaba à sua maneira. */
process.on('exit', () => {
  console.log(`\n::VERIFICACOES:: ${require('path').basename(__filename)} ${total} ${falhas}`);
});
