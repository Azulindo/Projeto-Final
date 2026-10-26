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
 *  cruzadas e sem ordem nenhuma. O objetivo do X-22 nao era "gerar",
 *  era ter no relatorio uma figura que NAO POSSA discordar da base de
 *  dados — e para isso tem de ser gerada E legivel.
 *
 *  PORQUE E QUE O DESENHO E ESTREITO
 *
 *  A primeira versao (26/10) punha as tabelas em colunas da esquerda
 *  para a direita e dava 1650 unidades de largura. Parecia bem no ecra
 *  e era inutil no papel: a largura util de uma pagina A4 sao 5,9
 *  polegadas, e 1650 unidades esmagadas nessa largura imprimem os nomes
 *  das tabelas a 3,2 pontos. Nao se leem. E nao havia disposicao em A4
 *  que resolvesse — mesmo em paisagem, na folha toda, ficava a 5,2.
 *
 *  Medido pelo Guilherme a 26/10, e o defeito era meu: olhei para o
 *  desenho no ecra, onde ele estava legivel, e nao para o tamanho a que
 *  ia ser impresso. **O ecra nao e o papel** — mais um caso de verificar
 *  numa coisa e concluir sobre outra.
 *
 *  Por isso agora as tabelas empilham-se de CIMA PARA BAIXO, em faixas
 *  por profundidade, e cada faixa quebra ao fim de POR_LINHA caixas. A
 *  largura fica por volta de 660 unidades, que na mesma pagina dao os
 *  nomes a cerca de 8 pontos — o tamanho do texto corrido de um
 *  relatorio.
 *
 *  COMO E QUE A DISPOSICAO E DECIDIDA
 *
 *  1. PROFUNDIDADE. Uma tabela que nao aponta para ninguem fica na
 *     faixa 0, em cima. Qualquer outra fica uma faixa abaixo da mais
 *     funda para que aponta. As setas sobem todas, e a leitura passa a
 *     ter um sentido: em baixo esta o que depende, em cima o que e
 *     referido.
 *
 *  2. BARICENTRO. Dentro de cada faixa, as tabelas sao ordenadas pela
 *     posicao media horizontal dos seus vizinhos, em varias passagens.
 *     E a ideia do metodo de Sugiyama: nao tira os cruzamentos todos,
 *     mas tira a maior parte.
 *
 *  PRETO E BRANCO DE PROPOSITO
 *
 *  O relatorio pode ser impresso a preto e branco, por isso nada aqui
 *  distingue coisas pela cor: a ligacao obrigatoria e um traco continuo,
 *  a opcional e tracejada. Numa fotocopia continua a ler-se.
 * ---------------------------------------------------------------------
 */

const LARGURA_CAIXA = 132;
const ALTURA_CAIXA = 44;
const ESPACO_H = 28;    // entre caixas lado a lado
const ESPACO_V = 46;    // entre faixas
const POR_LINHA = 4;    // quantas caixas cabem numa linha
const MARGEM = 26;

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
     *  acrescenta uma referencia circular e pior do que nao existir — e
     *  esse dia e sempre a vespera de uma entrega.
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

/** Menos cruzamentos: ordena cada faixa pela posicao media dos vizinhos. */
function ordenarPorBaricentro(faixas, ligacoes) {
  const vizinhos = new Map();
  const juntar = (a, b) => {
    if (!vizinhos.has(a)) vizinhos.set(a, []);
    vizinhos.get(a).push(b);
  };
  for (const l of ligacoes) { juntar(l.origem, l.alvo); juntar(l.alvo, l.origem); }

  const posicao = new Map();
  const registar = () => faixas.forEach((f) => f.forEach((n, i) => posicao.set(n, i)));
  registar();

  // Quatro passagens chegam: a partir daqui a ordem deixa de mexer.
  for (let passagem = 0; passagem < 4; passagem++) {
    for (const faixa of faixas) {
      const bar = new Map(faixa.map((n) => {
        const v = (vizinhos.get(n) || []).filter((x) => posicao.has(x));
        if (!v.length) return [n, posicao.get(n)];
        return [n, v.reduce((s, x) => s + posicao.get(x), 0) / v.length];
      }));
      /*
       *  Desempate pelo nome. Sem ele, duas tabelas com o mesmo
       *  baricentro podiam trocar de sitio entre duas corridas e o
       *  diagrama deixava de ser o mesmo duas vezes seguidas — e um
       *  ficheiro gerado que muda sozinho enche o `git diff` de ruido.
       */
      faixa.sort((a, b) => (bar.get(a) - bar.get(b)) || a.localeCompare(b));
    }
    registar();
  }
  return faixas;
}

