/**
 * =====================================================================
 *  takeaway.js — encomendas para levar (B-35)
 *
 *  POST /api/pedidos/takeaway   → encomendar sem estar a mesa
 *  GET  /api/pedidos/takeaway/:numero → ver como esta a encomenda
 *
 *  SEM LOGIN, tal como o mesas.js: quem encomenda e um cliente com o
 *  telemovel na mao, nao tem conta nenhuma e nao vai criar uma para
 *  comprar um frango.
 *
 *  A diferenca para o pedido a mesa esta so no cabecalho. A mesa
 *  identifica-se pelo QR Code; aqui identifica-se pelo nome e pelo
 *  telefone de quem vem buscar — nao ha mesa nem sessao, e a conta
 *  fecha-se no balcao na hora de entregar.
 * =====================================================================
 */

const express = require('express');
const { z } = require('zod');
const { pool } = require('../config/bd');
const { validar } = require('../middleware/validar');
const { validarItens, criarPedido, lerItens } = require('../servicos/pedidos');

const router = express.Router();

const esquemaTakeAway = z.object({
  nome: z.string().trim()
    .min(2, 'Escreve o teu nome, para te chamarmos.')
    .max(120, 'Nome demasiado longo.'),

  /*
   *  O telefone e obrigatorio de proposito: e como se avisa que a
   *  encomenda esta pronta, e como se resolve quando alguem nao
   *  aparece. So digitos, espacos e o "+" do indicativo — nao se
   *  valida se o numero existe, isso e o telefonema que diz.
   */
  telefone: z.string().trim()
    .regex(/^[0-9+\s]{9,20}$/, 'Telefone invalido. Usa so numeros.'),

  email: z.string().trim().toLowerCase().email('Email invalido.').max(150)
    .nullish(),

  observacoes: z.string().trim().max(500, 'Observacoes demasiado longas.').nullish(),

  itens: z.array(z.object({
    produtoId:  z.coerce.number().int().positive(),
    quantidade: z.coerce.number().int().min(1).max(50).default(1),
    observacao: z.string().trim().max(300).nullish(),
  }))
  .min(1, 'A lista de itens esta vazia.')
  .max(50, 'Demasiados itens de uma vez.'),
});


// ─────────────────────────────────────────────────────────────────────
//  POST /api/pedidos/takeaway
// ─────────────────────────────────────────────────────────────────────
router.post('/pedidos/takeaway', validar(esquemaTakeAway), async (req, res, next) => {
  const con = await pool.getConnection();
  try {
    await con.beginTransaction();

    const d = req.body;

    const verificacao = await validarItens(con, d.itens);
    if (!verificacao.ok) {
      await con.rollback(); con.release();
      return res.status(400).json({ erro: verificacao.erro });
    }

    const { idPedido, numero, total } = await criarPedido(con, {
      tipo:              'take_away',
      itens:             d.itens,
      porId:             verificacao.porId,
      nomeConvidado:     d.nome,
      telefoneConvidado: d.telefone,
      emailConvidado:    d.email || null,
      observacoes:       d.observacoes || null,
    });

    const itens = await lerItens(con, idPedido);
    await con.commit();
    con.release();

    /*
     *  O stock NAO desce aqui. Desce quando a cozinha confirmar
     *  (B-58), tal como nos pedidos a mesa: descontar no "recebido"
     *  descontava coisas que a cozinha ainda pode recusar. A
     *  verificacao acima ja garantiu que havia stock no momento do
     *  pedido; se entretanto acabar, a cozinha ve o 409 ao confirmar.
     */
    res.status(201).json({
      mensagem: `Encomenda registada, ${d.nome.split(' ')[0]}! `
              + `Guarda o numero ${numero} — e por ele que te vamos chamar.`,
      pedido: {
        id:     idPedido,
        numero,
        estado: 'recebido',
        tipo:   'take_away',
        total,
        nome:   d.nome,
      },
      itens,
    });
  } catch (erro) {
    try { await con.rollback(); } catch { /* a ligacao ja pode estar perdida */ }
    try { con.release(); } catch { /* idem */ }
    next(erro);
  }
});


// ─────────────────────────────────────────────────────────────────────
//  GET /api/pedidos/takeaway/:numero
//
//  Para a pessoa poder ver se ja esta pronta sem ligar para o
//  restaurante. O numero da encomenda faz de credencial — e o mesmo
//  raciocinio do token do QR Code: nao ha login, ha uma coisa que so
//  quem encomendou tem.
//
//  Por isso a resposta NAO traz o telefone nem o email de quem
//  encomendou. Quem sabe o numero pode ver o estado da encomenda; nao
//  tem de poder ver os dados de contacto de ninguem.
// ─────────────────────────────────────────────────────────────────────
router.get('/pedidos/takeaway/:numero', async (req, res, next) => {
  try {
    const numero = String(req.params.numero || '').trim().toUpperCase();

    const [linhas] = await pool.query(
      `SELECT id_pedido, numero_pedido, estado, data_hora, valor_total,
              nome_convidado, observacoes
         FROM pedido
        WHERE numero_pedido = ? AND tipo_pedido = 'take_away'`,
      [numero]
    );

    const p = linhas[0];
    if (!p) return res.status(404).json({ erro: 'Nao ha nenhuma encomenda com esse numero.' });

    res.json({
      pedido: {
        id:          p.id_pedido,
        numero:      p.numero_pedido,
        estado:      p.estado,
        nome:        p.nome_convidado,
        total:       Number(p.valor_total),
        observacoes: p.observacoes,
        hora:        p.data_hora,
      },
      itens: await lerItens(pool, p.id_pedido),
    });
  } catch (erro) { next(erro); }
});


module.exports = router;
