/**
 * =====================================================================
 *  gestaoReservas.js — A agenda de reservas (B-73)
 *
 *  GET /api/gestao/reservas
 *
 *  Contrato no docs/API.md, seccao 4.14. Serve a tabela de reservas do
 *  painel (F-61).
 *
 *  Porque isto existe:
 *
 *  Ate hoje, um cliente reservava e ninguem no restaurante conseguia
 *  ver a reserva. Era o unico sitio do sistema em que a informacao
 *  entrava e nao saia — o cliente ficava com o codigo na mao e a casa
 *  nao sabia que ele vinha.
 *
 *  So leitura. Confirmar, recusar ou cancelar nao esta aqui: mudar o
 *  estado de uma reserva obriga a decidir o que acontece a lotacao do
 *  horario quando uma e recusada, e isso e uma conversa e nao um
 *  endpoint.
 * =====================================================================
 */

const express = require('express');
const { pool } = require('../config/bd');
const { autenticar, exigirNivel } = require('../middleware/autenticar');

const router = express.Router();

const LIMITE = 200;
const DIAS_OMISSAO = 7;
const DIAS_MAX = 90;

/*
 *  Os estados sao os da coluna `estado` da tabela reserva. Estao
 *  escritos aqui para o filtro poder ser validado ANTES de chegar a
 *  base: um estado inventado tem de dar 400 com uma frase util, e nao
 *  um erro do MySQL sobre um ENUM.
 */
const ESTADOS = ['pendente', 'confirmada', 'recusada', 'cancelada', 'concluida', 'nao_compareceu'];

/**
 * O mysql2 devolve uma coluna DATE como objeto Date, e ai o fuso volta
 * a meter-se ao caminho: um `toISOString()` sobre 2026-09-13 as 00:00
 * em hora local devolve 2026-09-12 se estivermos a leste de Greenwich.
 *
 * E o mesmo erro que o Guilherme apanhou no calendario (X-18) e o
 * terceiro da familia. Uma data de reserva nao tem hora nenhuma: e um
 * dia do calendario, e o que se guarda e o que se le tem de ser o
 * texto do dia, nunca um instante convertido.
 */
