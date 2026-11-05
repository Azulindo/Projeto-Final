/**
 * =====================================================================
 *  reservas.js — Reservas do cliente (B-41, B-47, B-48, B-49, B-53)
 *
 *  GET  /api/reservas/horarios?data=AAAA-MM-DD
 *  POST /api/reservas
 *  GET  /api/reservas/:codigo
 *
 *  SEM LOGIN. Quem reserva uma mesa nao tem conta, tal como quem pede
 *  a mesa ou encomenda take away. O que fica na mao do cliente e o
 *  CODIGO da reserva, e e so com ele que se consulta.
 *
 *  O fluxo de perguntas (numero de pessoas, dia, hora, nome...) ja
 *  existe todo no frontend/cliente/js/reservas.js. O que faltava era o
 *  servidor: ate agora a reserva era gravada no localStorage do
 *  browser, o que quer dizer que o restaurante nunca a via.
 * =====================================================================
 */

const express = require('express');
const { z } = require('zod');
const { pool } = require('../config/bd');
const { validar } = require('../middleware/validar');
const { gerarCodigo } = require('../servicos/pedidos');
const { limiteReservaOuTakeAway, limiteConsultaPorCodigo } = require('../middleware/limites');

const router = express.Router();

// Regra do restaurante: reserva-se desde hoje ate 60 dias. Para hoje, so
// as horas que ainda faltam pelo menos MARGEM_MIN minutos.
const MAX_DIAS = 60;
const MARGEM_MIN = 60;

/**
 * A data e a hora de agora, em Lisboa.
 *
 * O servidor (o Render) corre em UTC e o restaurante em Lisboa, que no
 * verao esta uma hora adiante. Perto da meia-noite a data de um e a do
 * outro nao coincidem, e "hoje" passaria a ser o dia errado. Por isso
 * pergunta-se a hora a Lisboa e nao ao relogio do servidor.
 */
function agoraEmLisboa() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const v = (tipo) => partes.find((p) => p.type === tipo).value;
  return {
    data: `${v('year')}-${v('month')}-${v('day')}`,
    minutos: Number(v('hour')) * 60 + Number(v('minute')),
  };
}

/**
 * Esta hora ja nao se pode marcar? So conta para o dia de hoje: uma hora
 * que ja passou, ou que falta menos de MARGEM_MIN minutos, fica fechada.
 * Para qualquer outro dia nunca ha problema.
 */
function horaJaNaoServe(dataStr, horaStr) {
  const agora = agoraEmLisboa();
  if (dataStr !== agora.data) return false;
  const [h, m] = String(horaStr).slice(0, 5).split(':').map(Number);
  return h * 60 + m < agora.minutos + MARGEM_MIN;
}

// Estados que ocupam lugar. Uma reserva cancelada ou recusada liberta
// a mesa; uma que ninguem apareceu ja nao ocupa nada.
const OCUPAM = ['pendente', 'confirmada', 'concluida'];

/*
 *  No maximo 3 reservas por horario, por pedido do Guilherme (05/11).
 *  E uma regra diferente da lotacao: a lotacao conta PESSOAS (40 por
 *  horario), esta conta RESERVAS. Tres grupos a chegar a mesma hora ja
 *  e o que a sala e a cozinha aguentam receber de uma vez, mesmo que
 *  ainda sobrem cadeiras.
 */
const MAX_RESERVAS_POR_HORARIO = 3;

// Uma reserva por telemovel em cada horario (05/11). Antes eram 3 por
// dia (B-49); o limite por dia deixou de existir.
const MAX_RESERVAS_POR_TELEMOVEL = 1;

// Mais do que isto e por telefone — e o que o chat da reserva ja dizia.
const MAX_PESSOAS_POR_RESERVA = 10;


/* -------------------------------------------------------------------
 *  A DATA
 *
 *  Valida-se aqui e nao no browser. O calendario do Guilherme ja
 *  bloqueia segundas, dias passados e alem dos 60 — mas isso e
 *  cortesia para quem usa o site, nao uma regra. Quem chamar a API
 *  diretamente passa ao lado do calendario.
 * ----------------------------------------------------------------- */
