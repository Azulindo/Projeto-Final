/**
 * seed.js — Popula a base de dados com mesas e produtos do menu real
 * Executar: node prisma/seed.js
 */

require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const { randomUUID }   = require('crypto');

const prisma = new PrismaClient();

// ── Produtos do menu real (sincronizado com reservas.js) ──────────────────────
const PRODUTOS = [
  // Entradas
  { nome: 'Abatata Frita',    descricao: 'Batatas rústicas com tempero da casa e maionese de alho', preco: 3.90,  categoria: 'Entradas' },
  { nome: 'Vem Pro Abacate',  descricao: 'Entrada com abacate, guacamole ou tosta',                 preco: 5.80,  categoria: 'Entradas' },
  { nome: "Vem p'ro Alho",    descricao: 'Pão de alho no forno',                                    preco: 3.20,  categoria: 'Entradas' },
  { nome: 'Abate-Boca',       descricao: 'Mini croquetes de novilho',                               preco: 4.50,  categoria: 'Entradas' },
  // Pratos Principais
  { nome: 'Borrego Abatido',        descricao: 'Borrego assado com batata, alecrim, alho e vinho branco', preco: 15.50, categoria: 'Pratos Principais' },
  { nome: 'Francesinha em K.O.',    descricao: 'Bife, enchidos, queijo e molho da casa com batata e ovo', preco: 12.20, categoria: 'Pratos Principais' },
  { nome: 'Abate Misto',            descricao: 'Picanha, chouriço e frango na brasa com arroz e batata',  preco: 16.20, categoria: 'Pratos Principais' },
  { nome: 'Prega-me Isto',          descricao: 'Bife dos Açores com batata frita',                        preco: 16.90, categoria: 'Pratos Principais' },
  { nome: 'Picanha na Brasa Negra', descricao: 'Picanha grelhada com arroz e batata frita',               preco: 16.00, categoria: 'Pratos Principais' },
  { nome: 'Tábua Rústica do Abate', descricao: 'Carnes mistas com migas e batata a murro',                preco: 17.80, categoria: 'Pratos Principais' },
  // Bebidas
  { nome: 'Cerveja (Fino/Pressão)', descricao: 'Fino ou pressão',                    preco: 1.70,  categoria: 'Bebidas' },
  { nome: 'Cerveja (Caneca)',        descricao: 'Caneca de cerveja',                  preco: 2.80,  categoria: 'Bebidas' },
  { nome: 'Panaché',                 descricao: 'Cerveja com gasosa',                 preco: 2.20,  categoria: 'Bebidas' },
  { nome: 'Sangria (Copo)',          descricao: 'Branca, tinta ou espumante — copo',  preco: 3.20,  categoria: 'Bebidas' },
  { nome: 'Sangria (Jarro)',         descricao: 'Branca, tinta ou espumante — jarro', preco: 12.00, categoria: 'Bebidas' },
  { nome: 'Coca-Cola',               descricao: 'Normal ou zero',                     preco: 1.90,  categoria: 'Bebidas' },
  { nome: 'Ice Tea',                 descricao: 'Pêssego, limão ou manga',            preco: 1.90,  categoria: 'Bebidas' },
  { nome: 'Sumos Naturais',          descricao: 'Laranja ou mistura de frutos',       preco: 3.00,  categoria: 'Bebidas' },
  { nome: 'Água (Mineral)',          descricao: 'Água mineral sem gás',               preco: 1.30,  categoria: 'Bebidas' },
  { nome: 'Água (Com Gás)',          descricao: 'Água com gás',                       preco: 1.60,  categoria: 'Bebidas' },
  { nome: 'Abate Pingado',           descricao: 'Café ou descafeinado',               preco: 1.00,  categoria: 'Bebidas' },
  // Sobremesas
  { nome: 'Abategatoue',        descricao: 'Petit gâteau com gelado e chocolate',  preco: 5.20, categoria: 'Sobremesas' },
  { nome: 'Baba do Pastor',      descricao: 'Baba de camelo com bolacha',           preco: 3.90, categoria: 'Sobremesas' },
  { nome: 'Cheesecake da Casa',  descricao: 'Cheesecake com frutos vermelhos',      preco: 4.60, categoria: 'Sobremesas' },
  { nome: 'Taça Gelada da Casa', descricao: 'Gelados, chantilly e chocolate',       preco: 4.20, categoria: 'Sobremesas' },
];

async function main() {
  console.log('🌱 A popular a base de dados...\n');

  // ── Criar mesas 1-10 ───────────────────────────────────────────────────────
  const NUM_MESAS = 10;
  for (let i = 1; i <= NUM_MESAS; i++) {
    const mesa = await prisma.mesa.upsert({
      where:  { numero: i },
      update: {},
      create: { numero: i, lugares: i <= 2 ? 2 : 4, qrToken: randomUUID() },
    });
    console.log(`🪑 Mesa ${mesa.numero} — Token: ${mesa.qrToken}`);
  }

  // ── Criar produtos ─────────────────────────────────────────────────────────
  console.log('\n🍖 A criar produtos...');
  for (const p of PRODUTOS) {
    await prisma.produto.upsert({
      where:  { nome: p.nome },
      update: { preco: p.preco, descricao: p.descricao },
      create:  p,
    });
    console.log(`  ✓ ${p.nome} (${p.preco}€)`);
  }

  console.log('\n✅ Seed concluído com sucesso!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
