/**
 * =====================================================================
 *  gestaoProdutos.js — Catalogo: criar e editar produtos (B-61)
 *
 *  GET   /api/gestao/produtos
 *  POST  /api/gestao/produtos
 *  PATCH /api/gestao/produtos/:id
 *
 *  Contrato acordado no docs/API.md, seccao 4.9.
 *  Nivel: administrador. So.
 *
 *  NAO HA DELETE, e e de proposito. Um produto que ja apareceu num
 *  pedido nao pode desaparecer sem levar o historico atras: a linha do
 *  item_pedido ficava a apontar para o nada e as estatisticas passavam
 *  a mentir. Quem sai da carta fica `ativo: false` — continua a
 *  existir para o passado e deixa de aparecer para o futuro.
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
 *  O QUE SE ACEITA
 *
 *  A `categoria` chega pelo NOME e nao pelo id, tal como sai no
 *  formatarProduto do catalogo. O front-end nunca precisa de saber
 *  numeros de categorias, e a traducao acontece num sitio so, aqui.
 * ----------------------------------------------------------------- */
const campos = {
  nome: z.string().trim()
    .min(2, 'O nome tem de ter pelo menos 2 caracteres.')
    .max(150, 'O nome nao pode passar dos 150 caracteres.'),
  descricao: z.string().trim().max(2000, 'Descricao demasiado longa.')
    .nullable().optional(),
  /*
   *  O preco arredonda a duas casas AQUI, no servidor.
   *
   *  Um preco com tres casas entra na base, sai arredondado noutro
   *  sitio qualquer, e as contas do restaurante deixam de fechar por
   *  cetimos que ninguem consegue explicar.
   */
  preco: z.number()
    .min(0, 'O preco nao pode ser negativo.')
    .max(9999, 'Preco demasiado alto.')
    .transform((v) => Math.round(v * 100) / 100),
  categoria: z.string().trim().min(1, 'Falta a categoria.').max(100),
  imagem: z.string().trim().max(255).nullable().optional(),
  ativo: z.boolean().optional(),
  disponivel: z.boolean().optional(),
  controla_stock: z.boolean().optional(),
  quantidade_minima: z.number().int().min(0).max(100000).optional(),
};

const esquemaCriar = z.object({
  ...campos,
  // So no POST. Ver a nota grande no PATCH.
  quantidade_atual: z.number().int().min(0).max(100000).optional(),
});

/*
 *  No PATCH valida-se so o que vier: um pedido que apenas desliga o
 *  `disponivel` nao tem de reenviar o nome e o preco.
 */
const esquemaEditar = z.object({
  nome: campos.nome.optional(),
  descricao: campos.descricao,
  preco: campos.preco.optional(),
  categoria: campos.categoria.optional(),
  imagem: campos.imagem,
  ativo: campos.ativo,
  disponivel: campos.disponivel,
  controla_stock: campos.controla_stock,
  quantidade_minima: campos.quantidade_minima,

});



/* -------------------------------------------------------------------
 *  A QUANTIDADE NAO SE MUDA NO PATCH DO PRODUTO. Fechado a 08/09.
 *
 *  Tem de ser verificado ANTES do validar: o zod devolve o objeto
 *  limpo, sem as chaves que nao conhece, e a essa altura ja nao se
 *  saberia que a quantidade_atual tinha vindo.
 *
 *  O Guilherme propos tratar um `quantidade_atual` que chegasse aqui
 *  como um acerto. E recusado, e a razao e o argumento dele levado ate
 *  ao fim:
 *
 *  As 20h03 o gerente abre o formulario e a caixa da quantidade traz
 *  20. As 20h05 a cozinha confirma duas rondas — saem 4. As 20h07 ele
 *  corrige o PRECO e grava. O formulario manda os 20 que trazia desde
 *  as 20h03, e isso apagaria os 4 que sairam — desta vez com data,
 *  carimbo e o nome dele, com ar de decisao.
 *
 *  Um erro invisivel e mau; um erro invisivel com ar de deliberado e
 *  pior. Um acerto tem de ser um ato com motivo, nunca um efeito
 *  secundario de mudar um preco.
 * ----------------------------------------------------------------- */
function recusarQuantidade(req, res, proximo) {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'quantidade_atual')) {
    return res.status(400).json({
      erro: 'A existencia nao se muda aqui. Usa o ecra de Stock.',
      onde: 'POST /api/gestao/stock/:id/movimento',
    });
  }
  proximo();
}

