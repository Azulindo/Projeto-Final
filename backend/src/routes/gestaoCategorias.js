/**
 * =====================================================================
 *  gestaoCategorias.js — Categorias da ementa (B-62)
 *
 *  GET   /api/gestao/categorias
 *  POST  /api/gestao/categorias
 *  PATCH /api/gestao/categorias/:id
 *
 *  Nivel: administrador.
 *  Formato para a F-51 — se preferires outro, diz antes de construires.
 * =====================================================================
 */

const express = require('express');
const { z } = require('zod');
const { pool } = require('../config/bd');
const { validar } = require('../middleware/validar');
const { autenticar, exigirNivel } = require('../middleware/autenticar');

const router = express.Router();

const esquemaCriar = z.object({
  nome: z.string().trim().min(2, 'O nome tem de ter pelo menos 2 caracteres.').max(100),
  descricao: z.string().trim().max(2000).nullable().optional(),
  /*
   *  A `ordem` e o que decide a sequencia das categorias na ementa —
   *  Entradas antes de Sobremesas nao e alfabetico, e alguem tem de o
   *  dizer. TINYINT UNSIGNED na base, dai o limite dos 255.
   */
  ordem: z.number().int().min(0).max(255).optional(),
  ativo: z.boolean().optional(),
});

const esquemaOrdem = z.object({
  ids: z.array(z.coerce.number().int().positive())
    .min(1, 'A lista esta vazia.')
    .max(100, 'Demasiadas categorias.'),
});

const esquemaEditar = z.object({
  nome: esquemaCriar.shape.nome.optional(),
  descricao: esquemaCriar.shape.descricao,
  ativo: esquemaCriar.shape.ativo,
  /*
   *  Ver a nota do "desligar uma categoria" mais abaixo. Isto nao e uma
   *  definicao da categoria, e a resposta a um aviso.
   */
  confirmar: z.boolean().optional(),
});


/* -------------------------------------------------------------------
 *  A ORDEM NAO SE MUDA NO PATCH DE UMA CATEGORIA
 *
 *  Existe o PUT /gestao/categorias/ordem, que recebe a lista completa.
 *  Deixar tambem o PATCH mexer na ordem daria duas portas para o mesmo
 *  facto — e esta seria a porta errada: cada PATCH so sabe da sua
 *  categoria, e nada impede que fiquem duas com ordem = 2. Uma
 *  sequencia so e valida vista por inteiro.
 *
 *  Verificado ANTES do validar, porque o zod devolve o objeto limpo e
 *  a essa altura ja nao se saberia que a ordem tinha vindo. E o mesmo
 *  padrao do quantidade_atual no PATCH do produto.
 * ----------------------------------------------------------------- */
function recusarOrdem(req, res, proximo) {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'ordem')) {
    return res.status(400).json({
      erro: 'A ordem das categorias nao se muda aqui.',
      onde: 'PUT /api/gestao/categorias/ordem, com a lista completa de ids',
    });
  }
  proximo();
}

function formatar(l) {
  return {
    id:        l.id_categoria,
    nome:      l.nome,
    descricao: l.descricao || '',
    ordem:     Number(l.ordem),
    ativo:     Boolean(l.ativo),
    /*
     *  Quantos produtos ATIVOS estao nesta categoria.
     *
     *  Vai na resposta de proposito: desligar uma categoria tira da
     *  ementa do cliente todos os produtos que ela tem dentro (o
     *  catalogo filtra por `c.ativo = 1`), e sem este numero a pessoa
     *  que carrega no botao nao faz ideia de quantos pratos acabou de
     *  esconder.
     */
    produtos:  Number(l.produtos),
  };
}

const SELECT_CATEGORIA = `
  SELECT c.id_categoria, c.nome, c.descricao, c.ordem, c.ativo,
         (SELECT COUNT(*) FROM produto p
           WHERE p.id_categoria = c.id_categoria AND p.ativo = 1) AS produtos
    FROM categoria c`;

