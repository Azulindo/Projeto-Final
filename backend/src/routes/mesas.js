/**
 * =====================================================================
 *  mesas.js — O lado do cliente (B-31 a B-34)
 *
 *  GET  /api/mesas/:token/sessao       → abre ou devolve a sessao da mesa
 *  POST /api/mesas/:token/pedir        → envia uma ronda para a cozinha
 *  GET  /api/mesas/:token/conta        → a conta, agrupada por categoria
 *  POST /api/mesas/:token/pedir-conta  → o cliente pede a conta
 *
 *  Contrato: docs/API.md, seccoes 3.2 a 3.5 e 3.10.
 *
 *  Estes quatro endpoints NAO exigem login, e e de proposito: o cliente
 *  nao tem conta nenhuma. Quem faz de credencial e o token do QR Code,
 *  que e um valor aleatorio impresso no cartao da mesa. Quem esta
 *  sentado na mesa 4 tem o token da mesa 4 e mais nenhum.
 * =====================================================================
 */

const express = require('express');
const { z } = require('zod');
const { pool } = require('../config/bd');
const { validar } = require('../middleware/validar');
const { gerarCodigo, validarItens, criarPedido, lerItens } = require('../servicos/pedidos');

const router = express.Router();


/* -------------------------------------------------------------------
 *  CODIGOS LEGIVEIS
 *
 *  O numero da ronda e para ser lido em voz alta no balcao e visto de
 *  longe num ecra, por isso o alfabeto nao tem I, O, 0 nem 1 — sao os
 *  pares que toda a gente confunde. Ficam 32 simbolos e 5 posicoes, ou
 *  seja ~33 milhoes de combinacoes: de sobra para nunca haver dois
 *  iguais num servico.
 * ----------------------------------------------------------------- */
/* O gerador de codigos e a criacao de encomendas passaram para
   servicos/pedidos.js quando o take away (B-35) precisou dos mesmos:
   copiar oitenta linhas era garantir que as duas versoes iam
   divergir a primeira vez que se corrigisse uma regra num lado so. */


/* -------------------------------------------------------------------
 *  AJUDANTES
 * ----------------------------------------------------------------- */

/** Procura a mesa pelo token do QR Code. */
async function procurarMesa(executor, token) {
  const [linhas] = await executor.query(
    'SELECT id_mesa, numero_mesa, capacidade, ativo FROM mesa WHERE qr_code = ?',
    [token]
  );
  return linhas[0] || null;
}

/**
 * A sessao em curso daquela mesa, se existir.
 *
 * Conta como "em curso" tanto a `aberta` como a `aguarda_pagamento`:
 * se o cliente ja pediu a conta e volta a ler o QR Code, tem de ver a
 * mesma refeicao, nao comecar outra do zero.
 */
async function sessaoEmCurso(executor, idMesa) {
  const [linhas] = await executor.query(
    `SELECT id_sessao, codigo_sessao, estado, aberta_em
       FROM sessao_mesa
      WHERE id_mesa = ? AND estado IN ('aberta', 'aguarda_pagamento')
      LIMIT 1`,
    [idMesa]
  );
  return linhas[0] || null;
}

/**
 * O total da sessao, lido da vista `vw_total_sessao`.
 *
 * Nao se soma aqui a mao de proposito. A vista e o unico sitio onde a
 * soma existe — este endpoint, a conta, o painel do balcao e as
 * estatisticas leem todos dali. Assim nao e que "os numeros coincidem":
 * e que sao literalmente o mesmo numero.
 */
async function totalDaSessao(executor, idSessao) {
  const [linhas] = await executor.query(
    'SELECT total, num_itens, rondas FROM vw_total_sessao WHERE id_sessao = ?',
    [idSessao]
  );
  const v = linhas[0] || { total: 0, num_itens: 0, rondas: 0 };
  return { total: Number(v.total), numItens: Number(v.num_itens), rondas: Number(v.rondas) };
}

/**
 * Os itens de uma sessao, com o produto e com o estado da RONDA a que
 * pertencem (docs/API.md 3.10.3).
 *
 * Rondas canceladas ficam de fora — nao existem para o cliente nem
 * para a conta.
 */
async function itensDaSessao(executor, idSessao) {
  const [linhas] = await executor.query(
    `SELECT i.id_item, i.quantidade, i.preco_unitario, i.subtotal, i.observacoes,
            p.id_pedido, p.estado AS estado_ronda, p.data_hora,
            pr.id_produto, pr.nome, pr.descricao, pr.preco, pr.ativo,
            c.nome AS categoria
       FROM item_pedido i
       JOIN pedido   p  ON p.id_pedido    = i.id_pedido
       JOIN produto  pr ON pr.id_produto  = i.id_produto
       JOIN categoria c ON c.id_categoria = pr.id_categoria
      WHERE p.id_sessao = ? AND p.estado <> 'cancelado'
      ORDER BY p.data_hora, i.id_item`,
    [idSessao]
  );

  return linhas.map(l => ({
    id:         l.id_item,
    sessaoId:   idSessao,
    pedidoId:   l.id_pedido,
    produtoId:  l.id_produto,
    quantidade: l.quantidade,
    precoUnit:  Number(l.preco_unitario),
    subtotal:   Number(l.subtotal),
    observacao: l.observacoes,
    estado:     l.estado_ronda,
    criadoEm:   l.data_hora,
    produto: {
      id:        l.id_produto,
      nome:      l.nome,
      descricao: l.descricao,
      preco:     Number(l.preco),
      categoria: l.categoria,
      ativo:     Boolean(l.ativo),
    },
  }));
}


