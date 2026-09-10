/**
 * =====================================================================
 *  gestaoMesas.js — Mesas e QR Codes (B-66)
 *
 *  GET /api/gestao/mesas/qrcodes
 *
 *  Contrato no docs/API.md, seccao 4.6. Serve a pagina imprimivel do
 *  Guilherme (frontend/funcionarios/qrcodes.html, F-58), que desenha um
 *  cartao por mesa com o QR ja formado.
 * =====================================================================
 */

const express = require('express');
const { pool } = require('../config/bd');
const { autenticar, exigirNivel } = require('../middleware/autenticar');

const router = express.Router();


// ─────────────────────────────────────────────────────────────────────
//  GET /api/gestao/mesas/qrcodes
//
//  COM LOGIN, e nao e detalhe: o qr_code de uma mesa E a credencial
//  dessa mesa. Quem o tiver pode abrir a sessao e pedir naquela mesa de
//  onde quer que esteja — foi por isso que ele nunca foi o numero da
//  mesa, mas um token aleatorio. Uma lista publica destes tokens
//  desfazia essa protecao inteira, e de uma vez so para as dez mesas.
//
//  Administrador e balcao. A cozinha nao: nao ha nenhuma altura em que
//  quem esta a cozinhar precise de imprimir cartoes de mesa, e o
//  criterio para dar acesso a uma credencial e a necessidade, nao a
//  ausencia de perigo.
//
//  O balcao entra porque e quem substitui um cartao gasto ou molhado a
//  meio de um servico, e obrigar a chamar um administrador para isso
//  era garantir que a mesa ficava sem cartao ate ao fim da noite.
// ─────────────────────────────────────────────────────────────────────
router.get('/gestao/mesas/qrcodes',
  autenticar, exigirNivel('administrador', 'balcao'),
  async (_req, res, next) => {
    try {
      const [linhas] = await pool.query(
        `SELECT id_mesa, numero_mesa, capacidade, qr_code
           FROM mesa
          WHERE ativo = 1
          ORDER BY numero_mesa`
      );

      /*
       *  So as mesas ativas. Uma mesa desativada nao esta na sala, e um
       *  cartao impresso para ela era um cartao que fica numa gaveta a
       *  dar acesso a uma sessao que ninguem vigia.
       */
      res.json(linhas.map((m) => ({
        id:      m.id_mesa,
        numero:  m.numero_mesa,
        lugares: m.capacidade,
        qrToken: m.qr_code,
      })));
    } catch (erro) { next(erro); }
  });


module.exports = router;
