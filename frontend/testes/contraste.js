/**
 * Contraste do texto — a parte da "revisão visual" que NÃO é gosto.
 *
 * A F-60 é a única tarefa da lista sem critério de medida, e por isso
 * fica sempre para o fim. Mas uma parte dela é aritmética: o contraste
 * entre a cor do texto e o fundo é uma razão, e a WCAG diz onde está o
 * limite (4,5:1 para texto normal, 3:1 para texto grande).
 *
 * Isto não decide se o site é bonito. Decide se se consegue ler.
 */
const { chromium } = require('playwright');
const path = require('path');

const PAGS = ['index','menu','galeria','sobre','contactos','reservas'];

/* ── Os ecrãs de GESTÃO (acrescentados 11/09, F-60) ────────────────────
   Este teste mediu durante dias só as seis páginas do cliente e dizia
   "nada a apontar" — mas a aplicação de gestão são dez ecrãs, com
   tabelas, etiquetas de estado e formulários, e nunca foram medidos.
   Um teste que cobre metade do projeto e relata em voz de quem cobriu
   tudo é o mesmo defeito da auditoria responsiva a medir uma página sem
   estilos: a verificação passava por não estar a olhar para tudo.

   Um `administrador` chega a todos os nove — os `data-niveis` de todos
   incluem `administrador` —, por isso basta uma sessão. O `login.html`
   mede-se sem sessão nenhuma, que é como ele é visto.

   A 1440 e não a 390: esta aplicação vive num portátil ou num monitor
   de parede. A largura importa porque o limite da WCAG depende do
   tamanho da letra (3:1 acima de 24px, ou 18,66px a negrito; 4,5:1 no
   resto), e CSS responsivo muda tamanhos. O cliente continua a ser
   medido ao telemóvel, que é onde ele é usado. */
const GESTAO = ['dashboard','cozinha','balcao','qrcodes','produtos',
                'categorias','funcionarios','stock','estatisticas'];

function lum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function razao(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * amostrar — as cores de cada texto visível de uma página.
 *
 * Está numa função e não escrita duas vezes, uma para o cliente e outra
 * para a gestão. Duas cópias desta lógica acabariam como as outras
 * cópias deste projeto acabaram: uma ganha uma correção e a outra não,
 * e depois há dois testes de contraste a discordar.
 */
async function amostrar(p) {
    return p.evaluate(() => {
      const rgb = s => (s.match(/\d+/g) || []).slice(0, 3).map(Number);
      // Sobe pelos pais até encontrar um fundo opaco de verdade
      function fundo(el) {
        for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
          const c = getComputedStyle(e).backgroundColor;
          const m = c.match(/rgba?\(([^)]+)\)/);
          if (!m) continue;
          const v = m[1].split(',').map(s => parseFloat(s));
          if (v.length < 4 || v[3] > 0.85) {
            if (!(v[0] === 0 && v[1] === 0 && v[2] === 0 && v.length >= 4 && v[3] === 0)) return c;
          }
          // Antes isto devolvia a palavra "GRADIENTE" e o teste desistia.
          // Agora devolve a própria declaração: um `linear-gradient(...)`
          // traz as cores lá dentro, e todas dão para medir. Uma
          // fotografia (`url(...)`) continua a não dar — mas passa a ser
          // DITA em voz alta, em vez de desaparecer em silêncio.
          const img = getComputedStyle(e).backgroundImage;
          if (img !== 'none') return img;
        }
        return getComputedStyle(document.body).backgroundColor;
      }
      const paradas = img => [...img.matchAll(/rgba?\(([^)]+)\)/g)]
        .map(m => m[1].split(',').map(s => parseFloat(s)))
        .filter(v => v.length < 4 || v[3] > 0.85)
        .map(v => v.slice(0, 3));

      /* Os títulos "de fogo" do site (`.h1-menu`, `.section-title`) usam
         `background-clip: text` + `color: transparent`: ali o gradiente
         É A LETRA, não o fundo. Medir a cor do texto (transparente) contra
         o gradiente dava nove falsos alarmes. O certo é o contrário —
         as cores do gradiente são o texto, e o fundo é o do elemento
         de cima. */
      const letraGradiente = s =>
        (s.webkitBackgroundClip === 'text' || s.backgroundClip === 'text') &&
        s.backgroundImage !== 'none';

      const vistos = new Set(); const saida = [];
      document.querySelectorAll('a, button, p, h1, h2, h3, span, li, label').forEach(el => {
        const t = (el.textContent || '').trim();
        if (!t || t.length > 60) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity < 0.5) return;
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        const chave = s.color + s.backgroundImage.slice(0, 40) + '|' + t.slice(0, 20);
        if (vistos.has(chave)) return; vistos.add(chave);
        const emGradiente = letraGradiente(s);
        saida.push({
          texto: t.slice(0, 28),
          cores: emGradiente ? paradas(s.backgroundImage) : [rgb(s.color)],
          fundo: fundo(emGradiente ? el.parentElement : el),
          gradienteNaLetra: emGradiente,
          px: parseFloat(s.fontSize), peso: s.fontWeight });
      });
      return saida;
    });
}

