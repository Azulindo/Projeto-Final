/**
 * =====================================================================
 *  verificarNumeros.js — os numeros do relatorio, recalculados
 * =====================================================================
 *
 *  Porque isto existe:
 *
 *  O relatorio diz, na Discussao, que os defeitos deste projeto foram
 *  informacao a viver em dois sitios que podem divergir sem aviso.
 *  Depois escreve "17 tabelas e uma vista" no Resumo e outra vez no
 *  corpo, quando o schema.sql tem 18 tabelas desde que a movimento_stock
 *  entrou. Sao tres copias do mesmo numero, e a que esta certa e a que
 *  ninguem le.
 *
 *  O diagrama ER nao consegue cometer esse erro, porque e GERADO do
 *  esquema. Um documento escrito a mao consegue sempre. Isto e o mais
 *  proximo disso que da para fazer sem gerar o relatorio: recalcula os
 *  numeros a partir da fonte e diz quais e que o relatorio ja nao
 *  acompanha.
 *
 *  Nao corrige nada e nao escreve nada. So compara e mostra.
 *
 *      node backend/scripts/verificarNumeros.js
 *
 *  O que se usa antes de entregar, e depois de cada semana de trabalho.
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const REPOSITORIO = path.resolve(__dirname, '..', '..');

/* A pasta que se esta a medir. Começa por ser o repositorio como esta
 * no disco e passa a ser a arvore de uma data quando o relatorio diz
 * uma (ver 5b). O `ler` e o `existe` seguem-na. */
let RAIZ = REPOSITORIO;
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.join(RAIZ, p));


/* -------------------------------------------------------------------
 *  1. BASE DE DADOS — tabelas e vistas
 * ----------------------------------------------------------------- */
function contarEsquema() {
  const sql = ler('database/schema.sql');
  const tabelas = (sql.match(/^CREATE TABLE\s/gm) || []).length;
  const vistas = (sql.match(/^CREATE\s+(OR\s+REPLACE\s+)?VIEW\s/gim) || []).length;
  return { tabelas, vistas };
}


/* -------------------------------------------------------------------
 *  2. TAREFAS — por prefixo, com buracos e repetidos
 * ----------------------------------------------------------------- */
function contarTarefas() {
  const md = ler('docs/TAREFAS.md');
  const linha = /^\|\s*\**(✅|⬜|🟨|🔁)\**\s*\|\s*\**([BFCX])-(\d+)\**\s*\|/;
  const familias = {};
  for (const l of md.split('\n')) {
    const m = l.match(linha);
    if (!m) continue;
    const [, estado, fam, num] = m;
    const f = (familias[fam] ||= { total: 0, feitas: 0, naoAplica: 0, porFazer: 0, numeros: [] });
    f.total++;
    f.numeros.push(Number(num));
    if (estado === '✅') f.feitas++;
    else if (estado === '🔁') f.naoAplica++;
    else f.porFazer++;
  }
  for (const f of Object.values(familias)) {
    const vistos = new Set();
    f.repetidos = [];
    for (const n of f.numeros) {
      if (vistos.has(n)) f.repetidos.push(n);
      else vistos.add(n);
    }
    // Buracos na sequencia. Um codigo em falta quase sempre quer dizer
    // que alguem apagou uma linha sem dar por isso — foi assim que se
    // apanharam as 57 linhas perdidas numa juncao.
    f.emFalta = [];
    const maior = Math.max(...f.numeros);
    for (let n = 1; n <= maior; n++) if (!vistos.has(n)) f.emFalta.push(n);
  }
  const total = Object.values(familias).reduce((s, f) => s + f.total, 0);
  return { familias, total };
}


/* -------------------------------------------------------------------
 *  3. CAMINHOS DO SERVIDOR
 * ----------------------------------------------------------------- */