// ─────────────────────────────────────────────────────────────────────
//  GET /api/mesas/:token/sessao          (B-31)
//
//  Chamado quando o cliente le o QR Code. Se a mesa ja tem uma refeicao
//  a decorrer, devolve-a; se nao tem, abre uma.
// ─────────────────────────────────────────────────────────────────────
router.get('/mesas/:token/sessao', async (req, res, next) => {
  try {
    const mesa = await procurarMesa(pool, req.params.token);
    if (!mesa)      return res.status(404).json({ erro: 'QR Code invalido.' });
    if (!mesa.ativo) return res.status(403).json({ erro: 'Mesa desativada.' });

    let sessao = await sessaoEmCurso(pool, mesa.id_mesa);

    if (!sessao) {
      /*
       *  Duas pessoas na mesma mesa podem ler o QR Code ao mesmo tempo,
       *  e sem cuidado abriam duas sessoes. Nao ha aqui verificacao
       *  nenhuma a proteger contra isso, e nao precisa de haver: a
       *  coluna virtual `mesa_aberta` com o UNIQUE em cima faz o MySQL
       *  recusar a segunda. Apanhamos o erro e devolvemos a que ficou.
       *
       *  E melhor assim do que verificar em codigo: entre o "ja existe?"
       *  e o INSERT ha sempre um intervalo, e e nesse intervalo que o
       *  problema acontece. A base de dados nao tem esse intervalo.
       */
      try {
        const [r] = await pool.query(
          `INSERT INTO sessao_mesa (codigo_sessao, id_mesa, estado)
           VALUES (?, ?, 'aberta')`,
          [gerarCodigo('SES'), mesa.id_mesa]
        );
        await pool.query(
          `UPDATE mesa SET estado = 'ocupada' WHERE id_mesa = ?`,
          [mesa.id_mesa]
        );
        sessao = {
          id_sessao: r.insertId,
          estado: 'aberta',
          aberta_em: new Date(),
        };
      } catch (erro) {
        if (erro.code !== 'ER_DUP_ENTRY') throw erro;
        sessao = await sessaoEmCurso(pool, mesa.id_mesa);
      }
    }

    const [itens, totais] = await Promise.all([
      itensDaSessao(pool, sessao.id_sessao),
      totalDaSessao(pool, sessao.id_sessao),
    ]);

    res.json({
      mesa: {
        id:      mesa.id_mesa,
        numero:  mesa.numero_mesa,
        lugares: mesa.capacidade,
      },
      sessao: {
        id:       sessao.id_sessao,
        estado:   sessao.estado,
        abertaEm: sessao.aberta_em,
        itens,
        total:    totais.total,
      },
    });
  } catch (erro) { next(erro); }
});


/* -------------------------------------------------------------------
 *  O QUE O "PEDIR" ACEITA
 *
 *  Repara no que NAO esta aqui: o preco. O cliente manda o id do
 *  produto e a quantidade, e o preco vai a base de dados. Se o preco
 *  viesse do browser, bastava alguem alterar o pedido antes de o enviar
 *  para comer um borrego por 1 cent.
 * ----------------------------------------------------------------- */
const esquemaPedir = z.object({
  itens: z.array(z.object({
    produtoId:  z.coerce.number().int().positive(),
    quantidade: z.coerce.number().int().min(1).max(50).default(1),
    observacao: z.string().trim().max(300).nullish(),
  }))
  .min(1, 'A lista de itens esta vazia.')
  .max(50, 'Demasiados itens de uma vez.'),
});


