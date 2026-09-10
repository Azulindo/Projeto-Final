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
const { NIVEL_POR_CARGO } = require('../config/niveis');
const { limiteLoginPorEmail, limiteLoginPorIp } = require('../middleware/limites');

const router = express.Router();


/* A tabela cargo -> nivel vive em config/niveis.js. Estava escrita
   aqui e no gestaoFuncionarios.js; duas copias da mesma regra acabam
   sempre por discordar (X-11, 10/09). */


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
 *  LIMITE DE TENTATIVAS (B-23, alargado no B-25)
 *
 *  Os dois limites estavam aqui escritos a mao; passaram para o
 *  middleware/limites.js, que e onde vivem todos os numeros deste
 *  genero, com a explicacao de cada um ao lado.
 *
 *  Sao DOIS e nao um: cinco tentativas falhadas por email, e vinte
 *  falhadas a partir do mesmo endereco. So com o primeiro, bastava
 *  mudar de email para ter cinco tentativas novas — e uma lista de
 *  emails nunca chegava a limite nenhum.
 * ----------------------------------------------------------------- */


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
router.post('/auth/login', limiteLoginPorIp, limiteLoginPorEmail, validar(esquemaLogin), async (req, res, next) => {
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
      `SELECT u.id_utilizador, u.nome, u.email, u.ativo, f.cargo
         FROM utilizador u
         JOIN funcionario f ON f.id_utilizador = u.id_utilizador
        WHERE u.id_utilizador = ?`,
      [req.utilizador.id]
    );

    const conta = linhas[0];
    if (!conta || !conta.ativo) {
      return res.status(401).json({ erro: 'Sessao invalida.' });
    }

    /*
     *  O `idUtilizador` chama-se assim e nao `id` de proposito: e
     *  exatamente o nome que a linha do GET /gestao/funcionarios usa
     *  para a mesma coisa. Dois nomes para o mesmo numero e um convite
     *  a comparar os campos errados.
     *
     *  Pedido pelo Guilherme (10/09) e a razao e boa: para marcar "a
     *  tua conta" na lista de funcionarios, a unica coisa que ele
     *  tinha era o NOME — e dois homonimos davam a marca a pessoa
     *  errada. Sem isto, so podia marcar quando o nome fosse unico.
     *
     *  Nao revela nada: este numero ja vai dentro do token, que o
     *  cliente tem e consegue ler. A alternativa era ele decodificar
     *  o token no browser para tirar de la o id — o que funcionava, e
     *  era pior: passava a haver front-end a interpretar o formato do
     *  token, e o formato do token e assunto do servidor.
     */
    res.json({
      idUtilizador: conta.id_utilizador,
      nome:  conta.nome,
      email: conta.email,
      nivel: NIVEL_POR_CARGO[conta.cargo] || null,
    });
  } catch (erro) { next(erro); }
});


module.exports = router;
