/**
 * =====================================================================
 *  gestaoFuncionarios.js — Contas dos funcionarios (B-64)
 *
 *  GET   /api/gestao/funcionarios
 *  POST  /api/gestao/funcionarios
 *  PATCH /api/gestao/funcionarios/:id
 *
 *  Nivel: administrador. So.
 *  Formato para a F-53 — se preferires outro, diz antes de construires.
 *
 *  Uma conta vive em DUAS tabelas: `utilizador` (nome, email, senha) e
 *  `funcionario` (cargo, data de contratacao). Aqui tratam-se como uma
 *  coisa so, porque para quem esta no ecra e uma coisa so. As duas
 *  escritas vao sempre na mesma transacao: uma conta sem cargo, ou um
 *  cargo sem conta, nao e meio trabalho — e uma linha estragada.
 * =====================================================================
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { pool } = require('../config/bd');
const { validar } = require('../middleware/validar');
const { autenticar, exigirNivel } = require('../middleware/autenticar');

const router = express.Router();

/*
 *  Os cargos que dao acesso a aplicacao de gestao, e o nivel de cada
 *  um. E a mesma tabela do auth.js — quem entrar por aqui tem de sair
 *  com um nivel que o login reconheca, senao criava-se uma conta que
 *  nunca consegue entrar.
 */
const NIVEL_POR_CARGO = {
  administrador:  'administrador',
  gerente:        'administrador',
  cozinheiro:     'cozinha',
  empregado_mesa: 'balcao',
};
const CARGOS = Object.keys(NIVEL_POR_CARGO);

// Os cargos que mandam. Usado na regra do ultimo administrador.
const CARGOS_ADMIN = CARGOS.filter((c) => NIVEL_POR_CARGO[c] === 'administrador');

/*
 *  Custo 12, como no scripts/gerarHash.js e no auth.js. O bcrypt repete
 *  o calculo 2^12 vezes de proposito, para demorar uns 250 ms: e isso
 *  que torna inviavel experimentar milhoes de palavras por segundo se o
 *  hash algum dia for parar as maos erradas.
 */
const CUSTO_BCRYPT = 12;

const senha = z.string()
  .min(10, 'A palavra-passe tem de ter pelo menos 10 caracteres.')
  .max(200, 'Palavra-passe demasiado longa.');

const esquemaCriar = z.object({
  nome: z.string().trim().min(2, 'Falta o nome.').max(120),
  email: z.string().trim().toLowerCase()
    .email('Email invalido.')
    .max(150),
  telefone: z.string().trim().min(6, 'Falta o telefone.').max(30),
  cargo: z.enum(CARGOS, { message: `O cargo tem de ser um de: ${CARGOS.join(', ')}.` }),
  password: senha,
  data_contratacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD.')
    .optional(),
  ativo: z.boolean().optional(),
});

const esquemaEditar = z.object({
  nome: esquemaCriar.shape.nome.optional(),
  email: esquemaCriar.shape.email.optional(),
  telefone: esquemaCriar.shape.telefone.optional(),
  cargo: esquemaCriar.shape.cargo.optional(),
  ativo: esquemaCriar.shape.ativo,
  // Opcional: so muda a senha quem mandar uma senha.
  password: senha.optional(),
});

/*
 *  O que sai daqui NUNCA inclui o password_hash.
 *
 *  Um hash bcrypt nao se desfaz, mas tambem nao tem nada que fazer numa
 *  resposta HTTP: fica no historico do browser, nos registos de quem
 *  esta pelo meio, e num printscreen que alguem cola num chat. O que
 *  nao sai nao se perde.
 */
function formatar(l) {
  return {
    id:               l.id_funcionario,
    idUtilizador:     l.id_utilizador,
    nome:             l.nome,
    email:            l.email,
    telefone:         l.telefone,
    cargo:            l.cargo,
    nivel:            NIVEL_POR_CARGO[l.cargo] || null,
    ativo:            Boolean(l.ativo),
    data_contratacao: l.data_contratacao,
  };
}

const SELECT_FUNCIONARIO = `
  SELECT f.id_funcionario, f.id_utilizador, f.cargo, f.data_contratacao,
         u.nome, u.email, u.telefone, u.ativo
    FROM funcionario f
    JOIN utilizador u ON u.id_utilizador = f.id_utilizador`;

async function lerFuncionario(con, id) {
  const [l] = await con.query(`${SELECT_FUNCIONARIO} WHERE f.id_funcionario = ?`, [id]);
  return l.length ? formatar(l[0]) : null;
}

/**
 * Quantos administradores ATIVOS existem, sem contar com um id.
 *
 * Ver a regra do ultimo administrador no PATCH.
 */
async function outrosAdminsAtivos(con, idUtilizadorExcluido) {
  const [[{ n }]] = await con.query(
    `SELECT COUNT(*) AS n
       FROM funcionario f
       JOIN utilizador u ON u.id_utilizador = f.id_utilizador
      WHERE u.ativo = 1
        AND f.cargo IN (?)
        AND u.id_utilizador <> ?`,
    [CARGOS_ADMIN, idUtilizadorExcluido]
  );
  return n;
}


// ─────────────────────────────────────────────────────────────────────
//  GET /api/gestao/funcionarios
//  Inclui os desativados — e a ve-los que se reativa um.
// ─────────────────────────────────────────────────────────────────────
router.get('/gestao/funcionarios',
  autenticar, exigirNivel('administrador'),
  async (_req, res, next) => {
    try {
      const [linhas] = await pool.query(`${SELECT_FUNCIONARIO} ORDER BY u.ativo DESC, u.nome`);
      res.json(linhas.map(formatar));
    } catch (erro) { next(erro); }
  });