function verificarData(dataStr) {
  // "Hoje" e o de Lisboa, nao o do relogio do servidor.
  const hoje = new Date(`${agoraEmLisboa().data}T00:00:00`);
  const d = new Date(`${dataStr}T00:00:00`);

  if (Number.isNaN(d.getTime())) return 'Data invalida.';

  // Hoje ja se pode reservar (so as horas que ainda faltam: ver
  // horaJaNaoServe). Dias que ja passaram, nao.
  if (d < hoje) return 'Essa data ja passou.';

  const limite = new Date(hoje); limite.setDate(limite.getDate() + MAX_DIAS);
  if (d > limite) return `So e possivel reservar ate ${MAX_DIAS} dias.`;

  /*
   *  Segunda-feira e o dia de folga. O `dias_semana` dos slots esta em
   *  numeracao ISO — 1 e segunda, 7 e domingo — e traz "2,3,4,5,6,7",
   *  ou seja, terca a domingo. O getDay() do JavaScript conta ao
   *  contrario (0 = domingo), por isso converte-se.
   */
  const diaISO = d.getDay() === 0 ? 7 : d.getDay();
  if (diaISO === 1) return 'O restaurante esta fechado a segunda-feira.';

  return null;
}

/*
 *  Uma coluna DATE volta do MySQL como um objeto Date, e a serializar
 *  para JSON sai "2026-09-18T00:00:00.000Z" — com uma hora que nao
 *  existe e um fuso que nao interessa. O POST devolvia "2026-09-18" e
 *  o GET devolvia a outra: o mesmo campo com dois formatos, e o
 *  front-end obrigado a saber os dois.
 *
 *  Uma reserva e para um DIA. A hora vive no slot, ao lado.
 */
function soData(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') return valor.slice(0, 10);
  return new Date(valor).toISOString().slice(0, 10);
}

function diaISOde(dataStr) {
  const d = new Date(`${dataStr}T00:00:00`);
  return d.getDay() === 0 ? 7 : d.getDay();
}


// ─────────────────────────────────────────────────────────────────────
//  GET /api/reservas/horarios?data=AAAA-MM-DD                  (B-41)
//
//  As horas daquele dia, com o que ainda cabe em cada uma.
// ─────────────────────────────────────────────────────────────────────
router.get('/reservas/horarios', async (req, res, next) => {
  try {
    const data = String(req.query.data || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ erro: 'Falta a data, no formato AAAA-MM-DD.' });
    }

    const problema = verificarData(data);
    if (problema) return res.status(400).json({ erro: problema });

    /*
     *  O `ocupado` sai de uma soma sobre as reservas daquele dia e
     *  daquela hora — nao ha coluna nenhuma a guardar isso. Uma
     *  contagem guardada e uma contagem que fica errada assim que
     *  alguem cancela e ninguem se lembra de a baixar.
     *
     *  O FIND_IN_SET confirma que o slot funciona naquele dia da
     *  semana: o `dias_semana` e uma lista separada por virgulas.
     */
    const [linhas] = await pool.query(
      `SELECT s.id_slot, s.hora, s.periodo, s.lotacao_maxima,
              COALESCE((
                SELECT SUM(r.num_pessoas) FROM reserva r
                 WHERE r.id_slot = s.id_slot
                   AND r.data_reserva = ?
                   AND r.estado IN (?)
              ), 0) AS ocupado,
              (
                SELECT COUNT(*) FROM reserva r
                 WHERE r.id_slot = s.id_slot
                   AND r.data_reserva = ?
                   AND r.estado IN (?)
              ) AS reservas
         FROM slot_horario s
        WHERE s.ativo = 1
          AND FIND_IN_SET(?, s.dias_semana)
        ORDER BY s.hora`,
      [data, OCUPAM, data, OCUPAM, diaISOde(data)]
    );

    res.json(linhas.map((s) => {
      const ocupado = Number(s.ocupado);
      const reservas = Number(s.reservas);
      // Com 3 reservas o horario fecha, mesmo que sobrem cadeiras: os
      // lugares que restam ja nao se podem marcar.
      const livres = reservas >= MAX_RESERVAS_POR_HORARIO
        ? 0
        : Math.max(0, s.lotacao_maxima - ocupado);
      const passou = horaJaNaoServe(data, String(s.hora));   // so para hoje
      return {
        id:          s.id_slot,
        hora:        String(s.hora).slice(0, 5),   // "19:30:00" → "19:30"
        periodo:     s.periodo,
        lotacao:     s.lotacao_maxima,
        ocupado,
        reservas,
        livres,
        passou,
        disponivel:  livres > 0 && !passou,
      };
    }));
  } catch (erro) { next(erro); }
});


