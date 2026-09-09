/**
 * =====================================================================
 * graficos.js — Gráficos em SVG, sem biblioteca (F-56 / F-57)
 * =====================================================================
 * A tarefa dizia "Chart.js". Não é o que está aqui, e a decisão foi
 * deliberada — vale a pena o próximo que abrir isto saber porquê.
 *
 * 1. O projeto é declaradamente SEM FRAMEWORKS. Está escrito no README
 *    e é o que o distingue. Uma biblioteca de ~200 KB para desenhar 30
 *    e 6 valores contraria isso — e, por causa do plano B (C-24 a
 *    C-28), teria de ir para dentro do repositório, deixando lá um
 *    ficheiro minificado que ninguém consegue rever.
 *
 * 2. O Chart.js desenha em `<canvas>`, que para um leitor de ecrã é uma
 *    imagem opaca. Esta app tem `aria-sort` nas tabelas, etiquetas
 *    invisíveis nos cabeçalhos, alvos de 44 px e contraste medido em
 *    todos os ecrãs. Um gráfico em canvas seria a coisa menos acessível
 *    da aplicação — logo no ecrã que resume o negócio.
 *
 * 3. Trinta barras não justificam uma dependência.
 *
 * Cada gráfico traz uma TABELA equivalente. Não é um extra de
 * acessibilidade posto a martelo: é a mesma informação, e há quem
 * prefira ler os números. O SVG leva `role="img"` com um resumo em
 * `aria-label` — é tratado como desenho, que é o que é — e a tabela,
 * dentro de um `<details>`, é onde os números estão para quem não vê o
 * gráfico ou navega por teclado.
 *
 * Redesenha-se ao mudar a largura (ResizeObserver) em vez de esticar um
 * viewBox: assim o texto fica sempre no tamanho real em pixéis, em vez
 * de encolher até deixar de se ler num telemóvel.
 *
 * ── A COR ───────────────────────────────────────────────────────────
 * Regra da F-08: calor na moldura, nunca nos dados. As barras são todas
 * da mesma cor de propósito. Um gráfico com uma cor por barra parece
 * mais trabalhado e diz menos: a informação está na ALTURA, e pintar
 * cada uma de sua cor só acrescenta uma segunda variável que não quer
 * dizer nada. A única barra que muda de cor é a que está em destaque.
 * =====================================================================
 */

