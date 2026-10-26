/**
 * ---------------------------------------------------------------------
 *  desenhoER.js — a vista geral do diagrama ER, em SVG
 * ---------------------------------------------------------------------
 *
 *  Chamado pelo gerarDiagramaER.js. Recebe as tabelas e as ligacoes ja
 *  lidas do schema.sql e devolve o texto de um SVG.
 *
 *  PORQUE E QUE NAO SE USA O mermaid-cli
 *
 *  Porque foi experimentado (11/09) e da 5136x2050, com as ligacoes
 *  cruzadas e sem ordem nenhuma. Um desenho ilegivel gerado nao e melhor
 *  do que um desenho legivel escrito a mao — e o objetivo do X-22 nao era
 *  "gerar", era ter no relatorio uma figura que NAO POSSA discordar da
 *  base de dados. Para isso tem de ser gerada E legivel.
 *
 *  COMO E QUE A DISPOSICAO E DECIDIDA
 *
 *  1. PROFUNDIDADE. Uma tabela que nao aponta para ninguem esta na
 *     coluna 0. Qualquer outra fica uma coluna a frente da mais funda
 *     para que aponta. As setas passam a correr quase todas da esquerda
 *     para a direita, e a leitura do diagrama passa a ter um sentido.
 *
 *  2. BARICENTRO. Dentro de cada coluna, as tabelas sao ordenadas pela
 *     altura media dos seus vizinhos, em varias passagens. E a ideia do
 *     metodo de Sugiyama: nao resolve os cruzamentos todos, mas tira a
 *     maior parte, e e a diferenca entre um diagrama que se segue com o
 *     dedo e um novelo.
 *
 *  PRETO E BRANCO DE PROPOSITO
 *
 *  O relatorio pode ser impresso a preto e branco. Por isso nada aqui
 *  distingue coisas pela cor: a ligacao obrigatoria e um traco continuo,
 *  a opcional e tracejada. Numa fotocopia continua a ler-se.
 * ---------------------------------------------------------------------
 */

const LARGURA_CAIXA = 170;
const ALTURA_CAIXA = 46;
const ESPACO_H = 130;   // entre colunas
const ESPACO_V = 42;    // entre caixas da mesma coluna
const MARGEM = 40;

/** Profundidade de cada tabela: 0 = nao aponta para ninguem. */
function calcularProfundidade(tabelas, ligacoes) {
  const aponta = new Map(tabelas.map((t) => [t.nome, new Set()]));
  for (const l of ligacoes) {
    // l.origem tem a chave estrangeira, l.alvo e a tabela referida.
    if (l.origem !== l.alvo) aponta.get(l.origem)?.add(l.alvo);
  }

  const prof = new Map();
  const emCurso = new Set();

  function resolver(nome) {
    if (prof.has(nome)) return prof.get(nome);
    /*
     *  Guarda contra ciclos. O esquema de hoje nao tem nenhum, mas um
     *  gerador que entra em recursao infinita no dia em que alguem
     *  acrescenta uma referencia circular e pior do que nao existir —
     *  e esse dia e sempre a vespera de uma entrega.
     */
    if (emCurso.has(nome)) return 0;
    emCurso.add(nome);
    let p = 0;
    for (const alvo of aponta.get(nome) || []) p = Math.max(p, resolver(alvo) + 1);
    emCurso.delete(nome);
    prof.set(nome, p);
    return p;
  }

  for (const t of tabelas) resolver(t.nome);
  return prof;
}

/** Menos cruzamentos: ordena cada coluna pela altura media dos vizinhos. */
function ordenarPorBaricentro(colunas, ligacoes) {
  const vizinhos = new Map();
  const juntar = (a, b) => {
    if (!vizinhos.has(a)) vizinhos.set(a, []);
    vizinhos.get(a).push(b);
  };
  for (const l of ligacoes) { juntar(l.origem, l.alvo); juntar(l.alvo, l.origem); }

  const posicao = new Map();
  const registar = () => colunas.forEach((c) => c.forEach((n, i) => posicao.set(n, i)));
  registar();

  // Quatro passagens chegam: a partir daqui a ordem deixa de mexer.
  for (let passagem = 0; passagem < 4; passagem++) {
    for (const coluna of colunas) {
      const bar = new Map(coluna.map((n) => {
        const v = (vizinhos.get(n) || []).filter((x) => posicao.has(x));
        if (!v.length) return [n, posicao.get(n)];
        return [n, v.reduce((s, x) => s + posicao.get(x), 0) / v.length];
      }));
      // Desempate pelo nome: sem ele, duas tabelas com o mesmo
      // baricentro podiam trocar de sitio entre duas corridas, e o
      // diagrama deixava de ser o mesmo duas vezes seguidas.
      coluna.sort((a, b) => (bar.get(a) - bar.get(b)) || a.localeCompare(b));
    }
    registar();
  }
  return colunas;
}

