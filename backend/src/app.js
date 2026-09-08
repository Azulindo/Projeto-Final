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
const catalogoRouter = require('./routes/catalogo');
const authRouter = require('./routes/auth');
const mesasRouter = require('./routes/mesas');
const pedidosRouter = require('./routes/pedidos');

const app = express();

/*
 *  No Render (e em qualquer alojamento deste genero) os pedidos nao
 *  chegam diretos: passam por um servidor da casa que os reencaminha.
 *  Sem esta linha, o Express ve sempre o endereco desse intermediario
 *  em vez do endereco de quem chamou — e o express-rate-limit recusa-se
 *  a arrancar, porque um limite por endereco que ve toda a gente como
 *  a mesma pessoa nao limita nada.
 *
 *  O 1 quer dizer "confia num intermediario, o mais proximo". Nao se
 *  poe true: isso mandava confiar em qualquer cabecalho que chegasse,
 *  e ai qualquer pessoa podia inventar o endereco que quisesse.
 */
app.set('trust proxy', 1);

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

// Sessao: POST /api/auth/login, GET /api/auth/eu
app.use('/api', authRouter);

// Catalogo: GET /api/categorias, /api/produtos, /api/produtos/:id
app.use('/api', catalogoRouter);

// Cliente a mesa: /api/mesas/:token/sessao, /pedir, /conta, /pedir-conta
// Sem login — quem faz de credencial e o token do QR Code impresso na mesa.
app.use('/api', mesasRouter);

// Gestao: /api/pedidos/ativos, /cozinha, /:id/estado, /sessao/:id/fechar
// Todos exigem sessao iniciada.
app.use('/api', pedidosRouter);

/**
 * GET /api/saude
 * Diz se a API esta de pe e se consegue falar com a base de dados.
 *
 * E o primeiro endpoint a existir de proposito: serve para confirmar
 * que a ligacao funciona antes de haver logica nenhuma. Depois de o
 * projeto estar publicado, e tambem por aqui que se verifica se o
 * servidor adormeceu — e o que o trabalho agendado do GitHub chama de
 * 6 em 6 horas para o Aiven nao se desligar.
 */
app.get('/api/saude', async (_req, res, next) => {
  try {
    const inicio = Date.now();
    await testarLigacao();

    const [[{ produtos }]] = await pool.query(
      'SELECT COUNT(*) AS produtos FROM produto WHERE ativo = 1'
    );
    /*
     *  Tabelas e vistas contadas em SEPARADO, de proposito.
     *
     *  O information_schema.TABLES do MySQL inclui as vistas, por isso
     *  um COUNT(*) simples devolvia 18 quando o diagrama ER mostra 17.
     *  Nenhum dos numeros estava errado — contavam coisas diferentes —
     *  mas o diagrama e entregavel e alguem ia contar. Agora a resposta
     *  diz o que e cada coisa: 17 tabelas e 1 vista (vw_total_sessao).
     */
    const [[{ tabelas, vistas }]] = await pool.query(
      `SELECT SUM(TABLE_TYPE = 'BASE TABLE') AS tabelas,
              SUM(TABLE_TYPE = 'VIEW')       AS vistas
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
        tabelas: Number(tabelas),
        vistas:  Number(vistas),
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
  if (!process.env.JWT_SECRET) {
    console.error('FALTA O JWT_SECRET NO .env');
    console.error('Sem ele nao se assinam sessoes. Gera um com:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    process.exit(1);
  }

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
