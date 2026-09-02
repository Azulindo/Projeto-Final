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

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,   // se estiverem todas ocupadas, espera em vez de rebentar
  connectionLimit: 10,        // maximo de ligacoes abertas ao mesmo tempo
  queueLimit: 0,              // fila de espera sem limite

  timezone: 'Z',              // guarda e le datas em UTC, sem surpresas de fuso
  decimalNumbers: true,       // ver nota abaixo
  charset: 'utf8mb4',
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
