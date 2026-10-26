/**
 * =====================================================================
 *  gestaoStock.js — Stock: ler e ajustar (B-63)
 *
 *  GET   /api/gestao/stock
 *  POST  /api/gestao/stock/:produtoId/movimento
 *  PATCH /api/gestao/stock/:produtoId/minimo
 *
 *  Contrato acordado no docs/API.md, seccao 4.8.
 *
 *  Niveis: LER — administrador, cozinha e balcao.
 *          ESCREVER (movimentos e minimo) — administrador e cozinha.
 *
 *  Este cabecalho dizia "administrador e cozinha. O balcao nao entra"
 *  e ficou assim DEPOIS de a linha 52 deste mesmo ficheiro passar a
 *  deixar o balcao ler (X-21). Durante umas horas o ficheiro afirmou
 *  as duas coisas, e quem o lesse de cima acreditava na errada.
 *
 *  E a mesma forma de tudo o que este projeto tem apanhado: duas
 *  copias da mesma regra, uma corrigida e a outra nao. Aqui foi dentro
 *  do mesmo ficheiro, a 42 linhas de distancia. Encontrado pelo
 *  Guilherme a 26/10, a confirmar o X-21 — e nenhum teste podia
 *  apanha-lo, porque um comentario errado nao da erro nenhum.
 * =====================================================================
 */

const express = require('express');
const { z } = require('zod');
const { pool } = require('../config/bd');
const { validar } = require('../middleware/validar');
const { autenticar, exigirNivel } = require('../middleware/autenticar');
const {
  TIPOS_DO_SERVIDOR,
  aplicarMovimento,
  lerLinhaStock,
  formatarLinha,
} = require('../servicos/stock');

const router = express.Router();

// Quem chega a estes ecras. Escrito uma vez, usado nas tres rotas.
/*
 *  LER e ESCREVER deixaram de ter a mesma lista (X-21, 11/09).
 *
 *  Era uma so, ['administrador', 'cozinha'], e isso deixava o aviso de
 *  stock baixo nas reservas a funcionar apenas para o administrador:
 *  o GET /gestao/reservas aceita administrador e balcao, o stock
 *  aceitava administrador e cozinha, e a interseccao das duas listas e
 *  uma pessoa so. Um balcao via a tabela de reservas e levava 403 ao ir
 *  buscar as existencias para saber que pratos avisar.
 *
 *  O balcao entra na LEITURA pelo criterio de sempre — a necessidade:
 *  e quem atende o telefone e quem liga ao cliente a dizer que um
 *  prato esta a acabar. Recusar-lhe a leitura era recusar-lhe a razao
 *  de ser do aviso.
 *
 *  E NAO entra na escrita. Quem conta o que ha em armazem e quem esta
 *  no armazem; quem regista uma quebra e quem a viu partir-se. O
 *  balcao nao esta nem viu.
 *
 *  Encontrado pelo Guilherme ao construir a F-61 — e so se ve quando
 *  se cruzam dois endpoints que foram desenhados em dias diferentes,
 *  cada um com a sua lista escrita com bom criterio.
 */
const NIVEIS_LEITURA = ['administrador', 'cozinha', 'balcao'];
const NIVEIS_ESCRITA = ['administrador', 'cozinha'];


/* -------------------------------------------------------------------
 *  O QUE UM MOVIMENTO ACEITA
 *
 *  So os tres tipos que uma PESSOA pode pedir. O `consumo` e a
 *  `reposicao` existem na base e no servico, mas nao entram aqui de
 *  proposito: se se pudessem pedir, alguem podia inventar consumos a
 *  mao e o historico deixava de valer como prova.
 * ----------------------------------------------------------------- */
const esquemaMovimento = z.object({
  tipo: z.enum(['entrada', 'quebra', 'acerto'], {
    message: 'O tipo tem de ser entrada, quebra ou acerto.',
  }),
  quantidade: z.number()
    .int('A quantidade tem de ser um numero inteiro.')
    .min(0, 'A quantidade nao pode ser negativa.')
    .max(100000, 'Quantidade demasiado alta.'),
  nota: z.string().trim().max(200, 'A nota nao pode passar dos 200 caracteres.')
    .optional(),
});

const esquemaMinimo = z.object({
  quantidade_minima: z.number()
    .int('O minimo tem de ser um numero inteiro.')
    .min(0, 'O minimo nao pode ser negativo.')
    .max(100000, 'Minimo demasiado alto.'),
});


// ─────────────────────────────────────────────────────────────────────
//  GET /api/gestao/stock
//
//  So os produtos que controlam existencias. Os que nao controlam nao
//  tem linha na tabela stock, por isso o JOIN ja os deixa de fora.
// ─────────────────────────────────────────────────────────────────────
router.get('/gestao/stock',
  autenticar, exigirNivel(...NIVEIS_LEITURA),
  async (_req, res, next) => {
    try {
      const [linhas] = await pool.query(
        `SELECT p.id_produto        AS id,
                p.nome,
                c.nome              AS categoria,
                s.quantidade_atual,
                s.quantidade_minima
           FROM stock s
           JOIN produto   p ON p.id_produto   = s.id_produto
           JOIN categoria c ON c.id_categoria = p.id_categoria
          WHERE p.controla_stock = 1
          ORDER BY (s.quantidade_atual <= s.quantidade_minima) DESC,
                   p.nome`
      );
      // Os que estao em falta primeiro: e a razao de alguem abrir este
      // ecra. O resto por ordem alfabetica.
      res.json(linhas.map(formatarLinha));
    } catch (erro) { next(erro); }
  });


