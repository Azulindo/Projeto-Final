/**
 * =====================================================================
 *  pedidos.js — O lado da gestao (B-35, B-36)
 *
 *  GET   /api/pedidos/ativos            → mesas com refeicao a decorrer
 *  GET   /api/pedidos/cozinha           → rondas por fazer
 *  PATCH /api/pedidos/:id/estado        → avancar ou cancelar uma ronda
 *  POST  /api/pedidos/sessao/:id/fechar → fechar a mesa apos pagamento
 *
 *  Contrato: docs/API.md 3.6, 3.9, 3.10.1 e 3.10.2.
 *
 *  Ao contrario do mesas.js, TODOS estes exigem sessao iniciada. O
 *  `auth-guard.js` do front-end ja esconde o que cada nivel nao pode
 *  ver, mas esconder um ecra nao impede ninguem de chamar a API a
 *  direito — quem faz cumprir a regra e o `exigirNivel` daqui.
 * =====================================================================
 */

const express = require('express');
const { z } = require('zod');
const { pool } = require('../config/bd');
const { validar } = require('../middleware/validar');
const { autenticar, exigirNivel } = require('../middleware/autenticar');
const { aplicarMovimento } = require('../servicos/stock');

const router = express.Router();


/* -------------------------------------------------------------------
 *  PARA ONDE PODE IR CADA ESTADO
 *
 *      recebido → confirmado → em_preparacao → pronto → entregue
 *                          ↘ cancelado
 *
 *  Isto existe para responder ao problema que o Guilherme apontou no
 *  docs/API.md 3.8: a versao antiga aceitava qualquer mudanca,
 *  incluindo recuar de "entregue" para "recebido". Um prato entregue
 *  nao volta a estar por fazer, e deixar recuar estragava as
 *  estatisticas e o stock — cada passagem por "confirmado" desconta
 *  outra vez.
 *
 *  Cancelar deixa de ser possivel depois de entregue, pela mesma razao:
 *  a comida ja saiu.
 * ----------------------------------------------------------------- */
const TRANSICOES = {
  recebido:      ['confirmado', 'cancelado'],
  confirmado:    ['em_preparacao', 'cancelado'],
  em_preparacao: ['pronto', 'cancelado'],
  pronto:        ['entregue'],
  entregue:      [],
  cancelado:     [],
};

// Estados a partir dos quais o stock ja foi descontado. Serve para
// saber se, ao cancelar, ha alguma coisa para devolver.
const JA_DESCONTOU = ['confirmado', 'em_preparacao', 'pronto', 'entregue'];


// ─────────────────────────────────────────────────────────────────────
//  GET /api/pedidos/ativos               (B-35)
//
//  Uma linha por mesa com refeicao a decorrer. E o painel geral do
//  balcao: quantas mesas estao ocupadas, quanto ja consumiram, e quais
//  tem coisas por sair da cozinha.
// ─────────────────────────────────────────────────────────────────────
router.get('/pedidos/ativos',
  autenticar, exigirNivel('cozinha', 'balcao', 'administrador'),
  async (_req, res, next) => {
    try {
      /*
       *  `chamou_empregado_em` e a coluna que o "Chamar empregado" usa
       *  (docs/API.md 4.4). Se a base ainda nao a tem, a lista NAO pode
       *  falhar por causa disso: o balcao e a cozinha dependem dela. Cai
       *  para a mesma consulta sem a coluna.
       */
      const consulta = coluna => `SELECT s.id_sessao, s.estado, s.aberta_em, s.num_pessoas,
                ${coluna} AS chamou_empregado_em,
                m.id_mesa, m.numero_mesa, m.capacidade,
                v.total, v.num_itens,
                EXISTS (
                  SELECT 1 FROM pedido p
                   WHERE p.id_sessao = s.id_sessao
                     AND p.estado IN ('recebido','confirmado','em_preparacao')
                ) AS tem_pendentes
           FROM sessao_mesa s
           JOIN mesa m            ON m.id_mesa   = s.id_mesa
           JOIN vw_total_sessao v ON v.id_sessao = s.id_sessao
          WHERE s.estado IN ('aberta','aguarda_pagamento')
          ORDER BY s.aberta_em`;

      let linhas;
      try {
        [linhas] = await pool.query(consulta('s.chamou_empregado_em'));
      } catch (erro) {
        if (erro.code !== 'ER_BAD_FIELD_ERROR') throw erro;
        [linhas] = await pool.query(consulta('NULL'));
      }

      res.json(linhas.map(l => ({
        sessaoId:     l.id_sessao,
        estado:       l.estado,
        abertaEm:     l.aberta_em,
        numPessoas:   l.num_pessoas,
        mesa:         { id: l.id_mesa, numero: l.numero_mesa, lugares: l.capacidade },
        numItens:     Number(l.num_itens),
        total:        Number(l.total),
        temPendentes: Boolean(Number(l.tem_pendentes)),
        chamouEmpregado:   l.chamou_empregado_em != null,
        chamouEmpregadoEm: l.chamou_empregado_em || null,
      })));
    } catch (erro) { next(erro); }
  }
);


