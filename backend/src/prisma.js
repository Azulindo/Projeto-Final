require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Instância singleton — importar este ficheiro em todas as rotas
const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

module.exports = prisma;