const escapar = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function desenharER(tabelas, ligacoes, meta = {}) {
  const prof = calcularProfundidade(tabelas, ligacoes);
  const maxProf = Math.max(...prof.values());

  let colunas = [];
  for (let p = 0; p <= maxProf; p++) {
    colunas.push(tabelas.filter((t) => prof.get(t.nome) === p)
      .map((t) => t.nome).sort((a, b) => a.localeCompare(b)));
  }
  colunas = ordenarPorBaricentro(colunas, ligacoes);

  const maisAlta = Math.max(...colunas.map((c) => c.length));
  const alturaUtil = maisAlta * ALTURA_CAIXA + (maisAlta - 1) * ESPACO_V;

  // Cada caixa no seu sitio; cada coluna centrada na vertical.
  const caixa = new Map();
  colunas.forEach((coluna, ic) => {
    const alturaColuna = coluna.length * ALTURA_CAIXA + (coluna.length - 1) * ESPACO_V;
    const topo = MARGEM + (alturaUtil - alturaColuna) / 2;
    coluna.forEach((nome, i) => {
      caixa.set(nome, {
        x: MARGEM + ic * (LARGURA_CAIXA + ESPACO_H),
        y: topo + i * (ALTURA_CAIXA + ESPACO_V),
      });
    });
  });

  const largura = MARGEM * 2 + colunas.length * LARGURA_CAIXA + (colunas.length - 1) * ESPACO_H;
  const altura = MARGEM * 2 + alturaUtil + 54;   // 54: espaco da legenda

  const partes = [];
  partes.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${Math.round(altura)}" ` +
    `width="${largura}" height="${Math.round(altura)}" font-family="Segoe UI, Arial, sans-serif">`,
    '<defs>',
    '  <marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">',
    '    <path d="M0,0 L10,5 L0,10 z" fill="#333"/>',
    '  </marker>',
    '</defs>',
    `<rect width="100%" height="100%" fill="#ffffff"/>`
  );

  /* ---- As ligacoes primeiro, para passarem POR BAIXO das caixas ---- */
  for (const l of ligacoes) {
    const de = caixa.get(l.origem);
    const para = caixa.get(l.alvo);
    if (!de || !para) continue;

    if (l.origem === l.alvo) continue;   // nenhuma hoje; nao se desenha

    const deDir = de.x > para.x;
    const x1 = deDir ? de.x : de.x + LARGURA_CAIXA;
    const x2 = deDir ? para.x + LARGURA_CAIXA : para.x;
    const y1 = de.y + ALTURA_CAIXA / 2;
    const y2 = para.y + ALTURA_CAIXA / 2;
    /*
     *  Quanto mais colunas a ligacao atravessa, mais ela arqueia. Com
     *  um arco fixo, as ligacoes compridas passavam a direito por cima
     *  das caixas do meio e pareciam ligar-se a elas. A curva empurra-as
     *  para fora da faixa onde as caixas estao.
     */
    const salto = Math.abs(x2 - x1) / (LARGURA_CAIXA + ESPACO_H);
    const puxa = Math.max(40, (Math.abs(x2 - x1) / 2) * (1 + salto * 0.22));
    const cx1 = deDir ? x1 - puxa : x1 + puxa;
    const cx2 = deDir ? x2 + puxa : x2 - puxa;

    partes.push(
      `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${cx1.toFixed(1)},${y1.toFixed(1)} ` +
      `${cx2.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" ` +
      `fill="none" stroke="#8a8a8a" stroke-width="1"` +
      (l.obrigatoria ? '' : ' stroke-dasharray="5 3"') +
      ' marker-end="url(#seta)"/>'
    );
  }

  /* ---- As caixas ---- */
  for (const t of tabelas) {
    const c = caixa.get(t.nome);
    if (!c) continue;
    const n = t.colunas.length;
    partes.push(
      `<g>`,
      `<rect x="${c.x}" y="${c.y}" width="${LARGURA_CAIXA}" height="${ALTURA_CAIXA}" rx="5" ` +
      `fill="#f4f4f4" stroke="#333" stroke-width="1.2"/>`,
      `<text x="${c.x + LARGURA_CAIXA / 2}" y="${c.y + 19}" text-anchor="middle" ` +
      `font-size="13" font-weight="600" fill="#111">${escapar(t.nome)}</text>`,
      `<text x="${c.x + LARGURA_CAIXA / 2}" y="${c.y + 35}" text-anchor="middle" ` +
      `font-size="10.5" fill="#555">${n} ${n === 1 ? 'coluna' : 'colunas'}</text>`,
      `</g>`
    );
  }

  /* ---- Legenda ---- */
  const yL = MARGEM + alturaUtil + 30;
  partes.push(
    `<line x1="${MARGEM}" y1="${yL}" x2="${MARGEM + 34}" y2="${yL}" stroke="#555" stroke-width="1.1" marker-end="url(#seta)"/>`,
    `<text x="${MARGEM + 42}" y="${yL + 4}" font-size="11" fill="#333">chave estrangeira obrigatória (NOT NULL)</text>`,
    `<line x1="${MARGEM + 310}" y1="${yL}" x2="${MARGEM + 344}" y2="${yL}" stroke="#555" stroke-width="1.1" stroke-dasharray="5 3" marker-end="url(#seta)"/>`,
    `<text x="${MARGEM + 352}" y="${yL + 4}" font-size="11" fill="#333">opcional (aceita NULL)</text>`,
    `<text x="${largura - MARGEM}" y="${yL + 4}" text-anchor="end" font-size="10.5" fill="#777">` +
    `${escapar(meta.rodape || '')}</text>`,
    '</svg>'
  );

  return partes.join('\n') + '\n';
}

module.exports = { desenharER };
