/**
 * =====================================================================
 *  notificacoes.js — avisar o restaurante de um pedido novo (B-72)
 * =====================================================================
 *
 *  Uma funcao: avisarPedidoNovo(idPedido). Chamada DEPOIS do commit,
 *  nas duas portas por onde entra um pedido (mesa e take away).
 *
 *  O QUE ACONTECE, E POR ESTA ORDEM
 *
 *  1. Le o pedido e os itens da base.
 *  2. GRAVA a linha na tabela `notificacao`, com estado `pendente`.
 *  3. Tenta enviar, EM SEGUNDO PLANO, e no fim marca `enviado` ou
 *     `falhou`.
 *
 *  PORQUE E QUE O REGISTO VEM ANTES DO ENVIO
 *
 *  Porque e a parte que funciona sempre. Gravar na base e rapido e
 *  local; enviar depende da internet, da Brevo e de uma chave.
 *
 *  Assim, **a funcionalidade e visivel mesmo sem rede**: no plano B do
 *  dia 16, cada ronda que entra deixa a sua linha na `notificacao`, com
 *  o assunto e o texto que teriam sido enviados. O que falta e a
 *  entrega, nao o aviso. Se fosse ao contrario — enviar e so depois
 *  gravar — um dia sem internet era um dia sem rasto nenhum.
 *
 *  PORQUE E QUE O ENVIO NAO E ESPERADO
 *
 *  Quem chama isto esta a responder a um cliente que acabou de carregar
 *  em "Enviar pedido". Esperar seis segundos pela Brevo antes de lhe
 *  dizer "recebido" seria fazer o cliente pagar por um email que nao e
 *  para ele. O registo e esperado (milissegundos, na base local); o
 *  envio segue sozinho e atualiza o estado quando acabar.
 *
 *  E, como em todo o lado neste ficheiro: NADA AQUI LANCA. Um aviso que
 *  falha nao pode derrubar um pedido que ja foi aceite e ja esta a ser
 *  cozinhado.
 * =====================================================================
 */

const { pool } = require('../config/bd');
const { enviarEmail } = require('./email');

const eur = (v) => `${Number(v).toFixed(2).replace('.', ',')} €`;

/** O texto do aviso. Separado para se poder ler sem abrir o resto. */
function compor(pedido, itens) {
  const onde = pedido.tipo_pedido === 'take_away'
    ? `TAKE AWAY — ${pedido.nome_convidado || 'sem nome'}`
    : `MESA ${pedido.numero_mesa}`;

  const linhas = itens.map((i) => `  ${i.quantidade} x ${i.nome}` +
    (i.observacoes ? `\n      (${i.observacoes})` : ''));

  const texto = [
    `Entrou um pedido novo: ${pedido.numero_pedido}`,
    '',
    onde,
    '',
    ...linhas,
    '',
    `Total: ${eur(pedido.valor_total)}`,
    pedido.observacoes ? `\nObservacoes: ${pedido.observacoes}` : '',
    '',
    '— Vem Pro Abate',
  ].filter((l) => l !== null).join('\n');

  return { assunto: `Pedido ${pedido.numero_pedido} — ${onde}`, texto };
}

/**
 * Regista o aviso e manda-o seguir. Devolve o id da notificacao, ou
 * null se nem sequer deu para registar.
 *
 * ESPERA-SE o registo; NAO se espera o envio.
 */
async function avisarPedidoNovo(idPedido) {
  try {
    const [[pedido]] = await pool.query(
      `SELECT p.id_pedido, p.numero_pedido, p.tipo_pedido, p.valor_total,
              p.observacoes, p.nome_convidado, m.numero_mesa
         FROM pedido p
         LEFT JOIN mesa m ON m.id_mesa = p.id_mesa
        WHERE p.id_pedido = ?`,
      [idPedido]
    );
    if (!pedido) return null;

    const [itens] = await pool.query(
      `SELECT i.quantidade, i.observacoes, pr.nome
         FROM item_pedido i
         JOIN produto pr ON pr.id_produto = i.id_produto
        WHERE i.id_pedido = ?
        ORDER BY i.id_item`,
      [idPedido]
    );

    const { assunto, texto } = compor(pedido, itens);
    const destino = process.env.EMAIL_RESTAURANTE || null;

    const [res] = await pool.query(
      `INSERT INTO notificacao
         (id_cliente, id_pedido, email_destinatario, assunto, mensagem, estado)
       VALUES (NULL, ?, ?, ?, ?, 'pendente')`,
      [idPedido, destino, assunto, texto]
    );
    const idNotificacao = res.insertId;

    /*
     *  Daqui para baixo e em segundo plano. O `void` e o `.catch` nao
     *  sao decoracao: sem eles, uma falha aqui virava uma promessa
     *  rejeitada sem dono, e o Node mata o processo nessas — a API
     *  inteira ia abaixo por causa de um email.
     */
    void (async () => {
      const r = await enviarEmail({ para: destino, assunto, texto });
      const estado = r.estado === 'enviado' ? 'enviado'
        : (r.estado === 'desligado' ? 'pendente' : 'falhou');
      /*
       *  `desligado` fica como `pendente`, e nao como `falhou`. Nao
       *  falhou nada: ninguem tentou. A diferenca interessa a quem
       *  olhar para a tabela depois do dia 16 — `falhou` quer dizer
       *  "ha aqui um problema", `pendente` quer dizer "faltava a
       *  chave". Dois estados diferentes para duas coisas diferentes.
       */
      await pool.query('UPDATE notificacao SET estado = ? WHERE id_notificacao = ?',
        [estado, idNotificacao]);
      if (r.estado === 'falhou') {
        console.error(`[email] pedido ${pedido.numero_pedido}: ${r.motivo}`);
      }
    })().catch((e) => console.error('[email] falhou a marcar o estado:', e.message));

    return idNotificacao;
  } catch (erro) {
    // Nem o registo deu. Fica no terminal e o pedido segue na mesma.
    console.error('[notificacao] nao foi possivel registar o aviso:', erro.message);
    return null;
  }
}

module.exports = { avisarPedidoNovo, compor };
