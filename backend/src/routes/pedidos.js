/**
 * pedidos.js — Rotas do painel de funcionários/cozinha
 *
 * GET   /api/pedidos/ativos          → Todas as mesas com sessão ativa (painel geral)
 * GET   /api/pedidos/cozinha         → Itens PENDENTE e EM_PREPARACAO (ecrã da cozinha)
 * PATCH /api/pedidos/item/:id/estado → Atualizar estado de um item (cozinha)
 * POST  /api/pedidos/sessao/:id/fechar → Funcionário fecha a conta após pagamento
 */

const express = require('express');
const router  = express.Router();
const prisma  = require('../prisma');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pedidos/ativos
// Devolve todas as mesas com sessão ABERTA ou AGUARDA_PAGAMENTO.
// Usado no painel geral dos funcionários.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ativos', async (req, res, next) => {
  try {
    const sessoes = await prisma.sessaoMesa.findMany({
      where:   { estado: { in: ['ABERTA', 'AGUARDA_PAGAMENTO'] } },
      include: {
        mesa:  true,
        itens: { include: { produto: true }, orderBy: { criadoEm: 'asc' } },
      },
      orderBy: { abertaEm: 'asc' },
    });

    const resultado = sessoes.map(s => ({
      sessaoId:   s.id,
      estado:     s.estado,
      abertaEm:   s.abertaEm,
      mesa:       { id: s.mesa.id, numero: s.mesa.numero, lugares: s.mesa.lugares },
      numItens:   s.itens.reduce((a, i) => a + i.quantidade, 0),
      total:      s.itens.reduce((a, i) => a + Number(i.precoUnit) * i.quantidade, 0).toFixed(2),
      temPendentes: s.itens.some(i => i.estado === 'PENDENTE'),
    }));

    res.json(resultado);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pedidos/cozinha
// Itens PENDENTE e EM_PREPARACAO para o ecrã da cozinha.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cozinha', async (req, res, next) => {
  try {
    const itens = await prisma.itemPedido.findMany({
      where:   { estado: { in: ['PENDENTE', 'EM_PREPARACAO'] } },
      include: {
        produto: true,
        sessao:  { include: { mesa: true } },
      },
      orderBy: { criadoEm: 'asc' },
    });

    const resultado = itens.map(i => ({
      id:         i.id,
      estado:     i.estado,
      quantidade: i.quantidade,
      observacao: i.observacao,
      criadoEm:   i.criadoEm,
      produto:    { nome: i.produto.nome, categoria: i.produto.categoria },
      mesa:       { numero: i.sessao.mesa.numero, sessaoId: i.sessaoId },
    }));

    res.json(resultado);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/pedidos/item/:id/estado
// Cozinha atualiza o estado de um item.
// Body: { estado: "EM_PREPARACAO" | "PRONTO" | "SERVIDO" }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/item/:id/estado', async (req, res, next) => {
  try {
    const id     = Number(req.params.id);
    const { estado } = req.body;

    const estadosValidos = ['PENDENTE', 'EM_PREPARACAO', 'PRONTO', 'SERVIDO'];
    if (!estadosValidos.includes(estado))
      return res.status(400).json({ erro: `Estado inválido. Use: ${estadosValidos.join(', ')}` });

    const item = await prisma.itemPedido.update({
      where: { id },
      data:  { estado },
    });

    res.json({ mensagem: `Item #${id} → ${estado}`, item });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pedidos/sessao/:id/fechar
// Funcionário fecha a sessão após pagamento recebido.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sessao/:id/fechar', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const sessao = await prisma.sessaoMesa.findUnique({ where: { id } });
    if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada.' });
    if (sessao.estado === 'FECHADA')
      return res.status(409).json({ erro: 'Sessão já está fechada.' });

    const fechada = await prisma.sessaoMesa.update({
      where: { id },
      data:  { estado: 'FECHADA', fechadaEm: new Date() },
    });

    res.json({ mensagem: `Mesa fechada com sucesso! ✅`, sessao: fechada });
  } catch (err) { next(err); }
});

module.exports = router;
