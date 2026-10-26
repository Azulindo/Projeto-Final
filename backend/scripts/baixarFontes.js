/**
 * F-68 — Guardar as fontes do Google no repositório.
 *
 * ── PORQUE É QUE ISTO EXISTE ────────────────────────────────────────
 * Porque as 18 páginas do projeto vão buscar o tipo de letra ao
 * `fonts.googleapis.com`, e o plano B da apresentação é servir o site
 * do portátil **sem internet**. Medido a 28/09, com o `sem-rede.js`:
 * sem rede, as 18 páginas carregam **zero** fontes. Nada rebenta — mas
 * o Nosifer, o Metal Mania e o Playfair desaparecem e o site fica com
 * a letra do sistema. Num projeto em que a tipografia é metade da cara
 * da marca, é a diferença entre mostrar o trabalho e mostrar outra
 * coisa.
 *
 * (Há indício de que já aconteceu uma vez: o X-08 — a banda branca que
 * o Guilherme nunca conseguiu reproduzir — apareceu numa corrida sem
 * rede em que o Nosifer não carregou.)
 *
 * ── PORQUE É UM SCRIPT E NÃO UMA CÓPIA À MÃO ────────────────────────
 * Porque copiar ficheiros à mão é a forma mais pura do defeito desta
 * casa: daqui a um mês ninguém sabe de onde vieram, que versão são,
 * nem como se repete. Isto corre-se outra vez e dá o mesmo resultado,
 * e o `fontes.css` que gera diz lá dentro quando foi gerado.
 *
 * Correr com:  cd backend && node scripts/baixarFontes.js
 * Precisa de internet UMA vez. Depois disso o site deixa de precisar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

/* As quatro famílias, exactamente com os pesos que as páginas pedem —
   lidos dos `<link>` e não inventados. Pedir pesos a mais é engordar o
   repositório com ficheiros que ninguém desenha. */
const FAMILIAS = [
  { css: 'Inter:wght@400;500;600;700;800', nome: 'Inter' },
  { css: 'Metal+Mania', nome: 'MetalMania' },
  { css: 'Nosifer', nome: 'Nosifer' },
  { css: 'Playfair+Display:wght@700;800', nome: 'PlayfairDisplay' },
];

/* O user-agent decide o FORMATO que o Google devolve: com um Chrome
   moderno vem `woff2` (o menor); com um agente antigo vem `ttf`, que é
   três a quatro vezes maior. Não é truque — é a negociação normal do
   serviço, e vale a pena saber que existe. */
const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DESTINO = path.resolve(__dirname, '..', '..', 'assets', 'fontes');