// ─────────────────────────────────────────────────────────────────────
//  POST /api/gestao/stock/:produtoId/movimento
// ─────────────────────────────────────────────────────────────────────
router.post('/gestao/stock/:produtoId/movimento',
  autenticar, exigirNivel(...NIVEIS_ESCRITA), validar(esquemaMovimento),
  async (req, res, next) => {
    const idProduto = Number(req.params.produtoId);
    if (!Number.isInteger(idProduto) || idProduto < 1) {
      return res.status(400).json({ erro: 'Produto invalido.' });
    }

    const { tipo, quantidade, nota } = req.body;

    /*
     *  O `acerto` e so do administrador.
     *
     *  A entrada e a quebra sao factos que quem esta na cozinha ve
     *  acontecer. O acerto e o unico que apaga a contabilidade e a
     *  substitui por uma afirmacao — e e justamente a diferenca entre
     *  o que o sistema julgava e o que la esta que interessa a gestao.
     *
     *  A cozinha nao fica sem saida: se se deitou fora, e uma quebra,
     *  que continua ao alcance dela e fica registada com o motivo. O
     *  acerto e para quando NAO se sabe porque, e e esse caso que tem
     *  de subir.
     *
     *  Esta verificacao vive aqui e nao so no ecra. O ecra e cortesia;
     *  o servidor e que manda. Chamar isto a mao de uma sessao de
     *  cozinha da 403.
     */
    if (tipo === 'acerto' && req.utilizador.nivel !== 'administrador') {
      return res.status(403).json({
        erro: 'So um administrador pode fazer um acerto de contagem. '
            + 'Para produto estragado ou partido, usa uma quebra.',
      });
    }

    // Cinto e suspensorios: o zod ja so aceita os tres, mas se alguem
    // mexer no esquema um dia, esta linha continua a fechar a porta.
    if (TIPOS_DO_SERVIDOR.includes(tipo)) {
      return res.status(400).json({
        erro: 'Esse movimento nao se pede: acontece quando uma ronda e '
            + 'confirmada ou anulada.',
      });
    }

    const con = await pool.getConnection();
    try {
      await con.beginTransaction();

      const r = await aplicarMovimento(con, {
        idProduto,
        tipo,
        quantidade,
        idUtilizador: req.utilizador.id,   // sai do token, nunca do corpo
        nota: nota || null,
      });

      if (r.estado === 'sem_linha') {
        await con.rollback(); con.release();
        return res.status(404).json({
          erro: 'Esse produto nao existe ou nao controla existencias.',
        });
      }

      if (r.estado === 'insuficiente') {
        await con.rollback(); con.release();
        return res.status(409).json({
          erro: `So ha ${r.atual} em existencia. Uma quebra nao pode deixar `
              + 'o stock negativo — se a contagem real for outra, usa um acerto.',
          quantidade_atual: r.atual,
        });
      }

      const linha = await lerLinhaStock(con, idProduto);
      await con.commit();
      con.release();

      // Devolve a linha no formato do GET: o ecra redesenha-se sem ter
      // de recarregar a lista toda.
      res.json(linha);
    } catch (erro) {
      try { await con.rollback(); } catch { /* ligacao ja perdida */ }
      try { con.release(); } catch { /* idem */ }
      next(erro);
    }
  });


// ─────────────────────────────────────────────────────────────────────
//  PATCH /api/gestao/stock/:produtoId/minimo
//
//  Muda so o limiar do aviso. Nao toca na existencia, nao esconde o
//  produto da ementa, nao impede ninguem de vender.
//
//  Separado do movimento de proposito: e uma DEFINICAO, nao um facto
//  sobre a quantidade. Misturar os dois poria uma configuracao dentro
//  do historico de existencias.
// ─────────────────────────────────────────────────────────────────────
router.patch('/gestao/stock/:produtoId/minimo',
  autenticar, exigirNivel(...NIVEIS_ESCRITA), validar(esquemaMinimo),
  async (req, res, next) => {
    try {
      const idProduto = Number(req.params.produtoId);
      if (!Number.isInteger(idProduto) || idProduto < 1) {
        return res.status(400).json({ erro: 'Produto invalido.' });
      }

      const [r] = await pool.query(
        'UPDATE stock SET quantidade_minima = ? WHERE id_produto = ?',
        [req.body.quantidade_minima, idProduto]
      );

      if (r.affectedRows === 0) {
        return res.status(404).json({
          erro: 'Esse produto nao existe ou nao controla existencias.',
        });
      }

      res.json(await lerLinhaStock(pool, idProduto));
    } catch (erro) { next(erro); }
  });


module.exports = router;