/* -------------------------------------------------------------------
 *  O QUE UMA RESERVA ACEITA
 * ----------------------------------------------------------------- */
const esquemaReserva = z.object({
  nome: z.string().trim().min(2, 'Escreve o teu nome.').max(120),

  // Nove digitos, comecados em 9. E o formato portugues, e o
  // calendario do Guilherme ja o valida a vista — isto e a regra.
  telemovel: z.string().trim()
    // Tira os espacos ANTES de validar: "912 345 678" e o mesmo numero
    // que "912345678", e recusa-lo por causa de espacos era pedir a
    // pessoa que adivinhasse o formato.
    .transform((s) => s.replace(/\s/g, ''))
    .refine((s) => /^9\d{8}$/.test(s),
      'Telemovel invalido. Sao 9 digitos comecados em 9.'),

  email: z.string().trim().toLowerCase().email('Email invalido.').max(150).nullish(),

  // Ate 10 (05/11). O chat da reserva ja mandava ligar a partir de 11
  // pessoas, mas o servidor aceitava 50: um pedido feito a mao, sem o
  // chat, passava. A regra e uma so, e quem a garante e o servidor.
  pessoas: z.coerce.number().int()
    .min(1, 'Tem de ser pelo menos uma pessoa.')
    .max(MAX_PESSOAS_POR_RESERVA,
      `Para grupos com mais de ${MAX_PESSOAS_POR_RESERVA} pessoas, telefona-nos.`),

  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD.'),

  // "19:30". A hora identifica o slot: e UNIQUE na base.
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Hora no formato HH:MM.'),

  modo_ementa: z.enum(['no_restaurante', 'pre_selecionada']).default('no_restaurante'),

  observacoes: z.string().trim().max(1000).nullish(),

  // Ramo B: os pratos escolhidos de antemao (B-53).
  itens: z.array(z.object({
    produtoId:  z.coerce.number().int().positive(),
    quantidade: z.coerce.number().int().min(1).max(50),
  })).max(100).optional(),
});


