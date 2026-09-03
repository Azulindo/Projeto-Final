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

function lum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function razao(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const maus = [];

  for (const nome of PAGS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(__dirname, `../cliente/${nome}.html`));
    await p.waitForTimeout(1200);

    const amostras = await p.evaluate(() => {
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
          if (getComputedStyle(e).backgroundImage !== 'none') return 'GRADIENTE';
        }
        return getComputedStyle(document.body).backgroundColor;
      }
      const vistos = new Set(); const saida = [];
      document.querySelectorAll('a, button, p, h1, h2, h3, span, li, label').forEach(el => {
        const t = (el.textContent || '').trim();
        if (!t || t.length > 60) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity < 0.5) return;
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        const chave = s.color + '|' + t.slice(0, 20);
        if (vistos.has(chave)) return; vistos.add(chave);
        saida.push({ texto: t.slice(0, 28), cor: rgb(s.color), fundo: fundo(el),
                     px: parseFloat(s.fontSize), peso: s.fontWeight });
      });
      return saida;
    });

    for (const a of amostras) {
      if (a.fundo === 'GRADIENTE') continue;      // não dá para medir com uma cor só
      const f = (a.fundo.match(/\d+/g) || []).slice(0, 3).map(Number);
      if (f.length < 3) continue;
      const r = razao(a.cor, f);
      const grande = a.px >= 24 || (a.px >= 18.66 && +a.peso >= 700);
      const minimo = grande ? 3 : 4.5;
      if (r < minimo) maus.push({ pag: nome, ...a, razao: r, minimo });
    }
    await ctx.close();
  }

  await browser.close();
  console.log('\nCONTRASTE ABAIXO DO MÍNIMO (WCAG AA)');
  console.log('─'.repeat(66));
  if (!maus.length) { console.log('  nada a apontar ✅'); return; }
  maus.sort((a, b) => a.razao - b.razao).forEach(m =>
    console.log(`  ${m.razao.toFixed(2)}:1 (mín ${m.minimo})  ${m.pag.padEnd(10)} ${String(m.px)+'px'} "${m.texto}"`));
  console.log(`\n  ${maus.length} ocorrência(s). Nota: gradientes não são medidos — só cores sólidas.`);
})();
