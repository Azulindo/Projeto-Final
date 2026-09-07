/**
 * =====================================================================
 *  auth.js — Login e sessao (B-19, B-22, B-23)
 *
 *  POST /api/auth/login  → email + password, devolve o token
 *  GET  /api/auth/eu     → quem esta nesta sessao
 *
 *  Contrato acordado no docs/API.md, seccao 4.1.
 * =====================================================================
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const { pool } = require('../config/bd');
const { validar } = require('../middleware/validar');
const { autenticar } = require('../middleware/autenticar');

// O pacote mudou de forma de exportar entre versoes; isto aceita as duas.
const pacoteLimite = require('express-rate-limit');
const rateLimit = pacoteLimite.rateLimit || pacoteLimite;

const router = express.Router();


/* -------------------------------------------------------------------
 *  DO CARGO PARA O NIVEL
 *
 *  A base de dados guarda o CARGO da pessoa (cozinheiro, empregado de
 *  mesa). O front-end trabalha com o NIVEL, que e outra coisa: e o
 *  conjunto de ecras a que aquele posto de trabalho pode chegar.
 *
 *  Sao mesmo conceitos diferentes e vale a pena manter a distincao. Um
 *  gerente e um administrador tem cargos diferentes na vida real, mas
 *  veem os mesmos ecras. Se amanha houver um "subchefe", muda-se aqui
 *  uma linha e mais nada — nem a base de dados nem o front-end mexem.
 *
 *  A traducao acontece num sitio so, tal como o formatarProduto faz no
 *  catalogo. Se estivesse espalhada, mais cedo ou mais tarde dois
 *  sitios discordavam.
 * ----------------------------------------------------------------- */
const NIVEL_POR_CARGO = {
  administrador:  'administrador',
  gerente:        'administrador',
  cozinheiro:     'cozinha',
  empregado_mesa: 'balcao',
};


/* -------------------------------------------------------------------
 *  O QUE O LOGIN ACEITA
 * ----------------------------------------------------------------- */
const esquemaLogin = z.object({
  email: z.string()
    .trim()
    .toLowerCase()          // "Cozinha@..." e "cozinha@..." sao a mesma conta
    .min(5, 'Falta o email.')
    .max(150, 'Email demasiado longo.'),
  password: z.string()
    .min(1, 'Falta a palavra-passe.')
    .max(200, 'Palavra-passe demasiado longa.'),
});


/* -------------------------------------------------------------------
 *  LIMITE DE TENTATIVAS (B-23)
 *
 *  Cinco tentativas falhadas por email em 15 minutos. Sem isto, um
 *  programa pode experimentar milhares de palavras-passe por minuto
 *  ate acertar — e as nossas sao curtas.
 *
 *  Conta-se por EMAIL e nao por endereco de rede de proposito: na
 *  cozinha, no balcao e no escritorio saem todos pelo mesmo IP do
 *  restaurante, e contar por IP bloquearia os tres postos por causa de
 *  um. O skipSuccessfulRequests faz com que quem acerta nao gaste
 *  tentativas.
 * ----------------------------------------------------------------- */
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
    return email || 'sem-email';
  },
  handler: (_req, res) => {
    res.status(429).json({
      erro: 'Demasiadas tentativas falhadas. Tenta outra vez dentro de 15 minutos.',
    });
  },
});


/* -------------------------------------------------------------------
 *  HASH DESCARTAVEL
 *
 *  Gerado no arranque a partir de bytes aleatorios, nunca serve para
 *  nada. Existe para o caso de o email nao existir: em vez de
 *  responder logo, comparamos a palavra-passe contra este hash, o que
 *  gasta o mesmo tempo que uma comparacao a serio.
 *
 *  Sem isto, "email que nao existe" respondia em 1 ms e "password
 *  errada" em 250 ms — e essa diferenca, medida com cuidado, revela
 *  que emails existem no sistema.
 * ----------------------------------------------------------------- */
const HASH_FALSO = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);


// ─────────────────────────────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', limiteLogin, validar(esquemaLogin), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [linhas] = await pool.query(
      `SELECT u.id_utilizador, u.nome, u.email, u.password_hash, u.ativo,
              f.cargo
         FROM utilizador u
         JOIN funcionario f ON f.id_utilizador = u.id_utilizador
        WHERE u.email = ?`,
      [email]
    );

    const conta = linhas[0];

    /*
     *  A comparacao acontece SEMPRE, mesmo quando a conta nao existe.
     *  Ver a nota do HASH_FALSO acima.
     *
     *  E repara que nunca se compara a palavra-passe diretamente: o que
     *  esta guardado e um hash bcrypt, e o bcrypt.compare volta a
     *  calcular o hash da palavra escrita com o mesmo sal e compara os
     *  resultados. A palavra-passe verdadeira nunca esteve na base de
     *  dados e nao ha maneira de a tirar de la.
     */
    const senhaCerta = await bcrypt.compare(
      password,
      conta ? conta.password_hash : HASH_FALSO
    );

    /*
     *  Uma mensagem so para os tres casos: email inexistente, password
     *  errada, conta desativada. Se fossem diferentes, davam a quem
     *  esta a tentar entrar exatamente a informacao que lhe falta.
     */
    if (!conta || !senhaCerta || !conta.ativo) {
      return res.status(401).json({ erro: 'Email ou palavra-passe incorretos.' });
    }

    const nivel = NIVEL_POR_CARGO[conta.cargo];

    // Cargo que ninguem mapeou: falha fechada. Mais vale ninguem entrar
    // do que alguem entrar com permissoes que nao se decidiram.
    if (!nivel) {
      return res.status(403).json({
        erro: 'Esta conta nao tem acesso a aplicacao de gestao.',
      });
    }

    /*
     *  O que vai dentro do token: o id e o nivel, mais nada. Um JWT vai
     *  e volta em todos os pedidos e QUALQUER PESSOA O CONSEGUE LER —
     *  esta assinado, nao cifrado. Nunca meter aqui o email, o nome, ou
     *  o que quer que seja que nao queiramos ver publicado.
     */
    const token = jwt.sign(
      { id: conta.id_utilizador, nivel },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRA || '8h' }
    );

    res.json({
      token,
      utilizador: { nome: conta.nome, email: conta.email, nivel },
    });
  } catch (erro) { next(erro); }
});


// ─────────────────────────────────────────────────────────────────────
//  GET /api/auth/eu
//
//  O front-end chama isto ao abrir a app, para saber se o token que
//  tem guardado ainda presta.
// ─────────────────────────────────────────────────────────────────────
router.get('/auth/eu', autenticar, async (req, res, next) => {
  try {
    /*
     *  Vamos outra vez a base de dados em vez de responder com o que
     *  esta dentro do token. Custa uma consulta, e vale a pena: se uma
     *  conta for desativada, o token que ela ja tem continua valido
     *  ate expirar. Assim perde o acesso na hora.
     */
    const [linhas] = await pool.query(
      `SELECT u.nome, u.email, u.ativo, f.cargo
         FROM utilizador u
         JOIN funcionario f ON f.id_utilizador = u.id_utilizador
        WHERE u.id_utilizador = ?`,
      [req.utilizador.id]
    );

    const conta = linhas[0];
    if (!conta || !conta.ativo) {
      return res.status(401).json({ erro: 'Sessao invalida.' });
    }

    res.json({
      nome:  conta.nome,
      email: conta.email,
      nivel: NIVEL_POR_CARGO[conta.cargo] || null,
    });
  } catch (erro) { next(erro); }
});


module.exports = router;
