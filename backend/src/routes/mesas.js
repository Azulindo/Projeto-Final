/**
 * mesas.js — Rotas de Mesas e Sessões
 *
 * GET  /api/mesas/:token/sessao      → Verifica/abre sessão (chamado pelo QR Code)
 * GET  /api/mesas/:token/conta       → Consulta conta completa da mesa
 * POST /api/mesas/:token/pedir       → Adiciona itens à sessão ativa
 * POST /api/mesas/:token/pedir-conta → Cliente pede a conta
 */

const express = require('express');
const router  = express.Router();
const prisma  = require('../prisma');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mesas/:token/sessao
// Chamado quando o cliente lê o QR Code.
// Devolve sessão ABERTA existente ou cria uma nova.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:token/sessao', async (req, res, next) => {
  try {
    const { token } = req.params;

    // 1 — Encontrar a mesa pelo token único
    const mesa = await prisma.mesa.findUnique({ where: { qrToken: token } });
    if (!mesa)       return res.status(404).json({ erro: 'QR Code inválido.' });
    if (!mesa.ativa) return res.status(403).json({ erro: 'Mesa desativada.' });

    // 2 — Verificar se existe sessão ABERTA
    let sessao = await prisma.sessaoMesa.findFirst({
      where: { mesaId: mesa.id, estado: 'ABERTA' },
      include: { itens: { include: { produto: true }, orderBy: { criadoEm: 'asc' } } },
    });

    // 3 — Criar nova sessão se não existir
    if (!sessao) {
      sessao = await prisma.sessaoMesa.create({
        data: { mesaId: mesa.id, estado: 'ABERTA' },
        include: { itens: { include: { produto: true } } },
      });
      console.log(`✅ Nova sessão — Mesa ${mesa.numero} (Sessão #${sessao.id})`);
    } else {
      console.log(`🔄 Sessão ativa — Mesa ${mesa.numero} (Sessão #${sessao.id})`);
    }

    res.json({
      mesa:  { id: mesa.id, numero: mesa.numero, lugares: mesa.lugares },
      sessao: {
        id:       sessao.id,
        estado:   sessao.estado,
        abertaEm: sessao.abertaEm,
        itens:    sessao.itens,
        total:    calcularTotal(sessao.itens),
      },
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mesas/:token/pedir
// Adiciona itens à sessão ativa.
// Body: { itens: [{ produtoId, quantidade, observacao? }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:token/pedir', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { itens } = req.body;

    if (!Array.isArray(itens) || itens.length === 0)
      return res.status(400).json({ erro: 'Envia pelo menos um item.' });

    const mesa = await prisma.mesa.findUnique({ where: { qrToken: token } });
    if (!mesa) return res.status(404).json({ erro: 'Mesa não encontrada.' });

    const sessao = await prisma.sessaoMesa.findFirst({
      where: { mesaId: mesa.id, estado: 'ABERTA' },
    });
    if (!sessao) return res.status(409).json({ erro: 'Sem sessão ativa. Refresca a página.' });

    // Criar cada item com o preço atual do produto (histórico)
    const criados = await Promise.all(
      itens.map(async ({ produtoId, quantidade = 1, observacao }) => {
        const produto = await prisma.produto.findUnique({ where: { id: Number(produtoId) } });
        if (!produto || !produto.ativo)
          throw new Error(`Produto #${produtoId} não disponível.`);

        return prisma.itemPedido.create({
          data: {
            sessaoId:  sessao.id,
            produtoId: produto.id,
            quantidade: Number(quantidade),
            precoUnit:  produto.preco,
            observacao: observacao || null,
            estado:    'PENDENTE',
          },
          include: { produto: true },
        });
      })
    );

    res.status(201).json({
      mensagem: `${criados.length} item(ns) adicionado(s)!`,
      itens: criados,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mesas/:token/conta
// Devolve a conta completa da sessão ativa agrupada por categoria.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:token/conta', async (req, res, next) => {
  try {
    const { token } = req.params;

    const mesa = await prisma.mesa.findUnique({ where: { qrToken: token } });
    if (!mesa) return res.status(404).json({ erro: 'Mesa não encontrada.' });

    const sessao = await prisma.sessaoMesa.findFirst({
      where: { mesaId: mesa.id, estado: { in: ['ABERTA', 'AGUARDA_PAGAMENTO'] } },
      include: { itens: { include: { produto: true }, orderBy: { criadoEm: 'asc' } } },
    });
    if (!sessao) return res.status(404).json({ erro: 'Sem sessão ativa.' });

    // Agrupar por categoria
    const porCategoria = {};
    sessao.itens.forEach(item => {
      const cat = item.produto.categoria;
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push({
        id:         item.id,
        nome:       item.produto.nome,
        quantidade: item.quantidade,
        precoUnit:  Number(item.precoUnit),
        subtotal:   Number(item.precoUnit) * item.quantidade,
        estado:     item.estado,
        observacao: item.observacao,
        criadoEm:   item.criadoEm,
      });
    });

    res.json({
      mesa:        { numero: mesa.numero },
      sessao:      { id: sessao.id, estado: sessao.estado, abertaEm: sessao.abertaEm },
      porCategoria,
      total:       calcularTotal(sessao.itens),
      numItens:    sessao.itens.reduce((a, i) => a + i.quantidade, 0),
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mesas/:token/pedir-conta
// Cliente pede a conta → estado muda para AGUARDA_PAGAMENTO.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:token/pedir-conta', async (req, res, next) => {
  try {
    const { token } = req.params;

    const mesa = await prisma.mesa.findUnique({ where: { qrToken: token } });
    if (!mesa) return res.status(404).json({ erro: 'Mesa não encontrada.' });

    const sessao = await prisma.sessaoMesa.findFirst({
      where: { mesaId: mesa.id, estado: 'ABERTA' },
    });
    if (!sessao) return res.status(409).json({ erro: 'Sessão não está aberta.' });

    await prisma.sessaoMesa.update({
      where: { id: sessao.id },
      data:  { estado: 'AGUARDA_PAGAMENTO' },
    });

    res.json({ mensagem: 'Conta pedida! Um empregado irá ter consigo em breve. 🧾' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Utilitário interno
// ─────────────────────────────────────────────────────────────────────────────
function calcularTotal(itens) {
  return itens
    .reduce((acc, item) => acc + Number(item.precoUnit) * item.quantidade, 0)
    .toFixed(2);
}

module.exports = router;