/**
 * avaliar — dado o que a página tinha, o que é que fica abaixo do mínimo.
 *
 * Também numa função só, pela mesma razão. Escreve nos três cestos que
 * recebe: os ilegíveis, as letras em gradiente e o que não deu para
 * medir.
 */
function avaliar(nome, amostras, cestos) {
  const { maus, letras, naoMedidos } = cestos;
    for (const a of amostras) {
      const grande = a.px >= 24 || (a.px >= 18.66 && +a.peso >= 700);
      const minimo = grande ? 3 : 4.5;
      if (!a.cores.length) continue;

      // Fotografia por trás do texto: não há uma cor para medir, e
      // inventar uma seria pior do que não medir. Fica registado.
      if (/url\(/.test(a.fundo)) {
        naoMedidos.push({ pag: nome, ...a, porque: 'imagem de fundo' });
        continue;
      }

      // Fundos possíveis: um gradiente tem várias cores e o texto
      // atravessa-as todas — se falha num ponto, há uma parte onde não
      // se lê. Mede-se contra todas e fica a pior.
      let fundos;
      if (/gradient\(/.test(a.fundo)) {
        fundos = [...a.fundo.matchAll(/rgba?\(([^)]+)\)/g)]
          .map(m => m[1].split(',').map(s => parseFloat(s)))
          .filter(v => v.length < 4 || v[3] > 0.85)
          .map(v => v.slice(0, 3));
      } else {
        const f = (a.fundo.match(/\d+/g) || []).slice(0, 3).map(Number);
        fundos = f.length >= 3 ? [f] : [];
      }
      if (!fundos.length) continue;

      let pior = Infinity, parTexto = null, parFundo = null;
      for (const cor of a.cores) {
        for (const fun of fundos) {
          const r = razao(cor, fun);
          if (r < pior) { pior = r; parTexto = cor; parFundo = fun; }
        }
      }

      if (pior < minimo) {
        const desc = a.gradienteNaLetra
          ? `letra em gradiente (pior tom rgb(${parTexto.join(',')})) sobre rgb(${parFundo.join(',')})`
          : `rgb(${parTexto.join(',')}) sobre ${fundos.length > 1 ? 'gradiente, pior ponto ' : ''}rgb(${parFundo.join(',')})`;
        const achado = { pag: nome, texto: a.texto, px: a.px, razao: pior, minimo, sobre: desc };
        // A letra em gradiente é um caso à parte: só a ponta da letra
        // fica escura, o resto está muito acima do mínimo. Reportar isso
        // ao lado de um botão ilegível seria gritar as duas coisas com a
        // mesma força — e quem lê deixa de distinguir o que é urgente.
        (a.gradienteNaLetra ? letras : maus).push(achado);
      }
    }
}

/* Entra na aplicação de gestão. Com `?simular=1`, como todos os outros
   testes: o `auth/login` fala com o Render a sério desde 04/09, e um
   teste que precisa da nuvem deixa de se poder correr antes de um
   commit. */
async function entrarNaGestao(ctx, base) {
  const p = await ctx.newPage();
  p.on('pageerror', () => {});
  await p.goto(`${base}/login.html?simular=1`);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(`${base}/login.html?simular=1`);
  await p.fill('#email', 'admin@vemproabate.pt');
  await p.fill('#password', 'abate2026');
  await p.click('#btnEntrar');
  await p.waitForTimeout(1600);
  return p;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const cestos = { maus: [], letras: [], naoMedidos: [] };
  const { maus, letras, naoMedidos } = cestos;

  /* ── 1. O site do cliente, ao telemóvel ──────────────────────────── */
  for (const nome of PAGS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const p = await ctx.newPage();
    p.on('pageerror', () => {});
    await p.goto('file://' + path.resolve(__dirname, `../cliente/${nome}.html`));
    await p.waitForTimeout(1200);
    avaliar(nome, await amostrar(p), cestos);
    await ctx.close();
  }

  /* ── 2. A aplicação de gestão, num ecrã de trabalho ──────────────── */
  const base = 'file://' + path.resolve(__dirname, '..', 'funcionarios');
  const ctxG = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  /* O login primeiro, e sem sessão — é assim que ele é visto. */
  const pLogin = await ctxG.newPage();
  pLogin.on('pageerror', () => {});
  await pLogin.goto(`${base}/login.html?simular=1`);
  await pLogin.waitForTimeout(900);
  avaliar('login', await amostrar(pLogin), cestos);
  await pLogin.close();

  const pg = await entrarNaGestao(ctxG, base);
  for (const nome of GESTAO) {
    await pg.goto(`${base}/${nome}.html?simular=1`);
    /* 2,2 s porque estes ecrãs desenham as tabelas depois de a página
       abrir. Medir enquanto diz "A carregar…" media o ecrã errado — e
       era exactamente esse o erro da auditoria responsiva. */
    await pg.waitForTimeout(2200);
    avaliar(nome, await amostrar(pg), cestos);
  }
  await ctxG.close();

  await browser.close();
  console.log(`\nMEDIDAS: ${PAGS.length} páginas de cliente (390px) + ${GESTAO.length + 1} ecrãs de gestão (1440px)`);
  console.log('\nCONTRASTE ABAIXO DO MÍNIMO (WCAG AA)');
  console.log('─'.repeat(66));
  if (!maus.length) {
    console.log('  nada a apontar ✅');
  } else {
    maus.sort((a, b) => a.razao - b.razao).forEach(m =>
      console.log(`  ${m.razao.toFixed(2)}:1 (min ${m.minimo})  ${m.pag.padEnd(10)} ${String(m.px)+'px'} "${m.texto}"\n      sobre ${m.sobre}`));
    console.log(`\n  ${maus.length} ocorrencia(s).`);
  }

  if (letras.length) {
    console.log('\n\u25B3 LETRAS COM GRADIENTE — so a ponta da letra fica escura');
    console.log('\u2500'.repeat(66));
    letras.sort((a, b) => a.razao - b.razao).forEach(m =>
      console.log(`  ${m.razao.toFixed(2)}:1 (min ${m.minimo})  ${m.pag.padEnd(10)} "${m.texto}"`));
    console.log('  O gradiente destes titulos vai de #ffcc00 (12,7:1) a #7a0000 (1,7:1).');
    console.log('  90% da letra le-se bem; falha a base. Nao e o mesmo que um botao');
    console.log('  ilegivel — mas subir a ultima paragem para #b52d00 poe tudo acima de 3:1.');
  }

  /* O que o teste NAO consegue medir fica a dizer que nao consegue.
     Um teste calado sobre o que nao viu da confianca a mais: foi
     assim que os botoes da homepage passaram meses a 2,5:1 com o
     teste a dizer "nada a apontar". */
  if (naoMedidos.length) {
    console.log('\n\u26A0\uFE0F  NAO FOI POSSIVEL MEDIR (texto sobre imagem)');
    console.log('\u2500'.repeat(66));
    const chaves = new Set();
    naoMedidos.forEach(n => {
      const k = n.pag + '|' + n.texto;
      if (chaves.has(k)) return; chaves.add(k);
      console.log(`  ${n.pag.padEnd(10)} ${String(n.px)+'px'} "${n.texto}" \u2014 ${n.porque}`);
    });
    console.log('  (estes tem de ser vistos a olho, sobre a imagem real)');
  }
})();
