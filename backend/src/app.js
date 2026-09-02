/**
 * =====================================================================
 *  VEM PRO ABATE — API REST
 *  Ponto de entrada da aplicacao
 * =====================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, testarLigacao } = require('./config/bd');

const app = express();

/* -------------------------------------------------------------------
 *  MIDDLEWARE GLOBAL
 *  Corre em todos os pedidos, por esta ordem.
 * ----------------------------------------------------------------- */

// Le o corpo dos pedidos em JSON. Sem isto, req.body vinha vazio.
app.use(express.json({ limit: '100kb' }));

// CORS: o site esta num endereco e a API noutro. Sem isto, o browser
// bloqueia os pedidos por seguranca (same-origin policy).
const origens = (process.env.ORIGEM_PERMITIDA || '').split(',').filter(Boolean);
app.use(cors({
  origin: origens.length ? origens : true,
  credentials: true,
}));

// Regista cada pedido no terminal. Util enquanto se desenvolve.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});


/* -------------------------------------------------------------------
 *  ROTAS
 * ----------------------------------------------------------------- */

/**
 * GET /api/saude
 * Diz se a API esta de pe e se consegue falar com a base de dados.
 *
 * E o primeiro endpoint a existir de proposito: serve para confirmar
 * que a ligacao funciona antes de haver logica nenhuma. Depois de o
 * projeto estar publicado, e tambem por aqui que se verifica se o
 * servidor adormeceu.
 */
app.get('/api/saude', async (_req, res, next) => {
  try {
    const inicio = Date.now();
    await testarLigacao();

    const [[{ produtos }]] = await pool.query(
      'SELECT COUNT(*) AS produtos FROM produto WHERE ativo = 1'
    );
    const [[{ tabelas }]] = await pool.query(
      `SELECT COUNT(*) AS tabelas
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?`,
      [process.env.DB_NAME]
    );

    res.json({
      estado: 'ok',
      api: 'Vem Pro Abate',
      ambiente: process.env.NODE_ENV || 'development',
      baseDados: {
        ligada: true,
        nome: process.env.DB_NAME,
        tabelas,
        produtosAtivos: produtos,
        tempoResposta: `${Date.now() - inicio} ms`,
      },
      hora: new Date().toISOString(),
    });
  } catch (erro) {
    next(erro);
  }
});


/* -------------------------------------------------------------------
 *  ERROS
 *  Tem de vir SEMPRE depois das rotas.
 * ----------------------------------------------------------------- */

// 404 — nenhuma rota acima correspondeu
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota nao encontrada',
    caminho: req.originalUrl,
  });
});

// Tratamento central de erros.
// Nunca devolver a mensagem do MySQL ao cliente: revela nomes de
// tabelas e estrutura da base de dados a quem estiver a bisbilhotar.
app.use((erro, _req, res, _next) => {
  console.error('ERRO:', erro);

  const emDesenvolvimento = process.env.NODE_ENV !== 'production';

  res.status(erro.status || 500).json({
    erro: erro.mensagemPublica || 'Ocorreu um erro no servidor.',
    ...(emDesenvolvimento && { detalhe: erro.message }),
  });
});


/* -------------------------------------------------------------------
 *  ARRANQUE
 * ----------------------------------------------------------------- */
const PORTA = process.env.PORT || 3000;

(async () => {
  try {
    await testarLigacao();
    console.log(`Base de dados "${process.env.DB_NAME}" ligada.`);
  } catch (erro) {
    console.error('NAO FOI POSSIVEL LIGAR A BASE DE DADOS');
    console.error(erro.message);
    console.error('Confirma os dados no ficheiro .env e se o MySQL esta a correr.');
    process.exit(1);
  }

  app.listen(PORTA, () => {
    console.log(`API a correr em http://localhost:${PORTA}`);
    console.log(`Testa aqui:      http://localhost:${PORTA}/api/saude`);
  });
})();
