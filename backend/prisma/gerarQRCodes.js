/**
 * =====================================================================
 * gerarQRCodes.js — Gera os QR Codes das mesas (B-65)
 * =====================================================================
 * O `package.json` já apontava para este ficheiro (`npm run qrcodes`),
 * mas ele não existia — é o que fica aqui resolvido.
 *
 * O que faz:
 *   1. Lê as mesas ativas da base de dados (com o qrToken de cada uma)
 *   2. Escreve um PNG por mesa em `backend/qrcodes/`
 *   3. Imprime no terminal a tabela de mesa → token → endereço
 *
 * Usar:
 *   npm run qrcodes -- https://vemproabate.vercel.app
 *
 * O endereço é obrigatório e tem de ser público: é ele que fica dentro
 * do QR Code, e o telemóvel do cliente tem de conseguir abri-lo
 * (`localhost` só funciona no computador onde o servidor está a correr).
 *
 * Alternativa sem terminal: a app de gestão tem a página
 * `frontend/funcionarios/qrcodes.html`, que gera os mesmos QR Codes
 * já prontos a imprimir, com o número da mesa em cada cartão.
 * =====================================================================
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CAMINHO_MESA = 'frontend/cliente/mesa.html';
const PASTA_SAIDA  = path.join(__dirname, '..', 'qrcodes');

async function main() {
  const urlBase = (process.argv[2] || process.env.FRONTEND_URL || '').replace(/\/+$/, '');

  if (!urlBase) {
    console.error('\n❌ Falta o endereço do site.\n');
    console.error('   Usa:  npm run qrcodes -- https://o-teu-site.vercel.app');
    console.error('   (ou define FRONTEND_URL no .env)\n');
    process.exit(1);
  }

  if (/localhost|127\.0\.0\.1/.test(urlBase)) {
    console.warn('\n⚠️  Estás a usar um endereço local. Os QR Codes vão funcionar');
    console.warn('   no computador onde o servidor corre, mas NÃO no telemóvel.\n');
  }

  const mesas = await prisma.mesa.findMany({
    where:   { ativa: true },
    orderBy: { numero: 'asc' },
  });

  if (mesas.length === 0) {
    console.error('❌ Não há mesas na base de dados. Corre primeiro:  npm run seed');
    process.exit(1);
  }

  fs.mkdirSync(PASTA_SAIDA, { recursive: true });

  console.log(`\n🔳 A gerar ${mesas.length} QR Codes para ${urlBase}\n`);

  for (const mesa of mesas) {
    const url = `${urlBase}/${CAMINHO_MESA}?mesa=${encodeURIComponent(mesa.qrToken)}`;
    const ficheiro = path.join(PASTA_SAIDA, `mesa-${String(mesa.numero).padStart(2, '0')}.png`);

    await QRCode.toFile(ficheiro, url, {
      width: 600,               // grande o suficiente para imprimir bem
      margin: 2,                // zona branca à volta — o leitor precisa dela
      errorCorrectionLevel: 'M', // aguenta ~15% do código danificado (riscos, dobras)
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    console.log(`  Mesa ${String(mesa.numero).padStart(2, '0')}  →  ${path.basename(ficheiro)}`);
    console.log(`            ${url}\n`);
  }

  console.log(`✅ Ficheiros escritos em: ${PASTA_SAIDA}`);
  console.log('   Imprime, plastifica e põe um em cada mesa.\n');
}

main()
  .catch(e => { console.error('❌ Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