// ─────────────────────────────────────────────────────────────────────
//  POST /api/mesas/:token/pedir          (B-32)
//
//  Cria uma RONDA: um pedido com os itens desta vez. E a ronda que anda
//  pelos estados, nao cada item (docs/API.md 3.10).
// ─────────────────────────────────────────────────────────────────────
router.post('/mesas/:token/pedir', validar(esquemaPedir), async (req, res, next) => {
  /*
   *  Aqui e preciso uma LIGACAO propria e uma transacao, porque isto
   *  sao varias escritas que so fazem sentido juntas: o pedido, os
   *  itens, o historico e o total. Se a terceira falhasse, as duas
   *  primeiras ficavam gravadas e a mesa ficava com meia ronda.
   *
   *  Com a transacao, ou entra tudo ou nao entra nada.
   */
  const con = await pool.getConnection();

  try {
    const mesa = await procurarMesa(con, req.params.token);
    if (!mesa)       { con.release(); return res.status(404).json({ erro: 'QR Code invalido.' }); }
    if (!mesa.ativo) { con.release(); return res.status(403).json({ erro: 'Mesa desativada.' }); }

    const sessao = await sessaoEmCurso(con, mesa.id_mesa);
    if (!sessao) {
      con.release();
      return res.status(409).json({ erro: 'Esta mesa nao tem nenhuma sessao aberta.' });
    }
    if (sessao.estado !== 'aberta') {
      con.release();
      return res.status(409).json({
        erro: 'A conta ja foi pedida. Chama um empregado para pedir mais alguma coisa.',
      });
    }

    await con.beginTransaction();

    // ---- 1. Os produtos, validados antes de se gravar nada ----
    const verificacao = await validarItens(con, req.body.itens);
    if (!verificacao.ok) {
      await con.rollback(); con.release();
      return res.status(400).json({ erro: verificacao.erro });
    }

    // ---- 2. A ronda: pedido + itens + total + historico ----
    const { idPedido, numero } = await criarPedido(con, {
      tipo:     'restaurante',
      itens:    req.body.itens,
      porId:    verificacao.porId,
      idMesa:   mesa.id_mesa,
      idSessao: sessao.id_sessao,
    });

    await con.commit();

    // ---- 3. Resposta ----
    const itensGravados = await lerItens(con, idPedido);

    con.release();

    const n = req.body.itens.reduce((s, i) => s + i.quantidade, 0);

    res.status(201).json({
      mensagem: `${n} item(ns) adicionado(s)!`,
      pedido: { id: idPedido, numero },
      itens: itensGravados,
    });
  } catch (erro) {
    try { await con.rollback(); } catch { /* a ligacao ja pode estar perdida */ }
    con.release();
    next(erro);
  }
});


// ─────────────────────────────────────────────────────────────────────
//  GET /api/mesas/:token/conta           (B-33)
//
//  A mesma informacao da sessao, mas arrumada por categoria — que e
//  como uma conta de restaurante se le.
// ─────────────────────────────────────────────────────────────────────
router.get('/mesas/:token/conta', async (req, res, next) => {
  try {
    const mesa = await procurarMesa(pool, req.params.token);
    if (!mesa) return res.status(404).json({ erro: 'QR Code invalido.' });

    const sessao = await sessaoEmCurso(pool, mesa.id_mesa);
    if (!sessao) {
      return res.status(404).json({ erro: 'Esta mesa nao tem nenhuma conta aberta.' });
    }

    const [itens, totais] = await Promise.all([
      itensDaSessao(pool, sessao.id_sessao),
      totalDaSessao(pool, sessao.id_sessao),
    ]);

    const porCategoria = {};
    for (const i of itens) {
      (porCategoria[i.produto.categoria] ||= []).push({
        id:         i.id,
        nome:       i.produto.nome,
        quantidade: i.quantidade,
        precoUnit:  i.precoUnit,
        subtotal:   i.subtotal,
        estado:     i.estado,
        observacao: i.observacao,
        criadoEm:   i.criadoEm,
      });
    }

    res.json({
      mesa:   { numero: mesa.numero_mesa },
      sessao: { id: sessao.id_sessao, estado: sessao.estado, abertaEm: sessao.aberta_em },
      porCategoria,
      total:    totais.total,
      numItens: totais.numItens,
    });
  } catch (erro) { next(erro); }
});


// ─────────────────────────────────────────────────────────────────────
//  POST /api/mesas/:token/pedir-conta    (B-34)
//
//  A sessao passa a `aguarda_pagamento`. A partir daqui a mesa nao
//  aceita mais pedidos pelo telemovel — quem quiser mais alguma coisa
//  chama um empregado, que e como funciona num restaurante.
// ─────────────────────────────────────────────────────────────────────
router.post('/mesas/:token/pedir-conta', async (req, res, next) => {
  try {
    const mesa = await procurarMesa(pool, req.params.token);
    if (!mesa) return res.status(404).json({ erro: 'QR Code invalido.' });

    /*
     *  A condicao `estado = 'aberta'` esta dentro do UPDATE, e nao numa
     *  verificacao antes dele, de proposito: se o cliente carregar duas
     *  vezes no botao, a segunda nao encontra nenhuma linha para mudar
     *  e o affectedRows vem a zero. Sem isto, entre o "esta aberta?" e
     *  o UPDATE cabe um segundo clique.
     */
    const [r] = await pool.query(
      `UPDATE sessao_mesa
          SET estado = 'aguarda_pagamento'
        WHERE id_mesa = ? AND estado = 'aberta'`,
      [mesa.id_mesa]
    );

    if (r.affectedRows === 0) {
      const sessao = await sessaoEmCurso(pool, mesa.id_mesa);
      if (sessao && sessao.estado === 'aguarda_pagamento') {
        return res.json({ mensagem: 'A conta ja tinha sido pedida. Um empregado vem a caminho.' });
      }
      return res.status(409).json({ erro: 'Esta mesa nao tem nenhuma conta aberta.' });
    }

    res.json({ mensagem: 'Conta pedida! Um empregado ira ter consigo em breve.' });
  } catch (erro) { next(erro); }
});


module.exports = router;