const escapar = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function desenharER(tabelas, ligacoes, meta = {}) {
  const prof = calcularProfundidade(tabelas, ligacoes);
  const maxProf = Math.max(...prof.values());

  let faixas = [];
  for (let p = 0; p <= maxProf; p++) {
    faixas.push(tabelas.filter((t) => prof.get(t.nome) === p)
      .map((t) => t.nome).sort((a, b) => a.localeCompare(b)));
  }
  faixas = ordenarPorBaricentro(faixas, ligacoes);

  const larguraUtil = POR_LINHA * LARGURA_CAIXA + (POR_LINHA - 1) * ESPACO_H;

  /*
   *  Cada faixa quebra em linhas de POR_LINHA caixas. Uma faixa com 7
   *  tabelas ocupa duas linhas em vez de esticar o desenho ate ficar
   *  ilegivel — foi isso que aconteceu na primeira versao, em que a
   *  faixa mais cheia mandava na largura do desenho inteiro.
   */
  const caixa = new Map();
  let y = MARGEM;
  for (const faixa of faixas) {
    for (let i = 0; i < faixa.length; i += POR_LINHA) {
      const linha = faixa.slice(i, i + POR_LINHA);
      const larguraLinha = linha.length * LARGURA_CAIXA + (linha.length - 1) * ESPACO_H;
      const x0 = MARGEM + (larguraUtil - larguraLinha) / 2;   // linha centrada
      linha.forEach((nome, j) => {
        caixa.set(nome, { x: x0 + j * (LARGURA_CAIXA + ESPACO_H), y });
      });
      y += ALTURA_CAIXA + ESPACO_V;
    }
  }
  const alturaUtil = y - ESPACO_V - MARGEM;

  const largura = MARGEM * 2 + larguraUtil;
  const altura = MARGEM + alturaUtil + 56;   // 56: espaco da legenda

  const partes = [];
  partes.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${Math.round(altura)}" ` +
    `width="${largura}" height="${Math.round(altura)}" font-family="Segoe UI, Arial, sans-serif">`,
    '<defs>',
    '  <marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">',
    '    <path d="M0,0 L10,5 L0,10 z" fill="#555"/>',
    '  </marker>',
    '</defs>',
    '<rect width="100%" height="100%" fill="#ffffff"/>'
  );

  /* ---- As ligacoes primeiro, para passarem POR BAIXO das caixas ---- */
  for (const l of ligacoes) {
    const de = caixa.get(l.origem);
    const para = caixa.get(l.alvo);
    if (!de || !para || l.origem === l.alvo) continue;

    // Sobe de quem tem a chave estrangeira para quem e referido.
    const x1 = de.x + LARGURA_CAIXA / 2;
    const y1 = de.y;
    const x2 = para.x + LARGURA_CAIXA / 2;
    const y2 = para.y + ALTURA_CAIXA;
    const puxa = Math.max(26, Math.abs(y1 - y2) * 0.42);

    partes.push(
      `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${(y1 - puxa).toFixed(1)} ` +
      `${x2.toFixed(1)},${(y2 + puxa).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" ` +
      'fill="none" stroke="#8a8a8a" stroke-width="0.9"' +
      (l.obrigatoria ? '' : ' stroke-dasharray="4 2.5"') +
      ' marker-end="url(#seta)"/>'
    );
  }

  /* ---- As caixas ---- */
  /*
   *  A letra do nome encolhe sozinha quando o nome nao cabe na caixa.
   *
   *  Sem isto, o `historico_estado_pedido` — 23 caracteres — saia pelos
   *  dois lados da caixa, e o desenho parecia mal feito num sitio so.
   *  Encolher a caixa toda por causa de um nome era deixar as outras 17
   *  mais pequenas do que precisavam; alargar a caixa toda era esticar o
   *  desenho e voltar ao problema da letra a 3 pontos.
   *
   *  O 0.56 e a largura media de um caracter desta letra em relacao ao
   *  corpo. Nao e exato — para ser exato era preciso medir a fonte, que
   *  aqui nao existe — mas erra por defeito, que e o lado seguro: no
   *  pior caso o nome fica um pouco mais pequeno do que precisava.
   */
  const LARGURA_CARACTER = 0.56;
  const corpoQueCabe = (nome) => {
    const disponivel = LARGURA_CAIXA - 10;
    const ideal = disponivel / (nome.length * LARGURA_CARACTER);
    return Math.max(9, Math.min(13, ideal)).toFixed(1);
  };

  for (const t of tabelas) {
    const c = caixa.get(t.nome);
    if (!c) continue;
    const n = t.colunas.length;
    partes.push(
      `<rect x="${c.x}" y="${c.y}" width="${LARGURA_CAIXA}" height="${ALTURA_CAIXA}" rx="4" ` +
      'fill="#f4f4f4" stroke="#333" stroke-width="1"/>',
      `<text x="${(c.x + LARGURA_CAIXA / 2).toFixed(1)}" y="${c.y + 19}" text-anchor="middle" ` +
      `font-size="${corpoQueCabe(t.nome)}" font-weight="600" fill="#111">${escapar(t.nome)}</text>`,
      `<text x="${(c.x + LARGURA_CAIXA / 2).toFixed(1)}" y="${c.y + 34}" text-anchor="middle" ` +
      `font-size="10" fill="#555">${n} ${n === 1 ? 'coluna' : 'colunas'}</text>`
    );
  }

  /* ---- Legenda, em duas linhas: a largura nao da para uma ---- */
  const yL = MARGEM + alturaUtil + 22;
  partes.push(
    `<line x1="${MARGEM}" y1="${yL}" x2="${MARGEM + 26}" y2="${yL}" stroke="#8a8a8a" stroke-width="0.9" marker-end="url(#seta)"/>`,
    `<text x="${MARGEM + 33}" y="${yL + 3.5}" font-size="10.5" fill="#333">chave estrangeira obrigatória (NOT NULL)</text>`,
    `<line x1="${MARGEM}" y1="${yL + 16}" x2="${MARGEM + 26}" y2="${yL + 16}" stroke="#8a8a8a" stroke-width="0.9" stroke-dasharray="4 2.5" marker-end="url(#seta)"/>`,
    `<text x="${MARGEM + 33}" y="${yL + 19.5}" font-size="10.5" fill="#333">opcional (aceita NULL) · a seta aponta para a tabela referida</text>`,
    `<text x="${largura - MARGEM}" y="${yL + 19.5}" text-anchor="end" font-size="9.5" fill="#777">` +
    `${escapar(meta.rodape || '')}</text>`,
    '</svg>'
  );

  return partes.join('\n') + '\n';
}

module.exports = { desenharER };
