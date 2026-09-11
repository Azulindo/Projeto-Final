/**
 * =====================================================================
 *  estatisticas.js — Números do restaurante (B-68, B-69, B-70)
 *
 *  GET /api/admin/estatisticas
 *
 *  Contrato no docs/API.md, seccao 4.10. Uma chamada so serve os
 *  cartoes (F-55) e os dois graficos (F-56, F-57): nao vale a pena
 *  tres pedidos para o mesmo ecra.
 *
 *  So `administrador`. Nao e arrumacao: o monitor da cozinha fica
 *  ligado o turno inteiro num sitio por onde passa gente, e o balcao
 *  nao tem decisao nenhuma a tomar com faturacao.
 * =====================================================================
 */

const express = require('express');
const { pool } = require('../config/bd');
const { autenticar, exigirNivel } = require('../middleware/autenticar');

const router = express.Router();

const FUSO = 'Europe/Lisbon';

/*
 *  Rondas canceladas nao contam para nada: nao se cobra o que a cozinha
 *  nao fez. Fica numa constante para as sete consultas abaixo nao
 *  poderem discordar entre si sobre o que e uma venda.
 */
const NAO_CANCELADO = "estado <> 'cancelado'";


/* -------------------------------------------------------------------
 *  O DIA EM LISBOA, E NAO EM UTC
 *
 *  A base guarda tudo em UTC desde a correcao do X-15. Isso esta certo
 *  — mas "hoje" para um restaurante e o dia em Lisboa, nao em UTC.
 *
 *  No verao Portugal esta uma hora a frente. Entre a meia-noite e a uma
 *  da manha, um dia calculado em UTC ainda esta no dia anterior: o
 *  servico de sexta a noite acabava contado no sabado, e a faturacao de
 *  sexta aparecia curta. E o genero de erro que ninguem ve ate alguem
 *  conferir uma conta a mao.
 *
 *  Aviso do Guilherme no API.md 4.10, e tem mais razao do que tinha
 *  quando o escreveu: nessa altura a base guardava hora local por
 *  acidente, o que tapava metade do problema.
 *
 *  Nao se usa o CONVERT_TZ do MySQL de proposito: precisa das tabelas
 *  de fusos carregadas no servidor, e nao ha garantia nenhuma de que
 *  estejam — nem no portatil nem no Aiven. Um relatorio que rebenta
 *  consoante a instalacao nao serve. O Node sabe os fusos sempre.
 * ----------------------------------------------------------------- */

/** Quantos minutos e que `tz` esta a frente de UTC naquele instante. */
function desvioMinutos(instante, tz) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(instante).map((x) => [x.type, x.value]));
  const hora = p.hour === '24' ? 0 : Number(p.hour);
  const comoSeFosseUTC = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    hora, Number(p.minute), Number(p.second)
  );
  return Math.round((comoSeFosseUTC - instante.getTime()) / 60000);
}

/** A data em Lisboa, "AAAA-MM-DD", no instante dado. */
function dataEmLisboa(instante) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instante);
}

/**
 * O instante UTC em que comeca um dia de Lisboa.
 *
 * Calcula-se duas vezes: a primeira com o desvio de agora, a segunda
 * com o desvio que havia nesse instante. Sao dois dias por ano em que
 * isso faz diferenca — os da mudanca da hora — e nesses o resultado da
 * primeira conta estava uma hora ao lado.
 */
function inicioDoDia(dataISO) {
  const [a, m, d] = dataISO.split('-').map(Number);
  const meiaNoiteIngenua = Date.UTC(a, m - 1, d);
  const desvio1 = desvioMinutos(new Date(meiaNoiteIngenua), FUSO);
  const tentativa = new Date(meiaNoiteIngenua - desvio1 * 60000);
  const desvio2 = desvioMinutos(tentativa, FUSO);
  return new Date(meiaNoiteIngenua - desvio2 * 60000);
}