function soData(valor) {
  if (valor instanceof Date) {
    const ano = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
  return String(valor).slice(0, 10);
}

/** Hoje em Lisboa, como texto, sem passar por UTC. */
function hojeEmLisboa() {
  const f = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return f.format(new Date());   // o "sv-SE" ja formata como 2026-09-11
}

function somarDias(dataISO, n) {
  const d = new Date(`${dataISO}T12:00:00Z`);   // meio-dia: longe das duas mudancas de hora
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const E_DATA = /^\d{4}-\d{2}-\d{2}$/;


// ─────────────────────────────────────────────────────────────────────
//  GET /api/gestao/reservas
//
//  Administrador e balcao. A cozinha nao — mesmo criterio do 4.6: o
//  que da acesso e a necessidade e nao a ausencia de perigo. Aqui ha
//  ainda mais razao, porque esta lista tem nomes e telemoveis de
//  clientes, e isso nao se mostra a quem nao tem de ligar a ninguem.
// ─────────────────────────────────────────────────────────────────────
router.get('/gestao/reservas',
  autenticar, exigirNivel('administrador', 'balcao'),
  async (req, res, next) => {
    try {
      const { data, dias, estado } = req.query;

      /* ---- 1. O que veio no pedido ------------------------------- */
      if (data !== undefined && !E_DATA.test(String(data))) {
        return res.status(400).json({ erro: 'A data tem de vir no formato 2026-09-20.' });
      }
      if (estado !== undefined && !ESTADOS.includes(String(estado))) {
        return res.status(400).json({
          erro: 'Esse estado de reserva nao existe.',
          estadosValidos: ESTADOS,
        });
      }

      let numDias = DIAS_OMISSAO;
      if (dias !== undefined) {
        numDias = Number(dias);
        if (!Number.isInteger(numDias) || numDias < 1 || numDias > DIAS_MAX) {
          return res.status(400).json({ erro: `O numero de dias tem de estar entre 1 e ${DIAS_MAX}.` });
        }
      }

      /* ---- 2. A janela de datas ---------------------------------- */
      /*
       *  Calculada em Lisboa e no Node, nunca com CURDATE() do MySQL.
       *  A base corre em UTC desde o X-15, por isso o CURDATE() dela
       *  vira o dia a meia-noite de Londres e nao a de Lisboa — no
       *  verao, durante uma hora por dia, respondia com o dia errado.
       */
      const hoje = hojeEmLisboa();
      const de = data ? String(data) : hoje;
      const ate = data ? String(data) : somarDias(hoje, numDias);

      const condicoes = ['r.data_reserva BETWEEN ? AND ?'];
      const valores = [de, ate];
      if (estado) {
        condicoes.push('r.estado = ?');
        valores.push(String(estado));
      }

      /* ---- 3. As reservas ---------------------------------------- */
      const [linhas] = await pool.query(
        `SELECT r.id_reserva, r.codigo_reserva, r.nome, r.telemovel,
                r.num_pessoas, r.data_reserva, r.estado, r.modo_ementa,
                r.observacoes, r.valor_estimado, r.data_criacao,
                s.hora, s.periodo
           FROM reserva r
           JOIN slot_horario s ON s.id_slot = r.id_slot
          WHERE ${condicoes.join(' AND ')}
          ORDER BY r.data_reserva, s.hora, r.codigo_reserva
          LIMIT ?`,
        [...valores, LIMITE + 1]
      );

      /*
       *  Pedimos uma linha a mais do que o limite. Se ela vier, e
       *  porque ha mais do que cabe — e e assim que se sabe, sem
       *  precisar de uma segunda consulta so para contar.
       */
      const truncado = linhas.length > LIMITE;
      const reservas = truncado ? linhas.slice(0, LIMITE) : linhas;

      /* ---- 4. Os itens, numa consulta so ------------------------- */
      /*
       *  Uma consulta para todas as reservas de uma vez, e nao uma por
       *  reserva. Com 200 reservas a diferenca e entre uma ida a base
       *  de dados e duzentas — e no Aiven, que esta em Amsterdao, cada
       *  ida custa uns milissegundos de viagem que se somam depressa.
       */
      const ids = reservas.map((r) => r.id_reserva);
      const itensPorReserva = new Map(ids.map((id) => [id, []]));

      if (ids.length) {
        const [itens] = await pool.query(
          `SELECT i.id_reserva, i.id_produto, i.quantidade,
                  i.preco_unitario, i.subtotal, p.nome
             FROM item_reserva i
             JOIN produto p ON p.id_produto = i.id_produto
            WHERE i.id_reserva IN (?)
            ORDER BY i.id_reserva, i.id_item_reserva`,
          [ids]
        );
        for (const i of itens) {
          itensPorReserva.get(i.id_reserva).push({
            produtoId:  i.id_produto,
            nome:       i.nome,
            quantidade: i.quantidade,
            precoUnit:  Number(i.preco_unitario),
            subtotal:   Number(i.subtotal),
          });
        }
      }

      /* ---- 5. A resposta ----------------------------------------- */
      res.json({
        reservas: reservas.map((r) => ({
          codigo:      r.codigo_reserva,
          nome:        r.nome,
          /*
           *  O telemovel vai, e e uma decisao e nao um descuido.
           *
           *  No take away o GET publico NAO devolve telefone nenhum,
           *  porque ali quem pergunta e qualquer pessoa que saiba um
           *  numero de encomenda. Aqui quem pergunta e um funcionario
           *  com sessao iniciada, e ligar ao cliente para confirmar ou
           *  avisar de um atraso e a razao de ser deste ecra.
           *
           *  O mesmo numero, atras de login, e uma ferramenta; num
           *  endpoint publico e uma fuga.
           */
          telemovel:   r.telemovel,
          pessoas:     r.num_pessoas,
          data:        soData(r.data_reserva),
          hora:        String(r.hora).slice(0, 5),
          periodo:     r.periodo,
          estado:      r.estado,
          modo_ementa: r.modo_ementa,
          observacoes: r.observacoes,
          valorEstimado: r.valor_estimado == null ? null : Number(r.valor_estimado),
          criadaEm:    r.data_criacao,
          // Vetor vazio e nao null: percorre-se sem ter de verificar antes.
          itens:       itensPorReserva.get(r.id_reserva) || [],
        })),
        truncado,
      });

      /*
       *  Repara no que NAO vai aqui:
       *
       *  Nao vai um `total`. Se a lista vem inteira, o total e o
       *  comprimento do vetor, e manda-lo ao lado era mandar a mesma
       *  coisa duas vezes — que e o defeito dominante deste projeto.
       *  O `truncado` diz outra coisa: ha mais e nao couberam.
       *
       *  Nao vai um `stockBaixo` por item. A F-61 precisa desse aviso,
       *  mas se ele saisse daqui passava a haver dois sitios a
       *  responder a mesma pergunta — este e o GET /gestao/stock. Vai
       *  o produtoId e o aviso sai do cruzamento com a lista que o
       *  painel ja carrega. Uma fonte, dois ecras.
       */
    } catch (erro) { next(erro); }
  });


module.exports = router;