// ─────────────────────────────────────────────────────────────────────
//  GET /api/pedidos/cozinha              (B-35, formato do 3.10.1)
//
//  As rondas que a cozinha ainda tem em maos, da mais antiga para a
//  mais recente — a ordem em que devem ser feitas.
//
//  Inclui o estado `pronto`, e nao so os tres anteriores: o ecra da
//  cozinha tem QUATRO colunas (recebido, confirmado, em_preparacao,
//  pronto) e um prato pronto continua na cozinha ate alguem o levar.
//  Sem ele, a quarta coluna ficava vazia para sempre.
//
//  Ficam de fora `entregue` e `cancelado` — esses ja sairam da cozinha.
// ─────────────────────────────────────────────────────────────────────
router.get('/pedidos/cozinha',
  autenticar, exigirNivel('cozinha', 'balcao', 'administrador'),
  async (_req, res, next) => {
    try {
      const [rondas] = await pool.query(
        `SELECT p.id_pedido, p.numero_pedido, p.estado, p.data_hora,
                p.tipo_pedido, p.observacoes, p.valor_total,
                p.nome_convidado, p.telefone_convidado,
                m.numero_mesa, p.id_sessao
           FROM pedido p
      LEFT JOIN mesa m ON m.id_mesa = p.id_mesa
          WHERE p.estado IN ('recebido','confirmado','em_preparacao','pronto')
          ORDER BY p.data_hora`
      );

      if (rondas.length === 0) return res.json([]);

      /*
       *  Os itens de todas as rondas numa consulta so, e nao uma por
       *  ronda. Com 15 rondas ao almoco seriam 16 idas a base de dados
       *  em vez de 2 — e cada ida a Amesterdao custa uns 40 ms. O ecra
       *  da cozinha recarrega de 10 em 10 segundos, por isso isto
       *  repete-se 360 vezes por hora.
       */
      const [itens] = await pool.query(
        `SELECT i.id_item, i.id_pedido, i.quantidade, i.observacoes,
                pr.nome, c.nome AS categoria
           FROM item_pedido i
           JOIN produto  pr ON pr.id_produto  = i.id_produto
           JOIN categoria c ON c.id_categoria = pr.id_categoria
          WHERE i.id_pedido IN (?)
          ORDER BY c.ordem, i.id_item`,
        [rondas.map(r => r.id_pedido)]
      );

      const porRonda = new Map();
      for (const i of itens) {
        if (!porRonda.has(i.id_pedido)) porRonda.set(i.id_pedido, []);
        porRonda.get(i.id_pedido).push({
          id:         i.id_item,
          nome:       i.nome,
          categoria:  i.categoria,
          quantidade: i.quantidade,
          observacao: i.observacoes,
        });
      }

      res.json(rondas.map(r => {
        const base = {
          id:        r.id_pedido,
          numero:    r.numero_pedido,
          estado:    r.estado,
          criadoEm:  r.data_hora,
          tipo:      r.tipo_pedido === 'take_away' ? 'take_away' : 'mesa',
          observacao: r.observacoes,
          itens:     porRonda.get(r.id_pedido) || [],
        };

        // No take-away nao ha mesa nem sessao — ha uma pessoa a
        // espera ao balcao, e e o nome dela que interessa mostrar.
        if (r.tipo_pedido === 'take_away') {
          base.cliente = { nome: r.nome_convidado, telemovel: r.telefone_convidado };
          // O balcao cobra na entrega, por isso precisa do valor (05/11).
          base.total = Number(r.valor_total);
        } else {
          base.mesa = { numero: r.numero_mesa, sessaoId: r.id_sessao };
        }

        return base;
      }));
    } catch (erro) { next(erro); }
  }
);


/* -------------------------------------------------------------------
 *  A LINGUAGEM DA BASE DE DADOS
 *
 *  Minusculas, exatamente estes seis valores. Quem traduz para as
 *  pessoas ("a preparar", "pronto a servir") e a interface. Se a API
 *  tambem traduzisse, passavam a existir dois vocabularios e mais cedo
 *  ou mais tarde discordavam.
 * ----------------------------------------------------------------- */
const esquemaEstado = z.object({
  estado: z.enum(
    ['recebido', 'confirmado', 'em_preparacao', 'pronto', 'entregue', 'cancelado'],
    { message: 'Estado desconhecido.' }
  ),
});