function somarDias(dataISO, n) {
  const [a, m, d] = dataISO.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** DATETIME para o MySQL, em UTC (que e como a base guarda). */
function paraSQL(data) {
  return data.toISOString().slice(0, 19).replace('T', ' ');
}


// ─────────────────────────────────────────────────────────────────────
//  GET /api/admin/estatisticas
// ─────────────────────────────────────────────────────────────────────
router.get('/admin/estatisticas',
  autenticar, exigirNivel('administrador'),
  async (_req, res, next) => {
    try {
      const agora = new Date();
      const hojeISO  = dataEmLisboa(agora);
      const ontemISO = somarDias(hojeISO, -1);

      const inicioHoje   = paraSQL(inicioDoDia(hojeISO));
      const inicioOntem  = paraSQL(inicioDoDia(ontemISO));
      const inicioAmanha = paraSQL(inicioDoDia(somarDias(hojeISO, 1)));

      // O mes corrente, tambem em Lisboa.
      const inicioMes = paraSQL(inicioDoDia(`${hojeISO.slice(0, 7)}-01`));

      // 30 dias e 6 meses para os graficos.
      const inicio30 = paraSQL(inicioDoDia(somarDias(hojeISO, -29)));
      const [ano, mes] = hojeISO.split('-').map(Number);
      const inicio6m = paraSQL(inicioDoDia(
        `${new Date(Date.UTC(ano, mes - 6, 1)).toISOString().slice(0, 7)}-01`
      ));

      /*
       *  Para agrupar por DIA de Lisboa dentro do SQL, desloca-se a
       *  data pelo desvio de agora antes de a cortar. Nos dois dias do
       *  ano em que a hora muda, uma barra do grafico pode ficar com
       *  uma hora do dia vizinho. Fica dito porque e melhor um grafico
       *  com um limite conhecido do que um grafico que se acredita
       *  exato e nao e.
       */
      const desvioAgora = desvioMinutos(agora, FUSO);

      const [
        [[hoje]], [[ontem]], [[mes_]], [[tempo]],
        [[servico]], [[stock]], [porDia], [porMes], [maisVendidos],
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS pedidos, COALESCE(SUM(valor_total),0) AS faturacao
             FROM pedido
            WHERE ${NAO_CANCELADO} AND data_hora >= ? AND data_hora < ?`,
          [inicioHoje, inicioAmanha]),

        pool.query(
          `SELECT COUNT(*) AS pedidos, COALESCE(SUM(valor_total),0) AS faturacao
             FROM pedido
            WHERE ${NAO_CANCELADO} AND data_hora >= ? AND data_hora < ?`,
          [inicioOntem, inicioHoje]),

        pool.query(
          `SELECT COUNT(*) AS pedidos, COALESCE(SUM(valor_total),0) AS faturacao
             FROM pedido
            WHERE ${NAO_CANCELADO} AND data_hora >= ? AND data_hora < ?`,
          [inicioMes, inicioAmanha]),

        /*
         *  Tempo medio de preparacao: de `confirmado` a `pronto`.
         *
         *  E para isto que o B-57 guarda cada mudanca de estado em vez
         *  de so o estado atual. Com uma coluna `estado` sozinha, esta
         *  informacao nao existia — nao se pode medir a duracao de uma
         *  coisa de que so se sabe o fim.
         *
         *  So conta rondas que chegaram mesmo a `pronto` hoje: uma que
         *  ainda esta na grelha nao tem duracao nenhuma para medir.
         */
        pool.query(
          `SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, c.data_hora, p.data_hora))) AS minutos
             FROM historico_estado_pedido c
             JOIN historico_estado_pedido p
               ON p.id_pedido = c.id_pedido AND p.estado = 'pronto'
            WHERE c.estado = 'confirmado'
              AND p.data_hora >= ? AND p.data_hora < ?`,
          [inicioHoje, inicioAmanha]),

        pool.query(
          `SELECT
             (SELECT COUNT(*) FROM sessao_mesa WHERE estado = 'aberta')   AS mesas_ocupadas,
             (SELECT COUNT(*) FROM mesa        WHERE ativo = 1)           AS mesas_total,
             (SELECT COUNT(*) FROM pedido
               WHERE estado NOT IN ('entregue','cancelado'))              AS rondas_por_fazer`),

        // O mesmo calculo do gestao/stock, para os dois ecras nao
        // poderem dizer numeros diferentes sobre a mesma coisa.
        pool.query(
          `SELECT COUNT(*) AS n FROM stock s
             JOIN produto p ON p.id_produto = s.id_produto
            WHERE p.controla_stock = 1 AND s.quantidade_atual <= s.quantidade_minima`),

        pool.query(
          `SELECT DATE(data_hora + INTERVAL ? MINUTE) AS dia,
                  COALESCE(SUM(valor_total),0) AS total
             FROM pedido
            WHERE ${NAO_CANCELADO} AND data_hora >= ? AND data_hora < ?
            GROUP BY dia ORDER BY dia`,
          [desvioAgora, inicio30, inicioAmanha]),

        pool.query(
          `SELECT DATE_FORMAT(data_hora + INTERVAL ? MINUTE, '%Y-%m') AS mes,
                  COALESCE(SUM(valor_total),0) AS total
             FROM pedido
            WHERE ${NAO_CANCELADO} AND data_hora >= ? AND data_hora < ?
            GROUP BY mes ORDER BY mes`,
          [desvioAgora, inicio6m, inicioAmanha]),

        pool.query(
          `SELECT pr.id_produto AS id, pr.nome,
                  SUM(i.quantidade) AS quantidade,
                  SUM(i.subtotal)   AS total
             FROM item_pedido i
             JOIN pedido  p  ON p.id_pedido  = i.id_pedido
             JOIN produto pr ON pr.id_produto = i.id_produto
            WHERE p.${NAO_CANCELADO}
            GROUP BY pr.id_produto, pr.nome
            -- O id entra na ordenacao como DESEMPATE, e nao por gosto:
            -- sem ele, duas linhas com a mesma quantidade podem sair por
            -- qualquer ordem, e o MySQL nao promete a mesma duas vezes
            -- seguidas. A lista mudava de ordem sozinha entre dois F5,
            -- sem nada ter mudado nos dados. Ha empate a serio nestes
            -- dados: a Coca-Cola e a Cerveja (Fino) tem 11 unidades cada.
            ORDER BY quantidade DESC, pr.id_produto ASC
            LIMIT 5`),
      ]);

      const media = (fat, n) => (n ? Math.round((Number(fat) / n) * 100) / 100 : 0);
      const eur = (v) => Math.round(Number(v) * 100) / 100;

      res.json({
        hoje: {
          pedidos: hoje.pedidos,
          faturacao: eur(hoje.faturacao),
          media_por_pedido: media(hoje.faturacao, hoje.pedidos),
          // null e nao 0: zero minutos diria "sai instantaneamente",
          // e o que se quer dizer e "ainda nada ficou pronto hoje".
          tempo_medio_preparacao_min: tempo.minutos == null ? null : Number(tempo.minutos),
        },
        ontem: { pedidos: ontem.pedidos, faturacao: eur(ontem.faturacao) },
        mes: {
          pedidos: mes_.pedidos,
          faturacao: eur(mes_.faturacao),
          media_por_pedido: media(mes_.faturacao, mes_.pedidos),
        },
        servico: {
          mesas_ocupadas: servico.mesas_ocupadas,
          mesas_total: servico.mesas_total,
          rondas_por_fazer: servico.rondas_por_fazer,
        },
        stock_baixo: stock.n,
        faturacao_por_dia: porDia.map((l) => ({
          dia: l.dia instanceof Date ? l.dia.toISOString().slice(0, 10) : String(l.dia).slice(0, 10),
          total: eur(l.total),
        })),
        faturacao_por_mes: porMes.map((l) => ({ mes: l.mes, total: eur(l.total) })),
        mais_vendidos: maisVendidos.map((l) => ({
          id: l.id, nome: l.nome,
          quantidade: Number(l.quantidade), total: eur(l.total),
        })),
      });
    } catch (erro) { next(erro); }
  });


module.exports = router;
