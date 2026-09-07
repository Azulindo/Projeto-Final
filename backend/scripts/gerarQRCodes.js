/**
 * =====================================================================
 * gerarQRCodes.js — Gera os QR Codes das mesas (B-65)
 * =====================================================================
 * Escrito originalmente pelo Guilherme com Prisma; passado para mysql2
 * quando o Prisma saiu do projeto. A logica e a mesma, muda so a forma
 * de perguntar as mesas a base de dados.
 *
 * O que faz:
 *   1. Le as mesas ativas da base de dados (com o qr_code de cada uma)
 *   2. Escreve um PNG por mesa em `backend/qrcodes/`
 *   3. Imprime no terminal a tabela de mesa -> token -> endereco
 *
 * Usar:
 *   npm run qrcodes -- https://vemproabate.vercel.app
 *
 * O endereco e obrigatorio e tem de ser publico: e ele que fica dentro
 * do QR Code, e o telemovel do cliente tem de conseguir abri-lo
 * (`localhost` so funciona no computador onde o servidor esta a correr).
 *
 * Alternativa sem terminal: a app de gestao tem a pagina
 * `frontend/funcionarios/qrcodes.html`, que gera os mesmos QR Codes
 * ja prontos a imprimir, com o numero da mesa em cada cartao.
 * =====================================================================
 */

require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const QRCode = require('qrcode');
const { pool } = require('../src/config/bd');

const CAMINHO_MESA = 'frontend/cliente/mesa.html';
const PASTA_SAIDA  = path.join(__dirname, '..', 'qrcodes');

async function main() {
  const urlBase = (process.argv[2] || process.env.FRONTEND_URL || '').replace(/\/+$/, '');

  if (!urlBase) {
    console.error('\nFalta o endereco do site.\n');
    console.error('   Usa:  npm run qrcodes -- https://o-teu-site.vercel.app');
    console.error('   (ou define FRONTEND_URL no .env)\n');
    process.exit(1);
  }

  if (/localhost|127\.0\.0\.1/.test(urlBase)) {
    console.warn('\nAviso: estas a usar um endereco local. Os QR Codes vao');
    console.warn('funcionar no computador onde o servidor corre, mas NAO no');
    console.warn('telemovel.\n');
  }

  const [mesas] = await pool.query(
    `SELECT id_mesa, numero_mesa, qr_code
       FROM mesa
      WHERE ativo = 1
      ORDER BY numero_mesa`
  );

  if (mesas.length === 0) {
    console.error('Nao ha mesas na base de dados. Corre primeiro o database/seed.sql.');
    process.exit(1);
  }

  fs.mkdirSync(PASTA_SAIDA, { recursive: true });

  console.log(`\nA gerar ${mesas.length} QR Codes para ${urlBase}\n`);

  for (const mesa of mesas) {
    /*
     *  Repara no que vai dentro do QR Code: o qr_code (um valor
     *  aleatorio), nunca o numero da mesa. Se apontasse para
     *  "?mesa=4", qualquer pessoa em casa podia mandar pedidos
     *  para a mesa 4 sem la estar.
     */
    const url = `${urlBase}/${CAMINHO_MESA}?mesa=${encodeURIComponent(mesa.qr_code)}`;
    const numero = String(mesa.numero_mesa).padStart(2, '0');
    const ficheiro = path.join(PASTA_SAIDA, `mesa-${numero}.png`);

    await QRCode.toFile(ficheiro, url, {
      width: 600,                 // grande o suficiente para imprimir bem
      margin: 2,                  // zona branca a volta — o leitor precisa dela
      errorCorrectionLevel: 'M',  // aguenta ~15% do codigo danificado (riscos, dobras)
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    console.log(`  Mesa ${numero}  ->  ${path.basename(ficheiro)}`);
    console.log(`            ${url}\n`);
  }

  console.log(`Ficheiros escritos em: ${PASTA_SAIDA}`);
  console.log('Imprime, plastifica e poe um em cada mesa.\n');
}

main()
  .catch(e => { console.error('Erro:', e.message); process.exit(1); })
  .finally(() => pool.end());