function contarCaminhos() {
  const dir = path.join(RAIZ, 'backend/src/routes');
  let n = 0;
  const porFicheiro = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const c = (txt.match(/^router\.(get|post|put|patch|delete)\(/gm) || []).length;
    porFicheiro[f] = c;
    n += c;
  }
  // O /api/saude vive no app.js e nao num ficheiro de rotas. O relatorio
  // conta-o a parte, e e por isso que aqui tambem vai a parte.
  const saude = (ler('backend/src/app.js').match(/^app\.get\('\/api\/saude'/gm) || []).length;
  return { rotas: n, saude, ficheiros: Object.keys(porFicheiro).length, porFicheiro };
}


/* -------------------------------------------------------------------
 *  4. FICHEIROS E LINHAS, por componente
 * ----------------------------------------------------------------- */
const COMPONENTES = [
  ['Servidor',              ['backend/src', 'backend/scripts']],
  ['Base de dados',         ['database']],
  ['Paginas dos clientes',  ['frontend/cliente']],
  ['Aplicacao de gestao',   ['frontend/funcionarios']],
  ['Comunicacao com a API', ['frontend/js']],
  ['Testes automaticos',    ['frontend/testes']],
  ['Documentacao',          ['docs', 'README.md']],
];

const EXTENSOES = new Set(['.js', '.mjs', '.cjs', '.html', '.css', '.sql', '.md', '.mmd', '.json', '.yml', '.yaml']);
const IGNORAR = new Set(['node_modules', '.git', 'test-results', 'playwright-report', 'dist', 'build']);

function percorrer(rel, saco) {
  const abs = path.join(RAIZ, rel);
  if (!fs.existsSync(abs)) return;
  const st = fs.statSync(abs);
  if (st.isFile()) {
    if (!EXTENSOES.has(path.extname(abs))) return;
    saco.ficheiros++;
    saco.linhas += fs.readFileSync(abs, 'utf8').split('\n').length;
    return;
  }
  for (const nome of fs.readdirSync(abs)) {
    if (IGNORAR.has(nome)) continue;
    percorrer(path.join(rel, nome), saco);
  }
}

function contarCodigo() {
  const linhas = [];
  let tf = 0, tl = 0;
  for (const [nome, caminhos] of COMPONENTES) {
    const saco = { ficheiros: 0, linhas: 0 };
    for (const c of caminhos) percorrer(c, saco);
    linhas.push({ nome, ...saco });
    tf += saco.ficheiros;
    tl += saco.linhas;
  }
  return { linhas, ficheiros: tf, total: tl };
}


/* -------------------------------------------------------------------
 *  5. REGISTOS DE ALTERACAO
 * ----------------------------------------------------------------- */
function contarCommits(ate) {
  try {
    const limite = ate ? ` --before="${ate} 23:59:59"` : '';
    return Number(execSync(`git rev-list --count HEAD${limite}`,
      { cwd: REPOSITORIO }).toString().trim());
  } catch {
    return null;   // sem git disponivel; nao e motivo para falhar tudo
  }
}

/* -------------------------------------------------------------------
 *  5b. A DATA ATE A QUAL O RELATORIO DIZ TER CONTADO  (26/10)
 *
 *  Este numero era o unico da lista impossivel de acertar: o relatorio
 *  diz quantos registos havia, e o proprio commit que escreve esse
 *  numero cria um registo a mais. Ficava eternamente a um de distancia
 *  — e um verificador que acusa sempre deixa de ser lido, que e pior
 *  do que nao existir.
 *
 *  E o mesmo com as LINHAS: editar um ficheiro do repositorio muda a
 *  contagem, por isso o commit que corrige o total de linhas torna o
 *  total de linhas errado. Apanhei-o a 26/10 a acrescentar estas linhas
 *  — escrevi 45 912 e passaram a ser 45 951 por causa do que estava a
 *  escrever. Nao e um erro de contas: e medir uma coisa de dentro dela.
 *
 *  A saida e a mesma para os dois. A frase do relatorio ja traz a data
 *  ("entre 13 de julho e 15 de outubro de 2026 e produziu N registos"),
 *  por isso TUDO passa a ser medido **na arvore dessa data** — o ultimo
 *  commit ate la, exportado para uma pasta temporaria. Os numeros deixam
 *  de ser uma fotografia que envelhece e passam a ser uma afirmacao
 *  datada, que da o mesmo resultado hoje e em marco.
 *
 *  Antes de entregar: por a frase com a data do ultimo dia de trabalho
 *  (nao a de hoje), correr isto, corrigir, e commitar. O commit que
 *  corrige ja nao mexe nos numeros que corrigiu.
 * ----------------------------------------------------------------- */
const MESES = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

/* A data vem da frase DOS REGISTOS e nao da primeira que apareca: na
 * primeira versao disto o padrao era solto, apanhou outro intervalo de
 * datas do corpo do relatorio e mediu a arvore de 10/09 — 131 registos
 * contra os 175 reais. Um verificador a ler o sitio errado com toda a
 * confianca e pior do que verificador nenhum. */
function dataFimDoRelatorio(texto) {
  const m = texto.match(
    /entre\s+\d+\s+de\s+[a-zç]+\s+e\s+(\d+)\s+de\s+([a-zç]+)\s+de\s+(\d{4})\s+e\s+produziu\s+\d[\d\s]*registos/i);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  return `${m[3]}-${String(mes).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
}

/** O ultimo commit ate uma data, ou null. */
function revAte(data) {
  try {
    const r = execSync(`git rev-list -1 --before="${data} 23:59:59" HEAD`,
      { cwd: REPOSITORIO }).toString().trim();
    return r || null;
  } catch {
    return null;
  }
}

/** Exporta a arvore de um commit para uma pasta temporaria. */
function exportarArvore(rev) {
  const destino = path.join(require('os').tmpdir(), `vpa-numeros-${rev.slice(0, 8)}`);
  const tar = path.join(require('os').tmpdir(), `vpa-numeros-${rev.slice(0, 8)}.tar`);
  try {
    fs.rmSync(destino, { recursive: true, force: true });
    fs.mkdirSync(destino, { recursive: true });
    // Sem canos: o `tar` do Windows nao os aceita de forma fiavel.
    execSync(`git archive --format=tar -o "${tar}" ${rev}`, { cwd: REPOSITORIO });
    execSync(`tar -xf "${tar}" -C "${destino}"`, { cwd: REPOSITORIO });
    fs.rmSync(tar, { force: true });
    return destino;
  } catch (e) {
    fs.rmSync(tar, { force: true });
    return null;
  }
}


/* -------------------------------------------------------------------
 *  6. LER O QUE O RELATORIO DIZ
 *
 *  Um .docx e um ficheiro zip com XML la dentro. Em vez de trazer uma
 *  biblioteca so para isto, lemos o zip a mao: o formato guarda, no
 *  fim, um indice com a posicao e o tamanho de cada ficheiro. O unico
 *  que interessa e o word/document.xml.
 * ----------------------------------------------------------------- */
function textoDoDocx(rel) {
  const buf = fs.readFileSync(path.join(RAIZ, rel));

  // Fim do indice central: assinatura 0x06054b50, procurada de tras para a frente.
  let fim = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error('nao parece um .docx');

  const nEntradas = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);

  for (let e = 0; e < nEntradas; e++) {
    const nomeLen  = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const comLen   = buf.readUInt16LE(p + 32);
    const nome     = buf.toString('utf8', p + 46, p + 46 + nomeLen);
    const metodo   = buf.readUInt16LE(p + 10);
    const tamComp  = buf.readUInt32LE(p + 20);
    const desloc   = buf.readUInt32LE(p + 42);

    if (nome === 'word/document.xml') {
      // No cabecalho local o nome e o extra podem ter tamanhos diferentes
      // dos do indice, por isso leem-se outra vez aqui.
      const nl = buf.readUInt16LE(desloc + 26);
      const el = buf.readUInt16LE(desloc + 28);
      const inicio = desloc + 30 + nl + el;
      const dados = buf.subarray(inicio, inicio + tamComp);
      const xml = metodo === 0 ? dados : zlib.inflateRawSync(dados);
      return xml.toString('utf8')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/[   ]/g, ' ');
    }
    p += 46 + nomeLen + extraLen + comLen;
  }
  throw new Error('word/document.xml nao encontrado');
}

// "32 222" e "32222" sao o mesmo numero escrito de duas maneiras.
const paraNumero = (s) => Number(String(s).replace(/[ .]/g, ''));

/**
 * Cada verificacao e: um nome, o valor verdadeiro, e onde procurar no
 * relatorio o valor escrito. Devolve TODAS as ocorrencias — e de
 * proposito: o numero de tabelas esta em dois sitios e os dois tem de
 * mudar.
 */
function confrontar(texto, nome, valor, padrao) {
  const achados = [...texto.matchAll(padrao)];
  if (!achados.length) return [{ nome, valor, escrito: null, ok: null }];
  return achados.map((m) => {
    const escrito = paraNumero(m[1]);
    const i = Math.max(0, m.index - 45);
    return {
      nome, valor, escrito,
      ok: escrito === valor,
      contexto: texto.slice(i, m.index + m[0].length + 25).replace(/\s+/g, ' ').trim(),
    };
  });
}


/* -------------------------------------------------------------------
 *  RELATORIO NO ECRA
 * ----------------------------------------------------------------- */
function main() {
  const ALVO = 'docs/RELATORIO.docx';

  /* ── O RELATORIO LE-SE PRIMEIRO, porque e ele que diz a data ──────
   * Lido do disco (o relatorio que existe agora), e nao da arvore
   * antiga: o que se quer conferir e o ficheiro que vai ser entregue. */
  let texto = null;
  if (existe(ALVO)) {
    try {
      texto = textoDoDocx(ALVO);
    } catch (e) {
      console.log(`\n  Nao consegui ler o ${ALVO}: ${e.message}\n`);
    }
  }

  const ate = texto ? dataFimDoRelatorio(texto) : null;
  const commits = contarCommits();
  const commitsAte = ate ? contarCommits(ate) : commits;

  /* ── E TUDO O RESTO MEDE-SE NA ARVORE DESSA DATA (5b) ───────────── */
  let rev = null, arvore = null;
  if (ate) {
    rev = revAte(ate);
    if (rev) arvore = exportarArvore(rev);
    if (arvore) RAIZ = arvore;
  }

  const esquema = contarEsquema();
  const tarefas = contarTarefas();
  const caminhos = contarCaminhos();
  const codigo = contarCodigo();
  const defeitos = tarefas.familias.X ? tarefas.familias.X.total : 0;

  console.log('');
  if (arvore) {
    console.log(`  Medido na arvore de ${ate} (commit ${rev.slice(0, 7)}), que e a data`);
    console.log('  que o relatorio diz. O que se fizer ao repositorio depois dessa');
    console.log('  data nao mexe nestes numeros.');
  } else if (ate) {
    console.log(`  AVISO: o relatorio diz ${ate} e nao consegui exportar essa arvore.`);
    console.log('  Os numeros abaixo sao do disco como esta agora, e podem nao bater.');
  } else if (texto) {
    console.log('  AVISO: nao encontrei no relatorio a frase com a data do periodo');
    console.log('  contado, por isso meco o disco como esta agora.');
  }
  console.log('');
  console.log('  NUMEROS VERDADEIROS, recalculados do repositorio');
  console.log('  ' + '-'.repeat(62));
  console.log(`  Base de dados        ${esquema.tabelas} tabelas, ${esquema.vistas} vista(s)`);
  console.log(`  Caminhos do servidor ${caminhos.rotas} em ${caminhos.ficheiros} ficheiros de rotas` +
              `${caminhos.saude ? `, mais ${caminhos.saude} de verificacao de estado` : ''}`);
  console.log(`  Tarefas              ${tarefas.total}`);
  for (const [fam, f] of Object.entries(tarefas.familias)) {
    const avisos = [
      f.emFalta.length ? `EM FALTA: ${f.emFalta.join(', ')}` : null,
      f.repetidos.length ? `REPETIDOS: ${f.repetidos.join(', ')}` : null,
    ].filter(Boolean).join('   ');
    console.log(`     ${fam}-  ${String(f.total).padStart(3)}  ` +
                `(${f.feitas} feitas, ${f.naoAplica} nao se aplicam, ${f.porFazer} por fazer)` +
                (avisos ? `   <<< ${avisos}` : ''));
  }
  console.log(`  Defeitos (X-)        ${defeitos}`);
  if (commits !== null) {
    console.log(`  Registos no Git      ${commitsAte}` +
                (commitsAte !== commits ? `   (hoje ja vao ${commits})` : ''));
  }
  console.log('');
  console.log('  Ficheiros e linhas, por componente');
  for (const c of codigo.linhas) {
    console.log(`     ${c.nome.padEnd(24)} ${String(c.ficheiros).padStart(4)}  ${String(c.linhas).padStart(7)}`);
  }
  console.log(`     ${'TOTAL'.padEnd(24)} ${String(codigo.ficheiros).padStart(4)}  ${String(codigo.total).padStart(7)}`);

  /* ---- confronto com o relatorio ---- */
  if (!texto) {
    console.log(`\n  (${ALVO} nao lido — fica so a contagem.)\n`);
    limpar(arvore);
    return;
  }

  const verificacoes = [
    ...confrontar(texto, 'tabelas',      esquema.tabelas, /(\d+)\s+tabelas\s+e\s+uma\s+vista/g),
    // O padrao e estreito de proposito. Com um "das" solto apanhava
    // tambem a frase "Das 22 tarefas retiradas...", que fala de outra
    // coisa — e um aviso falso gasta a confianca de quem le a lista
    // depressa a seguir. Antes falhar um numero do que inventar um.
    ...confrontar(texto, 'tarefas',      tarefas.total,   /(?:Distribuição das|lista das)\s+(\d[\d ]*)\s+tarefas/g),
    ...confrontar(texto, 'defeitos',     defeitos,        /dos\s+(\d+)\s+defeitos\s+registados/g),
    ...confrontar(texto, 'caminhos',     caminhos.rotas,  /(\d+)\s+caminhos/g),
    ...confrontar(texto, 'linhas totais', codigo.total,   /(\d[\d ]{4,})\s+linhas/g),
    ...confrontar(texto, 'ficheiros',    codigo.ficheiros,/(\d+)\s+ficheiros(?!\s+de\s+rotas)/g),
    ...(commitsAte === null ? [] :
      confrontar(texto, 'registos Git',  commitsAte,      /(\d+)\s+registos\s+de\s+alteração/g)),
  ];

  console.log('');
  console.log('  O QUE O RELATORIO DIZ');
  console.log('  ' + '-'.repeat(62));
  let maus = 0, ausentes = 0;
  for (const v of verificacoes) {
    if (v.ok === null) {
      ausentes++;
      console.log(`  ?  ${v.nome.padEnd(15)} nao encontrei no texto (valor certo: ${v.valor})`);
      continue;
    }
    if (!v.ok) maus++;
    console.log(`  ${v.ok ? 'ok' : '!!'} ${v.nome.padEnd(15)} relatorio: ${String(v.escrito).padEnd(8)} ` +
                `verdadeiro: ${String(v.valor).padEnd(8)}`);
    if (!v.ok) console.log(`     "...${v.contexto}..."`);
  }

  console.log('');
  if (maus === 0 && ausentes === 0) {
    console.log('  Todos os numeros do relatorio batem certo com o repositorio.');
  } else {
    console.log(`  ${maus} numero(s) por corrigir no relatorio` +
                (ausentes ? `, e ${ausentes} que nao encontrei (a frase pode ter mudado)` : '') + '.');
    console.log('  Isto NAO corrige nada: corrige-se o .docx a mao e corre-se outra vez.');
  }
  console.log('');

  limpar(arvore);

  // Codigo de saida 1 quando ha numeros errados, para dar para usar
  // dentro de outro programa mais tarde sem ter de ler o ecra.
  process.exitCode = maus > 0 ? 1 : 0;
}

/** Apaga a arvore temporaria, se foi criada. */
function limpar(arvore) {
  if (arvore) {
    try { fs.rmSync(arvore, { recursive: true, force: true }); } catch { /* fica */ }
  }
}

main();
