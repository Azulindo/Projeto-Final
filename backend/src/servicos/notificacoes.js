/**
 * =====================================================================
 *  notificacoes.js — avisar quem precisa de saber (B-72)
 * =====================================================================
 *
 *  Uma funcao: avisarPedidoNovo(idPedido). Chamada DEPOIS do commit,
 *  nas duas portas por onde entra um pedido (mesa e take away).
 *
 *  SAO DOIS AVISOS, E NAO UM
 *
 *  Ao RESTAURANTE: entrou um pedido. Serve para quando ninguem esta a
 *  olhar para o ecra da cozinha — e o ecra da cozinha e o caminho
 *  normal, este e a rede por baixo.
 *
 *  Ao CLIENTE: o comprovativo, com o numero por que vai ser chamado.
 *  So no take away, e so quando ele deixou um email: a mesa nao pede
 *  email a ninguem, e no take away o campo e opcional de proposito —
 *  obrigar a escrever um email para levantar um prego ao balcao era
 *  pedir uma coisa que nao faz falta nenhuma.
 *
 *  A tarefa B-72 so falava do primeiro. O segundo foi acrescentado a
 *  26/10 por o Joao ter perguntado o obvio: quem encomenda alguma coisa
 *  espera receber um email. Os dois sao avisos do mesmo facto para
 *  pessoas diferentes, com texto diferente — a cozinha quer a lista
 *  para preparar, o cliente quer o numero e o total.
 *
 *  O QUE ACONTECE, E POR ESTA ORDEM
 *
 *  1. Le o pedido e os itens da base.
 *  2. GRAVA uma linha na tabela `notificacao` por cada destinatario,
 *     com estado `pendente`.
 *  3. Tenta enviar, EM SEGUNDO PLANO, e no fim marca cada uma como
 *     `enviado` ou `falhou`.
 *
 *  PORQUE E QUE O REGISTO VEM ANTES DO ENVIO
 *
 *  Porque e a parte que funciona sempre. Gravar na base e rapido e
 *  local; enviar depende da internet, do Gmail e de uma palavra-passe.
 *
 *  Assim, **a funcionalidade e visivel mesmo sem rede**: no plano B do
 *  dia 16, cada ronda que entra deixa as suas linhas na `notificacao`,
 *  com o assunto e o texto que teriam sido enviados. O que falta e a
 *  entrega, nao o aviso. Se fosse ao contrario — enviar e so depois
 *  gravar — um dia sem internet era um dia sem rasto nenhum.
 *
 *  PORQUE E QUE O ENVIO NAO E ESPERADO
 *
 *  Quem chama isto esta a responder a um cliente que acabou de carregar
 *  em "Enviar pedido". Esperar pelo Gmail antes de lhe dizer "recebido"
 *  seria fazer o cliente esperar por um email que ainda nem e para ele.
 *  O registo e esperado (milissegundos, na base); o envio segue sozinho
 *  e atualiza o estado quando acabar.
 *
 *  E, como em todo o lado neste ficheiro: NADA AQUI LANCA. Um aviso que
 *  falha nao pode derrubar um pedido que ja foi aceite e ja esta a ser
 *  cozinhado.
 * =====================================================================
 */

const { pool } = require('../config/bd');
const { enviarEmail } = require('./email');

const eur = (v) => `${Number(v).toFixed(2).replace('.', ',')} €`;

const listar = (itens) => itens.map((i) => `  ${i.quantidade} x ${i.nome}` +
  (i.observacoes ? `\n      (${i.observacoes})` : '')).join('\n');

const ondeEstao = (p) => (p.tipo_pedido === 'take_away'
  ? `TAKE AWAY — ${p.nome_convidado || 'sem nome'}`
  : `MESA ${p.numero_mesa}`);


/* ---- O aviso para quem vai cozinhar ------------------------------- */
function comporParaRestaurante(pedido, itens) {
  const texto = [
    `Entrou um pedido novo: ${pedido.numero_pedido}`,
    '',
    ondeEstao(pedido),
    '',
    listar(itens),
    '',
    `Total: ${eur(pedido.valor_total)}`,
    pedido.observacoes ? `\nObservacoes: ${pedido.observacoes}` : '',
    '',
    '— Vem Pro Abate',
  ].join('\n');

  return { assunto: `Pedido ${pedido.numero_pedido} — ${ondeEstao(pedido)}`, texto };
}