/* -------------------------------------------------------------------
 *  AJUDAS
 * ----------------------------------------------------------------- */

function formatarProdutoGestao(l) {
  const controla = Boolean(l.controla_stock);
  return {
    id:                l.id_produto,
    nome:              l.nome,
    descricao:         l.descricao || '',
    preco:             l.preco,
    categoria:         l.categoria,
    imagem:            l.imagem_url,
    ativo:             Boolean(l.ativo),
    disponivel:        Boolean(l.disponivel),
    controla_stock:    controla,
    // Sem controlo de stock nao ha quantidades: null e nao 0. Zero
    // diria "esgotado", e o que se quer dizer e "nunca acaba".
    quantidade_atual:  controla && l.quantidade_atual  != null ? Number(l.quantidade_atual)  : null,
    quantidade_minima: controla && l.quantidade_minima != null ? Number(l.quantidade_minima) : null,
  };
}

const SELECT_PRODUTO = `
  SELECT p.id_produto, p.nome, p.descricao, p.preco, p.imagem_url,
         p.ativo, p.disponivel, p.controla_stock,
         c.nome AS categoria,
         s.quantidade_atual, s.quantidade_minima
    FROM produto p
    JOIN categoria c ON c.id_categoria = p.id_categoria
    LEFT JOIN stock s ON s.id_produto  = p.id_produto`;

/** Nome de categoria -> id. Devolve null se nao existir. */
async function idDaCategoria(con, nome) {
  const [l] = await con.query(
    'SELECT id_categoria FROM categoria WHERE nome = ?', [nome]
  );
  return l.length ? l[0].id_categoria : null;
}

async function lerProduto(con, id) {
  const [l] = await con.query(`${SELECT_PRODUTO} WHERE p.id_produto = ?`, [id]);
  return l.length ? formatarProdutoGestao(l[0]) : null;
}


// ─────────────────────────────────────────────────────────────────────
//  GET /api/gestao/produtos
//
//  A vista de ADMINISTRACAO: mostra tudo, incluindo os inativos e os
//  que estao sem stock. E o contrario do GET /produtos, que e a vista
//  do cliente e os esconde (API.md 4.2) — e tem de ser, porque e a ver
//  os inativos que se reativa um produto.
// ─────────────────────────────────────────────────────────────────────
router.get('/gestao/produtos',
  autenticar, exigirNivel('administrador'),
  async (_req, res, next) => {
    try {
      const [linhas] = await pool.query(`${SELECT_PRODUTO} ORDER BY c.ordem, p.nome`);
      res.json(linhas.map(formatarProdutoGestao));
    } catch (erro) { next(erro); }
  });