// ─────────────────────────────────────────────────────────────────────
//  PATCH /api/pedidos/:id/estado         (B-36, contrato 3.10.2)
//
//  E aqui que a ronda anda para a frente — e onde o stock mexe.
// ─────────────────────────────────────────────────────────────────────
router.patch('/pedidos/:id/estado',
  autenticar, exigirNivel('cozinha', 'balcao', 'administrador'),
  validar(esquemaEstado),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ erro: 'Id de pedido invalido.' });
    }

    const novo = req.body.estado;
    const con = await pool.getConnection();

    try {
      await con.beginTransaction();

      /*
       *  FOR UPDATE tranca esta linha ate ao fim da transacao. Sem isso,
       *  a cozinha e o balcao podiam carregar no mesmo botao ao mesmo
       *  tempo, os dois liam "confirmado", os dois avancavam, e o stock
       *  descia a dobrar.
       */
      const [linhas] = await con.query(
        'SELECT id_pedido, numero_pedido, estado FROM pedido WHERE id_pedido = ? FOR UPDATE',
        [id]
      );

      const pedido = linhas[0];
      if (!pedido) {
        await con.rollback(); con.release();
        return res.status(404).json({ erro: 'Pedido nao encontrado.' });
      }

      // Repetir o estado atual nao e erro: dois toques no mesmo botao
      // devem dar o mesmo resultado que um.
      if (pedido.estado === novo) {
        await con.rollback(); con.release();
        return res.json({
          mensagem: `O pedido ${pedido.numero_pedido} ja estava em "${novo}".`,
          pedido: { id, numero: pedido.numero_pedido, estado: novo },
        });
      }

      const permitidos = TRANSICOES[pedido.estado] || [];
      if (!permitidos.includes(novo)) {
        await con.rollback(); con.release();
        return res.status(409).json({
          erro: `Um pedido em "${pedido.estado}" nao pode passar a "${novo}".`,
          permitidos,
        });
      }

      // ---- Stock ----
      if (novo === 'confirmado') {
        /*
         *  Desconta-se aqui, e nao quando o pedido chega. Se descontasse
         *  em "recebido", descontava coisas que a cozinha ainda vai
         *  recusar.
         *
         *  O `AND quantidade_atual >= i.quantidade` e a rede de
         *  seguranca: se entretanto o stock desceu, esta linha nao muda
         *  nada e apanhamos isso a seguir. Sem ele, o CHECK da tabela
         *  rebentava com um erro tecnico.
         */
        const [itens] = await con.query(
          `SELECT i.id_produto, i.quantidade, pr.nome, pr.controla_stock
             FROM item_pedido i
             JOIN produto pr ON pr.id_produto = i.id_produto
            WHERE i.id_pedido = ?`,
          [id]
        );

        for (const item of itens) {
          if (!item.controla_stock) continue;

          /*
           *  Desde o B-63 isto passa pelo aplicarMovimento em vez de um
           *  UPDATE aqui. A diferenca nao e de arrumacao: cada descida
           *  passa a deixar uma linha no movimento_stock, com o pedido
           *  que a causou e quem a confirmou.
           *
           *  Sem isso, a quantidade_atual era mexida por dois
           *  mecanismos e so um ficava registado — e o historico
           *  deixava de reconstruir o saldo, que e a unica coisa que o
           *  torna uma prova em vez de um diario incompleto.
           */
          const r = await aplicarMovimento(con, {
            idProduto:    item.id_produto,
            tipo:         'consumo',
            quantidade:   item.quantidade,
            idUtilizador: req.utilizador.id,
            idPedido:     id,
          });

          if (r.estado === 'insuficiente') {
            await con.rollback(); con.release();
            return res.status(409).json({
              erro: `Nao ha stock suficiente de "${item.nome}" para confirmar este pedido.`,
            });
          }
          // 'sem_linha' nao acontece aqui (o controla_stock ja filtrou),
          // mas se acontecesse era um produto sem existencias a
          // controlar — segue sem descontar nada.
        }
      }

      if (novo === 'cancelado' && JA_DESCONTOU.includes(pedido.estado)) {
        /*
         *  Devolve o que tinha sido descontado. Cancelar uma ronda que
         *  nunca chegou a "confirmado" nao devolve nada, porque nada
         *  tinha saido.
         *
         *  Era um UPDATE com JOIN, numa linha so. Passou a um ciclo de
         *  proposito: um UPDATE em massa nao consegue gravar o "antes"
         *  e o "depois" de cada produto, e sem esses dois numeros a
         *  cadeia do historico nao se aguenta.
         */
        const [itens] = await con.query(
          `SELECT i.id_produto, i.quantidade
             FROM item_pedido i
             JOIN produto pr ON pr.id_produto = i.id_produto
            WHERE i.id_pedido = ? AND pr.controla_stock = 1`,
          [id]
        );

        for (const item of itens) {
          await aplicarMovimento(con, {
            idProduto:    item.id_produto,
            tipo:         'reposicao',
            quantidade:   item.quantidade,
            idUtilizador: req.utilizador.id,
            idPedido:     id,
          });
        }
      }

      // ---- O estado, e o registo de que mudou ----
      await con.query('UPDATE pedido SET estado = ? WHERE id_pedido = ?', [novo, id]);

      /*
       *  Sem esta linha nao ha estatisticas nenhumas: o tempo medio de
       *  preparacao e a diferenca entre o registo "em_preparacao" e o
       *  registo "pronto" desta tabela. Se so guardassemos o estado
       *  atual, essa informacao perdia-se a cada mudanca.
       */
      await con.query(
        `INSERT INTO historico_estado_pedido (id_pedido, estado, id_funcionario)
         SELECT ?, ?, f.id_funcionario
           FROM funcionario f
          WHERE f.id_utilizador = ?`,
        [id, novo, req.utilizador.id]
      );

      await con.commit();
      con.release();

      res.json({
        mensagem: `Pedido ${pedido.numero_pedido} → ${novo}`,
        pedido: { id, numero: pedido.numero_pedido, estado: novo, anterior: pedido.estado },
      });
    } catch (erro) {
      try { await con.rollback(); } catch { /* ligacao ja perdida */ }
      con.release();
      next(erro);
    }
  }
);


