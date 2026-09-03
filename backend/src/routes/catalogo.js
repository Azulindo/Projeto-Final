/**
 * =====================================================================
 *  catalogo.js — Categorias e Produtos
 *
 *  GET /api/categorias            → as 4 categorias, pela ordem da ementa
 *  GET /api/produtos              → produtos ativos
 *  GET /api/produtos?categoria=   → filtrados por nome de categoria
 *
 *  Formato acordado no docs/API.md §4.2 (contrato do Guilherme).
 *  Endpoints publicos: nao exigem autenticacao, sao o menu.
 * =====================================================================
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/bd');

/*
 *  NOTA SOBRE FORMATOS
 *  -------------------
 *  Na base de dados as colunas sao snake_case (id_produto, imagem_url)
 *  e os booleanos vem como 1 / 0. A API devolve camelCase e true/false,
 *  que e o que o front-end espera.
 *
 *  A conversao e feita aqui, num sitio so. Assim o nome das colunas
 *  pode mudar sem partir o front-end, e o front-end nao precisa de
 *  saber como a base de dados esta organizada por dentro.
 */

/** Converte uma linha da base de dados no formato que a API expoe. */
function formatarProduto(linha) {
  return {
    id:         linha.id_produto,
    nome:       linha.nome,
    descricao:  linha.descricao,
    preco:      linha.preco,            // numero, nao texto (ver bd.js)
    categoria:  linha.categoria,        // o NOME, nao o id
    imagem:     linha.imagem_url,
    ativo:      Boolean(linha.ativo),
    disponivel: Boolean(linha.disponivel),
  };
}


// ─────────────────────────────────────────────────────────────────────
//  GET /api/categorias
//
//  Devolve as categorias ativas pela ordem em que devem aparecer na
//  ementa — entradas primeiro, sobremesas no fim. Sem o campo "ordem"
//  sairiam por ordem alfabetica e "Bebidas" vinha antes de "Entradas".
// ─────────────────────────────────────────────────────────────────────
router.get('/categorias', async (_req, res, next) => {
  try {
    const [linhas] = await pool.query(
      `SELECT id_categoria, nome, descricao, ordem
         FROM categoria
        WHERE ativo = 1
        ORDER BY ordem, nome`
    );

    res.json(linhas.map(c => ({
      id:        c.id_categoria,
      nome:      c.nome,
      descricao: c.descricao,
      ordem:     c.ordem,
    })));
  } catch (erro) { next(erro); }
});


// ─────────────────────────────────────────────────────────────────────
//  GET /api/produtos
//  GET /api/produtos?categoria=Bebidas
//
//  Devolve o catalogo que o cliente pode pedir.
// ─────────────────────────────────────────────────────────────────────
router.get('/produtos', async (req, res, next) => {
  try {
    const { categoria } = req.query;

    /*
     *  Tres condicoes para um produto aparecer:
     *
     *  1. p.ativo = 1        → nao foi retirado da ementa
     *  2. p.disponivel = 1   → nao esgotou hoje
     *  3. tem stock          → so se o produto controlar stock
     *
     *  A terceira e a regra 25 do CONTEXTO.md: um produto sem stock nao
     *  aparece. Repara na condicao — se controla_stock = 0 (um bife
     *  grelhado na hora, que nao se conta a unidade), passa sempre.
     */
    let sql = `
      SELECT p.id_produto, p.nome, p.descricao, p.preco, p.imagem_url,
             p.ativo, p.disponivel, c.nome AS categoria
        FROM produto p
        JOIN categoria c ON c.id_categoria = p.id_categoria
   LEFT JOIN stock s     ON s.id_produto   = p.id_produto
       WHERE p.ativo = 1
         AND p.disponivel = 1
         AND c.ativo = 1
         AND (p.controla_stock = 0 OR COALESCE(s.quantidade_atual, 0) > 0)`;

    const parametros = [];

    if (categoria) {
      sql += ' AND c.nome = ?';
      parametros.push(categoria);
      /*
       *  O "?" e obrigatorio, nunca juntar o valor a string do SQL.
       *  Se fizesse   ... AND c.nome = '${categoria}'   bastava alguem
       *  chamar  /api/produtos?categoria=' OR 1=1 --  para contornar o
       *  filtro. Com "?", o MySQL trata o valor como texto e nunca como
       *  comando. Chama-se injecao de SQL e e o erro mais antigo do
       *  livro.
       */
    }

    sql += ' ORDER BY c.ordem, p.nome';

    const [linhas] = await pool.query(sql, parametros);

    // Categoria pedida que nao existe: 404 em vez de lista vazia, para
    // o front-end distinguir "escreveste mal" de "nao ha nada aqui".
    if (categoria && linhas.length === 0) {
      const [[existe]] = await pool.query(
        'SELECT COUNT(*) AS n FROM categoria WHERE nome = ? AND ativo = 1',
        [categoria]
      );
      if (existe.n === 0) {
        return res.status(404).json({ erro: `Categoria "${categoria}" nao existe.` });
      }
    }

    res.json(linhas.map(formatarProduto));
  } catch (erro) { next(erro); }
});


// ─────────────────────────────────────────────────────────────────────
//  GET /api/produtos/:id
//  Um produto so. Util para confirmar o preco antes de gravar um item.
// ─────────────────────────────────────────────────────────────────────
router.get('/produtos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ erro: 'Id de produto invalido.' });
    }

    const [linhas] = await pool.query(
      `SELECT p.id_produto, p.nome, p.descricao, p.preco, p.imagem_url,
              p.ativo, p.disponivel, c.nome AS categoria
         FROM produto p
         JOIN categoria c ON c.id_categoria = p.id_categoria
        WHERE p.id_produto = ?`,
      [id]
    );

    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Produto nao encontrado.' });
    }

    res.json(formatarProduto(linhas[0]));
  } catch (erro) { next(erro); }
});


module.exports = router;
