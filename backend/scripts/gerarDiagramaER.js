/**
 * =====================================================================
 *  gerarDiagramaER.js — o diagrama ER, tirado do schema.sql
 * =====================================================================
 *
 *  Usar:  npm run diagrama
 *
 *  Escreve dois ficheiros em database/:
 *    diagrama-er.mmd          18 tabelas e as ligacoes, sem colunas
 *    diagrama-er-detalhe.mmd  o mesmo, com as 139 colunas
 *
 *  PORQUE E GERADO E NAO DESENHADO
 *
 *  Um diagrama desenhado a mao e uma COPIA do esquema. Neste projeto ja
 *  sabemos o que acontece as copias: a lista de endpoints no API.md
 *  tinha 4 entradas quando o ficheiro tinha 15, a ordem da ementa
 *  estava escrita em dois sitios, e o README dizia 17 tabelas no dia em
 *  que passaram a ser 18. Nenhuma dessas copias nasceu errada — todas
 *  ficaram erradas.
 *
 *  Gerado do schema.sql, o diagrama nao consegue discordar da base. E
 *  quando alguem acrescentar uma tabela, refaz-se com um comando em vez
 *  de se esperar que alguem se lembre.
 *
 *  DUAS VISTAS de proposito: 18 tabelas com 139 colunas numa folha nao
 *  se le. A geral serve para explicar o desenho; a de detalhe e anexo.
 * =====================================================================
 */

const fs = require('fs');
const path = require('path');

const TIPOS = new Set([
  'INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT',
  'DECIMAL', 'FLOAT', 'DOUBLE', 'DATETIME', 'DATE', 'TIME', 'TIMESTAMP',
  'BOOLEAN', 'BOOL', 'ENUM', 'JSON', 'BLOB',
]);

const RAIZ = path.resolve(__dirname, '..', '..');
const caminhoSchema = path.join(RAIZ, 'database', 'schema.sql');

const sql = fs.readFileSync(caminhoSchema, 'utf8')
  // Fora os comentarios: ha exemplos de SQL escritos neles, e um
  // exemplo dentro de um comentario nao e uma tabela.
  .replace(/^\s*--.*$/gm, '');

const tabelas = [];
const ligacoes = [];

const blocos = sql.matchAll(/CREATE TABLE (\w+)\s*\(([\s\S]*?)\n\)\s*ENGINE/g);

for (const bloco of blocos) {
  const nome = bloco[1];
  const corpo = bloco[2];

  const mpk = corpo.match(/PRIMARY KEY \(([^)]+)\)/);
  const pk = new Set(mpk ? mpk[1].split(',').map((c) => c.trim().replace(/`/g, '')) : []);

  const colunas = [];
  for (const linha of corpo.split('\n')) {
    const l = linha.trim().replace(/,$/, '');
    /*
     *  O tipo TEM de estar na lista. Sem isto, uma linha de
     *  continuacao como "ON DELETE RESTRICT" era lida como uma coluna
     *  chamada "delete" — foi o que aconteceu na primeira versao.
     */
    const m = l.match(/^`?([a-z_][a-z0-9_]*)`?\s+([A-Za-z]+)/);
    if (!m || !TIPOS.has(m[2].toUpperCase())) continue;
    colunas.push({ nome: m[1], tipo: m[2].toLowerCase() });
  }

  for (const mf of corpo.matchAll(/FOREIGN KEY \(`?(\w+)`?\)\s*REFERENCES `?(\w+)`?/g)) {
    const coluna = mf[1];
    // NOT NULL = a ligacao e obrigatoria; sem ele, opcional.
    const obrigatoria = new RegExp('`?' + coluna + '`?\\s+\\w+[^\\n,]*NOT NULL').test(corpo);
    ligacoes.push({ alvo: mf[2], origem: nome, coluna, obrigatoria });
  }

  tabelas.push({ nome, colunas, pk });
}

function ligacoesEmMermaid() {
  return ligacoes.map((l) => {
    // ||--o{ : um obrigatorio de um lado, muitos do outro
    // |o--o{ : zero ou um de um lado, muitos do outro
    const card = l.obrigatoria ? '||--o{' : '|o--o{';
    return `  ${l.alvo} ${card} ${l.origem} : "${l.coluna}"`;
  });
}

// ---- Vista geral: so os nomes e as ligacoes ----
const geral = ['erDiagram', ...tabelas.map((t) => `  ${t.nome} {\n  }`), ...ligacoesEmMermaid()];

// ---- Vista de detalhe: com colunas ----
const detalhe = ['erDiagram'];
for (const t of tabelas) {
  detalhe.push(`  ${t.nome} {`);
  for (const c of t.colunas) {
    const ehFk = ligacoes.some((l) => l.origem === t.nome && l.coluna === c.nome);
    const marca = t.pk.has(c.nome) ? ' PK' : (ehFk ? ' FK' : '');
    detalhe.push(`    ${c.tipo} ${c.nome}${marca}`);
  }
  detalhe.push('  }');
}
detalhe.push(...ligacoesEmMermaid());

const destinoGeral   = path.join(RAIZ, 'database', 'diagrama-er.mmd');
const destinoDetalhe = path.join(RAIZ, 'database', 'diagrama-er-detalhe.mmd');

fs.writeFileSync(destinoGeral, geral.join('\n') + '\n', 'utf8');
fs.writeFileSync(destinoDetalhe, detalhe.join('\n') + '\n', 'utf8');

const nColunas = tabelas.reduce((s, t) => s + t.colunas.length, 0);
console.log(`Tabelas:            ${tabelas.length}`);
console.log(`Colunas:            ${nColunas}`);
console.log(`Chaves estrangeiras:${String(ligacoes.length).padStart(4)}`);
console.log('');
console.log(`Escrito: ${path.relative(RAIZ, destinoGeral)}`);
console.log(`Escrito: ${path.relative(RAIZ, destinoDetalhe)}`);
console.log('');
console.log('Se o numero de tabelas mudou, ha tres sitios a acertar:');
console.log('  README.md, docs/API.md e o /api/saude (que conta sozinho).');