async function lerCategoria(con, id) {
  const [l] = await con.query(`${SELECT_CATEGORIA} WHERE c.id_categoria = ?`, [id]);
  return l.length ? formatar(l[0]) : null;
}


// ─────────────────────────────────────────────────────────────────────
//  GET /api/gestao/categorias
//  Mostra tambem as inativas — e a ve-las que se reativa uma.
// ─────────────────────────────────────────────────────────────────────
router.get('/gestao/categorias',
  autenticar, exigirNivel('administrador'),
  async (_req, res, next) => {
    try {
      const [linhas] = await pool.query(`${SELECT_CATEGORIA} ORDER BY c.ordem, c.nome`);
      res.json(linhas.map(formatar));
    } catch (erro) { next(erro); }
  });


// ─────────────────────────────────────────────────────────────────────
//  POST /api/gestao/categorias
// ─────────────────────────────────────────────────────────────────────
router.post('/gestao/categorias',
  autenticar, exigirNivel('administrador'), validar(esquemaCriar),
  async (req, res, next) => {
    try {
      const d = req.body;
      const [r] = await pool.query(
        `INSERT INTO categoria (nome, descricao, ordem, ativo) VALUES (?, ?, ?, ?)`,
        [d.nome, d.descricao ?? null, d.ordem ?? 0, d.ativo ?? true]
      );
      res.status(201).json(await lerCategoria(pool, r.insertId));
    } catch (erro) {
      /*
       *  O nome e UNIQUE na base. Deixa-se a base recusar em vez de
       *  perguntar antes se ja existe: entre a pergunta e o INSERT cabe
       *  outro pedido a criar a mesma categoria, e ai passavam as duas.
       *  E o mesmo padrao do sessao_mesa no B-31.
       */
      if (erro.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ erro: 'Ja existe uma categoria com esse nome.' });
      }
      next(erro);
    }
  });


// ─────────────────────────────────────────────────────────────────────
//  PATCH /api/gestao/categorias/:id
//
//  NAO HA DELETE. Um produto aponta para a categoria com ON DELETE
//  RESTRICT: apagar uma categoria com produtos e impossivel, e apagar
//  uma sem produtos nao vale o risco de alguem apagar a errada. Quem
//  sai da ementa fica `ativo = false`.
// ─────────────────────────────────────────────────────────────────────
router.patch('/gestao/categorias/:id',
  autenticar, exigirNivel('administrador'), recusarOrdem, validar(esquemaEditar),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ erro: 'Categoria invalida.' });
    }

    try {
      const atual = await lerCategoria(pool, id);
      if (!atual) return res.status(404).json({ erro: 'Essa categoria nao existe.' });

      const d = req.body;

      /*
       *  DESLIGAR UMA CATEGORIA COM PRODUTOS DENTRO
       *
       *  O catalogo do cliente filtra por `c.ativo = 1`. Desligar as
       *  "Bebidas" faz desaparecer da ementa 15 produtos de uma vez, e
       *  quem carregou no botao so queria arrumar o menu do back-office.
       *  Nenhum produto foi tocado, e todos deixaram de se poder pedir.
       *
       *  Por isso recusa-se a primeira vez e diz-se quantos sao. Quem
       *  quiser mesmo, repete com `confirmar: true`. Nao e um obstaculo
       *  ao trabalho de ninguem: e a diferenca entre uma decisao e um
       *  engano, e custa um clique.
       */
      if (d.ativo === false && atual.ativo && atual.produtos > 0 && !d.confirmar) {
        return res.status(409).json({
          erro: `A categoria "${atual.nome}" tem ${atual.produtos} produto(s) ativo(s). `
              + 'Desligá-la tira-os todos da ementa do cliente.',
          produtos: atual.produtos,
          comoConfirmar: 'Repete o pedido com "confirmar": true.',
        });
      }

      const partes = [], valores = [];
      const juntar = (col, val) => { partes.push(`${col} = ?`); valores.push(val); };
      if (d.nome !== undefined)      juntar('nome', d.nome);
      if (d.descricao !== undefined) juntar('descricao', d.descricao);
      if (d.ativo !== undefined)     juntar('ativo', d.ativo);

      if (partes.length) {
        valores.push(id);
        await pool.query(`UPDATE categoria SET ${partes.join(', ')} WHERE id_categoria = ?`, valores);
      }

      res.json(await lerCategoria(pool, id));
    } catch (erro) {
      if (erro.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ erro: 'Ja existe uma categoria com esse nome.' });
      }
      next(erro);
    }
  });