// ─────────────────────────────────────────────────────────────────────
//  POST /api/gestao/funcionarios
// ─────────────────────────────────────────────────────────────────────
router.post('/gestao/funcionarios',
  autenticar, exigirNivel('administrador'), validar(esquemaCriar),
  async (req, res, next) => {
    const d = req.body;
    const con = await pool.getConnection();
    try {
      await con.beginTransaction();

      // A senha nunca chega a base: guarda-se so o hash.
      const hash = await bcrypt.hash(d.password, CUSTO_BCRYPT);

      const [r] = await con.query(
        `INSERT INTO utilizador
           (nome, email, password_hash, telefone, tipo_utilizador, ativo)
         VALUES (?, ?, ?, ?, 'funcionario', ?)`,
        [d.nome, d.email, hash, d.telefone, d.ativo ?? true]
      );

      const [r2] = await con.query(
        `INSERT INTO funcionario (id_utilizador, cargo, data_contratacao)
         VALUES (?, ?, ?)`,
        [r.insertId, d.cargo, d.data_contratacao ?? new Date().toISOString().slice(0, 10)]
      );

      const criado = await lerFuncionario(con, r2.insertId);
      await con.commit(); con.release();
      res.status(201).json(criado);
    } catch (erro) {
      try { await con.rollback(); } catch { /* ligacao ja perdida */ }
      try { con.release(); } catch { /* idem */ }
      if (erro.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ erro: 'Ja existe uma conta com esse email.' });
      }
      next(erro);
    }
  });


// ─────────────────────────────────────────────────────────────────────
//  PATCH /api/gestao/funcionarios/:id
//
//  NAO HA DELETE. Um funcionario esta agarrado ao historico de estados
//  dos pedidos (quem confirmou o que, e quando) e aos movimentos de
//  stock. Apagar a conta deixava esse historico sem dono. Quem sai da
//  casa fica `ativo = false`: perde o acesso na hora — o /auth/eu vai a
//  base a cada arranque da app — e o passado continua a fazer sentido.
// ─────────────────────────────────────────────────────────────────────
router.patch('/gestao/funcionarios/:id',
  autenticar, exigirNivel('administrador'), validar(esquemaEditar),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ erro: 'Funcionario invalido.' });
    }

    const d = req.body;
    const con = await pool.getConnection();
    try {
      await con.beginTransaction();

      const atual = await lerFuncionario(con, id);
      if (!atual) {
        await con.rollback(); con.release();
        return res.status(404).json({ erro: 'Esse funcionario nao existe.' });
      }

      /*
       *  A REGRA DO ULTIMO ADMINISTRADOR
       *
       *  Desativar o ultimo administrador — ou baixar-lhe o cargo —
       *  deixa a aplicacao de gestao sem ninguem que lhe possa entrar.
       *  Nao ha ecra nenhum para desfazer isso, porque o ecra que o
       *  desfazia e o que acabou de ficar inacessivel: a partir dai so
       *  se resolve por SQL a mao.
       *
       *  E o erro classico deste genero de tabela, e o mais provavel de
       *  todos e o mais simples: o unico administrador desativa-se a si
       *  proprio sem pensar. Custa uma consulta impedi-lo.
       *
       *  Repara que a conta que faz o pedido nao esta isenta. Ser quem
       *  manda nao muda o resultado: se ele e o ultimo, a porta fecha-se
       *  na mesma.
       */
      const vaiDesativar = d.ativo === false && atual.ativo;
      const vaiTirarAdmin = d.cargo !== undefined
        && NIVEL_POR_CARGO[atual.cargo] === 'administrador'
        && NIVEL_POR_CARGO[d.cargo] !== 'administrador';

      if ((vaiDesativar || vaiTirarAdmin) && NIVEL_POR_CARGO[atual.cargo] === 'administrador') {
        const restantes = await outrosAdminsAtivos(con, atual.idUtilizador);
        if (restantes === 0) {
          await con.rollback(); con.release();
          const proprio = atual.idUtilizador === req.utilizador.id;
          return res.status(409).json({
            erro: proprio
              ? 'Es o unico administrador ativo. Se te desativares, ninguem consegue '
                + 'entrar na aplicacao de gestao — nem tu.'
              : `"${atual.nome}" e o unico administrador ativo. Promove outra pessoa `
                + 'a administrador antes de o desativar.',
          });
        }
      }

      const partesU = [], valoresU = [];
      const juntarU = (col, val) => { partesU.push(`${col} = ?`); valoresU.push(val); };
      if (d.nome !== undefined)     juntarU('nome', d.nome);
      if (d.email !== undefined)    juntarU('email', d.email);
      if (d.telefone !== undefined) juntarU('telefone', d.telefone);
      if (d.ativo !== undefined)    juntarU('ativo', d.ativo);
      if (d.password !== undefined) {
        juntarU('password_hash', await bcrypt.hash(d.password, CUSTO_BCRYPT));
      }

      if (partesU.length) {
        valoresU.push(atual.idUtilizador);
        await con.query(
          `UPDATE utilizador SET ${partesU.join(', ')} WHERE id_utilizador = ?`, valoresU
        );
      }

      if (d.cargo !== undefined) {
        await con.query('UPDATE funcionario SET cargo = ? WHERE id_funcionario = ?', [d.cargo, id]);
      }

      const atualizado = await lerFuncionario(con, id);
      await con.commit(); con.release();
      res.json(atualizado);
    } catch (erro) {
      try { await con.rollback(); } catch { /* ligacao ja perdida */ }
      try { con.release(); } catch { /* idem */ }
      if (erro.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ erro: 'Ja existe uma conta com esse email.' });
      }
      next(erro);
    }
  });


module.exports = router;