/* ---- O comprovativo para quem encomendou -------------------------- */
function comporParaCliente(pedido, itens) {
  const primeiroNome = (pedido.nome_convidado || '').split(' ')[0] || 'olá';

  /*
   *  O numero da encomenda aparece duas vezes: no assunto e em
   *  destaque no corpo. E a unica coisa que o cliente precisa de ter a
   *  mao quando chegar ao balcao, e um email lido no telemovel, de pe
   *  na rua, nao se le todo — le-se o assunto e a primeira linha.
   */
  const texto = [
    `Olá ${primeiroNome},`,
    '',
    'Recebemos a tua encomenda. Obrigado!',
    '',
    `   O TEU NÚMERO:  ${pedido.numero_pedido}`,
    '',
    'É por ele que te vamos chamar quando estiver pronta.',
    '',
    'O que pediste:',
    listar(itens),
    '',
    `Total: ${eur(pedido.valor_total)}`,
    pedido.observacoes ? `\nDeixaste esta nota: ${pedido.observacoes}` : '',
    '',
    'Até já,',
    'Vem Pro Abate — Amadora',
  ].join('\n');

  return { assunto: `A tua encomenda ${pedido.numero_pedido} — Vem Pro Abate`, texto };
}


/**
 * Regista os avisos e manda-os seguir. Devolve os ids das notificacoes
 * gravadas. ESPERA-SE o registo; NAO se espera o envio.
 */
async function avisarPedidoNovo(idPedido) {
  try {
    const [[pedido]] = await pool.query(
      `SELECT p.id_pedido, p.numero_pedido, p.tipo_pedido, p.valor_total,
              p.observacoes, p.nome_convidado, p.email_convidado, m.numero_mesa
         FROM pedido p
         LEFT JOIN mesa m ON m.id_mesa = p.id_mesa
        WHERE p.id_pedido = ?`,
      [idPedido]
    );
    if (!pedido) return [];

    const [itens] = await pool.query(
      `SELECT i.quantidade, i.observacoes, pr.nome
         FROM item_pedido i
         JOIN produto pr ON pr.id_produto = i.id_produto
        WHERE i.id_pedido = ?
        ORDER BY i.id_item`,
      [idPedido]
    );

    const avisos = [];

    const restaurante = process.env.EMAIL_RESTAURANTE || null;
    avisos.push({ para: restaurante, ...comporParaRestaurante(pedido, itens) });

    if (pedido.email_convidado) {
      avisos.push({ para: pedido.email_convidado, ...comporParaCliente(pedido, itens) });
    }

    const ids = [];
    for (const a of avisos) {
      const [res] = await pool.query(
        `INSERT INTO notificacao
           (id_cliente, id_pedido, email_destinatario, assunto, mensagem, estado)
         VALUES (NULL, ?, ?, ?, ?, 'pendente')`,
        [idPedido, a.para, a.assunto, a.texto]
      );
      ids.push(res.insertId);

      /*
       *  Daqui para baixo e em segundo plano. O `void` e o `.catch`
       *  nao sao decoracao: sem eles, uma falha aqui virava uma
       *  promessa rejeitada sem dono, e o Node mata o processo nessas
       *  — a API inteira ia abaixo por causa de um email.
       */
      const idNotificacao = res.insertId;
      void (async () => {
        const r = await enviarEmail(a);
        /*
         *  `desligado` fica como `pendente`, e nao como `falhou`. Nao
         *  falhou nada: ninguem tentou. A diferenca interessa a quem
         *  olhar para a tabela depois — `falhou` quer dizer "ha aqui
         *  um problema", `pendente` quer dizer "faltava a chave".
         */
        const estado = r.estado === 'enviado' ? 'enviado'
          : (r.estado === 'desligado' ? 'pendente' : 'falhou');
        await pool.query('UPDATE notificacao SET estado = ? WHERE id_notificacao = ?',
          [estado, idNotificacao]);
        if (r.estado === 'falhou') {
          console.error(`[email] ${pedido.numero_pedido} para ${a.para}: ${r.motivo}`);
        }
      })().catch((e) => console.error('[email] falhou a marcar o estado:', e.message));
    }

    return ids;
  } catch (erro) {
    // Nem o registo deu. Fica no terminal e o pedido segue na mesma.
    console.error('[notificacao] nao foi possivel registar o aviso:', erro.message);
    return [];
  }
}

module.exports = { avisarPedidoNovo, comporParaRestaurante, comporParaCliente };