// ─────────────────────────────────────────────────────────────────────
//  POST /api/gestao/produtos
// ─────────────────────────────────────────────────────────────────────
router.post('/gestao/produtos',
  autenticar, exigirNivel('administrador'), validar(esquemaCriar),
  async (req, res, next) => {
    const d = req.body;
    const con = await pool.getConnection();
    try {
      await con.beginTransaction();

      const idCategoria = await idDaCategoria(con, d.categoria);
      if (!idCategoria) {
        await con.rollback(); con.release();
        return res.status(400).json({ erro: `A categoria "${d.categoria}" nao existe.` });
      }

      const [r] = await con.query(
        `INSERT INTO produto
           (id_categoria, nome, descricao, preco, imagem_url,
            disponivel, controla_stock, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [idCategoria, d.nome, d.descricao ?? null, d.preco, d.imagem ?? null,
         d.disponivel ?? true, d.controla_stock ?? false, d.ativo ?? true]
      );
      const id = r.insertId;

      if (d.controla_stock) {
        await con.query(
          'INSERT INTO stock (id_produto, quantidade_atual, quantidade_minima) VALUES (?, 0, ?)',
          [id, d.quantidade_minima ?? 0]
        );

        /*
         *  A quantidade inicial entra como MOVIMENTO Nº 1, do tipo
         *  entrada — nao escrita direta na coluna.
         *
         *  Assim a cadeia antes/depois comeca sempre em 0 e nao ha
         *  nenhuma quantidade no sistema sem origem registada. Se a
         *  primeira linha do historico aparecesse ja com 40 caidos do
         *  ceu, a verificacao da cadeia nao tinha por onde comecar.
         *
         *  Este e o UNICO sitio onde a quantidade_atual e aceite num
         *  pedido de produto, e e seguro porque o produto nao existia
         *  um segundo antes: nao ha nada que ela possa apagar.
         */
        if (d.quantidade_atual) {
          await aplicarMovimento(con, {
            idProduto:    id,
            tipo:         'entrada',
            quantidade:   d.quantidade_atual,
            idUtilizador: req.utilizador.id,
            nota:         'Contagem inicial ao criar o produto',
          });
        }
      }

      const criado = await lerProduto(con, id);
      await con.commit(); con.release();
      res.status(201).json(criado);
    } catch (erro) {
      try { await con.rollback(); } catch { /* ligacao ja perdida */ }
      try { con.release(); } catch { /* idem */ }
      next(erro);
    }
  });


// ─────────────────────────────────────────────────────────────────────
//  PATCH /api/gestao/produtos/:id
// ─────────────────────────────────────────────────────────────────────
router.patch('/gestao/produtos/:id',
  autenticar, exigirNivel('administrador'), recusarQuantidade, validar(esquemaEditar),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ erro: 'Produto invalido.' });
    }

    const d = req.body;
    const con = await pool.getConnection();
    try {
      await con.beginTransaction();

      const [atualLinhas] = await con.query(
        'SELECT controla_stock FROM produto WHERE id_produto = ? FOR UPDATE', [id]
      );
      if (atualLinhas.length === 0) {
        await con.rollback(); con.release();
        return res.status(404).json({ erro: 'Esse produto nao existe.' });
      }
      const controlavaAntes = Boolean(atualLinhas[0].controla_stock);

      // Monta o UPDATE so com o que veio.
      const partes = [];
      const valores = [];
      const juntar = (coluna, valor) => { partes.push(`${coluna} = ?`); valores.push(valor); };

      if (d.nome !== undefined)           juntar('nome', d.nome);
      if (d.descricao !== undefined)      juntar('descricao', d.descricao);
      if (d.preco !== undefined)          juntar('preco', d.preco);
      if (d.imagem !== undefined)         juntar('imagem_url', d.imagem);
      if (d.ativo !== undefined)          juntar('ativo', d.ativo);
      if (d.disponivel !== undefined)     juntar('disponivel', d.disponivel);
      if (d.controla_stock !== undefined) juntar('controla_stock', d.controla_stock);

      if (d.categoria !== undefined) {
        const idCategoria = await idDaCategoria(con, d.categoria);
        if (!idCategoria) {
          await con.rollback(); con.release();
          return res.status(400).json({ erro: `A categoria "${d.categoria}" nao existe.` });
        }
        juntar('id_categoria', idCategoria);
      }

      if (partes.length) {
        valores.push(id);
        await con.query(
          `UPDATE produto SET ${partes.join(', ')} WHERE id_produto = ?`, valores
        );
      }

      /*
       *  So se mexe no stock quando o controla_stock MUDA de valor.
       *
       *  Armadilha apontada pelo Guilherme (API.md 4.9), e ja o mordeu
       *  a ele: reenviar `controla_stock: true` sem o alterar e o que
       *  qualquer formulario faz ao gravar. Se isso apagasse ou
       *  recriasse a linha de stock, mudar o preco punha o produto a
       *  zero — o mesmo cenario das 20h03 a entrar por outra porta.
       */
      if (d.controla_stock !== undefined && d.controla_stock !== controlavaAntes) {
        if (d.controla_stock) {
          // Passa a controlar: comeca em 0. A primeira contagem entra
          // como `entrada` no ecra de Stock, onde fica quem a fez.
          await con.query(
            `INSERT INTO stock (id_produto, quantidade_atual, quantidade_minima)
             VALUES (?, 0, ?)
             ON DUPLICATE KEY UPDATE quantidade_minima = VALUES(quantidade_minima)`,
            [id, d.quantidade_minima ?? 0]
          );
        }
        // Deixar de controlar NAO apaga a linha nem os movimentos: o
        // historico do que ja aconteceu nao se reescreve. O produto
        // passa a "nunca acaba" e as quantidades deixam de ser
        // mostradas (ver formatarProdutoGestao).
      } else if (d.quantidade_minima !== undefined && controlavaAntes) {
        await con.query(
          'UPDATE stock SET quantidade_minima = ? WHERE id_produto = ?',
          [d.quantidade_minima, id]
        );
      }

      const produto = await lerProduto(con, id);
      await con.commit(); con.release();
      res.json(produto);
    } catch (erro) {
      try { await con.rollback(); } catch { /* ligacao ja perdida */ }
      try { con.release(); } catch { /* idem */ }
      next(erro);
    }
  });


module.exports = router;