// ─────────────────────────────────────────────────────────────────────
//  POST /api/reservas                          (B-47, B-48, B-49, B-53)
// ─────────────────────────────────────────────────────────────────────
router.post('/reservas', limiteReservaOuTakeAway, validar(esquemaReserva), async (req, res, next) => {
  const d = req.body;

  const problema = verificarData(d.data);
  if (problema) return res.status(400).json({ erro: problema });

  const con = await pool.getConnection();
  try {
    await con.beginTransaction();

    /*
     *  O FOR UPDATE trava a linha do horario ate ao fim da transacao.
     *
     *  Sem isto, duas pessoas a reservar as ultimas mesas da mesma
     *  hora leem as duas "ha lugar" e gravam as duas. E o mesmo
     *  problema do stock, e a mesma solucao: quem chega primeiro
     *  fecha a porta atras de si.
     */
    const [slots] = await con.query(
      `SELECT id_slot, hora, lotacao_maxima, dias_semana, ativo
         FROM slot_horario WHERE hora = ? FOR UPDATE`,
      [`${d.hora}:00`]
    );

    const slot = slots[0];
    if (!slot || !slot.ativo) {
      await con.rollback(); con.release();
      return res.status(400).json({ erro: 'Esse horario nao existe.' });
    }

    if (horaJaNaoServe(d.data, d.hora)) {
      await con.rollback(); con.release();
      return res.status(400).json({
        erro: 'Essa hora ja passou ou esta demasiado perto. Escolhe uma hora mais tarde, ou outro dia.',
      });
    }

    if (!String(slot.dias_semana).split(',').includes(String(diaISOde(d.data)))) {
      await con.rollback(); con.release();
      return res.status(400).json({ erro: 'Esse horario nao funciona nesse dia da semana.' });
    }

    /*
     *  Uma reserva por telemovel no MESMO HORARIO do mesmo dia (05/11).
     *  Ate ai era o B-49: 3 por telemovel por dia. O Guilherme mudou a
     *  regra: o mesmo numero pode marcar o almoco e o jantar, o que nao
     *  pode e ocupar duas vezes a mesma hora.
     *
     *  Conta-se por data da reserva e nao por dia em que se reservou:
     *  quem marca cinco sextas-feiras ao longo de dois meses e um bom
     *  cliente, nao um abuso. O que faz mal ao restaurante e uma
     *  pessoa a bloquear meia sala na mesma noite.
     */
    const [[{ jaTem }]] = await con.query(
      `SELECT COUNT(*) AS jaTem FROM reserva
        WHERE telemovel = ? AND data_reserva = ? AND id_slot = ?
          AND estado IN (?)`,
      [d.telemovel, d.data, slot.id_slot, OCUPAM]
    );

    if (jaTem >= MAX_RESERVAS_POR_TELEMOVEL) {
      await con.rollback(); con.release();
      return res.status(409).json({
        erro: `Ja existe uma reserva para este telemovel as ${d.hora} desse dia. `
            + 'Para mudar o numero de pessoas, telefona-nos.',
      });
    }

    // Ja ha 3 reservas a esta hora? (MAX_RESERVAS_POR_HORARIO)
    const [[{ reservasNoHorario }]] = await con.query(
      `SELECT COUNT(*) AS reservasNoHorario FROM reserva
        WHERE id_slot = ? AND data_reserva = ? AND estado IN (?)`,
      [slot.id_slot, d.data, OCUPAM]
    );

    if (reservasNoHorario >= MAX_RESERVAS_POR_HORARIO) {
      await con.rollback(); con.release();
      return res.status(409).json({
        erro: `As ${d.hora} ja temos ${MAX_RESERVAS_POR_HORARIO} reservas. Escolhe outra hora.`,
        livres: 0,
      });
    }

    // Lotacao: cabe?
    const [[{ ocupado }]] = await con.query(
      `SELECT COALESCE(SUM(num_pessoas), 0) AS ocupado FROM reserva
        WHERE id_slot = ? AND data_reserva = ? AND estado IN (?)`,
      [slot.id_slot, d.data, OCUPAM]
    );

    const livres = slot.lotacao_maxima - Number(ocupado);
    if (d.pessoas > livres) {
      await con.rollback(); con.release();
      return res.status(409).json({
        erro: livres > 0
          ? `As ${d.hora} so restam ${livres} lugares. Escolhe outra hora.`
          : `As ${d.hora} ja nao ha lugares. Escolhe outra hora.`,
        livres,
      });
    }

    // ---- Os pratos, se vierem (ramo B) ----
    let itens = [];
    let valorEstimado = null;

    if (d.modo_ementa === 'pre_selecionada' && d.itens && d.itens.length) {
      const ids = [...new Set(d.itens.map((i) => i.produtoId))];
      const [produtos] = await con.query(
        `SELECT id_produto, nome, preco, ativo FROM produto WHERE id_produto IN (?)`,
        [ids]
      );
      const porId = new Map(produtos.map((p) => [p.id_produto, p]));

      for (const item of d.itens) {
        const p = porId.get(item.produtoId);
        if (!p || !p.ativo) {
          await con.rollback(); con.release();
          return res.status(400).json({ erro: 'Um dos pratos escolhidos ja nao existe na ementa.' });
        }
        const preco = Number(p.preco);
        itens.push([item.produtoId, item.quantidade, preco,
                    Number((preco * item.quantidade).toFixed(2))]);
      }

      valorEstimado = Number(itens.reduce((s, i) => s + i[3], 0).toFixed(2));
    }

    // ---- A reserva ----
    let idReserva, codigo;
    for (let tentativa = 1; ; tentativa++) {
      codigo = gerarCodigo('RSV');
      try {
        const [r] = await con.query(
          `INSERT INTO reserva
             (codigo_reserva, nome, telemovel, email, num_pessoas,
              data_reserva, id_slot, modo_ementa, observacoes,
              valor_estimado, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
          [codigo, d.nome, d.telemovel, d.email || null, d.pessoas,
           d.data, slot.id_slot, d.modo_ementa, d.observacoes || null,
           valorEstimado]
        );
        idReserva = r.insertId;
        break;
      } catch (erro) {
        if (erro.code !== 'ER_DUP_ENTRY' || tentativa >= 5) throw erro;
      }
    }

    /*
     *  O preco fica gravado a data (B-53). Uma reserva feita hoje para
     *  daqui a um mes tem de mostrar o preco de hoje: se o prato
     *  aumentar entretanto, quem reservou nao pode ser surpreendido — e
     *  ler o preco atual do produto fazia exatamente isso.
     */
    if (itens.length) {
      await con.query(
        `INSERT INTO item_reserva (id_reserva, id_produto, quantidade, preco_unitario, subtotal)
         VALUES ?`,
        [itens.map((i) => [idReserva, i[0], i[1], i[2], i[3]])]
      );
    }

    await con.commit(); con.release();

    /*
     *  Fica em `pendente`, nao em `confirmada`. O restaurante e que
     *  confirma — pode nao ter mesa daquele tamanho, pode ser um dia
     *  de evento. Dizer "confirmada" a quem acabou de submeter era
     *  prometer em nome de quem ainda nao sabe.
     */
    res.status(201).json({
      mensagem: `Reserva registada, ${d.nome.split(' ')[0]}! `
              + 'Vamos confirmar pelo telemovel.',
      reserva: {
        id: idReserva,
        codigo,
        estado: 'pendente',
        nome: d.nome,
        pessoas: d.pessoas,
        data: d.data,
        hora: d.hora,
        modo_ementa: d.modo_ementa,
        valorEstimado,
      },
    });
  } catch (erro) {
    try { await con.rollback(); } catch { /* ligacao ja perdida */ }
    try { con.release(); } catch { /* idem */ }
    next(erro);
  }
});


// ─────────────────────────────────────────────────────────────────────
//  GET /api/reservas/:codigo
//
//  Vem DEPOIS do /reservas/horarios de proposito: registado antes,
//  o :codigo apanhava a palavra "horarios" como se fosse um codigo.
//
//  O codigo faz de credencial, como o numero da encomenda de take away
//  e o token do QR. Nao devolve o telemovel nem o email.
// ─────────────────────────────────────────────────────────────────────
router.get('/reservas/:codigo', limiteConsultaPorCodigo, async (req, res, next) => {
  try {
    const codigo = String(req.params.codigo || '').trim().toUpperCase();

    const [linhas] = await pool.query(
      `SELECT r.id_reserva, r.codigo_reserva, r.nome, r.num_pessoas,
              r.data_reserva, r.estado, r.modo_ementa, r.observacoes,
              r.valor_estimado, r.motivo_recusa, s.hora
         FROM reserva r
         JOIN slot_horario s ON s.id_slot = r.id_slot
        WHERE r.codigo_reserva = ?`,
      [codigo]
    );

    const r = linhas[0];
    if (!r) return res.status(404).json({ erro: 'Nao ha nenhuma reserva com esse codigo.' });

    const [itens] = await pool.query(
      `SELECT i.quantidade, i.preco_unitario, i.subtotal, p.nome
         FROM item_reserva i
         JOIN produto p ON p.id_produto = i.id_produto
        WHERE i.id_reserva = ?
        ORDER BY i.id_item_reserva`,
      [r.id_reserva]
    );

    res.json({
      reserva: {
        codigo:       r.codigo_reserva,
        nome:         r.nome,
        pessoas:      r.num_pessoas,
        data:         soData(r.data_reserva),
        hora:         String(r.hora).slice(0, 5),
        estado:       r.estado,
        modo_ementa:  r.modo_ementa,
        observacoes:  r.observacoes,
        valorEstimado: r.valor_estimado == null ? null : Number(r.valor_estimado),
        motivoRecusa: r.motivo_recusa,
      },
      itens: itens.map((i) => ({
        nome:       i.nome,
        quantidade: i.quantidade,
        precoUnit:  Number(i.preco_unitario),
        subtotal:   Number(i.subtotal),
      })),
    });
  } catch (erro) { next(erro); }
});


module.exports = router;