// ─────────────────────────────────────────────────────────────────────
//  POST /api/pedidos/sessao/:id/fechar   (B-36)
//
//  O funcionario recebeu o pagamento e fecha a mesa.
// ─────────────────────────────────────────────────────────────────────
router.post('/pedidos/sessao/:id/fechar',
  autenticar, exigirNivel('balcao', 'administrador'),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ erro: 'Id de sessao invalido.' });
    }

    const con = await pool.getConnection();

    try {
      await con.beginTransaction();

      const [linhas] = await con.query(
        `SELECT s.id_sessao, s.estado, s.id_mesa, v.total
           FROM sessao_mesa s
           JOIN vw_total_sessao v ON v.id_sessao = s.id_sessao
          WHERE s.id_sessao = ?
            FOR UPDATE`,
        [id]
      );

      const sessao = linhas[0];
      if (!sessao) {
        await con.rollback(); con.release();
        return res.status(404).json({ erro: 'Sessao nao encontrada.' });
      }
      if (sessao.estado === 'fechada') {
        await con.rollback(); con.release();
        return res.status(409).json({ erro: 'Esta sessao ja estava fechada.' });
      }

      // Ha rondas por servir? Fechar a mesa com comida na cozinha e
      // quase sempre engano — avisa-se, mas nao se proibe, porque o
      // empregado pode estar a fechar uma mesa que desistiu.
      const [[{ porServir }]] = await con.query(
        `SELECT COUNT(*) AS porServir
           FROM pedido
          WHERE id_sessao = ?
            AND estado IN ('recebido','confirmado','em_preparacao','pronto')`,
        [id]
      );

      /*
       *  O total fica GRAVADO aqui. Enquanto a sessao esta aberta e
       *  calculado na hora pela vista; ao fechar, congela. Se amanha
       *  subirem o preco da picanha, a conta de hoje continua a dizer o
       *  que a pessoa pagou.
       */
      const [r] = await con.query(
        `UPDATE sessao_mesa
            SET estado = 'fechada', fechada_em = NOW(), valor_total = ?,
                id_funcionario = (SELECT id_funcionario FROM funcionario
                                   WHERE id_utilizador = ?)
          WHERE id_sessao = ? AND estado <> 'fechada'`,
        [Number(sessao.total), req.utilizador.id, id]
      );

      if (r.affectedRows === 0) {
        await con.rollback(); con.release();
        return res.status(409).json({ erro: 'Esta sessao ja estava fechada.' });
      }

      await con.query(
        `UPDATE mesa SET estado = 'livre' WHERE id_mesa = ?`,
        [sessao.id_mesa]
      );

      await con.commit();
      con.release();

      res.json({
        mensagem: 'Mesa fechada com sucesso.',
        sessao: {
          id,
          estado: 'fechada',
          total: Number(sessao.total),
          ...(porServir > 0 && {
            aviso: `Atencao: esta mesa tinha ${porServir} ronda(s) por servir.`,
          }),
        },
      });
    } catch (erro) {
      try { await con.rollback(); } catch { /* ligacao ja perdida */ }
      con.release();
      next(erro);
    }
  }
);


module.exports = router;