function buscar(url, binario) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': AGENTE } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return buscar(res.headers.location, binario).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`${res.statusCode} em ${url}`));
      }
      const pedacos = [];
      res.on('data', (d) => pedacos.push(d));
      res.on('end', () => resolve(binario
        ? Buffer.concat(pedacos)
        : Buffer.concat(pedacos).toString('utf8')));
    }).on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(DESTINO, { recursive: true });

  const regras = [];
  let total = 0;
  let ficheiros = 0;

  for (const fam of FAMILIAS) {
    const url = `https://fonts.googleapis.com/css2?family=${fam.css}&display=swap`;
    process.stdout.write(`\n${fam.nome}\n`);
    const css = await buscar(url, false);

    /* O CSS do Google vem em blocos, um por subconjunto de caracteres.
       Só se quer o `latin` — o português cabe todo lá (ã, ç, õ, é). Os
       outros (cirílico, grego, vietnamita) seriam ficheiros a ocupar
       espaço para letras que este site nunca escreve. */
    const blocos = css.split('/*').filter((b) => b.trim().startsWith('latin *'));
    if (!blocos.length) {
      throw new Error(`${fam.nome}: nenhum bloco "latin" no CSS do Google`);
    }

    /* Descarrega-se cada peso e guarda-se o CONTEÚDO, não o ficheiro:
       a decisão de quantos ficheiros escrever vem a seguir. */
    const pesos = [];
    for (const bloco of blocos) {
      const peso = (bloco.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
      const estilo = (bloco.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
      const src = (bloco.match(/url\((https:[^)]+)\)/) || [])[1];
      if (!src) continue;
      const bytes = await buscar(src, true);
      pesos.push({
        peso, estilo, bytes,
        soma: crypto.createHash('md5').update(bytes).digest('hex'),
        alcance: (bloco.match(/unicode-range:\s*([^;]+);/) || [])[1],
      });
    }
    if (!pesos.length) throw new Error(`${fam.nome}: nenhum ficheiro`);

    /* ── UM FICHEIRO OU VÁRIOS? PERGUNTA-SE AOS BYTES (F-68) ─────────
       O Inter e o Playfair do Google são **fontes variáveis**: os cinco
       URLs de peso do Inter devolvem o MESMO ficheiro, e é ele que
       contém todos os pesos lá dentro. A primeira versão disto
       escreveu-o cinco vezes — 235 KB para 47 KB de conteúdo — e o
       Playfair duas. Era o defeito desta casa na forma mais literal que
       ele já tomou: **os mesmos bytes, repetidos, em sítios que podem
       divergir.**
       Não se resolve com uma lista de "estas são variáveis", que era
       outra coisa para manter certa: comparam-se as somas de controlo.
       Iguais, é uma fonte variável e escreve-se uma vez, com o
       intervalo de pesos que ela cobre. Diferentes, escreve-se cada
       uma. Uma família nova entra sozinha, sem ninguém decidir nada. */
    const nomeCSS = fam.nome === 'MetalMania' ? 'Metal Mania'
      : fam.nome === 'PlayfairDisplay' ? 'Playfair Display' : fam.nome;
    const somas = new Set(pesos.map((p) => p.soma));
    const variavel = somas.size === 1 && pesos.length > 1;

    if (variavel) {
      const p = pesos[0];
      const nums = pesos.map((x) => parseInt(x.peso, 10));
      const intervalo = `${Math.min(...nums)} ${Math.max(...nums)}`;
      const nomeFicheiro = `${fam.nome}-variavel.woff2`;
      fs.writeFileSync(path.join(DESTINO, nomeFicheiro), p.bytes);
      total += p.bytes.length;
      ficheiros++;
      console.log(`  ${nomeFicheiro.padEnd(28)} ${(p.bytes.length / 1024).toFixed(1).padStart(6)} KB`
        + `   (variável: um ficheiro para os pesos ${pesos.map((x) => x.peso).join(', ')})`);
      regras.push(
        `/* Fonte variável: um ficheiro cobre os pesos ${intervalo.replace(' ', ' a ')}.\n`
        + `   Os ${pesos.length} URLs de peso do Google devolvem estes mesmos bytes. */\n`
        + `@font-face {\n`
        + `  font-family: '${nomeCSS}';\n`
        + `  font-style: ${p.estilo};\n`
        + `  font-weight: ${intervalo};\n`
        + `  font-display: swap;\n`
        + `  src: url('${nomeFicheiro}') format('woff2');\n`
        + (p.alcance ? `  unicode-range: ${p.alcance};\n` : '')
        + `}`);
    } else {
      for (const p of pesos) {
        const nomeFicheiro = `${fam.nome}-${p.peso}${p.estilo === 'italic' ? '-italico' : ''}.woff2`;
        fs.writeFileSync(path.join(DESTINO, nomeFicheiro), p.bytes);
        total += p.bytes.length;
        ficheiros++;
        console.log(`  ${nomeFicheiro.padEnd(28)} ${(p.bytes.length / 1024).toFixed(1).padStart(6)} KB`);
        regras.push(
          `@font-face {\n`
          + `  font-family: '${nomeCSS}';\n`
          + `  font-style: ${p.estilo};\n`
          + `  font-weight: ${p.peso};\n`
          + `  font-display: swap;\n`
          + `  src: url('${nomeFicheiro}') format('woff2');\n`
          + (p.alcance ? `  unicode-range: ${p.alcance};\n` : '')
          + `}`);
      }
    }
  }

  /* Ficheiros de corridas anteriores que esta já não escreve (por
     exemplo os `Inter-500.woff2` da versão que não sabia de fontes
     variáveis) ficariam no repositório a enganar quem os visse. */
  const escritos = new Set(regras.join('\n').match(/url\('([^']+)'\)/g)
    .map((u) => u.slice(5, -2)));
  for (const f of fs.readdirSync(DESTINO)) {
    if (f.endsWith('.woff2') && !escritos.has(f)) {
      fs.unlinkSync(path.join(DESTINO, f));
      console.log(`\n  removido (já não é usado): ${f}`);
    }
  }

  const cabecalho = `/* AS FONTES DO SITE, SERVIDAS DO PRÓPRIO REPOSITÓRIO (F-68)

   NÃO EDITAR À MÃO. Este ficheiro é escrito pelo
   \`backend/scripts/baixarFontes.js\`; para o mudar, muda-se o script e
   corre-se outra vez.

   Gerado a ${new Date().toISOString().slice(0, 10)}.
   ${ficheiros} ficheiros, ${(total / 1024).toFixed(0)} KB no total, subconjunto \`latin\`.

   Porquê: o plano B da apresentação é servir o site do portátil sem
   internet, e medido sem rede as 18 páginas carregavam ZERO fontes —
   nada rebentava, mas o site ficava com a letra do sistema. Com isto,
   o que se vê offline é o que se vê online.

   Os \`<link>\` para o fonts.googleapis.com saíram das 18 páginas: com
   as fontes aqui, aquele pedido era uma ida à internet para não trazer
   nada de novo — e, sem rede, uma espera para nada. */\n\n`;

  fs.writeFileSync(path.join(DESTINO, 'fontes.css'), cabecalho + regras.join('\n\n') + '\n');

  console.log(`\n${ficheiros} ficheiros, ${(total / 1024).toFixed(0)} KB`);
  console.log(`Escrito: assets/fontes/fontes.css e os .woff2 ao lado.`);
})().catch((e) => {
  console.error('\nFALHOU:', e.message);
  console.error('Isto precisa de internet. Sem ela, nada feito — e é o ponto todo.');
  process.exit(1);
});
