/**
 * =====================================================================
 *  contarTarefas.js — a tabela de contagens, medida em vez de afirmada
 * =====================================================================
 *
 *  Usar:   npm run tarefas              (mostra e compara)
 *          npm run tarefas -- --escrever (escreve a tabela no ficheiro)
 *
 *  PORQUE E QUE ISTO EXISTE
 *
 *  O `docs/TAREFAS.md` tem uma tabela de contagens, e ela propria avisa,
 *  por escrito, que "se mudares uma linha la em cima, esta tabela fica
 *  errada ate alguem a refazer". Um aviso honesto — e um aviso nao e uma
 *  verificacao.
 *
 *  Refez-se a mao oito vezes. A nona falhou: o X-27 fechou e a
 *  estimativa restante dos X- ficou nas 2 h 15 de quando ele estava
 *  aberto, e o total ficou nas 37 h. Ninguem mentiu; so ninguem voltou a
 *  somar. **E o defeito de sempre deste projeto num numero nosso:** o
 *  mesmo valor em dois sitios, um deles derivavel do outro.
 *
 *  Um valor que se pode derivar nao se declara. Esta tabela e derivada
 *  das linhas das tabelas de tarefas, e e este programa que a deriva.
 *
 *  O Guilherme propos a regra que isto torna possivel (27/10, a
 *  proposito dos numeros X- que colidiram): **um codigo so existe depois
 *  de a linha estar no TAREFAS.md empurrado** — anunciar numa mensagem
 *  nao reserva nada. Com a regra, a autoridade sobre os numeros deixa de
 *  ser a memoria de alguem e passa a ser o ficheiro; e quem le o
 *  ficheiro e isto.
 *
 *  O QUE CONTA, E COMO
 *
 *  Uma linha de tarefa e uma linha de tabela cuja primeira celula e um
 *  dos quatro estados e a segunda um codigo `B-`/`F-`/`C-`/`X-`. O tempo
 *  e a ultima celula que se leia como tempo ("45 min", "1 h", "1 h 30").
 *  Nada disto e configuravel de proposito: se o formato do documento
 *  mudar, isto tem de dar erro em vez de adivinhar.
 *
 *  Conta tambem o que nao se ve a olho: codigos repetidos (duas linhas
 *  com o mesmo numero, que foi o que aconteceu aos X-14 a X-17 e outra
 *  vez ao X-30) e buracos na sequencia, que foi como se apanharam as 57
 *  linhas perdidas numa juncao.
 *
 *  SEM `--escrever` NAO TOCA NO FICHEIRO
 *
 *  Mostra o que mediu, diz se a tabela escrita concorda, e sai com 0 em
 *  qualquer caso — pela mesma razao do `verificarConfig.js`: um aviso
 *  que recusa a entrega acaba desligado. Com `--escrever`, reescreve as
 *  quatro linhas e o total. **Copiar numeros a mao de um ecra para um
 *  ficheiro e precisamente o passo que falhou nove vezes**, por isso o
 *  programa que os mede e o mesmo que os escreve.
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const FICHEIRO = path.join(RAIZ, 'docs', 'TAREFAS.md');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;

const ESTADOS = new Set(['✅', '🔁', '🟨', '⬜']);

const GRUPOS = [
  { letra: 'B', rotulo: '🔵 João (B-)' },
  { letra: 'F', rotulo: '🟠 Guilherme (F-)' },
  { letra: 'C', rotulo: '🟢 Os dois (C-)' },
  { letra: 'X', rotulo: '🐞 Correções (X-)' },
];

/** "45 min", "1 h", "1 h 30" -> minutos. Outra coisa -> null. */
function minutos(celula) {
  const s = celula.trim();
  let m = /^(\d+)\s*h(?:\s*(\d+))?$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2] || 0);
  m = /^(\d+)\s*min$/.exec(s);
  return m ? Number(m[1]) : null;
}