// ─────────────────────────────────────────────────────────────────────
//  PUT /api/gestao/categorias/ordem                            (B-74)
//
//  Recebe a lista COMPLETA de ids, pela ordem nova.
//
//  Porque a lista inteira e nao "sobe esta uma posicao": com pedidos
//  relativos, duas pessoas a mexer ao mesmo tempo deixam buracos na
//  sequencia e posicoes repetidas. E reordenar com N pedidos e pior
//  ainda — se o terceiro de cinco falhar, a lista fica meio ordenada e
//  ninguem sabe em que estado ficou. Um pedido, ou nenhum.
//
//  Argumento do Guilherme (API.md 4.11), e esta certo.
// ─────────────────────────────────────────────────────────────────────
router.put('/gestao/categorias/ordem',
  autenticar, exigirNivel('administrador'), validar(esquemaOrdem),
  async (req, res, next) => {
    const { ids } = req.body;

    // Ids repetidos na lista: duas posicoes para a mesma categoria.
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ erro: 'A lista tem ids repetidos.' });
    }

    const con = await pool.getConnection();
    try {
      await con.beginTransaction();

      /*
       *  FOR UPDATE trava as linhas ate ao fim. Sem isto, duas pessoas
       *  a reordenar ao mesmo tempo podiam entrelacar as escritas e o
       *  resultado nao seria nenhuma das duas ordens.
       */
      const [linhas] = await con.query(
        'SELECT id_categoria FROM categoria FOR UPDATE'
      );
      const existentes = linhas.map((l) => l.id_categoria);

      /*
       *  A lista tem de cobrir TODAS as categorias, nem mais nem menos.
       *
       *  Uma lista incompleta nao e meia ordenacao: e uma ordenacao que
       *  deixa de fora categorias que continuam a ter de aparecer em
       *  algum sitio, e ninguem decidiu em qual. Mais vale recusar e
       *  dizer o que falta — normalmente quer dizer que o ecra estava a
       *  ver uma lista antiga, e nesse caso reordenar por cima era
       *  gravar uma decisao tomada sobre outra realidade.
       */
      const faltam = existentes.filter((id) => !ids.includes(id));
      const aMais  = ids.filter((id) => !existentes.includes(id));

      if (faltam.length || aMais.length) {
        await con.rollback(); con.release();
        return res.status(409).json({
          erro: 'A lista tem de trazer todas as categorias, exatamente uma vez. '
              + 'Recarrega a lista e tenta outra vez.',
          emFalta:  faltam,
          naoExistem: aMais,
        });
      }

      // A posicao e o lugar na lista. 1, 2, 3... sem buracos, por
      // construcao — e a razao de se receber a lista inteira.
      for (let i = 0; i < ids.length; i++) {
        await con.query(
          'UPDATE categoria SET ordem = ? WHERE id_categoria = ?', [i + 1, ids[i]]
        );
      }

      const [novas] = await con.query(`${SELECT_CATEGORIA} ORDER BY c.ordem, c.nome`);
      await con.commit(); con.release();

      res.json(novas.map(formatar));
    } catch (erro) {
      try { await con.rollback(); } catch { /* ligacao ja perdida */ }
      try { con.release(); } catch { /* idem */ }
      next(erro);
    }
  });


module.exports = router;