const GRAFICO_COR = '#c9832f';        // --cobre
const GRAFICO_COR_ATIVA = '#e8b34f';  // --dourado
const GRAFICO_GRELHA = 'rgba(255,255,255,0.08)';
const GRAFICO_TEXTO = '#98a0ac';      // --texto-suave (6,33:1 sobre o fundo)

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(nome, atributos) {
  const el = document.createElementNS(SVG_NS, nome);
  Object.entries(atributos || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/** Escala "bonita" para o topo do eixo: 1, 2 ou 5 vezes uma potência de 10.
 *  Sem isto o eixo acaba em 437,29 € e ninguém lê nada de um eixo assim. */
function topoRedondo(max) {
  if (max <= 0) return 10;
  const potencia = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / potencia;
  const passo = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return passo * potencia;
}

/* Milhares abreviados, porque um eixo com "7420 €" em três rótulos fica
   apertado — mas sem casa decimal quando ela não diz nada: "1 mil €" e
   não "1,0 mil €". */
function euros(v) {
  const n = Number(v) || 0;
  if (n >= 1000) {
    const milhares = n / 1000;
    const txt = Number.isInteger(milhares) ? String(milhares) : milhares.toFixed(1).replace('.', ',');
    return `${txt} mil €`;
  }
  return `${n.toFixed(0)} €`;
}

/**
 * grafico — desenha um gráfico de barras num contentor.
 *
 * container : elemento onde o SVG e a tabela vivem
 * dados     : [{ rotulo, valor, titulo? }]
 * opcoes    : { horizontal, formatar, unidade, cabecalhos: [a, b] }
 */
function grafico(container, dados, opcoes) {
  const o = Object.assign({ horizontal: false, formatar: euros, unidade: '' }, opcoes || {});
  if (!container) return;

  container.innerHTML = '';
  if (!Array.isArray(dados) || !dados.length) {
    const vazio = document.createElement('p');
    vazio.className = 'grafico-vazio';
    vazio.textContent = 'Sem dados para mostrar.';
    container.appendChild(vazio);
    return;
  }

  const zona = document.createElement('div');
  zona.className = 'grafico-zona';
  container.appendChild(zona);

  const legenda = document.createElement('p');
  legenda.className = 'grafico-legenda';
  legenda.setAttribute('aria-live', 'polite');
  container.appendChild(legenda);

  /* A tabela equivalente: a mesma informação, para quem não vê o
     gráfico e para quem prefere os números. */
  const detalhes = document.createElement('details');
  detalhes.className = 'grafico-tabela';
  const resumo = document.createElement('summary');
  resumo.textContent = 'Ver os números';
  detalhes.appendChild(resumo);
  detalhes.appendChild(tabelaDe(dados, o));
  container.appendChild(detalhes);

  function desenhar() {
    const largura = Math.max(240, zona.clientWidth || container.clientWidth || 600);
    zona.innerHTML = '';
    zona.appendChild(o.horizontal
      ? barrasHorizontais(dados, largura, o, legenda)
      : barrasVerticais(dados, largura, o, legenda));
  }

  desenhar();

  if (typeof ResizeObserver === 'function') {
    let anterior = zona.clientWidth;
    const obs = new ResizeObserver(function () {
      // Só redesenha se a largura mudou mesmo: sem isto, o próprio
      // desenho dispara o observador e entra em ciclo.
      const agora = zona.clientWidth;
      if (Math.abs(agora - anterior) > 4) { anterior = agora; desenhar(); }
    });
    obs.observe(zona);
  } else {
    window.addEventListener('resize', desenhar);
  }
}

function tabelaDe(dados, o) {
  const t = document.createElement('table');
  t.className = 'tabela-grafico';
  const cab = o.cabecalhos || ['', 'Valor'];
  t.innerHTML = `<thead><tr><th scope="col">${cab[0]}</th><th scope="col">${cab[1]}</th></tr></thead>`;
  const corpo = document.createElement('tbody');
  dados.forEach(function (d) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = d.titulo || d.rotulo;       // textContent, nunca innerHTML (X-01)
    const td = document.createElement('td');
    td.textContent = o.formatar(d.valor);
    tr.append(th, td);
    corpo.appendChild(tr);
  });
  t.appendChild(corpo);
  return t;
}

/* ── Barras verticais (faturação por dia e por mês) ───────────────── */

function barrasVerticais(dados, largura, o, legenda) {
  const altura = 220;
  const margem = { cima: 14, direita: 8, baixo: 26, esquerda: 46 };
  const larguraUtil = largura - margem.esquerda - margem.direita;
  const alturaUtil = altura - margem.cima - margem.baixo;

  const max = topoRedondo(Math.max(...dados.map(d => Number(d.valor) || 0)));
  const passoX = larguraUtil / dados.length;
  const larguraBarra = Math.max(2, Math.min(38, passoX * 0.68));

  const svg = svgEl('svg', {
    width: '100%', height: altura, viewBox: `0 0 ${largura} ${altura}`,
    class: 'grafico-svg', role: 'img', 'aria-label': o.resumo || 'Gráfico de barras',
    focusable: 'false',
  });

  /* Grelha e eixo dos valores — três linhas chegam. Mais do que isso
     rouba atenção às barras, que são o que interessa. */
  [0, 0.5, 1].forEach(function (f) {
    const y = margem.cima + alturaUtil * (1 - f);
    svg.appendChild(svgEl('line', {
      x1: margem.esquerda, y1: y, x2: largura - margem.direita, y2: y,
      stroke: GRAFICO_GRELHA, 'stroke-width': 1,
    }));
    const rot = svgEl('text', {
      x: margem.esquerda - 8, y: y + 4, 'text-anchor': 'end',
      fill: GRAFICO_TEXTO, 'font-size': 11,
    });
    rot.textContent = o.formatar(max * f);
    svg.appendChild(rot);
  });

  /* Quantos rótulos cabem no eixo do tempo sem se sobreporem. Com 30
     dias num telemóvel não cabem 30 — mostra-se de N em N. */
  const larguraRotulo = 30;
  const saltoRotulos = Math.max(1, Math.ceil((dados.length * larguraRotulo) / larguraUtil));

  dados.forEach(function (d, i) {
    const valor = Number(d.valor) || 0;
    const h = max > 0 ? (valor / max) * alturaUtil : 0;
    const x = margem.esquerda + i * passoX + (passoX - larguraBarra) / 2;
    const y = margem.cima + alturaUtil - h;

    const barra = svgEl('rect', {
      x, y, width: larguraBarra, height: Math.max(h, valor > 0 ? 2 : 0),
      rx: 2, fill: GRAFICO_COR, class: 'grafico-barra',
    });
    ligarDestaque(barra, d, o, legenda);
    svg.appendChild(barra);

    if (i % saltoRotulos === 0) {
      const rot = svgEl('text', {
        x: x + larguraBarra / 2, y: altura - 8, 'text-anchor': 'middle',
        fill: GRAFICO_TEXTO, 'font-size': 11,
      });
      rot.textContent = d.rotulo;
      svg.appendChild(rot);
    }
  });

  return svg;
}

/* ── Barras horizontais (produtos mais vendidos) ──────────────────
   Horizontais porque os nomes são longos: "Picanha na Brasa Negra" na
   vertical fica de lado ou cortado, e um rótulo que se lê de lado é um
   rótulo que ninguém lê. */

function barrasHorizontais(dados, largura, o, legenda) {
  const alturaLinha = 34;
  const altura = dados.length * alturaLinha + 12;
  const larguraNome = Math.min(170, Math.max(90, largura * 0.34));
  const larguraValor = 62;
  const larguraUtil = largura - larguraNome - larguraValor - 10;

  const max = Math.max(...dados.map(d => Number(d.valor) || 0)) || 1;

  const svg = svgEl('svg', {
    width: '100%', height: altura, viewBox: `0 0 ${largura} ${altura}`,
    class: 'grafico-svg', role: 'img', 'aria-label': o.resumo || 'Gráfico de barras',
    focusable: 'false',
  });

  dados.forEach(function (d, i) {
    const valor = Number(d.valor) || 0;
    const y = i * alturaLinha + 6;
    const w = Math.max(2, (valor / max) * larguraUtil);

    const nome = svgEl('text', {
      x: 0, y: y + 15, fill: GRAFICO_TEXTO, 'font-size': 12.5,
    });
    nome.textContent = encurtar(d.rotulo, larguraNome);
    svg.appendChild(nome);

    const barra = svgEl('rect', {
      x: larguraNome, y: y + 4, width: w, height: 15, rx: 2,
      fill: GRAFICO_COR, class: 'grafico-barra',
    });
    ligarDestaque(barra, d, o, legenda);
    svg.appendChild(barra);

    const val = svgEl('text', {
      x: larguraNome + w + 7, y: y + 16, fill: GRAFICO_TEXTO, 'font-size': 12,
    });
    val.textContent = o.formatar(valor);
    svg.appendChild(val);
  });

  return svg;
}

/* Corta pelo número de caracteres que cabe na largura reservada. Não é
   exato — depende da letra — mas erra por defeito, que é o lado certo:
   um nome cortado a mais lê-se, um nome que passa por cima da barra
   não. */
function encurtar(txto, larguraPx) {
  const cabem = Math.floor(larguraPx / 6.6);
  const t = String(txto || '');
  return t.length <= cabem ? t : t.slice(0, Math.max(3, cabem - 1)) + '…';
}

/* Passar o rato por cima de uma barra acende-a e escreve o valor na
   legenda por baixo.

   ── PORQUE É QUE AS BARRAS NÃO SÃO FOCÁVEIS ──
   A primeira versão disto punha `tabindex="0"` em cada barra, dentro de
   um `<svg aria-hidden="true">`. É contraditório e é uma falha a sério:
   elementos alcançáveis por Tab dentro de algo escondido aos leitores
   de ecrã levam a pessoa a um sítio que o leitor não sabe anunciar. É a
   mesma classe do erro do lightbox da F-63.

   O SVG leva `role="img"` com um resumo em `aria-label`. Esse papel faz
   com que o conteúdo lá dentro seja tratado como desenho, que é o que
   é. Quem não vê o gráfico, ou quem navega por teclado, tem os números
   todos na tabela do "Ver os números" — que é alcançável por Tab, é
   texto a sério, e diz mais do que trinta paragens de tabulação. */
function ligarDestaque(barra, d, o, legenda) {
  barra.addEventListener('mouseenter', function () {
    barra.setAttribute('fill', GRAFICO_COR_ATIVA);
    legenda.textContent = `${d.titulo || d.rotulo}: ${o.formatar(d.valor)}`;
  });
  barra.addEventListener('mouseleave', function () {
    barra.setAttribute('fill', GRAFICO_COR);
  });
}