function horas(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} h ${String(m).padStart(2, '0')}`;
  return h ? `${h} h` : `${m} min`;
}

/** Tira os `**` e os `~~` de uma celula. */
const limpar = (s) => s.replace(/\*/g, '').replace(/~/g, '').trim();

function lerTarefas(linhas) {
  const tarefas = new Map();      // codigo -> { estado, minutos, linha }
  const repetidos = [];

  linhas.forEach((texto, i) => {
    if (!texto.startsWith('|')) return;
    const celulas = texto.split('|');
    if (celulas.length < 5) return;

    const estado = limpar(celulas[1]);
    const codigo = limpar(celulas[2]);
    if (!ESTADOS.has(estado)) return;
    if (!/^[BFCX]-\d+$/.test(codigo)) return;

    if (tarefas.has(codigo)) {
      repetidos.push({ codigo, primeira: tarefas.get(codigo).linha, segunda: i + 1 });
      return;
    }

    /*
     *  O tempo le-se da direita para a esquerda. A ultima celula e quem
     *  encontrou a avaria ("Gui", "—") e a penultima o tempo — mas nas
     *  tabelas do Joao e do Guilherme a ultima e a dependencia, por isso
     *  procurar pela POSICAO dava numeros diferentes em tabelas
     *  diferentes. Procura-se pela FORMA.
     */
    let mins = null;
    for (let k = celulas.length - 1; k >= 3; k -= 1) {
      const v = minutos(celulas[k]);
      if (v !== null) { mins = v; break; }
    }

    tarefas.set(codigo, { estado, minutos: mins, linha: i + 1 });
  });

  return { tarefas, repetidos };
}

function main() {
  const escrever = process.argv.includes('--escrever');

  if (!fs.existsSync(FICHEIRO)) {
    console.log(vermelho(`  Nao encontrei o ${path.relative(RAIZ, FICHEIRO)}.`));
    process.exitCode = 0;
    return;
  }

  const linhas = fs.readFileSync(FICHEIRO, 'utf8').split('\n');
  const { tarefas, repetidos } = lerTarefas(linhas);

  const porGrupo = new Map();
  for (const { letra } of GRUPOS) {
    porGrupo.set(letra, {
      total: 0, feitas: 0, naoSeAplica: 0, porFazer: 0, restante: 0,
      semTempo: [], numeros: [],
    });
  }

  for (const [codigo, t] of tarefas) {
    const g = porGrupo.get(codigo[0]);
    if (!g) continue;
    g.total += 1;
    g.numeros.push(Number(codigo.split('-')[1]));
    if (t.estado === '✅') g.feitas += 1;
    else if (t.estado === '🔁') g.naoSeAplica += 1;
    else {
      g.porFazer += 1;
      if (t.minutos === null) g.semTempo.push(codigo);
      else g.restante += t.minutos;
    }
  }

  console.log('');
  console.log('  TAREFAS — contado das linhas, nao somado ao que lá estava');
  console.log('  ' + '-'.repeat(62));

  const novas = new Map();
  let totalRestante = 0;
  let totalCodigos = 0;

  for (const { letra, rotulo } of GRUPOS) {
    const g = porGrupo.get(letra);
    totalRestante += g.restante;
    totalCodigos += g.total;
    const naoSeAplica = g.naoSeAplica || '—';
    novas.set(letra,
      `| ${rotulo} | ${g.total} | ${g.feitas} | ${naoSeAplica} | ${g.porFazer} | ≈ ${horas(g.restante)} |`);
    console.log(`  ${rotulo.padEnd(20)} ${String(g.total).padStart(3)} tarefas` +
      `  ${String(g.feitas).padStart(3)} ✅  ${String(g.naoSeAplica).padStart(2)} 🔁` +
      `  ${String(g.porFazer).padStart(2)} por fazer  ≈ ${horas(g.restante)}`);
  }

  console.log('  ' + '-'.repeat(62));
  console.log(`  ${totalCodigos} códigos.  Total por fazer: ≈ ${horas(totalRestante)}`);
  console.log('');

  /* ---- o que nao se ve a olho ---------------------------------- */
  let avisos = 0;

  for (const r of repetidos) {
    console.log(vermelho(`  ${r.codigo} aparece duas vezes: linhas ${r.primeira} e ${r.segunda}`));
    avisos += 1;
  }

  for (const { letra } of GRUPOS) {
    const g = porGrupo.get(letra);
    if (!g.numeros.length) continue;
    const maior = Math.max(...g.numeros);
    const tem = new Set(g.numeros);
    const buracos = [];
    for (let i = 1; i <= maior; i += 1) if (!tem.has(i)) buracos.push(`${letra}-${i}`);
    if (buracos.length) {
      console.log(vermelho(`  buracos na sequência ${letra}-: ${buracos.join(', ')}`));
      avisos += 1;
    }
    if (g.semTempo.length) {
      console.log(amarelo(`  por fazer e sem tempo legível: ${g.semTempo.join(', ')}`));
      avisos += 1;
    }
  }

  /* ---- a tabela escrita concorda com o que se mediu? ----------- */
  const desvios = [];
  const indices = new Map();

  for (const { letra, rotulo } of GRUPOS) {
    const i = linhas.findIndex((l) => l.startsWith(`| ${rotulo} |`));
    if (i === -1) { desvios.push(`não encontrei a linha "${rotulo}" na tabela`); continue; }
    indices.set(letra, i);
    if (linhas[i].trim() !== novas.get(letra)) {
      desvios.push(`${rotulo}\n      escrito: ${linhas[i].trim()}\n      medido : ${novas.get(letra)}`);
    }
  }

  const iTotal = linhas.findIndex((l) => l.startsWith('**Total por fazer:'));
  const totalNovo = `**Total por fazer: ≈ ${horas(totalRestante)}.**`;
  if (iTotal === -1) desvios.push('não encontrei a linha "**Total por fazer:"');
  else if (!linhas[iTotal].startsWith(totalNovo)) {
    desvios.push(`total\n      escrito: ${linhas[iTotal].slice(0, 40)}…\n      medido : ${totalNovo}`);
  }

  if (!desvios.length) {
    console.log(verde('  A tabela escrita no documento concorda com isto.'));
    console.log('');
    process.exitCode = 0;
    return;
  }

  console.log(amarelo(`  A tabela escrita não concorda (${desvios.length}):`));
  for (const d of desvios) console.log(`    ${d}`);
  console.log('');

  if (!escrever) {
    console.log('  Para a corrigir:  npm run tarefas -- --escrever');
    console.log(amarelo('  (não copies estes números à mão — foi esse o passo que falhou)'));
    console.log('');
    process.exitCode = 0;
    return;
  }

  for (const [letra, i] of indices) linhas[i] = novas.get(letra);
  if (iTotal !== -1) {
    linhas[iTotal] = linhas[iTotal].replace(/^\*\*Total por fazer: ≈ [^*]*\*\*/, totalNovo);
  }
  fs.writeFileSync(FICHEIRO, linhas.join('\n'), 'utf8');
  console.log(verde('  Tabela reescrita no docs/TAREFAS.md.'));
  console.log('  Confirma com `git diff docs/TAREFAS.md` antes de commitar.');
  console.log('');
  process.exitCode = 0;
}

main();
// Aponta e, se lhe pedirem, corrige. Nunca falha o comando que o chamou.
process.exitCode = 0;
