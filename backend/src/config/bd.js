/**
 * =====================================================================
 *  Ligacao a base de dados MySQL
 * =====================================================================
 *
 *  Usa um POOL de ligacoes em vez de uma ligacao unica.
 *
 *  Porque: abrir uma ligacao ao MySQL demora dezenas de milissegundos.
 *  Se a API abrisse uma nova a cada pedido, o site ficava lento e o
 *  servidor esgotava o limite de ligacoes. O pool mantem um punhado
 *  abertas e vai-as emprestando conforme os pedidos chegam.
 */

/*
 *  Nao se chama aqui o dotenv. Quem decide qual .env vale e o
 *  config/ambiente.js, e chama-se uma vez so — ver la a nota sobre o
 *  DB_SSL_CA da nuvem que se infiltrou numa ligacao local.
 */
require('./ambiente');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,   // se estiverem todas ocupadas, espera em vez de rebentar
  connectionLimit: 10,        // maximo de ligacoes abertas ao mesmo tempo
  queueLimit: 0,              // fila de espera sem limite

  /*
   *  timezone: 'Z' diz ao mysql2 "as datas que vieres buscar a base
   *  estao em UTC". So que uma coluna DATETIME do MySQL nao guarda
   *  fuso nenhum — guarda numeros —, e o NOW() do servidor devolve a
   *  hora LOCAL dele. Em Portugal, no verao, isso e UTC+1.
   *
   *  Resultado: cada data era lida como se fosse uma hora mais tarde
   *  do que e, e todos os pedidos pareciam uma hora mais novos. Com
   *  pedidos de dias nao se via; com pedidos de 28 minutos, a hora a
   *  mais empurra-os para o futuro e o ecra da cozinha dizia "agora
   *  mesmo" a tudo — que e justamente a informacao que a cozinha
   *  precisa de ter certa, porque e por ela que se decide o que se faz
   *  a seguir.
   *
   *  Descoberto a 10/09 pela conta: o ecra mostrava 212h52 onde a
   *  diferenca real era 213h52. Uma hora certinha nao e coincidencia.
   *
   *  A correcao esta em baixo, no pool.on('connection'): dizer ao
   *  MySQL que a sessao trabalha em UTC. Assim o NOW() devolve UTC, a
   *  base guarda UTC, e o 'Z' aqui passa a ser verdade em vez de uma
   *  suposicao. Vale para o portatil e para o Aiven, que esta noutro
   *  fuso — e ali o erro seria diferente, o que e pior do que ser
   *  grande.
   */
  timezone: 'Z',
  decimalNumbers: true,       // ver nota abaixo
  charset: 'utf8mb4',

  // O Aiven so aceita ligacoes cifradas. Sem isto rebenta com
  // "Connections using insecure transport are prohibited".
  // O ca.pem prova que o servidor do outro lado e mesmo o Aiven.
  // Sem DB_SSL_CA no .env, liga sem SSL — assim o mesmo codigo
  // serve o MySQL de casa e o da nuvem.
  ssl: process.env.DB_SSL_CA
    ? { ca: require('fs').readFileSync(require('path').resolve(process.env.DB_SSL_CA)) }
    : undefined,
});

/*
 *  Cada ligacao nova do pool comeca por dizer que trabalha em UTC.
 *
 *  Tem de ser por ligacao e nao uma vez so: o pool abre varias, e uma
 *  que ficasse de fora dava datas com uma hora de diferenca das
 *  outras. Um erro que aparece em algumas linhas e nao noutras e muito
 *  pior de encontrar do que um erro constante.
 */
pool.on('connection', (ligacao) => {
  ligacao.query("SET time_zone = '+00:00'");
});

/*
 *  decimalNumbers: true
 *  --------------------
 *  Por omissao, o mysql2 devolve as colunas DECIMAL como TEXTO ("16.20"),
 *  para nao perder precisao. Isso apanha toda a gente desprevenida:
 *
 *      const total = preco * quantidade;   //  "16.20" * 2  ->  32.4  (ok)
 *      const total = preco + iva;          //  "16.20" + "1.00"  ->  "16.201.00"  (!!)
 *
 *  Com esta opcao, os precos chegam ja como numeros.
 */

/**
 * Confirma que a base de dados responde.
 * Usado no arranque e no endpoint /api/saude.
 */
async function testarLigacao() {
  const [linhas] = await pool.query('SELECT 1 AS ok');
  return linhas[0].ok === 1;
}

module.exports = { pool, testarLigacao };
